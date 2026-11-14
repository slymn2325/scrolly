'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Check, Volume2 } from 'lucide-react';
import { FEED_EXPERIENCE_COPY, type Language } from '@/i18n/translations';
import type { VocabularyCard } from '@/types/vocabulary';
import { vibrateTap } from '@/utils/haptics';
import {
  isVocabWordSaved,
  loadSavedVocabNotebook,
  speakVocabularyText,
  toggleSaveVocabularyCard,
} from '@/utils/vocabNotebook';

interface VocabularySlideProps {
  card: VocabularyCard;
  lang: Language;
  isActive?: boolean;
  cookieBannerVisible?: boolean;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, idx) => {
    if (part.toLowerCase() === word.toLowerCase()) {
      return (
        <mark
          key={`hw-${idx}`}
          className="rounded bg-indigo-200/90 px-1 font-extrabold text-indigo-950 dark:bg-indigo-400/35 dark:text-indigo-50"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={`tx-${idx}`}>{part}</React.Fragment>;
  });
}

export default function VocabularySlide({
  card,
  lang,
  isActive = true,
  cookieBannerVisible = false,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: VocabularySlideProps) {
  const copy = FEED_EXPERIENCE_COPY[lang];
  const [saved, setSaved] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  useEffect(() => {
    setSaved(isVocabWordSaved(card.word));
    setSelectedOption(null);
    setSolved(false);
    setXpAwarded(false);
    setAudioUnavailable(false);
  }, [card.id, card.word]);

  useEffect(() => {
    const sync = () => setSaved(isVocabWordSaved(card.word));
    window.addEventListener('scrolly-vocab-updated', sync);
    return () => window.removeEventListener('scrolly-vocab-updated', sync);
  }, [card.word]);

  const bottomPad = cookieBannerVisible
    ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
    : 'pb-[calc(94px+env(safe-area-inset-bottom))]';

  const quizPrompt = useMemo(
    () => (lang === 'tr' ? `"${card.word}" ne demek?` : `What does "${card.word}" mean?`),
    [card.word, lang]
  );

  const handleSpeak = (text: string, locale: 'en-US' | 'tr-TR', rate = 0.9) => {
    vibrateTap(12);
    const ok = speakVocabularyText(text, locale, rate);
    setAudioUnavailable(!ok);
  };

  const handleToggleSave = () => {
    vibrateTap(18);
    onButtonPop();
    const res = toggleSaveVocabularyCard(card);
    setSaved(res.saved);
    // Touch notebook so Profil & Seri can re-read immediately
    void loadSavedVocabNotebook();
  };

  const handleQuizPick = (idx: number) => {
    if (solved) return;
    setSelectedOption(idx);
    const correct = idx === card.correctIndex;
    if (correct) {
      setSolved(true);
      vibrateTap(28);
      onSuccessSound?.();
      if (!xpAwarded) {
        setXpAwarded(true);
        onEarnXp?.(15, 'vocabulary_quiz');
      }
    } else {
      vibrateTap(14);
      onWrongSound?.();
    }
  };

  return (
    <div
      data-testid="vocabulary-slide"
      data-vocab-id={card.id}
      data-active={isActive ? 'true' : 'false'}
      className="reels-slide relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden select-none"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-indigo-100 via-slate-50 to-violet-100 dark:from-indigo-950 dark:via-slate-950 dark:to-slate-950"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden">
        <div
          className={`relative z-10 flex h-full w-full flex-col justify-between overflow-y-auto no-scrollbar px-4 pt-[calc(5.8rem+env(safe-area-inset-top))] ${bottomPad}`}
        >
          <div className="flex flex-col gap-3 pr-[76px]">
            <span
              data-testid="vocab-badge"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm"
            >
              {lang === 'tr' ? 'Dil Öğrenme' : 'Language'} • VOCABULARY
            </span>

            <div className="space-y-1">
              <h2
                data-testid="vocab-word"
                className="font-display text-4xl font-black leading-none text-ink dark:text-white sm:text-5xl"
              >
                {card.word}
              </h2>
              <p className="font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {card.phonetic}
              </p>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {card.partOfSpeech}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSpeak(card.word, 'en-US', 0.9)}
                data-testid="vocab-listen-word-btn"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm"
              >
                <Volume2 className="h-4 w-4" />
                <span>{copy.listenEn}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSpeak(card.exampleEn, 'en-US', 0.9)}
                data-testid="vocab-listen-example-btn"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-indigo-300 bg-white px-3.5 py-2 text-xs font-extrabold text-indigo-800 shadow-sm dark:border-indigo-400/40 dark:bg-slate-900 dark:text-indigo-200"
              >
                <Volume2 className="h-4 w-4" />
                <span>{lang === 'tr' ? 'Örneği Dinle' : 'Listen example'}</span>
              </button>
            </div>

            {audioUnavailable && (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                {copy.noAudioNotice}
              </p>
            )}

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                {card.meaningTr}
              </p>
              <p className="text-sm font-semibold leading-snug text-slate-700 dark:text-slate-200">
                {card.definitionEn}
              </p>
              <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
              <p className="text-[13px] font-bold leading-snug text-ink dark:text-white">
                EN: {highlightWord(card.exampleEn, card.word)}
              </p>
              <p className="text-[13px] font-semibold leading-snug text-slate-600 dark:text-slate-300">
                TR: {card.exampleTr}
              </p>
            </div>

            <div
              data-testid="vocab-quick-guess"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-400/30 dark:bg-amber-950/40"
            >
              <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Quick Guess · +15 XP
              </p>
              <p className="mb-2.5 text-sm font-extrabold text-ink dark:text-white">{quizPrompt}</p>
              <div className="grid grid-cols-1 gap-2">
                {card.quizOptions.map((opt, idx) => {
                  const picked = selectedOption === idx;
                  const isCorrect = idx === card.correctIndex;
                  let style =
                    'border-slate-200 bg-white text-ink dark:border-white/15 dark:bg-slate-900 dark:text-white';
                  if (solved && isCorrect) {
                    style = 'border-emerald-500 bg-emerald-500 text-white';
                  } else if (picked && !isCorrect) {
                    style =
                      'border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200';
                  }
                  return (
                    <button
                      key={`${card.id}-q-${idx}`}
                      type="button"
                      onClick={() => handleQuizPick(idx)}
                      data-testid={`vocab-quiz-option-${idx}`}
                      className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition active:scale-[0.98] ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right action column — z-20 */}
        <div
          className={`absolute right-3 z-20 flex flex-col items-center gap-3 ${
            cookieBannerVisible
              ? 'bottom-[calc(154px+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(94px+env(safe-area-inset-bottom))]'
          }`}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleSave}
            data-testid="vocab-save-btn"
            aria-label={copy.saveWordBtn}
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                saved
                  ? 'border-emerald-400 bg-emerald-500 text-white shadow-lg'
                  : 'border-slate-200 bg-white text-indigo-700 shadow-md dark:border-white/20 dark:bg-slate-900 dark:text-indigo-300'
              }`}
            >
              {saved ? <Check className="h-5 w-5" /> : <BookMarked className="h-5 w-5" />}
            </span>
            <span className="max-w-[58px] text-center text-[10px] font-extrabold leading-tight text-ink dark:text-white">
              {saved ? copy.savedWordBtn : copy.saveWordBtn}
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSpeak(card.word, 'en-US', 0.9)}
            aria-label={copy.listenEn}
            className="flex flex-col items-center gap-0.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-700 shadow-md dark:border-white/20 dark:bg-slate-900 dark:text-indigo-300">
              <Volume2 className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] font-extrabold text-ink dark:text-white">Dinle</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
