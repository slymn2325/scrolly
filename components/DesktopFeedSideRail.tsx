'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DesktopFeedSideRailProps {
  onPrev: () => void;
  onNext: () => void;
  lang: 'tr' | 'en';
  darkMode: boolean;
}

/**
 * TikTok-style desktop controls attached to the right of the Reels stage:
 * up/down feed steppers. Per-slide like/save/share stay on the card edge.
 */
export default function DesktopFeedSideRail({
  onPrev,
  onNext,
  lang,
  darkMode,
}: DesktopFeedSideRailProps) {
  const btn = darkMode
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
    : 'border-[#1E1B2E]/15 bg-white/90 text-[#1E1B2E] hover:bg-white shadow-sm';

  return (
    <aside
      data-testid="desktop-feed-side-rail"
      data-theme={darkMode ? 'dark' : 'light'}
      className="relative z-20 hidden h-full w-14 shrink-0 flex-col items-center justify-center gap-3 lg:flex"
      aria-label={lang === 'tr' ? 'Kaydırma kontrolleri' : 'Feed controls'}
    >
      <button
        type="button"
        data-testid="desktop-feed-prev"
        onClick={onPrev}
        aria-label={lang === 'tr' ? 'Önceki kart' : 'Previous card'}
        className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${btn}`}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        data-testid="desktop-feed-next"
        onClick={onNext}
        aria-label={lang === 'tr' ? 'Sonraki kart' : 'Next card'}
        className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${btn}`}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </aside>
  );
}
