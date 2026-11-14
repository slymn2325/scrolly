'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  Sparkles,
  Swords,
  Timer,
  XCircle,
} from 'lucide-react';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { vibrateSuccess, vibrateTap } from '@/utils/haptics';
import { prepareQuizOptions, type QuizQuestionItem } from '@/utils/recommendation';

export type ActiveQuizMode = 'memory' | 'daily' | 'weekly' | 'duel';

interface MemoryQuizCardProps {
  questions: QuizQuestionItem[];
  lang: Language;
  quizMode?: ActiveQuizMode;
  duelConfig?: DuelChallengeConfig | null;
  onAnswerSound: (isCorrect: boolean) => void;
  onTickSound: (urgent: boolean) => void;
  onButtonPop: () => void;
  onComplete: (
    results: boolean[],
    sourceCategories: string[],
    earnedXp: number,
    elapsedSec: number,
    usedQuestionIds: string[]
  ) => void;
  onSkip: () => void;
}

function getDefaultDuration(mode: ActiveQuizMode): number {
  if (mode === 'weekly') return 90;
  if (mode === 'daily') return 60;
  return 45;
}

export default function MemoryQuizCard({
  questions,
  lang,
  quizMode = 'memory',
  duelConfig,
  onAnswerSound,
  onTickSound,
  onButtonPop,
  onComplete,
  onSkip,
}: MemoryQuizCardProps) {
  const initialTotalSeconds = duelConfig ? 60 : getDefaultDuration(quizMode);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialTotalSeconds);
  const [totalBudgetUsed, setTotalBudgetUsed] = useState(initialTotalSeconds);
  const [results, setResults] = useState<boolean[]>([]);
  const [comboStreak, setComboStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [rewardUsed, setRewardUsed] = useState(false);
  const [rewardWatching, setRewardWatching] = useState(false);

  const rewardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = translations[lang];
  const currentItem = questions[currentIndex];
  const fact = currentItem.fact;
  const localized = fact[lang];
  const catMeta = getCategoryMeta(fact.category);

  const prepared = useMemo(
    () => prepareQuizOptions(localized.quiz, `${fact.id}-${lang}`),
    [localized.quiz, fact.id, lang]
  );

  const hasAnswered = selectedOption !== null || timedOut;
  const isCorrect = selectedOption !== null && selectedOption === prepared.correctIndex;
  const isLastQuestion = currentIndex === questions.length - 1;

  useEffect(() => {
    return () => {
      if (rewardTimeoutRef.current) {
        clearTimeout(rewardTimeoutRef.current);
      }
    };
  }, []);

  // Continuous quiz-wide countdown timer with last-10s red pulse + tick sound
  useEffect(() => {
    if (timedOut || rewardWatching) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimedOut(true);
          onAnswerSound(false);
          return 0;
        }
        const next = prev - 1;
        if (next <= 10) {
          onTickSound(next <= 5);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timedOut, rewardWatching, onAnswerSound, onTickSound]);

  const handleSelectOption = (optionIdx: number) => {
    if (hasAnswered || rewardWatching) return;
    vibrateTap(12);
    setSelectedOption(optionIdx);
    const correct = optionIdx === prepared.correctIndex;
    if (correct) {
      const nextStreak = comboStreak + 1;
      setComboStreak(nextStreak);
      const gained = 100 + 25 * nextStreak;
      setTotalScore((prev) => prev + gained);
    } else {
      setComboStreak(0);
    }
    onAnswerSound(correct);
  };

  const handleWatchRewardTime = () => {
    if (rewardUsed || rewardWatching) return;
    vibrateTap(12);
    onButtonPop();
    setRewardWatching(true);

    rewardTimeoutRef.current = setTimeout(() => {
      vibrateSuccess();
      onAnswerSound(true);
      setTimeLeft((prev) => prev + 15);
      setTotalBudgetUsed((prev) => prev + 15);
      setTimedOut(false);
      setRewardUsed(true);
      setRewardWatching(false);
    }, 1400);
  };

  const finishQuiz = (finalResults: boolean[]) => {
    const correctSoFar = finalResults.filter(Boolean).length;
    const speedBonus = correctSoFar > 0 && timeLeft > 0 ? timeLeft * 5 : 0;
    const finalScore = totalScore + speedBonus;
    const elapsedSec = Math.max(2, totalBudgetUsed - timeLeft);
    const categories = questions.map((q) => q.fact.category);
    const usedIds = questions.map((q) => q.fact.id);
    onComplete(finalResults, categories, finalScore, elapsedSec, usedIds);
  };

  const handleContinue = () => {
    if (!hasAnswered) return;
    vibrateTap(12);
    onButtonPop();

    const updatedResults = [...results, isCorrect];

    if (timedOut || isLastQuestion) {
      // Pad remaining unanswered questions as false if timer expired mid-quiz
      const padded =
        updatedResults.length < questions.length
          ? [
              ...updatedResults,
              ...Array(questions.length - updatedResults.length).fill(false),
            ]
          : updatedResults;
      finishQuiz(padded);
      return;
    }

    setResults(updatedResults);
    setSelectedOption(null);
    setCurrentIndex((prev) => prev + 1);
  };

  const timerPct = Math.min(100, Math.round((timeLeft / totalBudgetUsed) * 100));
  const urgentTimer = timeLeft <= 10 && !timedOut;

  const modeLabel = duelConfig
    ? t.duelBtn
    : quizMode === 'daily'
    ? t.dailySprintTitle
    : quizMode === 'weekly'
    ? t.weeklyMarathonTitle
    : t.quizBadge;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -12 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      data-testid="memory-quiz-card"
      className="mx-auto mb-[92px] flex max-h-[84dvh] w-full max-w-[430px] flex-col justify-between overflow-y-auto no-scrollbar rounded-3xl border-2 border-violet-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-violet-700/60 dark:bg-[#1A162B]/95 sm:p-6"
    >
      {/* Incoming 1v1 Duel Banner */}
      {duelConfig && (
        <div
          data-testid="duel-active-banner"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-rose-50 px-3.5 py-2 text-xs font-extrabold text-amber-900 dark:border-amber-600/60 dark:from-amber-950/50 dark:to-rose-950/50 dark:text-amber-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <span>
              {t.duelIncomingBanner} ({duelConfig.challengerName})
            </span>
          </span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-rose-700 shadow-sm dark:bg-white/10 dark:text-amber-200">
            {t.duelChallengerScore}: {duelConfig.targetScore}
          </span>
        </div>
      )}

      {/* Quiz Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-3 py-1 text-xs font-extrabold text-violet-800 dark:bg-violet-900/70 dark:text-violet-200">
            <Brain className="h-3.5 w-3.5" />
            {modeLabel}
          </span>
          {comboStreak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <Flame className="h-3 w-3 fill-current" />
              {comboStreak}x
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Countdown Pill */}
          <span
            data-testid="quiz-timer"
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black transition-colors ${
              urgentTimer || timedOut
                ? 'animate-pulse bg-rose-600 text-white shadow-md shadow-rose-500/40'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
            }`}
          >
            <Timer className="h-3.5 w-3.5" />
            <span>{timeLeft}s</span>
          </span>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-ink/70 dark:bg-white/10 dark:text-violet-200">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <motion.div
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.4, ease: 'linear' }}
          className={`h-full rounded-full ${
            urgentTimer || timedOut ? 'bg-rose-600' : 'bg-gradient-to-r from-violet-500 to-teal-400'
          }`}
        />
      </div>

      {/* Progress & Score Row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-violet-700 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          +{totalScore} XP
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full ${catMeta.bgClass} px-2.5 py-0.5 text-[11px] font-bold ${catMeta.accentText}`}
        >
          {catMeta.emoji} {catMeta.label[lang]}
        </span>
      </div>

      {/* Question Text */}
      <div className="my-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
          {fact.emoji ?? '✨'} {localized.title}
        </p>
        <h2
          data-testid="quiz-question-text"
          className="font-display text-lg font-bold leading-snug text-ink dark:text-white"
        >
          {localized.quiz.question}
        </h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {prepared.options.map((optText, idx) => {
          const isThisSelected = selectedOption === idx;
          const isThisCorrect = idx === prepared.correctIndex;

          let btnStyle =
            'border-slate-200 bg-slate-50/80 text-ink hover:border-violet-300 hover:bg-pastel-lavender/40 dark:border-white/15 dark:bg-white/5 dark:text-violet-100 dark:hover:border-violet-400';

          if (hasAnswered) {
            if (isThisCorrect) {
              btnStyle =
                'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold dark:bg-emerald-950/60 dark:text-emerald-200';
            } else if (isThisSelected) {
              btnStyle =
                'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200';
            } else {
              btnStyle =
                'border-slate-100 bg-slate-50/50 text-ink/45 dark:border-white/5 dark:bg-white/5 dark:text-white/40';
            }
          }

          return (
            <motion.button
              key={`${fact.id}-${idx}`}
              type="button"
              whileTap={!hasAnswered ? { scale: 0.96 } : undefined}
              disabled={hasAnswered || rewardWatching}
              onClick={() => handleSelectOption(idx)}
              data-testid={`quiz-option-${idx}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${btnStyle}`}
            >
              <span>{optText}</span>
              {hasAnswered && isThisCorrect && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {hasAnswered && isThisSelected && !isThisCorrect && (
                <XCircle className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* One-Time Rewarded Ad (+15s) Option when timer <= 20 or timed out */}
      {!rewardUsed && (timeLeft <= 20 || timedOut) && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          disabled={rewardWatching}
          onClick={handleWatchRewardTime}
          data-testid="quiz-reward-time-btn"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-100 to-rose-100 px-4 py-2.5 text-xs font-extrabold text-amber-950 shadow-sm dark:border-amber-600/60 dark:from-amber-900/50 dark:to-rose-900/50 dark:text-amber-100"
        >
          <span>{rewardWatching ? t.rewardWatchingAd : t.rewardPlus15Btn}</span>
        </motion.button>
      )}

      {/* Explanation Feedback */}
      {hasAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 rounded-2xl p-3 text-xs leading-relaxed ${
            isCorrect
              ? 'border border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          <p className="font-extrabold">
            {timedOut
              ? t.quizTimeUp
              : isCorrect
              ? `${t.quizCorrect} (+${100 + 25 * comboStreak} XP)`
              : t.quizWrong}
          </p>
          {localized.quiz.explanation && (
            <p className="mt-1 opacity-90">{localized.quiz.explanation}</p>
          )}
        </motion.div>
      )}

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-white/10">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onSkip}
          className="text-xs font-bold text-ink/50 hover:text-ink dark:text-violet-200/60 dark:hover:text-white"
        >
          {t.quizSkip}
        </motion.button>

        {hasAnswered && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleContinue}
            data-testid="quiz-next-btn"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-pill hover:bg-violet-700"
          >
            <span>{isLastQuestion || timedOut ? t.quizFinish : t.quizNextQ}</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
