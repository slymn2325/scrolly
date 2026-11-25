import {
  consumeHourlyGifQuotaServer,
  getHourlyGifQuotaStatusServer,
  markGifHourlyQuotaExhaustedServer,
} from '@/lib/serverGifMatcher';
import type { CategoryId, FactCard } from '@/types/fact';
import { resolveCardMedia } from '@/lib/resolveCardMedia.mjs';

const BANNED_GIF_PATTERN =
  /(?:^|[^a-z0-9])(meme|memes|reaction|reactions|funny|anime|text|quote|quotes|caption|lol|wtf|mrw|mfw|subtitles|gif\s*text|sticker|stickers|typography|wordart|word\s*art|shrug)(?:$|[^a-z0-9])/i;

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const NEGATIVE_CACHE_MS = 1000 * 60 * 15; // 15 minutes when upstream had no clean match
const ERROR_CACHE_MS = 1000 * 60 * 2; // 2 minutes on transient error/rate limit
const MAX_CACHE_ENTRIES = 500;

function redactSecrets(text: string): string {
  return text.replace(/([?&](?:api_key|key|token)=)[^&\s]+/gi, '$1[REDACTED]');
}

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
  fixed_height_small?: { url?: string; webp?: string };
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
  status: number;
  dataLength: number;
  errorKind?: 'auth' | 'rate_limit' | 'http' | 'timeout' | 'network' | null;
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
  options?: PickGifOptions & { logRejections?: boolean; queryLabel?: string }
): string | null {
  let bestUrl: string | null = null;
  let bestScore = -1;
  let rejectedMissingUrl = 0;
  let rejectedSticker = 0;
  let rejectedBannedOrUnsafe = 0;
  let rejectedIrrelevant = 0;

  for (const item of candidates) {
    if (!item || !item.url) {
      rejectedMissingUrl += 1;
      continue;
    }
    if (item.isSticker) {
      rejectedSticker += 1;
      continue;
    }
    const url = String(item.url).trim();
    if (!isCleanGifUrl(url, [item.title, item.slug, ...(item.tags || [])])) {
      rejectedBannedOrUnsafe += 1;
      continue;
    }

    if (!options?.expectedTerms?.length && !options?.category) {
      return url;
    }

    const { relevant, score } = scoreGifCandidateRelevance(item, options);
    if (!relevant) {
      rejectedIrrelevant += 1;
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }

  if (!bestUrl && (options?.logRejections || candidates.length > 0)) {
    console.log(
      `[gifService] pickFirstCleanGifUrl rejected all candidates` +
        ` query="${options?.queryLabel || ''}"` +
        ` total=${candidates.length}` +
        ` missingUrl=${rejectedMissingUrl}` +
        ` sticker=${rejectedSticker}` +
        ` bannedOrUnsafe=${rejectedBannedOrUnsafe}` +
        ` irrelevant=${rejectedIrrelevant}`
    );
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

  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: 'application/json' },
    });

    if (res.status === 401 || res.status === 403) {
      console.error(
        `[gifService] Giphy HTTP ${res.status} (auth) query="${query}" data.length=0 — check GIPHY_API_KEY`
      );
      return {
        candidates: [],
        hadError: true,
        rateLimited: false,
        status: res.status,
        dataLength: 0,
        errorKind: 'auth',
      };
    }
    if (res.status === 429) {
      console.error(`[gifService] Giphy HTTP 429 (rate limit) query="${query}" data.length=0`);
      return {
        candidates: [],
        hadError: true,
        rateLimited: true,
        status: 429,
        dataLength: 0,
        errorKind: 'rate_limit',
      };
    }
    if (!res.ok) {
      console.error(`[gifService] Giphy HTTP ${res.status} query="${query}" data.length=0`);
      return {
        candidates: [],
        hadError: true,
        rateLimited: false,
        status: res.status,
        dataLength: 0,
        errorKind: 'http',
      };
    }

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

    const rows = Array.isArray(json.data) ? json.data : [];
    console.log(`[gifService] Giphy HTTP 200 query="${query}" data.length=${rows.length}`);
    if (rows.length === 0) {
      console.log(`[gifService] Giphy returned 0 results for query="${query}"`);
    }

    return {
      hadError: false,
      rateLimited: false,
      status: 200,
      dataLength: rows.length,
      errorKind: null,
      candidates: rows.map((row) => ({
        url: pickBestGiphyImageUrl(row.images),
        title: row.title || '',
        slug: `${row.slug || ''} ${row.url || ''}`.trim(),
        tags: Array.isArray(row.tags) ? row.tags : [],
        isSticker: Boolean(row.is_sticker),
      })),
    };
  } catch (err) {
    const msg = redactSecrets(err instanceof Error ? err.message : String(err));
    const isTimeout = /timeout|aborted|AbortError/i.test(msg);
    console.error(
      `[gifService] Giphy ${isTimeout ? 'timeout' : 'network'} error query="${query}": ${msg}`
    );
    return {
      candidates: [],
      hadError: true,
      rateLimited: false,
      status: 0,
      dataLength: 0,
      errorKind: isTimeout ? 'timeout' : 'network',
    };
  }
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

  try {
    const res = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401 || res.status === 403) {
      console.error(`[gifService] Tenor HTTP ${res.status} (auth) query="${query}" data.length=0`);
      return {
        candidates: [],
        hadError: true,
        rateLimited: false,
        status: res.status,
        dataLength: 0,
        errorKind: 'auth',
      };
    }
    if (res.status === 429) {
      console.error(`[gifService] Tenor HTTP 429 (rate limit) query="${query}" data.length=0`);
      return {
        candidates: [],
        hadError: true,
        rateLimited: true,
        status: 429,
        dataLength: 0,
        errorKind: 'rate_limit',
      };
    }
    if (!res.ok) {
      console.error(`[gifService] Tenor HTTP ${res.status} query="${query}" data.length=0`);
      return {
        candidates: [],
        hadError: true,
        rateLimited: false,
        status: res.status,
        dataLength: 0,
        errorKind: 'http',
      };
    }

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

    const rows = Array.isArray(json.results) ? json.results : [];
    console.log(`[gifService] Tenor HTTP 200 query="${query}" data.length=${rows.length}`);
    return {
      hadError: false,
      rateLimited: false,
      status: 200,
      dataLength: rows.length,
      errorKind: null,
      candidates: rows.map((row) => ({
        url: pickBestTenorImageUrl(row.media_formats),
        title: [row.content_description, row.title, row.h1_title].filter(Boolean).join(' '),
        slug: [row.itemurl, row.url].filter(Boolean).join(' '),
        tags: Array.isArray(row.tags) ? row.tags : [],
        isSticker: Array.isArray(row.flags) && row.flags.includes('sticker'),
      })),
    };
  } catch (err) {
    const msg = redactSecrets(err instanceof Error ? err.message : String(err));
    const isTimeout = /timeout|aborted|AbortError/i.test(msg);
    console.error(
      `[gifService] Tenor ${isTimeout ? 'timeout' : 'network'} error query="${query}": ${msg}`
    );
    return {
      candidates: [],
      hadError: true,
      rateLimited: false,
      status: 0,
      dataLength: 0,
      errorKind: isTimeout ? 'timeout' : 'network',
    };
  }
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
  emptyResult: boolean;
  status: number;
  dataLength: number;
  errorKind?: ProviderFetchResult['errorKind'];
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
      emptyResult: false,
      status: 0,
      dataLength: 0,
      errorKind: null,
    };
  }

  const fetched = await fetcher(query, apiKey);
  if (fetched.rateLimited) {
    await markGifHourlyQuotaExhaustedServer();
    return {
      gifUrl: null,
      hadError: true,
      rateLimited: true,
      quotaBlocked: true,
      madeRequest: true,
      emptyResult: true,
      status: fetched.status,
      dataLength: fetched.dataLength,
      errorKind: fetched.errorKind,
    };
  }

  const url = pickFirstCleanGifUrl(fetched.candidates, {
    ...relevanceOptions,
    logRejections: true,
    queryLabel: query,
  });
  return {
    gifUrl: url,
    hadError: fetched.hadError,
    rateLimited: false,
    quotaBlocked: false,
    madeRequest: true,
    emptyResult: !url,
    status: fetched.status,
    dataLength: fetched.dataLength,
    errorKind: fetched.errorKind,
  };
}

/**
 * Searches configured GIF providers using a concise semantic `visualQuery`.
 * Enforces the shared Postgres/memory 90/hr quota guard before every outbound HTTP call
 * and handles HTTP 429 cleanly by locking quota until the next hour window.
 */
export async function searchTopicGif(
  rawQuery: string,
  options?: PickGifOptions & { bypassCache?: boolean; relaxRelevance?: boolean }
): Promise<{
  gifUrl: string | null;
  provider: 'giphy' | 'tenor' | 'none';
  cached: boolean;
  quotaExhausted?: boolean;
  rateLimited?: boolean;
  emptyResult?: boolean;
  upstreamError?: boolean;
  httpStatus?: number;
  dataLength?: number;
  errorKind?: ProviderFetchResult['errorKind'];
  mediaType?: string | null;
  mediaSource?: string | null;
  mediaCredit?: string | null;
  posterUrl?: string | null;
}> {
  const cleanQuery = sanitizeVisualQuery(rawQuery);
  if (!cleanQuery) {
    return { gifUrl: null, provider: 'none', cached: false, emptyResult: true };
  }

  const resolved = await resolveCardMedia({
    query: cleanQuery,
    category: options?.category ? String(options.category) : undefined,
    slug: '',
    isVocab: false,
  });
  if (resolved.url) {
    const provider = resolved.mediaSource === 'giphy' ? 'giphy' : 'none';
    return {
      gifUrl: resolved.url,
      provider,
      cached: false,
      mediaType: resolved.mediaType,
      mediaSource: resolved.mediaSource,
      mediaCredit: resolved.mediaCredit,
      posterUrl: resolved.posterUrl,
    };
  }

  const giphyKey = process.env.GIPHY_API_KEY?.trim() || '';
  const tenorKey = process.env.TENOR_API_KEY?.trim() || '';
  if (!giphyKey && !tenorKey) {
    return { gifUrl: null, provider: 'none', cached: false };
  }

  const categorySuffix = options?.category ? `::${String(options.category).toLowerCase()}` : '';
  const relaxSuffix = options?.relaxRelevance ? '::relax' : '';
  const cacheKey = `${cleanQuery}${categorySuffix}${relaxSuffix}`;
  const now = Date.now();

  if (!options?.bypassCache) {
    const cached = gifQueryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        gifUrl: cached.url,
        provider: cached.provider,
        cached: true,
        emptyResult: !cached.url,
      };
    }
  }

  const currentQuota = await getHourlyGifQuotaStatusServer();
  if (currentQuota.exhausted) {
    return { gifUrl: null, provider: 'none', cached: false, quotaExhausted: true };
  }

  const relevanceOptions: PickGifOptions = options?.relaxRelevance
    ? { category: options?.category }
    : {
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
  let lastStatus = 0;
  let lastDataLength = 0;
  let lastErrorKind: ProviderFetchResult['errorKind'] = null;
  let sawEmptyResult = false;

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
      if (outcome.emptyResult) sawEmptyResult = true;
      lastStatus = outcome.status;
      lastDataLength = outcome.dataLength;
      lastErrorKind = outcome.errorKind ?? null;
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
        return {
          gifUrl: outcome.gifUrl,
          provider: provider.name,
          cached: false,
          httpStatus: outcome.status,
          dataLength: outcome.dataLength,
        };
      }
    }
  } catch (err) {
    sawUpstreamError = true;
    console.error(
      '[gifService] searchTopicGif unexpected error:',
      redactSecrets(err instanceof Error ? err.message : String(err))
    );
  }

  if ((blockedByQuota && !madeUpstreamRequest) || sawRateLimit) {
    return {
      gifUrl: null,
      provider: 'none',
      cached: false,
      quotaExhausted: true,
      emptyResult: true,
      upstreamError: sawUpstreamError,
      httpStatus: lastStatus,
      dataLength: lastDataLength,
      errorKind: lastErrorKind,
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
    emptyResult: sawEmptyResult || madeUpstreamRequest,
    upstreamError: sawUpstreamError,
    httpStatus: lastStatus,
    dataLength: lastDataLength,
    errorKind: lastErrorKind,
    ...(blockedByQuota ? { quotaExhausted: true } : {}),
  };
}

export interface ReactionGifItem {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

export interface ReactionGifSearchResult {
  gifs: ReactionGifItem[];
  provider: 'giphy' | 'curated' | 'none';
  cached: boolean;
  rateLimited?: boolean;
  quotaExhausted?: boolean;
}

interface CuratedReactionGifEntry extends ReactionGifItem {
  keywords: string[];
}

const BANNED_REACTION_GIF_PATTERN =
  /(?:^|[^a-z0-9])(sticker|stickers|caption|subtitles|typography|wordart|word\s*art|text\s*meme|quote|quotes|nsfw|gore)(?:$|[^a-z0-9])/i;

const REACTION_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const reactionQueryCache = new Map<string, { gifs: ReactionGifItem[]; expiresAt: number }>();

// Live-verified HTTPS media.giphy.com fallback reaction GIFs used only when
// GIPHY_API_KEY is absent, quota is exhausted, or upstream errors/429s occur.
const CURATED_REACTION_GIFS: CuratedReactionGifEntry[] = [
  {
    id: 'blSTtZehjAZ8I',
    title: 'GG!',
    keywords: ['gg', 'good', 'game', 'cool', 'nice', 'respect'],
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/200.gif',
  },
  {
    id: '26ufdipQqU2lhNA4g',
    title: 'Mind Blown',
    keywords: ['mind', 'blown', 'wow', 'shock', 'amazed', 'brain'],
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif',
  },
  {
    id: '3o7btNa0RUYa5E7iiQ',
    title: 'Fire',
    keywords: ['fire', 'hot', 'lit', 'fast', 'speed', 'streak'],
    url: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/200.gif',
  },
  {
    id: 'd3mlE7uhX8KFgEmY',
    title: 'Genius',
    keywords: ['genius', 'smart', 'brain', 'iq', 'clever', 'think'],
    url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/200.gif',
  },
  {
    id: 'artj92V8o75VPL7AeQ',
    title: 'Victory',
    keywords: ['victory', 'win', 'winner', 'champion', 'trophy', 'celebrate'],
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200.gif',
  },
  {
    id: 'g9582DNuQppxC',
    title: 'Applause',
    keywords: ['applause', 'clap', 'bravo', 'cheers', 'congrats', 'fast'],
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/g9582DNuQppxC/200.gif',
  },
];

export function sanitizeReactionQuery(rawQuery?: string | null): string {
  if (!rawQuery) return '';
  return String(rawQuery)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')
    .slice(0, 40)
    .toLowerCase();
}

function pickGiphyReactionPreviewUrl(
  images: GiphyImageVariants | undefined,
  fallbackUrl: string
): string {
  const ordered = [
    images?.fixed_height_small?.webp,
    images?.fixed_height_small?.url,
    images?.fixed_height?.webp,
    images?.fixed_height?.url,
    fallbackUrl,
  ];
  for (const candidate of ordered) {
    if (isRenderableGifImageUrl(candidate)) {
      return String(candidate).trim();
    }
  }
  return fallbackUrl;
}

function pickCuratedReactionGifs(cleanQuery: string, limit: number): ReactionGifItem[] {
  const safeLimit = Math.max(1, Math.min(12, limit));
  if (!cleanQuery) {
    return CURATED_REACTION_GIFS.slice(0, safeLimit).map(({ id, url, previewUrl, title }) => ({
      id,
      url,
      previewUrl,
      title,
    }));
  }

  const terms = cleanQuery.split(' ').filter(Boolean);
  const scored = CURATED_REACTION_GIFS.map((entry, idx) => {
    const titleLower = entry.title.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3;
      if (entry.keywords.some((kw) => kw.includes(term) || term.includes(kw))) score += 2;
    }
    return { entry, score, idx };
  });

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));
  return scored.slice(0, safeLimit).map(({ entry }) => ({
    id: entry.id,
    url: entry.url,
    previewUrl: entry.previewUrl,
    title: entry.title,
  }));
}

function setCachedReactionGifs(key: string, gifs: ReactionGifItem[], now: number): void {
  if (reactionQueryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = reactionQueryCache.keys().next().value;
    if (oldestKey) reactionQueryCache.delete(oldestKey);
  }
  reactionQueryCache.set(key, { gifs, expiresAt: now + REACTION_CACHE_TTL_MS });
}

/**
 * Searches GIPHY reaction GIFs (live API first when GIPHY_API_KEY + hourly quota allow)
 * with curated safe HTTPS fallbacks when unconfigured or rate-limited.
 */
export async function searchReactionGifs(
  rawQuery = '',
  limit = 6,
  options?: { bypassCache?: boolean }
): Promise<ReactionGifSearchResult> {
  const safeLimit = Math.max(1, Math.min(12, Math.floor(Number.isFinite(limit) ? limit : 6)));
  const cleanQuery = sanitizeReactionQuery(rawQuery);
  const giphyKey = process.env.GIPHY_API_KEY?.trim() || '';

  if (!giphyKey) {
    return {
      gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
      provider: 'curated',
      cached: false,
    };
  }

  const now = Date.now();
  const cacheKey = `${cleanQuery || '__trending__'}::${safeLimit}`;
  if (!options?.bypassCache) {
    const cached = reactionQueryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        gifs: cached.gifs,
        provider: 'giphy',
        cached: true,
      };
    }
  }

  const quotaStatus = await getHourlyGifQuotaStatusServer();
  if (quotaStatus.exhausted) {
    return {
      gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
      provider: 'curated',
      cached: false,
      quotaExhausted: true,
    };
  }

  const allowed = await consumeHourlyGifQuotaServer();
  if (!allowed) {
    return {
      gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
      provider: 'curated',
      cached: false,
      quotaExhausted: true,
    };
  }

  try {
    const endpoint = cleanQuery
      ? 'https://api.giphy.com/v1/gifs/search'
      : 'https://api.giphy.com/v1/gifs/trending';
    const params = new URLSearchParams({
      api_key: giphyKey,
      limit: '12',
      offset: '0',
      rating: 'pg',
      ...(cleanQuery ? { q: cleanQuery, lang: 'en' } : {}),
    });

    const res = await fetch(`${endpoint}?${params.toString()}`, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      await markGifHourlyQuotaExhaustedServer();
      return {
        gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
        provider: 'curated',
        cached: false,
        rateLimited: true,
        quotaExhausted: true,
      };
    }

    if (!res.ok) {
      return {
        gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
        provider: 'curated',
        cached: false,
      };
    }

    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        title?: string;
        slug?: string;
        url?: string;
        is_sticker?: number | boolean;
        tags?: string[];
        images?: GiphyImageVariants;
      }>;
    };

    const rows = Array.isArray(json.data) ? json.data : [];
    const seenUrls = new Set<string>();
    const items: ReactionGifItem[] = [];

    for (const row of rows) {
      if (!row || row.is_sticker) continue;
      const url = pickBestGiphyImageUrl(row.images);
      if (!url || seenUrls.has(url) || !isRenderableGifImageUrl(url)) continue;

      const metaCombined = [
        url,
        row.title || '',
        row.slug || '',
        row.url || '',
        ...(Array.isArray(row.tags) ? row.tags : []),
      ]
        .filter(Boolean)
        .join(' ');
      if (BANNED_REACTION_GIF_PATTERN.test(metaCombined)) continue;

      seenUrls.add(url);
      items.push({
        id: String(row.id || `giphy-${items.length + 1}`).trim(),
        url,
        previewUrl: pickGiphyReactionPreviewUrl(row.images, url),
        title: String(row.title || cleanQuery || 'Reaction GIF').trim().slice(0, 80),
      });

      if (items.length >= safeLimit) break;
    }

    if (items.length > 0) {
      setCachedReactionGifs(cacheKey, items, now);
      return {
        gifs: items,
        provider: 'giphy',
        cached: false,
      };
    }

    if (!cleanQuery) {
      return {
        gifs: pickCuratedReactionGifs('', safeLimit),
        provider: 'curated',
        cached: false,
      };
    }

    return {
      gifs: [],
      provider: 'none',
      cached: false,
    };
  } catch {
    return {
      gifs: pickCuratedReactionGifs(cleanQuery, safeLimit),
      provider: 'curated',
      cached: false,
    };
  }
}

export interface StudioGifItem {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

export interface StudioGifSearchResult {
  gifs: StudioGifItem[];
  provider: 'giphy' | 'wikimedia' | 'curated';
  cached: boolean;
  quotaExhausted?: boolean;
}

const STUDIO_CURATED_GIFS: CuratedReactionGifEntry[] = [
  {
    id: 'studio-cosmos',
    title: 'Cosmic Idea',
    keywords: ['space', 'cosmos', 'universe', 'star', 'planet', 'science', 'venus', 'uzay', 'evren'],
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif',
  },
  {
    id: 'studio-brain',
    title: 'Smart Discovery',
    keywords: ['brain', 'genius', 'think', 'education', 'learn', 'mind', 'tech', 'ai', 'bilim', 'zeka'],
    url: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/200.gif',
  },
  {
    id: 'studio-energy',
    title: 'Energy & Speed',
    keywords: ['fire', 'energy', 'speed', 'physics', 'fast', 'growth', 'news', 'hiz', 'enerji'],
    url: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/200.gif',
  },
  {
    id: 'studio-victory',
    title: 'Milestone Celebration',
    keywords: ['win', 'victory', 'record', 'trophy', 'success', 'business', 'growth', 'basari'],
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200.gif',
  },
  {
    id: 'studio-applause',
    title: 'Community Applause',
    keywords: ['clap', 'applause', 'team', 'culture', 'history', 'media', 'topluluk'],
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/g9582DNuQppxC/200.gif',
  },
  {
    id: 'studio-respect',
    title: 'Smooth Finish',
    keywords: ['cool', 'nice', 'finish', 'ocean', 'nature', 'earth', 'doga'],
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/blSTtZehjAZ8I/200.gif',
  },
];

const studioQueryCache = new Map<string, { gifs: StudioGifItem[]; expiresAt: number }>();

function pickCuratedStudioGifs(cleanQuery: string, limit: number): StudioGifItem[] {
  const safeLimit = Math.max(1, Math.min(8, limit));
  if (!cleanQuery) {
    return STUDIO_CURATED_GIFS.slice(0, safeLimit).map(({ id, url, previewUrl, title }) => ({
      id,
      url,
      previewUrl,
      title,
    }));
  }
  const terms = cleanQuery.split(/\s+/).filter(Boolean);
  const scored = STUDIO_CURATED_GIFS.map((entry, idx) => {
    const titleLower = entry.title.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3;
      if (entry.keywords.some((kw) => kw.includes(term) || term.includes(kw))) score += 2;
    }
    return { entry, score, idx };
  }).sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));

  return scored.slice(0, safeLimit).map(({ entry }) => ({
    id: entry.id,
    url: entry.url,
    previewUrl: entry.previewUrl,
    title: entry.title,
  }));
}

async function searchWikimediaStudioFallback(query: string, limit: number): Promise<StudioGifItem[]> {
  if (!query) return [];
  try {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: String(Math.max(4, limit)),
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      iiurlwidth: '900',
      format: 'json',
      origin: '*',
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
      headers: { 'User-Agent': 'ScrollyBot/1.0 (https://scrolly.live; contact@scrolly.live)', Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            pageid?: number;
            title?: string;
            imageinfo?: Array<{ url?: string; thumburl?: string; mime?: string; width?: number }>;
          }
        >;
      };
    };
    const pages = Object.values(json.query?.pages || {});
    const out: StudioGifItem[] = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const mime = String(info?.mime || '').toLowerCase();
      const mediaUrl = String(info?.thumburl || info?.url || '').trim();
      if (!mediaUrl.startsWith('https://')) continue;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) continue;
      if (Number(info?.width || 0) < 400) continue;
      out.push({
        id: `wm-${page.pageid || out.length + 1}`,
        url: mediaUrl,
        previewUrl: mediaUrl,
        title: String(page.title || query).replace(/^File:/i, '').replace(/\.[^.]+$/, '').slice(0, 60),
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Searches topic visuals for Scrolly Creator Studio: uses live GIPHY first (under 90/hr guard),
 * falls back to Wikimedia Commons visuals + curated HTTPS GIFs when offline/unconfigured.
 */
export async function searchStudioGifs(
  rawQuery = '',
  limit = 8
): Promise<StudioGifSearchResult> {
  const safeLimit = Math.max(1, Math.min(8, Math.floor(Number.isFinite(limit) ? limit : 8)));
  const cleanQuery = sanitizeReactionQuery(rawQuery);
  const cacheKey = `studio:${cleanQuery || '__default__'}::${safeLimit}`;
  const now = Date.now();
  const cached = studioQueryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { gifs: cached.gifs, provider: 'giphy', cached: true };
  }

  const giphyKey = process.env.GIPHY_API_KEY?.trim() || '';
  if (giphyKey) {
    const quotaStatus = await getHourlyGifQuotaStatusServer();
    if (!quotaStatus.exhausted && (await consumeHourlyGifQuotaServer())) {
      try {
        const endpoint = cleanQuery
          ? 'https://api.giphy.com/v1/gifs/search'
          : 'https://api.giphy.com/v1/gifs/trending';
        const params = new URLSearchParams({
          api_key: giphyKey,
          limit: '16',
          offset: '0',
          rating: 'pg',
          ...(cleanQuery ? { q: cleanQuery, lang: 'en' } : {}),
        });
        const res = await fetch(`${endpoint}?${params.toString()}`, {
          signal: AbortSignal.timeout(4000),
          headers: { Accept: 'application/json' },
        });
        if (res.status === 429) {
          await markGifHourlyQuotaExhaustedServer();
        } else if (res.ok) {
          const json = (await res.json()) as {
            data?: Array<{
              id?: string;
              title?: string;
              is_sticker?: number | boolean;
              images?: GiphyImageVariants;
            }>;
          };
          const items: StudioGifItem[] = [];
          const seen = new Set<string>();
          for (const row of json.data || []) {
            if (!row || row.is_sticker) continue;
            const url = pickBestGiphyImageUrl(row.images);
            if (!url || seen.has(url) || !isRenderableGifImageUrl(url)) continue;
            if (BANNED_REACTION_GIF_PATTERN.test(row.title || '')) continue;
            seen.add(url);
            items.push({
              id: String(row.id || `giphy-${items.length + 1}`),
              url,
              previewUrl: pickGiphyReactionPreviewUrl(row.images, url),
              title: String(row.title || cleanQuery || 'Scene GIF').trim().slice(0, 70),
            });
            if (items.length >= safeLimit) break;
          }
          if (items.length > 0) {
            if (studioQueryCache.size >= MAX_CACHE_ENTRIES) {
              const firstKey = studioQueryCache.keys().next().value;
              if (firstKey) studioQueryCache.delete(firstKey);
            }
            studioQueryCache.set(cacheKey, { gifs: items, expiresAt: now + REACTION_CACHE_TTL_MS });
            return { gifs: items, provider: 'giphy', cached: false };
          }
        }
      } catch {
        // Fall through cleanly to Wikimedia/curated visuals
      }
    }
  }

  if (cleanQuery) {
    const wikimedia = await searchWikimediaStudioFallback(cleanQuery, safeLimit);
    if (wikimedia.length > 0) {
      const combined = [...wikimedia, ...pickCuratedStudioGifs(cleanQuery, 2)].slice(0, safeLimit);
      return { gifs: combined, provider: 'wikimedia', cached: false };
    }
  }

  return {
    gifs: pickCuratedStudioGifs(cleanQuery, safeLimit),
    provider: 'curated',
    cached: false,
  };
}
