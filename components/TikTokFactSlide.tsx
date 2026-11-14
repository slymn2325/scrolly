'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
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
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/telemetry';
import type { CategoryId, FactCard, GuessChallenge } from '@/types/fact';
import { cryptoRandomInt } from '@/utils/cryptoRandom';
import { getFactUrl } from '@/utils/factsData';

interface TikTokFactSlideProps {
  fact: FactCard;
  lang: Language;
  isFavorite: boolean;
  isFirstCard?: boolean;
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

export default function TikTokFactSlide({
  fact,
  lang,
  isFavorite,
  isFirstCard = false,
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
  const [isGuessLocked, setIsGuessLocked] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);

  const slideRef = useRef<HTMLDivElement>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastBurstTimeRef = useRef<number>(0);
  const hasCountedDwellRef = useRef<boolean>(false);
  const visibleEnterTimeRef = useRef<number | null>(null);
  const hasSentDwellEventRef = useRef<boolean>(false);

  const t = translations[lang];
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
    setIsGuessLocked(false);
  }, [fact.id, fact.likesCount]);

  const hasDbLikes = typeof fact.likesCount === 'number';
  const displayLikes = hasDbLikes
    ? Math.max(0, (fact.likesCount ?? 0) + dbLikeDelta)
    : isFavorite
      ? baseLikesCount + 1
      : baseLikesCount;

  // Dwell-Time 1.5s read counter + >3s telemetry duration event on slide leave/unmount
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

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

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.65) {
          if (visibleEnterTimeRef.current === null) {
            visibleEnterTimeRef.current = Date.now();
          }
          if (!hasCountedDwellRef.current && !dwellTimer) {
            dwellTimer = setTimeout(() => {
              if (!hasCountedDwellRef.current) {
                hasCountedDwellRef.current = true;
                onDwellRead(fact);
              }
            }, 1500);
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer);
            dwellTimer = null;
          }
          flushDwellDuration();
        }
      },
      { threshold: [0.65] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (dwellTimer) clearTimeout(dwellTimer);
      flushDwellDuration();
    };
  }, [fact, factSlug, onDwellRead]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
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
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 900);

    if (!isFavorite) {
      setDbLikeDelta((prev) => prev + 1);
      void trackEvent(factSlug, fact.category, 'like', { trigger: 'double_tap' });
    }
    onDoubleTapLike(fact);
  };

  const executeFlip = () => {
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

  // 250 ms smart single-tap vs double-tap disambiguation
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
      onClick={handleSceneClick}
      onDoubleClick={handleNativeDoubleClick}
      className="reels-slide relative h-full w-full shrink-0 cursor-pointer overflow-hidden select-none"
    >
      {/* Full-Bleed Light Mesh Aurora */}
      <div
        className="pointer-events-none absolute inset-0 h-full w-full dark:hidden"
        style={{ backgroundImage: mesh.light }}
      />
      {/* Full-Bleed Dark Mesh Aurora */}
      <div
        className="pointer-events-none absolute inset-0 hidden h-full w-full dark:block"
        style={{ backgroundImage: mesh.dark }}
      />

      {/* Subtle Animated Ambient Orbs */}
      <motion.div
        animate={{ x: [-14, 14, -14], y: [-10, 12, -10] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        style={{ backgroundColor: `${fact.accentColor}26` }}
        className="pointer-events-none absolute -left-16 top-20 h-64 w-64 lg:h-96 lg:w-96 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ x: [14, -14, 14], y: [10, -14, 10] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        style={{ backgroundColor: `${fact.accentColor}20` }}
        className="pointer-events-none absolute -right-14 bottom-24 h-72 w-72 lg:h-[26rem] lg:w-[26rem] rounded-full blur-3xl"
      />

      {/* Subtle translucent readability veil */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-white/25 via-white/15 to-transparent dark:from-[#0A0814]/70 dark:via-[#0A0814]/40 dark:to-transparent" />

      {/* 2D Animated Face Switcher (Zero 3D Mirror Text Bleed-Through on iOS Safari PWA) */}
      <AnimatePresence mode="wait" initial={false}>
        {!isFlipped ? (
          /* ================= FRONT FACE (Full-Bleed Scene) ================= */
          <motion.div
            key="front"
            data-testid="fact-card-front"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`relative z-20 mx-auto flex h-full w-full max-w-[430px] flex-col justify-between overflow-y-auto no-scrollbar px-4 pt-[calc(5.8rem+env(safe-area-inset-top))] lg:grid lg:max-w-5xl lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8 lg:pt-[110px] lg:pb-[110px] ${
              cookieBannerVisible
                ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
                : 'pb-[calc(94px+env(safe-area-inset-bottom))]'
            }`}
          >
            {/* Left / Top Visual Area: Topic-Specific Interactive Sketch Diagram */}
            <div className="relative z-20 flex w-full shrink-0 items-center justify-center lg:col-span-6">
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
                onButtonPop={onButtonPop}
              />
            </div>

            {/* Right / Bottom TikTok Description + Guess Overlay */}
            <div className="pointer-events-none relative z-20 flex w-full flex-col gap-1.5 pr-[76px] lg:col-span-6 lg:pr-[84px]">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-violet-100">
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-[11px] font-extrabold text-violet-900 shadow-sm backdrop-blur-md transition hover:bg-white dark:border-white/20 dark:bg-white/15 dark:text-violet-100 dark:hover:bg-white/25"
                >
                  <span>{lang === 'tr' ? 'Detayı / Kaynağı Gör ↻' : 'See Details / Source ↻'}</span>
                </button>
                <span className="pointer-events-none text-[10px] font-bold text-ink/60 dark:text-violet-200/70">
                  {t.tiktokTapHint}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= DETAIL VIEW (Clean 2D Transition Without Rail Overlap) ================= */
          <motion.div
            key="detail"
            data-testid="fact-card-back"
            data-card-view="detail"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 14 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-20 flex h-full w-full flex-col bg-white/75 backdrop-blur-2xl dark:bg-[#0D0A19]/82"
          >
            <div
              className={`mx-auto flex h-full w-full max-w-[430px] md:max-w-2xl flex-col justify-between overflow-hidden px-4 sm:px-6 pt-[calc(5.8rem+env(safe-area-inset-top))] md:pt-[118px] ${
                cookieBannerVisible
                  ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
                  : 'pb-[calc(96px+env(safe-area-inset-bottom))]'
              }`}
            >
              {/* Top Bar: Why / How Badge + Close */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex shrink-0 items-center justify-between gap-3"
              >
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white/85 text-ink/70 shadow-sm hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-violet-200"
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
                  className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-amber-200/90 bg-white/90 px-4 py-3 text-xs shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10"
                >
                  <div className="flex items-start gap-2 font-bold text-ink/85 dark:text-violet-100">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
                    <div className="min-w-0 flex-1">
                      <span
                        lang={lang}
                        className="block text-[10px] font-black uppercase tracking-wider text-ink/55 dark:text-violet-300/80"
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
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-extrabold text-violet-800 hover:bg-violet-200 dark:bg-violet-500/25 dark:text-violet-200"
                      >
                        <span>{t.verifySourceCta}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[11px] font-semibold text-ink/55 dark:text-violet-200/70">
                        {localized.sourceHint}
                      </span>
                    )}

                    <Link
                      href={factUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 font-extrabold text-ink/70 hover:underline dark:text-violet-200"
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

              {/* Detail Footer Controls Above Floating Dock */}
              <div
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 pt-2"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    executeFlip();
                  }}
                  data-testid="flip-back-btn"
                  className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-ink/20 bg-white/90 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-ink shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/15 dark:text-white whitespace-normal break-words leading-snug"
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
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-violet-300/80 bg-violet-100/90 px-3.5 py-2.5 text-xs font-extrabold text-violet-900 shadow-sm backdrop-blur-md dark:border-violet-400/30 dark:bg-violet-900/55 dark:text-violet-100"
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
                  className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg dark:bg-violet-600 whitespace-normal break-words leading-snug"
                >
                  <span>{t.tiktokNextSlideBtn}</span>
                  <ArrowDown className="h-4 w-4 shrink-0" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical TikTok Action Column (Hidden When Detail View Is Open) */}
      {!isFlipped && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`absolute right-3 lg:right-8 z-30 flex flex-col items-center gap-3 transition-[bottom] duration-200 lg:bottom-1/2 lg:translate-y-1/2 ${
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
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition-all ${
                isFavorite
                  ? 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                  : 'border-white/70 bg-white/65 text-ink shadow-md dark:border-white/20 dark:bg-black/40 dark:text-white'
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
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/65 text-ink shadow-md backdrop-blur-xl dark:border-white/20 dark:bg-black/40 dark:text-white">
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/65 text-amber-700 shadow-md backdrop-blur-xl dark:border-white/20 dark:bg-black/40 dark:text-amber-300">
                <Swords className="h-5 w-5" />
              </span>
              <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
                {t.dockDuel}
              </span>
            </motion.button>
          )}

          {/* 4. Share */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleShareClick}
            aria-label={t.shareFact}
            data-testid="card-share-btn"
            className="flex flex-col items-center gap-0.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/65 text-ink shadow-md backdrop-blur-xl transition-colors dark:border-white/20 dark:bg-black/40 dark:text-white">
              <Share2 className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] font-extrabold text-ink/85 dark:text-white/90">
              {t.shareFact}
            </span>
          </motion.button>
        </div>
      )}

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
