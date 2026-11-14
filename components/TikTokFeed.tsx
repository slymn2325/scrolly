'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import NativeAdSlide from '@/components/NativeAdSlide';
import TikTokFactSlide from '@/components/TikTokFactSlide';
import { CATEGORIES, type CategoryFilter, type CategoryId, type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';

export type FeedSlideItem =
  | { type: 'fact'; key: string; fact: FactCard }
  | { type: 'ad'; key: string; adIndex: number };

export interface TikTokFeedHandle {
  scrollToTop: () => void;
  scrollToNext: (fromSlideIdx?: number) => void;
}

interface TikTokFeedProps {
  deckFacts: FactCard[];
  lang: Language;
  darkMode: boolean;
  soundEnabled: boolean;
  activeCategory: CategoryFilter;
  favoriteIds: string[];
  streakDays: number;
  xp: number;
  cardsSinceLastQuiz: number;
  cookieBannerVisible?: boolean;
  onSelectCategory: (cat: CategoryFilter) => void;
  onChangeLang: (lang: Language) => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onFlipCard: (fact: FactCard) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onOpenDuelFromCard: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onGuessReward: (xp: number, accurate: boolean, category?: CategoryId, accuracyPct?: number) => void;
  onToggleFavorite: (fact: FactCard) => void;
  onButtonPop: () => void;
  onSlideIndexChange?: (slideIndex: number) => void;
}

const TikTokFeed = forwardRef<TikTokFeedHandle, TikTokFeedProps>(function TikTokFeed(
  {
    deckFacts,
    lang,
    darkMode,
    soundEnabled,
    activeCategory,
    favoriteIds,
    streakDays,
    xp,
    cardsSinceLastQuiz,
    cookieBannerVisible = false,
    onSelectCategory,
    onChangeLang,
    onToggleDarkMode,
    onToggleSound,
    onFlipCard,
    onDoubleTapLike,
    onDwellRead,
    onOpenDuelFromCard,
    onOpenStoryShare,
    onGuessReward,
    onToggleFavorite,
    onButtonPop,
    onSlideIndexChange,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  // Build slide stream: insert an isolated full-screen NativeAdSlide once every 7 fact cards
  const slides: FeedSlideItem[] = useMemo(() => {
    const items: FeedSlideItem[] = [];
    let adCount = 0;

    deckFacts.forEach((fact, idx) => {
      items.push({ type: 'fact', key: `fact-${fact.id}-${idx}`, fact });
      if ((idx + 1) % 7 === 0 && idx < deckFacts.length - 1) {
        items.push({ type: 'ad', key: `ad-${adCount}-${idx}`, adIndex: adCount });
        adCount += 1;
      }
    });

    return items;
  }, [deckFacts]);

  const scrollToSlide = useCallback((targetIndex: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(targetIndex, slides.length - 1));
    const slideHeight = container.clientHeight || window.innerHeight;
    container.scrollTo({ top: clamped * slideHeight, behavior: 'smooth' });
  }, [slides.length]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        const container = scrollRef.current;
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      scrollToNext: (fromSlideIdx?: number) => {
        const container = scrollRef.current;
        if (!container) return;
        const h = container.clientHeight || window.innerHeight;
        const current =
          typeof fromSlideIdx === 'number' ? fromSlideIdx : Math.round(container.scrollTop / h);
        scrollToSlide(current + 1);
      },
    }),
    [scrollToSlide]
  );

  // Desktop keyboard navigation (ArrowUp / ArrowDown) between slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;

      const container = scrollRef.current;
      if (!container) return;
      e.preventDefault();
      const h = container.clientHeight || window.innerHeight || 1;
      const current = Math.round(container.scrollTop / h);
      scrollToSlide(e.key === 'ArrowDown' ? current + 1 : current - 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToSlide]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Top Floating Transparent Overlay */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-[430px] md:max-w-6xl bg-gradient-to-b from-black/15 via-black/5 to-transparent px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 md:px-8 md:pt-5 dark:from-black/55 dark:via-black/25 dark:to-transparent">
        {/* Top Utility Bar: Left Streak+XP | Right Controls */}
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div
              data-testid="top-streak-xp-pill"
              className="inline-flex items-center gap-2 rounded-full border border-white/65 bg-white/65 px-3 py-1.5 text-xs font-extrabold text-ink shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-black/45 dark:text-white"
            >
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                <img
                  src={UI_ICON_PATHS.streakFire}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 object-contain"
                />
                <span>{streakDays}</span>
              </span>
              <span className="h-3 w-px bg-ink/15 dark:bg-white/20" />
              <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                <img
                  src={UI_ICON_PATHS.xpSparkles}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 object-contain"
                />
                <span>{xp}</span>
              </span>
            </div>

            <span
              data-testid="quiz-progress-pill"
              title={t.quizSubtitle}
              className="rounded-full border border-white/60 bg-white/60 px-2.5 py-1.5 text-[11px] font-extrabold text-ink/75 backdrop-blur-xl dark:border-white/15 dark:bg-black/45 dark:text-violet-200"
            >
              {Math.min(5, cardsSinceLastQuiz)}/5
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onToggleDarkMode}
              aria-label={darkMode ? t.lightModeOn : t.darkModeOn}
              data-testid="theme-toggle-btn"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/65 bg-white/65 text-ink shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-black/45 dark:text-amber-300"
            >
              <img
                src={darkMode ? UI_ICON_PATHS.themeSun : UI_ICON_PATHS.themeMoon}
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onToggleSound}
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
              data-testid="sound-toggle-btn"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/65 bg-white/65 text-ink shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-black/45 dark:text-violet-200"
            >
              <img
                src={soundEnabled ? UI_ICON_PATHS.soundOn : UI_ICON_PATHS.soundOff}
                alt=""
                aria-hidden="true"
                className={`h-5 w-5 object-contain ${soundEnabled ? '' : 'opacity-45 grayscale'}`}
              />
            </motion.button>

            <div
              role="group"
              aria-label="Language switch"
              className="flex items-center gap-0.5 rounded-full border border-white/65 bg-white/65 p-0.5 text-[11px] font-black backdrop-blur-xl dark:border-white/15 dark:bg-black/45"
            >
              <img
                src={UI_ICON_PATHS.langGlobe}
                alt=""
                aria-hidden="true"
                className="ml-1 h-4 w-4 object-contain"
              />
              <button
                type="button"
                onClick={() => onChangeLang('tr')}
                data-testid="lang-btn-tr"
                className={`rounded-full px-2 py-1 transition-all ${
                  lang === 'tr'
                    ? 'bg-ink text-white shadow-sm dark:bg-violet-600'
                    : 'text-ink/70 dark:text-white/70'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                data-testid="lang-btn-en"
                className={`rounded-full px-2 py-1 transition-all ${
                  lang === 'en'
                    ? 'bg-ink text-white shadow-sm dark:bg-violet-600'
                    : 'text-ink/70 dark:text-white/70'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* TikTok-Style Horizontal Floating Category Tabs with soft right fade mask on mobile, centered row on desktop */}
        <div
          data-testid="category-bar"
          className="no-scrollbar pointer-events-auto mt-1.5 md:mt-2.5 flex items-center gap-1.5 md:gap-2.5 overflow-x-auto md:overflow-visible pb-0.5 pr-4 md:pr-0 md:justify-center [-webkit-mask-image:linear-gradient(to_right,black_0%,black_88%,transparent_100%)] [mask-image:linear-gradient(to_right,black_0%,black_88%,transparent_100%)] md:[-webkit-mask-image:none] md:[mask-image:none]"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectCategory(cat.id)}
                data-testid={`category-pill-${cat.id}`}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold backdrop-blur-xl transition-all ${
                  isActive
                    ? 'bg-ink text-white shadow-md dark:bg-white dark:text-ink'
                    : 'border border-white/55 bg-white/55 text-ink/80 hover:bg-white/80 dark:border-white/15 dark:bg-black/35 dark:text-white/80'
                }`}
              >
                <img
                  src={cat.iconPath}
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 object-contain"
                />
                <span>{cat.label[lang]}</span>
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* Vertical Full-Bleed TikTok Snap Scroll Container */}
      <div
        ref={scrollRef}
        data-testid="tiktok-feed-container"
        onScroll={(e) => {
          if (!onSlideIndexChange) return;
          const el = e.currentTarget;
          const h = el.clientHeight || window.innerHeight || 1;
          const idx = Math.round(el.scrollTop / h);
          onSlideIndexChange(idx);
        }}
        className="tiktok-feed-scroll no-scrollbar h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {slides.map((slide, slideIdx) =>
          slide.type === 'fact' ? (
            <TikTokFactSlide
              key={slide.key}
              fact={slide.fact}
              lang={lang}
              isFavorite={favoriteIds.includes(slide.fact.id)}
              cookieBannerVisible={cookieBannerVisible}
              onFlip={onFlipCard}
              onDoubleTapLike={onDoubleTapLike}
              onDwellRead={onDwellRead}
              onNextSlide={() => scrollToSlide(slideIdx + 1)}
              onOpenDuel={onOpenDuelFromCard}
              onOpenStoryShare={onOpenStoryShare}
              onGuessReward={onGuessReward}
              onToggleFavorite={onToggleFavorite}
              onButtonPop={onButtonPop}
            />
          ) : (
            <NativeAdSlide
              key={slide.key}
              lang={lang}
              adIndex={slide.adIndex}
              cookieBannerVisible={cookieBannerVisible}
              onSkip={() => {
                onButtonPop();
                scrollToSlide(slideIdx + 1);
              }}
            />
          )
        )}
      </div>
    </div>
  );
});

export default TikTokFeed;
