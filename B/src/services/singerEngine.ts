import { QueueItem, SingerSettings, TikTokEvent } from '../types/tiktok';
import { playFollowPop, playGiftChime } from '../utils/sfx';

export const DEFAULT_SINGER_SETTINGS: SingerSettings = {
  enabled: true,
  voiceURI: '',
  rate: 1.05,
  pitch: 1.0,
  volume: 0.9,
  delayBetweenSpeechMs: 400,
  eventToggles: {
    gift: true,
    chat: true,
    follow: true,
    share: true,
    like: true,
  },
  templates: {
    gift: 'Terima kasih, {user}, atas {count} {giftName}!',
    chat: '{user} berkomentar: {comment}',
    follow: 'Terima kasih kepada {user} yang sudah mengikuti!',
    share: 'Terima kasih, {user}, sudah membagikan LIVE ini!',
    like: 'Terima kasih atas {count} like dukungannya!',
  },
  minGiftCoins: 1,
  likeBatchThreshold: 50,
  likeCooldownSec: 12,
  filterBadWords: true,
  badWordsList: [
    'anjing',
    'babi',
    'kontol',
    'memek',
    'bangsat',
    'goblok',
    'tolol',
    'kampret',
    'slot',
    'judol',
    'gacor',
    'zeus',
    'pragmatic',
    'open bo',
    'vcs',
  ],
  maxCommentLength: 60,
  playSfx: true,
};

export class SingerEngine {
  private settings: SingerSettings;
  private queue: QueueItem[] = [];
  private currentItem: QueueItem | null = null;
  private isPaused: boolean = false;
  private isSpeaking: boolean = false;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<(queue: QueueItem[], current: QueueItem | null, isPaused: boolean) => void> = new Set();

  // Deduplication & combo tracking
  private recentSpokenIds: Map<string, number> = new Map(); // id -> timestamp
  private recentCommentsByUser: Map<string, { comment: string; time: number }> = new Map();
  private pendingLikesCount: number = 0;
  private lastLikeSpokenTime: number = 0;
  private likeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(initialSettings?: Partial<SingerSettings>) {
    this.settings = {
      ...DEFAULT_SINGER_SETTINGS,
      ...initialSettings,
      eventToggles: {
        ...DEFAULT_SINGER_SETTINGS.eventToggles,
        ...initialSettings?.eventToggles,
      },
    };
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public updateSettings(newSettings: Partial<SingerSettings>) {
    this.settings = {
      ...this.settings,
      ...newSettings,
      eventToggles: {
        ...this.settings.eventToggles,
        ...newSettings.eventToggles,
      },
    };

    if (!this.settings.enabled && this.isSpeaking) {
      this.stop();
    }
    this.notify();
    if (!this.isSpeaking && !this.isPaused && this.settings.enabled) {
      this.playNext();
    }
  }

  public getSettings(): SingerSettings {
    return { ...this.settings };
  }

  public subscribe(callback: (queue: QueueItem[], current: QueueItem | null, isPaused: boolean) => void) {
    this.listeners.add(callback);
    callback([...this.queue], this.currentItem, this.isPaused);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb([...this.queue], this.currentItem, this.isPaused));
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Process and enqueue a TikTok event based on settings & filters
   */
  public handleEvent(event: TikTokEvent) {
    if (!this.settings.enabled) return;
    if (event.isHistorical || event.type === 'join' || event.type === 'member') return;

    // Check event toggle
    if (!this.settings.eventToggles[event.type]) return;

    switch (event.type) {
      case 'gift':
        this.processGiftEvent(event);
        break;
      case 'chat':
        this.processChatEvent(event);
        break;
      case 'like':
        this.processLikeEvent(event);
        break;
      case 'follow':
        this.processFollowEvent(event);
        break;
      case 'share':
        this.processShareEvent(event);
        break;
    }
  }

  private processGiftEvent(event: TikTokEvent) {
    if (!event.gift) return;
    const coins = event.gift.coinCost || event.gift.diamondCount * event.gift.repeatCount;

    // Filter minimum coins
    if (coins < this.settings.minGiftCoins) return;

    // Combo streak deduping:
    // If the same user sent a combo streak (e.g. comboId or giftId), we don't want 15 identical voice speeches.
    const comboKey = `${event.user.userId}_${event.gift.giftId}_${event.gift.comboId || ''}`;
    const lastSpoken = this.recentSpokenIds.get(comboKey) || 0;
    const now = Date.now();

    // If combo is active and rapid (< 4s), update existing queued item for this user if still waiting
    const existingIndex = this.queue.findIndex(
      (item) => item.type === 'gift' && item.user.userId === event.user.userId && item.status === 'queued'
    );

    const giftText = this.settings.templates.gift
      .replace('{user}', event.user.nickname || event.user.uniqueId)
      .replace('{count}', String(event.gift.repeatCount || 1))
      .replace('{giftName}', event.gift.giftName || 'Gift')
      .replace('{coins}', String(coins));

    if (existingIndex !== -1) {
      // Update existing item to latest combo count
      this.queue[existingIndex].textToSpeak = giftText;
      this.queue[existingIndex].giftCoins = coins;
      this.notify();
      return;
    }

    if (now - lastSpoken < 4000 && event.gift.isComboStreak) {
      // Skip mid-combo rapid spam
      return;
    }

    this.recentSpokenIds.set(comboKey, now);

    // Priority: Big gifts (>100 coins) get Priority 1
    const priority = coins >= 100 ? 1 : 2;

    this.enqueueItem({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: event.id,
      type: 'gift',
      user: event.user,
      textToSpeak: giftText,
      priority,
      status: 'queued',
      createdAt: Date.now(),
      giftCoins: coins,
    });
  }

  private processChatEvent(event: TikTokEvent) {
    if (!event.chat) return;
    const rawComment = event.chat.comment.trim();
    if (!rawComment) return;

    // Bad words filtering
    if (this.settings.filterBadWords) {
      const lower = rawComment.toLowerCase();
      const hasBadWord = this.settings.badWordsList.some((word) =>
        lower.includes(word.toLowerCase().trim())
      );
      if (hasBadWord) return;
    }

    // Check repeated comment spam from same user
    const lastChat = this.recentCommentsByUser.get(event.user.userId);
    const now = Date.now();
    if (lastChat && lastChat.comment === rawComment && now - lastChat.time < 12000) {
      return; // Skip duplicate spam
    }
    this.recentCommentsByUser.set(event.user.userId, { comment: rawComment, time: now });

    // Truncate comment if too long
    const cleanComment =
      rawComment.length > this.settings.maxCommentLength
        ? rawComment.substring(0, this.settings.maxCommentLength) + '...'
        : rawComment;

    const chatText = this.settings.templates.chat
      .replace('{user}', event.user.nickname || event.user.uniqueId)
      .replace('{comment}', cleanComment);

    this.enqueueItem({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: event.id,
      type: 'chat',
      user: event.user,
      textToSpeak: chatText,
      priority: 3,
      status: 'queued',
      createdAt: Date.now(),
    });
  }

  private processLikeEvent(event: TikTokEvent) {
    if (!event.like) return;
    this.pendingLikesCount += event.like.count || 1;

    const now = Date.now();
    const cooldownMs = this.settings.likeCooldownSec * 1000;

    // Check if threshold reached
    if (this.pendingLikesCount >= this.settings.likeBatchThreshold && now - this.lastLikeSpokenTime >= cooldownMs) {
      this.flushPendingLikes();
    } else if (!this.likeTimer) {
      // Schedule batch flush after cooldown
      this.likeTimer = setTimeout(() => {
        this.likeTimer = null;
        if (this.pendingLikesCount >= 15) {
          this.flushPendingLikes();
        }
      }, cooldownMs);
    }
  }

  private flushPendingLikes() {
    if (this.pendingLikesCount <= 0) return;
    const count = this.pendingLikesCount;
    this.pendingLikesCount = 0;
    this.lastLikeSpokenTime = Date.now();

    const likeText = this.settings.templates.like.replace('{count}', String(count));

    this.enqueueItem({
      id: `q_like_${Date.now()}`,
      eventId: `like_batch_${Date.now()}`,
      type: 'like',
      user: {
        userId: 'system_likes',
        uniqueId: 'audience',
        nickname: 'Penonton',
      },
      textToSpeak: likeText,
      priority: 4,
      status: 'queued',
      createdAt: Date.now(),
    });
  }

  private processFollowEvent(event: TikTokEvent) {
    const followText = this.settings.templates.follow.replace(
      '{user}',
      event.user.nickname || event.user.uniqueId
    );

    this.enqueueItem({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: event.id,
      type: 'follow',
      user: event.user,
      textToSpeak: followText,
      priority: 3,
      status: 'queued',
      createdAt: Date.now(),
    });
  }

  private processShareEvent(event: TikTokEvent) {
    const shareText = this.settings.templates.share.replace(
      '{user}',
      event.user.nickname || event.user.uniqueId
    );

    this.enqueueItem({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId: event.id,
      type: 'share',
      user: event.user,
      textToSpeak: shareText,
      priority: 2,
      status: 'queued',
      createdAt: Date.now(),
    });
  }

  private enqueueItem(item: QueueItem) {
    // Avoid giant unbounded queues: cap at 30 items, discard lowest priority older items
    if (this.queue.length >= 30) {
      const lowestPriorityIdx = this.queue.findIndex((q) => q.priority >= 3);
      if (lowestPriorityIdx !== -1) {
        this.queue.splice(lowestPriorityIdx, 1);
      }
    }

    // Insert sorted by priority (1 is highest, then 2, 3, 4)
    // Within same priority, FIFO (order of arrival)
    let insertIdx = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (item.priority < this.queue[i].priority) {
        insertIdx = i;
        break;
      }
    }
    this.queue.splice(insertIdx, 0, item);
    this.notify();

    if (!this.isSpeaking && !this.isPaused) {
      this.playNext();
    }
  }

  private playNext() {
    if (this.isPaused || this.queue.length === 0 || !this.settings.enabled) {
      this.isSpeaking = false;
      this.currentItem = null;
      this.notify();
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.currentItem = { ...nextItem, status: 'speaking' };
    this.isSpeaking = true;
    this.notify();

    // Trigger SFX if configured
    if (this.settings.playSfx) {
      if (nextItem.type === 'gift') {
        playGiftChime(nextItem.giftCoins || 1);
      } else if (nextItem.type === 'follow' || nextItem.type === 'share') {
        playFollowPop();
      }
    }

    this.speakUtterance(nextItem.textToSpeak, () => {
      if (this.currentItem?.id !== nextItem.id) return;
      if (this.currentItem) {
        this.currentItem.status = 'completed';
      }
      this.currentItem = null;
      this.isSpeaking = false;
      this.notify();

      // Short delay between speeches so it sounds natural
      setTimeout(() => {
        this.playNext();
      }, this.settings.delayBetweenSpeechMs);
    });
  }

  private speakUtterance(text: string, onEnd: () => void) {
    if (!this.synth) {
      console.error('TTS is unavailable because this browser does not support Speech Synthesis.');
      onEnd();
      return;
    }

    try {
      const voices = this.synth.getVoices();
      const selectedVoice = voices.find((voice) => voice.voiceURI === this.settings.voiceURI);
      if (!this.settings.voiceURI || !selectedVoice) {
        console.error(
          this.settings.voiceURI
            ? `Selected TTS voice "${this.settings.voiceURI}" is unavailable. Choose an available voice in TTS settings.`
            : 'No TTS voice is selected. Choose an available voice in TTS settings.'
        );
        onEnd();
        return;
      }

      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;
      utterance.voice = selectedVoice;

      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          this.currentUtterance = null;
          onEnd();
        }
      };

      utterance.onend = finish;
      utterance.onerror = (event) => {
        console.error('TTS speech synthesis failed:', event.error);
        finish();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);

      // Safety timeout in case speech synthesis hangs in background tab
      setTimeout(() => {
        if (!isDone) {
          finish();
        }
      }, 15000);
    } catch (error) {
      console.error('Failed to start TTS speech synthesis:', error);
      onEnd();
    }
  }

  public pause() {
    this.isPaused = true;
    if (this.synth) {
      this.synth.pause();
    }
    this.notify();
  }

  public resume() {
    this.isPaused = false;
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    } else if (!this.isSpeaking && this.queue.length > 0) {
      this.playNext();
    }
    this.notify();
  }

  public skipCurrent() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentItem = null;
    this.isSpeaking = false;
    this.notify();
    this.playNext();
  }

  public clearQueue() {
    this.queue = [];
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentItem = null;
    this.isSpeaking = false;
    this.notify();
  }

  public stop() {
    this.clearQueue();
  }

  public testSpeech(customText?: string) {
    const text = customText || 'Halo streamer! Sistem pembaca suara TikTok LIVE berfungsi dengan baik.';
    if (this.settings.playSfx) {
      playGiftChime(100);
    }
    this.speakUtterance(text, () => {});
  }
}
