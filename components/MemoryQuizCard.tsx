'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  HelpCircle,
  Sparkles,
  Swords,
  Timer,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import {
  type CategoryFilter,
  getCategoryMeta,
  type Language,
  translations,
  VOCABULARY_META,
} from '@/i18n/translations';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
import { vibrateSuccess, vibrateTap } from '@/utils/haptics';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { prepareQuizOptions, type QuizQuestionItem } from '@/utils/recommendation';
import { pickSeededFacts } from '@/utils/seededRandom';
import { buildStructuredDetailHighlights } from '@/utils/topicMotif';
import { useEscapeClose } from '@/utils/useEscapeClose';
import { speakVocabularyText } from '@/utils/vocabNotebook';

export type ActiveQuizMode = 'memory' | 'daily' | 'weekly' | 'duel' | 'vocabulary';

interface MemoryQuizCardProps {
  questions: QuizQuestionItem[];
  lang: Language;
  quizMode?: ActiveQuizMode;
  duelConfig?: DuelChallengeConfig | null;
  vocabularyPool?: VocabularyCard[];
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
  if (mode === 'daily' || mode === 'vocabulary') return 60;
  return 45;
}

function formatComboMultiplier(streak: number): string {
  if (streak >= 4) return '2.0x';
  if (streak === 3) return '1.5x';
  if (streak === 2) return '1.25x';
  return '1.0x';
}

interface EffectiveQuizLocalized {
  title: string;
  tag?: string;
  factText: string;
  deepDiveDetail?: string;
  sourceHint?: string;
  sourceName?: string;
  quiz: {
    question: string;
    options: [string, string, string];
    correctIndex: 0 | 1 | 2;
    explanation?: string;
  };
}

interface EffectiveQuizEntry {
  id: string;
  displayCategory: CategoryFilter;
  sourceCategory: string;
  emoji: string;
  sourceName?: string;
  tr: EffectiveQuizLocalized;
  en: EffectiveQuizLocalized;
  vocabMeta?: {
    word: string;
    phonetic: string;
    partOfSpeech: string;
    meaningTr: string;
    exampleEn: string;
    exampleTr: string;
  };
}

function maskStandaloneWord(sentence: string, word: string): string {
  const cleanWord = word.trim();
  if (!sentence || !cleanWord) return '';
  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`\\b${escaped}\\b`, 'i');
  return matcher.test(sentence) ? sentence.replace(matcher, '_____') : '';
}

const VOCAB_POS_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

function resolveVocabPosLabel(partOfSpeech: VocabPartOfSpeech, lang: Language): string {
  return VOCAB_POS_LABELS[partOfSpeech]?.[lang] ?? partOfSpeech;
}

function buildVocabQuizEntry(
  card: VocabularyCard,
  allVocab: VocabularyCard[],
  index: number,
  seedKey: string
): EffectiveQuizEntry {
  const others = allVocab.filter(
    (other) => other.id !== card.id && other.word.toLowerCase() !== card.word.toLowerCase()
  );
  const samePos = others.filter((other) => other.partOfSpeech === card.partOfSpeech);
  const diffPos = others.filter((other) => other.partOfSpeech !== card.partOfSpeech);
  const pickedSame = pickSeededFacts(samePos, 3, `${seedKey}-pos-${card.id}`);
  const pickedDiff = pickSeededFacts(diffPos, 3, `${seedKey}-diff-${card.id}`);
  const distractorWords: string[] = [];
  const distractorMeanings: string[] = [];

  for (const candidate of [...pickedSame, ...pickedDiff]) {
    if (
      distractorWords.length < 2 &&
      candidate.word.toLowerCase() !== card.word.toLowerCase() &&
      !distractorWords.some((w) => w.toLowerCase() === candidate.word.toLowerCase())
    ) {
      distractorWords.push(candidate.word);
    }
    if (
      distractorMeanings.length < 2 &&
      candidate.meaningTr.toLowerCase() !== card.meaningTr.toLowerCase() &&
      !distractorMeanings.some((m) => m.toLowerCase() === candidate.meaningTr.toLowerCase())
    ) {
      distractorMeanings.push(candidate.meaningTr);
    }
  }

  const fallbackEn1 = distractorWords[0] ?? 'ephemeral';
  const fallbackEn2 = distractorWords[1] ?? 'pragmatic';
  const enOptions: [string, string, string] = [card.word, fallbackEn1, fallbackEn2];

  const validTrOpts =
    Array.isArray(card.quizOptions) && card.quizOptions.length === 3
      ? ([card.quizOptions[0], card.quizOptions[1], card.quizOptions[2]] as [
          string,
          string,
          string,
        ])
      : ([
          card.meaningTr,
          distractorMeanings[0] ?? 'geçici',
          distractorMeanings[1] ?? 'belirsiz',
        ] as [string, string, string]);
  const validTrIdx: 0 | 1 | 2 =
    Array.isArray(card.quizOptions) && card.quizOptions.length === 3 ? card.correctIndex : 0;

  const posTr = resolveVocabPosLabel(card.partOfSpeech, 'tr');
  const posEn = resolveVocabPosLabel(card.partOfSpeech, 'en');
  const synonymList = card.synonyms?.filter((s) => s.trim().length > 0).slice(0, 2) ?? [];

  const maskedSentence = maskStandaloneWord(card.exampleEn, card.word);
  const trQuestion =
    index % 2 === 0 && card.exampleEn
      ? `"${card.exampleEn}" cümlesindeki "${card.word}" (${card.phonetic}) kelimesi ne anlama gelir?`
      : `"${card.word}" (${card.phonetic}) kelimesinin Türkçe karşılığı hangisidir?`;

  const enQuestion =
    index % 2 === 1 && maskedSentence
      ? `Complete the sentence: "${maskedSentence}"`
      : `Which English word matches this definition: "${card.definitionEn}"?`;

  return {
    id: card.id,
    displayCategory: 'vocabulary',
    sourceCategory: 'vocabulary',
    emoji: VOCABULARY_META.emoji,
    sourceName: 'Scrolly Dil Laboratuvarı',
    tr: {
      title: `${card.word} · ${card.phonetic}`,
      tag: `Dil Öğrenme · ${posTr}`,
      factText: `${card.exampleEn} · "${card.exampleTr}"`,
      deepDiveDetail: `${card.word} (${posTr}): ${card.meaningTr}. Tanım: ${card.definitionEn}`,
      sourceName: 'Scrolly Dil Laboratuvarı',
      quiz: {
        question: trQuestion,
        options: validTrOpts,
        correctIndex: validTrIdx,
        explanation: `"${card.word}" (${posTr}) = ${card.meaningTr}. Tanım: ${card.definitionEn} · Örnek: "${card.exampleTr}"${synonymList.length ? ` · Eş anlam: ${synonymList.join(', ')}` : ''}`,
      },
    },
    en: {
      title: `${card.word} · ${card.phonetic}`,
      tag: `Language Lab · ${posEn}`,
      factText: `${card.definitionEn} · "${card.exampleEn}"`,
      deepDiveDetail: `${card.word} (${posEn}, ${card.phonetic}): ${card.definitionEn}`,
      sourceName: 'Scrolly Language Lab',
      quiz: {
        question: enQuestion,
        options: enOptions,
        correctIndex: 0,
        explanation: `"${card.word}" (${posEn}, ${card.phonetic}) means: ${card.definitionEn} Example: "${card.exampleEn}"${synonymList.length ? ` · Synonyms: ${synonymList.join(', ')}` : ''}`,
      },
    },
    vocabMeta: {
      word: card.word,
      phonetic: card.phonetic,
      partOfSpeech: card.partOfSpeech,
      meaningTr: card.meaningTr,
      exampleEn: card.exampleEn,
      exampleTr: card.exampleTr,
    },
  };
}

export default function MemoryQuizCard({
  questions,
  lang,
  quizMode = 'memory',
  duelConfig,
  vocabularyPool,
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

  const effectiveQuestions = useMemo<EffectiveQuizEntry[]>(() => {
    const staticVocab = getVocabularyFacts();
    const poolVocab =
      vocabularyPool && vocabularyPool.length > 0 ? vocabularyPool : staticVocab;
    const vocabMap = new Map<string, VocabularyCard>();
    for (const v of staticVocab) vocabMap.set(v.id, v);
    for (const v of poolVocab) vocabMap.set(v.id, v);

    const isVocabMode =
      quizMode === 'vocabulary' ||
      duelConfig?.category === 'vocabulary' ||
      Boolean(duelConfig?.factIds?.some((id) => id.startsWith('vocab-')));

    const seedKey = duelConfig?.duelId || `${quizMode}-vocab`;

    if (isVocabMode && poolVocab.length > 0) {
      const targetCount = Math.max(
        1,
        duelConfig?.questionCount || duelConfig?.factIds?.length || questions.length || 5
      );
      const chosenCards: VocabularyCard[] = [];
      const seenIds = new Set<string>();

      for (const id of duelConfig?.factIds ?? []) {
        const match = vocabMap.get(id);
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          chosenCards.push(match);
        }
      }

      for (const q of questions) {
        const match = vocabMap.get(q.fact.id);
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          chosenCards.push(match);
        }
      }

      if (chosenCards.length < targetCount) {
        const remaining = poolVocab.filter((v) => !seenIds.has(v.id));
        const extra = pickSeededFacts(
          remaining,
          targetCount - chosenCards.length,
          `scrolla-vocab-${seedKey}`
        );
        for (const item of extra) {
          seenIds.add(item.id);
          chosenCards.push(item);
        }
      }

      return chosenCards
        .slice(0, targetCount)
        .map((card, idx) => buildVocabQuizEntry(card, poolVocab, idx, seedKey));
    }

    return questions.map((item, idx) => {
      const matchedVocab = vocabMap.get(item.fact.id);
      if (matchedVocab) {
        return buildVocabQuizEntry(matchedVocab, poolVocab, idx, seedKey);
      }

      const rawCategory = item.fact.category as string;
      const isVocabCat = rawCategory === 'vocabulary';
      return {
        id: item.fact.id,
        displayCategory: isVocabCat ? 'vocabulary' : item.fact.category,
        sourceCategory: rawCategory,
        emoji: item.fact.emoji ?? getCategoryMeta(rawCategory).emoji,
        sourceName: item.fact.sourceName,
        tr: {
          title: item.fact.tr.title,
          tag: item.fact.tr.tag,
          factText: item.fact.tr.factText,
          deepDiveDetail: item.fact.tr.deepDiveDetail,
          sourceHint: item.fact.tr.sourceHint,
          sourceName: item.fact.tr.sourceName,
          quiz: item.fact.tr.quiz,
        },
        en: {
          title: item.fact.en.title,
          tag: item.fact.en.tag,
          factText: item.fact.en.factText,
          deepDiveDetail: item.fact.en.deepDiveDetail,
          sourceHint: item.fact.en.sourceHint,
          sourceName: item.fact.en.sourceName,
          quiz: item.fact.en.quiz,
        },
      };
    });
  }, [questions, duelConfig, quizMode, vocabularyPool]);

  const t = translations[lang];
  const currentEntry = effectiveQuestions[currentIndex];
  const localized = currentEntry?.[lang];
  const catMeta = currentEntry
    ? getCategoryMeta(currentEntry.displayCategory)
    : getCategoryMeta('science');

  const prepared = useMemo(() => {
    if (!currentEntry || !localized) {
      return { options: [] as string[], correctIndex: 0 };
    }
    return prepareQuizOptions(localized.quiz, `${currentEntry.id}-${lang}`);
  }, [localized, currentEntry, lang]);

  const highlights = useMemo(() => {
    if (!localized) return null;
    return buildStructuredDetailHighlights(
      {
        factText: localized.factText,
        deepDiveDetail: localized.deepDiveDetail ?? localized.factText,
        tag: localized.tag,
        sourceHint: localized.sourceHint,
        quiz: localized.quiz,
      },
      lang
    );
  }, [localized, lang]);

  const hasAnswered = selectedOption !== null || timedOut;
  const isCorrect = selectedOption !== null && selectedOption === prepared.correctIndex;
  const isLastQuestion = currentIndex === effectiveQuestions.length - 1;
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
    if (timedOut || rewardWatching || !currentEntry) return;

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
  }, [timedOut, rewardWatching, currentEntry, onAnswerSound, onTickSound]);

  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (hasAnswered || rewardWatching || !currentEntry) return;
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
    [hasAnswered, rewardWatching, currentEntry, prepared.correctIndex, comboStreak, onAnswerSound]
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
      const categories = effectiveQuestions.map((q) => q.sourceCategory);
      const usedIds = effectiveQuestions.map((q) => q.id);
      onComplete(finalResults, categories, finalScore, elapsedSec, usedIds);
    },
    [timeLeft, totalScore, totalBudgetUsed, effectiveQuestions, onComplete]
  );

  const handleContinue = useCallback(() => {
    if (!hasAnswered) return;
    vibrateTap(12);
    onButtonPop();

    const updatedResults = [...results, isCorrect];

    if (timedOut || isLastQuestion) {
      const padded =
        updatedResults.length < effectiveQuestions.length
          ? [
              ...updatedResults,
              ...Array(effectiveQuestions.length - updatedResults.length).fill(false),
            ]
          : updatedResults;
      finishQuiz(padded);
      return;
    }

    setResults(updatedResults);
    setSelectedOption(null);
    setLastGainedXp(0);
    setCurrentIndex((prev) => prev + 1);
  }, [
    hasAnswered,
    onButtonPop,
    results,
    isCorrect,
    timedOut,
    isLastQuestion,
    effectiveQuestions.length,
    finishQuiz,
  ]);

  // Keyboard shortcuts: 1/2/3 to answer, Enter to advance
  useEffect(() => {
    if (!currentEntry || rewardWatching) return;
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
  }, [
    currentEntry,
    rewardWatching,
    hasAnswered,
    prepared.options.length,
    handleSelectOption,
    handleContinue,
  ]);

  if (!currentEntry || !localized) {
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
        : quizMode === 'vocabulary'
          ? lang === 'tr'
            ? 'Kelime Quizi · Word Lab'
            : 'Word Lab Quiz'
          : t.quizBadge;
  const optionLetters = ['A', 'B', 'C'] as const;
  const multiplierLabel = formatComboMultiplier(comboStreak);
  const topicExplanation =
    localized.quiz.explanation?.trim() ||
    highlights?.keyInsight ||
    localized.factText;
  const resolvedSource = localized.sourceName || currentEntry.sourceName || localized.sourceHint;
  const resolvedVocabPos = currentEntry.vocabMeta
    ? resolveVocabPosLabel(currentEntry.vocabMeta.partOfSpeech as VocabPartOfSpeech, lang)
    : '';
  const hideVocabTargetBeforeAnswer = Boolean(
    currentEntry.vocabMeta &&
      !hasAnswered &&
      !localized.quiz.question
        .toLowerCase()
        .includes(currentEntry.vocabMeta.word.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0.94, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
      data-testid="memory-quiz-card"
      className="mx-auto my-auto flex max-h-[calc(100dvh-110px)] lg:max-h-[calc(88dvh-48px)] w-full max-w-[430px] md:max-w-2xl flex-col overflow-y-auto no-scrollbar rounded-3xl border-2 border-violet-200 bg-white p-3.5 pb-6 shadow-2xl dark:border-violet-700/60 dark:bg-[#0B0B11] sm:p-5 sm:pb-6"
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
              duelConfig.isBotPractice || !duelConfig.duelId ? (
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-rose-700 shadow-sm dark:bg-white/10 dark:text-amber-200">
                  {t.duelChallengerScore}: {duelConfig.targetScore}
                </span>
              ) : (
                <span
                  data-testid="duel-live-pill"
                  className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm"
                >
                  {lang === 'tr' ? 'CANLI 1v1' : 'LIVE 1v1'}
                </span>
              )
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
            {currentIndex + 1}/{effectiveQuestions.length}
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <motion.div
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.4, ease: 'linear' }}
          className={`h-full rounded-full ${
            urgentTimer || timedOut ? 'bg-rose-600' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400'
          }`}
        />
      </div>

      {/* Progress Dots + Score + Category Row */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-bold dark:border-white/15 dark:bg-white/15 dark:text-white ${catMeta.bgClass} ${catMeta.accentText}`}
        >
          <img
            src={catMeta.iconPath}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            loading="eager"
            decoding="sync"
            className="h-4 w-4 shrink-0 object-contain"
          />
          <span>{catMeta.label[lang]}</span>
        </span>
      </div>

      {/* Topic Anchor Card + Question */}
      <div className="my-2.5 rounded-2xl border border-slate-100 bg-slate-50/75 p-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300 whitespace-normal break-words">
            <img
              src={catMeta.iconPath}
              alt=""
              aria-hidden="true"
              width={14}
              height={14}
              loading="eager"
              decoding="sync"
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
            <span>{localized.tag || catMeta.label[lang]}</span>
          </p>
          {currentEntry.vocabMeta ? (
            !hideVocabTargetBeforeAnswer ? (
              <button
                type="button"
                data-testid="quiz-vocab-listen-btn"
                onClick={() => {
                  onButtonPop();
                  speakVocabularyText(currentEntry.vocabMeta!.word, 'en-US');
                }}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-950/60 dark:text-indigo-200"
              >
                <Volume2 className="h-3 w-3" />
                <span>{lang === 'tr' ? 'Telaffuzu Dinle' : 'Listen'}</span>
              </button>
            ) : null
          ) : (
            <span className="text-[10px] font-bold text-ink/55 dark:text-violet-200/60">
              {lang === 'tr' ? 'Konu Kartı' : 'Topic Card'}
            </span>
          )}
        </div>
        {hideVocabTargetBeforeAnswer ? (
          <p
            data-testid="quiz-mystery-word-badge"
            className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'tr' ? 'GİZLİ KELİME' : 'MYSTERY WORD'} • {resolvedVocabPos.toUpperCase()}
            </span>
          </p>
        ) : (
          <p
            data-testid="quiz-anchor-title"
            className="mt-1 text-xs font-bold leading-snug text-ink/75 dark:text-violet-100/80 whitespace-normal break-words"
          >
            {localized.title}
          </p>
        )}
        <h2
          data-testid="quiz-question-text"
          className="mt-1.5 font-display text-base font-bold leading-snug text-ink dark:text-white sm:text-lg whitespace-normal break-words"
        >
          {localized.quiz.question}
        </h2>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
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
              key={`${currentEntry.id}-${idx}`}
              type="button"
              whileTap={!hasAnswered ? { scale: 0.96 } : undefined}
              disabled={hasAnswered || rewardWatching}
              onClick={() => handleSelectOption(idx)}
              data-testid={`quiz-option-${idx}`}
              className={`w-full h-auto min-h-[44px] py-2.5 px-3 rounded-2xl border-2 text-left text-xs sm:text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 flex items-center justify-between gap-2.5 whitespace-normal break-words leading-snug ${btnStyle}`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    hasAnswered && isThisCorrect
                      ? 'bg-emerald-600 text-white'
                      : hasAnswered && isThisSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-white text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200'
                  }`}
                >
                  {optionLetters[idx] ?? idx + 1}
                </span>
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                  {optText}
                </span>
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2.5 rounded-2xl p-3 text-xs leading-snug ${
              isCorrect
                ? 'border border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100'
                : 'border border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 font-extrabold tabular-nums">
                {!timedOut && isCorrect && comboStreak >= 2 && (
                  <Flame className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                )}
                <span>
                  {timedOut
                    ? t.quizTimeUp
                    : isCorrect
                      ? comboStreak >= 2
                        ? lang === 'tr'
                          ? `${comboStreak}x Seri Kombo! Harika! (+${lastGainedXp} XP)`
                          : `${comboStreak}x Combo Streak! Spot on! (+${lastGainedXp} XP)`
                        : `${t.quizCorrect} (+${lastGainedXp} XP)`
                      : t.quizWrong}
                </span>
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-ink/75 dark:bg-black/25 dark:text-white/85">
                <Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-300" />
                {catMeta.label[lang]}
              </span>
            </div>

            <p className="mt-1 opacity-95">{topicExplanation}</p>

            {resolvedSource && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold opacity-75">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span>{resolvedSource}</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Unclipped Next Question CTA directly beneath explanation box */}
      {hasAnswered && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleContinue}
          data-testid="quiz-next-btn"
          className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-pill transition hover:brightness-110"
        >
          <span>{isLastQuestion || timedOut ? t.quizFinish : t.quizNextQ}</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      )}

      {/* Footer Back-to-Feed Action */}
      <div className="mt-2.5 flex shrink-0 items-center justify-center border-t border-slate-100 pt-2.5 dark:border-white/10">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onSkip}
          className="text-xs font-bold text-ink/55 hover:text-ink dark:text-violet-200/65 dark:hover:text-white"
        >
          {t.quizSkip}
        </motion.button>
      </div>
    </motion.div>
  );
}
