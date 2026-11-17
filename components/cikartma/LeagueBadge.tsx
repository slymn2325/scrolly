import React from 'react';
import type { LeagueTierId } from '@/utils/icons8Assets';

const TIER_LABEL: Record<LeagueTierId, string> = {
  bronze: 'Bronz',
  silver: 'Gumus',
  gold: 'Altin',
  platinum: 'Platin',
  diamond: 'Elmas',
};

interface LeagueBadgeProps {
  tier: LeagueTierId;
  size?: number;
}

export default function LeagueBadge({ tier, size = 48 }: LeagueBadgeProps) {
  return (
    <img
      src={`/brand/leagues/${tier}.svg`}
      alt={TIER_LABEL[tier]}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
