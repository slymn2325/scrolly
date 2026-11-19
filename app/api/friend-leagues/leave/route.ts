import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { getProfileByDeviceId, isValidDeviceId } from '@/lib/dbActions';
import {
  isValidLeagueCode,
  leaveFriendLeague,
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

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`friend_league_leave:${ip}`, 30, 60_000);
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

  const rawCode = typeof body.code === 'string' ? body.code : '';
  if (!isValidLeagueCode(rawCode)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const boundDevice = readSignedDeviceIdFromRequest(request);
  const requestedDevice = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  if (
    boundDevice &&
    requestedDevice &&
    requestedDevice !== boundDevice &&
    !(sessionUser && sessionUser.linkedDeviceIds.includes(requestedDevice))
  ) {
    return NextResponse.json(
      { ok: false, error: 'forbidden' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const deviceId =
    boundDevice ?? (isValidDeviceId(requestedDevice) ? requestedDevice.slice(0, 128) : '');
  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: 'invalid_device_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const profileCheck = await getProfileByDeviceId(deviceId).catch(() => ({
      persisted: false,
      profile: null,
    }));
    if (profileCheck.profile?.userId && profileCheck.profile.userId !== sessionUser?.id) {
      return NextResponse.json(
        { ok: false, error: 'forbidden' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const result = await leaveFriendLeague({
      code: rawCode,
      deviceId,
      userId: sessionUser?.id ?? null,
      linkedDeviceIds: sessionUser?.linkedDeviceIds ?? [],
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const leagues = await listUserFriendLeagues({
      deviceId,
      userId: sessionUser?.id ?? null,
      linkedDeviceIds: sessionUser?.linkedDeviceIds ?? [],
    }).catch(() => []);

    const response = NextResponse.json(
      {
        ok: true,
        code: result.code,
        left: result.left,
        deletedEmptyLeague: result.deletedEmptyLeague,
        leagues,
      },
      { headers: NO_STORE_HEADERS }
    );
    if (!boundDevice && isValidDeviceId(deviceId)) {
      setSignedDeviceCookie(response, deviceId, request);
    }
    return response;
  } catch (err) {
    console.error('[POST /api/friend-leagues/leave] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'league_leave_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
