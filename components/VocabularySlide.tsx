'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Check, Volume2 } from 'lucide-react';
import FullBleedReelsCanvas from '@/components/FullBleedReelsCanvas';
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
          className="rounded bg-indigo-400/40 px-1 font-extrabold text-white"
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
  cookieBannerVisible: _cookieBannerVisible = false,
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

  const quizPrompt = useMemo(
    () => (lang === 'tr' ? `"${card.word}" ne demek?` : `What does "${card.word}" mean?`),
    [card.word, lang]
  );

  // 2-option quiz from 3 options: correct + one distractor (deterministic by card id)
  const quizPair = useMemo(() => {
    const correct = card.quizOptions[card.correctIndex];
    const distractor =
      card.quizOptions.find((_, i) => i !== card.correctIndex) ?? card.quizOptions[0];
    let hash = 0;
    for (let i = 0; i < card.id.length; i += 1) hash += card.id.charCodeAt(i);
    const swap = hash % 2 === 0;
    const opts: [string, string] = swap ? [correct, distractor] : [distractor, correct];
    const correctIdx = opts[0] === correct ? 0 : 1;
    return { opts, correctIdx };
  }, [card.id, card.quizOptions, card.correctIndex]);

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
    void loadSavedVocabNotebook();
  };

  const handleQuizPick = (idx: number) => {
    if (solved) return;
    setSelectedOption(idx);
    const correct = idx === quizPair.correctIdx;
    if (correct) {
      setSolved(true);
      vibrateTap(30);
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
      className="reels-slide relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden select-none bg-[#09090B]"
    >
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden">
        <FullBleedReelsCanvas
          category="science"
          accentColor="#818CF8"
          isActive={isActive}
          lang={lang}
          onInteract={onButtonPop}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[58%] bg-gradient-to-t from-[#09090B] via-[#09090B]/75 to-transparent" />

        <div className="relative z-10 flex h-full w-full flex-col justify-end overflow-y-auto no-scrollbar px-4 pt-[108px] pb-[96px]">
          <div className="flex flex-col gap-3 pr-16">
            <span
              data-testid="vocab-badge"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-300/40 bg-indigo-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md"
            >
              {lang === 'tr' ? 'Dil Öğrenme' : 'Language'} • VOCABULARY
            </span>

            <div className="space-y-1">
              <h2
                data-testid="vocab-word"
                className="font-display text-4xl font-black leading-none text-white sm:text-5xl"
              >
                {card.word}
              </h2>
              <p className="font-mono text-sm font-semibold text-indigo-200">{card.phonetic}</p>
              <p className="text-xs font-extrabold uppercase tracking-wide text-white/60">
                {card.partOfSpeech}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSpeak(card.word, 'en-US', 0.9)}
                data-testid="vocab-listen-word-btn"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-extrabold text-[#09090B]"
              >
                <Volume2 className="h-4 w-4" />
                <span>{copy.listenEn}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSpeak(card.exampleEn, 'en-US', 0.9)}
                data-testid="vocab-listen-example-btn"
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-extrabold text-white backdrop-blur-md"
              >
                <Volume2 className="h-4 w-4" />
                <span>{lang === 'tr' ? 'Örneği Dinle' : 'Listen example'}</span>
              </button>
            </div>

            {audioUnavailable && (
              <p className="text-[11px] font-semibold text-amber-200">{copy.noAudioNotice}</p>
            )}

            <div className="space-y-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-md">
              <p className="text-base font-black text-emerald-300">{card.meaningTr}</p>
              <p className="text-sm font-semibold leading-snug text-white/85">{card.definitionEn}</p>
              <div className="h-px w-full bg-white/15" />
              <p className="text-[13px] font-bold leading-snug text-white">
                EN: {highlightWord(card.exampleEn, card.word)}
              </p>
              <p className="text-[13px] font-semibold leading-snug text-white/70">TR: {card.exampleTr}</p>
            </div>

            <div
              data-testid="vocab-quick-guess"
              className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3.5 py-3 backdrop-blur-md"
            >
              <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-amber-200">
                Quick Guess · +15 XP
              </p>
              <p className="mb-2.5 text-sm font-extrabold text-white">{quizPrompt}</p>
              <div className="grid grid-cols-2 gap-2">
                {quizPair.opts.map((opt, idx) => {
                  const picked = selectedOption === idx;
                  const isCorrect = idx === quizPair.correctIdx;
                  let style = 'border-white/20 bg-white/10 text-white';
                  if (solved && isCorrect) style = 'border-emerald-400 bg-emerald-500 text-white';
                  else if (picked && !isCorrect) style = 'border-rose-400 bg-rose-500/30 text-rose-100';
                  return (
                    <button
                      key={`${card.id}-q-${idx}`}
                      type="button"
                      onClick={() => handleQuizPick(idx)}
                      data-testid={`vocab-quiz-option-${idx}`}
                      className={`flex h-11 items-center justify-center rounded-xl border px-2 text-sm font-extrabold transition active:scale-[0.98] ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[104px] right-3 z-20 flex flex-col items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleSave}
            data-testid="vocab-save-btn"
            aria-label={copy.saveWordBtn}
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md ${
                saved ? 'bg-emerald-500 text-white' : 'bg-white/10 text-indigo-200'
              }`}
            >
              {saved ? <Check className="h-5 w-5" /> : <BookMarked className="h-5 w-5" />}
            </span>
            <span className="max-w-[58px] text-center text-[10px] font-extrabold leading-tight text-white">
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
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-indigo-200 backdrop-blur-md">
              <Volume2 className="h-5 w-5" />
            </span>
            <span className="text-[10.5px] font-extrabold text-white">Dinle</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
