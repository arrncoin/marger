import React, { useState, useEffect } from 'react';
import { X, Volume2, Sliders, MessageSquare, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { SingerSettings } from '../types/tiktok';

interface SingerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SingerSettings;
  onSave: (newSettings: SingerSettings) => void;
  onTestVoice: (text?: string) => void;
  availableVoices: SpeechSynthesisVoice[];
}

export const SingerSettingsModal: React.FC<SingerSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onTestVoice,
  availableVoices,
}) => {
  const [form, setForm] = useState<SingerSettings>(settings);
  const [activeTab, setActiveTab] = useState<'voice' | 'events' | 'templates' | 'filters'>('voice');
  const [newBadWord, setNewBadWord] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const addBadWord = () => {
    if (!newBadWord.trim()) return;
    if (!form.badWordsList.includes(newBadWord.trim().toLowerCase())) {
      setForm({
        ...form,
        badWordsList: [...form.badWordsList, newBadWord.trim().toLowerCase()],
      });
    }
    setNewBadWord('');
  };

  const removeBadWord = (word: string) => {
    setForm({
      ...form,
      badWordsList: form.badWordsList.filter((w) => w !== word),
    });
  };

  // Group Indonesian voices on top
  const sortedVoices = [...availableVoices].sort((a, b) => {
    const aIsId = a.lang.toLowerCase().includes('id');
    const bIsId = b.lang.toLowerCase().includes('id');
    if (aIsId && !bIsId) return -1;
    if (!aIsId && bIsId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#25f4ee]" />
            <div>
              <h3 className="text-base font-bold text-white">Pengaturan TTS Singer & Suara</h3>
              <p className="text-xs text-slate-400">Atur suara pembaca, filter kata, dan template kalimat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/30 px-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 px-3 transition-colors border-b-2 ${
              activeTab === 'voice'
                ? 'border-[#25f4ee] text-[#25f4ee]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Suara & Nada
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-3 px-3 transition-colors border-b-2 ${
              activeTab === 'events'
                ? 'border-[#25f4ee] text-[#25f4ee]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pilihan Event
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-3 transition-colors border-b-2 ${
              activeTab === 'templates'
                ? 'border-[#25f4ee] text-[#25f4ee]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Template Kalimat
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`py-3 px-3 transition-colors border-b-2 ${
              activeTab === 'filters'
                ? 'border-[#25f4ee] text-[#25f4ee]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Filter & Anti-Spam
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* TAB 1: Voice & Tuning */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Voice Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Pilihan Suara (Web Speech API)
                </label>
                <select
                  value={form.voiceURI}
                  onChange={(e) => setForm({ ...form, voiceURI: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                >
                  <option value="">
                    {availableVoices.length > 0 ? 'Pilih suara dari daftar...' : 'Suara belum tersedia'}
                  </option>
                  {sortedVoices.map((v) => {
                    const isIndo = v.lang.toLowerCase().includes('id');
                    return (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {isIndo ? '🇮🇩 [Indonesia] ' : ''}
                        {v.name} ({v.lang})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih suara yang tersedia. TTS tidak akan berbunyi jika belum ada suara yang dipilih atau suara pilihan tidak tersedia.
                </p>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Speech Rate */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">Kecepatan Bicara</span>
                    <span className="font-mono text-cyan-400">{form.rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.6"
                    step="0.05"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) })}
                    className="w-full accent-[#25f4ee]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Lambat (0.7x)</span>
                    <span>Cepat (1.6x)</span>
                  </div>
                </div>

                {/* Pitch */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">Nada Suara (Pitch)</span>
                    <span className="font-mono text-cyan-400">{form.pitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={form.pitch}
                    onChange={(e) => setForm({ ...form, pitch: parseFloat(e.target.value) })}
                    className="w-full accent-[#25f4ee]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Berat/Ngebass</span>
                    <span>Tinggi/Cempreng</span>
                  </div>
                </div>

                {/* Volume */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">Volume TTS</span>
                    <span className="font-mono text-cyan-400">{Math.round(form.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })}
                    className="w-full accent-[#25f4ee]"
                  />
                </div>

                {/* Delay between speech */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">Jeda Antar Suara</span>
                    <span className="font-mono text-cyan-400">{form.delayBetweenSpeechMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={form.delayBetweenSpeechMs}
                    onChange={(e) =>
                      setForm({ ...form, delayBetweenSpeechMs: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#25f4ee]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Cepat (100ms)</span>
                    <span>Santai (1.5s)</span>
                  </div>
                </div>
              </div>

              {/* Sound Effects toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Mainkan Nada Chime (SFX)</div>
                  <p className="text-[11px] text-slate-400">
                    Membunyikan nada notifikasi halus sebelum suara TTS dibacakan.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.playSfx}
                  onChange={(e) => setForm({ ...form, playSfx: e.target.checked })}
                  className="w-4 h-4 accent-[#25f4ee] cursor-pointer"
                />
              </div>

              {/* Test Voice Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onTestVoice()}
                  className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-medium flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-[#25f4ee]" />
                  <span>Uji Coba Suara Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Event Toggles */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Pilih event TikTok LIVE mana saja yang diizinkan untuk dibacakan oleh suara TTS:
              </p>

              {[
                { key: 'gift', label: 'Gift Penonton', desc: 'Membacakan nama pengirim, nama gift, dan jumlah combo' },
                { key: 'chat', label: 'Komentar Chat', desc: 'Membacakan isi chat penonton (disaring anti-spam)' },
                { key: 'follow', label: 'Follower Baru', desc: 'Membacakan penonton yang baru mengikuti akun LIVE' },
                { key: 'share', label: 'Share Siaran', desc: 'Membacakan penonton yang membagikan link LIVE' },
                { key: 'like', label: 'Akumulasi Likes', desc: 'Membacakan lonjakan like (secara agregat, bukan per tap)' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.eventToggles[item.key as keyof typeof form.eventToggles]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        eventToggles: {
                          ...form.eventToggles,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-[#25f4ee] cursor-pointer"
                  />
                </label>
              ))}
            </div>
          )}

          {/* TAB 3: Sentence Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-3.5">
              <p className="text-slate-400 text-xs">
                Ubah format kalimat yang akan diucapkan oleh sistem suara. Gunakan placeholder seperti{' '}
                <span className="text-[#25f4ee] font-mono">{'{user}'}</span>,{' '}
                <span className="text-[#25f4ee] font-mono">{'{giftName}'}</span>,{' '}
                <span className="text-[#25f4ee] font-mono">{'{count}'}</span>,{' '}
                <span className="text-[#25f4ee] font-mono">{'{comment}'}</span>.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Gift</label>
                <input
                  type="text"
                  value={form.templates.gift}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      templates: { ...form.templates, gift: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Komentar Chat</label>
                <input
                  type="text"
                  value={form.templates.chat}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      templates: { ...form.templates, chat: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Follow Baru</label>
                <input
                  type="text"
                  value={form.templates.follow}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      templates: { ...form.templates, follow: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Share Siaran</label>
                <input
                  type="text"
                  value={form.templates.share}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      templates: { ...form.templates, share: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Template Akumulasi Likes</label>
                <input
                  type="text"
                  value={form.templates.like}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      templates: { ...form.templates, like: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#25f4ee]"
                />
              </div>

            </div>
          )}

          {/* TAB 4: Filters & Anti-Spam */}
          {activeTab === 'filters' && (
            <div className="space-y-4">
              {/* Min Gift Coins */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-200">Minimal Koin Gift untuk Dibaca</span>
                  <span className="font-mono text-amber-400 font-bold">{form.minGiftCoins} Koin</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={form.minGiftCoins}
                  onChange={(e) => setForm({ ...form, minGiftCoins: parseInt(e.target.value) })}
                  className="w-full accent-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika disetel lebih dari 1, gift kecil seperti 1 koin mawar akan dilewati suara TTS agar tidak berisik saat spam mawar berlangsung.
                </p>
              </div>

              {/* Likes Batch Threshold */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-200">Threshold Like Batch</span>
                  <span className="font-mono text-rose-400 font-bold">{form.likeBatchThreshold} Likes</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={form.likeBatchThreshold}
                  onChange={(e) => setForm({ ...form, likeBatchThreshold: parseInt(e.target.value) })}
                  className="w-full accent-rose-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Jumlah like terkumpul sebelum dibacakan satu kali notifikasi rangkuman like.
                </p>
              </div>

              {/* Bad Words Blacklist */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Filter Kata Terlarang (Blacklist)
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.filterBadWords}
                      onChange={(e) => setForm({ ...form, filterBadWords: e.target.checked })}
                      className="accent-[#25f4ee]"
                    />
                    <span>Aktifkan</span>
                  </label>
                </div>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Tambah kata kasar / spam..."
                    value={newBadWord}
                    onChange={(e) => setNewBadWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBadWord();
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addBadWord}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Tambah
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                  {form.badWordsList.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => removeBadWord(word)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-[#25f4ee] hover:bg-[#1ee0da] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-[#25f4ee]/20"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
