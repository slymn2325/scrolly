import { NextResponse } from 'next/server';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import type { CategoryFilter } from '@/i18n/translations';
import { getSessionUserFromRequest } from '@/lib/auth';
import { getAllFactsServer } from '@/lib/db';
import { createDuelRoomDb } from '@/lib/dbActions';
import { isDummyActorId, normalizeDuelCategory, toPublicScrollaRoom } from '@/lib/duelStore';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  mintDuelActorId,
  readJsonBodyWithLimit,
  readSignedDuelActorFromRequest,
  setSignedDuelActorCookie,
} from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

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
  const vocabPool = category === 'vocabulary' ? getVocabularyFacts() : [];
  const knownIds = new Set(
    category === 'vocabulary'
      ? vocabPool.map((item) => item.id)
      : facts.map((item) => item.id)
  );

  if (Array.isArray(explicitIds) && explicitIds.length >= 2) {
    const validExplicit = Array.from(
      new Set(
        explicitIds
          .map((id) => String(id).trim().slice(0, 140))
          .filter((id) => Boolean(id) && knownIds.has(id))
      )
    ).slice(0, count);
    if (validExplicit.length >= 2) {
      return validExplicit;
    }
  }

  if (category === 'vocabulary' && vocabPool.length > 0) {
    return fisherYatesShuffle(vocabPool)
      .slice(0, count)
      .map((item) => item.id);
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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rlMinute = checkRateLimit(`duel_create_1m:${ip}`, 10, 60_000);
  if (!rlMinute.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rlMinute.retryAfterSec) } }
    );
  }
  const rlTenMin = checkRateLimit(`duel_create_10m:${ip}`, 30, 10 * 60_000);
  if (!rlTenMin.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rlTenMin.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 16 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

  try {
    const hostId = typeof body.hostId === 'string' ? body.hostId.trim() : '';
    const hostName = typeof body.hostName === 'string' ? body.hostName.trim() : 'Kâşif';
    const hostEmoji = typeof body.hostEmoji === 'string' ? body.hostEmoji.trim() : '⚡';
    const category = normalizeDuelCategory(body.category);
    const rawCount = Number(body.questionCount || 5);
    const questionCount = [3, 5, 7, 10].includes(rawCount) ? rawCount : 5;
    const explicitCardIds = Array.isArray(body.cardIds) ? (body.cardIds as string[]) : undefined;

    if (isDummyActorId(hostId)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_host_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
    const existingCookieActor = readSignedDuelActorFromRequest(request);
    const mintedActor = !sessionUser && !existingCookieActor ? mintDuelActorId() : null;
    const hostActorKey = sessionUser
      ? `u:${sessionUser.id}`
      : `a:${existingCookieActor || mintedActor}`;

    const facts = category === 'vocabulary' ? [] : await getAllFactsServer();
    const cardIds = pickDuelCardIds(facts, category, questionCount, explicitCardIds);

    const { room, serverNow } = await createDuelRoomDb({
      hostId,
      hostActorKey,
      hostName,
      hostEmoji,
      category,
      questionCount: cardIds.length || questionCount,
      cardIds,
    });

    const response = NextResponse.json(
      {
        ok: true,
        code: room.code,
        room: toPublicScrollaRoom(room),
        serverNow,
      },
      { headers: NO_STORE_HEADERS }
    );
    if (mintedActor) {
      setSignedDuelActorCookie(response, mintedActor, request);
    }
    return response;
  } catch (err) {
    console.error('[API /api/duels POST] Failed to create room:', err);
    return NextResponse.json(
      { ok: false, error: 'create_room_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
