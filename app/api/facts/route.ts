import { NextResponse } from 'next/server';
import { fetchFactsWithSourceServer, fetchVocabularyWithSourceServer, hasDatabaseUrl } from '@/lib/db';
import { triggerSchedulerTickNonBlocking } from '@/lib/herokuCardScheduler';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import type { CategoryId } from '@/types/fact';
import { interleaveFactsByCategory } from '@/utils/factsData';

// Always read fresh Postgres rows so generated cards appear without a redeploy.
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const VALID_CATEGORIES = new Set<CategoryId>([
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
]);

function normalizeCategoryParam(raw: string | null): CategoryId | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'weird_records') return 'records';
  if (cleaned === 'human-body') return 'human_body';
  if (cleaned === 'istatistik') return 'statistics';
  if (VALID_CATEGORIES.has(cleaned as CategoryId)) {
    return cleaned as CategoryId;
  }
  return null;
}

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`facts_get:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = normalizeCategoryParam(searchParams.get('category'));
    const rawOffset = Number(searchParams.get('offset') ?? '0');
    const rawLimitParam = searchParams.get('limit');
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
    const parsedLimit = rawLimitParam !== null ? Number(rawLimitParam) : NaN;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(500, Math.floor(parsedLimit))
        : 500;

    const [{ source, entries }, { vocabulary }] = await Promise.all([
      fetchFactsWithSourceServer(),
      fetchVocabularyWithSourceServer(),
    ]);
    if (hasDatabaseUrl()) {
      // Non-blocking throttled check for overdue 12h card runs & pending 90/hr GIF queue
      triggerSchedulerTickNonBlocking();
    }
    const allFacts = entries.map((entry) => entry.fact);

    const ordered =
      categoryParam !== null
        ? allFacts.filter((fact) => fact.category === categoryParam)
        : interleaveFactsByCategory(allFacts);

    const total = ordered.length;
    const sliced = ordered.slice(offset, offset + limit);
    const hasMore = offset + sliced.length < total;

    return NextResponse.json(
      {
        source,
        facts: sliced,
        vocabulary,
        total,
        offset,
        limit,
        hasMore,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[GET /api/facts] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'facts_unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
