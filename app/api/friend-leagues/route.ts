import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isValidDeviceId } from '@/lib/dbActions';
import {
  createFriendLeague,
  friendLeagueInviteUrl,
  listUserFriendLeagues,
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

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`friend_leagues_list:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const boundDevice = readSignedDeviceIdFromRequest(request);
  const rawDevice = url.searchParams.get('deviceId');
  const deviceId =
    boundDevice ?? (isValidDeviceId(rawDevice) ? rawDevice!.trim().slice(0, 128) : null);
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  try {
    const leagues = await listUserFriendLeagues({
      deviceId,
      userId: sessionUser?.id ?? null,
    });
    return NextResponse.json({ ok: true, leagues }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.warn('[GET /api/friend-leagues] Degraded cleanly:', err);
    return NextResponse.json({ ok: true, leagues: [] }, { headers: NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`friend_leagues_create:${ip}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 4 * 1024);
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
    const league = await createFriendLeague({
      name: typeof body.name === 'string' ? body.name : '',
      deviceId,
      userId: sessionUser?.id ?? null,
      username: typeof body.username === 'string' ? body.username : sessionUser?.nickname,
      lang: body.lang === 'en' ? 'en' : 'tr',
    });

    const response = NextResponse.json(
      {
        ok: true,
        league,
        inviteUrl: friendLeagueInviteUrl(league.code),
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
    if (!boundDevice && isValidDeviceId(deviceId)) {
      setSignedDeviceCookie(response, deviceId, request);
    }
    return response;
  } catch (err) {
    console.error('[POST /api/friend-leagues] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'league_create_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
