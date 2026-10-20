export type TikTokEventType =
  | 'gift'
  | 'chat'
  | 'like'
  | 'follow'
  | 'share'
  | 'join'
  | 'member';

export interface TikTokUser {
  userId: string;
  uniqueId: string; // e.g. "budi_gaming"
  nickname: string; // e.g. "Budi Gaming ID"
  avatarUrl?: string;
  badge?: string; // e.g. "VIP", "Top Gifter", "Subscriber"
  isSubscriber?: boolean;
  followRole?: number;
}

export interface TikTokGiftPayload {
  giftId: number;
  giftName: string;
  repeatCount: number; // Current combo count (e.g. 10x)
  diamondCount: number; // Value in diamonds/coins per gift
  coinCost: number; // Total coins = diamondCount * repeatCount
  comboId?: string;
  isComboStreak?: boolean;
  giftIcon?: string;
  giftPictureUrl?: string;
}

export interface TikTokChatPayload {
  comment: string;
  isFiltered?: boolean;
}

export interface TikTokLikePayload {
  count: number; // Increment in this event
  totalLikes: number; // Running total
}

export interface TikTokFollowPayload {
  followerCount?: number;
}

export interface TikTokSharePayload {
  shareType?: string;
}

export interface TikTokJoinPayload {
  viewerCount?: number;
}

export interface TikTokMemberPayload {
  subTier?: string;
  subMonth?: number;
}

export interface TikTokEvent {
  id: string;
  type: TikTokEventType;
  timestamp: number;
  user: TikTokUser;
  isHistorical?: boolean;
  gift?: TikTokGiftPayload;
  chat?: TikTokChatPayload;
  like?: TikTokLikePayload;
  follow?: TikTokFollowPayload;
  share?: TikTokSharePayload;
  join?: TikTokJoinPayload;
  member?: TikTokMemberPayload;
}

export interface LiveStats {
  viewerCount: number;
  peakViewers: number;
  totalLikes: number;
  totalCoins: number;
  totalGiftsCount: number;
  totalFollows: number;
  totalShares: number;
  totalComments: number;
  totalMembers: number;
  topGifters: {
    user: TikTokUser;
    totalCoins: number;
    lastGiftName: string;
    giftCount: number;
  }[];
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type ConnectionMode = 'server-direct' | 'websocket-bridge';

export interface ConnectionConfig {
  mode: ConnectionMode;
  username: string; // @username
  sessionId?: string; // Optional TikTok Webcast session cookie
  wsEndpoint?: string; // e.g. ws://localhost:21213
}

export interface SingerTemplates {
  gift: string;
  chat: string;
  follow: string;
  share: string;
  like: string;
}

export type SingerEventType = Exclude<TikTokEventType, 'join' | 'member'>;

export interface SingerEventToggles {
  gift: boolean;
  chat: boolean;
  follow: boolean;
  share: boolean;
  like: boolean;
}

export interface SingerSettings {
  enabled: boolean;
  voiceURI: string;
  rate: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 1.5
  volume: number; // 0 - 1.0
  delayBetweenSpeechMs: number;
  eventToggles: SingerEventToggles;
  templates: SingerTemplates;
  minGiftCoins: number;
  likeBatchThreshold: number;
  likeCooldownSec: number;
  filterBadWords: boolean;
  badWordsList: string[];
  maxCommentLength: number;
  playSfx: boolean;
}

export interface QueueItem {
  id: string;
  eventId: string;
  type: SingerEventType;
  user: TikTokUser;
  textToSpeak: string;
  priority: number; // 1 (highest) to 4 (lowest)
  status: 'queued' | 'speaking' | 'completed' | 'skipped';
  createdAt: number;
  giftCoins?: number;
}
