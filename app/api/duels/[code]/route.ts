import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
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
  toPublicScrollaRoom,
} from '@/lib/duelStore';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  mintDuelActorId,
  readJsonBodyWithLimit,
  readSignedDuelActorFromRequest,
  setSignedDuelActorCookie,
  timingSafeStringEqual,
} from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

interface RouteContext {
  params: Promise<{ code: string }>;
}

function matchesStoredActorKey(
  storedKey: string | undefined,
  sessionActorKey: string | null,
  cookieActorKey: string | null
): boolean {
  if (!storedKey) return true;
  if (sessionActorKey && timingSafeStringEqual(storedKey, sessionActorKey)) return true;
  if (cookieActorKey && timingSafeStringEqual(storedKey, cookieActorKey)) return true;
  return false;
}

function isActorKeyKicked(
  kickedActorKeys: string[] | undefined,
  sessionActorKey: string | null,
  cookieActorKey: string | null
): boolean {
  if (!kickedActorKeys || kickedActorKeys.length === 0) return false;
  return kickedActorKeys.some(
    (key) =>
      Boolean(key) &&
      ((sessionActorKey && timingSafeStringEqual(key, sessionActorKey)) ||
        (cookieActorKey && timingSafeStringEqual(key, cookieActorKey)))
  );
}

export async function GET(request: Request, context: RouteContext) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`duel_get:${ip}`, 120, 60_000);
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

  const url = new URL(request.url);
  const playerId = (url.searchParams.get('playerId') || '').trim();
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
  const sessionActorKey = sessionUser ? `u:${sessionUser.id}` : null;
  const rawCookieActor = readSignedDuelActorFromRequest(request);
  const cookieActorKey = rawCookieActor ? `a:${rawCookieActor}` : null;

  try {
    const found = await getDuelRoomDb(code);
    if (!found) {
      return NextResponse.json(
        { ok: false, error: 'room_not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const kicked = Boolean(
      (playerId && found.room.kickedIds.includes(playerId)) ||
        isActorKeyKicked(found.room.kickedActorKeys, sessionActorKey, cookieActorKey)
    );
    return NextResponse.json(
      {
        ok: true,
        kicked,
        room: toPublicScrollaRoom(found.room),
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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`duel_action:${ip}`, 90, 60_000);
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

  const rlRoom = checkRateLimit(`duel_room_action:${ip}:${code}`, 30, 60_000);
  if (!rlRoom.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rlRoom.retryAfterSec) } }
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
    const action = String(body.action || '').trim();
    const playerId = typeof body.playerId === 'string' ? body.playerId.trim().slice(0, 128) : '';

    if (isDummyActorId(playerId)) {
      return NextResponse.json(
        { ok: false, error: 'missing_player_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
    const sessionActorKey = sessionUser ? `u:${sessionUser.id}` : null;
    const rawCookieActor = readSignedDuelActorFromRequest(request);
    const cookieActorKey = rawCookieActor ? `a:${rawCookieActor}` : null;
    const mintedActor =
      action === 'join' && !sessionActorKey && !cookieActorKey ? mintDuelActorId() : null;
    const effectiveActorKey =
      sessionActorKey || cookieActorKey || (mintedActor ? `a:${mintedActor}` : '');

    const result = await mutateDuelRoomDb(code, (room, nowIso) => {
      if (action === 'join') {
        if (
          room.kickedIds.includes(playerId) ||
          isActorKeyKicked(room.kickedActorKeys, sessionActorKey, cookieActorKey)
        ) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const existing = room.players.find((p) => p.id === playerId);
        const hasExplicitName = typeof body.name === 'string' && body.name.trim().length > 0;
        const hasExplicitEmoji = typeof body.emoji === 'string' && body.emoji.trim().length > 0;

        if (existing) {
          if (!matchesStoredActorKey(existing.actorKey, sessionActorKey, cookieActorKey)) {
            return { next: room, errorStatus: 403, errorCode: 'forbidden_player_identity' };
          }
          if (!existing.actorKey && effectiveActorKey) {
            existing.actorKey = effectiveActorKey;
          }
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
          actorKey: effectiveActorKey || undefined,
        });
        return { next: room };
      }

      const self = room.players.find((p) => p.id === playerId);
      if (!self) {
        return { next: room, errorStatus: 403, errorCode: 'not_in_room' };
      }
      if (!matchesStoredActorKey(self.actorKey, sessionActorKey, cookieActorKey)) {
        return { next: room, errorStatus: 403, errorCode: 'forbidden_player_identity' };
      }

      if (action === 'ready') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
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
        const target = room.players.find((p) => p.id === targetId);
        if (!target) {
          return { next: room, errorStatus: 404, errorCode: 'player_not_found' };
        }
        room.players = room.players.filter((p) => p.id !== targetId);
        if (!room.kickedIds.includes(targetId)) {
          room.kickedIds.push(targetId);
        }
        if (target.actorKey) {
          if (!room.kickedActorKeys) room.kickedActorKeys = [];
          if (!room.kickedActorKeys.includes(target.actorKey)) {
            room.kickedActorKeys.push(target.actorKey);
          }
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
        if (room.status === 'lobby') {
          return { next: room, errorStatus: 409, errorCode: 'match_not_started' };
        }
        if (self.finishedAt !== null) {
          return { next: room, errorStatus: 409, errorCode: 'already_completed' };
        }
        if (room.startsAt && Date.parse(nowIso) < Date.parse(room.startsAt) - 1000) {
          return { next: room, errorStatus: 409, errorCode: 'match_not_started' };
        }

        const boundedQuestionCount = Math.min(15, Math.max(1, room.questionCount));
        const cleanAnswers = sanitizeAnswersArray(body.answers);
        const cleanElapsed = sanitizeElapsedSec(body.elapsedSec);

        if (!cleanAnswers || cleanAnswers.length === 0) {
          self.score = 0;
          self.answers = [];
          if (cleanElapsed !== null) {
            self.elapsedSec = cleanElapsed;
          }
        } else {
          const boundedAnswers = cleanAnswers.slice(0, boundedQuestionCount);
          let correctCount = 0;
          let streak = 0;
          let comboScore = 0;
          for (const ans of boundedAnswers) {
            if (ans) {
              correctCount += 1;
              streak += 1;
              comboScore += 100 + 25 * streak;
            } else {
              streak = 0;
            }
          }

          const serverElapsedSec = room.startsAt
            ? Math.max(2, Math.floor((Date.parse(nowIso) - Date.parse(room.startsAt)) / 1000))
            : 60;
          const effectiveElapsedSec =
            cleanElapsed !== null
              ? Math.max(Math.max(2, serverElapsedSec - 2), cleanElapsed)
              : serverElapsedSec;
          const speedBonus = correctCount > 0 ? Math.max(0, 60 - effectiveElapsedSec) * 5 : 0;

          self.score = correctCount === 0 ? 0 : Math.min(5000, comboScore + speedBonus);
          self.elapsedSec = effectiveElapsedSec;
          self.answers = boundedAnswers;
        }
        self.finishedAt = nowIso;
        room.status = 'started';
        return { next: room };
      }

      if (action === 'reaction') {
        if (room.kickedIds.includes(playerId)) {
          return { next: room, errorStatus: 403, errorCode: 'kicked_by_host' };
        }
        const cleanUrl = sanitizeReactionGifUrl(body.gifUrl);
        if (!cleanUrl) {
          return { next: room, errorStatus: 400, errorCode: 'invalid_gif_url' };
        }
        const cleanTitle = sanitizeDisplayText(body.title, 80);
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

    if (!result.ok || !result.room) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'action_failed',
          room: result.room ? toPublicScrollaRoom(result.room) : null,
          serverNow: result.serverNow,
        },
        { status: result.status, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        ok: true,
        room: toPublicScrollaRoom(result.room),
        serverNow: result.serverNow,
      },
      { headers: NO_STORE_HEADERS }
    );
    if (mintedActor) {
      setSignedDuelActorCookie(response, mintedActor, request);
    }
    return response;
  } catch (err) {
    console.error('[API /api/duels/[code] POST] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'duel_action_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
