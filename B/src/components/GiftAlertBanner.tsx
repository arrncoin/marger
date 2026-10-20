import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy } from 'lucide-react';
import { TikTokEvent } from '../types/tiktok';
import { GiftIconImage } from '../utils/giftIcons';

interface GiftAlertBannerProps {
  latestGiftEvent: TikTokEvent | null;
}

export const GiftAlertBanner: React.FC<GiftAlertBannerProps> = ({ latestGiftEvent }) => {
  const [visible, setVisible] = useState(false);
  const [currentGift, setCurrentGift] = useState<TikTokEvent | null>(null);

  useEffect(() => {
    if (!latestGiftEvent || !latestGiftEvent.gift) return;

    setCurrentGift(latestGiftEvent);
    setVisible(true);

    const coins = latestGiftEvent.gift.coinCost || 1;
    // Trigger celebratory confetti for big gifts
    if (coins >= 500) {
      try {
        confetti({
          particleCount: coins >= 2000 ? 120 : 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fe2c55', '#25f4ee', '#ffd700', '#ffffff'],
        });
      } catch {}
    }

    const timer = setTimeout(() => {
      setVisible(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, [latestGiftEvent]);

  if (!visible || !currentGift || !currentGift.gift) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500/70" />
          <span>Menunggu gift penonton berikutnya...</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">Alert Aktif</span>
      </div>
    );
  }

  const gift = currentGift.gift;
  const isBig = (gift.coinCost || 0) >= 100;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
        isBig
          ? 'bg-gradient-to-r from-amber-950/70 via-rose-950/60 to-slate-950 border-amber-600/60 shadow-lg shadow-amber-500/10'
          : 'bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-950 border-rose-800/60'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Gift Graphic & Info */}
        <div className="flex items-center gap-3.5 min-w-0">
            <GiftIconImage
              gift={gift}
              size={isBig ? 'xl' : 'lg'}
              showCombo={true}
            />

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold truncate">
                {currentGift.user.nickname || currentGift.user.uniqueId}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">mengirim gift</span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-lg font-bold text-white tracking-tight truncate">
                {gift.giftName}
              </h4>
              <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                +{(gift.coinCost || gift.diamondCount * gift.repeatCount).toLocaleString('id-ID')} koin
              </span>
            </div>

            <div className="text-[11px] text-slate-400 truncate">
              {gift.repeatCount > 1
                ? `Combo beruntun ${gift.repeatCount}x berturut-turut!`
                : 'Terima kasih atas dukungannya!'}
            </div>
          </div>
        </div>

        {/* Right: Badge / Combo highlight */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 text-xs text-amber-300 font-mono font-semibold bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded-md">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isBig ? 'SUPER GIFT' : 'COMBO'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1">
            {new Date(currentGift.timestamp).toLocaleTimeString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
};
