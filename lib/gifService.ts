import {
  consumeHourlyGifQuotaServer,
  getHourlyGifQuotaStatusServer,
  markGifHourlyQuotaExhaustedServer,
} from '@/lib/serverGifMatcher';
import type { CategoryId, FactCard } from '@/types/fact';

const BANNED_GIF_PATTERN =
  /(?:^|[^a-z0-9])(meme|memes|reaction|reactions|funny|anime|text|quote|quotes|caption|lol|wtf|mrw|mfw|subtitles|gif\s*text|sticker|stickers|typography|wordart|word\s*art|shrug)(?:$|[^a-z0-9])/i;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const NEGATIVE_CACHE_MS = 1000 * 60 * 15; // 15 minutes when upstream had no clean match
const ERROR_CACHE_MS = 1000 * 60 * 2; // 2 minutes on transient error/rate limit
const MAX_CACHE_ENTRIES = 500;

const CATEGORY_RELEVANCE_TERMS: Record<string, string[]> = {
  space: [
    'space', 'planet', 'galaxy', 'star', 'stars', 'cosmos', 'astronaut', 'nebula',
    'orbit', 'moon', 'mars', 'jupiter', 'saturn', 'sun', 'solar', 'telescope',
    'universe', 'blackhole', 'comet', 'asteroid', 'rocket', 'earth',
  ],
  nature: [
    'nature', 'wildlife', 'ocean', 'sea', 'forest', 'animal', 'animals', 'bird',
    'whale', 'octopus', 'shark', 'tree', 'plant', 'earth', 'water', 'coral',
    'volcano', 'mountain', 'river', 'insect', 'bee', 'rainforest', 'jungle',
  ],
  human_body: [
    'human', 'body', 'brain', 'heart', 'neuron', 'blood', 'cell', 'cells',
    'dna', 'muscle', 'eye', 'skeleton', 'lung', 'nerve', 'biology', 'anatomy', 'pulse',
  ],
  history: [
    'history', 'ancient', 'ruins', 'temple', 'pyramid', 'museum', 'artifact',
    'castle', 'empire', 'roman', 'egypt', 'greek', 'knight', 'medieval', 'archaeology',
    'fossil', 'monument', 'statue',
  ],
  science: [
    'science', 'physics', 'chemistry', 'atom', 'molecule', 'laboratory', 'experiment',
    'laser', 'magnet', 'quantum', 'electricity', 'crystal', 'microscope', 'energy',
    'light', 'wave', 'plasma',
  ],
  records: [
    'record', 'extreme', 'lightning', 'volcano', 'storm', 'hurricane', 'tornado',
    'mountain', 'waterfall', 'fastest', 'deepest', 'tallest', 'glacier', 'desert', 'cheetah',
  ],
  statistics: [
    'data', 'chart', 'graph', 'city', 'crowd', 'earth', 'globe', 'population',
    'network', 'analytics', 'clock', 'calendar', 'dice', 'probability', 'map',
  ],
};

const STOP_RELEVANCE_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'most',
  'more', 'than', 'every', 'about', 'what', 'when', 'where', 'which', 'only',
  'are', 'was', 'were', 'has', 'have', 'had', 'can', 'not', 'but', 'its', 'your',
  'giphy', 'tenor', 'media', 'gifs', 'gif', 'view', 'webp', 'com', 'http', 'https', 'www',
]);

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

export interface GiphyImageVariants {
  fixed_height?: { url?: string; webp?: string; mp4?: string };
  downsized_medium?: { url?: string };
  original?: { url?: string; webp?: string; mp4?: string };
}

export interface TenorMediaFormats {
  tinygif?: { url?: string };
  mediumgif?: { url?: string };
  gif?: { url?: string };
  mp4?: { url?: string };
}

export interface PickGifOptions {
  expectedTerms?: string[];
  category?: CategoryId | string;
}

interface ProviderFetchResult {
  candidates: RawGifCandidate[];
  hadError: boolean;
  rateLimited: boolean;
}

export function hasConfiguredGifProviderKeys(): boolean {
  return Boolean(process.env.GIPHY_API_KEY?.trim() || process.env.TENOR_API_KEY?.trim());
}

/**
 * Ensures URL is HTTPS and a static/animated raster image format compatible with `<img src>`
 * on iOS Safari, Android Chrome, and Desktop browsers (never `.mp4` / `.webm` or sticker endpoints).
 */
export function isRenderableGifImageUrl(url?: string | null): boolean {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl.startsWith('https://')) return false;
  if (/\.(mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i.test(cleanUrl)) return false;
  if (/\/stickers?\//i.test(cleanUrl)) return false;
  return true;
}

/**
 * Selects fastest web-safe image format from Giphy image variants for `<img src>`:
 * fixed_height.webp -> downsized_medium.url -> fixed_height.url -> original.url.
 */
export function pickBestGiphyImageUrl(images?: GiphyImageVariants | null): string {
  if (!images) return '';
  const ordered = [
    images.fixed_height?.webp,
    images.downsized_medium?.url,
    images.fixed_height?.url,
    images.original?.url,
  ];
  for (const candidate of ordered) {
    if (isRenderableGifImageUrl(candidate)) {
      return String(candidate).trim();
    }
  }
  return '';
}

/**
 * Selects fastest web-safe image format from Tenor `media_formats` for `<img src>`:
 * tinygif.url -> mediumgif.url -> gif.url.
 */
export function pickBestTenorImageUrl(mediaFormats?: TenorMediaFormats | null): string {
  if (!mediaFormats) return '';
  const ordered = [
    mediaFormats.tinygif?.url,
    mediaFormats.mediumgif?.url,
    mediaFormats.gif?.url,
  ];
  for (const candidate of ordered) {
    if (isRenderableGifImageUrl(candidate)) {
      return String(candidate).trim();
    }
  }
  return '';
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
  const direct = sanitizeVisualQuery(fact.gifQuery || fact.visualQuery);
  if (direct) return direct;

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
  if (!isRenderableGifImageUrl(cleanUrl)) return false;
  const combined = [cleanUrl, ...metaParts].filter(Boolean).join(' ').trim();
  if (combined && BANNED_GIF_PATTERN.test(combined)) {
    return false;
  }
  return true;
}

function extractDescriptiveMetaTokens(candidate: RawGifCandidate): string[] {
  const slugPath = String(candidate.slug || '')
    .replace(/https?:\/\/[^/\s]+/gi, ' ')
    .replace(/[^a-zA-Z\s-]/g, ' ');
  const combined = [candidate.title || '', slugPath, ...(candidate.tags || [])]
    .join(' ')
    .toLowerCase();

  return Array.from(
    new Set(
      combined
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_RELEVANCE_WORDS.has(w))
    )
  );
}

function tokenMatchesTerm(token: string, term: string): boolean {
  if (token === term) return true;
  if (token.length >= 4 && term.length >= 4) {
    return token.startsWith(term.slice(0, 4)) || term.startsWith(token.slice(0, 4));
  }
  return false;
}

export function scoreGifCandidateRelevance(
  candidate: RawGifCandidate,
  options?: PickGifOptions
): { relevant: boolean; score: number } {
  const expectedTerms = Array.from(
    new Set(
      (options?.expectedTerms || [])
        .flatMap((t) => String(t).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/))
        .filter((w) => w.length >= 3 && !STOP_RELEVANCE_WORDS.has(w))
    )
  );
  const categoryKey = String(options?.category || '').trim().toLowerCase();
  const categoryTerms = CATEGORY_RELEVANCE_TERMS[categoryKey] || [];

  if (expectedTerms.length === 0 && categoryTerms.length === 0) {
    return { relevant: true, score: 1 };
  }

  const metaTokens = extractDescriptiveMetaTokens(candidate);
  let score = 0;

  for (const meta of metaTokens) {
    if (expectedTerms.some((term) => tokenMatchesTerm(meta, term))) {
      score += 3;
    } else if (categoryTerms.some((term) => tokenMatchesTerm(meta, term))) {
      score += 1;
    }
  }

  if (metaTokens.length >= 2 && score === 0) {
    return { relevant: false, score: 0 };
  }

  return { relevant: true, score };
}

/**
 * Filters out reaction/meme/anime/text-heavy/sticker GIFs, checks topic/category relevance,
 * and returns the best clean web-image URL.
 */
export function pickFirstCleanGifUrl(
  candidates: RawGifCandidate[],
  options?: PickGifOptions
): string | null {
  let bestUrl: string | null = null;
  let bestScore = -1;

  for (const item of candidates) {
    if (!item || !item.url || item.isSticker) continue;
    const url = String(item.url).trim();
    if (!isCleanGifUrl(url, [item.title, item.slug, ...(item.tags || [])])) {
      continue;
    }

    if (!options?.expectedTerms?.length && !options?.category) {
      return url;
    }

    const { relevant, score } = scoreGifCandidateRelevance(item, options);
    if (!relevant) continue;

    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }

  return bestUrl;
}

async function fetchFromGiphy(query: string, apiKey: string): Promise<ProviderFetchResult> {
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
  if (res.status === 429) return { candidates: [], hadError: true, rateLimited: true };
  if (!res.ok) return { candidates: [], hadError: true, rateLimited: false };

  const json = (await res.json()) as {
    data?: Array<{
      title?: string;
      slug?: string;
      url?: string;
      is_sticker?: number | boolean;
      tags?: string[];
      images?: GiphyImageVariants;
    }>;
  };

  if (!Array.isArray(json.data)) return { candidates: [], hadError: false, rateLimited: false };
  return {
    hadError: false,
    rateLimited: false,
    candidates: json.data.map((row) => ({
      url: pickBestGiphyImageUrl(row.images),
      title: row.title || '',
      slug: `${row.slug || ''} ${row.url || ''}`.trim(),
      tags: Array.isArray(row.tags) ? row.tags : [],
      isSticker: Boolean(row.is_sticker),
    })),
  };
}

async function fetchFromTenor(query: string, apiKey: string): Promise<ProviderFetchResult> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    limit: '8',
    contentfilter: 'high',
    media_filter: 'tinygif,mediumgif,gif',
    locale: 'en_US',
  });

  const res = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, {
    signal: AbortSignal.timeout(3500),
    headers: { Accept: 'application/json' },
  });
  if (res.status === 429) return { candidates: [], hadError: true, rateLimited: true };
  if (!res.ok) return { candidates: [], hadError: true, rateLimited: false };

  const json = (await res.json()) as {
    results?: Array<{
      title?: string;
      h1_title?: string;
      content_description?: string;
      itemurl?: string;
      url?: string;
      tags?: string[];
      flags?: string[];
      media_formats?: TenorMediaFormats;
    }>;
  };

  if (!Array.isArray(json.results)) return { candidates: [], hadError: false, rateLimited: false };
  return {
    hadError: false,
    rateLimited: false,
    candidates: json.results.map((row) => ({
      url: pickBestTenorImageUrl(row.media_formats),
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

interface ProviderAttemptOutcome {
  gifUrl: string | null;
  hadError: boolean;
  rateLimited: boolean;
  quotaBlocked: boolean;
  madeRequest: boolean;
}

async function queryGifProviderWithQuota(
  fetcher: (q: string, key: string) => Promise<ProviderFetchResult>,
  query: string,
  apiKey: string,
  relevanceOptions: PickGifOptions
): Promise<ProviderAttemptOutcome> {
  const allowed = await consumeHourlyGifQuotaServer();
  if (!allowed) {
    return {
      gifUrl: null,
      hadError: false,
      rateLimited: false,
      quotaBlocked: true,
      madeRequest: false,
    };
  }

  const { candidates, hadError, rateLimited } = await fetcher(query, apiKey);
  if (rateLimited) {
    await markGifHourlyQuotaExhaustedServer();
    return {
      gifUrl: null,
      hadError: true,
      rateLimited: true,
      quotaBlocked: true,
      madeRequest: true,
    };
  }

  const url = pickFirstCleanGifUrl(candidates, relevanceOptions);
  return {
    gifUrl: url,
    hadError,
    rateLimited: false,
    quotaBlocked: false,
    madeRequest: true,
  };
}

/**
 * Searches configured GIF providers using a concise semantic `visualQuery`.
 * Enforces the shared Postgres/memory 90/hr quota guard before every outbound HTTP call
 * and handles HTTP 429 cleanly by locking quota until the next hour window.
 */
export async function searchTopicGif(
  rawQuery: string,
  options?: PickGifOptions & { bypassCache?: boolean }
): Promise<{
  gifUrl: string | null;
  provider: 'giphy' | 'tenor' | 'none';
  cached: boolean;
  quotaExhausted?: boolean;
  rateLimited?: boolean;
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

  const categorySuffix = options?.category ? `::${String(options.category).toLowerCase()}` : '';
  const cacheKey = `${cleanQuery}${categorySuffix}`;
  const now = Date.now();

  if (!options?.bypassCache) {
    const cached = gifQueryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return { gifUrl: cached.url, provider: cached.provider, cached: true };
    }
  }

  const currentQuota = await getHourlyGifQuotaStatusServer();
  if (currentQuota.exhausted) {
    return { gifUrl: null, provider: 'none', cached: false, quotaExhausted: true };
  }

  const relevanceOptions: PickGifOptions = {
    expectedTerms:
      options?.expectedTerms && options.expectedTerms.length > 0
        ? options.expectedTerms
        : cleanQuery.split(' '),
    category: options?.category,
  };

  let sawUpstreamError = false;
  let madeUpstreamRequest = false;
  let blockedByQuota = false;
  let sawRateLimit = false;

  const providers: Array<{
    name: 'giphy' | 'tenor';
    key: string;
    fetcher: (q: string, key: string) => Promise<ProviderFetchResult>;
  }> = [
    ...(giphyKey ? [{ name: 'giphy' as const, key: giphyKey, fetcher: fetchFromGiphy }] : []),
    ...(tenorKey ? [{ name: 'tenor' as const, key: tenorKey, fetcher: fetchFromTenor }] : []),
  ];

  try {
    for (const provider of providers) {
      const outcome = await queryGifProviderWithQuota(
        provider.fetcher,
        cleanQuery,
        provider.key,
        relevanceOptions
      );
      if (outcome.madeRequest) madeUpstreamRequest = true;
      if (outcome.hadError) sawUpstreamError = true;
      if (outcome.rateLimited) sawRateLimit = true;
      if (outcome.quotaBlocked) {
        blockedByQuota = true;
        break;
      }
      if (outcome.gifUrl) {
        setCachedQuery(cacheKey, {
          url: outcome.gifUrl,
          provider: provider.name,
          expiresAt: now + CACHE_TTL_MS,
        });
        return { gifUrl: outcome.gifUrl, provider: provider.name, cached: false };
      }
    }
  } catch {
    sawUpstreamError = true;
  }

  if ((blockedByQuota && !madeUpstreamRequest) || sawRateLimit) {
    return {
      gifUrl: null,
      provider: 'none',
      cached: false,
      quotaExhausted: true,
      ...(sawRateLimit ? { rateLimited: true } : {}),
    };
  }

  if (madeUpstreamRequest) {
    setCachedQuery(cacheKey, {
      url: null,
      provider: 'none',
      expiresAt: now + (sawUpstreamError ? ERROR_CACHE_MS : NEGATIVE_CACHE_MS),
    });
  }

  return {
    gifUrl: null,
    provider: 'none',
    cached: false,
    ...(blockedByQuota ? { quotaExhausted: true } : {}),
  };
}
