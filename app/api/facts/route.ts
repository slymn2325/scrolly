import { NextResponse } from 'next/server';
import {
  type DbFactRow,
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  mapDbRowToFactCard,
} from '@/lib/db';
import type { CategoryId, FactCard } from '@/types/fact';
import { interleaveFactsByCategory } from '@/utils/factsData';
import { getAllFacts } from '@/utils/factsServerData';

const VALID_CATEGORIES = new Set<CategoryId>([
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
]);

function getLocalFallbackFacts(): FactCard[] {
  return getAllFacts().map((fact) => ({
    ...fact,
    slug: fact.slug || fact.en.slug || fact.tr.slug || fact.id,
    sketchType: fact.sketchType || fact.id,
  }));
}

function normalizeCategoryParam(raw: string | null): CategoryId | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'weird_records') return 'records';
  if (cleaned === 'human-body') return 'human_body';
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

  let source: 'postgres' | 'local' = 'local';
  let allFacts: FactCard[] = [];

  if (!hasDatabaseUrl()) {
    allFacts = getLocalFallbackFacts();
  } else {
    try {
      await ensureSchema();
      const pool = getPool();
      const result = await pool.query<DbFactRow>(
        'SELECT * FROM facts ORDER BY created_at DESC, id DESC'
      );
      const dbFacts = result.rows.map(mapDbRowToFactCard);
      if (dbFacts.length > 0) {
        source = 'postgres';
        allFacts = dbFacts;
      } else {
        allFacts = getLocalFallbackFacts();
      }
    } catch (err) {
      console.error('[GET /api/facts] Falling back to local facts due to error:', err);
      allFacts = getLocalFallbackFacts();
    }
  }

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
