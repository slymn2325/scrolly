'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Brain, Sparkles, Zap } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';

interface QuizCtaSlideProps {
  lang: Language;
  recentReadCount: number;
  cookieBannerVisible?: boolean;
  onOpenQuizHub: () => void;
  onSkipNext: () => void;
}

export default function QuizCtaSlide({
  lang,
  recentReadCount,
  cookieBannerVisible = false,
  onOpenQuizHub,
  onSkipNext,
}: QuizCtaSlideProps) {
  const t = translations[lang];

  return (
    <div
      data-testid="quiz-cta-slide"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`reels-slide relative flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-100 via-[#F8FAFC] to-emerald-50 px-5 pt-[calc(6.25rem+env(safe-area-inset-top))] select-none dark:from-[#16102B] dark:via-[#0E0B1D] dark:to-[#102224] ${
        cookieBannerVisible
          ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
          : 'pb-[calc(94px+env(safe-area-inset-bottom))]'
      }`}
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/20" />
      <div className="pointer-events-none absolute -right-14 bottom-28 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/15" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] md:max-w-xl flex-col justify-between">
        {/* Top Checkpoint Badge + Recent Cards Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="quiz-cta-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/90 bg-violet-100/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-violet-900 shadow-sm dark:border-violet-500/40 dark:bg-violet-950/75 dark:text-violet-200"
          >
            <Brain className="h-3.5 w-3.5 shrink-0" />
            <span>{t.quizCtaBadge}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-3 py-1 text-xs font-extrabold text-emerald-900 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200">
            <img
              src={UI_ICON_PATHS.xpSparkles}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 object-contain"
            />
            <span>+150 Bonus XP</span>
          </span>
        </div>

        {/* Center Invitation Card */}
        <div className="my-auto rounded-3xl border border-violet-200/80 bg-white/85 p-5 sm:p-7 shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-[#19142E]/90">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 p-2.5 text-white shadow-md">
              <img
                src={DOCK_ICON_MAP.quiz}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain"
              />
            </div>

            {recentReadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700 dark:bg-white/10 dark:text-violet-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {lang === 'tr'
                    ? `${Math.min(5, recentReadCount)} yeni bilgi hazır`
                    : `${Math.min(5, recentReadCount)} recent facts ready`}
                </span>
              </span>
            )}
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold leading-snug text-ink dark:text-white whitespace-normal break-words">
            {t.quizCtaTitle}
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-ink/75 dark:text-violet-100/85 whitespace-normal break-words">
            {t.quizCtaSubtitle}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onOpenQuizHub}
              data-testid="quiz-cta-slide-btn"
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-95 whitespace-normal break-words leading-snug"
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span>{t.quizCtaPrimaryBtn}</span>
            </motion.button>
          </div>
        </div>

        {/* Non-blocking Swipe Continue Hint */}
        <button
          type="button"
          onClick={onSkipNext}
          data-testid="quiz-cta-continue-btn"
          className="mx-auto inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-[11px] font-extrabold text-ink/75 shadow-xs backdrop-blur-md transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-violet-200 dark:hover:bg-white/15 whitespace-normal break-words text-center"
        >
          <span>{t.quizCtaContinueHint}</span>
          <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}
