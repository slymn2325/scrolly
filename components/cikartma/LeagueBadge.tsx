import React from 'react';
import { translations, type Language } from '@/i18n/translations';
import type { LeagueTierId } from '@/utils/icons8Assets';

interface LeagueBadgeProps {
  tier: LeagueTierId;
  size?: number;
  lang?: Language;
}

function leagueLabel(tier: LeagueTierId, lang: Language): string {
  const copy = translations[lang];
  switch (tier) {
    case 'bronze':
      return copy.leagueBronze;
    case 'silver':
      return copy.leagueSilver;
    case 'gold':
      return copy.leagueGold;
    case 'platinum':
      return copy.leaguePlatinum;
    case 'diamond':
      return copy.leagueDiamond;
    default: {
      const neverTier: never = tier;
      return neverTier;
    }
  }
}

export default function LeagueBadge({ tier, size = 48, lang = 'tr' }: LeagueBadgeProps) {
  return (
    <img
      src={`/brand/leagues/${tier}.svg`}
      alt={leagueLabel(tier, lang)}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
