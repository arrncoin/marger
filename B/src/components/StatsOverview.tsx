import React from 'react';
import { Users, Heart, Gift, UserPlus, Share2, Activity } from 'lucide-react';
import { LiveStats } from '../types/tiktok';

interface StatsOverviewProps {
  stats: LiveStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Viewers */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Penonton LIVE</span>
          <Users className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-white">
          {stats.viewerCount.toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Peak: <span className="font-mono text-slate-400">{stats.peakViewers.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* 2. Likes */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Total Likes</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-rose-400">
          {stats.totalLikes.toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Tap-tap layar</div>
      </div>

      {/* 3. Gifts & Coins */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Koin & Diamond</span>
          <Gift className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
          {stats.totalCoins.toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          <span className="font-mono text-slate-400">{stats.totalGiftsCount}</span> gift dikirim
        </div>
      </div>

      {/* 4. Follows */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Pengikut Baru</span>
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
          +{stats.totalFollows.toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Follower baru sesi ini</div>
      </div>

      {/* 5. Shares */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Total Share</span>
          <Share2 className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-purple-300">
          {stats.totalShares.toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Membagikan siaran</div>
      </div>

      {/* 6. Total Events */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Total Event</span>
          <Activity className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="text-xl font-bold font-mono tabular-nums text-slate-200">
          {(
            stats.totalGiftsCount +
            stats.totalComments +
            stats.totalFollows +
            stats.totalShares +
            stats.totalMembers
          ).toLocaleString('id-ID')}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          <span className="font-mono text-slate-400">{stats.totalComments}</span> komentar
        </div>
      </div>
    </div>
  );
};
