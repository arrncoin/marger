import React, { useState } from 'react';
import {
  X,
  Radio,
  Server,
  Cloud,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Key,
  Search,
  ExternalLink,
  Copy,
  Check,
  Hash,
} from 'lucide-react';
import { ConnectionConfig, ConnectionMode, ConnectionStatus } from '../types/tiktok';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConnectionStatus;
  statusMessage?: string;
  config: ConnectionConfig;
  onConnect: (config: ConnectionConfig) => void;
  onDisconnect: () => void;
  onReconnect: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  status,
  statusMessage,
  config,
  onConnect,
  onDisconnect,
  onReconnect,
}) => {
  const [mode, setMode] = useState<ConnectionMode>(config.mode || 'server-direct');
  const [username, setUsername] = useState(config.username || '');
  const [sessionId, setSessionId] = useState(config.sessionId || '');
  const [wsEndpoint, setWsEndpoint] = useState(config.wsEndpoint || 'ws://localhost:21213');
  const [copiedBridgeCmd, setCopiedBridgeCmd] = useState(false);

  // Diagnostic live check state
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    checked: boolean;
    isLive: boolean;
    roomId?: string;
    message?: string;
    diagnostic?: { title: string; detail: string; solution: string };
  } | null>(null);

  if (!isOpen) return null;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'reconnecting';
  const isError = status === 'error';

  const cleanUser = username.trim().replace(/^@/, '');

  const handleCheckStream = async () => {
    if (!cleanUser) return;
    setIsCheckingLive(true);
    setCheckResult(null);

    try {
      const res = await fetch(`/api/tiktok/check-stream?username=${encodeURIComponent(cleanUser)}`);
      const data = await res.json();
      setCheckResult({
        checked: true,
        isLive: Boolean(data.isLive),
        roomId: data.roomId,
        message: data.message,
        diagnostic: data.diagnostic,
      });
    } catch {
      setCheckResult({
        checked: true,
        isLive: false,
        message: 'Gagal melakukan verifikasi stream ke server.',
      });
    } finally {
      setIsCheckingLive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({
      mode,
      username: cleanUser,
      sessionId: sessionId.trim() || undefined,
      wsEndpoint: wsEndpoint.trim(),
    });
    onClose();
  };

  const bridgeCommand = `npx -y tiktok-live-connector-ws ${cleanUser || 'username_tiktok'}`;

  const copyBridgeCmd = () => {
    navigator.clipboard.writeText(bridgeCommand);
    setCopiedBridgeCmd(true);
    setTimeout(() => setCopiedBridgeCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-[#fe2c55]" />
            <div>
              <h3 className="text-base font-bold text-white">Koneksi TikTok LIVE Produksi</h3>
              <p className="text-xs text-slate-400">Hubungkan siaran langsung TikTok secara real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Status Alert Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : isConnecting
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                : isError
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : isConnecting ? (
              <RotateCw className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold capitalize">
                Status: {isConnected ? 'Terhubung (LIVE Aktif)' : isError ? 'Gagal Terhubung' : status}
              </div>
              <div className="text-[11px] leading-relaxed mt-0.5">
                {statusMessage || (isConnected ? 'Event live masuk secara real-time.' : 'Siap menghubungkan.')}
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block font-semibold text-slate-200 mb-1.5">Pilih Metode Koneksi</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('server-direct')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'server-direct'
                    ? 'bg-cyan-950/40 border-[#25f4ee] text-white shadow-sm shadow-[#25f4ee]/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-[#25f4ee]" />
                  Server Connector
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Koneksi backend cloud langsung tanpa software tambahan
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('websocket-bridge')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mode === 'websocket-bridge'
                    ? 'bg-rose-950/40 border-[#fe2c55] text-white shadow-sm shadow-[#fe2c55]/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#fe2c55]" />
                  Desktop Bridge (Rekomendasi)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Relay lokal ws://localhost:21213 (Bebas blokir IP)
                </div>
              </button>
            </div>
          </div>

          {/* TikTok Username Input + Live Check Tool */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-200">
                Username TikTok Streamer
              </label>
              <button
                type="button"
                onClick={handleCheckStream}
                disabled={!cleanUser || isCheckingLive}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 disabled:opacity-40"
              >
                {isCheckingLive ? (
                  <RotateCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                <span>{isCheckingLive ? 'Mengecek...' : 'Cek Status LIVE'}</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masukkan username siaran (contoh: budi_gaming)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Check Result Feedback */}
            {checkResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg border text-[11px] ${
                  checkResult.isLive
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-800 text-amber-300'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {checkResult.isLive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {checkResult.isLive
                      ? `Siaran @${cleanUser} SEDANG LIVE (Room ID: ${checkResult.roomId})`
                      : checkResult.diagnostic?.title || 'Akun Tidak Sedang LIVE'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                  {checkResult.diagnostic?.detail || checkResult.message}
                </div>
                {checkResult.diagnostic?.solution && (
                  <div className="text-[10px] text-amber-200/90 font-medium mt-1">
                    💡 Saran: {checkResult.diagnostic.solution}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mode-specific settings */}
          {mode === 'server-direct' ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    TikTok Session ID Cookie (Opsional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Bypass Rate-Limit</span>
                </div>
                <input
                  type="password"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Paste cookie sessionid TikTok jika ada..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Jika TikTok memunculkan error captcha/rate limit pada server cloud, tempel cookie <code className="text-slate-300">sessionid</code> dari browser Anda untuk akses 100% tanpa hambatan.
                </p>
              </div>

              {/* Notice why Desktop Bridge is recommended if cloud blocked */}
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/60 flex items-start gap-2.5">
                <Server className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-cyan-200/90 leading-relaxed">
                  <strong>Pilihan Paling Stabil:</strong> Jika server cloud tidak dapat menjangkau room LIVE, beralihlah ke tab <strong>Desktop Bridge</strong> di atas. Desktop bridge berjalan langsung dari koneksi internet Anda sehingga tidak pernah diblokir IP datacenter.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">
                  WebSocket Bridge Endpoint URL
                </label>
                <input
                  type="text"
                  value={wsEndpoint}
                  onChange={(e) => setWsEndpoint(e.target.value)}
                  placeholder="ws://localhost:21213"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              {/* Quick 1-Command Runner for Desktop */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-rose-400" />
                    Cara Menjalankan Desktop Bridge (1 Perintah)
                  </span>
                  <button
                    type="button"
                    onClick={copyBridgeCmd}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 border border-slate-700"
                  >
                    {copiedBridgeCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBridgeCmd ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Buka Terminal / CMD di komputer Anda, lalu jalankan:
                </p>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all">
                  {bridgeCommand}
                </div>
                <p className="text-[10px] text-slate-500">
                  Perintah di atas akan langsung mengaktifkan relay WebSocket di komputer Anda tanpa instalasi manual yang rumit.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2 shrink-0">
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onReconnect();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reconnect</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDisconnect();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors"
                >
                  Putus Koneksi
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || !cleanUser}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#fe2c55] to-[#e01943] text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 transition-opacity shadow-md shadow-rose-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Radio className="w-4 h-4" />
                  <span>{isConnecting ? 'Menghubungkan...' : 'Hubungkan ke LIVE'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
