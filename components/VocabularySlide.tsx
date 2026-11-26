'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bookmark,
  BookMarked,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Heart,
  RotateCw,
  Share,
  Volume2,
} from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { FEED_EXPERIENCE_COPY, translations, type Language } from '@/i18n/translations';
import { motionTiming } from '@/lib/motion';
import { trackEvent } from '@/lib/telemetry';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
import { vibrateTap } from '@/utils/haptics';
import { isFactLiked, toggleLikedFact } from '@/utils/likedFacts';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';
import { fisherYatesShuffle } from '@/utils/recommendation';
import {
  isVocabMastered,
  isVocabWordSaved,
  loadSavedVocabNotebook,
  speakVocabularyText,
  toggleSaveVocabularyCard,
  toggleVocabMastered,
} from '@/utils/vocabNotebook';

const VOCAB_QUIZ_SESSION_KEY = 'scrolly_vocab_quiz_state_v1';

interface SavedVocabQuizProgress {
  solved: boolean;
  xpAwarded: boolean;
  wrongOptions?: string[];
}

function readVocabQuizProgress(cardId: string): SavedVocabQuizProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(VOCAB_QUIZ_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, SavedVocabQuizProgress>;
    return parsed?.[cardId] ?? null;
  } catch {
    return null;
  }
}

function writeVocabQuizProgress(cardId: string, state: SavedVocabQuizProgress): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(VOCAB_QUIZ_SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SavedVocabQuizProgress>) : {};
    parsed[cardId] = state;
    window.sessionStorage.setItem(VOCAB_QUIZ_SESSION_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore sessionStorage errors
  }
}

interface VocabularySlideProps {
  card: VocabularyCard;
  vocabPool?: VocabularyCard[];
  lang: Language;
  darkMode?: boolean;
  isActive?: boolean;
  priority?: boolean;
  cookieBannerVisible?: boolean;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onOpenShare?: (card: VocabularyCard) => void;
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

function buildVocabQuizChoices(
  card: VocabularyCard,
  pool: VocabularyCard[],
  lang: Language
): {
  options: string[];
  correctIdx: number;
} {
  if (lang === 'en') {
    const targetDef = card.definitionEn.trim();
    const samePos = pool.filter(
      (other) =>
        other.id !== card.id &&
        other.partOfSpeech === card.partOfSpeech &&
        other.definitionEn.trim().toLowerCase() !== targetDef.toLowerCase()
    );
    const diffPos = pool.filter(
      (other) =>
        other.id !== card.id &&
        other.partOfSpeech !== card.partOfSpeech &&
        other.definitionEn.trim().toLowerCase() !== targetDef.toLowerCase()
    );
    const distractors: string[] = [];
    const seen = new Set<string>([targetDef.toLowerCase()]);
    for (const candidate of fisherYatesShuffle([...samePos, ...diffPos], `${card.id}-distractors`)) {
      const def = candidate.definitionEn.trim();
      if (!def || seen.has(def.toLowerCase())) continue;
      seen.add(def.toLowerCase());
      distractors.push(def);
      if (distractors.length >= 2) break;
    }
    const enFallbacks = [
      'Happening rarely and only under unusual conditions.',
      'Relating purely to surface appearance without structure.',
    ];
    while (distractors.length < 2) {
      distractors.push(enFallbacks[distractors.length]);
    }
    const shuffled = fisherYatesShuffle(
      [
        { text: targetDef, isCorrect: true },
        { text: distractors[0], isCorrect: false },
        { text: distractors[1], isCorrect: false },
      ],
      `${card.id}-en-vocab`
    );
    return {
      options: shuffled.map((item) => item.text),
      correctIdx: Math.max(
        0,
        shuffled.findIndex((item) => item.isCorrect)
      ),
    };
  }

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
  vocabPool,
  lang,
  isActive = true,
  priority: _priority = false,
  cookieBannerVisible = false,
  onButtonPop,
  onEarnXp,
  onOpenShare,
  onSuccessSound,
  onWrongSound,
}: VocabularySlideProps) {
  const copy = FEED_EXPERIENCE_COPY[lang];
  const t = translations[lang];
  const reduced = useReducedMotion() === true;
  const vocabScrollRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [mastered, setMastered] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [playingTarget, setPlayingTarget] = useState<'word' | 'slow' | 'example' | null>(null);

  const poolForQuiz = useMemo(
    () => (vocabPool && vocabPool.length > 0 ? vocabPool : getVocabularyFacts()),
    [vocabPool]
  );

  useEffect(() => {
    setSaved(isVocabWordSaved(card.word));
    setLiked(isFactLiked(card.id));
    setMastered(isVocabMastered(card.id) || isVocabMastered(card.word));
    const persisted = readVocabQuizProgress(card.id);
    setSolved(Boolean(persisted?.solved));
    setXpAwarded(Boolean(persisted?.xpAwarded));
    setWrongOptions(Array.isArray(persisted?.wrongOptions) ? persisted.wrongOptions : []);
    setAudioUnavailable(false);
    setPlayingTarget(null);
    setIsDetailsOpen(false);
  }, [card.id, card.word]);

  useEffect(() => {
    if (!isActive) {
      setIsDetailsOpen(false);
      setPlayingTarget(null);
    }
  }, [isActive]);

  useEffect(() => {
    const onCloseOverlays = () => setIsDetailsOpen(false);
    window.addEventListener('scrolly-close-card-overlays', onCloseOverlays);
    return () => window.removeEventListener('scrolly-close-card-overlays', onCloseOverlays);
  }, []);

  useEffect(() => {
    const sync = () => {
      setSaved(isVocabWordSaved(card.word));
      setMastered(isVocabMastered(card.id) || isVocabMastered(card.word));
    };
    const syncLiked = () => setLiked(isFactLiked(card.id));
    window.addEventListener('scrolly-vocab-updated', sync);
    window.addEventListener('scrolly-liked-facts-updated', syncLiked);
    return () => {
      window.removeEventListener('scrolly-vocab-updated', sync);
      window.removeEventListener('scrolly-liked-facts-updated', syncLiked);
    };
  }, [card.word, card.id]);

  const quiz = useMemo(
    () => buildVocabQuizChoices(card, poolForQuiz, lang),
    [card, poolForQuiz, lang]
  );
  const posLabel = PART_OF_SPEECH_LABELS[card.partOfSpeech]?.[lang] || card.partOfSpeech;
  const cefrLabel = (card.cefrLevel || 'B2/C1').trim().toUpperCase();
  const synonyms = useMemo(
    () => (card.synonyms || []).map((item) => item.trim()).filter(Boolean).slice(0, 2),
    [card.synonyms]
  );
  const phonetic = formatPhoneticForDisplay(card.phonetic);

  const handleToggleDetails = useCallback(() => {
    vibrateTap(10);
    onButtonPop();
    setIsDetailsOpen((prev) => {
      const next = !prev;
      if (next) {
        window.requestAnimationFrame(() => {
          drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  }, [onButtonPop]);

  const handleSpeak = (
    target: 'word' | 'slow' | 'example',
    text: string,
    locale: 'en-US' | 'tr-TR',
    rate = 1
  ) => {
    vibrateTap(12);
    onButtonPop();
    const ok = speakVocabularyText(text, locale, rate, {
      onStart: () => {
        setAudioUnavailable(false);
        setPlayingTarget(target);
      },
      onEnd: () => {
        setPlayingTarget((curr) => (curr === target ? null : curr));
      },
      onError: () => {
        setPlayingTarget(null);
        setAudioUnavailable(true);
        toast(copy.noAudioNotice);
      },
    });
    if (!ok) {
      setPlayingTarget(null);
      setAudioUnavailable(true);
      toast(copy.noAudioNotice);
    }
  };

  const handleToggleLike = useCallback(() => {
    vibrateTap(18);
    onButtonPop();
    const nextLiked = toggleLikedFact(card.id);
    setLiked(nextLiked);
    void trackEvent(card.id, 'vocabulary', nextLiked ? 'like' : 'unlike', {
      item_type: 'vocabulary',
      word: card.word,
    });
    toast(
      nextLiked
        ? lang === 'tr'
          ? 'Kelime beğenildi'
          : 'Word liked'
        : lang === 'tr'
          ? 'Beğeni kaldırıldı'
          : 'Like removed'
    );
  }, [card.id, card.word, lang, onButtonPop]);

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

  const handleShare = useCallback(async () => {
    vibrateTap(12);
    onButtonPop();
    void trackEvent(card.id, 'vocabulary', 'share', {
      item_type: 'vocabulary',
      word: card.word,
    });
    if (onOpenShare) {
      onOpenShare(card);
      return;
    }
    const text =
      lang === 'en'
        ? `${card.word} ${phonetic} — ${card.definitionEn}`
        : `${card.word} ${phonetic} — ${card.meaningTr}`;
    const shareUrlObj = new URL(window.location.href);
    shareUrlObj.searchParams.set('category', 'vocabulary');
    shareUrlObj.searchParams.set('vocab', card.id);
    const url = shareUrlObj.toString();
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: card.word, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast(t.copiedLink);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast(t.copiedLink);
      } catch {
        // Ignore dismissed share sheet
      }
    }
  }, [card, lang, onButtonPop, onOpenShare, phonetic, t.copiedLink]);

  useEffect(() => {
    const onCardAction = (event: Event) => {
      const detail = (event as CustomEvent<{ vocabId?: string; action?: string }>).detail;
      if (!detail || detail.vocabId !== card.id) return;
      if (detail.action === 'detail' || detail.action === 'flip') {
        handleToggleDetails();
      } else if (detail.action === 'like') {
        handleToggleLike();
      } else if (detail.action === 'share') {
        void handleShare();
      }
    };
    window.addEventListener('scrolly-card-action', onCardAction as EventListener);
    return () => window.removeEventListener('scrolly-card-action', onCardAction as EventListener);
  }, [card.id, handleToggleDetails, handleToggleLike, handleShare]);

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
    const pickedText = quiz.options[idx] ?? '';
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
      const nextXpAwarded = xpAwarded || true;
      if (!xpAwarded) {
        setXpAwarded(true);
        onEarnXp?.(15, 'vocabulary_quiz');
      }
      writeVocabQuizProgress(card.id, {
        solved: true,
        xpAwarded: nextXpAwarded,
        wrongOptions,
      });
    } else {
      const nextWrong =
        pickedText && !wrongOptions.includes(pickedText)
          ? [...wrongOptions, pickedText]
          : wrongOptions;
      setWrongOptions(nextWrong);
      writeVocabQuizProgress(card.id, {
        solved: false,
        xpAwarded,
        wrongOptions: nextWrong,
      });
      vibrateTap(14);
      onWrongSound?.();
    }
  };

  const bottomPad = cookieBannerVisible
    ? 'pb-[calc(env(safe-area-inset-bottom)+104px)] lg:pb-6'
    : 'pb-[calc(env(safe-area-inset-bottom)+88px)] lg:pb-6';

  return (
    <div
      data-testid="vocabulary-slide"
      data-vocab-id={card.id}
      data-active={isActive ? 'true' : 'false'}
      className="relative flex h-full w-full flex-col overflow-hidden bg-cik-bg pt-[calc(max(env(safe-area-inset-top),12px)+88px)] text-cik-text lg:pt-[96px]"
    >
      <div
        ref={vocabScrollRef}
        data-scroll-contain="true"
        data-vocab-scroll="true"
        onTouchMove={(event) => {
          const el = vocabScrollRef.current;
          if (el && (el.scrollHeight > el.clientHeight + 2 || isDetailsOpen)) {
            event.stopPropagation();
          }
        }}
        style={{ overscrollBehaviorY: 'contain' }}
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 ${bottomPad}`}
      >
        <div className="mx-auto flex min-h-full w-full max-w-md items-start gap-2.5 py-2 sm:items-center">
          <article
            role="article"
            aria-roledescription={lang === 'tr' ? 'kart' : 'card'}
            className="min-w-0 flex-1 rounded-sticker border-4 border-cik-sticker-rim bg-cik-pink p-4 text-cik-text shadow-sticker"
          >
            <div data-testid="vocab-media-stage" className="flex items-center justify-center gap-2.5">
              <img
                src="/assets/fluent/books.png"
                alt=""
                width={52}
                height={52}
                decoding="async"
                className="h-12 w-12 object-contain"
              />
              <img
                src="/assets/fluent/speech-balloon.png"
                alt=""
                width={32}
                height={32}
                decoding="async"
                className="h-8 w-8 object-contain"
              />
            </div>

            <p data-testid="vocab-badge" className="cik-footnote mt-2 text-center text-cik-text-2">
              {posLabel} · {cefrLabel}
            </p>
            <h2 data-testid="vocab-word" className="cik-title-1 mt-0.5 text-center text-cik-text sm:cik-large-title">
              {card.word}
            </h2>
            <p className="mt-0.5 text-center font-mono text-sm text-cik-text-2">
              <span
                data-testid="vocab-phonetic"
                data-phonetic="true"
                aria-label={phonetic}
              >
                {phonetic}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                aria-busy={playingTarget === 'word'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSpeak('word', card.word, 'en-US', 1);
                }}
                data-testid="vocab-listen-word-btn"
                className={`cik-footnote inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-pill px-3.5 transition ${
                  playingTarget === 'word'
                    ? 'animate-pulse bg-cik-cta text-cik-on-cta ring-2 ring-cik-focus'
                    : 'bg-cik-cta text-cik-on-cta hover:brightness-105'
                }`}
              >
                <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {playingTarget === 'word'
                    ? lang === 'tr'
                      ? 'Çalıyor...'
                      : 'Playing...'
                    : lang === 'tr'
                      ? 'Dinle'
                      : 'Listen'}
                </span>
              </button>
              <button
                type="button"
                aria-busy={playingTarget === 'slow'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSpeak('slow', card.word, 'en-US', 0.72);
                }}
                data-testid="vocab-listen-slow-btn"
                className={`cik-footnote inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-pill border px-3.5 transition ${
                  playingTarget === 'slow'
                    ? 'animate-pulse border-cik-cta bg-cik-surface text-cik-cta ring-2 ring-cik-focus'
                    : 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-surface-2'
                }`}
              >
                <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {playingTarget === 'slow'
                    ? lang === 'tr'
                      ? 'Yavaş Çalıyor...'
                      : 'Slow Playing...'
                    : lang === 'tr'
                      ? 'Yavaş'
                      : 'Slow'}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={mastered}
                data-testid="vocab-mastery-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  vibrateTap(14);
                  onButtonPop();
                  const next = toggleVocabMastered(card.id);
                  setMastered(next);
                  toast(
                    next
                      ? lang === 'tr'
                        ? `"${card.word}" öğrenildi olarak işaretlendi ✓`
                        : `"${card.word}" marked as mastered ✓`
                      : lang === 'tr'
                        ? 'Öğrenildi işareti kaldırıldı'
                        : 'Mastered mark removed'
                  );
                }}
                className={`cik-footnote inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-pill border px-3.5 transition ${
                  mastered
                    ? 'border-cik-mint bg-cik-mint text-cik-mint-text'
                    : 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-surface-2'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {mastered
                    ? lang === 'tr'
                      ? 'Öğrendim ✓'
                      : 'Mastered ✓'
                    : lang === 'tr'
                      ? 'Öğrendim'
                      : 'Master'}
                </span>
              </button>
            </div>

            {audioUnavailable ? (
              <p
                data-testid="vocab-audio-unavailable"
                className="cik-caption-1 mt-2 rounded-cik-sm bg-cik-butter px-2.5 py-1 text-center font-bold text-cik-butter-text"
              >
                {copy.noAudioNotice}
              </p>
            ) : null}

            <p data-testid="vocab-context-sentence" className="cik-callout mt-3 text-cik-text">
              {renderHighlightedSentence(card.exampleEn, card.word)}
            </p>

            <div data-testid="vocab-quick-guess" className="mt-3 rounded-cik-md bg-cik-surface-2 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="cik-footnote text-cik-text">
                  {lang === 'tr'
                    ? `"${card.word}" kelimesinin anlamı hangisi?`
                    : `Which English definition matches "${card.word}"?`}
                </p>
                <span className="cik-caption-2 shrink-0 rounded-pill bg-cik-butter px-2 py-0.5 text-cik-butter-text">
                  +15 XP
                </span>
              </div>
              <div className="grid gap-1.5">
                {quiz.options.map((opt, idx) => {
                  const isCorrect = idx === quiz.correctIdx;
                  const pickedWrong = wrongOptions.includes(opt);
                  let style = 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-pink';
                  if (solved && isCorrect) style = 'border-cik-mint bg-cik-mint text-cik-mint-text';
                  else if (pickedWrong) style = 'border-cik-rose bg-cik-rose text-cik-rose-text';
                  return (
                    <button
                      key={`${card.id}-${lang}-q-${idx}`}
                      type="button"
                      onClick={() => handleQuizPick(idx)}
                      data-testid={`vocab-quiz-option-${idx}`}
                      data-option-text={opt}
                      className={`cik-footnote flex min-h-11 w-full items-center justify-center rounded-cik-md border px-3 py-2 text-center transition ${style}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {!solved && wrongOptions.length > 0 ? (
                <p data-testid="vocab-wrong-feedback" className="cik-caption-1 mt-2 text-cik-rose-text">
                  {lang === 'tr' ? 'Bu sefer olmadı. Bir kez daha dene.' : 'Not quite. Try another.'}
                </p>
              ) : null}
              {solved ? (
                <div data-testid="vocab-meaning-reveal" className="mt-2.5 rounded-cik-md bg-cik-mint p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="cik-headline text-cik-mint-text">
                      {lang === 'en' ? card.definitionEn : card.meaningTr}
                    </p>
                    <span data-testid="vocab-xp-badge" className="cik-caption-1 shrink-0 text-cik-mint-text">
                      +15 XP
                    </span>
                  </div>
                  <p className="cik-footnote mt-1 text-cik-mint-text">
                    {lang === 'en' ? `${card.word} (${phonetic}) · TR: ${card.meaningTr}` : card.definitionEn}
                  </p>
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
              className="cik-footnote mt-2.5 flex h-10 w-full items-center justify-between rounded-pill bg-cik-surface px-3 text-cik-text"
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
                  ref={drawerRef}
                  key={`vocab-drawer-${card.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reduced ? motionTiming.reducedFade : motionTiming.cardFade}
                  data-testid="vocab-expanded-drawer"
                  className="mt-2.5 rounded-cik-md bg-cik-surface p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="cik-caption-2 text-cik-text-2">
                      {lang === 'tr' ? 'Ek Detaylar' : 'Extra Notes'}
                    </span>
                    <button
                      type="button"
                      data-testid="vocab-collapse-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleDetails();
                      }}
                      className="cik-caption-1 inline-flex h-8 items-center gap-1 rounded-pill px-2.5 text-cik-text-2 hover:bg-cik-surface-2"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      <span>{lang === 'tr' ? 'Daralt' : 'Collapse'}</span>
                    </button>
                  </div>
                  {synonyms.length > 0 ? (
                    <div data-testid="vocab-synonyms" className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="cik-caption-1 text-cik-text-2">
                        {lang === 'tr' ? 'Eş anlam' : 'Synonyms'}
                      </span>
                      {synonyms.map((syn) => (
                        <span key={syn} className="cik-caption-1 rounded-pill bg-cik-pink px-2 py-0.5 text-cik-text">
                          {syn}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="cik-footnote mt-2 text-cik-text">
                    {lang === 'en'
                      ? `${card.definitionEn} — TR: ${card.meaningTr}`
                      : card.exampleTr}
                  </p>
                  {lang === 'en' && card.exampleTr ? (
                    <p className="cik-caption-1 mt-1 text-cik-text-2">{card.exampleTr}</p>
                  ) : null}
                  <button
                    type="button"
                    aria-busy={playingTarget === 'example'}
                    onClick={() => handleSpeak('example', card.exampleEn, 'en-US', 0.92)}
                    data-testid="vocab-listen-example-btn"
                    className={`cik-caption-1 mt-2 inline-flex h-10 items-center gap-2 rounded-pill border px-3 transition ${
                      playingTarget === 'example'
                        ? 'animate-pulse border-cik-cta bg-cik-pink text-cik-cta ring-2 ring-cik-focus'
                        : 'border-cik-line text-cik-text hover:bg-cik-surface-2'
                    }`}
                  >
                    <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {playingTarget === 'example'
                        ? lang === 'tr'
                          ? 'Örnek çalıyor...'
                          : 'Playing example...'
                        : lang === 'tr'
                          ? 'Örneği dinle'
                          : 'Listen example'}
                    </span>
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </article>

          <div className="flex shrink-0 flex-col gap-2 lg:hidden">
            <IconButton
              label={
                liked
                  ? lang === 'tr'
                    ? 'Beğeniyi kaldır'
                    : 'Unlike'
                  : lang === 'tr'
                    ? 'Beğen'
                    : 'Like'
              }
              aria-pressed={liked}
              data-testid="vocab-like-btn"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleLike();
              }}
              className={liked ? 'bg-cik-cta text-cik-on-cta' : ''}
            >
              <Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
            </IconButton>
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
              label={t.flipToBack}
              data-testid="vocab-flip-btn"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleDetails();
              }}
              className={isDetailsOpen ? 'bg-cik-pink text-cik-cta' : ''}
            >
              <RotateCw className="h-6 w-6" aria-hidden="true" />
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
    </div>
  );
}
