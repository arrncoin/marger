import React, { useState } from 'react';
import { TikTokGiftPayload } from '../types/tiktok';

export interface GiftVisualInfo {
  imageUrl: string | null;
  emoji: string;
  name: string;
  badgeColor: string;
}

// Curated authentic TikTok gift catalog with high-res Webcast CDN assets and rich fallbacks
export const TIKTOK_GIFT_CATALOG: Record<
  string,
  { cdnUrl: string; emoji: string; color: string; aliases: string[] }
> = {
  rose: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.png',
    emoji: '🌹',
    color: '#fe2c55',
    aliases: ['rose', 'mawar', 'red rose'],
  },
  tiktok: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/tiktok_icon.png~tplv-obj.png',
    emoji: '🎵',
    color: '#25f4ee',
    aliases: ['tiktok', 'musical note', 'logo tiktok', 'note'],
  },
  finger_heart: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/finger_heart.png~tplv-obj.png',
    emoji: '🫰',
    color: '#ff4d6d',
    aliases: ['finger heart', 'heart', 'hati', 'love finger'],
  },
  doughnut: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/doughnut.png~tplv-obj.png',
    emoji: '🍩',
    color: '#f59e0b',
    aliases: ['doughnut', 'donat', 'donut'],
  },
  perfume: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/perfume.png~tplv-obj.png',
    emoji: '✨',
    color: '#c084fc',
    aliases: ['perfume', 'parfum', 'minyak wangi'],
  },
  cap: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/cap.png~tplv-obj.png',
    emoji: '🧢',
    color: '#38bdf8',
    aliases: ['cap', 'topi', 'hat'],
  },
  panda: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/panda.png~tplv-obj.png',
    emoji: '🐼',
    color: '#e2e8f0',
    aliases: ['panda', 'cute panda'],
  },
  swan: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/swan.png~tplv-obj.png',
    emoji: '🦢',
    color: '#e0e7ff',
    aliases: ['swan', 'angsa', 'angsa putih'],
  },
  sunglasses: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/sunglasses.png~tplv-obj.png',
    emoji: '🕶️',
    color: '#fbbf24',
    aliases: ['sunglasses', 'kacamata', 'glasses'],
  },
  microphone: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/microphone.png~tplv-obj.png',
    emoji: '🎤',
    color: '#a78bfa',
    aliases: ['microphone', 'mic', 'karaoke'],
  },
  train: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/train.png~tplv-obj.png',
    emoji: '🚂',
    color: '#f97316',
    aliases: ['train', 'kereta', 'choo choo'],
  },
  money_gun: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/money_gun.png~tplv-obj.png',
    emoji: '🔫',
    color: '#e11d48',
    aliases: ['money gun', 'pistol uang', 'cash gun'],
  },
  whale: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/whale.png~tplv-obj.png',
    emoji: '🐋',
    color: '#0284c7',
    aliases: ['whale', 'paus', 'diving whale'],
  },
  lion: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/lion.png~tplv-obj.png',
    emoji: '🦁',
    color: '#f59e0b',
    aliases: ['lion', 'singa', 'leon', 'golden lion'],
  },
  universe: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/tiktok_universe.png~tplv-obj.png',
    emoji: '🪐',
    color: '#8b5cf6',
    aliases: ['universe', 'tiktok universe', 'semesta', 'alam semesta'],
  },
  galaxy: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/galaxy.png~tplv-obj.png',
    emoji: '🌌',
    color: '#6366f1',
    aliases: ['galaxy', 'galaksi'],
  },
  fireworks: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/fireworks.png~tplv-obj.png',
    emoji: '🎆',
    color: '#ec4899',
    aliases: ['fireworks', 'kembang api', 'firework'],
  },
  sports_car: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/sports_car.png~tplv-obj.png',
    emoji: '🏎️',
    color: '#ef4444',
    aliases: ['sports car', 'mobil balap', 'ferrari', 'supercar'],
  },
  yacht: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/yacht.png~tplv-obj.png',
    emoji: '🛥️',
    color: '#06b6d4',
    aliases: ['yacht', 'kapal pesiar', 'kapal'],
  },
  castle: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/castle.png~tplv-obj.png',
    emoji: '🏰',
    color: '#d97706',
    aliases: ['castle', 'istana', 'fantasy castle'],
  },
  dragon: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/dragon.png~tplv-obj.png',
    emoji: '🐉',
    color: '#dc2626',
    aliases: ['dragon', 'naga', 'fire dragon'],
  },
  crown: {
    cdnUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/little_crown.png~tplv-obj.png',
    emoji: '👑',
    color: '#fbbf24',
    aliases: ['crown', 'mahkota', 'little crown'],
  },
};

/**
 * Resolves the most accurate gift visual info based on real event data.
 * Priority:
 * 1. Direct giftPictureUrl from live TikTok payload (if it's an HTTP URL)
 * 2. giftIcon if it's an HTTP URL
 * 3. Matched entry from our TikTok LIVE Gift catalog by name or alias
 * 4. Emoji fallback
 */
export function getGiftVisual(gift?: Partial<TikTokGiftPayload> | null): GiftVisualInfo {
  if (!gift) {
    return {
      imageUrl: null,
      emoji: '🎁',
      name: 'Gift',
      badgeColor: '#fe2c55',
    };
  }

  const rawUrl = gift.giftPictureUrl || (gift.giftIcon && gift.giftIcon.startsWith('http') ? gift.giftIcon : null);
  const giftName = (gift.giftName || 'Gift').trim();
  const lowerName = giftName.toLowerCase();

  // If TikTok API already gave a real CDN image URL, use it directly!
  if (rawUrl && rawUrl.startsWith('http')) {
    // Find matching color if known
    let matchedColor = '#fe2c55';
    for (const item of Object.values(TIKTOK_GIFT_CATALOG)) {
      if (item.aliases.some((alias) => lowerName.includes(alias))) {
        matchedColor = item.color;
        break;
      }
    }
    return {
      imageUrl: rawUrl,
      emoji: gift.giftIcon && !gift.giftIcon.startsWith('http') ? gift.giftIcon : '🎁',
      name: giftName,
      badgeColor: matchedColor,
    };
  }

  // Lookup in catalog
  for (const item of Object.values(TIKTOK_GIFT_CATALOG)) {
    if (item.aliases.some((alias) => lowerName.includes(alias))) {
      return {
        imageUrl: item.cdnUrl,
        emoji: item.emoji,
        name: giftName,
        badgeColor: item.color,
      };
    }
  }

  // Fallback to emoji if provided in giftIcon
  return {
    imageUrl: null,
    emoji: gift.giftIcon || '🎁',
    name: giftName,
    badgeColor: (gift.coinCost || 0) >= 500 ? '#f59e0b' : '#fe2c55',
  };
}

interface GiftIconImageProps {
  gift?: Partial<TikTokGiftPayload> | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCombo?: boolean;
}

export const GiftIconImage: React.FC<GiftIconImageProps> = ({
  gift,
  size = 'md',
  className = '',
  showCombo = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const visual = getGiftVisual(gift);

  const sizeClasses = {
    sm: 'w-7 h-7 text-sm rounded-md',
    md: 'w-9 h-9 text-lg rounded-lg',
    lg: 'w-12 h-12 text-2xl rounded-xl',
    xl: 'w-16 h-16 text-3xl rounded-2xl',
  };

  const imgSizeClasses = {
    sm: 'w-7 h-7 p-0.5',
    md: 'w-9 h-9 p-1',
    lg: 'w-12 h-12 p-1.5',
    xl: 'w-16 h-16 p-2',
  };

  const repeatCount = gift?.repeatCount || 1;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      {visual.imageUrl && !imgError ? (
        <div
          className={`w-full h-full flex items-center justify-center rounded-[inherit] overflow-hidden bg-slate-900/90 border border-slate-700/80 shadow-md transition-transform duration-200`}
          style={{ borderColor: `${visual.badgeColor}40` }}
        >
          <img
            src={visual.imageUrl}
            alt={visual.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full object-contain ${imgSizeClasses[size]} drop-shadow`}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center rounded-[inherit] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 shadow-md`}
          style={{ borderColor: `${visual.badgeColor}60` }}
        >
          <span className="select-none transform transition-transform hover:scale-110">{visual.emoji}</span>
        </div>
      )}

      {showCombo && repeatCount > 1 && (
        <span
          className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded font-mono shadow-md select-none text-[9px] leading-tight"
          title={`Combo x${repeatCount}`}
        >
          x{repeatCount}
        </span>
      )}
    </div>
  );
};
