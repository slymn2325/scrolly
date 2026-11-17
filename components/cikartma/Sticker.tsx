import React from 'react';

interface StickerProps {
  children: React.ReactNode;
  tilt?: number;
  className?: string;
  pressed?: boolean;
  as?: 'div' | 'button';
  onClick?: () => void;
  label?: string;
}

function clampTilt(tilt: number) {
  if (Number.isNaN(tilt)) return 0;
  return Math.min(2, Math.max(-3, tilt));
}

export default function Sticker({
  children,
  tilt = -2,
  className = '',
  pressed = false,
  as = 'div',
  onClick,
  label,
}: StickerProps) {
  const rotation = clampTilt(tilt);
  const shared = `cik-sticker inline-flex border-4 border-cik-sticker-rim bg-cik-surface text-cik-text shadow-sticker ${
    pressed ? 'shadow-sticker-press' : ''
  } ${className}`;
  const style = {
    transform: `rotate(${rotation}deg) translateY(${pressed ? '2px' : '0px'})`,
  } as const;

  if (as === 'button') {
    return (
      <button type="button" aria-label={label} onClick={onClick} className={shared} style={style}>
        <span className="cik-untilt block">{children}</span>
      </button>
    );
  }

  return (
    <div className={shared} style={style}>
      <span className="cik-untilt block">{children}</span>
    </div>
  );
}
