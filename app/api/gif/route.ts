import { NextResponse } from 'next/server';
import { getFactGifUrlDb, updateFactGifUrlDb } from '@/lib/dbActions';
import { isCleanGifUrl, sanitizeVisualQuery, searchTopicGif } from '@/lib/gifService';
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
  const cleanQuery = sanitizeVisualQuery(rawQuery);

  if (slug) {
    const dbCachedUrl = await getFactGifUrlDb(slug);
    if (dbCachedUrl && isCleanGifUrl(dbCachedUrl)) {
      return NextResponse.json(
        {
          ok: true,
          query: cleanQuery || '',
          gifUrl: dbCachedUrl,
          provider: 'postgres',
          cached: true,
          fallback: 'gif',
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
    return NextResponse.json({
      ok: true,
      gifUrl: null,
      provider: 'none',
      fallback: 'motion_canvas',
    });
  }

  const result = await searchTopicGif(cleanQuery);
  if (result.gifUrl && slug) {
    // Persist onto Postgres facts.gif_url so future visits never re-query GIF APIs
    await updateFactGifUrlDb(slug, result.gifUrl);
  }

  return NextResponse.json(
    {
      ok: true,
      query: cleanQuery,
      gifUrl: result.gifUrl,
      provider: result.provider,
      cached: result.cached,
      fallback: result.gifUrl ? 'gif' : 'motion_canvas',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    }
  );
}
