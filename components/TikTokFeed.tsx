'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import NativeAdSlide from '@/components/NativeAdSlide';
import QuizCtaSlide from '@/components/QuizCtaSlide';
import TikTokFactSlide from '@/components/TikTokFactSlide';
import VocabularySlide from '@/components/VocabularySlide';
import {
  CATEGORIES,
  CATEGORY_SELECTOR_OPTIONS,
  FEED_EXPERIENCE_COPY,
  getCategoryMeta,
  type CategoryFilter,
  type CategoryId,
  type Language,
  translations,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';

export type FeedSlideItem =
  | { type: 'fact'; key: string; fact: FactCard; factIndex: number }
  | { type: 'vocabulary'; key: string; card: VocabularyCard; vocabIndex: number }
  | { type: 'quizCta'; key: string; ctaIndex: number }
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
  totalCardsViewed?: number;
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
  onOpenQuizHub: () => void;
  onButtonPop: () => void;
  onSlideIndexChange?: (slideIndex: number) => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
  vocabularyCards?: VocabularyCard[];
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
    totalCardsViewed = 0,
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
    onOpenQuizHub,
    onButtonPop,
    onSlideIndexChange,
    onEarnXp,
    onSuccessSound,
    onWrongSound,
    vocabularyCards,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef<number>(0);
  const wheelCooldownRef = useRef<number>(0);
  const onSlideIndexChangeRef = useRef(onSlideIndexChange);
  onSlideIndexChangeRef.current = onSlideIndexChange;
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const t = translations[lang];
  const copy = FEED_EXPERIENCE_COPY[lang];
  const allCategoryMeta = CATEGORIES[0];
  const activeCategoryMeta = getCategoryMeta(activeCategory);
  const vocabPool = useMemo(
    () => (vocabularyCards && vocabularyCards.length > 0 ? vocabularyCards : getVocabularyFacts()),
    [vocabularyCards]
  );

  // Dil Öğrenme = vocab-only. Genel = facts + 1 vocab every 4–5 cards. Category = filtered facts.
  const slides: FeedSlideItem[] = useMemo(() => {
    const items: FeedSlideItem[] = [];
    let adCount = 0;
    let ctaCount = 0;
    let vocabCursor = 0;

    if (activeCategory === 'vocabulary') {
      return vocabPool.map((card, idx) => ({
        type: 'vocabulary' as const,
        key: `vocab-${card.id}-${idx}`,
        card,
        vocabIndex: idx,
      }));
    }

    const insertVocabEvery = 5;
    deckFacts.forEach((fact, idx) => {
      items.push({ type: 'fact', key: `fact-${fact.id}-${idx}`, fact, factIndex: idx });
      const position = idx + 1;

      if (activeCategory === 'all' && vocabPool.length > 0 && position % insertVocabEvery === 0) {
        const card = vocabPool[vocabCursor % vocabPool.length];
        items.push({
          type: 'vocabulary',
          key: `vocab-mix-${card.id}-${vocabCursor}`,
          card,
          vocabIndex: vocabCursor,
        });
        vocabCursor += 1;
      }

      const hasMoreFacts = idx < deckFacts.length - 1;
      if (!hasMoreFacts) return;

      if (position % 13 === 0) {
        items.push({ type: 'quizCta', key: `quiz-cta-${ctaCount}-${idx}`, ctaIndex: ctaCount });
        ctaCount += 1;
      } else if (position >= 7 && (position - 7) % 13 === 0) {
        items.push({ type: 'ad', key: `ad-${adCount}-${idx}`, adIndex: adCount });
        adCount += 1;
      }
    });

    return items;
  }, [deckFacts, activeCategory, vocabPool]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [deckFacts, activeCategory]);

  // Detect active card with IntersectionObserver (threshold: 0.65) and debounce telemetry callback by 150ms
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || slides.length === 0) return;

    const slideNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-slide-index]'));
    if (slideNodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx: number | null = null;
        let bestRatio = 0;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65 && entry.intersectionRatio >= bestRatio) {
            const parsed = Number((entry.target as HTMLElement).dataset.slideIndex);
            if (Number.isFinite(parsed)) {
              bestIdx = parsed;
              bestRatio = entry.intersectionRatio;
            }
          }
        }

        if (bestIdx === null) return;
        const settledIdx = bestIdx;
        activeIndexRef.current = settledIdx;
        setActiveIndex((prev) => (prev === settledIdx ? prev : settledIdx));

        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
        }
        settleTimerRef.current = setTimeout(() => {
          settleTimerRef.current = null;
          onSlideIndexChangeRef.current?.(settledIdx);

          const settledSlide = slides[settledIdx];
          if (settledSlide?.type === 'fact' && typeof window !== 'undefined') {
            const nextSlug =
              settledSlide.fact[lang]?.slug ||
              settledSlide.fact.slug ||
              settledSlide.fact.en.slug ||
              settledSlide.fact.id;
            if (nextSlug) {
              try {
                const currentUrl = new URL(window.location.href);
                if (currentUrl.searchParams.get('fact') !== nextSlug) {
                  currentUrl.searchParams.set('fact', nextSlug);
                  window.history.replaceState(
                    window.history.state,
                    '',
                    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
                  );
                }
              } catch {
                // Ignore history API errors in restricted webviews
              }
            }
          }
        }, 150);
      },
      {
        root: container,
        threshold: [0.65],
      }
    );

    slideNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [slides, lang]);

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
        activeIndexRef.current = 0;
        setActiveIndex(0);
        const container = scrollRef.current;
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      scrollToNext: (fromSlideIdx?: number) => {
        const current = typeof fromSlideIdx === 'number' ? fromSlideIdx : activeIndexRef.current;
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

  // Single-card wheel stepping on desktop without fighting inner sheet scrolling
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('[data-testid="language-lab-overlay"], [data-testid="fact-card-back"]')) {
        return;
      }
      if (Math.abs(e.deltaY) < 20) return;

      e.preventDefault();
      const now = Date.now();
      if (now - wheelCooldownRef.current < 420) {
        return;
      }
      wheelCooldownRef.current = now;
      const direction = e.deltaY > 0 ? 1 : -1;
      scrollToSlide(activeIndexRef.current + direction);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scrollToSlide]);

  // Close Category Drawer on Escape key
  useEffect(() => {
    if (!isCategoryDrawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isCategoryDrawerOpen]);

  const progressTotal = Math.max(1, Math.min(13, slides.length));
  const progressSlot = activeIndex % progressTotal;

  return (
    <div className="relative mx-auto h-full w-full max-w-[440px] overflow-hidden">
      {/* Top HUD — z-30, hard-capped to 440px stage */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 w-full max-w-[440px] bg-gradient-to-b from-black/25 via-black/5 to-transparent px-2.5 pt-[calc(env(safe-area-inset-top)+6px)] pb-2 dark:from-black/60 dark:via-black/25 dark:to-transparent">
        {/* Stories-Style Segmented Deck Progress Indicator */}
        <div
          aria-hidden="true"
          data-testid="stories-progress-bar"
          className="mb-1.5 flex items-center gap-1"
        >
          {Array.from({ length: progressTotal }).map((_, idx) => {
            const isFilled = idx <= progressSlot;
            return (
              <span
                key={`seg-${idx}`}
                className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-ink/15 dark:bg-white/20"
              >
                <span
                  className={`block h-full w-full rounded-full transition-all duration-300 ${
                    isFilled ? 'bg-ink dark:bg-white opacity-90' : 'opacity-0'
                  }`}
                />
              </span>
            );
          })}
        </div>
        {/* Top Utility Bar: Left Streak+XP | Right Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <div
              data-testid="top-streak-xp-pill"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-ink shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-white"
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

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenQuizHub}
              data-testid="quiz-progress-pill"
              title={t.quizSubtitle}
              className={`rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold transition-all ${
                cardsSinceLastQuiz >= 5
                  ? 'border-emerald-300/90 bg-gradient-to-r from-emerald-500 to-amber-500 text-white shadow-md ring-2 ring-emerald-300/50 dark:border-emerald-400/70'
                  : 'border-slate-200/90 bg-white/95 text-ink/80 hover:bg-white dark:border-white/15 dark:bg-slate-900/95 dark:text-violet-200'
              }`}
            >
              {cardsSinceLastQuiz >= 5 ? '5/5 ✓' : `${Math.min(5, cardsSinceLastQuiz)}/5`}
            </motion.button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onToggleDarkMode}
              aria-label={darkMode ? t.lightModeOn : t.darkModeOn}
              data-testid="theme-toggle-btn"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-amber-300"
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-ink shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-violet-200"
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
              className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 text-[10px] font-black dark:border-white/15 dark:bg-slate-900"
            >
              <img
                src={UI_ICON_PATHS.langGlobe}
                alt=""
                aria-hidden="true"
                className="ml-1 h-3.5 w-3.5 object-contain"
              />
              <button
                type="button"
                onClick={() => onChangeLang('tr')}
                data-testid="lang-btn-tr"
                className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full px-2 py-1 transition-all ${
                  lang === 'tr'
                    ? 'bg-ink text-white shadow-sm dark:bg-violet-600'
                    : 'text-ink/80 dark:text-white/85'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                data-testid="lang-btn-en"
                className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full px-2 py-1 transition-all ${
                  lang === 'en'
                    ? 'bg-ink text-white shadow-sm dark:bg-violet-600'
                    : 'text-ink/80 dark:text-white/85'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Genel + Kategori Seç ▾ */}
        <div
          data-testid="category-bar"
          className="pointer-events-auto mt-1.5 flex flex-wrap items-center gap-1.5"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              onButtonPop();
              setIsCategoryDrawerOpen(false);
              onSelectCategory('all');
            }}
            data-testid="category-pill-all"
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all ${
              activeCategory === 'all'
                ? 'bg-ink text-white shadow-md dark:bg-white dark:text-ink'
                : 'border border-slate-200 bg-white text-ink/85 hover:bg-white dark:border-white/15 dark:bg-slate-900 dark:text-white/85'
            }`}
          >
            <img
              src={allCategoryMeta.iconPath}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 object-contain"
            />
            <span>{copy.categoryAll}</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              onButtonPop();
              setIsCategoryDrawerOpen((prev) => !prev);
            }}
            aria-expanded={isCategoryDrawerOpen}
            data-testid="choose-category-btn"
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition-all ${
              isCategoryDrawerOpen
                ? 'border-violet-500 bg-violet-600 text-white shadow-md'
                : 'border border-slate-200 bg-white text-ink hover:bg-white dark:border-white/15 dark:bg-slate-900 dark:text-white'
            }`}
          >
            <span>{copy.chooseCategory} ▾</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isCategoryDrawerOpen ? 'rotate-180' : ''
              }`}
            />
          </motion.button>

          {activeCategory !== 'all' && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setIsCategoryDrawerOpen((prev) => !prev)}
              data-testid="active-category-badge"
              className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold shadow-sm ${
                activeCategory === 'vocabulary'
                  ? 'border-indigo-400 bg-indigo-600 text-white'
                  : 'border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-400/35 dark:bg-violet-900 dark:text-violet-100'
              }`}
            >
              <img
                src={activeCategoryMeta.iconPath}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 object-contain"
              />
              <span>{activeCategoryMeta.label[lang]}</span>
            </motion.button>
          )}
        </div>

        {/* Opaque category picker — z-40 above HUD */}
        <AnimatePresence>
          {isCategoryDrawerOpen && (
            <motion.div
              key="category-drawer"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              data-testid="category-drawer"
              className="pointer-events-auto relative z-40 mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xl dark:border-white/15 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORY_SELECTOR_OPTIONS.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const labelText =
                    cat.id === 'all' ? (lang === 'tr' ? 'Tümü (Genel)' : 'All (General)') : cat.label[lang];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onButtonPop();
                        onSelectCategory(cat.id);
                        setIsCategoryDrawerOpen(false);
                      }}
                      data-testid={`category-option-${cat.id}`}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-extrabold transition ${
                        isActive
                          ? cat.id === 'vocabulary'
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                            : 'border-ink bg-ink text-white shadow-sm dark:border-white dark:bg-white dark:text-ink'
                          : 'border-slate-200 bg-white text-ink/85 hover:bg-slate-100 dark:border-white/15 dark:bg-slate-900 dark:text-white/90 dark:hover:bg-white/15'
                      }`}
                    >
                      <img
                        src={cat.iconPath}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4 object-contain"
                      />
                      <span>{labelText}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Vertical Full-Bleed TikTok Snap Scroll Container (Windowed DOM Virtualization: activeIndex - 2 .. activeIndex + 2) */}
      <div
        ref={scrollRef}
        data-testid="tiktok-feed-container"
        data-active-index={activeIndex}
        className="tiktok-feed-scroll no-scrollbar h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {slides.map((slide, slideIdx) => {
          const isWithinWindow = Math.abs(slideIdx - activeIndex) <= 2;
          const isSlideActive = slideIdx === activeIndex;

          return (
            <div
              key={slide.key}
              data-slide-index={slideIdx}
              className="reels-slide h-[100dvh] w-full shrink-0 snap-start"
              aria-hidden={!isWithinWindow ? true : undefined}
            >
              {!isWithinWindow ? null : slide.type === 'fact' ? (
                <TikTokFactSlide
                  fact={slide.fact}
                  lang={lang}
                  isFavorite={favoriteIds.includes(slide.fact.id)}
                  isFirstCard={slide.factIndex === 0}
                  isActive={isSlideActive}
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
                  onEarnXp={onEarnXp}
                  onSuccessSound={onSuccessSound}
                  onWrongSound={onWrongSound}
                />
              ) : slide.type === 'vocabulary' ? (
                <VocabularySlide
                  card={slide.card}
                  lang={lang}
                  isActive={isSlideActive}
                  cookieBannerVisible={cookieBannerVisible}
                  onButtonPop={onButtonPop}
                  onEarnXp={onEarnXp}
                  onSuccessSound={onSuccessSound}
                  onWrongSound={onWrongSound}
                />
              ) : slide.type === 'quizCta' ? (
                <QuizCtaSlide
                  lang={lang}
                  recentReadCount={cardsSinceLastQuiz}
                  cookieBannerVisible={cookieBannerVisible}
                  onOpenQuizHub={onOpenQuizHub}
                  onSkipNext={() => {
                    onButtonPop();
                    scrollToSlide(slideIdx + 1);
                  }}
                />
              ) : (
                <NativeAdSlide
                  lang={lang}
                  adIndex={slide.adIndex}
                  totalCardsViewed={totalCardsViewed}
                  cookieBannerVisible={cookieBannerVisible}
                  onSkip={() => {
                    onButtonPop();
                    scrollToSlide(slideIdx + 1);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TikTokFeed;
