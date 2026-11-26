'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Atom,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Dna,
  Globe,
  Landmark,
  Leaf,
  Orbit,
  Sparkles,
  Trophy,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import Skeleton from '@/components/cikartma/Skeleton';
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
import { markFactSeenInStorage } from '@/utils/seenFacts';

const CATEGORY_ICON_CONFIG: Record<
  CategoryFilter,
  { Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>; colorClass: string }
> = {
  all: { Icon: Sparkles, colorClass: 'text-amber-500' },
  vocabulary: { Icon: BookOpen, colorClass: 'text-indigo-500' },
  space: { Icon: Orbit, colorClass: 'text-violet-500' },
  nature: { Icon: Leaf, colorClass: 'text-emerald-500' },
  human_body: { Icon: Dna, colorClass: 'text-rose-500' },
  history: { Icon: Landmark, colorClass: 'text-amber-600' },
  science: { Icon: Atom, colorClass: 'text-sky-500' },
  records: { Icon: Trophy, colorClass: 'text-pink-500' },
  statistics: { Icon: BarChart3, colorClass: 'text-indigo-600' },
};

function CategoryIcon({
  id,
  size = 18,
  className = '',
}: {
  id: CategoryFilter;
  size?: number;
  className?: string;
}) {
  const { Icon, colorClass } = CATEGORY_ICON_CONFIG[id] ?? CATEGORY_ICON_CONFIG.all;
  return (
    <Icon
      size={size}
      strokeWidth={2.2}
      aria-hidden={true}
      className={`shrink-0 ${colorClass} ${className}`.trim()}
    />
  );
}

export type VocabLevelFilter = 'all' | 'B1' | 'B2' | 'C1' | 'C2';

const VOCAB_LEVEL_OPTIONS: ReadonlyArray<{ id: VocabLevelFilter; labelTr: string; labelEn: string }> = [
  { id: 'all', labelTr: 'Tümü', labelEn: 'All' },
  { id: 'B1', labelTr: 'B1', labelEn: 'B1' },
  { id: 'B2', labelTr: 'B2', labelEn: 'B2' },
  { id: 'C1', labelTr: 'C1', labelEn: 'C1' },
  { id: 'C2', labelTr: 'C2', labelEn: 'C2' },
];

function normalizeVocabLevelParam(raw: string | null): VocabLevelFilter {
  const clean = (raw || '').trim().toUpperCase();
  if (clean === 'B1' || clean === 'B2' || clean === 'C1' || clean === 'C2') {
    return clean;
  }
  return 'all';
}

function matchesVocabLevel(cefrLevel: string | undefined, filter: VocabLevelFilter): boolean {
  if (filter === 'all') return true;
  const tokens = (cefrLevel || 'B2').toUpperCase().split(/[^A-Z0-9]+/);
  return tokens.includes(filter);
}

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
  onBeforeSlideNavigate?: () => void;
  onOpenDetail?: (fact: FactCard, resolvedGifUrl?: string | null) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onMarkFactSeen?: (fact: FactCard) => void;
  onOpenDuelFromCard: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onOpenShareVocab?: (card: VocabularyCard) => void;
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
    onBeforeSlideNavigate,
    onOpenDetail,
    onDoubleTapLike,
    onDwellRead,
    onMarkFactSeen,
    onOpenDuelFromCard,
    onOpenStoryShare,
    onOpenShareVocab,
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
  const prevSafeInitialIndexRef = useRef<number>(safeInitialIndex);
  const hasRestoredInitialScrollRef = useRef<boolean>(false);
  const prevTrackedSlideIdxRef = useRef<number | null>(null);
  const lastProgrammaticStepRef = useRef<{ index: number; at: number } | null>(null);
  const prevCategoryRef = useRef<CategoryFilter>(activeCategory);
  const gestureLockUntilRef = useRef<number>(0);
  const wheelAccumRef = useRef<number>(0);
  const wheelAccumAtRef = useRef<number>(0);
  const scrollAnimRef = useRef<{ raf: number; velocity: number } | null>(null);
  const touchDrawerRef = useRef<{
    startX: number;
    startY: number;
    startScrollTop: number;
    insideSheet: boolean;
    closedDuringGesture: boolean;
    lockedVertical: boolean;
  } | null>(null);
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
  const onBeforeSlideNavigateRef = useRef(onBeforeSlideNavigate);
  onBeforeSlideNavigateRef.current = onBeforeSlideNavigate;
  const [activeIndex, setActiveIndex] = useState<number>(safeInitialIndex);
  const [vocabLevelFilter, setVocabLevelFilter] = useState<VocabLevelFilter>('all');
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState<boolean>(false);
  const [showCategorySkeleton, setShowCategorySkeleton] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const [chromeBlocked, setChromeBlocked] = useState<boolean>(false);
  const [hudTraveling, setHudTraveling] = useState(false);
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

  const filteredVocabPool = useMemo(() => {
    if (vocabLevelFilter === 'all') return vocabPool;
    const filtered = vocabPool.filter((card) => matchesVocabLevel(card.cefrLevel, vocabLevelFilter));
    return filtered.length > 0 ? filtered : vocabPool;
  }, [vocabPool, vocabLevelFilter]);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const levelParam = normalizeVocabLevelParam(
      new URLSearchParams(window.location.search).get('level')
    );
    if (levelParam !== 'all') {
      setVocabLevelFilter(levelParam);
    }
  }, []);

  // Dil Ogrenme = vocab-only. Genel = facts only. Category = filtered facts.
  const slides: FeedSlideItem[] = useMemo(() => {
    const items: FeedSlideItem[] = [];
    let adCount = 0;
    let ctaCount = 0;

    if (activeCategory === 'vocabulary') {
      return filteredVocabPool.map((card, idx) => ({
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

  // Synchronously restore exact scrollTop when returning or resolving deep-linked ?vocab= / ?slide index
  useIsomorphicLayoutEffect(() => {
    const initialChanged = prevSafeInitialIndexRef.current !== safeInitialIndex;
    prevSafeInitialIndexRef.current = safeInitialIndex;
    if (hasRestoredInitialScrollRef.current && !(initialChanged && safeInitialIndex > 0 && activeIndexRef.current === 0)) {
      return;
    }
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
          currentUrl.searchParams.delete('level');
          currentUrl.searchParams.delete('fact');
        } else if (settledSlide?.type === 'vocabulary') {
          currentUrl.searchParams.delete('fact');
          currentUrl.searchParams.set('vocab', settledSlide.card.id);
          if (vocabLevelFilter === 'all') {
            currentUrl.searchParams.delete('level');
          } else {
            currentUrl.searchParams.set('level', vocabLevelFilter);
          }
        } else {
          currentUrl.searchParams.delete('fact');
          currentUrl.searchParams.delete('vocab');
          currentUrl.searchParams.delete('level');
        }

        const after = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
        if (after !== before) {
          window.history.replaceState(window.history.state, '', after);
        }
      } catch {
        // Ignore history API errors in restricted webviews
      }
    },
    [activeCategory, slides, vocabLevelFilter]
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
      onBeforeSlideNavigateRef.current?.();
      const container = scrollRef.current;
      if (!container || slides.length === 0) return;
      const clamped = Math.max(0, Math.min(targetIndex, slides.length - 1));
      const slideHeight = container.clientHeight || window.innerHeight;
      const targetTop = clamped * slideHeight;
      activeIndexRef.current = clamped;
      lastProgrammaticStepRef.current = { index: clamped, at: Date.now() };
      setActiveIndex((prev) => (prev === clamped ? prev : clamped));

      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current.raf);
        scrollAnimRef.current = null;
      }
      container.style.scrollSnapType = '';
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({
        top: targetTop,
        behavior: reduced ? 'auto' : 'smooth',
      });
      scheduleSlideSettle(clamped);
    },
    [slides.length, scheduleSlideSettle]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        onBeforeSlideNavigateRef.current?.();
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

  const slidesRef = useRef<FeedSlideItem[]>(slides);
  slidesRef.current = slides;

  // One key gesture = one card (arrows / J / K / PageUp / PageDown). Space flips or opens card details.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExploreVisibleRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return;

      const key = e.key.toLowerCase();
      const isVerticalArrow = key === 'arrowdown' || key === 'arrowup';
      if (
        target &&
        target.closest('button, a, [role="button"]') &&
        (!isVerticalArrow ||
          Boolean(
            target.closest(
              '[role="menu"], [role="tablist"], [role="radiogroup"], [role="listbox"], [role="slider"]'
            )
          ))
      ) {
        return;
      }

      if (key === ' ' && !e.shiftKey) {
        const currentSlide = slidesRef.current[activeIndexRef.current];
        if (currentSlide?.type === 'fact') {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('scrolly-card-action', {
              detail: { factId: currentSlide.fact.id, action: 'flip' },
            })
          );
        } else if (currentSlide?.type === 'vocabulary') {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('scrolly-card-action', {
              detail: { vocabId: currentSlide.card.id, action: 'detail' },
            })
          );
        }
        return;
      }

      const forward = key === 'arrowdown' || key === 'pagedown' || key === 'j';
      const backward = key === 'arrowup' || key === 'pageup' || key === 'k' || (key === ' ' && e.shiftKey);
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

  const getActiveExpandedSheet = useCallback((): HTMLElement | null => {
    const container = scrollRef.current;
    if (!container) return null;
    return container.querySelector<HTMLElement>(
      '[data-testid="fact-card"][data-active="true"] [data-testid="fact-bottom-sheet"][data-expanded="true"]'
    );
  }, []);

  // Wheel and trackpad: collapse an open bottom sheet first, or step one card when closed.
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

      const vocabScroll = targetEl.closest('[data-vocab-scroll="true"]') as HTMLElement | null;
      if (vocabScroll && vocabScroll.scrollHeight > vocabScroll.clientHeight + 2) {
        const d = normalizeWheelDelta(e);
        const canInnerDown =
          d > 0 && vocabScroll.scrollTop + vocabScroll.clientHeight < vocabScroll.scrollHeight - 2;
        const canInnerUp = d < 0 && vocabScroll.scrollTop > 2;
        if (!canInnerDown && !canInnerUp) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      const nested = targetEl.closest(
        '[data-scroll-contain="true"], [data-choice-scroll="true"]'
      ) as HTMLElement | null;
      if (nested && nested.scrollHeight > nested.clientHeight + 1) return;

      const otherStoryScroll = targetEl.closest('[data-story-scroll="true"]') as HTMLElement | null;
      if (
        otherStoryScroll &&
        !otherStoryScroll.matches('[data-testid="fact-bottom-sheet"]') &&
        otherStoryScroll.scrollHeight > otherStoryScroll.clientHeight + 1
      ) {
        return;
      }

      const delta = normalizeWheelDelta(e);
      if (delta === 0) return;

      const expandedSheet = getActiveExpandedSheet();
      if (expandedSheet) {
        const insideSheet = expandedSheet.contains(targetEl);
        const canScrollInnerDown =
          delta > 0 &&
          expandedSheet.scrollTop + expandedSheet.clientHeight < expandedSheet.scrollHeight - 2;
        const canScrollInnerUp = delta < 0 && expandedSheet.scrollTop > 2;
        if (insideSheet && (canScrollInnerDown || canScrollInnerUp)) {
          return;
        }

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
        wheelAccumRef.current = 0;
        gestureLockUntilRef.current = now + GESTURE_LOCK_MS;
        window.dispatchEvent(new CustomEvent('scrolly-collapse-active-drawer'));
        return;
      }

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
  }, [getActiveExpandedSheet, stepOneCard]);

  // Touch swipe down when drawer is open: collapse drawer instead of jumping to previous card.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !isExploreVisibleRef.current) {
        touchDrawerRef.current = null;
        return;
      }
      if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) {
        touchDrawerRef.current = null;
        return;
      }
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl?.closest(
          'input, textarea, select, [contenteditable="true"], [data-testid="guess-slider-input"]'
        )
      ) {
        touchDrawerRef.current = null;
        return;
      }
      const expandedSheet = getActiveExpandedSheet();
      if (!expandedSheet) {
        touchDrawerRef.current = null;
        return;
      }
      const touch = e.touches[0];
      touchDrawerRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollTop: expandedSheet.scrollTop,
        insideSheet: expandedSheet.contains(targetEl),
        closedDuringGesture: false,
        lockedVertical: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchDrawerRef.current;
      if (!state || e.touches.length !== 1) return;
      if (state.closedDuringGesture) {
        e.preventDefault();
        return;
      }
      const expandedSheet = getActiveExpandedSheet();
      if (!expandedSheet) {
        touchDrawerRef.current = null;
        return;
      }
      const touch = e.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      if (!state.lockedVertical && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        touchDrawerRef.current = null;
        return;
      }
      const atSheetTop = state.startScrollTop <= 2 && expandedSheet.scrollTop <= 0;
      if (dy > 0 && (!state.insideSheet || atSheetTop)) {
        state.lockedVertical = true;
        e.preventDefault();
        if (dy > 45) {
          state.closedDuringGesture = true;
          gestureLockUntilRef.current = Date.now() + GESTURE_LOCK_MS;
          window.dispatchEvent(new CustomEvent('scrolly-collapse-active-drawer'));
        }
      }
    };

    const clearTouchDrawer = () => {
      touchDrawerRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    container.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    container.addEventListener('touchend', clearTouchDrawer, { capture: true, passive: true });
    container.addEventListener('touchcancel', clearTouchDrawer, { capture: true, passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      container.removeEventListener('touchmove', handleTouchMove, { capture: true });
      container.removeEventListener('touchend', clearTouchDrawer, { capture: true });
      container.removeEventListener('touchcancel', clearTouchDrawer, { capture: true });
    };
  }, [getActiveExpandedSheet]);

  useEffect(() => {
    if (chromeBlocked) setIsCategoryDrawerOpen(false);
  }, [chromeBlocked]);

  useEffect(() => {
    if (!isCategoryDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsCategoryDrawerOpen(false);
      categoryBtnRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const root = categoryMenuRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setIsCategoryDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [isCategoryDrawerOpen]);

  useEffect(() => {
    if (!showCategorySkeleton) return;
    const timer = window.setTimeout(() => setShowCategorySkeleton(false), 400);
    return () => window.clearTimeout(timer);
  }, [showCategorySkeleton, activeCategory]);

  // Share, flip, and notification sheets hide the HUD. The dock listens to the same event.
  useEffect(() => {
    const onChromeBlock = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChromeBlocked(Boolean(detail?.open));
    };
    window.addEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
    return () => window.removeEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
  }, []);

  // Deference + snap-settle safety + instant right-rail sync on manual scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    let settleSnapTimer: ReturnType<typeof setTimeout> | null = null;
    const update = () => {
      frame = 0;
      const height = el.clientHeight || 1;
      const offset = el.scrollTop % height;
      const traveling = offset > 8 && height - offset > 8;
      setHudTraveling((prev) => (prev === traveling ? prev : traveling));

      const count = slidesRef.current.length;
      if (count > 0) {
        const nearest = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / height)));
        if (nearest !== activeIndexRef.current) {
          activeIndexRef.current = nearest;
          setActiveIndex((prev) => (prev === nearest ? prev : nearest));
          scheduleSlideSettle(nearest);
        }
      }
    };
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
      if (settleSnapTimer) clearTimeout(settleSnapTimer);
      settleSnapTimer = setTimeout(() => {
        settleSnapTimer = null;
        const height = el.clientHeight || 1;
        const count = slidesRef.current.length;
        if (count === 0) return;
        const nearest = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / height)));
        const targetTop = nearest * height;
        if (Math.abs(el.scrollTop - targetTop) > 4) {
          el.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
        if (nearest !== activeIndexRef.current) {
          activeIndexRef.current = nearest;
          setActiveIndex(nearest);
          scheduleSlideSettle(nearest);
        }
      }, 130);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (settleSnapTimer) clearTimeout(settleSnapTimer);
    };
  }, [scheduleSlideSettle]);

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
      {/* Top HUD. Sheets set chromeBlocked: this bar goes inert and fully transparent. */}
      <header
        data-testid="feed-hud"
        data-chrome-blocked={chromeBlocked ? 'true' : 'false'}
        inert={chromeBlocked ? true : undefined}
        aria-hidden={chromeBlocked || undefined}
        className={`pointer-events-none absolute left-3 right-3 top-0 z-hud flex items-center justify-between gap-2 pt-[max(env(safe-area-inset-top),12px)] lg:top-3 lg:pt-0 ${
          chromeBlocked
            ? 'pointer-events-none opacity-0'
            : hudTraveling
              ? '-translate-y-1 opacity-[0.92]'
              : 'opacity-100'
        }`}
      >
        <BrandLogo size={36} id="feed-header-brand" className="pointer-events-none h-9 w-9 shrink-0 lg:hidden" />
        <div
          ref={categoryMenuRef}
          className={`relative min-w-0 shrink ${
            chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          <motion.button
            ref={categoryBtnRef}
            type="button"
            whileTap={chromeBlocked ? undefined : { scale: 0.96 }}
            onClick={() => {
              onButtonPop();
              setIsCategoryDrawerOpen((prev) => !prev);
            }}
            aria-haspopup="menu"
            aria-expanded={isCategoryDrawerOpen}
            data-testid="choose-category-btn"
            className={`scrolly-tactile inline-flex h-9 min-w-0 max-w-[44vw] shrink items-center gap-1.5 overflow-hidden rounded-pill border border-cik-line bg-cik-surface/95 px-3 py-1.5 text-xs font-semibold leading-none text-cik-text shadow-e1 backdrop-blur-md lg:h-10 lg:max-w-[40vw] lg:gap-2 lg:px-3.5 lg:text-sm ${
              chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            <CategoryIcon id={activeCategory} size={14} className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span className="min-w-0 truncate">{categoryTriggerLabel}</span>
            <ChevronDown
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none lg:h-4 lg:w-4 ${
                isCategoryDrawerOpen ? 'rotate-180' : ''
              }`}
            />
          </motion.button>

          {isCategoryDrawerOpen ? (
            <div
              role="menu"
              aria-label={lang === 'tr' ? 'Konu Seç' : 'Choose Topic'}
              data-testid="category-drawer"
              data-presentation="dropdown"
              data-scroll-contain="true"
              className="pointer-events-auto absolute left-0 top-full z-40 mt-2 max-h-[65dvh] w-60 overflow-y-auto rounded-2xl border border-cik-line bg-cik-bg-elevated/95 p-1.5 shadow-e3 backdrop-blur-md outline-none ring-0 focus:outline-none focus:ring-0"
            >
              <div className="flex flex-col gap-0.5">
                {CATEGORY_SELECTOR_OPTIONS.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      data-testid={`category-option-${cat.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onButtonPop();
                        onSelectCategory(cat.id);
                        setIsCategoryDrawerOpen(false);
                        scrollToSlide(0);
                        setShowCategorySkeleton(true);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-cik-pink text-cik-cta'
                          : 'text-cik-text hover:bg-cik-surface-2'
                      }`}
                    >
                      <CategoryIcon id={cat.id} size={18} />
                      <span className="min-w-0 flex-1 truncate">{cat.label[lang]}</span>
                      {isActive ? (
                        <Check size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={`ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 ${
            chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          <Link
            href="/studio"
            data-testid="hud-create-studio-link"
            aria-label={lang === 'tr' ? 'Hikâye Stüdyosu' : 'Creator Studio'}
            title={lang === 'tr' ? 'Hikâye Stüdyosu' : 'Creator Studio'}
            className="scrolly-tactile inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface/95 px-2.5 text-xs font-bold text-cik-cta shadow-e1 backdrop-blur-md hover:bg-cik-pink lg:hidden"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'tr' ? 'Stüdyo' : 'Studio'}</span>
          </Link>
          <LanguageMenu lang={lang} blocked={chromeBlocked} onChangeLang={onChangeLang} />
          <NotificationsBell lang={lang} />
        </div>
      </header>

      {activeCategory === 'vocabulary' && !chromeBlocked ? (
        <nav
          data-testid="vocab-level-filter-bar"
          aria-label={lang === 'tr' ? 'Kelime seviye filtresi' : 'Vocabulary level filter'}
          className="pointer-events-auto absolute left-3 right-3 top-[calc(max(env(safe-area-inset-top),12px)+46px)] z-hud flex items-center justify-center gap-1.5 lg:top-[58px]"
        >
          {VOCAB_LEVEL_OPTIONS.map((opt) => {
            const active = vocabLevelFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                data-testid={`vocab-level-${opt.id}`}
                onClick={() => {
                  onButtonPop();
                  setVocabLevelFilter(opt.id);
                  activeIndexRef.current = 0;
                  setActiveIndex(0);
                  const container = scrollRef.current;
                  if (container) container.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className={`scrolly-tactile rounded-pill border px-3 py-1 text-xs font-extrabold shadow-e1 backdrop-blur-md transition ${
                  active
                    ? 'border-cik-cta bg-cik-cta text-cik-on-cta'
                    : 'border-cik-line bg-cik-surface/95 text-cik-text hover:bg-cik-pink'
                }`}
              >
                {lang === 'tr' ? opt.labelTr : opt.labelEn}
              </button>
            );
          })}
        </nav>
      ) : null}

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
                  vocabPool={vocabPool}
                  lang={lang}
                  darkMode={darkMode}
                  isActive={effectiveSlideActive}
                  priority={slideIdx === 0}
                  cookieBannerVisible={cookieBannerVisible}
                  onButtonPop={onButtonPop}
                  onEarnXp={onEarnXp}
                  onOpenShare={onOpenShareVocab}
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

function LanguageMenu({
  lang,
  blocked,
  onChangeLang,
}: {
  lang: Language;
  blocked: boolean;
  onChangeLang: (lang: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = lang === 'tr' ? 'Dil' : 'Language';

  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const pick = (next: Language) => {
    onChangeLang(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        data-testid="lang-menu-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-cik-line bg-cik-surface/95 text-cik-text shadow-e1 backdrop-blur-md hover:bg-cik-pink lg:h-10 lg:w-10"
      >
        <Globe size={18} strokeWidth={2} aria-hidden="true" className="h-[18px] w-[18px] lg:h-5 lg:w-5" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          data-testid="lang-menu"
          className="absolute right-0 top-[calc(100%+8px)] z-hud flex w-max min-w-16 flex-col gap-0.5 rounded-2xl border border-cik-line bg-cik-bg-elevated/95 p-1.5 shadow-e3 backdrop-blur-md"
        >
          {(['tr', 'en'] as const).map((code) => {
            const selected = lang === code;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                data-testid={code === 'tr' ? 'lang-btn-tr' : 'lang-btn-en'}
                onClick={() => pick(code)}
                className={`cik-footnote flex h-11 items-center justify-between gap-3 rounded-xl px-3 transition-colors ${
                  selected
                    ? 'bg-cik-pink text-cik-cta'
                    : 'text-cik-text hover:bg-cik-surface-2'
                }`}
              >
                <span>{code === 'tr' ? 'TR' : 'EN'}</span>
                {selected ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <span className="w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
