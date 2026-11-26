'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Layers,
  RotateCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import EmptyState from '@/components/cikartma/EmptyState';
import { profileCopy } from '@/components/profile/copy';
import { FEED_EXPERIENCE_COPY, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { SavedVocabularyEntry, VocabPartOfSpeech } from '@/types/vocabulary';
import { buildFactHref, getFactPrimarySlug, type FactCard } from '@/utils/factsData';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';
import {
  enrichSavedVocabEntry,
  isVocabMastered,
  speakVocabularyText,
  toggleVocabMastered,
} from '@/utils/vocabNotebook';

type SavedFilter = 'saved' | 'liked' | 'vocab';
type VocabMasteryFilter = 'all' | 'learning' | 'mastered';

interface PendingRemove {
  key: string;
  commit: () => void;
}

interface SavedListProps {
  lang: Language;
  vocabFocus?: number;
  savedFacts: FactCard[];
  likedFacts: FactCard[];
  vocab: SavedVocabularyEntry[];
  offline: boolean;
  onButtonPop: () => void;
  onRemoveSaved: (factId: string) => void;
  onRemoveLiked: (factId: string) => void;
  onRemoveVocab: (entry: SavedVocabularyEntry) => void;
  onToast: (message: string | null, undo?: () => void) => void;
  onBackToFeed: () => void;
}

const POS_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

function FilterChip({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  const look = selected
    ? 'bg-cik-berry text-cik-on-berry shadow-sticker'
    : 'bg-cik-surface text-cik-text-2 shadow-e1';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`cik-footnote inline-flex h-11 shrink-0 items-center rounded-pill px-4 ${look}`}
    >
      {label}
    </button>
  );
}

function SwipeRow({
  open,
  onOpen,
  children,
  removeLabel,
  onRemove,
  testId,
}: {
  open: boolean;
  onOpen: (open: boolean) => void;
  children: React.ReactNode;
  removeLabel: string;
  onRemove: () => void;
  testId: string;
}) {
  const startX = useRef<number | null>(null);
  return (
    <div className="relative overflow-hidden rounded-cik-lg bg-cik-rose">
      <button
        type="button"
        onClick={onRemove}
        className="cik-footnote absolute inset-y-0 right-0 flex w-16 items-center justify-center px-2 text-cik-rose-text"
      >
        {removeLabel}
      </button>
      <div
        className={`relative flex items-center gap-2 bg-cik-surface p-3 ${open ? '-translate-x-16' : ''}`}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current == null) return;
          const delta = event.clientX - startX.current;
          if (delta < -40) onOpen(true);
          else if (delta > 24) onOpen(false);
          startX.current = null;
        }}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          data-testid={testId}
          aria-label={removeLabel}
          onClick={onRemove}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-cik-rose text-cik-rose-text"
        >
          <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function SavedList({
  lang,
  vocabFocus = 0,
  savedFacts,
  likedFacts,
  vocab,
  offline,
  onButtonPop,
  onRemoveSaved,
  onRemoveLiked,
  onRemoveVocab,
  onToast,
  onBackToFeed,
}: SavedListProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);
  const feed = FEED_EXPERIENCE_COPY[lang];
  const [filter, setFilter] = useState<SavedFilter>(vocabFocus > 0 ? 'vocab' : 'saved');
  const [vocabFilter, setVocabFilter] = useState<VocabMasteryFilter>('all');
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [practiceFlipped, setPracticeFlipped] = useState(false);
  const [masteryTick, setMasteryTick] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const pendingRef = useRef<PendingRemove | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (vocabFocus > 0) setFilter('vocab');
  }, [vocabFocus]);

  useEffect(() => {
    const bump = () => setMasteryTick((v) => v + 1);
    window.addEventListener('scrolly-vocab-updated', bump);
    return () => window.removeEventListener('scrolly-vocab-updated', bump);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const clearPending = () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
  };

  const queueRemove = (item: PendingRemove) => {
    if (pendingRef.current && pendingRef.current.key !== item.key) {
      pendingRef.current.commit();
    }
    clearPending();
    pendingRef.current = item;
    setHidden((current) => new Set(current).add(item.key));
    onButtonPop();
    onToast(copy.removed, () => {
      const pending = pendingRef.current;
      if (!pending || pending.key !== item.key) return;
      clearPending();
      setHidden((current) => {
        const next = new Set(current);
        next.delete(item.key);
        return next;
      });
      onToast(null);
    });
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending || pending.key !== item.key) return;
      pending.commit();
      clearPending();
      onToast(null);
    }, 4000);
  };

  const visibleSaved = savedFacts.filter((fact) => !hidden.has(`saved:${fact.id}`));
  const visibleLiked = likedFacts.filter((fact) => !hidden.has(`liked:${fact.id}`));
  const visibleVocab = vocab
    .filter((entry) => !hidden.has(`vocab:${entry.id}`))
    .map((entry) => enrichSavedVocabEntry(entry));
  const masteredCount =
    masteryTick >= 0
      ? visibleVocab.filter((entry) => isVocabMastered(entry.id) || isVocabMastered(entry.word)).length
      : 0;
  const filteredVocab = visibleVocab.filter((entry) => {
    if (vocabFilter === 'all') return true;
    const mastered = isVocabMastered(entry.id) || isVocabMastered(entry.word);
    return vocabFilter === 'mastered' ? mastered : !mastered;
  });
  const practicePool = filteredVocab.length > 0 ? filteredVocab : visibleVocab;
  const currentPracticeCard =
    practicePool.length > 0 ? practicePool[practiceIdx % practicePool.length] : null;

  const filters: { id: SavedFilter; label: string }[] = [
    { id: 'saved', label: copy.savedFilter },
    { id: 'liked', label: copy.likedFilter },
    { id: 'vocab', label: copy.vocabFilter },
  ];

  return (
    <div className="flex flex-col gap-4">
      {offline ? <p className="cik-callout text-cik-text-2">{copy.offline}</p> : null}
      <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 py-2" role="group" aria-label={t.profileTabSaved}>
        {filters.map((item) => (
          <FilterChip key={item.id} selected={filter === item.id} label={item.label} onClick={() => setFilter(item.id)} />
        ))}
      </div>

      {filter === 'saved' ? (
        <div data-testid="diploma-saved-list" className="flex flex-col gap-2">
          {visibleSaved.length === 0 ? (
            <EmptyState
              imageSrc="/assets/fluent/empty-nest.png"
              imageAlt=""
              title={copy.savedFilter}
              body={t.diplomaNoSavedFacts}
              actionLabel={copy.backToFeed}
              onAction={onBackToFeed}
            />
          ) : (
            visibleSaved.map((fact) => {
              const meta = getCategoryMeta(fact.category);
              return (
                <SwipeRow
                  key={fact.id}
                  open={openId === fact.id}
                  onOpen={(open) => setOpenId(open ? fact.id : null)}
                  removeLabel={copy.remove}
                  testId={`diploma-unsave-${fact.id}`}
                  onRemove={() =>
                    queueRemove({
                      key: `saved:${fact.id}`,
                      commit: () => onRemoveSaved(fact.id),
                    })
                  }
                >
                  <Link
                    href={buildFactHref(getFactPrimarySlug(fact), lang)}
                    onClick={onButtonPop}
                    data-testid={`diploma-open-saved-${fact.id}`}
                    className="flex items-center justify-between gap-2 text-cik-text"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      <Bookmark size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                      <img src={meta.iconPath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                      <span className="cik-footnote line-clamp-2 min-w-0 flex-1">{fact[lang].title}</span>
                    </span>
                    <span className="cik-caption-2 inline-flex shrink-0 items-center gap-1 rounded-pill bg-cik-pink px-2.5 py-1 text-cik-cta">
                      <span>{lang === 'en' ? 'Open' : 'Aç'}</span>
                      <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                    </span>
                  </Link>
                </SwipeRow>
              );
            })
          )}
        </div>
      ) : null}

      {filter === 'liked' ? (
        <div data-testid="diploma-liked-list" className="flex flex-col gap-2">
          {visibleLiked.length === 0 ? (
            <EmptyState
              imageSrc="/assets/fluent/empty-nest.png"
              imageAlt=""
              title={copy.likedFilter}
              body={t.diplomaNoLikedFacts}
              actionLabel={copy.backToFeed}
              onAction={onBackToFeed}
            />
          ) : (
            visibleLiked.map((fact) => {
              const meta = getCategoryMeta(fact.category);
              return (
                <SwipeRow
                  key={fact.id}
                  open={openId === `liked-${fact.id}`}
                  onOpen={(open) => setOpenId(open ? `liked-${fact.id}` : null)}
                  removeLabel={copy.remove}
                  testId={`diploma-unlike-${fact.id}`}
                  onRemove={() =>
                    queueRemove({
                      key: `liked:${fact.id}`,
                      commit: () => onRemoveLiked(fact.id),
                    })
                  }
                >
                  <Link
                    href={buildFactHref(getFactPrimarySlug(fact), lang)}
                    onClick={onButtonPop}
                    data-testid={`diploma-open-liked-${fact.id}`}
                    className="flex items-center justify-between gap-2 text-cik-text"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      <Heart size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                      <img src={meta.iconPath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                      <span className="cik-footnote line-clamp-2 min-w-0 flex-1">{fact[lang].title}</span>
                    </span>
                    <span className="cik-caption-2 inline-flex shrink-0 items-center gap-1 rounded-pill bg-cik-pink px-2.5 py-1 text-cik-cta">
                      <span>{lang === 'en' ? 'Open' : 'Aç'}</span>
                      <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                    </span>
                  </Link>
                </SwipeRow>
              );
            })
          )}
        </div>
      ) : null}

      {filter === 'vocab' ? (
        <div data-testid="diploma-vocab-notebook" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="cik-headline flex items-center gap-2 text-cik-text">
              <BookMarked size={20} strokeWidth={2} aria-hidden="true" />
              <span>
                {feed.vocabNotebookTitle} ({visibleVocab.length})
              </span>
            </h3>
            {visibleVocab.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="cik-caption-2 cik-tabular rounded-pill bg-cik-mint px-2.5 py-1 text-cik-mint-text">
                  {lang === 'en'
                    ? `${masteredCount}/${visibleVocab.length} Mastered`
                    : `${masteredCount}/${visibleVocab.length} Öğrenildi`}
                </span>
                <button
                  type="button"
                  data-testid="vocab-notebook-practice-toggle"
                  onClick={() => {
                    onButtonPop();
                    setPracticeIdx(0);
                    setPracticeFlipped(false);
                    setPracticeOpen((prev) => !prev);
                  }}
                  className={`cik-caption-1 inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 ${
                    practiceOpen
                      ? 'bg-cik-berry text-cik-on-berry shadow-sticker'
                      : 'bg-cik-cta text-cik-on-cta'
                  }`}
                >
                  <Layers size={14} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {practiceOpen
                      ? lang === 'en'
                        ? 'Back to list'
                        : 'Listeye dön'
                      : lang === 'en'
                        ? 'Flashcards'
                        : 'Kartlarla Çalış'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {visibleVocab.length === 0 ? (
            <EmptyState imageSrc="/assets/fluent/books.png" imageAlt="" title={copy.vocabFilter} body={copy.vocabEmpty} />
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={lang === 'en' ? 'Mastery filter' : 'Öğrenme filtresi'}>
                {(
                  [
                    { id: 'all', label: lang === 'en' ? `All (${visibleVocab.length})` : `Tümü (${visibleVocab.length})` },
                    {
                      id: 'learning',
                      label:
                        lang === 'en'
                          ? `Learning (${visibleVocab.length - masteredCount})`
                          : `Öğreniliyor (${visibleVocab.length - masteredCount})`,
                    },
                    { id: 'mastered', label: lang === 'en' ? `Mastered (${masteredCount})` : `Öğrenildi (${masteredCount})` },
                  ] as const
                ).map((chip) => {
                  const selected = vocabFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        onButtonPop();
                        setVocabFilter(chip.id);
                        setPracticeIdx(0);
                        setPracticeFlipped(false);
                      }}
                      className={`cik-caption-1 inline-flex min-h-9 items-center rounded-pill px-3 ${
                        selected
                          ? 'bg-cik-cta text-cik-on-cta'
                          : 'border border-cik-line bg-cik-surface text-cik-text-2'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {practiceOpen && currentPracticeCard ? (
                <div
                  data-testid="vocab-flashcard-practice"
                  className="rounded-sticker border border-cik-cta/30 bg-cik-pink p-4 text-cik-text shadow-e1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="cik-caption-2 rounded-pill bg-cik-surface px-2.5 py-1 text-cik-text-2">
                      {(practiceIdx % practicePool.length) + 1}/{practicePool.length} ·{' '}
                      {POS_LABELS[currentPracticeCard.partOfSpeech]?.[lang] ??
                        currentPracticeCard.partOfSpeech}
                      {currentPracticeCard.cefrLevel
                        ? ` · ${currentPracticeCard.cefrLevel.toUpperCase()}`
                        : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`${feed.listenEn}: ${currentPracticeCard.word}`}
                        onClick={() => {
                          onButtonPop();
                          speakVocabularyText(currentPracticeCard.word, 'en-US', 1);
                        }}
                        className="cik-caption-2 inline-flex min-h-9 items-center gap-1 rounded-pill bg-cik-cta px-2.5 text-cik-on-cta"
                      >
                        <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
                        <span>1x</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${lang === 'en' ? 'Slow' : 'Yavaş'}: ${currentPracticeCard.word}`}
                        onClick={() => {
                          onButtonPop();
                          speakVocabularyText(currentPracticeCard.word, 'en-US', 0.72);
                        }}
                        className="cik-caption-2 inline-flex min-h-9 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 text-cik-text"
                      >
                        <span>0.7x</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="vocab-flashcard-flip-surface"
                    onClick={() => {
                      onButtonPop();
                      setPracticeFlipped((prev) => !prev);
                    }}
                    className="mt-3 flex w-full flex-col items-center rounded-cik-lg border border-cik-line bg-cik-surface p-5 text-center shadow-e1"
                  >
                    <p className="cik-title-2 text-cik-text">{currentPracticeCard.word}</p>
                    <p className="cik-caption-1 mt-1 font-mono text-cik-text-2">
                      {formatPhoneticForDisplay(currentPracticeCard.phonetic)}
                    </p>
                    {practiceFlipped ? (
                      <div className="mt-4 w-full space-y-2 border-t border-cik-line pt-3 text-left">
                        <p className="cik-headline text-cik-cta">
                          {lang === 'en'
                            ? currentPracticeCard.definitionEn || currentPracticeCard.meaningTr
                            : currentPracticeCard.meaningTr}
                        </p>
                        {lang === 'en' ? (
                          <p className="cik-caption-1 text-cik-text-2">
                            TR: {currentPracticeCard.meaningTr}
                          </p>
                        ) : currentPracticeCard.definitionEn ? (
                          <p className="cik-caption-1 text-cik-text-2">
                            {currentPracticeCard.definitionEn}
                          </p>
                        ) : null}
                        <p className="cik-footnote text-cik-text">
                          {currentPracticeCard.exampleEn}
                        </p>
                      </div>
                    ) : (
                      <p className="cik-caption-1 mt-4 inline-flex items-center gap-1.5 text-cik-cta">
                        <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
                        <span>
                          {lang === 'en' ? 'Tap to reveal definition' : 'Anlamı görmek için dokun'}
                        </span>
                      </p>
                    )}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onButtonPop();
                          setPracticeFlipped(false);
                          setPracticeIdx((idx) => (idx - 1 + practicePool.length) % practicePool.length);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-cik-line bg-cik-surface text-cik-text"
                        aria-label={lang === 'en' ? 'Previous word' : 'Önceki kelime'}
                      >
                        <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onButtonPop();
                          setPracticeFlipped(false);
                          setPracticeIdx((idx) => (idx + 1) % practicePool.length);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-cik-line bg-cik-surface text-cik-text"
                        aria-label={lang === 'en' ? 'Next word' : 'Sonraki kelime'}
                      >
                        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onButtonPop();
                        const nextMastered = toggleVocabMastered(currentPracticeCard.id);
                        setMasteryTick((v) => v + 1);
                        onToast(
                          nextMastered
                            ? lang === 'en'
                              ? `"${currentPracticeCard.word}" marked as mastered ✓`
                              : `"${currentPracticeCard.word}" öğrenildi ✓`
                            : lang === 'en'
                              ? 'Moved back to Learning'
                              : 'Öğreniliyor listesine alındı'
                        );
                      }}
                      className={`cik-caption-1 inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3.5 ${
                        isVocabMastered(currentPracticeCard.id) ||
                        isVocabMastered(currentPracticeCard.word)
                          ? 'bg-cik-mint text-cik-mint-text'
                          : 'bg-cik-surface text-cik-text border border-cik-line'
                      }`}
                    >
                      <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
                      <span>
                        {isVocabMastered(currentPracticeCard.id) ||
                        isVocabMastered(currentPracticeCard.word)
                          ? lang === 'en'
                            ? 'Mastered ✓'
                            : 'Öğrenildi ✓'
                          : lang === 'en'
                            ? 'Mark Mastered'
                            : 'Öğrendim'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : filteredVocab.length === 0 ? (
                <p className="cik-footnote rounded-cik-md bg-cik-surface p-4 text-center text-cik-text-2">
                  {lang === 'en'
                    ? 'No words match this filter yet.'
                    : 'Bu filtrede henüz kelime yok.'}
                </p>
              ) : (
                filteredVocab.map((entry) => {
                  const isMastered = isVocabMastered(entry.id) || isVocabMastered(entry.word);
                  const primaryDefinition =
                    lang === 'en'
                      ? entry.definitionEn || entry.meaningTr
                      : entry.meaningTr;
                  const secondaryNote =
                    lang === 'en'
                      ? entry.definitionEn
                        ? `TR: ${entry.meaningTr}`
                        : null
                      : entry.definitionEn;
                  const labHref = `${lang === 'en' ? '/en' : '/'}?category=vocabulary&vocab=${encodeURIComponent(entry.id)}`;
                  return (
                    <SwipeRow
                      key={entry.id}
                      open={openId === entry.id}
                      onOpen={(open) => setOpenId(open ? entry.id : null)}
                      removeLabel={copy.remove}
                      testId={`diploma-vocab-remove-${entry.id}`}
                      onRemove={() =>
                        queueRemove({
                          key: `vocab:${entry.id}`,
                          commit: () => onRemoveVocab(entry),
                        })
                      }
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="cik-headline text-cik-text">{entry.word}</p>
                            <span className="cik-caption-2 font-mono text-cik-text-2" data-phonetic="true">
                              {formatPhoneticForDisplay(entry.phonetic)}
                            </span>
                            {entry.cefrLevel && (
                              <span className="cik-caption-2 rounded-pill bg-cik-butter px-2 py-0.5 text-cik-butter-text">
                                {entry.cefrLevel.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p
                            data-testid={`vocab-notebook-definition-${entry.id}`}
                            className="cik-footnote mt-1 text-cik-text"
                          >
                            {primaryDefinition} ·{' '}
                            <span className="text-cik-text-2">
                              {POS_LABELS[entry.partOfSpeech]?.[lang] ?? entry.partOfSpeech}
                            </span>
                          </p>
                          {secondaryNote && (
                            <p className="cik-caption-1 mt-0.5 text-cik-text-2">{secondaryNote}</p>
                          )}
                          <p className="cik-caption-1 mt-1 line-clamp-2 text-cik-text-2">
                            {entry.exampleEn}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`vocab-notebook-master-${entry.id}`}
                              onClick={() => {
                                onButtonPop();
                                toggleVocabMastered(entry.id);
                                setMasteryTick((v) => v + 1);
                              }}
                              className={`cik-caption-2 inline-flex min-h-8 items-center gap-1 rounded-pill px-2.5 ${
                                isMastered
                                  ? 'bg-cik-mint text-cik-mint-text'
                                  : 'border border-cik-line bg-cik-surface-2 text-cik-text-2'
                              }`}
                            >
                              <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
                              <span>
                                {isMastered
                                  ? lang === 'en'
                                    ? 'Mastered ✓'
                                    : 'Öğrenildi ✓'
                                  : lang === 'en'
                                    ? 'Mark learned'
                                    : 'Öğrendim'}
                              </span>
                            </button>
                            <Link
                              href={labHref}
                              onClick={onButtonPop}
                              className="cik-caption-2 inline-flex min-h-8 items-center gap-1 rounded-pill bg-cik-pink px-2.5 text-cik-cta"
                            >
                              <span>{lang === 'en' ? 'Word Lab' : "Kelime Lab'da Aç"}</span>
                              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1.5">
                          <button
                            type="button"
                            aria-label={`${feed.listenEn}: ${entry.word}`}
                            onClick={() => {
                              onButtonPop();
                              speakVocabularyText(entry.word, 'en-US', 0.9);
                            }}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cik-cta text-cik-on-cta"
                          >
                            <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${lang === 'en' ? 'Slow' : 'Yavaş'}: ${entry.word}`}
                            onClick={() => {
                              onButtonPop();
                              speakVocabularyText(entry.word, 'en-US', 0.68);
                            }}
                            className="cik-caption-2 inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text"
                          >
                            0.7x
                          </button>
                        </div>
                      </div>
                    </SwipeRow>
                  );
                })
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
