import { NextResponse } from 'next/server';
import type { CategoryFilter } from '@/i18n/translations';
import { getAllFactsServer } from '@/lib/db';
import { createDuelRoomDb } from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const VALID_DUEL_CATEGORIES = new Set<CategoryFilter>([
  'all',
  'vocabulary',
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
]);

function normalizeDuelCategory(raw: unknown): CategoryFilter {
  const clean = typeof raw === 'string' ? raw.trim().toLowerCase() : 'all';
  if (clean === 'weird_records') return 'records';
  if (clean === 'human-body') return 'human_body';
  if (clean === 'istatistik') return 'statistics';
  return VALID_DUEL_CATEGORIES.has(clean as CategoryFilter)
    ? (clean as CategoryFilter)
    : 'all';
}

function fisherYatesShuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function pickDuelCardIds(
  facts: Awaited<ReturnType<typeof getAllFactsServer>>,
  category: CategoryFilter,
  count: number,
  explicitIds?: string[]
): string[] {
  if (Array.isArray(explicitIds) && explicitIds.length >= 2) {
    return explicitIds
      .map((id) => String(id).trim())
      .filter(Boolean)
      .slice(0, count);
  }
  const pool =
    category === 'all' || category === 'vocabulary'
      ? facts
      : facts.filter((f) => f.category === category);
  const source = pool.length >= count ? pool : facts;
  return fisherYatesShuffle(source)
    .slice(0, count)
    .map((f) => f.id);
}

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`duel_create:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim() : '';
    const hostName = typeof body.hostName === 'string' ? body.hostName.trim() : 'Kâşif';
    const hostEmoji = typeof body.hostEmoji === 'string' ? body.hostEmoji.trim() : '⚡';
    const category = normalizeDuelCategory(body.category);
    const rawCount = Number(body.questionCount || 5);
    const questionCount = [3, 5, 7, 10].includes(rawCount) ? rawCount : 5;
    const explicitCardIds = Array.isArray(body.cardIds) ? (body.cardIds as string[]) : undefined;

    if (!hostId || hostId.length < 3) {
      return NextResponse.json(
        { ok: false, error: 'invalid_host_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const facts = await getAllFactsServer();
    const cardIds = pickDuelCardIds(facts, category, questionCount, explicitCardIds);

    const { room, serverNow } = await createDuelRoomDb({
      hostId,
      hostName,
      hostEmoji,
      category,
      questionCount: cardIds.length || questionCount,
      cardIds,
    });

    return NextResponse.json(
      {
        ok: true,
        code: room.code,
        room,
        serverNow,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[API /api/duels POST] Failed to create room:', err);
    return NextResponse.json(
      { ok: false, error: 'create_room_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
