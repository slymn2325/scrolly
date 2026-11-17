'use client';

import QuizSectionSwitch from '@/components/QuizSectionSwitch';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  Flame,
  Globe,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { CATEGORIES, type Language, translations, VOCABULARY_META } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS, UI_ICON_PATHS } from '@/utils/icons8Assets';
import { useEscapeClose } from '@/utils/useEscapeClose';

export type QuizModeChoice = 'daily' | 'weekly' | 'memory' | 'vocabulary';

interface QuizHubModalProps {
  open: boolean;
  lang: Language;
  dailyCompleted: boolean;
  dailyBestScore: number;
  recentCount: number;
  presentation?: 'modal' | 'page';
  onSelectMode: (mode: QuizModeChoice) => void;
  onClose: () => void;
  onButtonPop: () => void;
  onOpenScrolla?: () => void;
}

export default function QuizHubModal({
  open,
  lang,
  dailyCompleted,
  dailyBestScore,
  recentCount,
  presentation = 'modal',
  onSelectMode,
  onClose,
  onButtonPop,
  onOpenScrolla,
}: QuizHubModalProps) {
  const t = translations[lang];
  const isPage = presentation === 'page';
  const topicDomains = [...CATEGORIES.filter((c) => c.id !== 'all'), VOCABULARY_META];
  const clampedRecent = Math.min(5, Math.max(0, recentCount));

  useEscapeClose(open && !isPage, onClose);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadImg = new window.Image();
    preloadImg.decoding = 'sync';
    preloadImg.src = STATE_ILLUSTRATION_PATHS.quizCelebration;
  }, []);

  if (!open) return null;

  return (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={t.quizHubTitle}
          data-testid="quiz-hub-modal"
          data-presentation={presentation}
          className={
            isPage
              ? 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] text-slate-900 dark:bg-[#0B0B11] dark:text-slate-100'
              : 'absolute inset-0 z-20 flex h-full w-full items-center justify-center bg-[#0B0B11]/85 p-3 backdrop-blur-sm'
          }
        >
          <motion.div
            initial={isPage ? { opacity: 1, y: 0 } : { opacity: 0.94, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className={
              isPage
                ? 'relative h-full w-full overflow-y-auto no-scrollbar px-4 pb-[calc(env(safe-area-inset-bottom,16px)+100px)] pt-[calc(env(safe-area-inset-top,20px)+16px)] lg:pb-6 lg:pt-6'
                : 'relative mb-[92px] max-h-[84dvh] w-full max-w-[430px] md:max-w-2xl overflow-y-auto no-scrollbar rounded-3xl border border-white/70 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#0B0B11] sm:p-6'
            }
          >
            {!isPage && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  onButtonPop();
                  onClose();
                }}
                aria-label="Close"
                data-testid="quiz-hub-close-btn"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink/75 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            <QuizSectionSwitch section="quiz" lang={lang} />
            {/* Header Hero */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-pastel-lavender/75 via-white to-amber-50/75 p-3.5 dark:border-violet-600/40 dark:from-violet-950/70 dark:via-[#1D1635] dark:to-amber-950/35">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-1.5 text-white shadow-md">
                  <img
                    src={UI_ICON_PATHS.quizCenter}
                    alt=""
                    aria-hidden="true"
                    width={36}
                    height={36}
                    loading="eager"
                    decoding="sync"
                    className="h-9 w-9 object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="font-display text-xl font-bold text-ink dark:text-white whitespace-normal break-words">
                      {t.quizHubTitle}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      <Flame className="h-3 w-3 fill-current" />
                      {lang === 'tr' ? 'Kombo 2.0x' : 'Combo 2.0x'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-ink/75 dark:text-violet-100/85 whitespace-normal break-words leading-snug">
                    {t.quizHubSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* 8-Domain Topic Coverage Strip (includes Statistics & Language Learning) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 pb-1">
              {topicDomains.map((cat) => (
                <span
                  key={cat.id}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${cat.borderClass} ${cat.bgClass} px-2.5 py-1 text-[10px] font-extrabold ${cat.accentText} dark:border-white/15 dark:bg-white/10 dark:text-violet-100`}
                >
                  <img
                    src={cat.iconPath}
                    alt=""
                    aria-hidden="true"
                    width={14}
                    height={14}
                    loading="eager"
                    decoding="sync"
                    className="h-3.5 w-3.5 shrink-0 object-contain"
                  />
                  <span>{cat.label[lang]}</span>
                </span>
              ))}
            </div>

            <div
              data-testid="quiz-hub-progress-strip"
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 dark:border-violet-500/30 dark:bg-violet-950/40"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold text-ink dark:text-white">
                <img
                  src={UI_ICON_PATHS.streakFire}
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
                <span>
                  {lang === 'tr' ? 'Seri & hazırlık' : 'Streak & ready'} · {clampedRecent}/5
                </span>
              </div>
              <span className="rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-black text-violet-800 dark:text-violet-200">
                {dailyCompleted
                  ? lang === 'tr'
                    ? `Günlük ✓ ${dailyBestScore} XP`
                    : `Daily ✓ ${dailyBestScore} XP`
                  : lang === 'tr'
                    ? 'Günlük açık'
                    : 'Daily open'}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {/* 1. Daily Sprint (5 Q / 60s) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('daily');
                }}
                data-testid="start-daily-sprint-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-indigo-50 p-3.5 text-left shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] dark:border-violet-500/50 dark:from-violet-950/50 dark:to-indigo-950/40"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/25 text-amber-700 dark:text-amber-300">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-base font-bold text-ink dark:text-white whitespace-normal break-words">
                        {t.dailySprintTitle}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-200">
                        <Sparkles className="h-2.5 w-2.5" />
                        {lang === 'tr' ? 'Hız Bonusu' : 'Speed Bonus'}
                      </span>
                      {dailyCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {dailyBestScore > 0 ? `${dailyBestScore} XP` : t.dailySprintDoneBadge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75 whitespace-normal break-words leading-snug">
                      {t.dailySprintDesc}
                    </p>
                  </div>
                </div>
                <Timer className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
              </motion.button>

              {/* 2. Weekly Marathon (10 Q / 90s) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('weekly');
                }}
                data-testid="start-weekly-marathon-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-pastel-lavender/60 to-sky-50 p-3.5 text-left shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] dark:border-violet-600/60 dark:from-violet-950/60 dark:to-indigo-950/50"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-700 dark:text-violet-300">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-base font-bold text-ink dark:text-white whitespace-normal break-words">
                        {t.weeklyMarathonTitle}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 dark:text-violet-300">
                        <Flame className="h-3 w-3" />
                        2x XP
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75 whitespace-normal break-words leading-snug">
                      {t.weeklyMarathonDesc}
                    </p>
                  </div>
                </div>
                <Zap className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
              </motion.button>

              {/* 3. Classic Memory Quiz (3 Q from last 5 cards) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('memory');
                }}
                data-testid="start-memory-quiz-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-pastel-mint/55 to-white p-3.5 text-left shadow-sm transition hover:brightness-[0.98] active:scale-[0.99] dark:border-teal-700/60 dark:from-teal-950/50 dark:to-[#1F1A36]"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-bold text-ink dark:text-white whitespace-normal break-words">
                        {t.memoryQuizTitle}
                      </span>
                      <span className="rounded-full bg-teal-600/15 px-2 py-0.5 text-[10px] font-extrabold text-teal-800 dark:text-teal-300">
                        {clampedRecent}/5
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75 whitespace-normal break-words leading-snug">
                      {t.memoryQuizDesc}
                    </p>
                    {/* 5-card memory readiness meter */}
                    <div className="mt-2 flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((slot) => (
                        <span
                          key={slot}
                          className={`h-1.5 w-5 rounded-full transition-colors ${
                            slot < clampedRecent
                              ? 'bg-teal-500 dark:bg-teal-400'
                              : 'bg-teal-200/70 dark:bg-white/15'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Brain className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-300" />
              </motion.button>

              {/* 4. Word Lab Vocabulary Quiz (5 curated B1-C2 vocab cards) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('vocabulary');
                }}
                data-testid="start-vocab-quiz-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-sky-50/75 p-3.5 text-left shadow-sm transition hover:brightness-95 active:scale-[0.99] dark:border-indigo-500/45 dark:from-indigo-950/60 dark:to-[#17162E]"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-base font-bold text-ink dark:text-white whitespace-normal break-words">
                        {lang === 'tr' ? 'Kelime Quizi (Word Lab)' : 'Word Lab Quiz'}
                      </span>
                      <span className="rounded-full bg-indigo-600/15 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200">
                        B1–C2
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75 whitespace-normal break-words leading-snug">
                      {lang === 'tr'
                        ? 'Bağlam içi cümleler, sesli telaffuz ve eş anlamlılarla 5 kelimelik test'
                        : '5 curated B1–C2 vocabulary questions with pronunciation & context'}
                    </p>
                  </div>
                </div>
                <BookOpen className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
              </motion.button>
            </div>

            {/* Combo Bonus & Scrolla 1v1 Footer Card */}
            <div className="mt-4 rounded-2xl border border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50/75 via-violet-50/75 to-white p-3.5 dark:border-fuchsia-600/35 dark:from-fuchsia-950/35 dark:via-violet-950/35 dark:to-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm">
                    <Swords className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-ink dark:text-white whitespace-normal break-words">
                      {lang === 'tr' ? 'Scrolla 1v1 Arena' : 'Scrolla 1v1 Arena'}
                    </p>
                    <p className="text-[11px] font-medium text-ink/70 dark:text-violet-200/75 whitespace-normal break-words leading-snug">
                      {lang === 'tr'
                        ? 'Aynı sorularla gerçek zamanlı yarışmak için Scrolla sekmesine geç!'
                        : 'Switch to the Scrolla tab to race a friend live on the same questions!'}
                    </p>
                  </div>
                </div>
                {onOpenScrolla ? (
                  <button
                    type="button"
                    onClick={() => {
                      onButtonPop();
                      onOpenScrolla();
                    }}
                    className="shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm"
                  >
                    Scrolla →
                  </button>
                ) : (
                  <img
                    src={UI_ICON_PATHS.xpSparkles}
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    loading="eager"
                    decoding="sync"
                    className="h-6 w-6 shrink-0 object-contain opacity-90"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
  );
}
