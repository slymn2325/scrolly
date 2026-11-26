'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  HelpCircle,
  Swords,
  Timer,
  Volume2,
  XCircle,
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
import type { ChallengeQuestionSnapshot } from '@/types/challenge';
import type { FactCard } from '@/types/fact';
import { Button } from '@/components/cikartma';
import { motionSpring } from '@/lib/motion';
import { trackEvent } from '@/lib/telemetry';
import { vibrateSuccess, vibrateTap } from '@/utils/haptics';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';
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
  onStepXp?: (xpDelta: number, category: string) => void;
  onComplete: (
    results: boolean[],
    sourceCategories: string[],
    earnedXp: number,
    elapsedSec: number,
    usedQuestionIds: string[],
    usedSnapshots?: ChallengeQuestionSnapshot[],
    awardedStepXp?: number
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

function factToEffectiveQuizEntry(
  fact: FactCard,
  forceVocabularyCategory = false
): EffectiveQuizEntry {
  const rawCategory = fact.category as string;
  const isVocabCat = forceVocabularyCategory || rawCategory === 'vocabulary';
  return {
    id: fact.id,
    displayCategory: isVocabCat ? 'vocabulary' : fact.category,
    sourceCategory: isVocabCat ? 'vocabulary' : rawCategory,
    emoji: fact.emoji ?? getCategoryMeta(isVocabCat ? 'vocabulary' : rawCategory).emoji,
    sourceName: fact.sourceName,
    tr: {
      title: fact.tr.title,
      tag: fact.tr.tag,
      factText: fact.tr.factText,
      deepDiveDetail: fact.tr.deepDiveDetail,
      sourceHint: fact.tr.sourceHint,
      sourceName: fact.tr.sourceName,
      quiz: fact.tr.quiz,
    },
    en: {
      title: fact.en.title,
      tag: fact.en.tag,
      factText: fact.en.factText,
      deepDiveDetail: fact.en.deepDiveDetail,
      sourceHint: fact.en.sourceHint,
      sourceName: fact.en.sourceName,
      quiz: fact.en.quiz,
    },
  };
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

  const sourceOpts = Array.isArray(card.quizOptions)
    ? card.quizOptions.map((o) => o.trim()).filter(Boolean).slice(0, 4)
    : [];
  let validTrOpts: [string, string, string];
  let validTrIdx: 0 | 1 | 2;
  if (sourceOpts.length >= 3 && card.correctIndex <= 2) {
    validTrOpts = [sourceOpts[0], sourceOpts[1], sourceOpts[2]];
    validTrIdx = card.correctIndex as 0 | 1 | 2;
  } else if (sourceOpts.length >= 3) {
    const correct = sourceOpts[card.correctIndex] || card.meaningTr;
    const rest = sourceOpts.filter((_, i) => i !== card.correctIndex).slice(0, 2);
    validTrOpts = [correct, rest[0] ?? 'geçici', rest[1] ?? 'belirsiz'];
    validTrIdx = 0;
  } else {
    validTrOpts = [
      card.meaningTr,
      distractorMeanings[0] ?? 'geçici',
      distractorMeanings[1] ?? 'belirsiz',
    ];
    validTrIdx = 0;
  }

  const posTr = resolveVocabPosLabel(card.partOfSpeech, 'tr');
  const posEn = resolveVocabPosLabel(card.partOfSpeech, 'en');
  const synonymList = card.synonyms?.filter((s) => s.trim().length > 0).slice(0, 2) ?? [];

  const maskedSentence = maskStandaloneWord(card.exampleEn, card.word);
  const trQuestion =
    index % 2 === 0 && card.exampleEn
      ? `"${card.exampleEn}" cümlesindeki "${card.word}" (${formatPhoneticForDisplay(card.phonetic)}) kelimesi ne anlama gelir?`
      : `"${card.word}" (${formatPhoneticForDisplay(card.phonetic)}) kelimesinin Türkçe karşılığı hangisidir?`;

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
      title: `${card.word} · ${formatPhoneticForDisplay(card.phonetic)}`,
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
      title: `${card.word} · ${formatPhoneticForDisplay(card.phonetic)}`,
      tag: `Language Lab · ${posEn}`,
      factText: `${card.definitionEn} · "${card.exampleEn}"`,
      deepDiveDetail: `${card.word} (${posEn}, ${formatPhoneticForDisplay(card.phonetic)}): ${card.definitionEn}`,
      sourceName: 'Scrolly Language Lab',
      quiz: {
        question: enQuestion,
        options: enOptions,
        correctIndex: 0,
        explanation: `"${card.word}" (${posEn}, ${formatPhoneticForDisplay(card.phonetic)}) means: ${card.definitionEn} Example: "${card.exampleEn}"${synonymList.length ? ` · Synonyms: ${synonymList.join(', ')}` : ''}`,
      },
    },
    vocabMeta: {
      word: card.word,
      phonetic: formatPhoneticForDisplay(card.phonetic),
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
  onStepXp,
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
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const awardedStepXpRef = useRef<number>(0);

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

    if (isVocabMode) {
      const targetCount = Math.max(
        1,
        duelConfig?.questionCount || duelConfig?.factIds?.length || questions.length || 5
      );
      const entries: EffectiveQuizEntry[] = [];
      const seenIds = new Set<string>();

      for (const id of duelConfig?.factIds ?? []) {
        const match = vocabMap.get(id);
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          entries.push(buildVocabQuizEntry(match, poolVocab, entries.length, seedKey));
        }
      }

      for (const q of questions) {
        const match = vocabMap.get(q.fact.id);
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          entries.push(buildVocabQuizEntry(match, poolVocab, entries.length, seedKey));
        } else if (!seenIds.has(q.fact.id)) {
          seenIds.add(q.fact.id);
          entries.push(factToEffectiveQuizEntry(q.fact, true));
        }
      }

      if (entries.length < targetCount && poolVocab.length > 0) {
        const remaining = poolVocab.filter((v) => !seenIds.has(v.id));
        const extra = pickSeededFacts(
          remaining,
          targetCount - entries.length,
          `scrolla-vocab-${seedKey}`
        );
        for (const item of extra) {
          seenIds.add(item.id);
          entries.push(buildVocabQuizEntry(item, poolVocab, entries.length, seedKey));
        }
      }

      return entries.slice(0, targetCount);
    }

    return questions.map((item, idx) => {
      const matchedVocab = vocabMap.get(item.fact.id);
      if (matchedVocab) {
        return buildVocabQuizEntry(matchedVocab, poolVocab, idx, seedKey);
      }
      return factToEffectiveQuizEntry(item.fact);
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

  useEffect(() => {
    scrollBodyRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  useEffect(() => {
    if (!hasAnswered) return;
    const rafId = window.requestAnimationFrame(() => {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [hasAnswered]);

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
      vibrateTap(8);
      setSelectedOption(optionIdx);
      const correct = optionIdx === prepared.correctIndex;
      void trackEvent(
        currentEntry.id,
        currentEntry.sourceCategory,
        'quiz_answer',
        {
          correct,
          category: currentEntry.sourceCategory,
          mode: quizMode,
          surface: 'quiz_modal',
          award_xp: false,
        }
      );
      if (correct) {
        const nextStreak = comboStreak + 1;
        const gained = 100 + 25 * nextStreak;
        setComboStreak(nextStreak);
        setLastGainedXp(gained);
        setTotalScore((prev) => prev + gained);
        awardedStepXpRef.current += gained;
        onStepXp?.(gained, currentEntry.sourceCategory);
      } else {
        setComboStreak(0);
        setLastGainedXp(0);
      }
      onAnswerSound(correct);
    },
    [
      hasAnswered,
      rewardWatching,
      currentEntry,
      prepared.correctIndex,
      comboStreak,
      onAnswerSound,
      onStepXp,
      quizMode,
    ]
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
      const usedSnapshots: ChallengeQuestionSnapshot[] = effectiveQuestions.map((q) => ({
        id: q.id,
        category: q.sourceCategory,
        emoji: q.emoji,
        ...(q.sourceName ? { sourceName: q.sourceName } : {}),
        tr: {
          title: q.tr.title,
          ...(q.tr.tag ? { tag: q.tr.tag } : {}),
          factText: q.tr.factText,
          ...(q.tr.deepDiveDetail ? { deepDiveDetail: q.tr.deepDiveDetail } : {}),
          ...(q.tr.sourceHint ? { sourceHint: q.tr.sourceHint } : {}),
          ...(q.tr.sourceName ? { sourceName: q.tr.sourceName } : {}),
          quiz: q.tr.quiz,
        },
        en: {
          title: q.en.title,
          ...(q.en.tag ? { tag: q.en.tag } : {}),
          factText: q.en.factText,
          ...(q.en.deepDiveDetail ? { deepDiveDetail: q.en.deepDiveDetail } : {}),
          ...(q.en.sourceHint ? { sourceHint: q.en.sourceHint } : {}),
          ...(q.en.sourceName ? { sourceName: q.en.sourceName } : {}),
          quiz: q.en.quiz,
        },
      }));
      onComplete(
        finalResults,
        categories,
        finalScore,
        elapsedSec,
        usedIds,
        usedSnapshots,
        awardedStepXpRef.current
      );
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
      if (
        !hasAnswered &&
        (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')
      ) {
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

  const reduced = useReducedMotion() === true;

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
          ? t.wordLabTitle
          : t.quizBadge;
  const optionLetters = ['A', 'B', 'C', 'D'] as const;
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

  const optionStyle = (idx: number) => {
    const isThisSelected = selectedOption === idx;
    const isThisCorrect = idx === prepared.correctIndex;
    if (!hasAnswered) return 'bg-cik-surface-2 text-cik-text';
    if (isThisCorrect) return 'bg-cik-mint text-cik-mint-text';
    if (isThisSelected) return 'bg-cik-rose text-cik-rose-text';
    return 'bg-cik-surface text-cik-text-3';
  };

  const totalCount = effectiveQuestions.length;
  const solvedCount = Math.min(totalCount, results.length + (hasAnswered ? 1 : 0));

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.15 } : motionSpring.sheetOpen}
      data-testid="memory-quiz-card"
      className="mx-auto flex max-h-full min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-sticker bg-cik-surface text-cik-text shadow-sticker"
    >
      <div
        ref={scrollBodyRef}
        data-scroll-contain="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 pb-12"
      >
      {isDuelMode && (
        <div
          data-testid="duel-active-banner"
          className="cik-footnote mb-4 flex flex-wrap items-center justify-between gap-2 rounded-cik-md bg-cik-pink px-4 py-2 text-cik-text"
        >
          <span className="inline-flex items-center gap-2">
            <Swords size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {scrollaLabel}
              {duelConfig?.challengerName ? ` · vs ${duelConfig.challengerName}` : ''}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {duelConfig?.duelId && duelConfig.duelId.length <= 8 && (
              <span className="cik-caption-2 rounded-pill bg-cik-bg-elevated px-2 py-1 font-mono tracking-widest text-cik-text">
                {duelConfig.duelId}
              </span>
            )}
            {duelConfig &&
              (duelConfig.isBotPractice || !duelConfig.duelId ? (
                <span className="cik-caption-2 cik-tabular rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
                  {t.duelChallengerScore}: {duelConfig.targetScore}
                </span>
              ) : (
                <span
                  data-testid="duel-live-pill"
                  className="cik-caption-2 rounded-pill bg-cik-mint px-2 py-1 text-cik-mint-text"
                >
                  {lang === 'tr' ? 'Canlı' : 'Live'}
                </span>
              ))}
          </div>
        </div>
      )}

      <div
        className="mb-3 flex gap-1"
        data-testid="quiz-progress-segments"
        aria-hidden="true"
      >
        {effectiveQuestions.map((question, segmentIndex) => (
          <span
            key={question.id}
            className={`h-1 flex-1 rounded-pill ${
              segmentIndex < solvedCount
                ? 'bg-cik-cta'
                : segmentIndex === currentIndex && !hasAnswered
                  ? 'bg-cik-berry'
                  : 'bg-cik-pink'
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="cik-footnote inline-flex items-center gap-2 rounded-pill bg-cik-pink px-3 py-1 text-cik-text">
          {isDuelMode ? (
            <Swords size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Brain size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {modeLabel}
        </span>
        <div className="flex items-center gap-2">
          {comboStreak > 0 && (
            <span className="cik-caption-2 cik-tabular inline-flex items-center gap-1 rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
              <Flame size={16} strokeWidth={2} aria-hidden="true" />
              {comboStreak}x · {multiplierLabel}
            </span>
          )}
          <span
            data-testid="quiz-timer"
            className={`cik-footnote cik-tabular inline-flex items-center gap-1 rounded-pill px-3 py-1 ${
              urgentTimer || timedOut
                ? 'bg-cik-butter text-cik-butter-text'
                : 'bg-cik-surface-2 text-cik-text'
            }`}
          >
            <Timer size={16} strokeWidth={2} aria-hidden="true" />
            <span>{timeLeft}s</span>
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-cik-pink">
        <motion.div
          animate={{ scaleX: timerPct / 100 }}
          transition={reduced ? { duration: 0.15 } : { duration: 0.4, ease: 'linear' }}
          style={{ originX: 0 }}
          className={`h-full w-full rounded-pill ${
            urgentTimer || timedOut ? 'bg-cik-butter' : 'bg-cik-cta'
          }`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cik-footnote cik-tabular inline-flex items-center gap-1 rounded-pill bg-cik-butter px-3 py-1 text-cik-butter-text">
            +{totalScore} XP
          </span>
          <span
            data-testid="quiz-progress-counter"
            className="cik-caption-2 cik-tabular inline-flex items-center rounded-pill bg-cik-surface-2 px-2.5 py-1 text-cik-text-2"
          >
            {lang === 'tr'
              ? `Çözülen: ${solvedCount}/${totalCount} · Soru ${currentIndex + 1}/${totalCount}`
              : `Solved: ${solvedCount}/${totalCount} · Q ${currentIndex + 1}/${totalCount}`}
          </span>
        </div>
        <span className="cik-footnote inline-flex items-center gap-2 text-cik-text-2">
          <img
            src={catMeta.iconPath}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 object-contain"
          />
          {catMeta.label[lang]}
          {quizMode === 'weekly' ? <span className="cik-tabular">· 2x</span> : null}
        </span>
      </div>

      <div className="my-4 rounded-cik-md bg-cik-surface-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="cik-footnote inline-flex items-center gap-2 text-cik-text-2">
            <img
              src={catMeta.iconPath}
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
            <span>{localized.tag || catMeta.label[lang]}</span>
          </p>
          {currentEntry.vocabMeta && !hideVocabTargetBeforeAnswer ? (
            <button
              type="button"
              data-testid="quiz-vocab-listen-btn"
              onClick={() => {
                onButtonPop();
                speakVocabularyText(currentEntry.vocabMeta!.word, 'en-US');
              }}
              className="cik-caption-2 inline-flex min-h-11 items-center gap-1 rounded-pill bg-cik-pink px-3 text-cik-text focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
            >
              <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>{lang === 'tr' ? 'Dinle' : 'Listen'}</span>
            </button>
          ) : null}
        </div>
        {hideVocabTargetBeforeAnswer ? (
          <p
            data-testid="quiz-mystery-word-badge"
            className="cik-footnote mt-2 inline-flex items-center gap-2 text-cik-text"
          >
            <HelpCircle size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {lang === 'tr' ? 'Gizli kelime' : 'Mystery word'} · {resolvedVocabPos}
            </span>
          </p>
        ) : (
          <p data-testid="quiz-anchor-title" className="cik-subhead mt-2 text-cik-text-2">
            {localized.title}
          </p>
        )}
        <h2 data-testid="quiz-question-text" className="cik-title-3 mt-2 text-cik-text">
          {localized.quiz.question}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {prepared.options.map((optText, idx) => {
          const isThisSelected = selectedOption === idx;
          const isThisCorrect = idx === prepared.correctIndex;
          return (
            <motion.button
              key={`${currentEntry.id}-${idx}`}
              type="button"
              whileTap={!hasAnswered && !reduced ? { scale: 0.96 } : undefined}
              disabled={hasAnswered || rewardWatching}
              onClick={() => handleSelectOption(idx)}
              data-testid={`quiz-option-${idx}`}
              className={`cik-callout flex min-h-14 w-full items-center justify-between gap-3 rounded-cik-md px-4 text-left focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus ${optionStyle(idx)}`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="cik-footnote flex h-8 w-8 shrink-0 items-center justify-center rounded-cik-sm bg-cik-bg-elevated text-cik-text">
                  {optionLetters[idx] ?? idx + 1}
                </span>
                <span className="min-w-0 flex-1">{optText}</span>
              </span>
              {hasAnswered && isThisCorrect && (
                <CheckCircle2 size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" />
              )}
              {hasAnswered && isThisSelected && !isThisCorrect && (
                <XCircle size={20} strokeWidth={2} className="shrink-0" aria-hidden="true" />
              )}
            </motion.button>
          );
        })}
      </div>

      {!rewardUsed && (timeLeft <= 20 || timedOut) && (
        <Button
          tone="ghost"
          data-testid="quiz-reward-time-btn"
          disabled={rewardWatching}
          onClick={handleWatchRewardTime}
          className="mt-3 w-full bg-cik-butter text-cik-butter-text"
        >
          {rewardWatching ? t.rewardWatchingAd : t.rewardPlus15Btn}
        </Button>
      )}

      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            ref={explanationRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-live="polite"
            className={`mt-3 rounded-cik-md p-4 ${
              isCorrect ? 'bg-cik-mint text-cik-mint-text' : 'bg-cik-rose text-cik-rose-text'
            }`}
          >
            <p className="cik-headline cik-tabular inline-flex items-center gap-2">
              {!timedOut && isCorrect && comboStreak >= 2 && (
                <Flame size={16} strokeWidth={2} aria-hidden="true" />
              )}
              <span>
                {timedOut
                  ? t.quizTimeUp
                  : isCorrect
                    ? `${t.quizCorrect} (+${lastGainedXp} XP)`
                    : t.quizWrong}
              </span>
            </p>
            <p className="cik-callout mt-2">{topicExplanation}</p>
            {resolvedSource ? (
              <p className="cik-footnote mt-2 inline-flex items-center gap-2">
                <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                <span>{resolvedSource}</span>
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-cik-line bg-cik-surface px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {hasAnswered && (
          <Button data-testid="quiz-next-btn" className="w-full" onClick={handleContinue}>
            {isLastQuestion || timedOut ? t.quizFinish : t.quizNextQ}
            <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
          </Button>
        )}

        <div className="flex justify-center">
          <Button tone="ghost" onClick={onSkip}>
            {t.quizSkip}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
