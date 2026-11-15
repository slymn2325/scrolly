'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
  translations,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { markFactSeenInStorage } from '@/utils/seenFacts';

const PRELOADED_GIF_CACHE = new Set<string>();
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
    soundEnabled,
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
    onToggleDarkMode,
    onToggleSound,
    onFlipCard,
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
  const [chromeBlocked, setChromeBlocked] = useState<boolean>(false);
  const t = translations[lang];
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
      return;
    }

    // Clamp active index cleanly if deck shrinks without interrupting active swipe position
    if (slides.length > 0 && activeIndexRef.current >= slides.length) {
      const clamped = slides.length - 1;
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    }
  }, [activeCategory, slides.length]);

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
          if (
            settledSlide?.type === 'fact' &&
            isExploreVisibleRef.current &&
            !suppressUrlSyncRef.current &&
            typeof window !== 'undefined'
          ) {
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

  const getStepAnchorIndex = useCallback(() => {
    const recent = lastProgrammaticStepRef.current;
    if (recent && Date.now() - recent.at < 450) {
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
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    },
    [slides.length]
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
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
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
    [getStepAnchorIndex, scrollToSlide]
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

  // Eagerly preload next 2 card & vocabulary GIF URLs in browser cache + head preload hints
  useEffect(() => {
    if (typeof window === 'undefined' || slides.length === 0) return;
    const candidates = [slides[activeIndex + 1], slides[activeIndex + 2]];
    for (const slide of candidates) {
      if (!slide) continue;
      const rawUrl =
        slide.type === 'fact'
          ? slide.fact.gifUrl
          : slide.type === 'vocabulary'
            ? slide.card.gifUrl
            : undefined;
      const url = rawUrl?.trim();
      if (!url || !url.startsWith('https://') || PRELOADED_GIF_CACHE.has(url)) continue;
      PRELOADED_GIF_CACHE.add(url);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = url;
      preloadLink.setAttribute('data-scrolly-gif', '1');
      document.head.appendChild(preloadLink);
    }
  }, [activeIndex, slides]);

  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      className={`relative mx-auto h-full w-full overflow-hidden ${
        darkMode ? 'bg-[#0A0A0E] text-white' : 'bg-[#F7F5FB] text-[#1E1B2E]'
      }`}
    >
      {/* Top HUD — sharp unblurred single horizontal row sitting above cards cleanly (z-[60]) */}
      <header
        data-chrome-blocked={chromeBlocked ? 'true' : 'false'}
        className={`pointer-events-none absolute inset-x-0 top-0 z-[60] flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top,14px),14px)] pb-2 ${
          chromeBlocked ? 'opacity-40' : ''
        }`}
      >
        <div
          className={`relative z-10 min-w-0 flex-1 ${
            chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              onButtonPop();
              setIsCategoryDrawerOpen((prev) => !prev);
            }}
            aria-expanded={isCategoryDrawerOpen}
            data-testid="choose-category-btn"
            className={`inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-2.5 sm:px-3 text-xs font-extrabold transition ${
              isCategoryDrawerOpen
                ? 'border-violet-400 bg-violet-600 text-white'
                : darkMode
                  ? 'border-white/20 bg-[#12121A]/90 text-white hover:bg-[#1C1C28]'
                  : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] shadow-sm hover:bg-white'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/95 p-0.5">
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
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onToggleDarkMode}
            aria-label={darkMode ? t.lightModeOn : t.darkModeOn}
            data-testid="theme-toggle-btn"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              darkMode
                ? 'border-white/20 bg-[#12121A]/90 text-amber-200 hover:bg-[#1C1C28]'
                : 'border-[#1E1B2E]/15 bg-white/95 text-amber-700 shadow-sm hover:bg-white'
            }`}
          >
            <img
              src={darkMode ? UI_ICON_PATHS.themeSun : UI_ICON_PATHS.themeMoon}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 object-contain"
            />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onToggleSound}
            aria-label={soundEnabled ? t.soundOn : t.soundOff}
            data-testid="sound-toggle-btn"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              darkMode
                ? 'border-white/20 bg-[#12121A]/90 text-violet-200 hover:bg-[#1C1C28]'
                : 'border-[#1E1B2E]/15 bg-white/95 text-violet-700 shadow-sm hover:bg-white'
            }`}
          >
            <img
              src={soundEnabled ? UI_ICON_PATHS.soundOn : UI_ICON_PATHS.soundOff}
              alt=""
              aria-hidden="true"
              className={`h-4 w-4 object-contain ${soundEnabled ? '' : 'opacity-45 grayscale'}`}
            />
          </motion.button>

          <div
            role="group"
            aria-label="Language switch"
            className={`flex h-9 shrink-0 items-center gap-0.5 rounded-full border p-0.5 text-[10px] font-black transition ${
              darkMode
                ? 'border-white/20 bg-[#12121A]/90 text-white'
                : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] shadow-sm'
            }`}
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
              className={`inline-flex h-7 min-w-[30px] items-center justify-center rounded-full px-2 transition-all ${
                lang === 'tr'
                  ? darkMode
                    ? 'bg-white text-[#09090B]'
                    : 'bg-[#1E1B2E] text-white'
                  : darkMode
                    ? 'text-white/80'
                    : 'text-[#1E1B2E]/70'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              data-testid="lang-btn-en"
              className={`inline-flex h-7 min-w-[30px] items-center justify-center rounded-full px-2 transition-all ${
                lang === 'en'
                  ? darkMode
                    ? 'bg-white text-[#09090B]'
                    : 'bg-[#1E1B2E] text-white'
                  : darkMode
                    ? 'text-white/80'
                    : 'text-[#1E1B2E]/70'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Opaque category picker — sibling of header so it is never clipped by HUD height */}
      <AnimatePresence>
        {isCategoryDrawerOpen && (
          <motion.div
            key="category-drawer"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            data-testid="category-drawer"
            className={`pointer-events-auto absolute inset-x-4 top-[calc(env(safe-area-inset-top,14px)+54px)] z-[65] max-h-[50dvh] overflow-y-auto rounded-2xl border border-white/20 bg-[#111115] p-2.5 text-white shadow-2xl ${
              chromeBlocked ? 'opacity-40 pointer-events-none' : ''
            }`}
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
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold transition ${
                      isActive
                        ? cat.id === 'vocabulary'
                          ? 'border-indigo-400 bg-indigo-600 text-white'
                          : 'border-white bg-white text-[#09090B]'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/95 p-0.5">
                      <img
                        src={cat.iconPath}
                        alt=""
                        aria-hidden="true"
                        className="h-3.5 w-3.5 object-contain"
                      />
                    </span>
                    <span>{labelText}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Full-Bleed TikTok Snap Scroll Container (Windowed DOM Virtualization: activeIndex - 2 .. activeIndex + 2) */}
      <div
        ref={scrollRef}
        data-testid="tiktok-feed-container"
        data-active-index={activeIndex}
        className="tiktok-feed-scroll no-scrollbar h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        {slides.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-bold text-white/80">
              {lang === 'tr'
                ? 'Bu kategoride henüz gösterilecek kart bulunamadı.'
                : 'No cards found in this category yet.'}
            </p>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#09090B]"
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
              className={`reels-slide h-full min-h-full w-full shrink-0 snap-start ${
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
