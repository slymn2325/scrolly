'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  Sparkles,
  Swords,
  Timer,
  XCircle,
  Zap,
} from 'lucide-react';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { vibrateSuccess, vibrateTap } from '@/utils/haptics';
import { CATEGORY_SUB_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import { prepareQuizOptions, type QuizQuestionItem } from '@/utils/recommendation';
import { buildStructuredDetailHighlights } from '@/utils/topicMotif';
import { useEscapeClose } from '@/utils/useEscapeClose';

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

function formatComboMultiplier(streak: number): string {
  if (streak >= 4) return '2.0x';
  if (streak === 3) return '1.5x';
  if (streak === 2) return '1.25x';
  return '1.0x';
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
  const initialTotalSeconds = duelConfig || quizMode === 'duel' ? 60 : getDefaultDuration(quizMode);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastGainedXp, setLastGainedXp] = useState(0);
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
  const fact = currentItem?.fact;
  const localized = fact?.[lang];
  const catMeta = fact ? getCategoryMeta(fact.category) : getCategoryMeta('science');
  const catSubIcon = fact ? CATEGORY_SUB_ICON_MAP[fact.category] : CATEGORY_SUB_ICON_MAP.science;

  const prepared = useMemo(() => {
    if (!fact || !localized) {
      return { options: [] as string[], correctIndex: 0 };
    }
    return prepareQuizOptions(localized.quiz, `${fact.id}-${lang}`);
  }, [localized, fact, lang]);

  const highlights = useMemo(() => {
    if (!localized) return null;
    return buildStructuredDetailHighlights(
      {
        factText: localized.factText,
        deepDiveDetail: localized.deepDiveDetail,
        tag: localized.tag,
        sourceHint: localized.sourceHint,
        quiz: localized.quiz,
      },
      lang
    );
  }, [localized, lang]);

  const hasAnswered = selectedOption !== null || timedOut;
  const isCorrect = selectedOption !== null && selectedOption === prepared.correctIndex;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isDuelMode = Boolean(duelConfig || quizMode === 'duel');

  useEffect(() => {
    return () => {
      if (rewardTimeoutRef.current) {
        clearTimeout(rewardTimeoutRef.current);
      }
    };
  }, []);

  useEscapeClose(!rewardWatching, onSkip);

  // Continuous quiz-wide countdown timer with last-10s red pulse + tick sound
  useEffect(() => {
    if (timedOut || rewardWatching || !currentItem) return;

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
  }, [timedOut, rewardWatching, currentItem, onAnswerSound, onTickSound]);

  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (hasAnswered || rewardWatching || !currentItem) return;
      vibrateTap(12);
      setSelectedOption(optionIdx);
      const correct = optionIdx === prepared.correctIndex;
      if (correct) {
        const nextStreak = comboStreak + 1;
        const gained = 100 + 25 * nextStreak;
        setComboStreak(nextStreak);
        setLastGainedXp(gained);
        setTotalScore((prev) => prev + gained);
      } else {
        setComboStreak(0);
        setLastGainedXp(0);
      }
      onAnswerSound(correct);
    },
    [hasAnswered, rewardWatching, currentItem, prepared.correctIndex, comboStreak, onAnswerSound]
  );

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

  const finishQuiz = useCallback(
    (finalResults: boolean[]) => {
      const correctSoFar = finalResults.filter(Boolean).length;
      const speedBonus = correctSoFar > 0 && timeLeft > 0 ? timeLeft * 5 : 0;
      const finalScore = totalScore + speedBonus;
      const elapsedSec = Math.max(2, totalBudgetUsed - timeLeft);
      const categories = questions.map((q) => q.fact.category);
      const usedIds = questions.map((q) => q.fact.id);
      onComplete(finalResults, categories, finalScore, elapsedSec, usedIds);
    },
    [timeLeft, totalScore, totalBudgetUsed, questions, onComplete]
  );

  const handleContinue = useCallback(() => {
    if (!hasAnswered) return;
    vibrateTap(12);
    onButtonPop();

    const updatedResults = [...results, isCorrect];

    if (timedOut || isLastQuestion) {
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
    setLastGainedXp(0);
    setCurrentIndex((prev) => prev + 1);
  }, [hasAnswered, onButtonPop, results, isCorrect, timedOut, isLastQuestion, questions.length, finishQuiz]);

  // Keyboard shortcuts: 1/2/3 to answer, Enter to advance
  useEffect(() => {
    if (!currentItem || rewardWatching) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!hasAnswered && (e.key === '1' || e.key === '2' || e.key === '3')) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < prepared.options.length) {
          e.preventDefault();
          handleSelectOption(idx);
        }
      } else if (hasAnswered && e.key === 'Enter') {
        e.preventDefault();
        handleContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentItem, rewardWatching, hasAnswered, prepared.options.length, handleSelectOption, handleContinue]);

  if (!currentItem || !fact || !localized) {
    return null;
  }

  const timerPct = Math.min(100, Math.round((timeLeft / totalBudgetUsed) * 100));
  const urgentTimer = timeLeft <= 10 && !timedOut;
  const scrollaLabel = lang === 'tr' ? 'Scrolla Düellosu' : 'Scrolla Duel';
  const modeLabel = isDuelMode
    ? scrollaLabel
    : quizMode === 'daily'
      ? t.dailySprintTitle
      : quizMode === 'weekly'
        ? t.weeklyMarathonTitle
        : t.quizBadge;
  const optionLetters = ['A', 'B', 'C'] as const;
  const multiplierLabel = formatComboMultiplier(comboStreak);
  const topicExplanation =
    localized.quiz.explanation?.trim() ||
    highlights?.keyInsight ||
    localized.factText;
  const resolvedSource = localized.sourceName || fact.sourceName || localized.sourceHint;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -12 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      data-testid="memory-quiz-card"
      className="mx-auto mb-[92px] flex max-h-[84dvh] w-full max-w-[430px] md:max-w-2xl flex-col justify-between overflow-y-auto no-scrollbar rounded-3xl border-2 border-violet-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-violet-700/60 dark:bg-[#1A162B]/95 sm:p-6"
    >
      {/* Incoming 1v1 Scrolla Duel Banner */}
      {isDuelMode && (
        <div
          data-testid="duel-active-banner"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-fuchsia-300/70 bg-gradient-to-r from-violet-600/10 via-fuchsia-500/10 to-amber-500/15 px-3.5 py-2 text-xs font-extrabold text-violet-950 dark:border-fuchsia-500/40 dark:from-violet-900/50 dark:via-fuchsia-900/40 dark:to-amber-900/30 dark:text-amber-100"
        >
          <span className="inline-flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
            <span>
              {scrollaLabel}
              {duelConfig?.challengerName ? ` · vs ${duelConfig.challengerName}` : ''}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            {duelConfig?.duelId && duelConfig.duelId.length <= 8 && (
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                {duelConfig.duelId}
              </span>
            )}
            {duelConfig && (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-rose-700 shadow-sm dark:bg-white/10 dark:text-amber-200">
                {t.duelChallengerScore}: {duelConfig.targetScore}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quiz Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
              isDuelMode
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm'
                : 'bg-pastel-lavender text-violet-800 dark:bg-violet-900/70 dark:text-violet-200'
            }`}
          >
            {isDuelMode ? <Swords className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
            {modeLabel}
          </span>
          {comboStreak > 0 && (
            <motion.span
              key={comboStreak}
              initial={{ scale: 0.75 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm"
            >
              <Flame className="h-3 w-3 fill-current" />
              <span>
                {comboStreak}x · {multiplierLabel}
              </span>
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
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
            urgentTimer || timedOut ? 'bg-rose-600' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400'
          }`}
        />
      </div>

      {/* Progress Dots + Score + Category Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-black text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
            <img src={UI_ICON_PATHS.xpSparkles} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
            +{totalScore} XP
          </span>
          {quizMode === 'weekly' && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <Zap className="h-3 w-3" />
              2x XP
            </span>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.bgClass} px-2.5 py-0.5 text-[11px] font-bold ${catMeta.accentText}`}
        >
          <img src={catSubIcon} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
          <span>{catMeta.emoji}</span>
          <span>{catMeta.label[lang]}</span>
        </span>
      </div>

      {/* Topic Anchor Card + Question */}
      <div className="my-4 rounded-2xl border border-slate-100 bg-slate-50/75 p-3.5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
            {fact.emoji ?? catMeta.emoji} {localized.tag || catMeta.label[lang]}
          </p>
          <span className="text-[10px] font-bold text-ink/55 dark:text-violet-200/60">
            {lang === 'tr' ? 'Konu Kartı' : 'Topic Card'}
          </span>
        </div>
        <p className="mt-1 text-xs font-bold text-ink/75 dark:text-violet-100/80">
          {localized.title}
        </p>
        <h2
          data-testid="quiz-question-text"
          className="mt-2 font-display text-lg font-bold leading-snug text-ink dark:text-white sm:text-xl"
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
                'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold dark:border-emerald-500/70 dark:bg-emerald-950/60 dark:text-emerald-100';
            } else if (isThisSelected) {
              btnStyle =
                'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/70 dark:bg-rose-950/60 dark:text-rose-100';
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
              className={`w-full h-auto min-h-[48px] py-2.5 px-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3 whitespace-normal break-words leading-snug ${btnStyle}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    hasAnswered && isThisCorrect
                      ? 'bg-emerald-600 text-white'
                      : hasAnswered && isThisSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-white text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200'
                  }`}
                >
                  {optionLetters[idx] ?? idx + 1}
                </span>
                <span className="whitespace-normal break-words leading-snug">{optText}</span>
              </div>
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

      {/* Rich Topic-Tied Explanation Feedback */}
      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-2xl p-3.5 text-xs leading-relaxed ${
              isCorrect
                ? 'border border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100'
                : 'border border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold">
                {timedOut
                  ? t.quizTimeUp
                  : isCorrect
                    ? comboStreak >= 2
                      ? lang === 'tr'
                        ? `🔥 ${comboStreak}x Seri Kombo! Harika! (+${lastGainedXp} XP)`
                        : `🔥 ${comboStreak}x Combo Streak! Spot on! (+${lastGainedXp} XP)`
                      : `${t.quizCorrect} (+${lastGainedXp} XP)`
                    : t.quizWrong}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-ink/75 dark:bg-black/25 dark:text-white/85">
                <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-300" />
                {catMeta.label[lang]}
              </span>
            </div>

            <p className="mt-1.5 opacity-95">{topicExplanation}</p>

            {resolvedSource && (
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold opacity-75">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span>{resolvedSource}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-white/10">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onSkip}
          className="text-xs font-bold text-ink/55 hover:text-ink dark:text-violet-200/65 dark:hover:text-white"
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
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-pill hover:brightness-110"
          >
            <span>{isLastQuestion || timedOut ? t.quizFinish : t.quizNextQ}</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
