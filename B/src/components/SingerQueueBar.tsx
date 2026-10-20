import React from 'react';
import { Play, Pause, SkipForward, Trash2, Volume2, Sparkles, Mic } from 'lucide-react';
import { QueueItem } from '../types/tiktok';

interface SingerQueueBarProps {
  queue: QueueItem[];
  currentItem: QueueItem | null;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onClear: () => void;
  onTestVoice: () => void;
}

export const SingerQueueBar: React.FC<SingerQueueBarProps> = ({
  queue,
  currentItem,
  isPaused,
  onPause,
  onResume,
  onSkip,
  onClear,
  onTestVoice,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
      {/* Left: Active speech indicator & utterance */}
      <div className="flex items-center gap-3 w-full md:w-auto min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            currentItem
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
          }`}
        >
          {currentItem ? (
            <Volume2 className="w-5 h-5 animate-pulse text-emerald-400" />
          ) : (
            <Mic className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              {currentItem ? 'Sedang Dibacakan' : 'Antrean Suara (TTS)'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono tabular-nums text-slate-400 text-[11px]">
              {queue.length} pesan mengantre
            </span>
          </div>

          <p className="text-sm text-slate-300 truncate font-medium">
            {currentItem ? (
              <span className="text-emerald-300">"{currentItem.textToSpeak}"</span>
            ) : queue.length > 0 ? (
              <span className="text-slate-400">Selanjutnya: "{queue[0].textToSpeak}"</span>
            ) : (
              <span className="text-slate-400">Siap membacakan event baru secara otomatis</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Player controls */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
        <button
          onClick={onTestVoice}
          title="Uji coba suara TTS"
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Tes Suara</span>
        </button>

        {isPaused ? (
          <button
            onClick={onResume}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        ) : (
          <button
            onClick={onPause}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        )}

        <button
          onClick={onSkip}
          disabled={!currentItem}
          title="Lewati pesan yang sedang dibaca"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={onClear}
          disabled={queue.length === 0 && !currentItem}
          title="Hapus semua antrean suara"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-800 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
