'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, BookMarked, ChevronDown, ChevronUp, Share, Volume2 } from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import { FEED_EXPERIENCE_COPY, translations, type Language } from '@/i18n/translations';
import { motionTiming } from '@/lib/motion';
import { trackEvent } from '@/lib/telemetry';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
import { vibrateTap } from '@/utils/haptics';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';
import {
  isVocabWordSaved,
  loadSavedVocabNotebook,
  speakVocabularyText,
  toggleSaveVocabularyCard,
} from '@/utils/vocabNotebook';

interface VocabularySlideProps {
  card: VocabularyCard;
  lang: Language;
  darkMode?: boolean;
  isActive?: boolean;
  priority?: boolean;
  cookieBannerVisible?: boolean;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

const PART_OF_SPEECH_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedSentence(sentence: string, word: string): React.ReactNode {
  const cleanWord = word.trim();
  if (!cleanWord) return sentence;
  const regex = new RegExp(`(\\b${escapeRegExp(cleanWord)}[a-z]*\\b)`, 'gi');
  const parts = sentence.split(regex);
  if (parts.length <= 1) return sentence;
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx} className="font-extrabold text-cik-cta">
        {part}
      </strong>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

function buildVocabQuizChoices(card: VocabularyCard): {
  options: string[];
  correctIdx: number;
} {
  const wordLower = card.word.trim().toLowerCase();
  const fallbackDistractors = ['yanlış anlam', 'alakasız', 'zıt anlam', 'nadir kullanım'];
  const rawOptions = card.quizOptions
    .map((opt) => opt?.trim() || '')
    .filter(Boolean)
    .slice(0, 4);
  while (rawOptions.length < 3) {
    const filler =
      fallbackDistractors.find((item) => !rawOptions.some((o) => o.toLowerCase() === item)) ||
      `seçenek ${rawOptions.length + 1}`;
    rawOptions.push(filler);
  }

  const safeCorrectIdx = Math.min(
    Math.max(0, card.correctIndex),
    Math.max(0, rawOptions.length - 1)
  );
  const correctRaw = rawOptions[safeCorrectIdx];
  const resolvedCorrect =
    correctRaw && correctRaw.toLowerCase() !== wordLower ? correctRaw : card.meaningTr.trim();

  const seen = new Set<string>([resolvedCorrect.toLowerCase()]);
  const sanitized = rawOptions.map((opt, idx) => {
    if (idx === safeCorrectIdx) return resolvedCorrect;
    const low = opt.toLowerCase();
    if (opt && low !== wordLower && !seen.has(low)) {
      seen.add(low);
      return opt;
    }
    const candidate =
      fallbackDistractors.find((item) => !seen.has(item.toLowerCase())) || 'farklı anlam';
    seen.add(candidate.toLowerCase());
    return candidate;
  });

  return {
    options: sanitized,
    correctIdx: safeCorrectIdx,
  };
}

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('scrolly-toast', { detail: { text } }));
}

export default function VocabularySlide({
  card,
  lang,
  isActive = true,
  priority: _priority = false,
  cookieBannerVisible = false,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: VocabularySlideProps) {
  const copy = FEED_EXPERIENCE_COPY[lang];
  const t = translations[lang];
  const reduced = useReducedMotion() === true;

  const [saved, setSaved] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [wrongIndices, setWrongIndices] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);

  useEffect(() => {
    setSaved(isVocabWordSaved(card.word));
    setWrongIndices([]);
    setSolved(false);
    setXpAwarded(false);
    setAudioUnavailable(false);
    setIsDetailsOpen(false);
  }, [card.id, card.word]);

  useEffect(() => {
    if (!isActive) setIsDetailsOpen(false);
  }, [isActive]);

  useEffect(() => {
    const onCardAction = (event: Event) => {
      const detail = (event as CustomEvent<{ vocabId?: string; action?: string }>).detail;
      if (!detail || detail.vocabId !== card.id) return;
      if (detail.action === 'detail') {
        onButtonPop();
        setIsDetailsOpen((prev) => !prev);
      }
    };
    window.addEventListener('scrolly-card-action', onCardAction as EventListener);
    return () => window.removeEventListener('scrolly-card-action', onCardAction as EventListener);
  }, [card.id, onButtonPop]);

  useEffect(() => {
    const sync = () => setSaved(isVocabWordSaved(card.word));
    window.addEventListener('scrolly-vocab-updated', sync);
    return () => window.removeEventListener('scrolly-vocab-updated', sync);
  }, [card.word]);

  const quiz = useMemo(() => buildVocabQuizChoices(card), [card]);
  const posLabel = PART_OF_SPEECH_LABELS[card.partOfSpeech]?.[lang] || card.partOfSpeech;
  const cefrLabel = (card.cefrLevel || 'B2/C1').trim().toUpperCase();
  const synonyms = useMemo(
    () => (card.synonyms || []).map((item) => item.trim()).filter(Boolean).slice(0, 2),
    [card.synonyms]
  );
  const phonetic = formatPhoneticForDisplay(card.phonetic);

  const handleToggleDetails = () => {
    vibrateTap(10);
    onButtonPop();
    setIsDetailsOpen((prev) => !prev);
  };

  const handleSpeak = (text: string, locale: 'en-US' | 'tr-TR', rate = 1) => {
    vibrateTap(12);
    onButtonPop();
    const ok = speakVocabularyText(text, locale, rate);
    setAudioUnavailable(!ok);
  };

  const handleMobileSave = () => {
    vibrateTap(18);
    onButtonPop();
    const res = toggleSaveVocabularyCard(card);
    setSaved(res.saved);
    void trackEvent(card.id, 'vocabulary', res.saved ? 'save' : 'unsave', {
      item_type: 'vocabulary',
      word: card.word,
    });
    void loadSavedVocabNotebook();
    toast(
      res.saved
        ? lang === 'tr'
          ? 'Kelime defterine eklendi'
          : 'Saved to Word Notebook'
        : lang === 'tr'
          ? 'Kelime defterinden çıkarıldı'
          : 'Removed from Word Notebook'
    );
  };

  const handleShare = async () => {
    vibrateTap(12);
    onButtonPop();
    const text = `${card.word} ${phonetic} — ${card.meaningTr}`;
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: card.word, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast(t.copiedLink);
    } catch {
      // The share sheet can be dismissed without a failure toast.
    }
  };

  const handleNotebook = () => {
    vibrateTap(12);
    onButtonPop();
    if (!isVocabWordSaved(card.word)) {
      const res = toggleSaveVocabularyCard(card);
      setSaved(res.saved);
      void trackEvent(card.id, 'vocabulary', res.saved ? 'save' : 'unsave', {
        item_type: 'vocabulary',
        word: card.word,
      });
    }
    window.dispatchEvent(
      new CustomEvent('scrolly-open-tab', { detail: { tab: 'diploma', section: 'vocab' } })
    );
    toast(copy.vocabNotebookTitle);
  };

  const handleQuizPick = (idx: number) => {
    if (solved) return;
    const isCorrect = idx === quiz.correctIdx;
    const willAwardXp = isCorrect && !xpAwarded;
    void trackEvent(card.id, 'vocabulary', 'quiz_answer', {
      correct: isCorrect,
      category: 'vocabulary',
      surface: 'vocabulary_slide',
      award_xp: willAwardXp,
      word: card.word,
    });
    if (isCorrect) {
      setSolved(true);
      vibrateTap(30);
      onSuccessSound?.();
      if (!xpAwarded) {
        setXpAwarded(true);
        onEarnXp?.(15, 'vocabulary_quiz');
      }
    } else {
      setWrongIndices((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
      vibrateTap(14);
      onWrongSound?.();
    }
  };

  const bottomPad = cookieBannerVisible
    ? 'pb-[calc(env(safe-area-inset-bottom)+96px)]'
    : 'pb-[calc(env(safe-area-inset-bottom)+80px)]';

  return (
    <div
      data-testid="vocabulary-slide"
      data-vocab-id={card.id}
      data-active={isActive ? 'true' : 'false'}
      className={`relative flex h-full w-full flex-col overflow-y-auto bg-cik-bg px-4 pt-16 text-cik-text ${bottomPad}`}
    >
      <div className="m-auto flex w-full max-w-md items-center gap-3 py-4">
        <article
          role="article"
          aria-roledescription={lang === 'tr' ? 'kart' : 'card'}
          className="min-w-0 flex-1 rounded-sticker border-4 border-cik-sticker-rim bg-cik-pink p-5 text-cik-text shadow-sticker"
        >
          <div data-testid="vocab-media-stage" className="flex items-center justify-center gap-3">
            <img
              src="/assets/fluent/books.png"
              alt=""
              width={72}
              height={72}
              decoding="async"
              className="h-[72px] w-[72px] object-contain"
            />
            <img
              src="/assets/fluent/speech-balloon.png"
              alt=""
              width={40}
              height={40}
              decoding="async"
              className="h-10 w-10 object-contain"
            />
          </div>

          <p data-testid="vocab-badge" className="cik-footnote mt-3 text-center text-cik-text-2">
            {posLabel} · {cefrLabel}
          </p>
          <h2 data-testid="vocab-word" className="cik-large-title mt-1 text-center text-cik-text">
            {card.word}
          </h2>
          <p className="mt-1 text-center font-mono text-cik-text-2">
            <span
              data-testid="vocab-phonetic"
              data-phonetic="true"
              aria-label={phonetic}
            >
              {phonetic}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleSpeak(card.word, 'en-US', 1);
              }}
              data-testid="vocab-listen-word-btn"
              className="cik-footnote inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span>{lang === 'tr' ? 'Dinle' : 'Listen'}</span>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleSpeak(card.word, 'en-US', 0.75);
              }}
              data-testid="vocab-listen-slow-btn"
              className="cik-footnote inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span>{lang === 'tr' ? 'Yavaş' : 'Slow'}</span>
            </button>
          </div>

          {audioUnavailable ? (
            <p className="cik-caption-1 mt-2 text-center text-cik-butter-text">{copy.noAudioNotice}</p>
          ) : null}

          <p data-testid="vocab-context-sentence" className="cik-callout mt-4 text-cik-text">
            {renderHighlightedSentence(card.exampleEn, card.word)}
          </p>

          <div data-testid="vocab-quick-guess" className="mt-4 rounded-cik-md bg-cik-surface-2 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="cik-footnote text-cik-text">
                {lang === 'tr'
                  ? `"${card.word}" kelimesinin anlamı hangisi?`
                  : `Which meaning matches "${card.word}"?`}
              </p>
              <span className="cik-caption-2 shrink-0 rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
                +15 XP
              </span>
            </div>
            <div className="grid gap-2">
              {quiz.options.map((opt, idx) => {
                const isCorrect = idx === quiz.correctIdx;
                const pickedWrong = wrongIndices.includes(idx);
                let style = 'border-cik-line bg-cik-surface text-cik-text';
                if (solved && isCorrect) style = 'border-cik-mint bg-cik-mint text-cik-mint-text';
                else if (pickedWrong) style = 'border-cik-rose bg-cik-rose text-cik-rose-text';
                return (
                  <button
                    key={`${card.id}-q-${idx}`}
                    type="button"
                    onClick={() => handleQuizPick(idx)}
                    data-testid={`vocab-quiz-option-${idx}`}
                    data-option-text={opt}
                    className={`cik-footnote flex min-h-[52px] w-full items-center justify-center rounded-cik-md border px-3 py-3 text-center ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {!solved && wrongIndices.length > 0 ? (
              <p data-testid="vocab-wrong-feedback" className="cik-caption-1 mt-2 text-cik-rose-text">
                {lang === 'tr' ? 'Bu sefer olmadı. Bir kez daha dene.' : 'Not quite. Try another.'}
              </p>
            ) : null}
            {solved ? (
              <div data-testid="vocab-meaning-reveal" className="mt-3 rounded-cik-md bg-cik-mint p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="cik-headline text-cik-mint-text">{card.meaningTr}</p>
                  <span data-testid="vocab-xp-badge" className="cik-caption-1 text-cik-mint-text">
                    +15 XP
                  </span>
                </div>
                <p className="cik-footnote mt-1 text-cik-mint-text">{card.definitionEn}</p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            data-testid="vocab-expand-trigger"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleDetails();
            }}
            className="cik-footnote mt-3 flex h-11 w-full items-center justify-between rounded-pill bg-cik-surface px-3 text-cik-text"
          >
            <span>{lang === 'tr' ? 'Biraz daha' : 'A bit more'}</span>
            {isDetailsOpen ? (
              <ChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {isDetailsOpen ? (
              <motion.div
                key={`vocab-drawer-${card.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduced ? motionTiming.reducedFade : motionTiming.cardFade}
                data-testid="vocab-expanded-drawer"
                className="mt-3 rounded-cik-md bg-cik-surface p-3"
              >
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    data-testid="vocab-collapse-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleDetails();
                    }}
                    className="cik-caption-1 inline-flex h-11 items-center gap-1 rounded-pill px-3 text-cik-text-2"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'tr' ? 'Daralt' : 'Collapse'}</span>
                  </button>
                </div>
                {synonyms.length > 0 ? (
                  <div data-testid="vocab-synonyms" className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="cik-caption-1 text-cik-text-2">
                      {lang === 'tr' ? 'Eş anlam' : 'Synonyms'}
                    </span>
                    {synonyms.map((syn) => (
                      <span key={syn} className="cik-caption-1 rounded-pill bg-cik-pink px-2 py-1 text-cik-text">
                        {syn}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="cik-footnote mt-2 text-cik-text">{card.exampleTr}</p>
                <button
                  type="button"
                  onClick={() => handleSpeak(card.exampleEn, 'en-US', 0.9)}
                  data-testid="vocab-listen-example-btn"
                  className="cik-caption-1 mt-2 inline-flex h-11 items-center gap-2 rounded-pill border border-cik-line px-3 text-cik-text"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'tr' ? 'Örneği dinle' : 'Listen example'}</span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </article>

        <div className="flex shrink-0 flex-col gap-2 lg:hidden">
          <IconButton
            label={saved ? copy.savedWordBtn : copy.saveWordBtn}
            data-testid="vocab-mobile-save-btn"
            onClick={(event) => {
              event.stopPropagation();
              handleMobileSave();
            }}
            className={saved ? 'bg-cik-butter text-cik-butter-text' : ''}
          >
            {saved ? (
              <Bookmark className="h-6 w-6" aria-hidden="true" fill="currentColor" />
            ) : (
              <Bookmark className="h-6 w-6" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={t.shareFact}
            data-testid="vocab-share-btn"
            onClick={(event) => {
              event.stopPropagation();
              void handleShare();
            }}
          >
            <Share className="h-6 w-6" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={copy.vocabNotebookTitle}
            data-testid="vocab-notebook-btn"
            onClick={(event) => {
              event.stopPropagation();
              handleNotebook();
            }}
          >
            <BookMarked className="h-6 w-6" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
