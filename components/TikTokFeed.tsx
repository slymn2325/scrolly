'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import Sheet from '@/components/cikartma/Sheet';
import Skeleton from '@/components/cikartma/Skeleton';
import NotificationsBell from '@/components/NotificationsBell';
import NativeAdSlide from '@/components/NativeAdSlide';
import QuizCtaSlide from '@/components/QuizCtaSlide';
import TikTokFactSlide from '@/components/TikTokFactSlide';
import VocabularySlide from '@/components/VocabularySlide';
import {
  CATEGORY_SELECTOR_OPTIONS,
  FEED_EXPERIENCE_COPY,
  getCategoryMeta,
  translations,
  type CategoryFilter,
  type CategoryId,
  type CategoryMeta,
  type Language,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { UI_ICON_PATHS } from '@/utils/fluentAssets';
import { markFactSeenInStorage } from '@/utils/seenFacts';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type FeedSlideItem =
  | { type: 'fact'; key: string; fact: FactCard; factIndex: number }
  | { type: 'vocabulary'; key: string; card: VocabularyCard; vocabIndex: number }
  | { type: 'quizCta'; key: string; ctaIndex: number }
  | { type: 'ad'; key: string; adIndex: number };

export interface TikTokFeedHandle {
  scrollToTop: () => void;
  scrollToNext: (fromSlideIdx?: number) => void;
  scrollToPrev: (fromSlideIdx?: number) => void;
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
  isExploreVisible?: boolean;
  suppressUrlSync?: boolean;
  initialSlideIndex?: number;
  onSelectCategory: (cat: CategoryFilter) => void;
  onChangeLang: (lang: Language) => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onFlipCard: (fact: FactCard) => void;
  onOpenDetail?: (fact: FactCard, resolvedGifUrl?: string | null) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onMarkFactSeen?: (fact: FactCard) => void;
  onOpenDuelFromCard: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onGuessReward: (xp: number, accurate: boolean, category?: CategoryId, accuracyPct?: number) => void;
  onGuessLocked?: (factId: string) => void;
  lockedFactIds?: Record<string, boolean>;
  onToggleFavorite: (fact: FactCard) => void;
  onOpenQuizHub: () => void;
  onButtonPop: () => void;
  onSlideIndexChange?: (slideIndex: number) => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onActiveFactChange?: (fact: FactCard | null) => void;
  onActiveSlideChange?: (slide: FeedSlideItem | null) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
  vocabularyCards?: VocabularyCard[];
}

const TikTokFeed = forwardRef<TikTokFeedHandle, TikTokFeedProps>(function TikTokFeed(
  {
    deckFacts,
    lang,
    darkMode,
    soundEnabled: _soundEnabled,
    activeCategory,
    favoriteIds,
    cardsSinceLastQuiz,
    totalCardsViewed = 0,
    cookieBannerVisible = false,
    isExploreVisible = true,
    suppressUrlSync = false,
    initialSlideIndex = 0,
    onSelectCategory,
    onChangeLang,
    onFlipCard,
    onOpenDetail,
    onDoubleTapLike,
    onDwellRead,
    onMarkFactSeen,
    onOpenDuelFromCard,
    onOpenStoryShare,
    onGuessReward,
    onGuessLocked,
    lockedFactIds,
    onToggleFavorite,
    onOpenQuizHub,
    onButtonPop,
    onSlideIndexChange,
    onEarnXp,
    onActiveFactChange,
    onActiveSlideChange,
    onSuccessSound,
    onWrongSound,
    vocabularyCards,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeInitialIndex = Math.max(0, initialSlideIndex);
  const activeIndexRef = useRef<number>(safeInitialIndex);
  const hasRestoredInitialScrollRef = useRef<boolean>(false);
  const prevTrackedSlideIdxRef = useRef<number | null>(null);
  const lastProgrammaticStepRef = useRef<{ index: number; at: number } | null>(null);
  const prevCategoryRef = useRef<CategoryFilter>(activeCategory);
  const wheelCooldownRef = useRef<number>(0);
  const onSlideIndexChangeRef = useRef(onSlideIndexChange);
  onSlideIndexChangeRef.current = onSlideIndexChange;
  const onActiveFactChangeRef = useRef(onActiveFactChange);
  onActiveFactChangeRef.current = onActiveFactChange;
  const onActiveSlideChangeRef = useRef(onActiveSlideChange);
  onActiveSlideChangeRef.current = onActiveSlideChange;
  const onMarkFactSeenRef = useRef(onMarkFactSeen);
  onMarkFactSeenRef.current = onMarkFactSeen;
  const isExploreVisibleRef = useRef(isExploreVisible);
  isExploreVisibleRef.current = isExploreVisible;
  const suppressUrlSyncRef = useRef(suppressUrlSync);
  suppressUrlSyncRef.current = suppressUrlSync;
  const [activeIndex, setActiveIndex] = useState<number>(safeInitialIndex);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [showCategorySkeleton, setShowCategorySkeleton] = useState(false);
  const ignoreCategoryToggleRef = useRef(false);
  const closeCategoryPicker = useCallback(() => {
    ignoreCategoryToggleRef.current = true;
    setIsCategoryDrawerOpen(false);
    window.setTimeout(() => {
      ignoreCategoryToggleRef.current = false;
    }, 400);
  }, []);
  const [chromeBlocked, setChromeBlocked] = useState<boolean>(false);
  const activeCategoryMeta = getCategoryMeta(activeCategory);
  const categoryTriggerLabel =
    activeCategory === 'all'
      ? lang === 'tr'
        ? 'Kategori: Tümü'
        : 'Category: All'
      : activeCategoryMeta.label[lang];
  const vocabPool = useMemo(() => {
    const staticVocab = getVocabularyFacts();
    if (!vocabularyCards || vocabularyCards.length === 0) return staticVocab;
    const seenWords = new Set<string>();
    const seenIds = new Set<string>();
    const merged: VocabularyCard[] = [];
    for (const card of [...vocabularyCards, ...staticVocab]) {
      const wordKey = card.word.trim().toLowerCase();
      if (!wordKey || seenWords.has(wordKey) || seenIds.has(card.id)) continue;
      seenWords.add(wordKey);
      seenIds.add(card.id);
      merged.push(card);
    }
    return merged;
  }, [vocabularyCards]);

  // Dil Ogrenme = vocab-only. Genel = facts only. Category = filtered facts.
  const slides: FeedSlideItem[] = useMemo(() => {
    const items: FeedSlideItem[] = [];
    let adCount = 0;
    let ctaCount = 0;

    if (activeCategory === 'vocabulary') {
      return vocabPool.map((card, idx) => ({
        type: 'vocabulary' as const,
        key: `vocab-${card.id}-${idx}`,
        card,
        vocabIndex: idx,
      }));
    }

    deckFacts.forEach((fact, idx) => {
      items.push({ type: 'fact', key: `fact-${fact.id}-${idx}`, fact, factIndex: idx });
      const position = idx + 1;

      // Genel / Keşfet never mixes vocabulary. Word Lab is the Dil tab only.
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

  // Synchronously restore exact scrollTop when returning to Explore tab before first paint
  useIsomorphicLayoutEffect(() => {
    if (hasRestoredInitialScrollRef.current) return;
    const container = scrollRef.current;
    if (!container || slides.length === 0) return;
    hasRestoredInitialScrollRef.current = true;
    const clamped = Math.max(0, Math.min(safeInitialIndex, slides.length - 1));
    if (clamped > 0) {
      activeIndexRef.current = clamped;
      prevTrackedSlideIdxRef.current = clamped;
      setActiveIndex(clamped);
      const targetNode = container.querySelector<HTMLElement>(`[data-slide-index="${clamped}"]`);
      const slideHeight = container.clientHeight || window.innerHeight;
      const targetTop = targetNode ? targetNode.offsetTop : clamped * slideHeight;
      const prevBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = targetTop;
      container.style.scrollBehavior = prevBehavior;
    }
  }, [safeInitialIndex, slides.length]);

  // Preserve active slide scrollTop when toggling back from full-page subviews (Detail, Share, Profile)
  useIsomorphicLayoutEffect(() => {
    if (!isExploreVisible) return;
    const container = scrollRef.current;
    if (!container || slides.length === 0) return;
    const currentIdx = Math.max(0, Math.min(activeIndexRef.current, slides.length - 1));
    if (currentIdx === 0) return;
    const targetNode = container.querySelector<HTMLElement>(`[data-slide-index="${currentIdx}"]`);
    const slideHeight = container.clientHeight || window.innerHeight;
    const targetTop = targetNode ? targetNode.offsetTop : currentIdx * slideHeight;
    if (Math.abs(container.scrollTop - targetTop) > 12) {
      const prevBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = targetTop;
      container.style.scrollBehavior = prevBehavior;
    }
  }, [isExploreVisible, slides.length]);

  // Immediately record any swiped-past fact card in scrolly_seen_slugs_v1 without waiting for dwell or Guess Lock
  useEffect(() => {
    const prevIdx = prevTrackedSlideIdxRef.current;
    prevTrackedSlideIdxRef.current = activeIndex;
    if (prevIdx !== null && prevIdx !== activeIndex) {
      const prevSlide = slides[prevIdx];
      if (prevSlide?.type === 'fact') {
        markFactSeenInStorage(prevSlide.fact);
        onMarkFactSeenRef.current?.(prevSlide.fact);
      }
    }
  }, [activeIndex, slides]);

  const syncSlideUrl = useCallback(
    (settledIdx: number) => {
      if (
        !isExploreVisibleRef.current ||
        suppressUrlSyncRef.current ||
        typeof window === 'undefined'
      ) {
        return;
      }
      try {
        const currentUrl = new URL(window.location.href);
        const before = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

        if (activeCategory === 'all') {
          currentUrl.searchParams.delete('category');
        } else {
          currentUrl.searchParams.set('category', activeCategory);
        }

        const settledSlide = slides[settledIdx];
        if (settledSlide?.type === 'fact') {
          // The open card stays in component state. The homepage URL is not a fact permalink.
          currentUrl.searchParams.delete('vocab');
          currentUrl.searchParams.delete('fact');
        } else if (settledSlide?.type === 'vocabulary') {
          currentUrl.searchParams.delete('fact');
          currentUrl.searchParams.set('vocab', settledSlide.card.id);
        } else {
          currentUrl.searchParams.delete('fact');
          currentUrl.searchParams.delete('vocab');
        }

        const after = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
        if (after !== before) {
          window.history.replaceState(window.history.state, '', after);
        }
      } catch {
        // Ignore history API errors in restricted webviews
      }
    },
    [activeCategory, slides]
  );

  const scheduleSlideSettle = useCallback(
    (settledIdx: number) => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onSlideIndexChangeRef.current?.(settledIdx);
        syncSlideUrl(settledIdx);
      }, 150);
    },
    [syncSlideUrl]
  );

  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== activeCategory;
    prevCategoryRef.current = activeCategory;

    if (categoryChanged) {
      activeIndexRef.current = 0;
      prevTrackedSlideIdxRef.current = 0;
      lastProgrammaticStepRef.current = null;
      setActiveIndex(0);
      const container = scrollRef.current;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }
      syncSlideUrl(0);
      return;
    }

    // Clamp active index cleanly if deck shrinks without interrupting active swipe position
    if (slides.length > 0 && activeIndexRef.current >= slides.length) {
      const clamped = slides.length - 1;
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    }
  }, [activeCategory, slides.length, syncSlideUrl]);

  // Detect active card with IntersectionObserver (threshold: 0.55) and debounce telemetry callback by 150ms
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
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55 && entry.intersectionRatio >= bestRatio) {
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
        scheduleSlideSettle(settledIdx);
      },
      {
        root: container,
        threshold: [0.55, 0.75],
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
  }, [slides, scheduleSlideSettle]);

  const getStepAnchorIndex = useCallback(() => {
    const recent = lastProgrammaticStepRef.current;
    if (recent && Date.now() - recent.at < 350) {
      return recent.index;
    }
    return activeIndexRef.current;
  }, []);

  const scrollToSlide = useCallback(
    (targetIndex: number) => {
      const container = scrollRef.current;
      if (!container || slides.length === 0) return;
      const clamped = Math.max(0, Math.min(targetIndex, slides.length - 1));
      const targetNode = container.querySelector<HTMLElement>(`[data-slide-index="${clamped}"]`);
      const slideHeight = container.clientHeight || window.innerHeight;
      const targetTop = targetNode ? targetNode.offsetTop : clamped * slideHeight;
      activeIndexRef.current = clamped;
      lastProgrammaticStepRef.current = { index: clamped, at: Date.now() };
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));
      container.scrollTo({ top: targetTop, behavior: 'auto' });
      scheduleSlideSettle(clamped);
    },
    [slides.length, scheduleSlideSettle]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        activeIndexRef.current = 0;
        lastProgrammaticStepRef.current = { index: 0, at: Date.now() };
        setActiveIndex(0);
        const container = scrollRef.current;
        if (container) {
          container.scrollTo({ top: 0, behavior: 'auto' });
        }
        scheduleSlideSettle(0);
      },
      scrollToNext: (fromSlideIdx?: number) => {
        const current = typeof fromSlideIdx === 'number' ? fromSlideIdx : getStepAnchorIndex();
        scrollToSlide(current + 1);
      },
      scrollToPrev: (fromSlideIdx?: number) => {
        const current = typeof fromSlideIdx === 'number' ? fromSlideIdx : getStepAnchorIndex();
        scrollToSlide(current - 1);
      },
    }),
    [getStepAnchorIndex, scheduleSlideSettle, scrollToSlide]
  );

  // Desktop keyboard navigation (ArrowUp / ArrowDown to step, Space to flip/close active card detail)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExploreVisibleRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        if (
          typeof document !== 'undefined' &&
          document.querySelector('[aria-modal="true"]:not([data-testid="fact-card-back"])')
        ) {
          return;
        }
        if (target && target.closest('button, a, [role="button"], input[type="range"]')) return;
        const currentSlide = slides[activeIndexRef.current];
        if (currentSlide?.type === 'fact') {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('scrolly-card-action', {
              detail: { factId: currentSlide.fact.id, action: 'flip' },
            })
          );
        }
        return;
      }

      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      const container = scrollRef.current;
      if (!container) return;
      e.preventDefault();
      const current = getStepAnchorIndex();
      scrollToSlide(e.key === 'ArrowDown' ? current + 1 : current - 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getStepAnchorIndex, scrollToSlide, slides]);

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

      const storyBox = targetEl?.closest('[data-story-scroll="true"]') as HTMLElement | null;
      if (storyBox && storyBox.scrollHeight > storyBox.clientHeight + 1) {
        return;
      }
      const choiceList = targetEl?.closest('[data-choice-scroll="true"]') as HTMLElement | null;
      if (choiceList && choiceList.scrollHeight > choiceList.clientHeight + 1) {
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
      scrollToSlide(getStepAnchorIndex() + direction);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [getStepAnchorIndex, scrollToSlide]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('scrolly-chrome-block', { detail: { open: isCategoryDrawerOpen } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('scrolly-chrome-block', { detail: { open: false } })
      );
    };
  }, [isCategoryDrawerOpen]);

  useEffect(() => {
    if (!showCategorySkeleton) return;
    const timer = window.setTimeout(() => setShowCategorySkeleton(false), 400);
    return () => window.clearTimeout(timer);
  }, [showCategorySkeleton, activeCategory]);

  // When a card detail overlay is open, disable HUD hit-testing so close/back controls stay reachable
  useEffect(() => {
    const onChromeBlock = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChromeBlocked(Boolean(detail?.open));
    };
    window.addEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
    return () => window.removeEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
  }, []);

  // Ambient accent + active fact/slide notification for desktop stage & side panel
  useEffect(() => {
    const slide = slides[activeIndex] ?? null;
    onActiveFactChangeRef.current?.(slide?.type === 'fact' ? slide.fact : null);
    onActiveSlideChangeRef.current?.(slide);
    let accent = '#818CF8';
    if (slide?.type === 'fact') accent = slide.fact.accentColor || accent;
    else if (slide?.type === 'vocabulary') accent = '#818CF8';
    else if (slide?.type === 'quizCta') accent = '#F59E0B';
    else if (slide?.type === 'ad') accent = '#0EA5E9';
    window.dispatchEvent(
      new CustomEvent('scrolly-ambient-accent', { detail: { accent } })
    );
  }, [activeIndex, slides]);

  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      className="relative mx-auto h-full w-full overflow-hidden bg-cik-bg text-cik-text"
    >
      {/* Top HUD: sharp unblurred single horizontal row sitting above cards cleanly (z-[60]) */}
      <header
        data-chrome-blocked={chromeBlocked ? 'true' : 'false'}
        className={`pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-center justify-between gap-2 px-4 pt-4 pb-2 ${
          chromeBlocked ? 'opacity-40' : ''
        }`}
      >
        <div
          className={`relative z-10 flex min-w-0 flex-1 items-center gap-2 ${
            chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          <BrandLogo size={36} id="feed-header-brand" className="lg:hidden" />
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (ignoreCategoryToggleRef.current) return;
              onButtonPop();
              setIsCategoryDrawerOpen((prev) => !prev);
            }}
            aria-expanded={isCategoryDrawerOpen}
            data-testid="choose-category-btn"
            className="inline-flex h-11 max-w-full items-center gap-1.5 rounded-pill border-[3px] border-white bg-cik-surface px-3 text-[13px] font-bold text-cik-text shadow-sticker"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white p-0.5 ring-1 ring-[#1E1B2E]/10 dark:ring-0">
              <img
                src={activeCategoryMeta.iconPath}
                alt=""
                aria-hidden="true"
                className="h-3 w-3 object-contain"
              />
            </span>
            <span className="truncate whitespace-nowrap">{categoryTriggerLabel}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                isCategoryDrawerOpen ? 'rotate-180' : ''
              }`}
            />
          </motion.button>
        </div>

        <div
          className={`relative z-10 flex shrink-0 items-center gap-1.5 ${
            chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          

          <div
            role="group"
            aria-label="Language switch"
            className="flex shrink-0 items-center gap-1 rounded-pill border-[3px] border-white bg-cik-surface p-0.5 text-[13px] font-bold text-cik-text shadow-sticker"
          >
            <img
              src={UI_ICON_PATHS.langGlobe}
              alt=""
              aria-hidden="true"
              className="ml-1 h-3.5 w-3.5 shrink-0 object-contain"
            />
            <button
              type="button"
              onClick={() => onChangeLang('tr')}
              data-testid="lang-btn-tr"
              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-2 ${
                lang === 'tr' ? 'bg-cik-berry text-cik-text' : 'text-cik-muted'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              data-testid="lang-btn-en"
              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-2 ${
                lang === 'en' ? 'bg-cik-berry text-cik-text' : 'text-cik-muted'
              }`}
            >
              EN
            </button>
          </div>
          <NotificationsBell lang={lang} />
        </div>
      </header>

      <CategoryPickerSheet
        open={isCategoryDrawerOpen}
        lang={lang}
        activeCategory={activeCategory}
        onClose={() => {
          onButtonPop();
          closeCategoryPicker();
        }}
        onPick={(catId) => {
          onButtonPop();
          onSelectCategory(catId);
          closeCategoryPicker();
          scrollToSlide(0);
          setShowCategorySkeleton(true);
        }}
      />

      {showCategorySkeleton ? (
        <div
          className="pointer-events-none absolute inset-0 z-content flex items-center justify-center bg-cik-bg px-4"
          aria-hidden="true"
        >
          <div className="flex w-full max-w-md flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full rounded-sticker" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-11 w-full rounded-pill" />
          </div>
        </div>
      ) : null}

      {/* Vertical Full-Bleed TikTok Snap Scroll Container (Windowed DOM Virtualization: activeIndex - 2 .. activeIndex + 2) */}
      <div
        ref={scrollRef}
        data-testid="tiktok-feed-container"
        data-active-index={activeIndex}
        className="tiktok-feed-scroll no-scrollbar h-full w-full overflow-y-scroll snap-y snap-mandatory"
      >
        {slides.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-bold text-cik-text">
              {lang === 'tr'
                ? 'Bu kategoride henüz gösterilecek kart bulunamadı.'
                : 'No cards found in this category yet.'}
            </p>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="cik-footnote h-11 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
            >
              {lang === 'tr' ? 'Tüm Kategorileri Aç' : 'Show All Categories'}
            </button>
          </div>
        ) : (
          slides.map((slide, slideIdx) => {
          const isWithinWindow = Math.abs(slideIdx - activeIndex) <= 2;
          const isSlideActive = slideIdx === activeIndex;
          const shouldHidePendingSync = suppressUrlSync && slideIdx === 0;
          const effectiveSlideActive = isSlideActive && isExploreVisible && !suppressUrlSync;

          return (
            <div
              key={slide.key}
              data-slide-index={slideIdx}
              style={{ height: '100%', minHeight: '100%' }}
              className={`reels-slide h-[100dvh] min-h-[100dvh] lg:h-full lg:min-h-full w-full shrink-0 snap-start snap-always ${
                shouldHidePendingSync ? 'pointer-events-none opacity-0' : ''
              }`}
              aria-hidden={!isWithinWindow ? true : undefined}
            >
              {!isWithinWindow ? null : slide.type === 'fact' ? (
                <TikTokFactSlide
                  fact={slide.fact}
                  lang={lang}
                  darkMode={darkMode}
                  isFavorite={favoriteIds.includes(slide.fact.id)}
                  isFirstCard={slide.factIndex === 0}
                  isActive={effectiveSlideActive}
                  isGuessLocked={Boolean(lockedFactIds?.[slide.fact.id])}
                  cookieBannerVisible={cookieBannerVisible}
                  onFlip={onFlipCard}
                  onOpenDetail={onOpenDetail}
                  onDoubleTapLike={onDoubleTapLike}
                  onDwellRead={onDwellRead}
                  onNextSlide={() => scrollToSlide(slideIdx + 1)}
                  onOpenDuel={onOpenDuelFromCard}
                  onOpenStoryShare={onOpenStoryShare}
                  onGuessReward={onGuessReward}
                  onGuessLocked={onGuessLocked}
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
                  darkMode={darkMode}
                  isActive={effectiveSlideActive}
                  priority={slideIdx === 0}
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
          })
        )}
      </div>
    </div>
  );
});

export default TikTokFeed;

function pickerLabel(cat: CategoryMeta, lang: Language): string {
  if (cat.id === 'all') return FEED_EXPERIENCE_COPY[lang].categoryAll;
  if (cat.id === 'vocabulary') return translations[lang].dockLanguage;
  return cat.label[lang];
}

const PICKER_OPTIONS: CategoryMeta[] = [
  ...CATEGORY_SELECTOR_OPTIONS.filter((cat) => cat.id === 'all'),
  ...CATEGORY_SELECTOR_OPTIONS.filter((cat) => cat.id !== 'all' && cat.id !== 'vocabulary'),
  ...CATEGORY_SELECTOR_OPTIONS.filter((cat) => cat.id === 'vocabulary'),
];

function CategoryPickerSheet({
  open,
  lang,
  activeCategory,
  onClose,
  onPick,
}: {
  open: boolean;
  lang: Language;
  activeCategory: CategoryFilter;
  onClose: () => void;
  onPick: (catId: CategoryFilter) => void;
}) {
  return (
    <Sheet open={open} title={lang === 'tr' ? 'Konu Seç' : 'Choose Topic'} onClose={onClose}>
      <div data-testid="category-drawer" data-presentation="sheet" className="grid grid-cols-2 gap-3">
        {PICKER_OPTIONS.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPick(cat.id);
              }}
              data-testid={`category-option-${cat.id}`}
              aria-pressed={isActive}
              className={`relative flex min-h-[52px] flex-col items-start gap-3 rounded-sticker border-4 border-cik-sticker-rim p-4 text-left shadow-sticker ${
                isActive ? 'bg-cik-berry text-cik-on-berry' : 'bg-cik-pink text-cik-text'
              }`}
            >
              {isActive ? (
                <Check
                  className="absolute right-3 top-3"
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : null}
              <img
                src={cat.iconPath}
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                decoding="async"
                className="h-10 w-10 object-contain"
              />
              <span className="cik-headline">{pickerLabel(cat, lang)}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
