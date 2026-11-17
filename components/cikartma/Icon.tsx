import React from 'react';
import { ICON_MAP, ICON_TONE, type IconName, type IconSize, type IconTone } from '@/lib/iconMap';

interface IconProps {
  name: IconName;
  size?: IconSize;
  tone?: IconTone;
  className?: string;
  label?: string;
}

export default function Icon({ name, size = 24, tone = 'default', className, label }: IconProps) {
  const Glyph = ICON_MAP[name];
  return (
    <Glyph
      size={size}
      strokeWidth={2}
      color={ICON_TONE[tone]}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      absoluteStrokeWidth={false}
    />
  );
}
