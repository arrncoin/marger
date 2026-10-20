import React from 'react';
import { Volume2, VolumeX, Radio, Settings, HelpCircle, Monitor } from 'lucide-react';
import { ConnectionStatus } from '../types/tiktok';

interface HeaderProps {
  activeTab: 'dashboard' | 'chat' | 'gifts' | 'logs' | 'overlay';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'gifts' | 'logs' | 'overlay') => void;
  status: ConnectionStatus;
  statusMessage?: string;
  isSingerEnabled: boolean;
  onToggleSinger: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onConnectClick: () => void;
  streamerUsername: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  status,
  statusMessage,
  isSingerEnabled,
  onToggleSinger,
  onOpenSettings,
  onOpenGuide,
  onConnectClick,
  streamerUsername,
}) => {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'reconnecting';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Brand Wordmark (Single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-white flex items-center gap-2.5 whitespace-nowrap"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#fe2c55] to-[#25f4ee] flex items-center justify-center shadow-lg shadow-[#fe2c55]/20 text-black font-black text-sm">
            TL
          </span>
          <span>TikTok LIVE Singer</span>
        </a>

        {/* Quiet status metadata without pills */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pl-2">
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="font-mono tabular-nums text-slate-300">
            {streamerUsername ? `@${streamerUsername.replace('@', '')}` : 'Belum Terhubung'}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span
            className={
              isConnected
                ? 'text-emerald-400 font-medium'
                : isConnecting
                ? 'text-amber-400'
                : 'text-slate-400'
            }
          >
            {isConnected ? 'LIVE Aktif' : isConnecting ? 'Menghubungkan...' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (single-line, clean text with subtle active state) */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'dashboard'
              ? 'text-white border-b-2 border-[#fe2c55] font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Dashboard Stream
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-[#fe2c55] font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Live Chat
        </button>
        <button
          onClick={() => setActiveTab('gifts')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'gifts'
              ? 'text-white border-b-2 border-[#fe2c55] font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Gift & Top Fans
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`whitespace-nowrap transition-colors py-1 ${
            activeTab === 'logs'
              ? 'text-white border-b-2 border-[#fe2c55] font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          Event History
        </button>
        <button
          onClick={() => setActiveTab('overlay')}
          className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
            activeTab === 'overlay'
              ? 'text-[#25f4ee] border-b-2 border-[#25f4ee] font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-[#25f4ee]" />
          OBS Overlay
        </button>
      </nav>

      {/* Zone 3: Primary Action & Quick Tools */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSinger}
          title={isSingerEnabled ? 'Matikan Suara TTS' : 'Nyalakan Suara TTS'}
          className={`p-2 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
            isSingerEnabled
              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {isSingerEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
          <span className="hidden sm:inline font-mono text-xs">
            {isSingerEnabled ? 'TTS ON' : 'TTS MUTE'}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Pengaturan Suara & Template"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenGuide}
          title="Panduan Koneksi & OBS"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onConnectClick}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 shadow-sm ${
            isConnected
              ? 'bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900'
              : 'bg-gradient-to-r from-[#fe2c55] to-[#e01943] text-white hover:opacity-95'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-rose-400' : ''}`} />
          <span>{isConnected ? 'Disconnect' : 'Connect LIVE'}</span>
        </button>
      </div>
    </header>
  );
};
