import { NextResponse } from 'next/server';
import { getDuelRoomDb, mutateDuelRoomDb } from '@/lib/dbActions';
import {
  isDummyActorId,
  isShortRoomCode,
  normalizeRoomCode,
  sanitizeAnswersArray,
  sanitizeElapsedSec,
  sanitizePlayerEmoji,
  sanitizePlayerName,
  sanitizeReactionGifUrl,
} from '@/lib/duelStore';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { code: rawCode } = await context.params;
  if (!isShortRoomCode(rawCode)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const code = normalizeRoomCode(rawCode);

  const url = new URL(request.url);
  const playerId = (url.searchParams.get('playerId') || '').trim();

  try {
    const found = await getDuelRoomDb(code);
    if (!found) {
      return NextResponse.json(
        { ok: false, error: 'room_not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const kicked = Boolean(playerId && found.room.kickedIds.includes(playerId));
    return NextResponse.json(
      {
        ok: true,
        kicked,
        room: found.room,
        serverNow: found.serverNow,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[API /api/duels/[code] GET] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`duel_action:${ip}`, 180, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { code: rawCode } = await context.params;
  if (!isShortRoomCode(rawCode)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const code = normalizeRoomCode(rawCode);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || '').trim();
    const playerId = typeof body.playerId === 'string' ? body.playerId.trim().slice(0, 128) : '';

    if (isDummyActorId(playerId)) {
      return NextResponse.json(
        { ok: false, error: 'missing_player_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await mutateDuelRoomDb(code, (room, nowIso) => {
      if (action === 'join') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const existing = room.players.find((p) => p.id === playerId);
        const hasExplicitName = typeof body.name === 'string' && body.name.trim().length > 0;
        const hasExplicitEmoji = typeof body.emoji === 'string' && body.emoji.trim().length > 0;

        if (existing) {
          if (hasExplicitName) {
            existing.name = sanitizePlayerName(body.name as string);
          }
          if (hasExplicitEmoji) {
            existing.emoji = sanitizePlayerEmoji(body.emoji as string);
          }
          return { next: room };
        }

        if (room.status !== 'lobby') {
          return { next: room, errorStatus: 409, errorCode: 'match_already_started' };
        }
        if (room.players.length >= 2) {
          return { next: room, errorStatus: 409, errorCode: 'room_full' };
        }

        room.players.push({
          id: playerId,
          name: sanitizePlayerName(hasExplicitName ? (body.name as string) : undefined),
          emoji: sanitizePlayerEmoji(hasExplicitEmoji ? (body.emoji as string) : undefined),
          ready: false,
          score: null,
          finishedAt: null,
          joinedAt: nowIso,
          elapsedSec: null,
          answers: null,
          reactionGif: null,
        });
        return { next: room };
      }

      if (action === 'ready') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const self = room.players.find((p) => p.id === playerId);
        if (!self) {
          return { next: room, errorStatus: 403, errorCode: 'not_in_room' };
        }
        if (room.status === 'started') {
          return { next: room, errorStatus: 409, errorCode: 'match_already_started' };
        }
        self.ready = Boolean(body.ready);
        if (!self.ready && room.status === 'countdown') {
          room.status = 'lobby';
          room.startsAt = null;
        }
        return { next: room };
      }

      if (action === 'kick') {
        if (room.hostId !== playerId) {
          return { next: room, errorStatus: 403, errorCode: 'only_host_can_kick' };
        }
        if (room.status === 'started') {
          return { next: room, errorStatus: 409, errorCode: 'match_already_started' };
        }
        const targetId =
          typeof body.targetPlayerId === 'string' ? body.targetPlayerId.trim() : '';
        if (!targetId || targetId === room.hostId) {
          return { next: room, errorStatus: 400, errorCode: 'invalid_kick_target' };
        }
        const hadTarget = room.players.some((p) => p.id === targetId);
        if (!hadTarget) {
          return { next: room, errorStatus: 404, errorCode: 'player_not_found' };
        }
        room.players = room.players.filter((p) => p.id !== targetId);
        if (!room.kickedIds.includes(targetId)) {
          room.kickedIds.push(targetId);
        }
        if (room.status === 'countdown') {
          room.status = 'lobby';
          room.startsAt = null;
        }
        return { next: room };
      }

      if (action === 'start') {
        if (room.hostId !== playerId) {
          return { next: room, errorStatus: 403, errorCode: 'only_host_can_start' };
        }
        if (room.players.length < 2) {
          return { next: room, errorStatus: 400, errorCode: 'waiting_for_opponent' };
        }
        if (!room.players.every((p) => p.ready)) {
          return { next: room, errorStatus: 400, errorCode: 'players_not_ready' };
        }
        if (room.status === 'lobby') {
          const baseNow = Date.parse(nowIso) || Date.now();
          room.status = 'countdown';
          room.startsAt = new Date(baseNow + 5000).toISOString();
        }
        return { next: room };
      }

      if (action === 'complete') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const self = room.players.find((p) => p.id === playerId);
        if (!self) {
          return { next: room, errorStatus: 404, errorCode: 'not_in_room' };
        }
        if (room.status === 'lobby') {
          return { next: room, errorStatus: 409, errorCode: 'match_not_started' };
        }
        const rawScore = Number(body.score || 0);
        self.score =
          Number.isFinite(rawScore) && rawScore >= 0
            ? Math.min(50_000, Math.floor(rawScore))
            : 0;
        const cleanElapsed = sanitizeElapsedSec(body.elapsedSec);
        if (cleanElapsed !== null) {
          self.elapsedSec = cleanElapsed;
        }
        const cleanAnswers = sanitizeAnswersArray(body.answers);
        if (cleanAnswers !== null) {
          self.answers = cleanAnswers;
        }
        self.finishedAt = nowIso;
        room.status = 'started';
        return { next: room };
      }

      if (action === 'reaction') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const self = room.players.find((p) => p.id === playerId);
        if (!self) {
          return { next: room, errorStatus: 403, errorCode: 'not_in_room' };
        }
        const cleanUrl = sanitizeReactionGifUrl(body.gifUrl);
        if (!cleanUrl) {
          return { next: room, errorStatus: 400, errorCode: 'invalid_gif_url' };
        }
        const cleanTitle =
          typeof body.title === 'string'
            ? body.title.trim().replace(/\s+/g, ' ').slice(0, 80)
            : '';
        self.reactionGif = {
          url: cleanUrl,
          ...(cleanTitle ? { title: cleanTitle } : {}),
          sentAt: nowIso,
        };
        return { next: room };
      }

      if (action === 'leave') {
        room.players = room.players.filter((p) => p.id !== playerId);
        if (room.hostId === playerId && room.players.length > 0) {
          room.hostId = room.players[0].id;
        }
        if (room.status === 'countdown' && room.players.length < 2) {
          room.status = 'lobby';
          room.startsAt = null;
        }
        return { next: room };
      }

      return { next: room, errorStatus: 400, errorCode: 'unknown_action' };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'action_failed',
          room: result.room || null,
          serverNow: result.serverNow,
        },
        { status: result.status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        room: result.room,
        serverNow: result.serverNow,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[API /api/duels/[code] POST] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'duel_action_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
