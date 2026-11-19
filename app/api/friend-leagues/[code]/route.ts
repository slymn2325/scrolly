import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isValidDeviceId } from '@/lib/dbActions';
import {
  friendLeagueInviteUrl,
  getFriendLeagueBoard,
  isValidLeagueCode,
  joinFriendLeague,
} from '@/lib/friendLeagues';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`friend_league_get:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { code } = await context.params;
  if (!isValidLeagueCode(code)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const url = new URL(request.url);
  const boundDevice = readSignedDeviceIdFromRequest(request);
  const rawQueryDevice = url.searchParams.get('deviceId');
  const viewerDeviceId =
    boundDevice ?? (isValidDeviceId(rawQueryDevice) ? rawQueryDevice!.trim().slice(0, 128) : null);
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  try {
    const board = await getFriendLeagueBoard({
      code,
      viewerDeviceId,
      viewerUserId: sessionUser?.id ?? null,
      viewerLinkedDeviceIds: sessionUser?.linkedDeviceIds ?? [],
    });
    if (!board) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        league: board.league,
        inviteUrl: friendLeagueInviteUrl(board.league.code),
        entries: board.entries,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[GET /api/friend-leagues/[code]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'league_fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`friend_league_join:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { code } = await context.params;
  if (!isValidLeagueCode(code)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 4 * 1024, {
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

  const boundDevice = readSignedDeviceIdFromRequest(request);
  const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  const deviceId = boundDevice ?? (isValidDeviceId(rawDeviceId) ? rawDeviceId.slice(0, 128) : '');
  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: 'invalid_device_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  try {
    const joined = await joinFriendLeague({
      code,
      deviceId,
      userId: sessionUser?.id ?? null,
      username: typeof body.username === 'string' ? body.username : sessionUser?.nickname,
    });
    if (!joined) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const board = await getFriendLeagueBoard({
      code: joined.code,
      viewerDeviceId: deviceId,
      viewerUserId: sessionUser?.id ?? null,
      viewerLinkedDeviceIds: sessionUser?.linkedDeviceIds ?? [],
    });

    const response = NextResponse.json(
      {
        ok: true,
        joined: true,
        league: board?.league ?? joined,
        inviteUrl: friendLeagueInviteUrl(joined.code),
        entries: board?.entries ?? [],
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
    if (!boundDevice && isValidDeviceId(deviceId)) {
      setSignedDeviceCookie(response, deviceId, request);
    }
    return response;
  } catch (err) {
    console.error('[POST /api/friend-leagues/[code]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'league_join_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
