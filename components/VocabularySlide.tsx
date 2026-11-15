'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Check, Sparkles, Volume2 } from 'lucide-react';
import FullBleedReelsCanvas from '@/components/FullBleedReelsCanvas';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { FEED_EXPERIENCE_COPY, type Language } from '@/i18n/translations';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
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
  isim: { tr: 'İSİM', en: 'NOUN' },
  sıfat: { tr: 'SIFAT', en: 'ADJECTIVE' },
  fiil: { tr: 'FİİL', en: 'VERB' },
  zarf: { tr: 'ZARF', en: 'ADVERB' },
  edat: { tr: 'EDAT', en: 'PREPOSITION' },
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
  }, [card.id, card.word]);

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
    const sync = () => setSaved(isVocabWordSaved(card.word));
    window.addEventListener('scrolly-vocab-updated', sync);
    return () => window.removeEventListener('scrolly-vocab-updated', sync);
  }, [card.word]);

  useEffect(() => {
    if (!solved || !bodyScrollRef.current) return;
    const el = bodyScrollRef.current;
    if (el.scrollHeight > el.clientHeight) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [solved]);

  const quiz = useMemo(() => buildVocabQuizChoices(card), [card]);
  const posLabel = PART_OF_SPEECH_LABELS[card.partOfSpeech]?.[lang] || card.partOfSpeech.toUpperCase();
  const cefrLabel = (card.cefrLevel || 'B2/C1').trim().toUpperCase();
  const synonyms = useMemo(
    () => (card.synonyms || []).map((item) => item.trim()).filter(Boolean).slice(0, 2),
    [card.synonyms]
  );

  const handleSpeak = (text: string, locale: 'en-US' | 'tr-TR', rate = 1.0) => {
    vibrateTap(12);
    onButtonPop();
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
      className="reels-slide relative flex h-full w-full shrink-0 flex-col overflow-hidden select-none bg-[#0A0A0E]"
    >
      {/* Region 1: Top 38–42% Live GIF Media Stage */}
      <div
        data-testid="vocab-media-stage"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(129, 140, 248, 0.3) 0%, #10101D 62%, #0A0A0E 100%)',
        }}
        className="relative h-[38%] sm:h-[42%] w-full shrink-0 overflow-hidden bg-[#0A0A0E]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 360 280"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-35"
        >
          <circle cx="180" cy="140" r="96" fill="none" stroke="#818CF8" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="180" cy="140" r="62" fill="none" stroke="#A5B4FC" strokeWidth="1" />
          <path d="M 24 200 Q 180 120 336 200" fill="none" stroke="#6366F1" strokeWidth="1.5" />
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
            className={`pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-500 ${
              gifLoaded ? 'opacity-95 brightness-105 contrast-105' : 'opacity-0'
            }`}
          />
        )}

        {/* Edge-only scrims so HUD & transition into dark body remain sharp without dimming the center GIF */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-black/65 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-20 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/80 to-transparent"
        />

        {resolvedGifUrl && !gifFailed && (
          <div className="pointer-events-auto absolute bottom-2 right-3 z-20">
            <PoweredByGiphyBadge micro lang={lang} />
          </div>
        )}
      </div>

      {/* Region 2: Lower Dark Body with Dual Audio, Always-Visible Context, Overflow-Safe Options & Reveal */}
      <div
        ref={bodyScrollRef}
        className={`relative z-10 flex min-h-0 flex-1 flex-col justify-start overflow-y-auto no-scrollbar bg-[#0A0A0E] px-4 pt-1 pr-14 sm:pr-16 lg:pr-4 ${
          cookieBannerVisible
            ? 'pb-[calc(env(safe-area-inset-bottom,16px)+200px)] lg:pb-6'
            : 'pb-[calc(env(safe-area-inset-bottom,16px)+84px)] lg:pb-6'
        }`}
      >
        <div className="flex flex-col gap-2.5">
          {/* Enriched Vocabulary Badge */}
          <span
            data-testid="vocab-badge"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-300/40 bg-indigo-500/25 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md"
          >
            {lang === 'tr' ? 'DİL ÖĞRENME' : 'LANGUAGE'} • {posLabel} • {cefrLabel}
          </span>

          {/* Word Header + Phonetic + Dual-Speed Speech Controls */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2
                  data-testid="vocab-word"
                  className="font-display text-2xl font-black leading-none text-white sm:text-3xl"
                >
                  {card.word}
                </h2>
                <span className="font-mono text-xs font-semibold text-indigo-200 sm:text-sm">
                  {card.phonetic}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSpeak(card.word, 'en-US', 1.0)}
                data-testid="vocab-listen-word-btn"
                className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-extrabold text-[#0A0A0E] transition hover:bg-indigo-50 active:scale-95"
              >
                <Volume2 className="h-3.5 w-3.5 shrink-0" />
                <span>{lang === 'tr' ? 'Dinle (1.0x)' : 'Listen (1.0x)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSpeak(card.word, 'en-US', 0.75)}
                data-testid="vocab-listen-slow-btn"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-white/15 active:scale-95"
              >
                <span aria-hidden="true">🐢</span>
                <span>{lang === 'tr' ? 'Yavaş (0.75x)' : 'Slow (0.75x)'}</span>
              </button>
            </div>
          </div>

          {audioUnavailable && (
            <p className="text-[11px] font-semibold text-amber-200">{copy.noAudioNotice}</p>
          )}

          {/* Always-Visible Compact Context Sentence (zero meaning spoiler before solving) */}
          <div
            data-testid="vocab-context-sentence"
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2"
          >
            <p className="text-xs font-medium leading-snug text-white/90 sm:text-sm whitespace-normal break-words">
              {renderHighlightedSentence(card.exampleEn, card.word)}
            </p>
          </div>

          {/* 3-Option Quick Quiz with Overflow-Safe Buttons */}
          <div
            data-testid="vocab-quick-guess"
            className="rounded-xl border border-amber-300/25 bg-amber-400/10 p-3 backdrop-blur-md"
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

            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {quiz.options.map((opt, idx) => {
                const isCorrect = idx === quiz.correctIdx;
                const pickedWrong = wrongIndices.includes(idx);
                let style = 'border-white/20 bg-white/10 text-white hover:border-indigo-300/60 hover:bg-white/15';
                if (solved && isCorrect) {
                  style = 'border-emerald-400 bg-emerald-500 text-white shadow-md shadow-emerald-500/25';
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

          {/* Rich Animated Reveal Panel after Solving */}
          {solved && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              data-testid="vocab-meaning-reveal"
              className="space-y-2 rounded-xl border border-emerald-400/35 bg-white/[0.08] px-3 py-2.5 backdrop-blur-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-emerald-300 sm:text-base">{card.meaningTr}</p>
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

              <p className="text-xs font-semibold leading-snug text-white/85">{card.definitionEn}</p>

              {synonyms.length > 0 && (
                <div data-testid="vocab-synonyms" className="flex flex-wrap items-center gap-1.5">
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
      </div>

      {/* Right Action Column Bookmark */}
      <div
        className={`absolute right-3 z-20 flex flex-col items-center gap-2.5 ${
          cookieBannerVisible
            ? 'bottom-[calc(env(safe-area-inset-bottom,16px)+204px)] lg:bottom-8'
            : 'bottom-[calc(env(safe-area-inset-bottom,16px)+84px)] lg:bottom-8'
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
      </div>
    </div>
  );
}
