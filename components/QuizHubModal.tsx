'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Calendar, CheckCircle2, Flame, Timer, Trophy, X, Zap } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

export type QuizModeChoice = 'daily' | 'weekly' | 'memory';

interface QuizHubModalProps {
  open: boolean;
  lang: Language;
  dailyCompleted: boolean;
  dailyBestScore: number;
  recentCount: number;
  onSelectMode: (mode: QuizModeChoice) => void;
  onClose: () => void;
  onButtonPop: () => void;
}

export default function QuizHubModal({
  open,
  lang,
  dailyCompleted,
  dailyBestScore,
  recentCount,
  onSelectMode,
  onClose,
  onButtonPop,
}: QuizHubModalProps) {
  const t = translations[lang];

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.quizHubTitle}
          data-testid="quiz-hub-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 pb-24 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative w-full max-w-md rounded-3xl border border-white/70 bg-[#FFFDF9]/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-violet-700/50 dark:bg-[#171228]/95"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                onButtonPop();
                onClose();
              }}
              aria-label="Close"
              data-testid="quiz-hub-close-btn"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/60 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-200"
            >
              <X className="h-4 w-4" />
            </motion.button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-ink dark:text-white">
                  {t.quizHubTitle}
                </h2>
                <p className="text-xs font-medium text-ink/65 dark:text-violet-200/75">
                  {t.quizHubSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {/* 1. Daily Sprint (5 Q / 60s) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('daily');
                }}
                data-testid="start-daily-sprint-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-left shadow-sm transition hover:brightness-[0.98] dark:border-amber-600/60 dark:from-amber-950/50 dark:to-orange-950/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/25 text-amber-700 dark:text-amber-300">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-ink dark:text-white">
                        {t.dailySprintTitle}
                      </span>
                      {dailyCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {dailyBestScore > 0 ? `${dailyBestScore}` : t.dailySprintDoneBadge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75">
                      {t.dailySprintDesc}
                    </p>
                  </div>
                </div>
                <Timer className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
              </motion.button>

              {/* 2. Weekly Marathon (10 Q / 90s) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('weekly');
                }}
                data-testid="start-weekly-marathon-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-pastel-lavender/60 to-sky-50 p-4 text-left shadow-sm transition hover:brightness-[0.98] dark:border-violet-600/60 dark:from-violet-950/60 dark:to-indigo-950/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-700 dark:text-violet-300">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-ink dark:text-white">
                        {t.weeklyMarathonTitle}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 dark:text-violet-300">
                        <Flame className="h-3 w-3" />
                        2x XP
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75">
                      {t.weeklyMarathonDesc}
                    </p>
                  </div>
                </div>
                <Zap className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
              </motion.button>

              {/* 3. Classic Memory Quiz (3 Q from last 5 cards) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onButtonPop();
                  onSelectMode('memory');
                }}
                data-testid="start-memory-quiz-btn"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-teal-200 bg-gradient-to-r from-pastel-mint/55 to-white p-4 text-left shadow-sm transition hover:brightness-[0.98] dark:border-teal-700/60 dark:from-teal-950/50 dark:to-[#1F1A36]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-ink dark:text-white">
                        {t.memoryQuizTitle}
                      </span>
                      <span className="rounded-full bg-teal-600/15 px-2 py-0.5 text-[10px] font-extrabold text-teal-800 dark:text-teal-300">
                        {Math.min(5, recentCount)}/5
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-ink/70 dark:text-violet-200/75">
                      {t.memoryQuizDesc}
                    </p>
                  </div>
                </div>
                <Brain className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-300" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
