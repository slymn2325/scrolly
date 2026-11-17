'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  ChevronUp,
  Heart,
  Info,
  RotateCw,
  Share2,
  Swords,
} from 'lucide-react';
import CardMediaStage from '@/components/CardMediaStage';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import FactDetailPage from '@/components/FactDetailPage';
import GuessWidget from '@/components/GuessWidget';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent, fetchCardMediaFromApi } from '@/lib/telemetry';
import type { CategoryId, FactCard } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { maskFactAnswerSpoiler } from '@/utils/factsData';
import { vibrateTap } from '@/utils/haptics';
import { isFactLiked, toggleLikedFact } from '@/utils/likedFacts';
import { markFactSeenInStorage } from '@/utils/seenFacts';
import { resolveFallbackVisualQuery } from '@/utils/topicMotif';

const CLIENT_GIF_CACHE = new Map<string, string | null>();
const CLIENT_MEDIA_META = new Map<string, { mediaType: string | null; mediaSource: string | null; posterUrl: string | null }>();

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
  onOpenDetail?: (fact: FactCard, resolvedGifUrl?: string | null) => void;
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
  cookieBannerVisible: _cookieBannerVisible = false,
  onFlip,
  onDoubleTapLike,
  onDwellRead,
  onNextSlide,
  onOpenDuel,
  onOpenDetail,
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
  const [localGuessLocked, setLocalGuessLocked] = useState(false);
  const [savedGuessResult, setSavedGuessResult] = useState<{
    tier: 'spotOn' | 'close' | 'participated';
    earnedXp: number;
    accuracyPct: number;
  } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const isFlippedRef = useRef(false);
  isFlippedRef.current = isFlipped;

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
  const localized = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
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
  const topicText = useMemo(
    () => [localized.title, localized.factText, localized.tag, fact.sketchType].filter(Boolean).join(' '),
    [localized.title, localized.factText, localized.tag, fact.sketchType]
  );

  const initialGifUrl = fact.gifUrl || CLIENT_GIF_CACHE.get(fact.id) || null;
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | null>(initialGifUrl);
  const [mediaMeta, setMediaMeta] = useState<{ mediaType: string | null; mediaSource: string | null; posterUrl: string | null } | null>(
    () => CLIENT_MEDIA_META.get(fact.id) || (fact.mediaType ? { mediaType: fact.mediaType, mediaSource: fact.mediaSource || null, posterUrl: fact.posterUrl || null } : null)
  );
  const [mediaSettled, setMediaSettled] = useState(Boolean(initialGifUrl));
  const [gifFailed, setGifFailed] = useState(false);
  const [, setGifLoaded] = useState(() => isImageCachedInBrowser(initialGifUrl));
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
      setMediaSettled(true);
      setGifLoaded(isImageCachedInBrowser(fact.gifUrl));
      return;
    }
    if (CLIENT_GIF_CACHE.has(fact.id)) {
      const cached = CLIENT_GIF_CACHE.get(fact.id) ?? null;
      setResolvedGifUrl(cached);
      setMediaMeta(CLIENT_MEDIA_META.get(fact.id) || null);
      setMediaSettled(true);
      setGifLoaded(isImageCachedInBrowser(cached));
      return;
    }
    setGifLoaded(false);
    setResolvedGifUrl(null);
    setMediaSettled(false);
    if (!isActive || !effectiveVisualQuery) return;

    let cancelled = false;
    void fetchCardMediaFromApi(effectiveVisualQuery, factSlug, false).then((media) => {
      if (cancelled) return;
      const url = media?.url || null;
      CLIENT_GIF_CACHE.set(fact.id, url);
      const meta = {
        mediaType: media?.mediaType || null,
        mediaSource: media?.mediaSource || null,
        posterUrl: media?.posterUrl || null,
      };
      CLIENT_MEDIA_META.set(fact.id, meta);
      setMediaMeta(meta);
      setMediaSettled(true);
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

    // Wait 150ms for swipe momentum to settle, then count card seen/read after 1.2s total view
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
            markFactSeenInStorage(fact);
            onDwellRead(fact);
          }
        }, 1050);
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
  const _displayLikes = Math.max(0, baseDisplayLikes + (isLiked ? 1 : 0));

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
    markFactSeenInStorage(fact);
    const nextLiked = toggleLikedFact(fact.id);
    setIsLiked(nextLiked);
    void trackEvent(factSlug, fact.category, nextLiked ? 'like' : 'unlike', {
      trigger: 'heart_btn',
    });
    onDoubleTapLike(fact);
    vibrateTap(18);
  };

  const executeFlip = () => {
    if (onOpenDetail) {
      markFactSeenInStorage(fact);
      void trackEvent(factSlug, fact.category, 'detail_open', {
        source: resolvedSourceName,
      });
      onFlip(fact);
      onOpenDetail(fact, resolvedGifUrl);
      return;
    }

    const next = !isFlippedRef.current;
    isFlippedRef.current = next;
    setIsFlipping(true);
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = setTimeout(() => {
      flipTimerRef.current = null;
      setIsFlipping(false);
    }, 260);

    setIsFlipped(next);
    if (next) {
      markFactSeenInStorage(fact);
      void trackEvent(factSlug, fact.category, 'detail_open', {
        source: resolvedSourceName,
      });
    }
    onFlip(fact);
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
      className="reels-slide relative flex h-full w-full shrink-0 flex-col overflow-hidden select-none bg-cream text-ink"
    >
      {/* Subtle unblurred dark stage glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden"
        style={{
          background: `radial-gradient(circle at 50% 34%, ${fact.accentColor}26 0%, #0A0A0E 58%, #0A0A0E 100%)`,
        }}
      />

      <div className="perspective-1000 relative mx-auto flex h-full w-full flex-col overflow-hidden bg-cream">
        {/* Full-bleed live visual backdrop + framed upper/mid GIF media stage */}
        <div className="pointer-events-none relative h-[38%] min-h-[150px] w-full shrink-0 overflow-hidden bg-night-2">
          <div className="pointer-events-none absolute inset-x-3 top-2 z-20 flex gap-1" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, bar) => (
              <span key={bar} className={`h-[3px] flex-1 rounded-full ${bar === 0 ? 'bg-white' : 'bg-white/35'}`} />
            ))}
          </div>
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

          <CardMediaStage
            url={gifFailed ? null : resolvedGifUrl}
            posterUrl={mediaMeta?.posterUrl || fact.posterUrl}
            mediaType={mediaMeta?.mediaType || fact.mediaType}
            mediaSource={mediaMeta?.mediaSource || fact.mediaSource}
            isActive={isActive}
            priority={isFirstCard}
            title={localized.title}
            failed={gifFailed}
            empty={mediaSettled && !resolvedGifUrl}
            onFailed={() => setGifFailed(true)}
          />

          {/* Bottom legibility gradient */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-24 bg-gradient-to-b from-transparent to-[#FFF6EC]"
          />
        </div>

        {/* Bottom collapsed headline + expandable story & guess drawer */}
        <div
          data-testid="fact-card-front"
          className={`lumen-cream-panel backface-hidden relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-cream px-5 pt-3 text-ink ${isFlipped ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        >
          <div
            data-scroll-contain={isDetailsOpen ? 'true' : undefined}
            onWheel={(e) => {
              if (!isDetailsOpen) return;
              const el = e.currentTarget;
              if (el.scrollHeight > el.clientHeight + 1) e.stopPropagation();
            }}
            style={isDetailsOpen ? { overscrollBehavior: 'contain' } : undefined}
            className={`pointer-events-none relative z-10 flex w-full flex-col no-scrollbar ${
              isDetailsOpen ? 'max-h-[min(100%,calc(100dvh-140px))] overflow-y-auto' : ''
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/95 p-0.5 shadow-sm">
                    <img
                      src={catMeta.iconPath}
                      alt=""
                      aria-hidden="true"
                      width={16}
                      height={16}
                      loading="eager"
                      decoding="sync"
                      className="h-4 w-4 shrink-0 object-contain"
                    />
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
                  aria-label={lang === 'tr' ? 'Kaynak' : 'Source'}
                  className="pointer-events-auto inline-flex min-h-[26px] items-center gap-1 rounded-full border border-ink bg-ink px-2.5 py-0.5 text-[10px] font-extrabold text-white transition hover:bg-[#2A2444]"
                >
                  <Info className="h-3 w-3 shrink-0 text-white" aria-hidden="true" />
                  <span>{lang === 'tr' ? 'Kaynak' : 'Source'}</span>
                </button>

                
              </div>
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
              className="pointer-events-auto group w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0E]"
            >
              <h2
                data-testid="fact-headline"
                className="font-display text-[26px] font-semibold leading-[1.18] tracking-[-0.02em] text-ink line-clamp-3"
              >
                {localized.title}
              </h2>
            </button>
            <AnimatePresence initial={false}>
                              <motion.div
                  key="details-drawer"
                  data-testid="fact-details-drawer"
                  initial={{ opacity: 0, height: 0, y: 8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 8 }}
                  transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                  className="pointer-events-auto overflow-hidden"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="mt-2"
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
                        className="hidden"
                      >
                        <ChevronUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{lang === 'tr' ? 'Daralt' : 'Collapse'}</span>
                      </button>
                    </div>

                    <p
                      data-testid="fact-body"
                      className="mb-3 line-clamp-3 text-[15px] font-normal leading-[1.55] text-mute"
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
                          markFactSeenInStorage(fact);
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
            </AnimatePresence>
          </div>
        </div>

        {/* Right Reels action column — mobile/tablet only (desktop moves rail beside stage) */}
        {!isFlipped && (
          <div
            data-testid="reels-action-column"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-[12%] z-20 flex flex-col items-center gap-2.5 md:hidden"
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
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-[background-color,color,transform] duration-200 ${
                  isLiked ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 shadow-pill'
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
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
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition-[background-color,color,transform] duration-200 ${
                  isFavorite ? 'bg-amber-400 text-[#09090B]' : 'bg-white text-ink shadow-pill'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white text-ink shadow-pill">
                <RotateCw className="h-5 w-5" />
              </span>
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
                className="hidden"
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white text-ink shadow-pill">
                <Share2 className="h-5 w-5" />
              </span>
                          </motion.button>
          </div>
        )}

        {!onOpenDetail && isFlipped && (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            data-scroll-contain="true"
            onWheel={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: 'contain' }}
            className="backface-hidden pointer-events-auto absolute inset-0 z-[70] h-full w-full overflow-y-auto"
          >
            <FactDetailPage
              fact={fact}
              lang={lang}
              darkMode={darkMode}
              resolvedGifUrl={resolvedGifUrl}
              onClose={() => {
                isFlippedRef.current = false;
                setIsFlipping(false);
                setIsFlipped(false);
              }}
              onNextCard={() => {
                isFlippedRef.current = false;
                setIsFlipping(false);
                setIsFlipped(false);
                setTimeout(() => onNextSlide(), 30);
              }}
              onOpenDuel={(targetFact) => {
                isFlippedRef.current = false;
                setIsFlipping(false);
                setIsFlipped(false);
                onOpenDuel(targetFact);
              }}
              onButtonPop={onButtonPop}
              onEarnXp={onEarnXp}
              onSuccessSound={onSuccessSound}
              onWrongSound={onWrongSound}
            />
          </div>
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
