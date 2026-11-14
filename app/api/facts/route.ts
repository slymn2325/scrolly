import { NextResponse } from 'next/server';
import { fetchFactsWithSourceServer } from '@/lib/db';
import type { CategoryId } from '@/types/fact';
import { interleaveFactsByCategory } from '@/utils/factsData';

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
  const { searchParams } = new URL(request.url);
  const categoryParam = normalizeCategoryParam(searchParams.get('category'));
  const rawOffset = Number(searchParams.get('offset') ?? '0');
  const rawLimitParam = searchParams.get('limit');
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
  const parsedLimit = rawLimitParam !== null ? Number(rawLimitParam) : NaN;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(200, Math.floor(parsedLimit))
      : 200;

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };

  const { source, entries } = await fetchFactsWithSourceServer();
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
      total,
      offset,
      limit,
      hasMore,
    },
    { status: 200, headers: cacheHeaders }
  );
}
