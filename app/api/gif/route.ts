import { NextResponse } from 'next/server';
import {
  getFactGifUrlDb,
  getVocabularyGifUrlDb,
  updateFactGifUrlDb,
  updateVocabularyGifUrlDb,
} from '@/lib/dbActions';
import {
  sanitizeReactionQuery,
  sanitizeVisualQuery,
  searchReactionGifs,
  searchTopicGif,
} from '@/lib/gifService';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { buildVocabularyGifQuery } from '@/lib/serverGifMatcher';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`gif:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, gifUrl: null, fallback: 'motion_canvas', error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') || '').trim().toLowerCase();
  const rawQuery = url.searchParams.get('query') || '';

  if (mode === 'reactions') {
    const rawLimit = Number(url.searchParams.get('limit') || '6');
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(12, Math.floor(rawLimit))) : 6;
    const cleanReactionQuery = sanitizeReactionQuery(rawQuery);
    const result = await searchReactionGifs(rawQuery, limit);
    const shouldNoStore = Boolean(result.rateLimited) || result.gifs.length === 0;

    return NextResponse.json(
      {
        ok: true,
        mode: 'reactions',
        query: cleanReactionQuery,
        gifs: result.gifs,
        provider: result.provider,
        cached: result.cached,
        quotaExhausted: Boolean(result.quotaExhausted),
        rateLimited: Boolean(result.rateLimited),
      },
      {
        headers: {
          'Cache-Control': shouldNoStore
            ? 'no-store, max-age=0'
            : 'public, max-age=300, s-maxage=300',
        },
      }
    );
  }

  const slug = (url.searchParams.get('slug') || '').trim();
  const vocabId = (url.searchParams.get('vocabId') || '').trim();
  const word = (url.searchParams.get('word') || '').trim();
  const hasVocabLookup = Boolean(vocabId || word);
  const categoryParam = (url.searchParams.get('category') || '').trim();
  const category =
    categoryParam && categoryParam.toLowerCase() !== 'vocabulary' ? categoryParam : undefined;
  const cleanQuery = sanitizeVisualQuery(rawQuery);

  // Strict DB-first rule for vocabulary_cards.gif_url
  if (hasVocabLookup) {
    const dbVocabUrl = await getVocabularyGifUrlDb(vocabId || word, word);
    if (dbVocabUrl) {
      const renderableUrl = dbVocabUrl.startsWith('https://') ? dbVocabUrl : null;
      return NextResponse.json(
        {
          ok: true,
          query: cleanQuery || word || '',
          gifUrl: renderableUrl,
          provider: renderableUrl ? 'postgres' : 'none',
          cached: true,
          fallback: renderableUrl ? 'gif' : 'motion_canvas',
        },
        {
          headers: {
            'Cache-Control': renderableUrl
              ? 'public, max-age=3600, s-maxage=3600'
              : 'no-store, max-age=0',
          },
        }
      );
    }
  }

  // Strict DB-first rule: if Postgres facts.gif_url is non-empty, return it directly
  // and NEVER hit an external GIF API again.
  if (slug) {
    const dbCachedUrl = await getFactGifUrlDb(slug);
    if (dbCachedUrl) {
      const renderableUrl = dbCachedUrl.startsWith('https://') ? dbCachedUrl : null;
      return NextResponse.json(
        {
          ok: true,
          query: cleanQuery || '',
          gifUrl: renderableUrl,
          provider: renderableUrl ? 'postgres' : 'none',
          cached: true,
          fallback: renderableUrl ? 'gif' : 'motion_canvas',
        },
        {
          headers: {
            'Cache-Control': renderableUrl
              ? 'public, max-age=3600, s-maxage=3600'
              : 'no-store, max-age=0',
          },
        }
      );
    }
  }

  const effectiveQuery = hasVocabLookup
    ? !cleanQuery || (word && cleanQuery === word.toLowerCase())
      ? buildVocabularyGifQuery({
          word: word || vocabId,
          gifQuery: cleanQuery || undefined,
        })
      : cleanQuery
    : cleanQuery;

  if (!effectiveQuery) {
    return NextResponse.json(
      {
        ok: true,
        gifUrl: null,
        provider: 'none',
        fallback: 'motion_canvas',
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  const expectedTerms = Array.from(
    new Set([
      ...effectiveQuery.split(' '),
      ...(word ? [word.toLowerCase()] : []),
    ])
  ).filter(Boolean);

  const result = await searchTopicGif(effectiveQuery, {
    category,
    expectedTerms,
  });
  const mediaFields = {
    mediaType: result.mediaType || (result.gifUrl && /\.mp4(\?|$)/i.test(result.gifUrl) ? 'video' : result.gifUrl ? 'gif' : null),
    mediaSource: result.mediaSource || (result.provider === 'giphy' ? 'giphy' : null),
    mediaCredit: result.mediaCredit || (result.provider === 'giphy' ? 'GIPHY' : null),
    posterUrl: result.posterUrl || null,
  };

  if (result.gifUrl) {
    if (hasVocabLookup) {
      await updateVocabularyGifUrlDb(vocabId || word, result.gifUrl, effectiveQuery, word, mediaFields);
    } else if (slug) {
      await updateFactGifUrlDb(slug, result.gifUrl, effectiveQuery, mediaFields);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      query: effectiveQuery,
      gifUrl: result.gifUrl,
      mediaType: mediaFields.mediaType,
      mediaSource: mediaFields.mediaSource,
      mediaCredit: mediaFields.mediaCredit,
      posterUrl: mediaFields.posterUrl,
      provider: result.provider,
      cached: result.cached,
      quotaExhausted: Boolean(result.quotaExhausted),
      rateLimited: Boolean(result.rateLimited),
      fallback: result.gifUrl ? 'gif' : 'motion_canvas',
    },
    {
      headers: {
        'Cache-Control': result.gifUrl ? 'public, max-age=3600, s-maxage=3600' : 'no-store, max-age=0',
      },
    }
  );
}
