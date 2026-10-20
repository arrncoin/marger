import React, { useEffect, useState } from 'react';
import { Trophy, Heart, Users, Sparkles } from 'lucide-react';
import { LiveStats, TikTokEvent } from '../types/tiktok';
import { GiftIconImage, getGiftVisual } from '../utils/giftIcons';

interface StandaloneObsOverlayProps {
  latestGiftEvent: TikTokEvent | null;
  recentChats: TikTokEvent[];
  stats: LiveStats;
  streamerUsername: string;
  aspect?: '16:9' | '9:16' | '1:1';
  showChat?: boolean;
  showGift?: boolean;
  showGoal?: boolean;
  showBadge?: boolean;
}

export const StandaloneObsOverlay: React.FC<StandaloneObsOverlayProps> = ({
  latestGiftEvent,
  recentChats,
  stats,
  streamerUsername,
  aspect = '16:9',
  showChat = true,
  showGift = true,
  showGoal = true,
  showBadge = true,
}) => {
  const [activeGift, setActiveGift] = useState<TikTokEvent | null>(null);

  // Show active gift popup for 5 seconds on each new gift event
  useEffect(() => {
    if (!latestGiftEvent || !latestGiftEvent.gift) return;
    setActiveGift(latestGiftEvent);
    const timer = setTimeout(() => {
      setActiveGift(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [latestGiftEvent]);

  const giftTarget = 5000;
  const giftProgress = Math.min(100, Math.round((stats.totalCoins / giftTarget) * 100));
  const activeVisual = getGiftVisual(activeGift?.gift);

  // Aspect-specific styling classes
  const isPortrait = aspect === '9:16';
  const isSquare = aspect === '1:1';

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden bg-transparent select-none font-sans text-white pointer-events-none ${
        isPortrait ? 'p-6 max-w-[1080px] mx-auto' : isSquare ? 'p-6 max-w-[1080px] mx-auto' : 'p-6'
      }`}
      style={{
        // Ensure transparent background for OBS browser source
        backgroundColor: 'transparent',
      }}
    >
      {/* 1. Streamer Status Badge */}
      {showBadge && (
        <div
          className={`absolute z-20 ${
            isPortrait
              ? 'top-8 left-6 right-6 flex justify-between items-center'
              : isSquare
              ? 'top-6 left-6 right-6 flex justify-between items-center'
              : 'top-6 left-6 flex items-center gap-3'
          }`}
        >
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-amber-500 flex items-center justify-center font-bold text-sm shadow-md">
              {streamerUsername ? streamerUsername.charAt(0).toUpperCase() : 'T'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs truncate max-w-[130px]">
                  @{streamerUsername.replace('@', '') || 'streamer'}
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-600 text-white animate-pulse">
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mt-0.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#25f4ee]" />
                  {stats.viewerCount.toLocaleString('id-ID')}
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-rose-400">
                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                  {stats.totalLikes.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Portrait/Square embedded mini goal or stats */}
          {(isPortrait || isSquare) && showGoal && (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl flex items-center gap-2 text-xs">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="font-mono text-[11px] text-amber-300 font-bold">
                {stats.totalCoins} / {giftTarget}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Top Right: Landscape Goal Progress Bar */}
      {showGoal && !isPortrait && !isSquare && (
        <div className="absolute top-6 right-6 z-20 w-72 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs">
          <div className="flex items-center justify-between font-semibold mb-1.5">
            <span className="text-amber-300 flex items-center gap-1.5 text-xs">
              <Trophy className="w-4 h-4 text-amber-400" />
              Target Koin LIVE
            </span>
            <span className="font-mono text-slate-200 text-xs tabular-nums font-bold">
              {stats.totalCoins} <span className="text-slate-500">/</span> {giftTarget}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-[#fe2c55] transition-all duration-500 rounded-full shadow-lg"
              style={{ width: `${giftProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Center Gift Alert Pop-up Widget with REAL TIKTOK CDN GIFT IMAGE */}
      {showGift && activeGift && activeGift.gift && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
            isPortrait ? 'top-32 w-[90%] max-w-[420px]' : isSquare ? 'top-24 w-[90%] max-w-[380px]' : 'top-24 max-w-[460px]'
          }`}
        >
          <div
            className="p-4 rounded-3xl backdrop-blur-xl border-2 shadow-2xl flex items-center gap-4 transition-all animate-bounce"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 10, 20, 0.95) 100%)',
              borderColor: activeVisual.badgeColor || '#ffd700',
              boxShadow: `0 10px 40px -10px ${activeVisual.badgeColor}60`,
            }}
          >
            {/* Real TikTok CDN Gift Image */}
            <div className="relative shrink-0">
              <GiftIconImage
                gift={activeGift.gift}
                size={isPortrait || isSquare ? 'lg' : 'xl'}
                showCombo={false}
              />
              {activeGift.gift.repeatCount > 1 && (
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs rounded-lg font-mono shadow-xl border border-amber-200">
                  x{activeGift.gift.repeatCount}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{activeGift.user.nickname || activeGift.user.uniqueId}</span>
              </div>
              <div className="text-xl font-black text-white tracking-tight truncate mt-0.5">
                {activeGift.gift.giftName}
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-xs font-bold text-amber-400">
                <span>+{activeGift.gift.coinCost} Koin</span>
                {activeGift.gift.repeatCount > 1 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Combo Streak!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Chat Ticker Widget */}
      {showChat && (
        <div
          className={`absolute z-20 overflow-hidden flex flex-col justify-end space-y-2 pointer-events-none ${
            isPortrait
              ? 'bottom-8 left-6 right-6 max-h-[480px]'
              : isSquare
              ? 'bottom-6 left-6 right-6 max-h-[300px]'
              : 'bottom-6 left-6 w-96 max-h-[320px]'
          }`}
        >
          {recentChats.slice(isPortrait ? -6 : -4).map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-xs shadow-xl transition-all"
            >
              <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px] truncate">
                <span className="truncate">{c.user.nickname || c.user.uniqueId}</span>
                {c.user.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-700/80 font-mono shrink-0">
                    {c.user.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-slate-100 text-xs leading-relaxed break-words drop-shadow">
                {c.chat?.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
