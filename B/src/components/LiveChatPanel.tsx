import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Volume2, Search, ArrowDown, ShieldCheck, Sparkles, Filter } from 'lucide-react';
import { TikTokEvent } from '../types/tiktok';

interface LiveChatPanelProps {
  chatEvents: TikTokEvent[];
  onSpeakComment: (event: TikTokEvent) => void;
  onClearChat?: () => void;
}

export const LiveChatPanel: React.FC<LiveChatPanelProps> = ({
  chatEvents,
  onSpeakComment,
  onClearChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredChats = chatEvents.filter((evt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const comment = evt.chat?.comment.toLowerCase() || '';
    const name = evt.user.nickname.toLowerCase();
    const username = evt.user.uniqueId.toLowerCase();
    return comment.includes(term) || name.includes(term) || username.includes(term);
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatEvents, autoScroll]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col h-[520px] overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#25f4ee]" />
          <h3 className="text-sm font-semibold text-white">Live Chat Penonton</h3>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            ({chatEvents.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Matikan Auto-scroll' : 'Aktifkan Auto-scroll'}
            className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
              autoScroll
                ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDown className={`w-3 h-3 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span className="font-mono text-[11px]">{autoScroll ? 'Auto' : 'Free'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-slate-800/60 bg-slate-950/20 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Cari komentar atau nama penonton..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-[11px] text-slate-400 hover:text-slate-200"
          >
            Reset
          </button>
        )}
      </div>

      {/* Chat Messages List */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 35;
          if (autoScroll !== isAtBottom) {
            setAutoScroll(isAtBottom);
          }
        }}
        className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs"
      >
        {filteredChats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
            <p className="text-sm font-medium text-slate-400">Belum ada komentar</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Komentar penonton TikTok LIVE akan muncul di sini secara real-time.
            </p>
          </div>
        ) : (
          filteredChats.map((evt) => {
            const isSub = evt.user.isSubscriber;
            const hasBadge = !!evt.user.badge;

            return (
              <div
                key={evt.id}
                className="group relative p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 hover:border-slate-700/80 transition-all hover:bg-slate-950/80 flex items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  {/* Sender metadata */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-200 hover:underline cursor-pointer">
                      {evt.user.nickname || evt.user.uniqueId}
                    </span>

                    {hasBadge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
                        {evt.user.badge}
                      </span>
                    )}

                    {isSub && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        Sub
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-mono">
                      @{evt.user.uniqueId}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono ml-auto">
                      {new Date(evt.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Comment text */}
                  <p className="mt-1 text-slate-200 break-words leading-relaxed text-[13px]">
                    {evt.chat?.comment}
                  </p>
                </div>

                {/* Quick Action: Speak this comment */}
                <button
                  onClick={() => onSpeakComment(evt)}
                  title="Bacakan komentar ini via TTS sekarang"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-all shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer controls */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400 px-3">
        <span>Menampilkan {filteredChats.length} komentar</span>
        {onClearChat && chatEvents.length > 0 && (
          <button
            onClick={onClearChat}
            className="hover:text-rose-400 transition-colors"
          >
            Bersihkan Chat
          </button>
        )}
      </div>
    </div>
  );
};
