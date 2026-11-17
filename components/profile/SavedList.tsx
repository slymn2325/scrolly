'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Bookmark, ExternalLink, Heart, Trash2, Volume2 } from 'lucide-react';
import EmptyState from '@/components/cikartma/EmptyState';
import { profileCopy } from '@/components/profile/copy';
import { FEED_EXPERIENCE_COPY, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { SavedVocabularyEntry, VocabPartOfSpeech } from '@/types/vocabulary';
import { buildFactHref, getFactPrimarySlug, type FactCard } from '@/utils/factsData';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';
import { speakVocabularyText } from '@/utils/vocabNotebook';

type SavedFilter = 'saved' | 'liked' | 'vocab';

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
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const pendingRef = useRef<PendingRemove | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (vocabFocus > 0) setFilter('vocab');
  }, [vocabFocus]);

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
  const visibleVocab = vocab.filter((entry) => !hidden.has(`vocab:${entry.id}`));

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
                    className="flex items-start gap-2 text-cik-text"
                  >
                    <Bookmark size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                    <img src={meta.iconPath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                    <span className="cik-footnote line-clamp-2">{fact[lang].title}</span>
                    <ExternalLink size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0 text-cik-text-3" />
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
                    className="flex items-start gap-2 text-cik-text"
                  >
                    <Heart size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                    <img src={meta.iconPath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                    <span className="cik-footnote line-clamp-2">{fact[lang].title}</span>
                  </Link>
                </SwipeRow>
              );
            })
          )}
        </div>
      ) : null}

      {filter === 'vocab' ? (
        <div data-testid="diploma-vocab-notebook" className="flex flex-col gap-2">
          <h3 className="cik-headline flex items-center gap-2 text-cik-text">
            <BookMarked size={20} strokeWidth={2} aria-hidden="true" />
            <span>
              {feed.vocabNotebookTitle} ({visibleVocab.length})
            </span>
          </h3>
          {visibleVocab.length === 0 ? (
            <EmptyState imageSrc="/assets/fluent/books.png" imageAlt="" title={copy.vocabFilter} body={copy.vocabEmpty} />
          ) : (
            visibleVocab.map((entry) => (
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
                    <p className="cik-headline text-cik-text">
                      {entry.word}{' '}
                      <span className="cik-caption-2 font-mono text-cik-text-2" data-phonetic="true">
                        {formatPhoneticForDisplay(entry.phonetic)}
                      </span>
                    </p>
                    <p className="cik-footnote text-cik-text-2">
                      {entry.meaningTr} · {POS_LABELS[entry.partOfSpeech]?.[lang] ?? entry.partOfSpeech}
                    </p>
                    <p className="cik-caption-1 mt-1 line-clamp-2 text-cik-text-2">{entry.exampleEn}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${feed.listenEn}: ${entry.word}`}
                    onClick={() => {
                      onButtonPop();
                      speakVocabularyText(entry.word, 'en-US', 0.9);
                    }}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-cik-cta text-cik-on-cta"
                  >
                    <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </SwipeRow>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
