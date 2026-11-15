import { NextResponse } from 'next/server';
import { getFactGifUrlDb, updateFactGifUrlDb } from '@/lib/dbActions';
import { isRenderableGifImageUrl, sanitizeVisualQuery, searchTopicGif } from '@/lib/gifService';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`gif:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, gifUrl: null, fallback: 'motion_canvas', error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const rawQuery = url.searchParams.get('query') || '';
  const slug = (url.searchParams.get('slug') || '').trim();
  const category = (url.searchParams.get('category') || '').trim() || undefined;
  const cleanQuery = sanitizeVisualQuery(rawQuery);

  // Strict DB-first rule: if Postgres facts.gif_url is non-empty, return it directly
  // and NEVER hit an external GIF API again.
  if (slug) {
    const dbCachedUrl = await getFactGifUrlDb(slug);
    if (dbCachedUrl) {
      const renderableUrl = isRenderableGifImageUrl(dbCachedUrl) ? dbCachedUrl : null;
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
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        }
      );
    }
  }

  if (!cleanQuery) {
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

  const result = await searchTopicGif(cleanQuery, {
    category,
    expectedTerms: cleanQuery.split(' '),
  });
  if (result.gifUrl && slug) {
    // Persist gif_url + gif_query onto Postgres facts so future requests never hit GIF APIs
    await updateFactGifUrlDb(slug, result.gifUrl, cleanQuery);
  }

  return NextResponse.json(
    {
      ok: true,
      query: cleanQuery,
      gifUrl: result.gifUrl,
      provider: result.provider,
      cached: result.cached,
      quotaExhausted: Boolean(result.quotaExhausted),
      fallback: result.gifUrl ? 'gif' : 'motion_canvas',
    },
    {
      headers: {
        'Cache-Control': result.gifUrl ? 'public, max-age=3600, s-maxage=3600' : 'no-store, max-age=0',
      },
    }
  );
}
