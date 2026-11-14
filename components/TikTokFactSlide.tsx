'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  BookOpen,
  ExternalLink,
  Heart,
  Languages,
  RotateCcw,
  RotateCw,
  Share2,
  Swords,
  Volume2,
  X,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import GuessWidget from '@/components/GuessWidget';
import LanguageLabOverlay from '@/components/LanguageLabOverlay';
import { FEED_EXPERIENCE_COPY, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/telemetry';
import type { CategoryId, FactCard, GuessChallenge } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { getFactUrl } from '@/utils/factsData';
import { vibrateTap } from '@/utils/haptics';
import { speakVocabularyText } from '@/utils/languageLabData';

interface TikTokFactSlideProps {
  fact: FactCard;
  lang: Language;
  isFavorite: boolean;
  isFirstCard?: boolean;
  isActive?: boolean;
  cookieBannerVisible?: boolean;
  languageLabMode?: boolean;
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

const CATEGORY_MESH_STYLE: Record<
  CategoryId,
  { light: string; dark: string }
> = {
  space: {
    light:
      'linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 48%, #C4B5FD 100%)',
    dark:
      'radial-gradient(circle at 22% 18%, #3B1F6E 0%, #1C1438 48%, #0C0917 100%)',
  },
  nature: {
    light:
      'linear-gradient(180deg, #E6FAF5 0%, #A7F3D0 48%, #6EE7B7 100%)',
    dark:
      'radial-gradient(circle at 78% 20%, #0F4C45 0%, #0E292B 50%, #081216 100%)',
  },
  human_body: {
    light:
      'linear-gradient(180deg, #FFEAE5 0%, #FECDD3 48%, #FDA4AF 100%)',
    dark:
      'radial-gradient(circle at 22% 20%, #5B1E36 0%, #2B1224 50%, #0F0A14 100%)',
  },
  history: {
    light:
      'linear-gradient(180deg, #FEF6D8 0%, #FDE68A 48%, #FCD34D 100%)',
    dark:
      'radial-gradient(circle at 76% 20%, #4E3512 0%, #261B12 52%, #0F0C0B 100%)',
  },
  science: {
    light:
      'linear-gradient(180deg, #E5F6FF 0%, #BAE6FD 48%, #7DD3FC 100%)',
    dark:
      'radial-gradient(circle at 26% 20%, #0F4068 0%, #10243C 50%, #090F1B 100%)',
  },
  records: {
    light:
      'linear-gradient(180deg, #FCE8F3 0%, #FBCFE8 48%, #F472B6 100%)',
    dark:
      'radial-gradient(circle at 74% 20%, #56194E 0%, #281130 50%, #0F0916 100%)',
  },
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

function CategoryAmbientEffects({
  category,
  accentColor,
  isActive,
}: {
  category: CategoryId;
  accentColor: string;
  isActive: boolean;
}) {
  const reduceMotion = useReducedMotion();
  if (!isActive || reduceMotion) return null;

  if (category === 'space') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
        {[
          { left: '14%', top: '20%', delay: 0 },
          { left: '72%', top: '16%', delay: 1.4 },
          { left: '48%', top: '34%', delay: 2.8 },
        ].map((star, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, x: -16, y: -8, scale: 0.6 }}
            animate={{ opacity: [0, 0.9, 0], x: [0, 38, 74], y: [0, 18, 36], scale: [0.6, 1.15, 0.4] }}
            transition={{ duration: 4.5, repeat: Infinity, delay: star.delay, ease: 'easeInOut' }}
            style={{ left: star.left, top: star.top }}
            className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_#fff]"
          />
        ))}
      </div>
    );
  }

  if (category === 'nature') {
    return (
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -10, 0], opacity: [0.16, 0.3, 0.16] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${accentColor}38 0%, transparent 72%)`,
        }}
      />
    );
  }

  if (category === 'human_body') {
    return (
      <motion.div
        aria-hidden="true"
        animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.12, 0.28, 0.12] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ borderColor: `${accentColor}45` }}
        className="pointer-events-none absolute left-1/2 top-[34%] z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
      />
    );
  }

  if (category === 'history') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
        {[18, 46, 78].map((leftPct, idx) => (
          <motion.span
            key={leftPct}
            animate={{ y: [20, -45, 20], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 7 + idx * 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ left: `${leftPct}%`, top: `${26 + idx * 14}%`, backgroundColor: '#F59E0B' }}
            className="absolute h-1.5 w-1.5 rounded-full blur-[0.5px]"
          />
        ))}
      </div>
    );
  }

  if (category === 'records') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
        {[
          { left: '20%', color: '#EC4899', delay: 0 },
          { left: '54%', color: '#F59E0B', delay: 0.9 },
          { left: '80%', color: '#8B5CF6', delay: 1.7 },
        ].map((dot, idx) => (
          <motion.span
            key={idx}
            animate={{ y: [-12, 28, -12], rotate: [0, 180, 360], opacity: [0.2, 0.55, 0.2] }}
            transition={{ duration: 5.5, repeat: Infinity, delay: dot.delay, ease: 'easeInOut' }}
            style={{ left: dot.left, top: `${20 + idx * 11}%`, backgroundColor: dot.color }}
            className="absolute h-2 w-1 rounded-xs"
          />
        ))}
      </div>
    );
  }

  // science subtle floating quantum particles
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {[24, 66].map((leftPct, idx) => (
        <motion.span
          key={leftPct}
          animate={{ x: [-12, 16, -12], y: [8, -16, 8], opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: 6 + idx * 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ left: `${leftPct}%`, top: `${24 + idx * 16}%`, backgroundColor: accentColor }}
          className="absolute h-2 w-2 rounded-full opacity-40"
        />
      ))}
    </div>
  );
}

export default function TikTokFactSlide({
  fact,
  lang,
  isFavorite,
  isFirstCard = false,
  isActive = true,
  cookieBannerVisible = false,
  languageLabMode = false,
  onFlip,
  onDoubleTapLike,
  onDwellRead,
  onNextSlide,
  onOpenDuel,
  onOpenStoryShare,
  onGuessReward,
  onToggleFavorite,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: TikTokFactSlideProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isGuessLocked, setIsGuessLocked] = useState(false);
  const [isLanguageLabOpen, setIsLanguageLabOpen] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);

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

  // Deterministic fallback likes when running completely offline without DB counts
  const baseLikesCount = useMemo(() => {
    let sum = 120;
    for (let i = 0; i < fact.id.length; i += 1) {
      sum += fact.id.charCodeAt(i) * 19;
    }
    return 400 + (sum % 890);
  }, [fact.id]);

  const [dbLikeDelta, setDbLikeDelta] = useState<number>(0);

  useEffect(() => {
    setDbLikeDelta(0);
    setIsFlipped(false);
    setIsFlipping(false);
    setIsDragging(false);
    setIsGuessLocked(false);
    setIsLanguageLabOpen(false);
    hasCountedDwellRef.current = false;
    hasSentDwellEventRef.current = false;
    visibleEnterTimeRef.current = null;
  }, [fact.id, fact.likesCount]);

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
      setIsLanguageLabOpen(false);
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

  const hasDbLikes = typeof fact.likesCount === 'number';
  const displayLikes = hasDbLikes
    ? Math.max(0, (fact.likesCount ?? 0) + dbLikeDelta)
    : isFavorite
      ? baseLikesCount + 1
      : baseLikesCount;

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

    if (!isFavorite) {
      setDbLikeDelta((prev) => prev + 1);
      void trackEvent(factSlug, fact.category, 'like', { trigger: 'double_tap' });
    }
    onDoubleTapLike(fact);
  };

  const executeFlip = () => {
    setIsFlipping(true);
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
    if (isFlipped || isLanguageLabOpen) return;
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

  const mesh = CATEGORY_MESH_STYLE[fact.category] ?? CATEGORY_MESH_STYLE.space;
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
                  className="inline-flex items-center rounded bg-ink/10 px-1.5 py-0.2 font-mono text-[11px] font-black tracking-wider text-violet-700 dark:bg-white/15 dark:text-violet-200"
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
          className="mr-1 inline-flex items-center rounded bg-ink/10 px-1.5 py-0.2 font-mono text-[11px] font-black tracking-wider text-violet-700 dark:bg-white/15 dark:text-violet-200"
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
      className="reels-slide relative flex h-full w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden select-none"
    >
      {/* Full-Bleed Blurred Dominant-Color Ambient Backdrop (Desktop & Tablet flanks, zero empty white borders) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-110 blur-3xl saturate-150 dark:hidden"
        style={{ backgroundImage: mesh.light }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden scale-110 blur-3xl saturate-150 dark:block"
        style={{ backgroundImage: mesh.dark }}
      />

      {/* Centered Responsive 9:16 Stage Wrapper (Full-bleed 100dvh on mobile; 9:16 full-height Reels stage on tablet/desktop) */}
      <div className="relative mx-auto h-full w-full overflow-hidden md:aspect-[9/16] md:h-full md:w-auto md:max-w-[600px] md:rounded-[28px] md:shadow-2xl md:ring-1 md:ring-white/40 dark:md:ring-white/15">
        {/* Stage Interior Light/Dark Gradient Mesh */}
        <div
          className="pointer-events-none absolute inset-0 h-full w-full dark:hidden"
          style={{ backgroundImage: mesh.light }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden h-full w-full dark:block"
          style={{ backgroundImage: mesh.dark }}
        />

        {/* Subtle Animated Ambient Orbs (Paused off-screen via isActive) */}
        <motion.div
          animate={isActive ? { x: [-14, 14, -14], y: [-10, 12, -10] } : undefined}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: `${fact.accentColor}26` }}
          className="pointer-events-none absolute -left-16 top-20 h-64 w-64 lg:h-80 lg:w-80 rounded-full blur-3xl"
        />
        <motion.div
          animate={isActive ? { x: [14, -14, 14], y: [10, -14, 10] } : undefined}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundColor: `${fact.accentColor}20` }}
          className="pointer-events-none absolute -right-14 bottom-24 h-72 w-72 lg:h-80 lg:w-80 rounded-full blur-3xl"
        />

        {/* Category-Specific Micro Ambient Particle Layer */}
        <CategoryAmbientEffects
          category={fact.category}
          accentColor={fact.accentColor}
          isActive={isActive}
        />

        {/* Subtle translucent readability veil */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-white/25 via-white/15 to-transparent dark:from-[#0A0814]/70 dark:via-[#0A0814]/40 dark:to-transparent" />

        {/* ================= FRONT FACE (Full-Bleed Scene) ================= */}
        <div
          data-testid="fact-card-front"
          className={`relative z-20 mx-auto flex h-full w-full max-w-[430px] md:max-w-[600px] lg:max-w-[540px] flex-col justify-between md:justify-center md:[justify-content:safe_center] md:gap-8 overflow-y-auto no-scrollbar px-4 md:px-6 pt-[calc(5.8rem+env(safe-area-inset-top))] lg:pt-[96px] lg:pb-[100px] ${
            cookieBannerVisible
              ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
              : 'pb-[calc(94px+env(safe-area-inset-bottom))]'
          }`}
        >
          {/* Left / Top Visual Area: Topic-Specific Interactive Sketch Diagram */}
          <div className="relative z-20 flex w-full shrink-0 items-center justify-center">
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
            />
          </div>

          {/* Bottom Description + Guess Overlay */}
          <div className="pointer-events-none relative z-20 flex w-full flex-col gap-1.5 pr-[76px] md:pr-[84px]">
            {languageLabMode && (
              <div
                data-testid="language-lab-banner"
                onClick={(e) => {
                  e.stopPropagation();
                  vibrateTap(12);
                  onButtonPop();
                  setIsLanguageLabOpen(true);
                }}
                className="pointer-events-auto mb-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-indigo-300/90 bg-indigo-50/95 px-2.5 py-1.5 text-[11px] font-bold text-indigo-950 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-400/35 dark:bg-indigo-950/80 dark:text-indigo-100"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 font-black text-indigo-700 dark:text-indigo-300">
                    <Languages className="h-3.5 w-3.5 shrink-0" />
                    EN:
                  </span>{' '}
                  <span className="truncate">{fact.en.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    vibrateTap(10);
                    speakVocabularyText(`${fact.en.title}. ${fact.en.factText}`, 'en-US');
                  }}
                  aria-label={copy.listenEn}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink dark:border-white/15 dark:bg-slate-900/95 dark:text-violet-100">
              <img
                src={catMeta.iconPath}
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 object-contain"
              />
              <span>
                @scrolly.{handleName.toLowerCase()} • {t.tiktokScientificTag}
              </span>
            </div>

            <h2
              data-testid="fact-headline"
              className="font-display text-lg font-bold leading-snug text-ink drop-shadow-sm transition-all duration-300 dark:text-white sm:text-xl lg:text-2xl whitespace-normal break-words"
            >
              {displayHeadline}
            </h2>

            <p
              data-testid="fact-body"
              className={`${
                cookieBannerVisible ? 'line-clamp-2' : 'line-clamp-3'
              } lg:line-clamp-none text-[12.5px] font-medium leading-snug text-ink/90 transition-all duration-300 dark:text-violet-100/95 sm:text-[13.5px] lg:text-base lg:leading-relaxed whitespace-normal break-words`}
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
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-2 text-[11px] font-extrabold text-violet-900 shadow-sm transition hover:bg-white dark:border-white/20 dark:bg-slate-900/95 dark:text-violet-100 dark:hover:bg-slate-800"
              >
                <span>{lang === 'tr' ? 'Detayı / Kaynağı Gör ↻' : 'See Details / Source ↻'}</span>
              </button>
              <span className="pointer-events-none text-[10px] font-bold text-ink/80 dark:text-violet-100/85">
                {copy.doubleTapLikeHint}
              </span>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM SHEET DETAIL VIEW ================= */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              key="detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                executeFlip();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 z-30 flex flex-col justify-end bg-slate-950/50 backdrop-blur-[2px]"
            >
              <motion.div
                key="detail"
                data-testid="fact-card-back"
                data-card-view="detail"
                role="dialog"
                aria-modal="true"
                aria-label={copy.detailSheetTitle}
                initial={{ y: '100%', opacity: 0.7 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0.7 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                style={{ willChange: 'transform' }}
                className={`relative flex max-h-[84dvh] w-full flex-col rounded-t-3xl border-t border-slate-200/90 bg-white/98 px-4 pt-3 shadow-2xl sm:px-6 dark:border-white/15 dark:bg-slate-900/98 ${
                  cookieBannerVisible
                    ? 'pb-[calc(146px+env(safe-area-inset-bottom))]'
                    : 'pb-[calc(88px+env(safe-area-inset-bottom))]'
                }`}
              >
                {/* Bottom Sheet Drag Handle */}
                <div className="mx-auto mb-2.5 h-1.5 w-12 shrink-0 rounded-full bg-slate-300/90 dark:bg-white/20" />

                {/* Top Bar: Why / How Badge + Close */}
                <div className="flex shrink-0 items-center justify-between gap-3">
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-900 dark:bg-violet-900/70 dark:text-violet-200">
                    <img
                      src={catMeta.iconPath}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 object-contain"
                    />
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white/95 text-ink/70 shadow-sm hover:bg-white dark:border-white/15 dark:bg-slate-800/95 dark:text-violet-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable Middle: Title, Deep-Dive Science, Source Card & Compact Metric Pills */}
                <div className="no-scrollbar my-3 flex-1 overflow-y-auto pr-1">
                  <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold leading-snug text-ink dark:text-white whitespace-normal break-words">
                    {localized.title}
                  </h3>

                  <p className="mt-3 text-[14.5px] sm:text-[15.5px] leading-relaxed text-ink/90 dark:text-violet-100/95 whitespace-normal break-words">
                    {localized.deepDiveDetail}
                  </p>

                  {/* Verified Academic/Institutional Source Box */}
                  <div
                    data-testid="fact-source-box"
                    className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-amber-200/90 bg-white/95 px-4 py-3 text-xs shadow-sm dark:border-white/15 dark:bg-slate-900/95"
                  >
                    <div className="flex items-start gap-2 font-bold text-ink/85 dark:text-violet-100">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                      <div className="min-w-0 flex-1">
                        <span
                          lang={lang}
                          className="block text-[10px] font-black uppercase tracking-wider text-ink/80 dark:text-violet-200"
                        >
                          {t.sourceLabel}
                        </span>
                        <span
                          data-testid="fact-source-name"
                          className="text-xs font-extrabold whitespace-normal break-words"
                        >
                          {resolvedSourceName}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                      {resolvedSourceUrl ? (
                        <a
                          href={resolvedSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="fact-source-link"
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold text-violet-800 hover:bg-violet-200 dark:bg-violet-500/25 dark:text-violet-200"
                        >
                          <span>{t.verifySourceCta}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-ink/80 dark:text-violet-100/85">
                          {localized.sourceHint}
                        </span>
                      )}

                      <Link
                        href={factUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex min-h-[36px] items-center gap-1 font-extrabold text-ink/70 hover:underline dark:text-violet-200"
                      >
                        <span>{t.readFullPage}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    </div>
                  </div>

                  {/* Compact Metric Pills */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.bgClass} px-3 py-1 text-[11px] font-extrabold ${catMeta.accentText}`}
                    >
                      <span>{catMeta.emoji}</span>
                      <span>{catMeta.label[lang]}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-3 py-1 text-[11px] font-extrabold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      +15 XP
                    </span>
                  </div>
                </div>

                {/* Detail Footer Controls */}
                <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 pt-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      executeFlip();
                    }}
                    data-testid="flip-back-btn"
                    className="flex flex-1 min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2 text-xs sm:text-sm font-extrabold text-ink shadow-sm dark:border-white/20 dark:bg-slate-900/95 dark:text-white whitespace-normal break-words leading-snug"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    <span>{t.tiktokBackFrontBtn}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={handleShareClick}
                    aria-label={t.shareFact}
                    data-testid="back-share-story-btn"
                    className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-violet-300/80 bg-violet-100/95 px-3.5 py-2 text-xs font-extrabold text-violet-900 shadow-sm dark:border-violet-400/30 dark:bg-slate-900/95 dark:text-violet-100"
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
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
                    className="flex flex-1 min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-lg dark:bg-violet-600 whitespace-normal break-words leading-snug"
                  >
                    <span>{t.tiktokNextSlideBtn}</span>
                    <ArrowDown className="h-4 w-4 shrink-0" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Vertical TikTok Action Column Anchored to Stage Boundary (Hidden When Detail View Is Open) */}
      {!isFlipped && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`absolute right-3 md:right-4 z-30 flex flex-col items-center gap-3 transition-[bottom] duration-200 md:bottom-1/2 md:translate-y-1/2 ${
            cookieBannerVisible
              ? 'bottom-[calc(154px+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(94px+env(safe-area-inset-bottom))]'
          }`}
        >
          {/* 1. Heart / Like */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (isFavorite) {
                setDbLikeDelta((prev) => prev - 1);
                void trackEvent(factSlug, fact.category, 'unlike', { trigger: 'heart_btn' });
              } else {
                setDbLikeDelta((prev) => prev + 1);
                void trackEvent(factSlug, fact.category, 'like', { trigger: 'heart_btn' });
              }
              onToggleFavorite(fact);
            }}
            aria-label={t.favorite}
            data-testid="card-favorite-btn"
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                isFavorite
                  ? 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                  : 'border-slate-200/90 bg-white/95 text-ink shadow-md dark:border-white/20 dark:bg-slate-900/95 dark:text-white'
              }`}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </span>
            <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
              {displayLikes}
            </span>
          </motion.button>

          {/* 2. Detail */}
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
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink shadow-md dark:border-white/20 dark:bg-slate-900/95 dark:text-white">
              <RotateCw className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
              {t.tiktokDetailBtn}
            </span>
          </motion.button>

          {/* 3. 1v1 Duel (hidden when competitive tabs are disabled) */}
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-amber-700 shadow-md dark:border-white/20 dark:bg-slate-900/95 dark:text-amber-300">
                <Swords className="h-5 w-5" />
              </span>
              <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
                {t.dockDuel}
              </span>
            </motion.button>
          )}

          {/* 4. TR/EN Language Lab */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              vibrateTap(12);
              onButtonPop();
              setIsLanguageLabOpen(true);
            }}
            aria-label={copy.learnTrEnBtn}
            data-testid="language-lab-trigger"
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                isLanguageLabOpen || languageLabMode
                  ? 'border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/40'
                  : 'border-slate-200/90 bg-white/95 text-indigo-700 shadow-md dark:border-white/20 dark:bg-slate-900/95 dark:text-indigo-300'
              }`}
            >
              <Languages className="h-5 w-5" />
            </span>
            <span className="max-w-[54px] text-center text-[10px] font-extrabold leading-tight text-ink/85 dark:text-white/90">
              {copy.learnTrEnBtn}
            </span>
          </motion.button>

          {/* 5. Share */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleShareClick}
            aria-label={t.shareFact}
            data-testid="card-share-btn"
            className="flex flex-col items-center gap-0.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-ink shadow-md transition-colors dark:border-white/20 dark:bg-slate-900/95 dark:text-white">
              <Share2 className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
              {t.shareFact}
            </span>
          </motion.button>
        </div>
      )}

      {/* Interactive Bilingual Language Lab Overlay */}
      <LanguageLabOverlay
        fact={fact}
        lang={lang}
        open={isLanguageLabOpen}
        onClose={() => setIsLanguageLabOpen(false)}
        onEarnXp={(earned) => onEarnXp?.(earned, 'language_lab')}
        onButtonPop={onButtonPop}
        onSuccessSound={onSuccessSound}
        onWrongSound={onWrongSound}
      />
      </div>

      {/* Double-Tap Heart Burst Animation Overlay at (x, y) */}
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
