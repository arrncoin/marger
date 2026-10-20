import React, { useState } from 'react';
import {
  ListFilter,
  Download,
  Trash2,
  Search,
  Gift,
  MessageSquare,
  UserPlus,
  Share2,
  Heart,
  LogIn,
  Crown,
} from 'lucide-react';
import { TikTokEvent, TikTokEventType } from '../types/tiktok';
import { GiftIconImage } from '../utils/giftIcons';

interface EventLogPanelProps {
  events: TikTokEvent[];
  onClearLogs: () => void;
}

export const EventLogPanel: React.FC<EventLogPanelProps> = ({ events, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((evt) => {
    if (filterType !== 'all' && evt.type !== filterType) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = evt.user.nickname.toLowerCase();
    const username = evt.user.uniqueId.toLowerCase();
    const chat = evt.chat?.comment.toLowerCase() || '';
    const gift = evt.gift?.giftName.toLowerCase() || '';

    return (
      name.includes(query) ||
      username.includes(query) ||
      chat.includes(query) ||
      gift.includes(query)
    );
  });

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tiktok_live_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToCsv = () => {
    const headers = ['Timestamp', 'Type', 'UserId', 'UniqueId', 'Nickname', 'Detail', 'Coins'];
    const rows = events.map((evt) => {
      let detail = '';
      let coins = 0;
      if (evt.type === 'gift') {
        detail = `${evt.gift?.giftName} x${evt.gift?.repeatCount}`;
        coins = evt.gift?.coinCost || 0;
      } else if (evt.type === 'chat') {
        detail = `"${(evt.chat?.comment || '').replace(/"/g, '""')}"`;
      } else if (evt.type === 'like') {
        detail = `+${evt.like?.count} likes`;
      } else if (evt.type === 'member') {
        detail = evt.member?.subTier || 'Member';
      } else if (evt.type === 'share') {
        detail = evt.share?.shareType || 'Share';
      }

      return [
        new Date(evt.timestamp).toISOString(),
        evt.type,
        evt.user.userId,
        evt.user.uniqueId,
        `"${evt.user.nickname.replace(/"/g, '""')}"`,
        `"${detail}"`,
        coins,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `tiktok_live_events_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getEventBadge = (type: TikTokEventType) => {
    switch (type) {
      case 'gift':
        return (
          <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
            <Gift className="w-3 h-3" />
            Gift
          </span>
        );
      case 'chat':
        return (
          <span className="flex items-center gap-1 text-cyan-400 font-mono text-[11px]">
            <MessageSquare className="w-3 h-3" />
            Chat
          </span>
        );
      case 'follow':
        return (
          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <UserPlus className="w-3 h-3" />
            Follow
          </span>
        );
      case 'share':
        return (
          <span className="flex items-center gap-1 text-purple-400 font-mono text-[11px]">
            <Share2 className="w-3 h-3" />
            Share
          </span>
        );
      case 'like':
        return (
          <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
            <Heart className="w-3 h-3" />
            Like
          </span>
        );
      case 'join':
        return (
          <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
            <LogIn className="w-3 h-3" />
            Join
          </span>
        );
      case 'member':
        return (
          <span className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
            <Crown className="w-3 h-3" />
            Member
          </span>
        );
    }
  };

  const renderEventDetail = (evt: TikTokEvent) => {
    switch (evt.type) {
      case 'gift':
        return (
          <div className="flex items-center gap-2">
            <GiftIconImage gift={evt.gift} size="sm" showCombo={false} />
            <span className="text-slate-200 font-medium">
              {evt.gift?.giftName}
            </span>
            {evt.gift && evt.gift.repeatCount > 1 && (
              <span className="font-mono text-amber-400 font-bold">
                x{evt.gift.repeatCount}
              </span>
            )}
            <span className="font-mono text-amber-300 tabular-nums">
              (+{evt.gift?.coinCost?.toLocaleString('id-ID')} koin)
            </span>
          </div>
        );
      case 'chat':
        return <span className="text-slate-300 break-words">{evt.chat?.comment}</span>;
      case 'like':
        return (
          <span className="text-rose-300 font-mono">
            +{evt.like?.count} likes (Total: {evt.like?.totalLikes.toLocaleString('id-ID')})
          </span>
        );
      case 'follow':
        return <span className="text-emerald-300">Mulai mengikuti siaran LIVE ini</span>;
      case 'share':
        return <span className="text-purple-300">Membagikan siaran LIVE</span>;
      case 'join':
        return <span className="text-slate-400">Bergabung ke siaran LIVE</span>;
      case 'member':
        return (
          <span className="text-amber-300 font-semibold">
            Bergabung menjadi langganan / subscriber baru!
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[520px] overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Event Log & Riwayat Stream</h3>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            ({filteredEvents.length}/{events.length})
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            disabled={events.length === 0}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            onClick={exportToJson}
            disabled={events.length === 0}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
          <button
            onClick={onClearLogs}
            disabled={events.length === 0}
            className="p-1 rounded-md bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 disabled:opacity-40"
            title="Bersihkan log riwayat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'gift', label: 'Gift' },
            { id: 'chat', label: 'Chat' },
            { id: 'follow', label: 'Follow' },
            { id: 'share', label: 'Share' },
            { id: 'like', label: 'Like' },
            { id: 'member', label: 'Member' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari user atau kata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full sm:w-36"
          />
        </div>
      </div>

      {/* Event Rows (Dense Table) */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ListFilter className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
            <p className="text-sm font-medium text-slate-400">Tidak ada event yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">
              {events.length === 0 ? 'Event akan tercatat begitu siaran dimulai.' : 'Coba ubah filter atau kata kunci pencarian.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 text-xs">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="px-3 py-2 hover:bg-slate-950/40 transition-colors flex items-center justify-between gap-3"
              >
                {/* Type & Time */}
                <div className="flex items-center gap-2.5 shrink-0 w-36">
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {new Date(evt.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <div>{getEventBadge(evt.type)}</div>
                </div>

                {/* User */}
                <div className="w-44 shrink-0 truncate">
                  <span className="font-semibold text-slate-200">
                    {evt.user.nickname || evt.user.uniqueId}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                    @{evt.user.uniqueId}
                  </span>
                </div>

                {/* Event Detail */}
                <div className="flex-1 min-w-0">{renderEventDetail(evt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400 px-3 font-mono">
        <span>Menampilkan {filteredEvents.length} event</span>
        <span>Auto-logged</span>
      </div>
    </div>
  );
};
