import { NextResponse } from 'next/server';
import { getDatabaseStatusReport } from '@/lib/db';
import { triggerCardGenerationJob, triggerGifQueueJob } from '@/lib/herokuCardScheduler';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { verifyAdminBearerSecret } from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`db_status:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const runCardsRequested = url.searchParams.get('runCards') === '1';
  const runGifsRequested = url.searchParams.get('runGifs') === '1';
  const isAdmin = verifyAdminBearerSecret(request);

  if ((runCardsRequested || runGifsRequested) && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: 'forbidden' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const triggered =
      isAdmin && (runCardsRequested || runGifsRequested)
        ? {
            cards: runCardsRequested ? triggerCardGenerationJob({ force: true }) : false,
            gifs: runGifsRequested ? triggerGifQueueJob({ force: true }) : false,
          }
        : undefined;

    const report = await getDatabaseStatusReport();
    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: report.ok,
          status: report.ok ? 'healthy' : 'degraded',
          checkedAt: new Date().toISOString(),
        },
        {
          status: report.ok ? 200 : 503,
          headers: NO_STORE_HEADERS,
        }
      );
    }

    const payload = triggered ? { ...report, triggered } : report;
    return NextResponse.json(payload, {
      status: report.ok ? 200 : 503,
      headers: NO_STORE_HEADERS,
    });
  } catch (err) {
    console.error('[GET /api/db-status] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'status_unavailable' },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
