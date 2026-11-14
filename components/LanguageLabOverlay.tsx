'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, Check, Languages, Sparkles, Volume2, X } from 'lucide-react';
import { FEED_EXPERIENCE_COPY, type Language } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { vibrateTap } from '@/utils/haptics';
import {
  buildFillBlankChallenge,
  extractVocabularyForFact,
  incrementVocabStreak,
  loadSavedVocabNotebook,
  loadVocabStreak,
  type SavedVocabEntry,
  speakVocabularyText,
  toggleSaveVocabEntry,
  type VocabItem,
} from '@/utils/languageLabData';

interface LanguageLabOverlayProps {
  fact: FactCard;
  lang: Language;
  open: boolean;
  onClose: () => void;
  onEarnXp?: (xp: number) => void;
  onButtonPop?: () => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

function renderHighlightedSentence(
  sentence: string,
  vocabItems: VocabItem[],
  selectedTerm: string,
  onSelectTerm: (item: VocabItem) => void
): React.ReactNode {
  if (!sentence || vocabItems.length === 0) return sentence;

  const escapedTerms = vocabItems
    .map((v) => v.termEn.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escapedTerms.length === 0) return sentence;

  const regex = new RegExp(`(\\b(?:${escapedTerms.join('|')})\\b)`, 'gi');
  const parts = sentence.split(regex);

  return parts.map((part, idx) => {
    const matched = vocabItems.find(
      (item) => item.termEn.toLowerCase() === part.toLowerCase()
    );
    if (!matched) {
      return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>;
    }
    const isSelected = matched.termEn.toLowerCase() === selectedTerm.toLowerCase();
    return (
      <button
        key={`kw-${idx}-${matched.id}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectTerm(matched);
        }}
        className={`mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 font-extrabold underline decoration-dotted underline-offset-2 transition-all ${
          isSelected
            ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-400 dark:text-slate-950'
            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-500/25 dark:text-indigo-200 dark:hover:bg-indigo-500/40'
        }`}
      >
        {part}
      </button>
    );
  });
}

export default function LanguageLabOverlay({
  fact,
  lang,
  open,
  onClose,
  onEarnXp,
  onButtonPop,
  onSuccessSound,
  onWrongSound,
}: LanguageLabOverlayProps) {
  const copy = FEED_EXPERIENCE_COPY[lang];
  const vocabItems = useMemo(() => extractVocabularyForFact(fact), [fact]);
  const fillChallenge = useMemo(() => buildFillBlankChallenge(fact), [fact]);

  const [selectedVocabId, setSelectedVocabId] = useState<string>('');
  const [savedEntries, setSavedEntries] = useState<SavedVocabEntry[]>([]);
  const [vocabStreak, setVocabStreak] = useState<number>(0);
  const [showNotebook, setShowNotebook] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [challengeSolved, setChallengeSolved] = useState<boolean>(false);
  const [xpAwarded, setXpAwarded] = useState<boolean>(false);
  const [audioUnavailable, setAudioUnavailable] = useState<boolean>(false);

  const selectedVocab = useMemo(() => {
    return vocabItems.find((item) => item.id === selectedVocabId) ?? vocabItems[0] ?? null;
  }, [vocabItems, selectedVocabId]);

  useEffect(() => {
    setSelectedVocabId(vocabItems[0]?.id ?? '');
    setSelectedOption(null);
    setChallengeSolved(false);
    setXpAwarded(false);
    setAudioUnavailable(false);
  }, [fact.id, vocabItems]);

  useEffect(() => {
    const syncNotebook = () => {
      setSavedEntries(loadSavedVocabNotebook());
      setVocabStreak(loadVocabStreak());
    };
    syncNotebook();
    window.addEventListener('scrolly-vocab-updated', syncNotebook);
    return () => window.removeEventListener('scrolly-vocab-updated', syncNotebook);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const isSelectedSaved = useMemo(() => {
    if (!selectedVocab) return false;
    const target = selectedVocab.termEn.trim().toLowerCase();
    return savedEntries.some((entry) => entry.termEn.trim().toLowerCase() === target);
  }, [selectedVocab, savedEntries]);

  const handleSpeak = (text: string, locale: 'en-US' | 'tr-TR') => {
    vibrateTap(12);
    const ok = speakVocabularyText(text, locale);
    if (!ok) {
      setAudioUnavailable(true);
    } else {
      setAudioUnavailable(false);
    }
  };

  const handleToggleSaveWord = () => {
    if (!selectedVocab) return;
    vibrateTap(18);
    onButtonPop?.();
    const res = toggleSaveVocabEntry({
      id: selectedVocab.id,
      termEn: selectedVocab.termEn,
      termTr: selectedVocab.termTr,
      partOfSpeech: selectedVocab.partOfSpeech,
      phonetic: selectedVocab.phonetic,
      exampleEn: selectedVocab.contextEn,
      exampleTr: selectedVocab.contextTr,
      factId: fact.id,
    });
    setSavedEntries(res.entries);
  };

  const handleSelectBlankOption = (optionIdx: number) => {
    if (challengeSolved) return;
    setSelectedOption(optionIdx);
    const isCorrect = optionIdx === fillChallenge.correctIndex;
    if (isCorrect) {
      setChallengeSolved(true);
      vibrateTap(30);
      onSuccessSound?.();
      const updatedStreak = incrementVocabStreak();
      setVocabStreak(updatedStreak);
      if (!xpAwarded) {
        setXpAwarded(true);
        onEarnXp?.(20);
      }
    } else {
      vibrateTap(16);
      onWrongSound?.();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="language-lab-overlay"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          data-testid="language-lab-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={copy.languageLabBadge}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 flex flex-col justify-end bg-slate-950/55 backdrop-blur-sm md:items-center md:justify-center md:p-4"
        >
          <div className="no-scrollbar relative flex max-h-[86dvh] w-full flex-col overflow-y-auto rounded-t-3xl border border-indigo-200/70 bg-white/98 px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3.5 text-ink shadow-2xl md:max-h-[82dvh] md:max-w-[500px] md:rounded-3xl dark:border-indigo-400/25 dark:bg-slate-900/98 dark:text-slate-100">
            {/* Top Grabber + Header */}
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Languages className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      {copy.languageLabBadge}
                    </span>
                    {vocabStreak > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        🔥 {vocabStreak}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {copy.languageLabSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap(10);
                    setShowNotebook((prev) => !prev);
                  }}
                  data-testid="vocab-notebook-toggle"
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                >
                  <BookMarked className="h-3.5 w-3.5" />
                  <span>{savedEntries.length}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.closeSheetLabel}
                  data-testid="language-lab-close-btn"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:border-white/15 dark:bg-white/10 dark:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showNotebook ? (
              <div className="space-y-2 py-1" data-testid="vocab-notebook-list">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-ink dark:text-white">
                    {copy.vocabNotebookTitle} ({savedEntries.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNotebook(false)}
                    className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                  >
                    {lang === 'tr' ? 'Karta Dön' : 'Back to Card'}
                  </button>
                </div>
                {savedEntries.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs font-medium text-slate-500 dark:border-white/15 dark:text-slate-400">
                    {lang === 'tr'
                      ? 'Henüz kelime kaydetmedin. Vurgulu kelimelere dokunup defterine ekle!'
                      : 'No saved words yet. Tap any highlighted word to save it!'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                              {entry.termEn}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {entry.phonetic}
                            </span>
                          </div>
                          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {entry.termTr}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSpeak(entry.termEn, 'en-US')}
                          aria-label={`${copy.listenEn}: ${entry.termEn}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Side-by-side Aligned English + Turkish Sentences */}
                <div className="space-y-2 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-white/10 dark:bg-slate-800/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-block rounded bg-indigo-600 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white">
                        EN
                      </span>
                      <p className="text-[13.5px] font-bold leading-snug text-ink dark:text-white">
                        {renderHighlightedSentence(
                          `${fact.en.title} — ${fact.en.factText}`,
                          vocabItems,
                          selectedVocab?.termEn ?? '',
                          (item) => {
                            vibrateTap(10);
                            setSelectedVocabId(item.id);
                          }
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeak(`${fact.en.title}. ${fact.en.factText}`, 'en-US')}
                      aria-label={copy.listenEn}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300 dark:ring-white/15"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="h-px w-full bg-slate-200/80 dark:bg-white/10" />

                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-block rounded bg-emerald-600 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white">
                        TR
                      </span>
                      <p className="text-[13px] font-semibold leading-snug text-slate-700 dark:text-slate-200">
                        {fact.tr.title} — {fact.tr.factText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeak(`${fact.tr.title}. ${fact.tr.factText}`, 'tr-TR')}
                      aria-label={copy.listenTr}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:ring-white/15"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Highlighted Vocabulary Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {vocabItems.map((item) => {
                    const active = item.id === selectedVocab?.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          vibrateTap(10);
                          setSelectedVocabId(item.id);
                        }}
                        data-testid={`vocab-chip-${item.termEn}`}
                        className={`min-h-[34px] rounded-full border px-3 py-1 text-xs font-extrabold transition ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                            : 'border-indigo-200 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-200'
                        }`}
                      >
                        {item.termEn}
                      </button>
                    );
                  })}
                </div>

                {/* Active Word Card */}
                {selectedVocab && (
                  <div
                    data-testid="vocab-detail-card"
                    className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-3.5 shadow-sm dark:border-indigo-400/25 dark:from-indigo-950/50 dark:to-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-indigo-900 dark:text-indigo-100">
                            {selectedVocab.termEn}
                          </span>
                          <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {selectedVocab.phonetic}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                            {selectedVocab.partOfSpeech}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                          {selectedVocab.termTr}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSpeak(selectedVocab.termEn, 'en-US')}
                          data-testid="vocab-speak-en-btn"
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>{copy.listenEn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSpeak(selectedVocab.termTr, 'tr-TR')}
                          data-testid="vocab-speak-tr-btn"
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>{copy.listenTr}</span>
                        </button>
                      </div>
                    </div>

                    {audioUnavailable && (
                      <p className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        {copy.noAudioNotice}
                      </p>
                    )}

                    <div className="mt-2.5 space-y-1 rounded-xl bg-white/85 px-2.5 py-2 text-[11.5px] leading-snug text-slate-700 dark:bg-black/25 dark:text-slate-300">
                      <p className="font-semibold">{selectedVocab.contextEn}</p>
                      <p className="text-slate-500 dark:text-slate-400">{selectedVocab.contextTr}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSaveWord}
                      data-testid="save-vocab-word-btn"
                      className={`mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        isSelectedSaved
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : 'bg-ink text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                      }`}
                    >
                      {isSelectedSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>{copy.savedWordBtn}</span>
                        </>
                      ) : (
                        <>
                          <BookMarked className="h-3.5 w-3.5" />
                          <span>{copy.saveWordBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 3-Option Fill the Blank Mini Challenge */}
                <div
                  data-testid="fill-blank-challenge"
                  className="rounded-2xl border border-amber-200/90 bg-amber-50/75 p-3 dark:border-amber-400/25 dark:bg-amber-950/30"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {copy.fillBlankTitle}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {fillChallenge.targetMeaningTr}
                    </span>
                  </div>

                  <p className="mb-2.5 text-xs font-bold leading-snug text-ink dark:text-white">
                    {challengeSolved ? fillChallenge.fullSentence : fillChallenge.sentenceWithBlank}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {fillChallenge.options.map((opt, idx) => {
                      const isPicked = selectedOption === idx;
                      const isCorrectOpt = idx === fillChallenge.correctIndex;
                      let btnStyle =
                        'border-slate-200 bg-white text-ink hover:bg-amber-100/70 dark:border-white/15 dark:bg-slate-900 dark:text-white';
                      if (challengeSolved && isCorrectOpt) {
                        btnStyle =
                          'border-emerald-500 bg-emerald-500 text-white shadow-sm';
                      } else if (isPicked && !isCorrectOpt) {
                        btnStyle =
                          'border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200';
                      }

                      return (
                        <button
                          key={`${fact.id}-opt-${idx}`}
                          type="button"
                          onClick={() => handleSelectBlankOption(idx)}
                          data-testid={`fill-blank-option-${idx}`}
                          className={`min-h-[44px] truncate rounded-xl border px-2 py-2 text-xs font-extrabold transition active:scale-95 ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption !== null && (
                    <p
                      className={`mt-2 text-center text-[11.5px] font-extrabold ${
                        challengeSolved
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {challengeSolved
                        ? copy.fillBlankCorrect.replace('{xp}', '20')
                        : copy.fillBlankTryAgain}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
