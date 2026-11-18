'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Info,
  RotateCw,
  Share,
  X,
} from 'lucide-react';
import CardMediaStage from '@/components/CardMediaStage';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import IconButton from '@/components/cikartma/IconButton';
import GuessWidget from '@/components/GuessWidget';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import MediaAttributionBadge from '@/components/MediaAttributionBadge';
import { detectMediaProvider } from '@/lib/mediaProvider';
import { trackEvent, fetchCardMediaFromApi } from '@/lib/telemetry';
import type { CategoryId, FactCard } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { maskFactAnswerSpoiler } from '@/utils/factsData';
import { motionSpring } from '@/lib/motion';
import { vibrateTap } from '@/utils/haptics';
import { isFactLiked, toggleLikedFact } from '@/utils/likedFacts';
import { safeExternalHref } from '@/utils/phoneticDisplay';
import { markFactSeenInStorage } from '@/utils/seenFacts';
import { resolveFallbackVisualQuery } from '@/utils/topicMotif';

type CardAction = 'like' | 'save' | 'detail' | 'flip' | 'duel' | 'share';
type CardOverlay = 'source';

function isCardAction(value: string | undefined): value is CardAction {
  return (
    value === 'like' ||
    value === 'save' ||
    value === 'detail' ||
    value === 'flip' ||
    value === 'duel' ||
    value === 'share'
  );
}

function providerLabelFromUrls(urls: Array<string | null | undefined>): string | null {
  const provider = detectMediaProvider({
    videoUrl: urls[0],
    gifUrl: urls[1],
    posterUrl: urls[2],
    mediaUrl: urls[3],
  });
  if (!provider) return null;
  if (provider.id === 'wikimedia') return 'Wikimedia';
  return provider.label;
}

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
  darkMode: _darkMode = true,
  isFavorite,
  isFirstCard = false,
  isActive = true,
  isGuessLocked = false,
  cookieBannerVisible = false,
  onFlip: _onFlip,
  onDoubleTapLike,
  onDwellRead,
  onNextSlide: _onNextSlide,
  onOpenDuel,
  onOpenDetail,
  onOpenStoryShare,
  onGuessReward,
  onGuessLocked,
  onToggleFavorite,
  onButtonPop,
  onEarnXp: _onEarnXp,
  onSuccessSound: _onSuccessSound,
  onWrongSound: _onWrongSound,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [cardOverlay, setCardOverlay] = useState<CardOverlay | null>(null);
  const isFlippedRef = useRef(false);
  isFlippedRef.current = isFlipped;

  useEffect(() => {
    setLocalGuessLocked(false);
    setSavedGuessResult(null);
  }, [fact.id]);

  useEffect(() => {
    setIsExpanded(false);
    setCardOverlay(null);
  }, [fact.id]);

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
      if (!isCardAction(detail.action)) return;
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
        default: {
          const unreachable: never = detail.action;
          return unreachable;
        }
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

  const openSharedDetail = () => {
    onButtonPop();
    markFactSeenInStorage(fact);
    void trackEvent(factSlug, fact.category, 'detail_open', {
      source: localized.sourceName || fact.sourceName || localized.sourceHint,
    });
    onOpenDetail?.(fact, resolvedGifUrl);
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
  const resolvedSourceUrl = safeExternalHref(localized.sourceUrl || fact.sourceUrl);
  const mediaProviderLabel = providerLabelFromUrls([
    resolvedGifUrl,
    fact.gifUrl,
    mediaMeta?.posterUrl || fact.posterUrl,
    null,
  ]);

  latestCardActionsRef.current = {
    toggleLike: () => handleToggleLikeClick({ stopPropagation: () => {} } as React.MouseEvent),
    toggleSave: () => {
      onToggleFavorite(fact);
      vibrateTap(18);
    },
    openDetail: () => {
      if (onOpenDetail) {
        onOpenDetail(fact, resolvedGifUrl);
        return;
      }
      setCardOverlay('source');
    },
    toggleFlip: () => {
      openSharedDetail();
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
      className="reels-slide relative flex h-full w-full shrink-0 flex-col overflow-hidden select-none bg-cik-bg text-cik-text"
    >
      <div className="perspective-1000 relative mx-auto flex h-full w-full flex-col overflow-hidden bg-cik-bg">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-none bg-cik-pink lg:rounded-t-[28px]">
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
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/25 to-transparent"
          />
        </div>

        <div
          data-testid="fact-card-front"
          className={`pointer-events-none absolute inset-0 z-content flex flex-col justify-end overflow-hidden text-cik-text ${
            isFlipped ? 'hidden' : ''
          }`}
        >
          <div
            data-testid="fact-bottom-sheet"
            data-expanded={isExpanded ? 'true' : 'false'}
            data-story-scroll={isExpanded ? 'true' : undefined}
            onWheel={(e) => {
              if (!isExpanded) return;
              const el = e.currentTarget;
              if (el.scrollHeight > el.clientHeight + 1) e.stopPropagation();
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (!isExpanded) {
                e.stopPropagation();
                onButtonPop();
                setIsExpanded(true);
              }
            }}
            className={`pointer-events-auto flex min-h-0 flex-col gap-2 rounded-t-3xl bg-cik-bg pl-4 pr-14 pt-2.5 shadow-[0_-8px_28px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out lg:pr-4 lg:pt-4 ${
              cookieBannerVisible
                ? 'pb-[calc(5rem+env(safe-area-inset-bottom)+68px)] lg:pb-5'
                : 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-5'
            } ${
              isExpanded
                ? 'max-h-[82dvh] overflow-y-auto lg:max-h-[82%]'
                : 'cursor-pointer overflow-hidden lg:cursor-default'
            }`}
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-0.5 h-1 w-9 shrink-0 rounded-full bg-cik-line lg:hidden"
            />

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-neutral-700 hover:bg-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
                <img
                  src={catMeta.iconPath}
                  alt=""
                  aria-hidden="true"
                  width={12}
                  height={12}
                  loading="eager"
                  decoding="sync"
                  className="h-3 w-3 shrink-0 object-contain"
                />
                <span>{catMeta.label[lang]}</span>
              </div>

              <button
                type="button"
                data-testid="front-see-details-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onButtonPop();
                  setCardOverlay('source');
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                aria-label={lang === 'tr' ? 'Kaynak' : 'Source'}
                className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-[11px] font-medium leading-tight text-neutral-700 hover:bg-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white/80"
              >
                <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{lang === 'tr' ? 'Kaynak' : 'Source'}</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="fact-headline-toggle"
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                onButtonPop();
                setIsExpanded((prev) => !prev);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full shrink-0 cursor-pointer rounded-cik-sm text-left"
            >
              <h2
                data-testid="fact-headline"
                className="cik-title-2 cursor-pointer text-cik-text"
              >
                {localized.title}
              </h2>
            </button>

            {!isExpanded && (
              <button
                type="button"
                data-testid="fact-expand-hint"
                onClick={(e) => {
                  e.stopPropagation();
                  onButtonPop();
                  setIsExpanded(true);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="inline-flex w-fit items-center gap-1 text-xs font-bold text-cik-cta lg:hidden"
              >
                {localized.guessChallenge
                  ? lang === 'tr'
                    ? 'Devamını gör / Tahmin et ▴'
                    : 'See more / Guess ▴'
                  : lang === 'tr'
                    ? 'Devamını gör ▴'
                    : 'See more ▴'}
              </button>
            )}

            <div
              className={`grid transition-all duration-300 ease-out ${
                isExpanded
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'pointer-events-none grid-rows-[0fr] opacity-0 lg:pointer-events-auto lg:grid-rows-[1fr] lg:opacity-100'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex flex-col gap-2.5 pt-0.5">
                  <div
                    data-testid="fact-details-drawer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onButtonPop();
                      setIsExpanded((prev) => !prev);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="pointer-events-auto min-h-0 cursor-pointer"
                  >
                    <p
                      data-testid="fact-body"
                      className={`cik-body text-cik-text-2 ${
                        isExpanded ? 'line-clamp-none' : 'line-clamp-2'
                      }`}
                    >
                      {maskedFactText}
                    </p>
                    <span
                      data-testid="fact-collapse-hint"
                      className="cik-caption-2 mt-1.5 inline-flex items-center gap-1 font-bold text-cik-cta"
                    >
                      {isExpanded
                        ? lang === 'tr'
                          ? 'Daralt ▾'
                          : 'Collapse ▾'
                        : lang === 'tr'
                          ? 'Devamını oku ▴'
                          : 'Read more ▴'}
                    </span>
                  </div>

                  {localized.guessChallenge && (
                    <div className="pt-0.5">
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
                        onRequestFlip={() => openSharedDetail()}
                        onButtonPop={onButtonPop}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isFlipped && (
          <div
            data-testid="reels-action-column"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`absolute right-2 z-rail flex flex-col items-center gap-2 lg:hidden ${
              cookieBannerVisible
                ? 'bottom-[calc(6rem+env(safe-area-inset-bottom)+68px)]'
                : 'bottom-[calc(6rem+env(safe-area-inset-bottom))]'
            }`}
          >
            <IconButton
              label={lang === 'tr' ? (isLiked ? 'Beğeniyi kaldır' : 'Beğen') : isLiked ? 'Unlike' : 'Like'}
              aria-pressed={isLiked}
              data-testid="card-like-btn"
              data-liked={isLiked ? 'true' : 'false'}
              onClick={handleToggleLikeClick}
              className={isLiked ? 'bg-cik-cta text-cik-on-cta' : ''}
            >
              <Heart size={24} strokeWidth={2} className={isLiked ? 'fill-current' : ''} />
            </IconButton>
            <IconButton
              label={t.favorite}
              aria-pressed={isFavorite}
              data-testid="card-favorite-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fact);
                vibrateTap(8);
              }}
              className={isFavorite ? 'bg-cik-butter text-cik-butter-text' : ''}
            >
              <Bookmark size={24} strokeWidth={2} className={isFavorite ? 'fill-current' : ''} />
            </IconButton>
            <IconButton
              label={t.flipToBack}
              data-testid="flip-card-btn"
              onClick={(e) => {
                e.stopPropagation();
                openSharedDetail();
              }}
            >
              <RotateCw size={24} strokeWidth={2} />
            </IconButton>
            <IconButton label={t.shareFact} data-testid="card-share-btn" onClick={handleShareClick}>
              <Share size={24} strokeWidth={2} />
            </IconButton>
            <div className="hidden flex-col items-center gap-2 lg:flex">
              <IconButton
                label={lang === 'tr' ? 'Önceki kart' : 'Previous card'}
                data-testid="card-prev-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('scrolly-feed-step', { detail: { direction: -1 } }));
                }}
                className="hidden lg:flex"
              >
                <ChevronUp size={24} strokeWidth={2} />
              </IconButton>
              <IconButton
                label={lang === 'tr' ? 'Sonraki kart' : 'Next card'}
                data-testid="card-next-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('scrolly-feed-step', { detail: { direction: 1 } }));
                }}
                className="hidden lg:flex"
              >
                <ChevronDown size={24} strokeWidth={2} />
              </IconButton>
            </div>
          </div>
        )}

      </div>

      {cardOverlay === 'source' && (
        <div
          data-testid="source-modal-backdrop"
          className="cik-scrim absolute inset-0 z-sheet flex items-end justify-center p-4 sm:items-center"
          onClick={(e) => {
            e.stopPropagation();
            setCardOverlay(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'tr' ? 'Kaynak' : 'Source'}
            data-testid="source-modal"
            className="relative w-full max-w-[420px] rounded-sheet bg-cik-bg-elevated p-4 text-cik-text shadow-e3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
              data-testid="source-modal-close"
              onClick={() => setCardOverlay(null)}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-pill bg-cik-surface text-cik-text shadow-e1"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="cik-footnote pr-12 text-cik-text-2">{t.sourceLabel}</p>
            <p className="cik-headline mt-2 text-cik-text" data-testid="fact-source-name">{resolvedSourceName}</p>
            {mediaProviderLabel ? (
              <p className="cik-subhead mt-1 text-cik-text-2" data-testid="source-provider-label">
                {mediaProviderLabel}
              </p>
            ) : null}
            {resolvedSourceUrl ? (
              <a
                href={resolvedSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cik-subhead mt-3 inline-flex min-h-11 items-center gap-2 text-cik-cta underline"
              >
                <span>{lang === 'tr' ? 'Kaynağı aç' : 'Open source'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <MediaAttributionBadge
              className="mt-3"
              lang={lang}
              card={{
                gifUrl: resolvedGifUrl || fact.gifUrl,
                posterUrl: mediaMeta?.posterUrl || fact.posterUrl,
                mediaSource: mediaMeta?.mediaSource || fact.mediaSource,
                mediaProvider: fact.mediaSource,
                mediaCredit: fact.mediaCredit,
              }}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {heartBursts.map((burst) => (
          <motion.div
            key={burst.id}
            data-testid="heart-burst"
            initial={{ scale: 0.25, opacity: 1, y: 0, rotate: -14 }}
            animate={{ scale: 1.9, opacity: 0, y: -76, rotate: 10 }}
            exit={{ opacity: 0 }}
            transition={motionSpring.stickerSlap}
            style={{ left: burst.x - 42, top: burst.y - 42 }}
            className="pointer-events-none absolute z-toast text-cik-cta"
          >
            <Heart className="h-20 w-20 fill-current" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
