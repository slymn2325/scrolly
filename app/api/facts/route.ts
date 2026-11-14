import { NextResponse } from 'next/server';
import {
  type DbFactRow,
  ensureSchema,
  getPool,
  hasDatabaseUrl,
  mapDbRowToFactCard,
} from '@/lib/db';
import type { FactCard } from '@/types/fact';
import { getAllFacts } from '@/utils/factsData';

export const dynamic = 'force-dynamic';

function getLocalFallbackFacts(): FactCard[] {
  return getAllFacts().map((fact) => ({
    ...fact,
    slug: fact.slug || fact.en.slug || fact.tr.slug || fact.id,
    sketchType: fact.sketchType || fact.id,
  }));
}

export async function GET() {
  const noStoreHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  };

  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { source: 'local', facts: getLocalFallbackFacts() },
      { status: 200, headers: noStoreHeaders }
    );
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbFactRow>(
      'SELECT * FROM facts ORDER BY created_at DESC, id DESC'
    );
    const facts = result.rows.map(mapDbRowToFactCard);

    return NextResponse.json(
      {
        source: 'postgres',
        facts: facts.length > 0 ? facts : getLocalFallbackFacts(),
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (err) {
    console.error('[GET /api/facts] Falling back to local facts due to error:', err);
    return NextResponse.json(
      { source: 'local', facts: getLocalFallbackFacts() },
      { status: 200, headers: noStoreHeaders }
    );
  }
}
