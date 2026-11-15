'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import {
  ArrowDown,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Heart,
  Info,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import FactIcon from '@/components/FactIcon';
import GuessWidget from '@/components/GuessWidget';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { FEED_EXPERIENCE_COPY, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent, fetchTopicGifFromApi } from '@/lib/telemetry';
import type { CategoryId, FactCard } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { getFactUrl, maskFactAnswerSpoiler } from '@/utils/factsData';
import { vibrateTap } from '@/utils/haptics';
import { isFactLiked, toggleLikedFact } from '@/utils/likedFacts';
import {
  buildFactDetailArticle,
  buildStructuredDetailHighlights,
  resolveFallbackVisualQuery,
} from '@/utils/topicMotif';

const CLIENT_GIF_CACHE = new Map<string, string | null>();

function isImageCachedInBrowser(url: string | null): boolean {
  if (!url || typeof window === 'undefined') return false;
  const probe = new window.Image();
  probe.src = url;
  return probe.complete && probe.naturalWidth > 0;
}

interface TikTokFactSlideProps {
  fact: FactCard;
  lang: Language;
  darkMode?: boolean;
  isFavorite: boolean;
  isFirstCard?: boolean;
  isActive?: boolean;
  isGuessLocked?: boolean;
  cookieBannerVisible?: boolean;
  onFlip: (fact: FactCard) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onNextSlide: () => void;
  onOpenDuel: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onGuessReward: (xp: number, accurate: boolean, category?: CategoryId, accuracyPct?: number) => void;
  onGuessLocked?: (factId: string) => void;
  onToggleFavorite: (fact: FactCard) => void;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

export default function TikTokFactSlide({
  fact,
  lang,
  darkMode = true,
  isFavorite,
  isFirstCard = false,
  isActive = true,
  isGuessLocked = false,
  cookieBannerVisible = false,
  onFlip,
  onDoubleTapLike,
  onDwellRead,
  onNextSlide,
  onOpenDuel,
  onOpenStoryShare,
  onGuessReward,
  onGuessLocked,
  onToggleFavorite,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: TikTokFactSlideProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const [miniQuizChoice, setMiniQuizChoice] = useState<number | null>(null);
  const [miniQuizAwarded, setMiniQuizAwarded] = useState(false);
  const [localGuessLocked, setLocalGuessLocked] = useState(false);
  const [savedGuessResult, setSavedGuessResult] = useState<{
    tier: 'spotOn' | 'close' | 'participated';
    earnedXp: number;
    accuracyPct: number;
  } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const detailDragControls = useDragControls();
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const detailDragYRef = useRef(0);
  const detailPullStartY = useRef<number | null>(null);
  const detailPulling = useRef(false);
  const isFlippedRef = useRef(false);
  isFlippedRef.current = isFlipped;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setLocalGuessLocked(false);
    setSavedGuessResult(null);
  }, [fact.id]);

  useEffect(() => {
    setIsDetailsOpen(false);
  }, [fact.id, isActive]);

  const slideRef = useRef<HTMLDivElement>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastTapTimeRef = useRef<number>(0);
  const lastBurstTimeRef = useRef<number>(0);
  const hasCountedDwellRef = useRef<boolean>(false);
  const visibleEnterTimeRef = useRef<number | null>(null);
  const hasSentDwellEventRef = useRef<boolean>(false);

  const t = translations[lang];
  const copy = FEED_EXPERIENCE_COPY[lang];
  const localized = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const factUrl = getFactUrl(fact, lang);
  const factSlug = fact.slug || fact.en.slug || fact.tr.slug || fact.id;
  const isSpoilerRevealed = isGuessLocked || localGuessLocked || isFlipped;
  const maskedFactText = useMemo(
    () =>
      maskFactAnswerSpoiler(
        localized.factText,
        localized.guessChallenge,
        isSpoilerRevealed,
        lang
      ),
    [localized.factText, localized.guessChallenge, isSpoilerRevealed, lang]
  );
  const detailArticle = useMemo(
    () =>
      buildFactDetailArticle(
        {
          factText: localized.factText,
          deepDiveDetail: localized.deepDiveDetail,
          tag: localized.tag,
          sourceHint: localized.sourceHint,
          quiz: localized.quiz,
        },
        lang
      ),
    [localized.factText, localized.deepDiveDetail, localized.tag, localized.sourceHint, localized.quiz, lang]
  );
  const topicText = useMemo(
    () => [localized.title, localized.factText, localized.tag, fact.sketchType].filter(Boolean).join(' '),
    [localized.title, localized.factText, localized.tag, fact.sketchType]
  );

  const detailHighlights = useMemo(
    () =>
      buildStructuredDetailHighlights(
        {
          factText: localized.factText,
          deepDiveDetail: localized.deepDiveDetail,
          tag: localized.tag,
          sourceHint: localized.sourceHint,
          quiz: localized.quiz,
        },
        lang
      ),
    [localized.factText, localized.deepDiveDetail, localized.tag, localized.sourceHint, localized.quiz, lang]
  );

  const initialGifUrl = fact.gifUrl || CLIENT_GIF_CACHE.get(fact.id) || null;
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | null>(initialGifUrl);
  const [gifFailed, setGifFailed] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(() => isImageCachedInBrowser(initialGifUrl));
  const gifImgRef = useRef<HTMLImageElement>(null);

  const effectiveVisualQuery = useMemo(
    () =>
      fact.visualQuery?.trim() ||
      resolveFallbackVisualQuery({
        category: fact.category,
        title: fact.en.title || localized.title,
        factText: fact.en.factText || localized.factText,
        tag: localized.tag,
      }),
    [fact.visualQuery, fact.category, fact.en.title, fact.en.factText, localized.title, localized.factText, localized.tag]
  );

  // Lazy-fetch & cache topic-relevant GIF once when slide becomes active
  useEffect(() => {
    setGifFailed(false);
    if (fact.gifUrl) {
      CLIENT_GIF_CACHE.set(fact.id, fact.gifUrl);
      setResolvedGifUrl(fact.gifUrl);
      setGifLoaded(isImageCachedInBrowser(fact.gifUrl));
      return;
    }
    if (CLIENT_GIF_CACHE.has(fact.id)) {
      const cached = CLIENT_GIF_CACHE.get(fact.id) ?? null;
      setResolvedGifUrl(cached);
      setGifLoaded(isImageCachedInBrowser(cached));
      return;
    }
    setGifLoaded(false);
    setResolvedGifUrl(null);
    if (!isActive || !effectiveVisualQuery) return;

    let cancelled = false;
    void fetchTopicGifFromApi(effectiveVisualQuery, factSlug).then((url) => {
      if (cancelled) return;
      CLIENT_GIF_CACHE.set(fact.id, url);
      if (url) {
        setResolvedGifUrl(url);
        if (isImageCachedInBrowser(url)) setGifLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fact.id, fact.gifUrl, effectiveVisualQuery, factSlug, isActive]);

  useEffect(() => {
    if (gifImgRef.current?.complete && gifImgRef.current.naturalWidth > 0) {
      setGifLoaded(true);
    }
  }, [resolvedGifUrl]);

  const latestCardActionsRef = useRef<{
    toggleLike: () => void;
    toggleSave: () => void;
    openDetail: () => void;
    toggleFlip: () => void;
    openDuel: () => void;
    share: () => void;
  } | null>(null);

  useEffect(() => {
    if (!isActive) return;
    const handleCardAction = (ev: Event) => {
      const detail = (ev as CustomEvent<{ factId?: string; action?: string }>).detail;
      if (!detail || (detail.factId && detail.factId !== fact.id)) return;
      const actions = latestCardActionsRef.current;
      if (!actions) return;
      switch (detail.action) {
        case 'like':
          actions.toggleLike();
          break;
        case 'save':
          actions.toggleSave();
          break;
        case 'detail':
          actions.openDetail();
          break;
        case 'flip':
          actions.toggleFlip();
          break;
        case 'duel':
          actions.openDuel();
          break;
        case 'share':
          actions.share();
          break;
        default:
          break;
      }
    };
    window.addEventListener('scrolly-card-action', handleCardAction as EventListener);
    return () =>
      window.removeEventListener('scrolly-card-action', handleCardAction as EventListener);
  }, [isActive, fact.id]);

  // Deterministic fallback likes when running completely offline without DB counts
  const baseLikesCount = useMemo(() => {
    let sum = 120;
    for (let i = 0; i < fact.id.length; i += 1) {
      sum += fact.id.charCodeAt(i) * 19;
    }
    return 400 + (sum % 890);
  }, [fact.id]);

  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setIsLiked(isFactLiked(fact.id));
    isFlippedRef.current = false;
    setIsFlipped(false);
    setIsFlipping(false);
    setIsDragging(false);
    setMiniQuizChoice(null);
    setMiniQuizAwarded(false);
    hasCountedDwellRef.current = false;
    hasSentDwellEventRef.current = false;
    visibleEnterTimeRef.current = null;
  }, [fact.id, fact.likesCount]);

  useEffect(() => {
    const syncLiked = () => setIsLiked(isFactLiked(fact.id));
    window.addEventListener('scrolly-liked-facts-updated', syncLiked);
    return () => window.removeEventListener('scrolly-liked-facts-updated', syncLiked);
  }, [fact.id]);

  // Settle 150ms debounce + 1.5s dwell read tracking + off-screen timer cleanup driven by parent isActive
  useEffect(() => {
    const flushDwellDuration = () => {
      if (visibleEnterTimeRef.current !== null && !hasSentDwellEventRef.current) {
        const dwellSec = (Date.now() - visibleEnterTimeRef.current) / 1000;
        visibleEnterTimeRef.current = null;
        if (dwellSec > 3) {
          hasSentDwellEventRef.current = true;
          void trackEvent(factSlug, fact.category, 'card_dwell', {
            dwell_sec: Number(dwellSec.toFixed(1)),
          });
        }
      } else {
        visibleEnterTimeRef.current = null;
      }
    };

    const clearPendingTimers = () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current);
        flipTimerRef.current = null;
      }
      if (burstTimersRef.current.length > 0) {
        burstTimersRef.current.forEach((tid) => clearTimeout(tid));
        burstTimersRef.current = [];
      }
    };

    if (!isActive) {
      clearPendingTimers();
      setIsFlipped(false);
      setIsFlipping(false);
      setIsDragging(false);
      setHeartBursts([]);
      flushDwellDuration();
      return;
    }

    // Wait 150ms for swipe momentum to settle before writing dwell timestamps/telemetry
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      if (visibleEnterTimeRef.current === null) {
        visibleEnterTimeRef.current = Date.now();
      }
      if (!hasCountedDwellRef.current && !dwellTimerRef.current) {
        dwellTimerRef.current = setTimeout(() => {
          dwellTimerRef.current = null;
          if (!hasCountedDwellRef.current) {
            hasCountedDwellRef.current = true;
            onDwellRead(fact);
          }
        }, 1500);
      }
    }, 150);

    return () => {
      clearPendingTimers();
      flushDwellDuration();
    };
  }, [isActive, fact, factSlug, onDwellRead]);

  const baseDisplayLikes =
    typeof fact.likesCount === 'number' ? Math.max(0, fact.likesCount) : baseLikesCount;
  // Liked adds +1 locally; unlike removes that +1. Never tied to favorite/save.
  const displayLikes = Math.max(0, baseDisplayLikes + (isLiked ? 1 : 0));

  useEffect(() => {
    if (!isFlipped) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFlipped(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFlipped]);

  // Detail must sit above feed HUD/dock (separate stacking contexts). Broadcast so chrome disables hits.
  useEffect(() => {
    const open = Boolean(isFlipped && isActive);
    window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open } }));
    return () => {
      window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: false } }));
    };
  }, [isFlipped, isActive]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current);
      }
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
      }
      burstTimersRef.current.forEach((tid) => clearTimeout(tid));
      burstTimersRef.current = [];
    };
  }, []);

  const triggerHeartBurstAt = (clientX?: number, clientY?: number) => {
    const now = Date.now();
    // Prevent duplicate firing when click#2 + dblclick fire sequentially
    if (now - lastBurstTimeRef.current < 150) {
      return;
    }
    lastBurstTimeRef.current = now;

    const nextLiked = toggleLikedFact(fact.id);
    setIsLiked(nextLiked);
    void trackEvent(factSlug, fact.category, nextLiked ? 'like' : 'unlike', {
      trigger: 'double_tap',
    });
    onDoubleTapLike(fact);

    // Burst animation only when liking (not on unlike)
    if (!nextLiked) return;

    const rect = slideRef.current?.getBoundingClientRect();
    const x =
      rect && typeof clientX === 'number' && clientX > 0
        ? clientX - rect.left
        : (rect?.width ?? 360) * 0.5;
    const y =
      rect && typeof clientY === 'number' && clientY > 0
        ? clientY - rect.top
        : (rect?.height ?? 640) * 0.45;

    const burstId = now + cryptoRandomInt(1000);
    setHeartBursts((prev) => [...prev, { id: burstId, x, y }]);
    const burstTimer = setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 900);
    burstTimersRef.current.push(burstTimer);
  };

  const handleToggleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = toggleLikedFact(fact.id);
    setIsLiked(nextLiked);
    void trackEvent(factSlug, fact.category, nextLiked ? 'like' : 'unlike', {
      trigger: 'heart_btn',
    });
    onDoubleTapLike(fact);
    vibrateTap(18);
  };

  const executeFlip = () => {
    const next = !isFlippedRef.current;
    isFlippedRef.current = next;
    setIsFlipping(true);
    detailDragYRef.current = 0;
    detailPullStartY.current = null;
    detailPulling.current = false;
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = setTimeout(() => {
      flipTimerRef.current = null;
      setIsFlipping(false);
    }, 260);

    setIsFlipped(next);
    if (next) {
      void trackEvent(factSlug, fact.category, 'detail_open', {
        source: resolvedSourceName,
      });
    }
    onFlip(fact);
  };

  const dismissDetailFromDrag = (offsetY: number, velocityY: number) => {
    if (offsetY > 110 || velocityY > 650) {
      vibrateTap(14);
      executeFlip();
      return true;
    }
    return false;
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  };

  const handlePointerDownSlide = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    if (isFlipped) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressTriggeredRef.current = true;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      vibrateTap(22);
      onButtonPop();
      executeFlip();
    }, 500);
  };

  const handlePointerMoveSlide = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 12 || dy > 12) {
      clearLongPressTimer();
    }
  };

  // 250 ms smart single-tap vs double-tap disambiguation
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    const now = Date.now();
    const delta = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (delta > 0 && delta <= 250) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      triggerHeartBurstAt(e.clientX, e.clientY);
      return;
    }

    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
    }

    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      executeFlip();
    }, 250);
  };

  const handleNativeDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    triggerHeartBurstAt(e.clientX, e.clientY);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onButtonPop();
    void trackEvent(factSlug, fact.category, 'share');
    onOpenStoryShare(fact);
  };
  const resolvedSourceName =
    localized.sourceName || fact.sourceName || localized.sourceHint;
  const resolvedSourceUrl = localized.sourceUrl || fact.sourceUrl;

  latestCardActionsRef.current = {
    toggleLike: () => handleToggleLikeClick({ stopPropagation: () => {} } as React.MouseEvent),
    toggleSave: () => {
      onToggleFavorite(fact);
      vibrateTap(18);
    },
    openDetail: () => executeFlip(),
    toggleFlip: () => {
      onButtonPop();
      executeFlip();
    },
    openDuel: () => {
      void trackEvent(factSlug, fact.category, 'duel');
      onOpenDuel(fact);
    },
    share: () => handleShareClick({ stopPropagation: () => {} } as React.MouseEvent),
  };

    return (
    <div
      ref={slideRef}
      data-testid="fact-card"
      data-fact-id={fact.id}
      data-active={isActive ? 'true' : 'false'}
      onClick={handleSceneClick}
      onDoubleClick={handleNativeDoubleClick}
      onPointerDown={handlePointerDownSlide}
      onPointerMove={handlePointerMoveSlide}
      onPointerUp={() => {
        clearLongPressTimer();
        setIsDragging(false);
      }}
      onPointerCancel={() => {
        clearLongPressTimer();
        setIsDragging(false);
      }}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      style={{
        contain: 'layout style paint',
        willChange: isFlipping || isDragging ? 'transform' : 'auto',
      }}
      className="reels-slide relative flex h-full w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden select-none bg-[#0A0A0E]"
    >
      {/* Soft blurred side wash from active card color */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-110 blur-3xl saturate-150"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${fact.accentColor}55 0%, transparent 55%), linear-gradient(180deg, #0A0A0E 0%, #050508 100%)`,
        }}
      />

      <div className="relative mx-auto h-full w-full overflow-hidden bg-[#0A0A0E]">
        {/* Full-bleed live visual backdrop (animated canvas fallback + bright GIF layer) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0A0A0E]">
          <CategoryMotionArt
            variant="hero"
            factId={fact.id}
            sketchType={fact.sketchType}
            category={fact.category}
            accentColor={fact.accentColor}
            iconName={fact.iconName}
            emoji={fact.emoji ?? catMeta.emoji}
            lang={lang}
            isFirstCard={isFirstCard}
            isActive={isActive}
            onButtonPop={onButtonPop}
            topicText={topicText}
            tag={localized.tag}
          />

          {/* Topic-relevant bright GIF media layer (only when cleanly matched via visualQuery) */}
          {resolvedGifUrl && !gifFailed && (
            <img
              ref={gifImgRef}
              src={resolvedGifUrl}
              alt={localized.title}
              loading="eager"
              decoding="async"
              data-testid="card-topic-gif"
              onLoad={() => setGifLoaded(true)}
              onError={() => setGifFailed(true)}
              className={`pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover brightness-105 contrast-105 transition-opacity duration-500 ${
                gifLoaded ? 'opacity-95' : 'opacity-0'
              }`}
            />
          )}

          {/* Edge-only gradients so top HUD & bottom title/drawer stay legible without dimming center */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-20 bg-gradient-to-b from-black/65 to-transparent"
          />

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] transition-all duration-300 ${
              isDetailsOpen
                ? 'h-[78%] bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/95 to-transparent'
                : 'h-[52%] bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/85 to-transparent'
            }`}
          />
        </div>

        {/* Bottom collapsed headline + expandable story & guess drawer */}
        <div
          data-testid="fact-card-front"
          className={`relative z-10 flex h-full w-full flex-col justify-end overflow-hidden px-4 pt-20 pr-14 sm:pr-16 lg:pr-5 ${
            cookieBannerVisible
              ? 'pb-[calc(env(safe-area-inset-bottom,16px)+200px)] lg:pb-6'
              : 'pb-[calc(env(safe-area-inset-bottom,16px)+84px)] lg:pb-6'
          } ${isFlipped ? 'invisible pointer-events-none' : ''}`}
        >
          <div
            className={`pointer-events-none relative z-10 flex w-full flex-col no-scrollbar ${
              isDetailsOpen ? 'max-h-[min(100%,calc(100dvh-140px))] overflow-y-auto' : ''
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-white/95 p-0.5">
                    <img src={catMeta.iconPath} alt="" aria-hidden="true" className="h-2.5 w-2.5 object-contain" />
                  </span>
                  <span>{catMeta.label[lang]}</span>
                </div>

                <button
                  type="button"
                  data-testid="front-see-details-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onButtonPop();
                    executeFlip();
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="pointer-events-auto inline-flex min-h-[26px] items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold text-white/90 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
                >
                  <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{lang === 'tr' ? 'Kaynak' : 'Source'}</span>
                </button>
              </div>

              {resolvedGifUrl && !gifFailed && (
                <div className="pointer-events-auto shrink-0">
                  <PoweredByGiphyBadge micro lang={lang} />
                </div>
              )}
            </div>

            <button
              type="button"
              data-testid="fact-headline-toggle"
              aria-expanded={isDetailsOpen}
              onClick={(e) => {
                e.stopPropagation();
                onButtonPop();
                setIsDetailsOpen((prev) => !prev);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="pointer-events-auto group w-full text-left focus:outline-none"
            >
              <h2
                data-testid="fact-headline"
                className="font-display text-xl font-bold leading-snug text-white text-left whitespace-normal break-words drop-shadow sm:text-2xl"
              >
                {localized.title}
              </h2>
              {!isDetailsOpen && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-white/75 transition group-hover:text-white">
                  {lang === 'tr'
                    ? '👆 Hikaye ve tahmin için başlığa dokun ▾'
                    : '👆 Tap headline for story & quiz ▾'}
                </span>
              )}
            </button>

            <AnimatePresence initial={false}>
              {isDetailsOpen && (
                <motion.div
                  key="details-drawer"
                  data-testid="fact-details-drawer"
                  initial={{ opacity: 0, height: 0, y: 8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 8 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="pointer-events-auto overflow-hidden"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="mt-2 rounded-2xl border border-white/15 bg-[#0A0A0E]/90 p-3.5 backdrop-blur-md"
                  >
                    <div className="mb-1.5 flex items-center justify-end">
                      <button
                        type="button"
                        data-testid="front-collapse-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onButtonPop();
                          setIsDetailsOpen(false);
                        }}
                        className="inline-flex min-h-[26px] items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold text-white/85 transition hover:bg-white/20 hover:text-white"
                      >
                        {lang === 'tr' ? '▴ Daralt' : '▴ Collapse'}
                      </button>
                    </div>

                    <p
                      data-testid="fact-body"
                      className="mb-2.5 text-xs font-medium leading-relaxed text-white/90 whitespace-normal break-words sm:text-sm"
                    >
                      {maskedFactText}
                    </p>

                    {localized.guessChallenge && (
                      <GuessWidget
                        factId={fact.id}
                        challenge={localized.guessChallenge}
                        lang={lang}
                        initialAnsweredState={savedGuessResult}
                        onGuessLocked={(id) => {
                          setLocalGuessLocked(true);
                          onGuessLocked?.(id);
                        }}
                        onGuessAnswered={(xpAwarded, accurate, details) => {
                          const nextTier: 'spotOn' | 'close' | 'participated' =
                            xpAwarded >= 20 ? 'spotOn' : xpAwarded >= 15 ? 'close' : 'participated';
                          setSavedGuessResult({
                            tier: nextTier,
                            earnedXp: xpAwarded,
                            accuracyPct: details.accuracyPct,
                          });
                          setLocalGuessLocked(true);
                          onGuessLocked?.(fact.id);
                          onGuessReward(xpAwarded, accurate, fact.category, details.accuracyPct);
                          void trackEvent(factSlug, fact.category, 'quick_guess', {
                            guess: details.userGuess,
                            target: details.correctValue,
                            accuracy: details.accuracyPct,
                            xp_awarded: xpAwarded,
                          });
                        }}
                        onRequestFlip={() => executeFlip()}
                        onButtonPop={onButtonPop}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Reels action column — mobile/tablet only (desktop moves rail beside stage) */}
        {!isFlipped && (
          <div
            data-testid="reels-action-column"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`absolute ${
              cookieBannerVisible
                ? 'bottom-[calc(env(safe-area-inset-bottom,16px)+204px)]'
                : 'bottom-[calc(env(safe-area-inset-bottom,16px)+84px)]'
            } right-2 z-20 flex flex-col items-center gap-2.5 lg:hidden`}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleLikeClick}
              aria-label={lang === 'tr' ? (isLiked ? 'Beğeniyi kaldır' : 'Beğen') : isLiked ? 'Unlike' : 'Like'}
              aria-pressed={isLiked}
              data-testid="card-like-btn"
              data-liked={isLiked ? 'true' : 'false'}
              className="flex flex-col items-center gap-0.5"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all ${
                  isLiked ? 'bg-rose-500 text-white' : 'bg-white/10 text-rose-300'
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              </span>
              <span className="text-[10px] font-extrabold text-white/90">
                {displayLikes === 1
                  ? lang === 'tr'
                    ? '1 beğeni'
                    : '1 like'
                  : lang === 'tr'
                    ? `${displayLikes} beğeni`
                    : `${displayLikes} likes`}
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fact);
                vibrateTap(18);
              }}
              aria-label={t.favorite}
              data-testid="card-favorite-btn"
              className="flex flex-col items-center gap-0.5"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-all ${
                  isFavorite ? 'bg-amber-400 text-[#09090B]' : 'bg-white/10 text-amber-200'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </span>
              <span className="text-[10px] font-extrabold text-white/90">
                {lang === 'tr' ? 'Kaydet' : 'Save'}
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                executeFlip();
              }}
              aria-label={t.flipToBack}
              data-testid="flip-card-btn"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md">
                <RotateCw className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-extrabold text-white/90">{t.tiktokDetailBtn}</span>
            </motion.button>

            {ENABLE_COMPETITIVE_TABS && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  void trackEvent(factSlug, fact.category, 'duel');
                  onOpenDuel(fact);
                }}
                aria-label={t.dockDuel}
                data-testid="card-duel-btn"
                className="flex flex-col items-center gap-0.5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/50 bg-gradient-to-br from-violet-600/90 to-fuchsia-600/90 text-white shadow-lg shadow-violet-500/30 backdrop-blur-md">
                  <Swords className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-extrabold text-white/90">{t.dockDuel}</span>
              </motion.button>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleShareClick}
              aria-label={t.shareFact}
              data-testid="card-share-btn"
              className="flex flex-col items-center gap-0.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-extrabold text-white/90">{t.shareFact}</span>
            </motion.button>
          </div>
        )}

        {portalReady &&
          createPortal(
            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  key="detail-root"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => executeFlip()}
                  className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm"
                >
                  <motion.div
                    key="detail"
                    data-testid="fact-card-back"
                    data-card-view="detail"
                    role="dialog"
                    aria-modal="true"
                    aria-label={copy.detailSheetTitle}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    drag="y"
                    dragControls={detailDragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.92 }}
                    dragMomentum={false}
                    onDrag={(_e, info) => {
                      detailDragYRef.current = Math.max(0, info.offset.y);
                    }}
                    onDragEnd={(_e, info) => {
                      const closed = dismissDetailFromDrag(info.offset.y, info.velocity.y);
                      if (!closed) detailDragYRef.current = 0;
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    data-theme={darkMode ? 'dark' : 'light'}
                    className={`pointer-events-auto relative z-[60] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden lg:my-auto lg:h-[min(90dvh,820px)] lg:max-w-[min(620px,54vw)] lg:rounded-[28px] lg:border lg:shadow-2xl ${
                      darkMode
                        ? 'bg-[#111115] text-white lg:border-white/15'
                        : 'bg-[#FFFDF9] text-[#1E1B2E] lg:border-[#1E1B2E]/10'
                    }`}
                  >
                    {/* Drag zone: handle + header — starts sheet drag on pointer/touch */}
                    <div
                      data-testid="detail-drag-zone"
                      className="relative z-20 flex shrink-0 touch-none flex-col px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
                      onPointerDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-testid="detail-close-btn"]')) return;
                        e.stopPropagation();
                        detailDragControls.start(e);
                      }}
                    >
                      <div
                        data-testid="detail-drag-handle"
                        className="mx-auto mb-3 flex h-8 w-full max-w-[120px] cursor-grab items-center justify-center active:cursor-grabbing"
                        aria-label={lang === 'tr' ? 'Aşağı kaydırarak kapat' : 'Drag down to close'}
                      >
                        <span
                          className={`h-1.5 w-12 rounded-full ${darkMode ? 'bg-white/35' : 'bg-[#1E1B2E]/25'}`}
                        />
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-3">
                        <div
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                            darkMode ? 'bg-white/10 text-white' : 'bg-[#1E1B2E]/[0.08] text-[#1E1B2E]'
                          }`}
                        >
                          <img src={catMeta.iconPath} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                          <span>{t.whyHowHeader}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onButtonPop();
                            executeFlip();
                          }}
                          aria-label={t.tiktokBackFrontBtn}
                          data-testid="detail-close-btn"
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                            darkMode
                              ? 'border-white/15 bg-white/10 text-white'
                              : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
                          }`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={detailScrollRef}
                      className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 touch-pan-y"
                      onPointerDown={(e) => {
                        const scroller = detailScrollRef.current;
                        if (!scroller || scroller.scrollTop > 2) {
                          detailPullStartY.current = null;
                          detailPulling.current = false;
                          return;
                        }
                        detailPullStartY.current = e.clientY;
                        detailPulling.current = false;
                      }}
                      onPointerMove={(e) => {
                        if (detailPullStartY.current == null) return;
                        const scroller = detailScrollRef.current;
                        if (!scroller || scroller.scrollTop > 2) return;
                        const dy = e.clientY - detailPullStartY.current;
                        if (!detailPulling.current && dy > 14) {
                          detailPulling.current = true;
                          detailDragControls.start(e);
                        }
                      }}
                      onPointerUp={() => {
                        detailPullStartY.current = null;
                        detailPulling.current = false;
                      }}
                      onPointerCancel={() => {
                        detailPullStartY.current = null;
                        detailPulling.current = false;
                      }}
                    >
                      <div className="my-2 flex-1 space-y-4 pr-0.5">
                        {/* Visual Hero Banner */}
                        <div
                          className="relative overflow-hidden rounded-2xl border p-4"
                          style={{
                            borderColor: `${fact.accentColor}40`,
                            background: darkMode
                              ? `linear-gradient(135deg, ${fact.accentColor}2A 0%, rgba(17,17,22,0.92) 100%)`
                              : `linear-gradient(135deg, ${fact.accentColor}1C 0%, #FFFFFF 100%)`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                                  style={{ backgroundColor: fact.accentColor || '#7C3AED' }}
                                >
                                  <span>{fact.emoji || catMeta.emoji}</span>
                                  <span>{detailHighlights.topicTag}</span>
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                    darkMode
                                      ? 'bg-amber-400/20 text-amber-300'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  <Zap className="h-3 w-3" />
                                  <span>{fact.readingTimeSec || 18}s · +15 XP</span>
                                </span>
                              </div>
                              <h3 className="mt-2.5 font-display text-xl font-bold leading-snug whitespace-normal break-words">
                                {localized.title}
                              </h3>
                            </div>
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                                darkMode
                                  ? 'border-white/15 bg-black/35'
                                  : 'border-[#1E1B2E]/10 bg-white shadow-sm'
                              }`}
                            >
                              <FactIcon
                                name={fact.iconName}
                                className="h-6 w-6"
                                style={{ color: fact.accentColor || '#7C3AED' }}
                              />
                            </div>
                          </div>

                          {resolvedGifUrl && !gifFailed ? (
                            <div className="relative mt-3 h-36 w-full overflow-hidden rounded-xl border border-white/15">
                              <img
                                src={resolvedGifUrl}
                                alt={localized.title}
                                onError={() => setGifFailed(true)}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </div>
                          ) : (
                            <div className="mt-3">
                              <CategoryMotionArt
                                variant="compact"
                                category={fact.category}
                                accentColor={fact.accentColor}
                                iconName={fact.iconName}
                                emoji={fact.emoji ?? catMeta.emoji}
                                lang={lang}
                                isActive={isFlipped}
                              />
                            </div>
                          )}
                        </div>

                        {/* Quick Takeaways Strip */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div
                            className={`rounded-2xl border px-3.5 py-2.5 ${
                              darkMode
                                ? 'border-white/10 bg-white/[0.04]'
                                : 'border-[#1E1B2E]/10 bg-white'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                darkMode ? 'text-violet-300' : 'text-violet-700'
                              }`}
                            >
                              {lang === 'tr' ? '🎯 Hızlı Özet' : '🎯 Core Takeaway'}
                            </p>
                            <p
                              className={`mt-1 text-xs font-semibold leading-relaxed ${
                                darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                              }`}
                            >
                              {localized.factText}
                            </p>
                          </div>
                          <div
                            className={`rounded-2xl border px-3.5 py-2.5 ${
                              darkMode
                                ? 'border-white/10 bg-white/[0.04]'
                                : 'border-[#1E1B2E]/10 bg-white'
                            }`}
                          >
                            <p
                              className={`text-[10px] font-black uppercase tracking-wider ${
                                darkMode ? 'text-sky-300' : 'text-sky-700'
                              }`}
                            >
                              {lang === 'tr' ? '🔬 Bilimsel Odak' : '🔬 Focus Question'}
                            </p>
                            <p
                              className={`mt-1 text-xs font-semibold leading-relaxed ${
                                darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                              }`}
                            >
                              {detailHighlights.curiosityHook}
                            </p>
                          </div>
                        </div>

                        {/* Scientific Deep-Dive Narrative */}
                        <div
                          className={`rounded-2xl border p-4 ${
                            darkMode
                              ? 'border-white/10 bg-white/[0.03]'
                              : 'border-[#1E1B2E]/10 bg-white'
                          }`}
                        >
                          <p
                            className={`mb-2 text-[10px] font-black uppercase tracking-wider ${
                              darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
                            }`}
                          >
                            {lang === 'tr' ? '📖 Derinlemesine Bilim Analizi' : '📖 Deep-Dive Science'}
                          </p>
                          <p
                            data-testid="fact-detail-article"
                            data-differs-from-teaser={detailArticle.differsFromTeaser ? 'true' : 'false'}
                            className={`whitespace-pre-wrap text-[14.5px] leading-relaxed break-words ${
                              darkMode ? 'text-white/90' : 'text-[#1E1B2E]/85'
                            }`}
                          >
                            {detailArticle.article}
                          </p>
                        </div>

                        {/* Engaging Key Insight & Curiosity Hook */}
                        <div
                          className={`rounded-2xl border p-3.5 ${
                            darkMode
                              ? 'border-amber-400/25 bg-amber-400/10'
                              : 'border-amber-300 bg-amber-50'
                          }`}
                        >
                          <p
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              darkMode ? 'text-amber-300' : 'text-amber-800'
                            }`}
                          >
                            {lang === 'tr' ? '💡 Kilit Bilimsel İçgörü' : '💡 Key Scientific Insight'}
                          </p>
                          <p
                            className={`mt-1 text-xs font-bold leading-relaxed ${
                              darkMode ? 'text-white/90' : 'text-[#1E1B2E]/90'
                            }`}
                          >
                            {detailHighlights.keyInsight}
                          </p>
                        </div>

                        {/* Interactive 1-Tap Comprehension Mini-Quiz (+15 XP) */}
                        {localized.quiz && localized.quiz.options && localized.quiz.options.length >= 2 && (
                          <div
                            data-testid="detail-mini-quiz"
                            className={`rounded-2xl border p-4 ${
                              darkMode
                                ? 'border-violet-400/30 bg-violet-500/10'
                                : 'border-violet-200 bg-violet-50/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                                  darkMode ? 'text-violet-300' : 'text-violet-700'
                                }`}
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>{lang === 'tr' ? 'Hızlı Kavrama Testi' : 'Quick Knowledge Check'}</span>
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  miniQuizChoice !== null && miniQuizChoice === localized.quiz.correctIndex
                                    ? 'bg-emerald-500 text-white'
                                    : darkMode
                                      ? 'bg-amber-400/20 text-amber-300'
                                      : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {miniQuizChoice !== null && miniQuizChoice === localized.quiz.correctIndex
                                  ? '+15 XP ✓'
                                  : '+15 XP'}
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-extrabold leading-snug">
                              {localized.quiz.question}
                            </p>
                            <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {localized.quiz.options.map((opt, idx) => {
                                const picked = miniQuizChoice === idx;
                                const answered = miniQuizChoice !== null;
                                const isCorrectOpt = idx === localized.quiz.correctIndex;
                                let optStyle = darkMode
                                  ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                                  : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E] hover:bg-violet-50';
                                if (answered) {
                                  if (isCorrectOpt) {
                                    optStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-500 dark:text-emerald-200';
                                  } else if (picked) {
                                    optStyle = 'border-rose-500 bg-rose-500/20 text-rose-500 dark:text-rose-200';
                                  } else {
                                    optStyle = darkMode
                                      ? 'border-white/10 bg-white/[0.02] text-white/45'
                                      : 'border-[#1E1B2E]/10 bg-white/50 text-[#1E1B2E]/45';
                                  }
                                }
                                return (
                                  <button
                                    key={`${fact.id}-dq-${idx}`}
                                    type="button"
                                    data-testid={`detail-quiz-opt-${idx}`}
                                    disabled={answered}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (miniQuizChoice !== null) return;
                                      onButtonPop();
                                      setMiniQuizChoice(idx);
                                      const right = idx === localized.quiz.correctIndex;
                                      if (right) {
                                        onSuccessSound?.();
                                        if (!miniQuizAwarded) {
                                          setMiniQuizAwarded(true);
                                          onEarnXp?.(15, 'detail_mini_quiz');
                                        }
                                      } else {
                                        onWrongSound?.();
                                      }
                                    }}
                                    className={`flex min-h-[40px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition ${optStyle}`}
                                  >
                                    <span className="whitespace-normal break-words leading-snug">{opt}</span>
                                    {answered && isCorrectOpt && (
                                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {miniQuizChoice !== null && localized.quiz.explanation && (
                              <p
                                className={`mt-2.5 text-[11px] font-semibold leading-relaxed ${
                                  darkMode ? 'text-white/80' : 'text-[#1E1B2E]/80'
                                }`}
                              >
                                {localized.quiz.explanation}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Scrolla 1v1 Quick Duel Banner */}
                        {ENABLE_COMPETITIVE_TABS && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onButtonPop();
                              isFlippedRef.current = false;
                              setIsFlipped(false);
                              void trackEvent(factSlug, fact.category, 'duel');
                              onOpenDuel(fact);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 px-4 py-3 text-left text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110"
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-violet-100">
                                Scrolla 1v1
                              </p>
                              <p className="text-xs font-extrabold">
                                {lang === 'tr'
                                  ? 'Bu bilgiyle arkadaşını 1v1 düelloya davet et!'
                                  : 'Challenge a friend in a Scrolla 1v1 duel!'}
                              </p>
                            </div>
                            <Swords className="h-5 w-5 shrink-0" />
                          </button>
                        )}

                        <div
                          data-testid="fact-source-box"
                          className={`mt-2 flex flex-col gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
                            darkMode
                              ? 'border-white/15 bg-white/5'
                              : 'border-[#1E1B2E]/[0.12] bg-white'
                          }`}
                        >
                          <div className={`flex items-start gap-2 font-bold ${darkMode ? 'text-white/90' : 'text-[#1E1B2E]'}`}>
                            <BookOpen className={`mt-0.5 h-4 w-4 shrink-0 ${darkMode ? 'text-violet-300' : 'text-violet-600'}`} />
                            <div className="min-w-0 flex-1">
                              <span
                                lang={lang}
                                className={`block text-[10px] font-black uppercase tracking-wider ${
                                  darkMode ? 'text-white/60' : 'text-[#1E1B2E]/55'
                                }`}
                              >
                                {t.sourceLabel}
                              </span>
                              <span data-testid="fact-source-name" className="text-xs font-extrabold whitespace-normal break-words">
                                {resolvedSourceName}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 border-t pt-2 ${
                              darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
                            }`}
                          >
                            {resolvedSourceUrl ? (
                              <a
                                href={resolvedSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                data-testid="fact-source-link"
                                className={`inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${
                                  darkMode
                                    ? 'bg-violet-500/25 text-violet-100'
                                    : 'bg-violet-100 text-violet-800'
                                }`}
                              >
                                <span>{t.verifySourceCta}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className={`text-[11px] font-semibold ${darkMode ? 'text-white/70' : 'text-[#1E1B2E]/65'}`}>
                                {localized.sourceHint}
                              </span>
                            )}
                            <Link
                              href={factUrl}
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex min-h-[36px] items-center gap-1 font-extrabold hover:underline ${
                                darkMode ? 'text-white/80' : 'text-[#1E1B2E]/75'
                              }`}
                            >
                              <span>{t.readFullPage}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </Link>
                          </div>
                          {resolvedGifUrl && !gifFailed && (
                            <div
                              className={`flex items-center justify-between gap-2 border-t pt-2 ${
                                darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
                              }`}
                            >
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
                                }`}
                              >
                                {lang === 'tr' ? 'Görsel GIF Kaynağı' : 'GIF Media Attribution'}
                              </span>
                              <PoweredByGiphyBadge compact lang={lang} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pinned footer bar — always reachable outside detailScrollRef */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`relative z-50 flex shrink-0 flex-wrap items-center gap-2 border-t px-5 py-3 pb-[max(14px,env(safe-area-inset-bottom))] ${
                        darkMode
                          ? 'border-white/10 bg-[#111115]'
                          : 'border-[#1E1B2E]/10 bg-[#FFFDF9]'
                      }`}
                    >
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          executeFlip();
                        }}
                        data-testid="flip-back-btn"
                        className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold ${
                          darkMode
                            ? 'border-white/15 bg-white/10 text-white'
                            : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
                        }`}
                      >
                        <RotateCcw className="h-4 w-4 shrink-0" />
                        <span>{lang === 'tr' ? 'Karta Dön' : 'Back to Card'}</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onButtonPop();
                          if (flipTimerRef.current) {
                            clearTimeout(flipTimerRef.current);
                            flipTimerRef.current = null;
                          }
                          isFlippedRef.current = false;
                          setIsFlipping(false);
                          setIsFlipped(false);
                          window.dispatchEvent(
                            new CustomEvent('scrolly-chrome-block', { detail: { open: false } })
                          );
                          setTimeout(() => {
                            onNextSlide();
                          }, 30);
                        }}
                        data-testid="next-card-btn"
                        className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-extrabold ${
                          darkMode
                            ? 'bg-white text-[#09090B]'
                            : 'bg-[#1E1B2E] text-white'
                        }`}
                      >
                        <span>{lang === 'tr' ? 'Sonraki Bilgiye Kaydır' : t.tiktokNextSlideBtn}</span>
                        <ArrowDown className="h-4 w-4 shrink-0" />
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>

      <AnimatePresence>
        {heartBursts.map((burst) => (
          <motion.div
            key={burst.id}
            data-testid="heart-burst"
            initial={{ scale: 0.25, opacity: 1, y: 0, rotate: -14 }}
            animate={{ scale: 1.9, opacity: 0, y: -76, rotate: 10 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, opacity: { duration: 0.72 } }}
            style={{ left: burst.x - 42, top: burst.y - 42 }}
            className="pointer-events-none absolute z-40 text-rose-500 drop-shadow-[0_6px_20px_rgba(244,63,94,0.65)]"
          >
            <Heart className="h-20 w-20 fill-current" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
