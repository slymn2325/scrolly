'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  Bookmark,
  BookOpen,
  ExternalLink,
  Heart,
  RotateCcw,
  RotateCw,
  Share2,
  Swords,
  X,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import GuessWidget from '@/components/GuessWidget';
import { FEED_EXPERIENCE_COPY, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/telemetry';
import type { CategoryId, FactCard, GuessChallenge } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { getFactUrl } from '@/utils/factsData';
import { vibrateTap } from '@/utils/haptics';
import { isFactLiked, toggleLikedFact } from '@/utils/likedFacts';
import { buildFactDetailArticle } from '@/utils/topicMotif';

interface TikTokFactSlideProps {
  fact: FactCard;
  lang: Language;
  darkMode?: boolean;
  isFavorite: boolean;
  isFirstCard?: boolean;
  isActive?: boolean;
  cookieBannerVisible?: boolean;
  onFlip: (fact: FactCard) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onNextSlide: () => void;
  onOpenDuel: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onGuessReward: (xp: number, accurate: boolean, category?: CategoryId, accuracyPct?: number) => void;
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

const CATEGORY_HANDLE: Record<CategoryId, { tr: string; en: string }> = {
  space: { tr: 'UzayEvren', en: 'CosmosLab' },
  nature: { tr: 'DoğaHarikası', en: 'WildEarth' },
  human_body: { tr: 'İnsanBeden', en: 'BioHuman' },
  history: { tr: 'ZamanArşivi', en: 'TimeVault' },
  science: { tr: 'BilimKıvılcım', en: 'ScienceSpark' },
  records: { tr: 'GaripRekor', en: 'OddRecords' },
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSpoilerPattern(challenge: GuessChallenge): RegExp | null {
  const tokens: string[] = [];

  if (challenge.type === 'slider' && typeof challenge.correctValue === 'number') {
    const raw = String(challenge.correctValue);
    const us = challenge.correctValue.toLocaleString('en-US');
    const tr = challenge.correctValue.toLocaleString('tr-TR');
    for (const variant of [raw, us, tr]) {
      if (variant && !tokens.includes(variant)) {
        tokens.push(variant);
      }
    }
  } else if (
    challenge.type === 'binary' &&
    Array.isArray(challenge.options) &&
    typeof challenge.correctOptionIndex === 'number'
  ) {
    const correctOption = challenge.options[challenge.correctOptionIndex]?.trim();
    if (correctOption) {
      tokens.push(correctOption);
      const firstWord = correctOption.split(/\s+/)[0];
      if (firstWord && firstWord.length >= 3) {
        tokens.push(firstWord);
      }
    }
  }

  if (tokens.length === 0) return null;
  const sorted = tokens.sort((a, b) => b.length - a.length).map(escapeRegExp);
  return new RegExp(`(${sorted.join('|')})`, 'gi');
}

function maskHeadlineText(title: string, challenge: GuessChallenge, teaserTitle?: string): string {
  if (teaserTitle?.trim()) return teaserTitle.trim();
  const pattern = buildSpoilerPattern(challenge);
  if (pattern && pattern.test(title)) {
    return title.replace(pattern, '[ ??? ]');
  }
  return title;
}

export default function TikTokFactSlide({
  fact,
  lang,
  darkMode = true,
  isFavorite,
  isFirstCard = false,
  isActive = true,
  cookieBannerVisible = false,
  onFlip,
  onDoubleTapLike,
  onDwellRead,
  onNextSlide,
  onOpenDuel,
  onOpenStoryShare,
  onGuessReward,
  onToggleFavorite,
  onButtonPop,
}: TikTokFactSlideProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isGuessLocked, setIsGuessLocked] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);
  const [portalReady, setPortalReady] = useState(false);
  const detailDragControls = useDragControls();
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const detailDragYRef = useRef(0);
  const detailPullStartY = useRef<number | null>(null);
  const detailPulling = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
  const detailArticle = useMemo(
    () =>
      buildFactDetailArticle({
        factText: localized.factText,
        deepDiveDetail: localized.deepDiveDetail,
        tag: localized.tag,
        sourceHint: localized.sourceHint,
        quiz: localized.quiz,
      }),
    [localized.factText, localized.deepDiveDetail, localized.tag, localized.sourceHint, localized.quiz]
  );
  const topicText = useMemo(
    () => [localized.title, localized.factText, localized.tag, fact.sketchType].filter(Boolean).join(' '),
    [localized.title, localized.factText, localized.tag, fact.sketchType]
  );

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
    setIsFlipped(false);
    setIsFlipping(false);
    setIsDragging(false);
    setIsGuessLocked(false);
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

    setIsFlipped((prev) => {
      const next = !prev;
      if (next) {
        void trackEvent(factSlug, fact.category, 'detail_open', {
          source: resolvedSourceName,
        });
      }
      return next;
    });
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
  const handleName = CATEGORY_HANDLE[fact.category]?.[lang] ?? 'Scrolly';
  const resolvedSourceName =
    localized.sourceName || fact.sourceName || localized.sourceHint;
  const resolvedSourceUrl = localized.sourceUrl || fact.sourceUrl;

  const hasChallenge = Boolean(localized.guessChallenge);
  const shouldMaskSpoiler = hasChallenge && !isGuessLocked && !isFlipped;

  const displayHeadline = useMemo(() => {
    if (!shouldMaskSpoiler || !localized.guessChallenge) {
      return localized.title;
    }
    return maskHeadlineText(localized.title, localized.guessChallenge, localized.teaserTitle);
  }, [shouldMaskSpoiler, localized.guessChallenge, localized.title, localized.teaserTitle]);

  const renderedFactBody = useMemo(() => {
    if (!shouldMaskSpoiler || !localized.guessChallenge) {
      return localized.factText;
    }
    const text = localized.factText;
    const pattern = buildSpoilerPattern(localized.guessChallenge);
    if (pattern) {
      const parts = text.split(pattern);
      if (parts.length > 1) {
        return parts.map((part, idx) => {
          if (idx % 2 === 1) {
            return (
              <span key={`sp-${idx}`} className="inline-flex items-center gap-1 align-baseline">
                <span
                  data-testid="spoiler-mask"
                  className="inline-flex items-center rounded bg-white/15 px-1.5 py-0.2 font-mono text-[11px] font-black tracking-wider text-white"
                >
                  [ ??? ]
                </span>
                <span className="blur-sm select-none opacity-60 transition-all duration-300">
                  {part}
                </span>
              </span>
            );
          }
          return <React.Fragment key={`tx-${idx}`}>{part}</React.Fragment>;
        });
      }
    }

    // Fallback: blur trailing clause while keeping curiosity lead-in visible
    const splitAt = Math.max(24, Math.floor(text.length * 0.55));
    const visibleLead = text.slice(0, splitAt);
    const hiddenTail = text.slice(splitAt);
    return (
      <>
        <span>{visibleLead} </span>
        <span
          data-testid="spoiler-mask"
          className="mr-1 inline-flex items-center rounded bg-white/15 px-1.5 py-0.2 font-mono text-[11px] font-black tracking-wider text-white"
        >
          [ ??? ]
        </span>
        <span className="blur-sm select-none opacity-60 transition-all duration-300">
          {hiddenTail}
        </span>
      </>
    );
  }, [shouldMaskSpoiler, localized.guessChallenge, localized.factText]);

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
      className="reels-slide relative flex h-full w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden select-none bg-[#09090B]"
    >
      {/* Soft blurred side wash from active card color */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-110 blur-3xl saturate-150"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${fact.accentColor}55 0%, transparent 55%), linear-gradient(180deg, #09090B 0%, #050508 100%)`,
        }}
      />

      <div className="relative mx-auto h-full w-full overflow-hidden bg-[#09090B]">
        {/* Full-bleed cinematic canvas */}
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

        {/* Cinematic bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[58%] bg-gradient-to-t from-[#09090B] via-[#09090B]/75 to-transparent" />

        {/* Front content — mandatory safe paddings */}
        <div
          data-testid="fact-card-front"
          className={`relative z-10 flex h-full w-full flex-col justify-end overflow-hidden px-4 pt-[108px] pb-[96px] ${
            isFlipped ? 'invisible pointer-events-none' : ''
          }`}
        >
          <div className="pointer-events-none relative z-10 flex w-full flex-col gap-2 pr-16">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white backdrop-blur-md">
              <img src={catMeta.iconPath} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
              <span>{catMeta.label[lang]}</span>
            </div>

            <h2
              data-testid="fact-headline"
              className="font-display text-[22px] font-bold leading-snug text-white drop-shadow sm:text-2xl whitespace-normal break-words"
            >
              {displayHeadline}
            </h2>

            <p
              data-testid="fact-body"
              className="line-clamp-3 text-[13px] font-semibold leading-snug text-white/95 whitespace-normal break-words"
            >
              {renderedFactBody}
            </p>

            {localized.guessChallenge && (
              <GuessWidget
                factId={fact.id}
                challenge={localized.guessChallenge}
                lang={lang}
                onGuessAnswered={(xpAwarded, accurate, details) => {
                  setIsGuessLocked(true);
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

            <div className="pointer-events-auto mt-1 flex flex-wrap items-center gap-2">
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
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-[11px] font-extrabold text-white backdrop-blur-md"
              >
                <span>{lang === 'tr' ? 'Detayı / Kaynağı Gör' : 'See Details / Source'}</span>
              </button>
              <span className="pointer-events-none text-[10px] font-bold text-white/70">
                {copy.doubleTapLikeHint}
              </span>
            </div>
          </div>
        </div>

        {/* Right Reels action column — flush to stage edge (TikTok-attached) */}
        {!isFlipped && (
          <div
            data-testid="reels-action-column"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute bottom-[104px] right-2 z-20 flex flex-col items-center gap-3 lg:bottom-[120px] lg:right-3"
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
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-300 backdrop-blur-md">
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
                  className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
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
                    className={`pointer-events-auto relative z-[60] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden lg:h-[100dvh] lg:max-w-[min(620px,50vw)] lg:shadow-2xl ${
                      darkMode ? 'bg-[#111115] text-white' : 'bg-[#FFFDF9] text-[#1E1B2E]'
                    }`}
                  >
                    {/* Drag zone: handle + header — starts sheet drag on pointer/touch */}
                    <div
                      data-testid="detail-drag-zone"
                      className="relative z-20 flex shrink-0 touch-none flex-col px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2"
                      onPointerDown={(e) => {
                        // Don't steal clicks from the close button
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
                            darkMode ? 'bg-white/10 text-white' : 'bg-[#1E1B2E]/8 text-[#1E1B2E]'
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
                      className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[104px] touch-pan-y"
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
                      <div className="my-3 flex-1 pr-1">
                        <h3 className="font-display text-xl font-bold leading-snug whitespace-normal break-words">
                          {localized.title}
                        </h3>
                        <p
                          data-testid="fact-detail-article"
                          data-differs-from-teaser={detailArticle.differsFromTeaser ? 'true' : 'false'}
                          className={`mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed break-words ${
                            darkMode ? 'text-white/90' : 'text-[#1E1B2E]/85'
                          }`}
                        >
                          {detailArticle.article}
                        </p>

                        <div
                          data-testid="fact-source-box"
                          className={`mt-4 flex flex-col gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
                            darkMode
                              ? 'border-white/15 bg-white/5'
                              : 'border-[#1E1B2E]/12 bg-white'
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
                        </div>
                      </div>

                      <div className="relative z-50 flex shrink-0 flex-wrap items-center gap-2 pt-2">
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
                            onNextSlide();
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
