import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, Terminal, Monitor, AlertTriangle, Copy, Check } from 'lucide-react';

interface ConnectionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionGuideModal: React.FC<ConnectionGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const nodeBridgeCode = `// server-bridge.js (Jalankan di komputer lokal Anda)
import { WebcastPushConnection } from 'tiktok-live-connector';
import { WebSocketServer } from 'ws';

const TIKTOK_USERNAME = process.argv[2] || 'nama_akun_tiktok_anda';
const PORT = 21213;

const wss = new WebSocketServer({ port: PORT });
console.log(\`[Bridge] WebSocket server aktif di ws://localhost:\${PORT}\`);

const tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

tiktokLiveConnection.connect().then(state => {
  console.log(\`[TikTok] Terhubung ke room ID: \${state.roomId}\`);
}).catch(err => {
  console.error('[TikTok] Gagal terhubung:', err);
});

// Broadcast event TikTok ke dashboard
function broadcast(event, data) {
  const payload = JSON.stringify({ event, data });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

tiktokLiveConnection.on('chat', data => broadcast('chat', data));
tiktokLiveConnection.on('gift', data => broadcast('gift', data));
tiktokLiveConnection.on('like', data => broadcast('like', data));
tiktokLiveConnection.on('follow', data => broadcast('follow', data));
tiktokLiveConnection.on('share', data => broadcast('share', data));
tiktokLiveConnection.on('member', data => broadcast('member', data));
`;

  const copyCode = () => {
    navigator.clipboard.writeText(nodeBridgeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Panduan Koneksi TikTok LIVE & OBS</h3>
              <p className="text-xs text-slate-400">Arsitektur konektor, keamanan akun, dan setup live streaming</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-300">
          {/* Security & Policy Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">100% Aman & Tanpa Password</h4>
              <p className="text-emerald-200/80 mt-1 leading-relaxed">
                Aplikasi ini membaca event siaran publik (gift, komentar, like) tanpa pernah meminta kata sandi,
                token login, atau kredensial akun TikTok Anda. Akun Anda sepenuhnya aman dari risiko pembajakan.
              </p>
            </div>
          </div>

          {/* Section 1: Modes Overview */}
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-mono">1</span>
              Dua Pilihan Mode Produksi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-cyan-400 text-xs mb-1">Mode 1: Server Connector (Direct Cloud)</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Terhubung langsung ke TikTok Webcast melalui backend server aplikasi. Cukup masukkan username LIVE aktif dan sistem langsung mendengarkan gift, chat, like, dan viewer secara real-time.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-amber-400 text-xs mb-1">Mode 2: Desktop WebSocket Bridge</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Untuk koneksi dengan latensi ultra-rendah dan menggunakan IP residensial komputer streaming Anda (<code className="text-slate-300 font-mono">ws://localhost:21213</code>). Bebas dari batasan IP hosting/datacenter.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: How to Run Real TikTok Bridge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-mono">2</span>
                Langkah Menghubungkan LIVE Sungguhan (Node.js Connector)
              </h4>
              <button
                onClick={copyCode}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1.5 border border-slate-700"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Bridge'}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Buat folder baru di laptop/PC streaming Anda, lalu buka Terminal/CMD.</li>
              <li>
                Jalankan perintah install:{' '}
                <code className="text-cyan-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">
                  npm install tiktok-live-connector ws
                </code>
              </li>
              <li>
                Buat file bernama <code className="text-slate-200 font-mono">bridge.js</code> dan paste kode di bawah:
              </li>
            </ol>

            <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {nodeBridgeCode}
            </pre>

            <p className="mt-2 text-slate-400">
              Jalankan dengan:{' '}
              <code className="text-cyan-400 font-mono bg-slate-950 px-2 py-0.5 rounded">
                node bridge.js @username_kamu
              </code>
              , lalu di dashboard ini pilih mode <strong>WebSocket Bridge</strong> dan klik <strong>Connect LIVE</strong>!
            </p>
          </div>

          {/* Section 3: OBS Studio Integration */}
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-rose-400" />
              Cara Memasang Alert & Chat ke OBS Studio
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <p className="text-slate-300 leading-relaxed">
                Anda dapat menampilkan Gift Pop-up dan Live Chat langsung di layar siaran OBS Studio Anda:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Klik tab <strong>OBS Overlay</strong> pada navigasi atas dashboard.</li>
                <li>Salin link URL halaman overlay yang berlatar belakang transparan.</li>
                <li>Di OBS Studio: Tambahkan Source baru bertipe <strong>Browser Source</strong>.</li>
                <li>Paste URL tersebut, set ukuran ke <strong>1920 x 1080</strong>, dan centang <em>"Control audio via OBS"</em> (opsional).</li>
              </ul>
            </div>
          </div>

          {/* Technical Limitations notice */}
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Catatan Teknis TikTok:</strong> Siaran LIVE TikTok harus sedang berstatus AKTIF (sedang on-air)
              agar ID room dapat ditemukan. Jika status siaran offline, koneksi akan otomatis menunggu atau menampilkan error room not found.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
