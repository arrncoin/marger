import React, { useState } from 'react';
import { Gift, Trophy, Crown, Flame, Sparkles } from 'lucide-react';
import { LiveStats, TikTokEvent } from '../types/tiktok';
import { GiftIconImage } from '../utils/giftIcons';

const TOP_GIFTER_IMG = '/src/assets/images/avatar_top_gifter_1792420301986.jpg';

interface RecentGiftsPanelProps {
  giftEvents: TikTokEvent[];
  stats: LiveStats;
}

export const RecentGiftsPanel: React.FC<RecentGiftsPanelProps> = ({ giftEvents, stats }) => {
  const [viewMode, setViewMode] = useState<'feed' | 'leaderboard'>('feed');

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[520px] overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Gift & Top Gifter</h3>
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('feed')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'feed'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gift Feed
          </button>
          <button
            onClick={() => setViewMode('leaderboard')}
            className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'leaderboard'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            Top Sultan
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {viewMode === 'feed' ? (
          giftEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Gift className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-400">Belum ada gift masuk</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Gift seperti Rose, Finger Heart, Paus, atau Singa akan terekam otomatis di sini.
              </p>
            </div>
          ) : (
            giftEvents.map((evt) => {
              const gift = evt.gift;
              if (!gift) return null;
              const coins = gift.coinCost || gift.diamondCount * gift.repeatCount;
              const isBig = coins >= 100;

              return (
                <div
                  key={evt.id}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isBig
                      ? 'bg-amber-950/30 border-amber-800/60 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GiftIconImage gift={gift} size="md" showCombo={false} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-200 truncate">
                          {evt.user.nickname || evt.user.uniqueId}
                        </span>
                        {evt.user.badge && (
                          <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            {evt.user.badge}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span>{gift.giftName}</span>
                        {gift.repeatCount > 1 && (
                          <span className="font-mono font-bold text-amber-400">
                            x{gift.repeatCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-amber-400 tabular-nums text-sm">
                      +{coins.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString('id-ID', {
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Leaderboard / Top Gifter View */
          <div className="space-y-3">
            {/* Top 1 Sultan Spotlight Card */}
            {stats.topGifters.length > 0 && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 relative overflow-hidden shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={TOP_GIFTER_IMG}
                      alt="Top Gifter Avatar"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
                    />
                    <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow">
                      <Crown className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-amber-400">#1 TOP SULTAN</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate">
                      {stats.topGifters[0].user.nickname}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      @{stats.topGifters[0].user.uniqueId} · {stats.topGifters[0].giftCount} gifts
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-amber-400 tabular-nums">
                      {stats.topGifters[0].totalCoins.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-slate-400">koin</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of gifters */}
            <div className="space-y-1.5 pt-1">
              {stats.topGifters.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Flame className="w-8 h-8 mx-auto text-slate-700 mb-2 stroke-1" />
                  <p className="text-xs">Belum ada donatur koin pada sesi ini</p>
                </div>
              ) : (
                stats.topGifters.map((gifter, idx) => (
                  <div
                    key={gifter.user.userId}
                    className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 text-center font-mono font-bold ${
                          idx === 0
                            ? 'text-amber-400'
                            : idx === 1
                            ? 'text-slate-300'
                            : idx === 2
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 truncate">
                          {gifter.user.nickname}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          @{gifter.user.uniqueId} · Terakhir: {gifter.lastGiftName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-amber-400 tabular-nums">
                      {gifter.totalCoins.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400 px-3 font-mono">
        <span>Total Koin: {stats.totalCoins.toLocaleString('id-ID')}</span>
        <span>{giftEvents.length} transaksi gift</span>
      </div>
    </div>
  );
};
