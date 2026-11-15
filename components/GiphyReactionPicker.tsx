'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, Send } from 'lucide-react';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';

export interface ReactionGifSelection {
  id?: string;
  url: string;
  previewUrl?: string;
  title: string;
}

export interface GiphyReactionItemDisplay {
  senderName: string;
  url: string;
  title?: string;
  isSelf?: boolean;
}

export interface GiphyReactionPickerProps {
  lang: 'tr' | 'en';
  onSelectGif: (gif: ReactionGifSelection) => void | Promise<void>;
  recentReactions?: GiphyReactionItemDisplay[];
  sending?: boolean;
  compact?: boolean;
}

interface MoodChip {
  id: string;
  label: string;
  query: string;
}

const REACTION_MOOD_CHIPS: readonly MoodChip[] = [
  { id: 'gg', label: 'GG', query: 'gg' },
  { id: 'fire', label: '🔥 Fire', query: 'fire' },
  { id: 'genius', label: '🧠 Genius', query: 'genius' },
  { id: 'mind-blown', label: '🤯 Mind Blown', query: 'mind blown' },
  { id: 'fast', label: '⚡ Fast', query: 'fast' },
  { id: 'victory', label: '🎉 Victory', query: 'victory' },
] as const;

export default function GiphyReactionPicker({
  lang,
  onSelectGif,
  recentReactions = [],
  sending = false,
  compact = false,
}: GiphyReactionPickerProps) {
  const [queryInput, setQueryInput] = useState('');
  const [activeMoodId, setActiveMoodId] = useState<string>('all');
  const [gifs, setGifs] = useState<ReactionGifSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const loadReactionGifs = useCallback(async (searchQuery: string) => {
    const reqId = requestSeqRef.current + 1;
    requestSeqRef.current = reqId;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        mode: 'reactions',
        limit: '6',
      });
      if (searchQuery.trim()) {
        qs.set('query', searchQuery.trim());
      }
      const res = await fetch(`/api/gif?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        if (requestSeqRef.current === reqId) setGifs([]);
        return;
      }
      const data = (await res.json()) as {
        gifs?: Array<{
          id?: string;
          url?: string;
          previewUrl?: string;
          title?: string;
        }>;
      };
      if (requestSeqRef.current !== reqId) return;
      const cleaned: ReactionGifSelection[] = Array.isArray(data.gifs)
        ? data.gifs
            .filter(
              (item): item is { id?: string; url: string; previewUrl?: string; title?: string } =>
                Boolean(item?.url && typeof item.url === 'string' && item.url.startsWith('https://'))
            )
            .slice(0, 6)
            .map((item) => ({
              id: item.id,
              url: item.url,
              previewUrl:
                item.previewUrl && item.previewUrl.startsWith('https://')
                  ? item.previewUrl
                  : item.url,
              title: (item.title || 'Reaction GIF').trim(),
            }))
        : [];
      setGifs(cleaned);
    } catch {
      if (requestSeqRef.current === reqId) {
        setGifs([]);
      }
    } finally {
      if (requestSeqRef.current === reqId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadReactionGifs('');
  }, [loadReactionGifs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveMoodId('');
    void loadReactionGifs(queryInput);
  };

  const handleMoodClick = (chip: MoodChip) => {
    setActiveMoodId(chip.id);
    setQueryInput(chip.query);
    void loadReactionGifs(chip.query);
  };

  const handlePickGif = (gif: ReactionGifSelection) => {
    if (sending) return;
    setSelectedUrl(gif.url);
    void onSelectGif(gif);
  };

  const heading = lang === 'tr' ? '🎬 GIF ile Tepki Gönder' : '🎬 Send Reaction GIF';
  const placeholder = lang === 'tr' ? "GIPHY'de ara..." : 'Search GIPHY...';

  return (
    <div
      data-testid="giphy-reaction-picker"
      className={`rounded-2xl border border-violet-200/80 bg-violet-50/70 dark:border-white/15 dark:bg-[#12121C]/95 ${
        compact ? 'p-2.5' : 'p-3.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black tracking-tight text-ink dark:text-white">
          {heading}
        </p>
        {sending && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{lang === 'tr' ? 'Gönderiliyor' : 'Sending'}</span>
          </span>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearchSubmit} className="mt-2 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/45 dark:text-white/45" />
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            data-testid="giphy-reaction-search-input"
            className="w-full rounded-xl border border-violet-200/90 bg-white py-1.5 pl-8 pr-2.5 text-xs font-semibold text-ink placeholder:text-ink/45 focus:border-violet-500 focus:outline-none dark:border-white/15 dark:bg-[#1A1A28] dark:text-white dark:placeholder:text-white/45"
          />
        </div>
        <button
          type="submit"
          data-testid="giphy-reaction-search-btn"
          aria-label={lang === 'tr' ? 'GIF Ara' : 'Search GIFs'}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 px-2.5 text-xs font-extrabold text-white transition hover:bg-violet-500"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Popular Reaction Mood Chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {REACTION_MOOD_CHIPS.map((chip) => {
          const active = activeMoodId === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleMoodClick(chip)}
              data-testid={`giphy-mood-chip-${chip.id}`}
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold transition ${
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'border border-violet-200/80 bg-white/90 text-ink/80 hover:border-violet-400 dark:border-white/15 dark:bg-white/10 dark:text-violet-100'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* 6 Animated GIF Tiles */}
      <div className="mt-2.5">
        {loading ? (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[4/3] animate-pulse rounded-xl bg-violet-200/60 dark:bg-white/10"
              />
            ))}
          </div>
        ) : gifs.length > 0 ? (
          <div
            data-testid="giphy-reaction-grid"
            className="grid grid-cols-3 gap-1.5"
          >
            {gifs.map((gif, idx) => {
              const isSelected = selectedUrl === gif.url;
              return (
                <button
                  key={gif.id || `${gif.url}-${idx}`}
                  type="button"
                  disabled={sending}
                  onClick={() => handlePickGif(gif)}
                  title={gif.title}
                  data-testid={`giphy-reaction-tile-${idx}`}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-xl border transition focus:outline-none ${
                    isSelected
                      ? 'border-emerald-400 ring-2 ring-emerald-400/60'
                      : 'border-white/20 hover:border-violet-400'
                  } bg-[#0A0A0E]`}
                >
                  <img
                    src={gif.previewUrl || gif.url}
                    alt={gif.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white/90">
                    {gif.title}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-violet-300/60 py-3 text-center text-[11px] font-semibold text-ink/60 dark:border-white/15 dark:text-white/60">
            {lang === 'tr'
              ? 'Şu an uygun tepki GIF’i bulunamadı.'
              : 'No reaction GIFs found right now.'}
          </p>
        )}
      </div>

      {/* Live Sent Reactions Stream */}
      {recentReactions.length > 0 && (
        <div
          data-testid="giphy-recent-reactions"
          className="mt-2.5 flex flex-wrap gap-2 border-t border-violet-200/60 pt-2 dark:border-white/10"
        >
          {recentReactions.map((reaction, idx) => (
            <div
              key={`${reaction.senderName}-${reaction.url}-${idx}`}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1 ${
                reaction.isSelf
                  ? 'border-violet-400/60 bg-violet-100/80 dark:border-violet-500/50 dark:bg-violet-950/60'
                  : 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/40'
              }`}
            >
              <img
                src={reaction.url}
                alt={reaction.title || reaction.senderName}
                className="h-9 w-12 shrink-0 rounded-lg object-cover bg-[#0A0A0E]"
              />
              <div className="min-w-0 pr-1">
                <p className="truncate text-[10px] font-black text-ink dark:text-white">
                  {reaction.senderName}
                </p>
                {reaction.title && (
                  <p className="max-w-[110px] truncate text-[9px] font-semibold text-ink/65 dark:text-white/70">
                    {reaction.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex justify-end">
        <PoweredByGiphyBadge compact lang={lang} />
      </div>
    </div>
  );
}
