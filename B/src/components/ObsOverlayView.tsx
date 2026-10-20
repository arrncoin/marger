import React, { useEffect, useState } from 'react';
import { Copy, Check, Eye, EyeOff, Sparkles, Trophy, Smartphone, Monitor, Square, VolumeX, ExternalLink } from 'lucide-react';
import { LiveStats, TikTokEvent } from '../types/tiktok';
import { GiftIconImage } from '../utils/giftIcons';

interface ObsOverlayViewProps {
  latestGiftEvent: TikTokEvent | null;
  recentChats: TikTokEvent[];
  stats: LiveStats;
  streamerUsername: string;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1';

export const ObsOverlayView: React.FC<ObsOverlayViewProps> = ({
  latestGiftEvent,
  recentChats,
  stats,
  streamerUsername,
}) => {
  const [aspect, setAspect] = useState<AspectRatioType>('9:16');
  const [copied, setCopied] = useState(false);
  const [showBgSimulation, setShowBgSimulation] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showGift, setShowGift] = useState(true);
  const [showGoal, setShowGoal] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [activeGift, setActiveGift] = useState<TikTokEvent | null>(null);

  useEffect(() => {
    if (!latestGiftEvent?.gift) return;
    setActiveGift(latestGiftEvent);
    const timer = setTimeout(() => setActiveGift(null), 5000);
    return () => clearTimeout(timer);
  }, [latestGiftEvent]);

  // Construct absolute OBS Browser Source URL with selected aspect ratio and options
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const searchParams = new URLSearchParams();
  searchParams.set('overlay', 'true');
  searchParams.set('aspect', aspect);
  if (!showChat) searchParams.set('showChat', '0');
  if (!showGift) searchParams.set('showGift', '0');
  if (!showGoal) searchParams.set('showGoal', '0');
  if (!showBadge) searchParams.set('showBadge', '0');

  const overlayUrl = `${baseUrl}/?${searchParams.toString()}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const giftTarget = 5000;
  const giftProgress = Math.min(100, Math.round((stats.totalCoins / giftTarget) * 100));

  const aspectDimensions = {
    '16:9': { w: 1920, h: 1080, label: '16:9 Landscape (1920 × 1080)', icon: Monitor, frameClass: 'aspect-video max-w-4xl' },
    '9:16': { w: 1080, h: 1920, label: '9:16 Portrait / TikTok (1080 × 1920)', icon: Smartphone, frameClass: 'aspect-[9/16] max-w-[360px]' },
    '1:1': { w: 1080, h: 1080, label: '1:1 Square (1080 × 1080)', icon: Square, frameClass: 'aspect-square max-w-[480px]' },
  };

  const currentDim = aspectDimensions[aspect];

  return (
    <div className="space-y-4">
      {/* Aspect Ratio & URL Configuration Header */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#25f4ee] animate-pulse" />
              <h3 className="font-bold text-white text-base">OBS Studio Browser Source Setup</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pilih rasio tampilan yang diinginkan (16:9, 9:16 vertikal untuk TikTok, atau 1:1 kotak), lalu salin URL ke Browser Source OBS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(overlayUrl, '_blank')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Buka Overlay di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Baru</span>
            </button>

            <button
              onClick={copyUrl}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#25f4ee] to-[#0ea5e9] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md hover:brightness-110 active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'URL Overlay Tersalin!' : 'Salin URL OBS'}</span>
            </button>
          </div>
        </div>

        {/* Aspect Ratio Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
          {(['9:16', '16:9', '1:1'] as AspectRatioType[]).map((type) => {
            const item = aspectDimensions[type];
            const Icon = item.icon;
            const isSelected = aspect === type;
            return (
              <button
                key={type}
                onClick={() => setAspect(type)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-[#25f4ee] text-white shadow-md shadow-[#25f4ee]/10'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#25f4ee] text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {item.w} × {item.h} px
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* URL Box & OBS Settings Instructions */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Generated Browser Source URL:</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <VolumeX className="w-3.5 h-3.5" />
              <span>Suara TTS Dinonaktifkan di Overlay (Mencegah Gema)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={overlayUrl}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 select-all focus:outline-none"
            />
            <button
              onClick={copyUrl}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shrink-0"
            >
              {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-400 font-mono">
            <div>
              <span className="text-slate-500">Width:</span> <span className="text-white font-bold">{currentDim.w}</span>
            </div>
            <div>
              <span className="text-slate-500">Height:</span> <span className="text-white font-bold">{currentDim.h}</span>
            </div>
            <div>
              <span className="text-slate-500">FPS:</span> <span className="text-white font-bold">60</span>
            </div>
            <div>
              <span className="text-slate-500">CSS:</span> <span className="text-white font-bold">Transparent</span>
            </div>
          </div>
        </div>

        {/* Widget Toggles */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
          <span className="font-semibold text-slate-400">Tampilkan Widget:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showGift}
              onChange={(e) => setShowGift(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-[#25f4ee] focus:ring-0"
            />
            <span>Gift Pop-up Alert</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showChat}
              onChange={(e) => setShowChat(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-[#25f4ee] focus:ring-0"
            />
            <span>Live Chat Ticker</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showGoal}
              onChange={(e) => setShowGoal(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-[#25f4ee] focus:ring-0"
            />
            <span>Target Koin Goal</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-[#25f4ee] focus:ring-0"
            />
            <span>Streamer Badge</span>
          </label>
          <button
            onClick={() => setShowBgSimulation(!showBgSimulation)}
            className="ml-auto px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
          >
            {showBgSimulation ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showBgSimulation ? 'Mode Transparan Asli' : 'Simulasi Kamera Gelap'}</span>
          </button>
        </div>
      </div>

      {/* Live Visual Preview Canvas with exact selected aspect ratio */}
      <div className="flex justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
        <div
          className={`relative w-full ${currentDim.frameClass} rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden shadow-2xl transition-all ${
            showBgSimulation
              ? 'bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950'
              : 'bg-transparent'
          }`}
          style={{ minHeight: aspect === '9:16' ? '600px' : aspect === '1:1' ? '460px' : '380px' }}
        >
          {/* Top Streamer Info Bar */}
          {showBadge && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#fe2c55] to-amber-500 flex items-center justify-center font-bold text-xs text-white">
                {streamerUsername ? streamerUsername.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs truncate max-w-[130px]">
                    @{streamerUsername.replace('@', '') || 'streamer_id'}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                  <span>{stats.viewerCount} Viewers</span>
                  <span>·</span>
                  <span className="text-rose-400">{stats.totalLikes.toLocaleString('id-ID')} Likes</span>
                </div>
              </div>
            </div>
          )}

          {/* Goal Bar Widget */}
          {showGoal && (
            <div
              className={`absolute z-10 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-lg text-xs ${
                aspect === '16:9' ? 'top-4 right-4 w-60' : 'top-16 left-4 right-4'
              }`}
            >
              <div className="flex items-center justify-between font-semibold mb-1 text-[11px]">
                <span className="text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Target Koin Stream
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {stats.totalCoins} / {giftTarget}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500 rounded-full"
                  style={{ width: `${giftProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Center: Live Gift Pop-up Alert Widget with REAL TIKTOK CDN GIFT ICON */}
          {showGift && activeGift?.gift && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-20 transition-all ${
                aspect === '9:16' ? 'top-28 w-[90%]' : aspect === '1:1' ? 'top-28 w-[90%]' : 'top-20'
              }`}
            >
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-950/95 to-amber-950/90 border-2 border-amber-400/80 backdrop-blur-lg shadow-2xl flex items-center gap-3.5 min-w-[280px]">
                <div className="relative shrink-0">
                  <GiftIconImage
                    gift={activeGift.gift}
                    size="lg"
                    showCombo={true}
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-xs text-amber-300 font-semibold truncate">
                    {activeGift.user.nickname || activeGift.user.uniqueId}
                  </div>
                  <div className="text-sm font-bold text-white tracking-tight truncate">
                    {activeGift.gift.giftName}
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    +{(activeGift.gift.coinCost || activeGift.gift.diamondCount * activeGift.gift.repeatCount).toLocaleString('id-ID')} Koin
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Left: Live Chat Ticker Widget */}
          {showChat && (
            <div
              className={`absolute bottom-4 left-4 z-10 overflow-hidden flex flex-col justify-end space-y-1.5 pointer-events-none ${
                aspect === '9:16' || aspect === '1:1' ? 'right-4 max-h-48' : 'w-72 max-h-44'
              }`}
            >
              {(recentChats.length > 0 ? recentChats.slice(-3) : [
                { id: '1', user: { nickname: 'Budi Gaming' }, chat: { comment: 'Semangat kak live nya!' } },
                { id: '2', user: { nickname: 'Rina_Cute', badge: 'VIP' }, chat: { comment: 'Keren banget gift nya!' } },
              ]).map((c: any) => (
                <div
                  key={c.id}
                  className="p-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-xs text-slate-200 shadow-md"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-300 text-[11px]">
                    <span>{c.user.nickname}</span>
                    {c.user.badge && (
                      <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        {c.user.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-100 text-xs break-words">{c.chat?.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Right: Silent Indicator */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] text-slate-400 font-mono">
            <VolumeX className="w-3 h-3 text-emerald-400" />
            <span>Muted Overlay</span>
          </div>
        </div>
      </div>
    </div>
  );
};
