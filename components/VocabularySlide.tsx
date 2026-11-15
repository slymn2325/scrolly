'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Check, ChevronDown, ChevronUp, Globe, Sparkles, Volume2 } from 'lucide-react';
import FullBleedReelsCanvas from '@/components/FullBleedReelsCanvas';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { FEED_EXPERIENCE_COPY, type Language } from '@/i18n/translations';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
import { vibrateTap } from '@/utils/haptics';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
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
  cookieBannerVisible?: boolean;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

const CLIENT_VOCAB_GIF_CACHE = new Map<string, string | null>();
const INFLIGHT_VOCAB_GIF_REQUESTS = new Map<string, Promise<string | null>>();

const PART_OF_SPEECH_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

function isImageCachedInBrowser(url: string | null): boolean {
  if (!url || typeof window === 'undefined') return false;
  const probe = new window.Image();
  probe.src = url;
  return probe.complete && probe.naturalWidth > 0;
}

async function fetchVocabularyGifFromApi(card: VocabularyCard): Promise<string | null> {
  if (typeof window === 'undefined' || navigator.onLine === false) {
    return null;
  }
  const existing = INFLIGHT_VOCAB_GIF_REQUESTS.get(card.id);
  if (existing) return existing;

  const query = card.gifQuery?.trim() || card.word.trim();
  const params = new URLSearchParams({
    vocabId: card.id,
    word: card.word,
    query,
  });

  const promise = fetch(`/api/gif?${params.toString()}`, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as { gifUrl?: unknown };
      if (typeof data?.gifUrl === 'string' && data.gifUrl.startsWith('https://')) {
        return data.gifUrl;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      INFLIGHT_VOCAB_GIF_REQUESTS.delete(card.id);
    });

  INFLIGHT_VOCAB_GIF_REQUESTS.set(card.id, promise);
  return promise;
}

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
      <strong
        key={idx}
        className="font-black text-indigo-300 underline decoration-indigo-400/60 underline-offset-2"
      >
        {part}
      </strong>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

/** Build 3 clean Turkish meaning choices, never repeating the English target word as a choice. */
function buildVocabQuizChoices(card: VocabularyCard): {
  options: [string, string, string];
  correctIdx: 0 | 1 | 2;
} {
  const wordLower = card.word.trim().toLowerCase();
  const fallbackDistractors = ['yanlış anlam', 'alakasız', 'zıt anlam', 'nadir kullanım'];
  const rawOptions: [string, string, string] = [
    card.quizOptions[0]?.trim() || '',
    card.quizOptions[1]?.trim() || '',
    card.quizOptions[2]?.trim() || '',
  ];

  const correctRaw = rawOptions[card.correctIndex];
  const resolvedCorrect =
    correctRaw && correctRaw.toLowerCase() !== wordLower ? correctRaw : card.meaningTr.trim();

  const seen = new Set<string>([resolvedCorrect.toLowerCase()]);
  const sanitized = rawOptions.map((opt, idx) => {
    if (idx === card.correctIndex) return resolvedCorrect;
    const low = opt.toLowerCase();
    if (opt && low !== wordLower && !seen.has(low)) {
      seen.add(low);
      return opt;
    }
    const candidate =
      fallbackDistractors.find((item) => !seen.has(item.toLowerCase())) || 'farklı anlam';
    seen.add(candidate.toLowerCase());
    return candidate;
  }) as [string, string, string];

  return {
    options: sanitized,
    correctIdx: card.correctIndex,
  };
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
  const initialGifUrl = card.gifUrl || CLIENT_VOCAB_GIF_CACHE.get(card.id) || null;
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | null>(initialGifUrl);
  const [gifFailed, setGifFailed] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(() => isImageCachedInBrowser(initialGifUrl));
  const gifImgRef = useRef<HTMLImageElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

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
    if (!isActive) {
      setIsDetailsOpen(false);
    }
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
    setGifFailed(false);
    if (card.gifUrl) {
      CLIENT_VOCAB_GIF_CACHE.set(card.id, card.gifUrl);
      setResolvedGifUrl(card.gifUrl);
      setGifLoaded(isImageCachedInBrowser(card.gifUrl));
      return;
    }
    if (CLIENT_VOCAB_GIF_CACHE.has(card.id)) {
      const cached = CLIENT_VOCAB_GIF_CACHE.get(card.id) ?? null;
      setResolvedGifUrl(cached);
      setGifLoaded(isImageCachedInBrowser(cached));
      return;
    }
    setGifLoaded(false);
    setResolvedGifUrl(null);
    if (!isActive) return;

    let cancelled = false;
    void fetchVocabularyGifFromApi(card).then((url) => {
      if (cancelled) return;
      CLIENT_VOCAB_GIF_CACHE.set(card.id, url);
      if (url) {
        setResolvedGifUrl(url);
        if (isImageCachedInBrowser(url)) setGifLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [card, isActive]);

  useEffect(() => {
    if (gifImgRef.current?.complete && gifImgRef.current.naturalWidth > 0) {
      setGifLoaded(true);
    }
  }, [resolvedGifUrl]);

  useEffect(() => {
    if (!solved || !isDetailsOpen || !bodyScrollRef.current) return;
    const el = bodyScrollRef.current;
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [isDetailsOpen, solved]);

  useEffect(() => {
    const sync = () => setSaved(isVocabWordSaved(card.word));
    window.addEventListener('scrolly-vocab-updated', sync);
    return () => window.removeEventListener('scrolly-vocab-updated', sync);
  }, [card.word]);

  const quiz = useMemo(() => buildVocabQuizChoices(card), [card]);
  const posLabel =
    PART_OF_SPEECH_LABELS[card.partOfSpeech]?.[lang] || card.partOfSpeech;
  const cefrLabel = (card.cefrLevel || 'B2/C1').trim().toUpperCase();
  const synonyms = useMemo(
    () => (card.synonyms || []).map((item) => item.trim()).filter(Boolean).slice(0, 2),
    [card.synonyms]
  );

  const handleToggleDetails = () => {
    vibrateTap(10);
    onButtonPop();
    setIsDetailsOpen((prev) => !prev);
  };

  const handleSpeak = (text: string, locale: 'en-US' | 'tr-TR', rate = 1.0) => {
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
    void loadSavedVocabNotebook();
    const toastText = res.saved
      ? lang === 'tr'
        ? 'Kelime defterine eklendi'
        : 'Saved to Word Notebook'
      : lang === 'tr'
        ? 'Kelime defterinden çıkarıldı'
        : 'Removed from Word Notebook';
    window.dispatchEvent(new CustomEvent('scrolly-toast', { detail: { text: toastText } }));
  };

  const handleQuizPick = (idx: number) => {
    if (solved) return;
    const isCorrect = idx === quiz.correctIdx;
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

  return (
    <div
      data-testid="vocabulary-slide"
      data-vocab-id={card.id}
      data-active={isActive ? 'true' : 'false'}
      className="reels-slide relative flex h-full w-full shrink-0 flex-col justify-end overflow-hidden select-none bg-[#0A0A0E]"
    >
      {/* Full-bleed contextual background visual + bright GIF (zero center darkening) */}
      <div
        data-testid="vocab-media-stage"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(129, 140, 248, 0.28) 0%, #10101D 60%, #0A0A0E 100%)',
        }}
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#0A0A0E]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 360 640"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-30"
        >
          <circle
            cx="180"
            cy="210"
            r="116"
            fill="none"
            stroke="#818CF8"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />
          <circle cx="180" cy="210" r="74" fill="none" stroke="#A5B4FC" strokeWidth="1" />
          <path d="M 24 285 Q 180 205 336 285" fill="none" stroke="#6366F1" strokeWidth="1.5" />
        </svg>

        <FullBleedReelsCanvas
          category="vocabulary"
          accentColor="#818CF8"
          isActive={isActive}
          lang={lang}
          onInteract={onButtonPop}
          topicText={`${card.word} ${card.definitionEn} ${card.gifQuery || ''}`}
          tag="vocabulary"
        />

        {resolvedGifUrl && !gifFailed && (
          <img
            ref={gifImgRef}
            src={resolvedGifUrl}
            alt={card.word}
            loading="eager"
            decoding="async"
            data-testid="vocab-topic-gif"
            onLoad={() => setGifLoaded(true)}
            onError={() => setGifFailed(true)}
            className={`pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover brightness-105 contrast-105 transition-opacity duration-500 ${
              gifLoaded ? 'opacity-95' : 'opacity-0'
            }`}
          />
        )}

        {/* Smooth bottom contrast gradient deepening cleanly when drawer opens */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] transition-[height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isDetailsOpen
              ? 'h-[82%] bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/95 to-transparent'
              : 'h-[54%] bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/85 to-transparent'
          }`}
        />
      </div>

      {/* Unified scrollable bottom sheet container anchored below the top bar so word header & drawer scroll cleanly together without slicing */}
      <div
        ref={bodyScrollRef}
        className={`relative z-10 mt-auto max-h-[min(calc(100%-76px),calc(100dvh-140px))] w-full overflow-y-auto no-scrollbar px-4 pt-3 pr-14 sm:pr-16 lg:pr-5 ${
          cookieBannerVisible
            ? 'pb-[calc(env(safe-area-inset-bottom,16px)+200px)] lg:pb-6'
            : 'pb-[calc(env(safe-area-inset-bottom,16px)+84px)] lg:pb-6'
        }`}
      >
        <div className="flex flex-col gap-2.5">
          {/* 1. Top Metadata Row: Localized POS + CEFR Pill + Giphy Attribution */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="vocab-badge"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-300/40 bg-indigo-500/25 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
            >
              <Globe className="h-3 w-3 shrink-0 text-indigo-200" aria-hidden="true" />
              <span>
                {lang === 'tr' ? 'DİL ÖĞRENME' : 'WORD LAB'} • {posLabel.toUpperCase()} • {cefrLabel}
              </span>
            </span>
            {resolvedGifUrl && !gifFailed && (
              <div className="pointer-events-auto">
                <PoweredByGiphyBadge micro lang={lang} />
              </div>
            )}
          </div>

          {/* 2. Word Header + Phonetic (tappable to toggle drawer) & Dual Audio Controls */}
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleDetails();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="min-w-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0E]"
            >
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2
                  data-testid="vocab-word"
                  className="font-display text-3xl font-black leading-tight text-white sm:text-4xl whitespace-normal break-words"
                >
                  {card.word}
                </h2>
                <span className="font-mono text-xs font-semibold text-indigo-200 sm:text-sm">
                  {card.phonetic}
                </span>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(card.word, 'en-US', 1.0);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                data-testid="vocab-listen-word-btn"
                className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-extrabold text-[#0A0A0E] transition hover:bg-indigo-50 active:scale-95"
              >
                <Volume2 className="h-3.5 w-3.5 shrink-0" />
                <span>{lang === 'tr' ? 'Dinle (1.0x)' : 'Listen (1.0x)'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(card.word, 'en-US', 0.75);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                data-testid="vocab-listen-slow-btn"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-white/15 active:scale-95"
              >
                <img
                  src={UI_ICON_PATHS.slowSpeed}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  decoding="async"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span>{lang === 'tr' ? 'Yavaş (0.75x)' : 'Slow (0.75x)'}</span>
              </button>
            </div>
          </div>

          {audioUnavailable && (
            <p className="text-[11px] font-semibold text-amber-200">{copy.noAudioNotice}</p>
          )}

          {/* 3. Expand Trigger Bar (visible when collapsed) */}
          {!isDetailsOpen && (
            <button
              type="button"
              data-testid="vocab-expand-trigger"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleDetails();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-left text-xs font-bold text-white/90 backdrop-blur-md transition hover:bg-white/15 active:scale-[0.99]"
            >
              <span className="inline-flex items-center gap-1.5">
                <img
                  src={UI_ICON_PATHS.tap}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  decoding="async"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span>
                  {lang === 'tr'
                    ? 'Örnek cümle ve anlam tahmini için dokun'
                    : 'Tap for example sentence & meaning quiz'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-indigo-300" />
            </button>
          )}

          {/* 4. Expanded Drawer (Context Sentence + 3 Non-Overlapping Options + Animated Meaning Reveal) */}
          <AnimatePresence initial={false}>
            {isDetailsOpen && (
              <motion.div
                key={`vocab-drawer-${card.id}`}
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 8 }}
                transition={{ duration: 0.22 }}
                data-testid="vocab-expanded-drawer"
                onClick={(e) => e.stopPropagation()}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-2.5 rounded-3xl border border-white/15 bg-[#13131A]/95 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200/80">
                      {lang === 'tr' ? 'Bağlam & Anlam Tahmini' : 'Context & Meaning Quiz'}
                    </span>
                    <button
                      type="button"
                      data-testid="vocab-collapse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDetails();
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-extrabold text-white/90 transition hover:bg-white/15"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>{lang === 'tr' ? 'Daralt' : 'Collapse'}</span>
                    </button>
                  </div>

                  {/* Always-Visible Context Sentence inside Drawer (no Turkish spoiler before solving) */}
                  <div
                    data-testid="vocab-context-sentence"
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
                  >
                    <p className="text-xs font-medium leading-snug text-white/90 sm:text-sm whitespace-normal break-words">
                      {renderHighlightedSentence(card.exampleEn, card.word)}
                    </p>
                  </div>

                  {/* 3 Spacious, Full-Width Wrap-Safe Quiz Options */}
                  <div
                    data-testid="vocab-quick-guess"
                    className="rounded-xl border border-amber-300/25 bg-amber-400/10 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold leading-snug text-white sm:text-sm whitespace-normal break-words">
                        {lang === 'tr'
                          ? `"${card.word}" kelimesinin Türkçe karşılığı hangisi?`
                          : `Which Turkish meaning matches "${card.word}"?`}
                      </p>
                      <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200">
                        +15 XP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {quiz.options.map((opt, idx) => {
                        const isCorrect = idx === quiz.correctIdx;
                        const pickedWrong = wrongIndices.includes(idx);
                        let style =
                          'border-white/20 bg-white/10 text-white hover:border-indigo-300/60 hover:bg-white/15';
                        if (solved && isCorrect) {
                          style =
                            'border-emerald-400 bg-emerald-500 text-white shadow-md shadow-emerald-500/25';
                        } else if (pickedWrong) {
                          style = 'border-rose-400/80 bg-rose-500/25 text-rose-100';
                        }

                        return (
                          <button
                            key={`${card.id}-q-${idx}`}
                            type="button"
                            onClick={() => handleQuizPick(idx)}
                            data-testid={`vocab-quiz-option-${idx}`}
                            data-option-text={opt}
                            className={`min-h-[48px] h-auto w-full rounded-xl border py-2.5 px-3 flex items-center justify-center text-center text-xs sm:text-sm font-bold leading-snug whitespace-normal break-words transition active:scale-[0.98] ${style}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {!solved && wrongIndices.length > 0 && (
                      <p
                        data-testid="vocab-wrong-feedback"
                        className="mt-1.5 text-[11px] font-bold text-rose-200"
                      >
                        {lang === 'tr'
                          ? 'Yaklaştın! Başka bir seçenek dene.'
                          : 'Close! Try another option.'}
                      </p>
                    )}
                  </div>

                  {/* Rich Reveal Panel on Solve */}
                  {solved && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      data-testid="vocab-meaning-reveal"
                      className="space-y-2 rounded-xl border border-emerald-400/35 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-emerald-300 sm:text-base">
                          {card.meaningTr}
                        </p>
                        <motion.span
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          data-testid="vocab-xp-badge"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-200"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>+15 XP</span>
                        </motion.span>
                      </div>

                      <p className="text-xs font-semibold leading-snug text-white/85">
                        {card.definitionEn}
                      </p>

                      {synonyms.length > 0 && (
                        <div
                          data-testid="vocab-synonyms"
                          className="flex flex-wrap items-center gap-1.5"
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200/80">
                            {lang === 'tr' ? 'Eş Anlam:' : 'Synonyms:'}
                          </span>
                          {synonyms.map((syn) => (
                            <span
                              key={syn}
                              className="rounded-full border border-indigo-300/30 bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-bold text-indigo-100"
                            >
                              ≈ {syn}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="h-px w-full bg-white/15" />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-white/80 whitespace-normal break-words">
                          TR: {card.exampleTr}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSpeak(card.exampleEn, 'en-US', 0.9)}
                          data-testid="vocab-listen-example-btn"
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-white/15"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>{lang === 'tr' ? 'Örneği Dinle' : 'Listen example'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile/Tablet-Only Right-Edge Save Button (completely outside pr-14 sm:pr-16 gutter; desktop uses DesktopFeedSideRail) */}
      <div
        className={`absolute right-2 z-20 flex flex-col items-center lg:hidden ${
          cookieBannerVisible
            ? 'bottom-[calc(env(safe-area-inset-bottom,16px)+204px)]'
            : 'bottom-[calc(env(safe-area-inset-bottom,16px)+84px)]'
        }`}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            handleMobileSave();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          data-testid="vocab-mobile-save-btn"
          aria-label={saved ? copy.savedWordBtn : copy.saveWordBtn}
          className="flex flex-col items-center gap-0.5"
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition ${
              saved ? 'bg-amber-400 text-[#0A0A0E]' : 'bg-black/45 text-white'
            }`}
          >
            {saved ? <Check className="h-4 w-4" /> : <BookMarked className="h-4 w-4" />}
          </span>
          <span className="max-w-[46px] text-center text-[9px] font-extrabold leading-tight text-white/90">
            {lang === 'tr' ? 'Kaydet' : 'Save'}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
