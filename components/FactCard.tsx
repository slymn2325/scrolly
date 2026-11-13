'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronUp,
  ExternalLink,
  Gift,
  Heart,
  Microscope,
  RotateCcw,
  RotateCw,
  Share2,
  Sparkles,
  Swords,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { type FactCard as FactCardType, getFactUrl } from '@/utils/factsData';
import { vibrateThreshold } from '@/utils/haptics';

interface HeartBurstPoint {
  id: number;
  x: number;
  y: number;
}

interface FactCardProps {
  fact: FactCardType;
  previewCards?: FactCardType[];
  lang: Language;
  isFavorite: boolean;
  canRewind: boolean;
  rewindsRemaining: number;
  unlimitedRewindsUnlocked: boolean;
  cardPositionLabel?: string;
  onFlip: (isFlippedToBack: boolean) => void;
  onDoubleTapLike: () => void;
  onNext: () => void;
  onRewind: () => void;
  onOpenRewardedModal: () => void;
  onOpenDeepDive: () => void;
  onOpenDuel: () => void;
  onToggleFavorite: () => void;
  onButtonPop: () => void;
}

const SWIPE_THRESHOLD = 95;
const VERTICAL_NEXT_THRESHOLD = -85;
const VERTICAL_REWIND_THRESHOLD = 95;

export default function FactCard({
  fact,
  previewCards = [],
  lang,
  isFavorite,
  canRewind,
  rewindsRemaining,
  unlimitedRewindsUnlocked,
  cardPositionLabel,
  onFlip,
  onDoubleTapLike,
  onNext,
  onRewind,
  onOpenRewardedModal,
  onOpenDeepDive,
  onOpenDuel,
  onToggleFavorite,
  onButtonPop,
}: FactCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [heartBursts, setHeartBursts] = useState<HeartBurstPoint[]>([]);

  const isDraggingRef = useRef(false);
  const thresholdHitRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardSurfaceRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const t = translations[lang];
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const factUrl = getFactUrl(fact, lang);

  // GPU-accelerated Reels / Tinder motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], shouldReduceMotion ? [0, 0, 0] : [-11, 0, 11]);
  const opacity = useTransform(x, [-260, -140, 0, 140, 260], [0.45, 0.94, 1, 0.94, 0.45]);
  const leftStampOpacity = useTransform(x, [-130, -45, 0], [1, 0.3, 0]);
  const rightStampOpacity = useTransform(x, [0, 45, 130], [0, 0.3, 1]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  const triggerFlipImmediate = () => {
    setIsFlipped((prev) => {
      const next = !prev;
      onFlip(next);
      return next;
    });
  };

  const spawnHeartBurst = (clientX: number, clientY: number) => {
    const rect = cardSurfaceRef.current?.getBoundingClientRect();
    const relX = rect ? clientX - rect.left : 180;
    const relY = rect ? clientY - rect.top : 220;
    const burstId = Date.now() + Math.random();

    setHeartBursts((prev) => [...prev.slice(-4), { id: burstId, x: relX, y: relY }]);
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 850);
  };

  const handleCardSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;

    const now = Date.now();
    const delta = now - lastTapTimeRef.current;

    if (delta > 0 && delta < 280) {
      // Double-tap / double-click detected -> spawn heart burst at touch/click coords
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      spawnHeartBurst(e.clientX, e.clientY);
      onDoubleTapLike();
    } else {
      lastTapTimeRef.current = now;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        triggerFlipImmediate();
      }, 240);
    }
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
    thresholdHitRef.current = false;
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const pastThreshold =
      Math.abs(info.offset.x) >= SWIPE_THRESHOLD || info.offset.y <= VERTICAL_NEXT_THRESHOLD;
    if (!thresholdHitRef.current && pastThreshold) {
      thresholdHitRef.current = true;
      vibrateThreshold(12);
    } else if (thresholdHitRef.current && !pastThreshold) {
      thresholdHitRef.current = false;
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);

    if (info.offset.y <= VERTICAL_NEXT_THRESHOLD || info.velocity.y < -520) {
      onNext();
      return;
    }

    if (info.offset.y >= VERTICAL_REWIND_THRESHOLD && canRewind) {
      onRewind();
      return;
    }

    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -480) {
      onNext();
    } else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 480) {
      if (!isFavorite) {
        onToggleFavorite();
      }
      onNext();
    }
  };

  const handleShareFact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onButtonPop();
    const shareFullUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${factUrl}` : factUrl;
    const shareText = `${fact.emoji ?? '✨'} ${content.title}\n\n${content.factText}\n\n${shareFullUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.factText,
          url: shareFullUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch {
        // Ignore clipboard denial
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Stacked Reels / Tinder Deck Container */}
      <div className="relative pb-6">
        {previewCards[1] && (
          <div
            aria-hidden="true"
            data-fact-surface="true"
            style={{
              backgroundColor: getCategoryMeta(previewCards[1].category).cardBg,
            }}
            className={`pointer-events-none absolute inset-x-4 top-0 h-[465px] translate-y-6 scale-[0.90] rounded-3xl border-2 ${
              getCategoryMeta(previewCards[1].category).borderClass
            } opacity-65 shadow-sm sm:h-[485px]`}
          />
        )}

        {previewCards[0] && (
          <div
            aria-hidden="true"
            data-fact-surface="true"
            style={{
              backgroundColor: getCategoryMeta(previewCards[0].category).cardBg,
            }}
            className={`pointer-events-none absolute inset-x-2 top-0 h-[465px] translate-y-3 scale-[0.95] rounded-3xl border-2 ${
              getCategoryMeta(previewCards[0].category).borderClass
            } opacity-85 shadow-cozy sm:h-[485px]`}
          />
        )}

        {/* Active Draggable Card */}
        <motion.div
          ref={cardSurfaceRef}
          style={{ x, y, rotate, opacity }}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.42}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -70 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="perspective-1000 relative z-10 w-full select-none will-change-transform"
        >
          {/* Swipe Stamps */}
          <motion.div
            style={{ opacity: rightStampOpacity }}
            className="pointer-events-none absolute left-6 top-16 z-20 -rotate-12 rounded-xl border-2 border-emerald-500 bg-emerald-50/95 px-3 py-1 text-xs font-black tracking-widest text-emerald-700 shadow-sm"
          >
            ♥ {t.swipeFavStamp}
          </motion.div>
          <motion.div
            style={{ opacity: leftStampOpacity }}
            className="pointer-events-none absolute right-6 top-16 z-20 rotate-12 rounded-xl border-2 border-violet-500 bg-violet-50/95 px-3 py-1 text-xs font-black tracking-widest text-violet-700 shadow-sm"
          >
            {t.swipeNextStamp} →
          </motion.div>

          {/* Double-Tap Heart Burst Particles at Exact Touch Coordinates */}
          <AnimatePresence>
            {heartBursts.map((burst) => (
              <motion.div
                key={burst.id}
                data-testid="heart-burst"
                style={{ left: burst.x, top: burst.y }}
                initial={{ opacity: 0, scale: 0.2, x: '-50%', y: '-50%' }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.3, 1.45, 1.2, 1.7],
                  y: ['-50%', '-85%', '-115%'],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30"
              >
                <div className="relative flex items-center justify-center">
                  <Heart className="h-16 w-16 fill-rose-500 text-rose-500 drop-shadow-lg" />
                  {[0, 60, 120, 180, 240, 300].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    const tx = Math.cos(rad) * 42;
                    const ty = Math.sin(rad) * 42;
                    return (
                      <motion.span
                        key={angle}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute h-2.5 w-2.5 rounded-full bg-rose-400"
                      />
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 3D Flip Container */}
          <motion.div
            onClick={handleCardSurfaceClick}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 260, damping: 22 }
            }
            data-testid="fact-card"
            data-fact-id={fact.id}
            className="preserve-3d relative h-[465px] w-full cursor-pointer sm:h-[485px]"
          >
            {/* FRONT FACE */}
            <div
              data-fact-surface="true"
              style={{
                backgroundColor: catMeta.cardBg,
                pointerEvents: isFlipped ? 'none' : 'auto',
              }}
              data-testid="fact-card-front"
              className={`backface-hidden absolute inset-0 flex flex-col justify-between rounded-3xl border-2 ${catMeta.borderClass} p-5 shadow-cozy-lg sm:p-7`}
            >
              {/* Card Top Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.pillBg} px-3 py-1 text-xs font-extrabold ${catMeta.accentText}`}
                  >
                    <span>{catMeta.emoji}</span>
                    <span>{catMeta.label[lang]}</span>
                  </span>
                  {content.tag && (
                    <span className="hidden rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink/55 dark:bg-white/10 dark:text-violet-200 sm:inline-block">
                      {content.tag}
                    </span>
                  )}
                </div>

                {cardPositionLabel && (
                  <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-ink/60 dark:bg-white/10 dark:text-violet-200">
                    {cardPositionLabel}
                  </span>
                )}
              </div>

              {/* Embedded Live Category Motion Graphic */}
              <div className="mt-3">
                <CategoryMotionArt
                  category={fact.category}
                  accentColor={fact.accentColor}
                  iconName={fact.iconName}
                  emoji={fact.emoji}
                />
              </div>

              {/* Center Text + Reels-Style Right Floating Action Rail */}
              <div className="my-auto flex items-center justify-between gap-3 py-2">
                <div className="flex-1 space-y-2.5 pr-1">
                  <h2 className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                    {content.title}
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-ink/80 sm:text-base">
                    {content.factText}
                  </p>
                </div>

                {/* Reels-Style Vertical Quick Action Rail */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 flex-col items-center gap-2.5"
                >
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleFavorite}
                    aria-label={isFavorite ? t.favorited : t.favorite}
                    data-testid="card-favorite-btn"
                    className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors ${
                      isFavorite
                        ? 'border-rose-300 bg-rose-500 text-white'
                        : 'border-white bg-white/95 text-ink/65 hover:text-rose-500 dark:border-white/15 dark:bg-white/10 dark:text-violet-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={triggerFlipImmediate}
                    aria-label={t.flipToBack}
                    data-testid="reels-flip-btn"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/95 text-violet-700 shadow-sm hover:bg-violet-50 dark:border-white/15 dark:bg-white/10 dark:text-violet-200"
                  >
                    <RotateCw className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenDuel}
                    aria-label={t.duelBtn}
                    title={t.duelBtn}
                    data-testid="card-duel-btn"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/95 text-amber-600 shadow-sm hover:bg-amber-50 dark:border-white/15 dark:bg-white/10 dark:text-amber-300"
                  >
                    <Swords className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={onOpenDeepDive}
                    aria-label={t.deepDiveBtn}
                    title={t.deepDiveBtn}
                    data-testid="card-deep-dive-btn"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/95 text-teal-700 shadow-sm hover:bg-teal-50 dark:border-white/15 dark:bg-white/10 dark:text-teal-300"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* Card Bottom Prompt */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-ink shadow-sm dark:bg-white/10 dark:text-violet-100">
                  <RotateCw className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
                  {t.flipToBack}
                </span>

                <Link
                  href={factUrl}
                  onClick={(e) => {
                    e.stopPropagation();
                    onButtonPop();
                  }}
                  data-testid="card-seo-link"
                  className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-ink/70 transition-colors hover:bg-white hover:text-ink dark:bg-white/10 dark:text-violet-200"
                >
                  <span>{t.readFullPage}</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* BACK FACE (Neden / Nasıl? Scientific Explanation) */}
            <div
              data-fact-surface="true"
              style={{ pointerEvents: isFlipped ? 'auto' : 'none' }}
              data-testid="fact-card-back"
              className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl border-2 ${catMeta.borderClass} bg-white p-6 shadow-cozy-lg sm:p-8`}
            >
              {/* Back Top Bar */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.bgClass} px-3.5 py-1 text-xs font-extrabold ${catMeta.accentText}`}
                >
                  <Microscope className="h-3.5 w-3.5" />
                  {t.whyHowHeader}
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={handleShareFact}
                    aria-label={t.shareFact}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-ink/75 hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-violet-100"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {t.copiedLink}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>{t.shareFact}</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={onToggleFavorite}
                    aria-label={isFavorite ? t.favorited : t.favorite}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                      isFavorite
                        ? 'border-rose-300 bg-rose-500 text-white'
                        : 'border-slate-200 bg-slate-50 text-ink/50 hover:text-rose-500 dark:border-white/15 dark:bg-white/10 dark:text-violet-100'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </motion.button>
                </div>
              </div>

              {/* Back Explanation Body */}
              <div className="my-auto flex flex-col gap-3 overflow-y-auto py-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{fact.emoji ?? '✨'}</span>
                  <h3 className="font-display text-lg font-bold leading-snug text-ink sm:text-xl">
                    {content.title}
                  </h3>
                </div>

                <div
                  className={`rounded-2xl ${catMeta.bgClass}/60 p-4 text-sm leading-relaxed text-ink/85 dark:bg-white/10 dark:text-violet-100 sm:text-base`}
                >
                  {content.deepDiveDetail}
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 dark:text-violet-200/80">
                  <BookOpen className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    <strong className="text-ink/80 dark:text-white">{t.sourceLabel}:</strong>{' '}
                    {content.sourceHint}
                  </span>
                </div>
              </div>

              {/* Back Bottom Controls */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-white/10"
              >
                <button
                  type="button"
                  onClick={triggerFlipImmediate}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/55 hover:text-ink dark:text-violet-200"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {t.flipToFront}
                </button>

                <Link
                  href={factUrl}
                  onClick={onButtonPop}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-200"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{t.readFullPage}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Tactile Deck Action Controls */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            disabled={!canRewind}
            onClick={onRewind}
            data-testid="rewind-card-btn"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3.5 py-2.5 text-xs font-bold text-amber-900 shadow-pill transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-700/60 dark:bg-[#1A162B] dark:text-amber-200 sm:text-sm"
          >
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>{t.rewindBtn}</span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              {unlimitedRewindsUnlocked ? '∞' : rewindsRemaining}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={triggerFlipImmediate}
            data-testid="flip-card-btn"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-pastel-lavender px-3.5 py-2.5 text-xs font-bold text-violet-900 shadow-pill hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-950/70 dark:text-violet-200 sm:text-sm"
          >
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isFlipped ? t.flipToFront : t.flipToBack}
            </span>
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          {!unlimitedRewindsUnlocked && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenRewardedModal}
              title={t.rewindUnlockBtn}
              data-testid="rewarded-unlock-pill"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-pastel-coral text-rose-700 shadow-pill hover:bg-rose-100 dark:border-rose-700/50 dark:bg-rose-950/60 dark:text-rose-200"
            >
              <Gift className="h-4 w-4" />
            </motion.button>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onNext}
            data-testid="next-card-btn"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white shadow-cozy hover:bg-ink/90 dark:bg-violet-600 dark:hover:bg-violet-500 sm:px-6 sm:text-sm"
          >
            <span>{t.nextCard}</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] font-medium text-ink/45 dark:text-violet-200/55">
        {t.swipeHint}
      </p>
    </div>
  );
}
