import React from 'react';
import { ICON_MAP, type IconName, type IconSize, type IconTone } from '@/lib/iconMap';

const TONE_CLASS: Record<IconTone, string> = {
  default: 'text-cik-text',
  muted: 'text-cik-text-2',
  inactive: 'text-cik-text-3',
  active: 'text-cik-cta',
  on: 'text-cik-on-cta',
};

interface IconProps {
  name: IconName;
  size?: IconSize;
  tone?: IconTone;
  className?: string;
  label?: string;
}

export default function Icon({ name, size = 24, tone = 'default', className = '', label }: IconProps) {
  const Glyph = ICON_MAP[name];
  return (
    <Glyph
      size={size}
      strokeWidth={2}
      color="currentColor"
      className={`${TONE_CLASS[tone]} ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      absoluteStrokeWidth={false}
    />
  );
}
