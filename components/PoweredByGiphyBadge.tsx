'use client';

import React from 'react';

export interface PoweredByGiphyBadgeProps {
  compact?: boolean;
  micro?: boolean;
  className?: string;
  lang?: 'tr' | 'en';
}

export default function PoweredByGiphyBadge({
  compact = false,
  micro = false,
  className = '',
  lang = 'tr',
}: PoweredByGiphyBadgeProps) {
  const ariaLabel =
    lang === 'tr' ? 'GIPHY tarafından sağlanmaktadır' : 'Powered by GIPHY';

  const containerClasses = micro
    ? 'inline-flex items-center gap-1 rounded border border-white/10 bg-black/55 px-2 py-0.5 text-[9px] tracking-wider opacity-80 backdrop-blur-sm transition hover:border-white/25 hover:opacity-100'
    : `inline-flex items-center rounded-md border border-white/15 bg-black/75 backdrop-blur-md transition hover:border-white/35 hover:bg-black/90 ${
        compact ? 'gap-1.5 px-2 py-0.5' : 'gap-2 px-2.5 py-1'
      }`;

  return (
    <a
      href="https://giphy.com/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-testid="powered-by-giphy-badge"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`${containerClasses} ${className}`.trim()}
    >
      {/* Official 5-stripe geometric GIPHY mark */}
      <svg
        viewBox="0 0 28 35"
        aria-hidden="true"
        className={micro ? 'h-2.5 w-2 shrink-0' : compact ? 'h-3.5 w-3 shrink-0' : 'h-4 w-3.5 shrink-0'}
      >
        <rect x="0" y="0" width="4" height="35" fill="#00FF99" />
        <rect x="0" y="31" width="28" height="4" fill="#9933FF" />
        <rect x="24" y="14" width="4" height="21" fill="#FF6666" />
        <rect x="0" y="0" width="16" height="4" fill="#FFF35C" />
        <polygon points="16,0 28,12 24,12 16,4" fill="#00CCFF" />
        <rect x="16" y="10" width="12" height="4" fill="#00CCFF" />
      </svg>

      <span className="inline-flex items-baseline gap-1 leading-none tracking-wider text-white">
        <span
          className={`font-bold uppercase text-white/80 ${
            micro ? 'text-[8px]' : compact ? 'text-[8px]' : 'text-[9px]'
          }`}
        >
          POWERED BY
        </span>
        <span
          className={`font-black uppercase tracking-widest text-white ${
            micro ? 'text-[9px]' : compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          GIPHY
        </span>
      </span>
    </a>
  );
}
