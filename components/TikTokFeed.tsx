'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import NotificationsBell from '@/components/NotificationsBell';
import NativeAdSlide from '@/components/NativeAdSlide';
import QuizCtaSlide from '@/components/QuizCtaSlide';
import TikTokFactSlide from '@/components/TikTokFactSlide';
import VocabularySlide from '@/components/VocabularySlide';
import {
  CATEGORY_SELECTOR_OPTIONS,
  getCategoryMeta,
  type CategoryFilter,
  type CategoryId,
  type Language,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { CATEGORY_ILLUSTRATION_MAP, DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import { motionSpring } from '@/lib/motion';
import { markFactSeenInStorage } from '@/utils/seenFacts';

const GESTURE_LOCK_MS = 450;
const WHEEL_THRESHOLD_PX = 50;

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * WHEEL_THRESHOLD_PX;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return Math.sign(event.deltaY) * WHEEL_THRESHOLD_PX;
  return event.deltaY;
}

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
  const gestureLockUntilRef = useRef<number>(0);
  const wheelAccumRef = useRef<number>(0);
  const wheelAccumAtRef = useRef<number>(0);
  const scrollAnimRef = useRef<{ raf: number; velocity: number } | null>(null);
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
    if (recent && Date.now() - recent.at < GESTURE_LOCK_MS + 70) {
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

      const previousVelocity = scrollAnimRef.current?.velocity ?? 0;
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current.raf);
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || Math.abs(container.scrollTop - targetTop) < 1) {
        container.style.scrollSnapType = '';
        container.scrollTop = targetTop;
        scrollAnimRef.current = null;
        scheduleSlideSettle(clamped);
        return;
      }

      const { stiffness, damping, mass } = motionSpring.cardSnap;
      container.style.scrollSnapType = 'none';
      let y = container.scrollTop;
      let velocity = previousVelocity;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.032, (now - last) / 1000);
        last = now;
        const accel = (stiffness * (targetTop - y) - damping * velocity) / mass;
        velocity += accel * dt;
        y += velocity * dt;
        if (!scrollRef.current) return;
        if (Math.abs(targetTop - y) < 0.6 && Math.abs(velocity) < 12) {
          scrollRef.current.style.scrollSnapType = '';
          scrollRef.current.scrollTop = targetTop;
          scrollAnimRef.current = null;
          scheduleSlideSettle(clamped);
          return;
        }
        scrollRef.current.scrollTop = y;
        const raf = requestAnimationFrame(tick);
        scrollAnimRef.current = { raf, velocity };
      };
      const raf = requestAnimationFrame(tick);
      scrollAnimRef.current = { raf, velocity };
      scheduleSlideSettle(clamped);
    },
    [slides.length, scheduleSlideSettle]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current.raf);
        scrollAnimRef.current = null;
        activeIndexRef.current = 0;
        lastProgrammaticStepRef.current = { index: 0, at: Date.now() };
        setActiveIndex(0);
        const container = scrollRef.current;
        if (container) {
          container.style.scrollSnapType = '';
          container.scrollTop = 0;
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

  const stepOneCard = useCallback(
    (direction: 1 | -1) => {
      const now = Date.now();
      if (now < gestureLockUntilRef.current) return;
      gestureLockUntilRef.current = now + GESTURE_LOCK_MS;
      scrollToSlide(getStepAnchorIndex() + direction);
    },
    [getStepAnchorIndex, scrollToSlide]
  );

  // One key gesture = one card. ↓/J/PageDown/Space forward, ↑/K/PageUp/Shift+Space back.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExploreVisibleRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;
      if (target && target.closest('button, a, [role="button"]')) return;

      const key = e.key.toLowerCase();
      const forward = key === 'arrowdown' || key === 'pagedown' || key === 'j' || (key === ' ' && !e.shiftKey);
      const backward =
        key === 'arrowup' || key === 'pageup' || key === 'k' || (key === ' ' && e.shiftKey);
      if (!forward && !backward) return;
      e.preventDefault();
      stepOneCard(forward ? 1 : -1);
    };

    const handleFeedStep = (event: Event) => {
      if (!isExploreVisibleRef.current) return;
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;
      const direction = (event as CustomEvent<{ direction?: number }>).detail?.direction;
      if (direction !== 1 && direction !== -1) return;
      stepOneCard(direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scrolly-feed-step', handleFeedStep);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scrolly-feed-step', handleFeedStep);
    };
  }, [stepOneCard]);

  // Wheel and trackpad: accumulate to 50px, then one card, then a 450ms lock so inertia cannot skip.
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isExploreVisibleRef.current) return;
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl?.closest('[data-testid="reels-desktop-shell"], [data-testid="tiktok-feed-container"]')) {
        return;
      }
      if (targetEl.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (targetEl.closest('[data-testid="language-lab-overlay"], [data-testid="fact-card-back"]')) return;

      const nested = targetEl.closest(
        '[data-scroll-contain="true"], [data-story-scroll="true"], [data-choice-scroll="true"]'
      ) as HTMLElement | null;
      if (nested && nested.scrollHeight > nested.clientHeight + 1) return;

      const delta = normalizeWheelDelta(e);
      if (delta === 0) return;
      e.preventDefault();

      const now = Date.now();
      if (now < gestureLockUntilRef.current) {
        wheelAccumRef.current = 0;
        return;
      }
      if (now - wheelAccumAtRef.current > 160) wheelAccumRef.current = 0;
      if (Math.sign(wheelAccumRef.current) !== 0 && Math.sign(wheelAccumRef.current) !== Math.sign(delta)) {
        wheelAccumRef.current = 0;
      }
      wheelAccumRef.current += delta;
      wheelAccumAtRef.current = now;
      if (Math.abs(wheelAccumRef.current) < WHEEL_THRESHOLD_PX) return;
      const direction: 1 | -1 = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      stepOneCard(direction);
    };

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current.raf);
    };
  }, [stepOneCard]);

  // Close Category Explorer page on Escape key & block dock while full-page picker is active
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('scrolly-chrome-block', { detail: { open: isCategoryDrawerOpen } })
    );
    if (!isCategoryDrawerOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.dispatchEvent(
        new CustomEvent('scrolly-chrome-block', { detail: { open: false } })
      );
    };
  }, [isCategoryDrawerOpen]);

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

      {/* Full-page Category Explorer: integrated page instead of floating dropdown */}
      <AnimatePresence>
        {isCategoryDrawerOpen && (
          <motion.div
            key="category-drawer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            data-testid="category-drawer"
            data-presentation="page"
            className="pointer-events-auto absolute inset-0 z-[70] flex h-full w-full flex-col overflow-hidden bg-[#FFF8F2] text-slate-900 dark:bg-[#141418] dark:text-slate-100"
          >
            {/* Top Navigation Bar */}
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-cik-line bg-cik-bg px-4 pb-3 pt-[calc(env(safe-area-inset-top,14px)+14px)]"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onButtonPop();
                  closeCategoryPicker();
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-extrabold transition active:scale-95 ${
                  darkMode
                    ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                    : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E] hover:bg-slate-50'
                }`}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{lang === 'tr' ? 'Keşfe Dön' : 'Back to Feed'}</span>
              </button>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                  darkMode ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-100 text-violet-800'
                }`}
              >
                <img src={DOCK_ICON_MAP.explore} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                <span>{lang === 'tr' ? 'Konu Seç' : 'Choose Topic'}</span>
              </span>
            </div>

            {/* Category Explorer Grid */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5 pb-[calc(env(safe-area-inset-bottom,16px)+28px)]">
              <div className="grid grid-cols-2 gap-3 pb-8">
                {CATEGORY_SELECTOR_OPTIONS.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const labelText =
                    cat.id === 'all' ? (lang === 'tr' ? 'Tümü (Genel)' : 'All (General)') : cat.label[lang];
                  const artPath =
                    cat.id === 'all'
                      ? DOCK_ICON_MAP.explore
                      : cat.id === 'vocabulary'
                        ? '/assets/fluent/books.png'
                        : CATEGORY_ILLUSTRATION_MAP[cat.id];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onButtonPop();
                        onSelectCategory(cat.id);
                        closeCategoryPicker();
                      }}
                      data-testid={`category-option-${cat.id}`}
                      className={`group relative flex min-h-[104px] flex-col justify-between rounded-sticker border-[3px] border-white p-4 text-left shadow-sticker ${
                        isActive ? 'bg-cik-berry text-cik-text' : 'bg-cik-surface text-cik-text'
                      }`}
                    >
                      <div className="flex w-full items-start">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-xl bg-white/95">
                          <img
                            src={artPath}
                            alt=""
                            aria-hidden="true"
                            className="h-10 w-10 shrink-0 object-contain"
                          />
                        </span>
                      </div>
                      <span className="text-xs font-extrabold leading-snug">{labelText}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="cik-footnote min-h-11 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
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
              role="article"
              aria-roledescription={lang === 'tr' ? 'kart' : 'card'}
              aria-posinset={slideIdx + 1}
              aria-setsize={slides.length}
              style={{ height: '100%', minHeight: '100%' }}
              className={`reels-slide h-full min-h-full w-full shrink-0 snap-start snap-always ${
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
