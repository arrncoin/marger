import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { GiftAlertBanner } from './components/GiftAlertBanner';
import { SingerQueueBar } from './components/SingerQueueBar';
import { LiveChatPanel } from './components/LiveChatPanel';
import { RecentGiftsPanel } from './components/RecentGiftsPanel';
import { EventLogPanel } from './components/EventLogPanel';
import { SingerSettingsModal } from './components/SingerSettingsModal';
import { ConnectModal } from './components/ConnectModal';
import { ConnectionGuideModal } from './components/ConnectionGuideModal';
import { ObsOverlayView } from './components/ObsOverlayView';
import { StandaloneObsOverlay } from './components/StandaloneObsOverlay';
import { Radio, ArrowRight, ShieldCheck } from 'lucide-react';

import {
  ConnectionConfig,
  ConnectionStatus,
  LiveStats,
  QueueItem,
  SingerSettings,
  TikTokEvent,
} from './types/tiktok';
import { DEFAULT_SINGER_SETTINGS, SingerEngine } from './services/singerEngine';
import { ITikTokLiveAdapter, ServerDirectAdapter, WebSocketBridgeAdapter } from './services/tiktokAdapter';

const STORAGE_KEY_SETTINGS = 'tiktok_singer_settings_prod_v1';
const STORAGE_KEY_CONFIG = 'tiktok_connection_config_prod_v1';

export default function App() {
  // Check if current page is requested as a pure OBS Browser Source overlay
  const isOverlayMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('overlay') === 'true' ||
      params.get('mode') === 'overlay' ||
      window.location.pathname.startsWith('/overlay')
    );
  }, []);

  const overlayAspect = useMemo(() => {
    if (typeof window === 'undefined') return '9:16';
    const params = new URLSearchParams(window.location.search);
    const aspect = params.get('aspect');
    if (aspect === '16:9' || aspect === '1:1' || aspect === '9:16') return aspect;
    return '9:16';
  }, []);

  const overlayOptions = useMemo(() => {
    if (typeof window === 'undefined') return { showChat: true, showGift: true, showGoal: true, showBadge: true };
    const params = new URLSearchParams(window.location.search);
    return {
      showChat: params.get('showChat') !== '0',
      showGift: params.get('showGift') !== '0',
      showGoal: params.get('showGoal') !== '0',
      showBadge: params.get('showBadge') !== '0',
    };
  }, []);

  // Set transparent background when loaded inside OBS Browser Source
  useEffect(() => {
    if (isOverlayMode) {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    }
  }, [isOverlayMode]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'gifts' | 'logs' | 'overlay'>('dashboard');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Connection & Config State (Production Ready)
  const [config, setConfig] = useState<ConnectionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      mode: 'server-direct',
      username: '',
      wsEndpoint: 'ws://localhost:21213',
    };
  });

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('Siap menghubungkan ke siaran langsung TikTok');

  // Events & Live Statistics
  const [events, setEvents] = useState<TikTokEvent[]>([]);
  const [latestGiftEvent, setLatestGiftEvent] = useState<TikTokEvent | null>(null);

  const [stats, setStats] = useState<LiveStats>({
    viewerCount: 0,
    peakViewers: 0,
    totalLikes: 0,
    totalCoins: 0,
    totalGiftsCount: 0,
    totalFollows: 0,
    totalShares: 0,
    totalComments: 0,
    totalMembers: 0,
    topGifters: [],
  });

  // Singer Engine (TTS)
  const [singerSettings, setSingerSettings] = useState<SingerSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      const savedSettings = saved ? JSON.parse(saved) : {};
      const eventToggles = { ...savedSettings.eventToggles };
      delete eventToggles.member;
      delete eventToggles.join;
      const templates = { ...savedSettings.templates };
      delete templates.member;
      delete templates.join;

      return {
        ...DEFAULT_SINGER_SETTINGS,
        ...savedSettings,
        eventToggles,
        templates: {
          ...DEFAULT_SINGER_SETTINGS.templates,
          ...templates,
        },
      };
    } catch {}
    return DEFAULT_SINGER_SETTINGS;
  });

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentSpeechItem, setCurrentSpeechItem] = useState<QueueItem | null>(null);
  const [isSingerPaused, setIsSingerPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Engine & Adapter references
  const singerEngineRef = useRef<SingerEngine | null>(null);
  const adapterRef = useRef<ITikTokLiveAdapter | null>(null);
  const processedEventIdsRef = useRef(new Set<string>());

  // Initialize Singer Engine ONLY for main dashboard (DISABLED in OBS Overlay to prevent duplicate voice/echo)
  useEffect(() => {
    if (isOverlayMode) {
      // Strictly silent in OBS overlay
      return;
    }

    const engine = new SingerEngine(singerSettings);
    singerEngineRef.current = engine;

    const unsubscribe = engine.subscribe((q, current, paused) => {
      setQueue([...q]);
      setCurrentSpeechItem(current ? { ...current } : null);
      setIsSingerPaused(paused);
    });

    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [isOverlayMode]);

  // Update engine settings when changed
  useEffect(() => {
    if (singerEngineRef.current) {
      singerEngineRef.current.updateSettings(singerSettings);
    }
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(singerSettings));
    } catch {}
  }, [singerSettings]);

  // Handle Real Incoming Events
  const handleIncomingEvent = (event: TikTokEvent) => {
    const processedEventIds = processedEventIdsRef.current;
    if (processedEventIds.has(event.id)) return;
    processedEventIds.add(event.id);
    if (processedEventIds.size > 1000) {
      const oldestEventId = processedEventIds.values().next().value;
      if (oldestEventId !== undefined) processedEventIds.delete(oldestEventId);
    }

    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [event, ...prev.slice(0, 499)];
    });

    setStats((prev) => {
      let {
        viewerCount,
        peakViewers,
        totalLikes,
        totalCoins,
        totalGiftsCount,
        totalFollows,
        totalShares,
        totalComments,
        totalMembers,
        topGifters,
      } = prev;

      if (event.type === 'gift' && event.gift) {
        const giftCost = event.gift.coinCost || event.gift.diamondCount * event.gift.repeatCount;
        totalCoins += giftCost;
        totalGiftsCount += 1;
        setLatestGiftEvent(event);

        const existingIdx = topGifters.findIndex((g) => g.user.userId === event.user.userId);
        let updatedGifters = [...topGifters];
        if (existingIdx !== -1) {
          updatedGifters[existingIdx] = {
            ...updatedGifters[existingIdx],
            totalCoins: updatedGifters[existingIdx].totalCoins + giftCost,
            lastGiftName: event.gift.giftName,
            giftCount: updatedGifters[existingIdx].giftCount + 1,
          };
        } else {
          updatedGifters.push({
            user: event.user,
            totalCoins: giftCost,
            lastGiftName: event.gift.giftName,
            giftCount: 1,
          });
        }
        updatedGifters.sort((a, b) => b.totalCoins - a.totalCoins);
        topGifters = updatedGifters.slice(0, 10);
      } else if (event.type === 'chat') {
        totalComments += 1;
      } else if (event.type === 'like' && event.like) {
        totalLikes = event.like.totalLikes || totalLikes + (event.like.count || 1);
      } else if (event.type === 'follow') {
        totalFollows += 1;
      } else if (event.type === 'share') {
        totalShares += 1;
      } else if (event.type === 'member') {
        totalMembers += 1;
      } else if (event.type === 'join' && event.join?.viewerCount) {
        viewerCount = event.join.viewerCount;
        if (viewerCount > peakViewers) peakViewers = viewerCount;
      }

      return {
        viewerCount,
        peakViewers,
        totalLikes,
        totalCoins,
        totalGiftsCount,
        totalFollows,
        totalShares,
        totalComments,
        totalMembers,
        topGifters,
      };
    });

    if (
      singerEngineRef.current &&
      !isOverlayMode &&
      !event.isHistorical &&
      event.type !== 'join' &&
      event.type !== 'member'
    ) {
      singerEngineRef.current.handleEvent(event);
    }
  };

  // Connect to Real Stream
  const connectToStream = async (targetConfig: ConnectionConfig) => {
    if (adapterRef.current) {
      adapterRef.current.disconnect();
    }

    setConfig(targetConfig);
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(targetConfig));
    } catch {}

    const adapter: ITikTokLiveAdapter =
      targetConfig.mode === 'server-direct'
        ? new ServerDirectAdapter(targetConfig)
        : new WebSocketBridgeAdapter(targetConfig);

    adapterRef.current = adapter;

    adapter.onStatusChange((newStatus, msg) => {
      setStatus(newStatus);
      setStatusMessage(msg || '');
    });

    adapter.onEvent(handleIncomingEvent);

    await adapter.connect(targetConfig);
  };

  const disconnectStream = () => {
    if (adapterRef.current) {
      adapterRef.current.disconnect();
      adapterRef.current = null;
    }
    setStatus('disconnected');
    setStatusMessage('Koneksi TikTok LIVE ditutup.');
  };

  const reconnectStream = async () => {
    if (adapterRef.current) {
      await adapterRef.current.reconnect();
    } else {
      await connectToStream(config);
    }
  };

  // Check initial server status on load and sync continuously
  useEffect(() => {
    const syncStatus = () => {
      fetch('/api/tiktok/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'connected' && data.username) {
            setStatus('connected');
            setStatusMessage(`Terhubung ke @${data.username} (Room: ${data.roomId || 'Aktif'})`);
            setStats((prev) => ({
              ...prev,
              viewerCount: data.viewerCount || prev.viewerCount,
              totalLikes: Math.max(data.totalLikes || 0, prev.totalLikes),
              peakViewers: Math.max(data.viewerCount || 0, prev.peakViewers),
            }));

            if (!adapterRef.current) {
              const adapter = new ServerDirectAdapter({ mode: 'server-direct', username: data.username });
              adapterRef.current = adapter;
              adapter.onStatusChange((s, m) => {
                setStatus(s);
                setStatusMessage(m || '');
              });
              adapter.onEvent(handleIncomingEvent);
              adapter.connect({ mode: 'server-direct', username: data.username });
            }
          }
        })
        .catch(() => {});
    };

    syncStatus();
    const interval = setInterval(syncStatus, 4000);

    return () => {
      clearInterval(interval);
      if (adapterRef.current && (adapterRef.current as any).closeSSEOnly) {
        (adapterRef.current as any).closeSSEOnly();
      }
    };
  }, []);

  const chatEvents = useMemo(() => events.filter((e) => e.type === 'chat'), [events]);
  const giftEvents = useMemo(() => events.filter((e) => e.type === 'gift'), [events]);

  const handleSpeakSpecificComment = (evt: TikTokEvent) => {
    if (!singerEngineRef.current || !evt.chat) return;
    const text = singerSettings.templates.chat
      .replace('{user}', evt.user.nickname || evt.user.uniqueId)
      .replace('{comment}', evt.chat.comment);
    singerEngineRef.current.testSpeech(text);
  };

  if (isOverlayMode) {
    return (
      <StandaloneObsOverlay
        latestGiftEvent={latestGiftEvent}
        recentChats={chatEvents}
        stats={stats}
        streamerUsername={config.username || 'streamer'}
        aspect={overlayAspect}
        showChat={overlayOptions.showChat}
        showGift={overlayOptions.showGift}
        showGoal={overlayOptions.showGoal}
        showBadge={overlayOptions.showBadge}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-[#fe2c55]/30 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        statusMessage={statusMessage}
        isSingerEnabled={singerSettings.enabled}
        onToggleSinger={() =>
          setSingerSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onConnectClick={() => setIsConnectOpen(true)}
        streamerUsername={config.username}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Offline Onboarding Banner if not yet connected */}
        {status === 'disconnected' && !config.username && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#fe2c55]/10 border border-[#fe2c55]/30 flex items-center justify-center text-[#fe2c55] shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Siap Menghubungkan ke TikTok LIVE</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Masukkan username TikTok Anda yang sedang live on-air untuk mulai membaca gift, chat, like, dan follower secara otomatis.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConnectOpen(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#fe2c55] to-[#e01943] text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 transition-opacity shrink-0 shadow-md shadow-rose-900/30"
            >
              <span>Hubungkan LIVE Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Speech Queue Toolbar */}
        <SingerQueueBar
          queue={queue}
          currentItem={currentSpeechItem}
          isPaused={isSingerPaused}
          onPause={() => singerEngineRef.current?.pause()}
          onResume={() => singerEngineRef.current?.resume()}
          onSkip={() => singerEngineRef.current?.skipCurrent()}
          onClear={() => singerEngineRef.current?.clearQueue()}
          onTestVoice={() => singerEngineRef.current?.testSpeech()}
        />

        {/* Real-time KPI Stats Banner */}
        <StatsOverview stats={stats} />

        {/* Real-time Gift Alert Banner with Confetti */}
        <GiftAlertBanner latestGiftEvent={latestGiftEvent} />

        {/* Content based on Active Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Live Chat Panel (7 cols) */}
            <div className="lg:col-span-7">
              <LiveChatPanel
                chatEvents={chatEvents}
                onSpeakComment={handleSpeakSpecificComment}
                onClearChat={() =>
                  setEvents((prev) => prev.filter((e) => e.type !== 'chat'))
                }
              />
            </div>

            {/* Right Column: Recent Gifts & Top Sultan Leaderboard (5 cols) */}
            <div className="lg:col-span-5">
              <RecentGiftsPanel giftEvents={giftEvents} stats={stats} />
            </div>

            {/* Full-width bottom section: Recent Event Logs */}
            <div className="lg:col-span-12">
              <EventLogPanel
                events={events}
                onClearLogs={() => setEvents([])}
              />
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4">
            <LiveChatPanel
              chatEvents={chatEvents}
              onSpeakComment={handleSpeakSpecificComment}
              onClearChat={() =>
                setEvents((prev) => prev.filter((e) => e.type !== 'chat'))
              }
            />
          </div>
        )}

        {activeTab === 'gifts' && (
          <div className="space-y-4">
            <RecentGiftsPanel giftEvents={giftEvents} stats={stats} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <EventLogPanel
              events={events}
              onClearLogs={() => setEvents([])}
            />
          </div>
        )}

        {activeTab === 'overlay' && (
          <ObsOverlayView
            latestGiftEvent={latestGiftEvent}
            recentChats={chatEvents}
            stats={stats}
            streamerUsername={config.username || 'streamer'}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-400">TikTok LIVE Singer & Event Reader</span>
            <span aria-hidden="true">·</span>
            <span>Lingkungan Produksi Real-Time Aktif</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Panduan Setup
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Pengaturan TTS
            </button>
            <button
              onClick={() => setActiveTab('overlay')}
              className="hover:text-cyan-400 transition-colors"
            >
              OBS Studio Mode
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        status={status}
        statusMessage={statusMessage}
        config={config}
        onConnect={connectToStream}
        onDisconnect={disconnectStream}
        onReconnect={reconnectStream}
      />

      <SingerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={singerSettings}
        onSave={(newSettings) => setSingerSettings(newSettings)}
        onTestVoice={(text) => singerEngineRef.current?.testSpeech(text)}
        availableVoices={availableVoices}
      />

      <ConnectionGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
