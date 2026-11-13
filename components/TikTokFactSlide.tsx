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
  Sparkles,
  Swords,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import GuessWidget from '@/components/GuessWidget';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { CategoryId, FactCard } from '@/types/fact';
import { getFactUrl } from '@/utils/factsData';

interface TikTokFactSlideProps {
  fact: FactCard;
  lang: Language;
  isFavorite: boolean;
  onFlip: (fact: FactCard) => void;
  onDoubleTapLike: (fact: FactCard) => void;
  onDwellRead: (fact: FactCard) => void;
  onNextSlide: () => void;
  onOpenDuel: (fact: FactCard) => void;
  onOpenStoryShare: (fact: FactCard) => void;
  onGuessReward: (xp: number, accurate: boolean) => void;
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

export default function TikTokFactSlide({
  fact,
  lang,
  isFavorite,
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
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);

  const slideRef = useRef<HTMLDivElement>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastBurstTimeRef = useRef<number>(0);
  const hasCountedDwellRef = useRef<boolean>(false);

  const t = translations[lang];
  const localized = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const factUrl = getFactUrl(fact, lang);

  // Deterministic pseudo base likes count + user favorite state
  const baseLikesCount = useMemo(() => {
    let sum = 120;
    for (let i = 0; i < fact.id.length; i += 1) {
      sum += fact.id.charCodeAt(i) * 19;
    }
    return 400 + (sum % 890);
  }, [fact.id]);
  const displayLikes = isFavorite ? baseLikesCount + 1 : baseLikesCount;

  // Dwell-Time 1.5s read detection using IntersectionObserver
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.65) {
          if (!hasCountedDwellRef.current && !dwellTimer) {
            dwellTimer = setTimeout(() => {
              if (!hasCountedDwellRef.current) {
                hasCountedDwellRef.current = true;
                onDwellRead(fact);
              }
            }, 1500);
          }
        } else if (dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: [0.65] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [fact, onDwellRead]);

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

    const burstId = now + Math.floor(Math.random() * 1000);
    setHeartBursts((prev) => [...prev, { id: burstId, x, y }]);
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 900);

    onDoubleTapLike(fact);
  };

  const executeFlip = () => {
    setIsFlipped((prev) => !prev);
    onFlip(fact);
  };

  // 240 ms smart single-tap vs double-tap disambiguation
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const delta = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (delta > 0 && delta <= 240) {
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
    }, 240);
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
    onOpenStoryShare(fact);
  };

  const mesh = CATEGORY_MESH_STYLE[fact.category] ?? CATEGORY_MESH_STYLE.space;
  const handleName = CATEGORY_HANDLE[fact.category]?.[lang] ?? 'Scrolly';

  return (
    <div
      ref={slideRef}
      data-testid="fact-card"
      data-fact-id={fact.id}
      onClick={handleSceneClick}
      onDoubleClick={handleNativeDoubleClick}
      className="reels-slide perspective-1400 relative h-full w-full shrink-0 cursor-pointer overflow-hidden select-none"
    >
      {/* 3D Rotating Full-Bleed Scene Wrapper */}
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 24 }}
        className="preserve-3d relative h-full w-full"
      >
        {/* ================= FRONT FACE (Full-Bleed TikTok Scene) ================= */}
        <div
          data-testid="fact-card-front"
          className={`backface-hidden absolute inset-0 h-full w-full overflow-hidden ${
            isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {/* Full-Bleed Light Mesh Aurora */}
          <div
            className="absolute inset-0 h-full w-full dark:hidden"
            style={{ backgroundImage: mesh.light }}
          />
          {/* Full-Bleed Dark Mesh Aurora */}
          <div
            className="absolute inset-0 hidden h-full w-full dark:block"
            style={{ backgroundImage: mesh.dark }}
          />

          {/* Subtle Animated Ambient Orbs */}
          <motion.div
            animate={{ x: [-14, 14, -14], y: [-10, 12, -10] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundColor: `${fact.accentColor}26` }}
            className="pointer-events-none absolute -left-16 top-20 h-64 w-64 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [14, -14, 14], y: [10, -14, 10] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundColor: `${fact.accentColor}20` }}
            className="pointer-events-none absolute -right-14 bottom-24 h-72 w-72 rounded-full blur-3xl"
          />

          {/* Center SVG Motion Graphic Illustration (upper-middle focal stage) */}
          <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center sm:top-24">
            <div className="origin-top scale-[0.76] sm:scale-90">
              <CategoryMotionArt
                variant="hero"
                category={fact.category}
                accentColor={fact.accentColor}
                iconName={fact.iconName}
                emoji={fact.emoji ?? catMeta.emoji}
              />
            </div>
          </div>

          {/* Subtle translucent readability veil so rich category colors keep flowing under the iOS Liquid Glass dock */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-white/25 via-white/15 to-transparent dark:from-[#0A0814]/70 dark:via-[#0A0814]/40 dark:to-transparent" />

          {/* Bottom-Left TikTok Description Overlay (left-4 right-[72px] bottom-24) */}
          <div className="pointer-events-none absolute bottom-24 left-4 right-[72px] z-20 flex flex-col gap-1.5">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-extrabold text-ink backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-violet-100">
              <img
                src={catMeta.iconPath}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 object-contain"
              />
              <span>
                @scrolly.{handleName.toLowerCase()} • {t.tiktokScientificTag}
              </span>
            </div>

            <h2
              data-testid="fact-headline"
              className="font-display text-xl font-bold leading-tight text-ink drop-shadow-sm dark:text-white sm:text-2xl"
            >
              {localized.title}
            </h2>

            <p
              data-testid="fact-body"
              className="line-clamp-3 text-[13px] font-medium leading-relaxed text-ink/90 dark:text-violet-100/95 sm:text-[14px]"
            >
              {localized.factText}
            </p>

            {localized.guessChallenge && (
              <GuessWidget
                factId={fact.id}
                challenge={localized.guessChallenge}
                lang={lang}
                onGuessAnswered={onGuessReward}
                onRequestFlip={() => executeFlip()}
                onButtonPop={onButtonPop}
              />
            )}

            <p className="text-[11px] font-bold text-ink/55 dark:text-violet-200/65">
              {t.tiktokTapHint}
            </p>
          </div>

          {/* Bottom-Right Vertical TikTok Action Column */}
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-4"
          >
            {/* 1. Heart / Like */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(fact);
              }}
              aria-label={t.favorite}
              data-testid="card-favorite-btn"
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition-all ${
                  isFavorite
                    ? 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                    : 'border-white/70 bg-white/65 text-ink shadow-md dark:border-white/20 dark:bg-black/40 dark:text-white'
                }`}
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
              </span>
              <span className="text-[11px] font-extrabold text-ink/85 dark:text-white/90">
                {displayLikes}
              </span>
            </motion.button>

            {/* 2. Detail / 3D Flip */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                executeFlip();
              }}
              aria-label={t.flipToBack}
              data-testid="flip-card-btn"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/65 text-ink shadow-md backdrop-blur-xl dark:border-white/20 dark:bg-black/40 dark:text-white">
                <RotateCw className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-extrabold text-ink/85 dark:text-white/90">
                {t.tiktokDetailBtn}
              </span>
            </motion.button>

            {/* 3. 1v1 Duel */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDuel(fact);
              }}
              aria-label={t.dockDuel}
              data-testid="card-duel-btn"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/65 text-amber-700 shadow-md backdrop-blur-xl dark:border-white/20 dark:bg-black/40 dark:text-amber-300">
                <Swords className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-extrabold text-ink/85 dark:text-white/90">
                {t.dockDuel}
              </span>
            </motion.button>

            {/* 4. Share */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleShareClick}
              aria-label={t.shareFact}
              data-testid="card-share-btn"
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/65 text-ink shadow-md backdrop-blur-xl transition-colors dark:border-white/20 dark:bg-black/40 dark:text-white">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-extrabold text-ink/85 dark:text-white/90">
                {t.shareFact}
              </span>
            </motion.button>
          </div>
        </div>

        {/* ================= BACK FACE (Full-Bleed Scientific Deep Dive) ================= */}
        <div
          data-testid="fact-card-back"
          className={`backface-hidden rotate-y-180 absolute inset-0 flex h-full w-full flex-col justify-between overflow-hidden px-5 pb-24 pt-28 ${
            isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          {/* Full-Bleed Frosted Back Background */}
          <div
            className="absolute inset-0 h-full w-full dark:hidden"
            style={{ backgroundImage: mesh.light }}
          />
          <div
            className="absolute inset-0 hidden h-full w-full dark:block"
            style={{ backgroundImage: mesh.dark }}
          />
          <div className="pointer-events-none absolute inset-0 bg-white/75 backdrop-blur-2xl dark:bg-[#0D0A19]/80" />

          {/* Back Content */}
          <div className="relative z-10 flex flex-1 flex-col justify-center overflow-y-auto no-scrollbar">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-900 dark:bg-violet-900/70 dark:text-violet-200">
              <img
                src={catMeta.iconPath}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 object-contain"
              />
              <span>{t.whyHowHeader}</span>
            </div>

            <h3 className="mt-3 font-display text-2xl font-bold leading-snug text-ink dark:text-white">
              {localized.title}
            </h3>

            <p className="mt-4 text-[15px] leading-relaxed text-ink/90 dark:text-violet-100/95 sm:text-base">
              {localized.deepDiveDetail}
            </p>

            {/* Verified Source Box */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-white/75 px-4 py-3 text-xs backdrop-blur-md dark:border-white/15 dark:bg-white/10">
              <div className="flex items-center gap-2 font-bold text-ink/80 dark:text-violet-100">
                <BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                <span>
                  {t.sourceLabel}: {localized.sourceHint}
                </span>
              </div>

              <Link
                href={factUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-extrabold text-violet-700 hover:underline dark:text-violet-300"
              >
                <span>{t.readFullPage}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Back Footer Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="relative z-20 mt-4 flex items-center gap-2.5"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={(e) => {
                e.stopPropagation();
                executeFlip();
              }}
              data-testid="flip-back-btn"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/20 bg-white/85 px-4 py-3 text-xs font-extrabold text-ink shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/15 dark:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t.tiktokBackFrontBtn}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleShareClick}
              aria-label={t.shareFact}
              data-testid="back-share-story-btn"
              className="flex items-center justify-center gap-1.5 rounded-full border border-violet-300/80 bg-violet-100/90 px-3.5 py-3 text-xs font-extrabold text-violet-900 shadow-sm backdrop-blur-md dark:border-violet-400/30 dark:bg-violet-900/55 dark:text-violet-100"
            >
              <Share2 className="h-4 w-4" />
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
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-xs font-extrabold text-white shadow-lg dark:bg-violet-600"
            >
              <span>{t.tiktokNextSlideBtn}</span>
              <ArrowDown className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

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
