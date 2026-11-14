import type { FactCard } from '@/types/fact';

const BANNED_GIF_PATTERN =
  /(?:^|[^a-z0-9])(meme|memes|reaction|reactions|funny|anime|text|quote|quotes|caption|lol|wtf|mrw|mfw|subtitles|gif\s*text)(?:$|[^a-z0-9])/i;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const NEGATIVE_CACHE_MS = 1000 * 60 * 15; // 15 minutes when upstream had no clean match
const ERROR_CACHE_MS = 1000 * 60 * 2; // 2 minutes on transient error/rate limit
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  url: string | null;
  provider: 'giphy' | 'tenor' | 'none';
  expiresAt: number;
}

const gifQueryCache = new Map<string, CacheEntry>();

export interface RawGifCandidate {
  url: string;
  title?: string;
  slug?: string;
  tags?: string[];
  isSticker?: boolean;
}

/**
 * Sanitizes and validates a semantic English visual search query (ideally 2–4 words).
 * Rejects non-English prose sentences so we never send long local captions to GIF APIs.
 */
export function sanitizeVisualQuery(rawQuery?: string | null): string | null {
  if (!rawQuery) return null;
  const cleaned = String(rawQuery)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 3 || cleaned.length > 60) {
    return null;
  }

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > 6) {
    return null;
  }

  return words.slice(0, 4).join(' ').toLowerCase();
}

/**
 * Derives a compact fallback English visual query from a FactCard when `visualQuery`
 * is present on the card or safely derivable from its English title.
 */
export function resolveCardVisualQuery(fact: FactCard): string | null {
  const direct = sanitizeVisualQuery(fact.visualQuery);
  if (direct) return direct;

  // Fallback: extract up to 3 concrete English keywords from en.title (ignore stopwords)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by',
    'with', 'is', 'are', 'was', 'were', 'can', 'than', 'that', 'this', 'your', 'only',
    'more', 'most', 'nearly', 'over', 'about', 'just', 'into', 'like', 'its', 'not',
  ]);
  const tokens = String(fact.en?.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));

  if (tokens.length < 2) return null;
  return sanitizeVisualQuery(tokens.slice(0, 3).join(' '));
}

export function isCleanGifUrl(url: string, metaParts: Array<string | undefined> = []): boolean {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl.startsWith('https://')) return false;
  const combined = [cleanUrl, ...metaParts].filter(Boolean).join(' ').trim();
  if (combined && BANNED_GIF_PATTERN.test(combined)) {
    return false;
  }
  return true;
}

/**
 * Filters out reaction/meme/anime/text-heavy GIFs and returns the first clean URL.
 */
export function pickFirstCleanGifUrl(candidates: RawGifCandidate[]): string | null {
  for (const item of candidates) {
    if (!item || !item.url || item.isSticker) continue;
    const url = String(item.url).trim();
    if (!isCleanGifUrl(url, [item.title, item.slug, ...(item.tags || [])])) {
      continue;
    }

    return url;
  }
  return null;
}

async function fetchFromGiphy(
  query: string,
  apiKey: string
): Promise<{ candidates: RawGifCandidate[]; hadError: boolean }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    limit: '8',
    offset: '0',
    rating: 'pg',
    lang: 'en',
  });

  const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, {
    signal: AbortSignal.timeout(3500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { candidates: [], hadError: true };

  const json = (await res.json()) as {
    data?: Array<{
      title?: string;
      slug?: string;
      url?: string;
      is_sticker?: number | boolean;
      tags?: string[];
      images?: {
        downsized_medium?: { url?: string };
        fixed_height?: { url?: string };
        original?: { url?: string };
      };
    }>;
  };

  if (!Array.isArray(json.data)) return { candidates: [], hadError: false };
  return {
    hadError: false,
    candidates: json.data.map((row) => ({
      url:
        row.images?.downsized_medium?.url ||
        row.images?.fixed_height?.url ||
        row.images?.original?.url ||
        '',
      title: row.title || '',
      slug: `${row.slug || ''} ${row.url || ''}`.trim(),
      tags: Array.isArray(row.tags) ? row.tags : [],
      isSticker: Boolean(row.is_sticker),
    })),
  };
}

async function fetchFromTenor(
  query: string,
  apiKey: string
): Promise<{ candidates: RawGifCandidate[]; hadError: boolean }> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    limit: '8',
    contentfilter: 'high',
    media_filter: 'gif,mediumgif,tinygif',
    locale: 'en_US',
  });

  const res = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, {
    signal: AbortSignal.timeout(3500),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return { candidates: [], hadError: true };

  const json = (await res.json()) as {
    results?: Array<{
      title?: string;
      h1_title?: string;
      content_description?: string;
      itemurl?: string;
      url?: string;
      tags?: string[];
      flags?: string[];
      media_formats?: {
        mediumgif?: { url?: string };
        gif?: { url?: string };
        tinygif?: { url?: string };
      };
    }>;
  };

  if (!Array.isArray(json.results)) return { candidates: [], hadError: false };
  return {
    hadError: false,
    candidates: json.results.map((row) => ({
      url:
        row.media_formats?.mediumgif?.url ||
        row.media_formats?.gif?.url ||
        row.media_formats?.tinygif?.url ||
        '',
      title: [row.content_description, row.title, row.h1_title].filter(Boolean).join(' '),
      slug: [row.itemurl, row.url].filter(Boolean).join(' '),
      tags: Array.isArray(row.tags) ? row.tags : [],
      isSticker: Array.isArray(row.flags) && row.flags.includes('sticker'),
    })),
  };
}

function setCachedQuery(key: string, entry: CacheEntry) {
  if (gifQueryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = gifQueryCache.keys().next().value;
    if (oldestKey) gifQueryCache.delete(oldestKey);
  }
  gifQueryCache.set(key, entry);
}

/**
 * Searches configured GIF providers using a concise semantic `visualQuery`.
 * Never throws; returns `null` cleanly whenever no key is configured, an API error occurs,
 * or all candidates fail topic/cleanliness filtering (allowing abstract canvas fallback).
 */
export async function searchTopicGif(rawQuery: string): Promise<{
  gifUrl: string | null;
  provider: 'giphy' | 'tenor' | 'none';
  cached: boolean;
}> {
  const cleanQuery = sanitizeVisualQuery(rawQuery);
  if (!cleanQuery) {
    return { gifUrl: null, provider: 'none', cached: false };
  }

  const giphyKey = process.env.GIPHY_API_KEY?.trim() || '';
  const tenorKey = process.env.TENOR_API_KEY?.trim() || '';
  if (!giphyKey && !tenorKey) {
    return { gifUrl: null, provider: 'none', cached: false };
  }

  const now = Date.now();
  const cached = gifQueryCache.get(cleanQuery);
  if (cached && cached.expiresAt > now) {
    return { gifUrl: cached.url, provider: cached.provider, cached: true };
  }

  let sawUpstreamError = false;

  try {
    if (giphyKey) {
      const { candidates, hadError } = await fetchFromGiphy(cleanQuery, giphyKey);
      sawUpstreamError = sawUpstreamError || hadError;
      const url = pickFirstCleanGifUrl(candidates);
      if (url) {
        setCachedQuery(cleanQuery, {
          url,
          provider: 'giphy',
          expiresAt: now + CACHE_TTL_MS,
        });
        return { gifUrl: url, provider: 'giphy', cached: false };
      }
    }

    if (tenorKey) {
      const { candidates, hadError } = await fetchFromTenor(cleanQuery, tenorKey);
      sawUpstreamError = sawUpstreamError || hadError;
      const url = pickFirstCleanGifUrl(candidates);
      if (url) {
        setCachedQuery(cleanQuery, {
          url,
          provider: 'tenor',
          expiresAt: now + CACHE_TTL_MS,
        });
        return { gifUrl: url, provider: 'tenor', cached: false };
      }
    }
  } catch {
    sawUpstreamError = true;
  }

  setCachedQuery(cleanQuery, {
    url: null,
    provider: 'none',
    expiresAt: now + (sawUpstreamError ? ERROR_CACHE_MS : NEGATIVE_CACHE_MS),
  });
  return { gifUrl: null, provider: 'none', cached: false };
}
