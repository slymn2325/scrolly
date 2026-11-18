import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { getProfileByDeviceId, isValidDeviceId } from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { readSignedDeviceIdFromRequest, setSignedDeviceCookie } from '@/lib/requestSecurity';
import type { AuthSessionResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`auth_session:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, authenticated: false, guestId: null, user: null, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const rawGuestId = url.searchParams.get('guestId');
  const guestId = isValidDeviceId(rawGuestId) ? rawGuestId.trim().slice(0, 128) : null;
  const boundDeviceId = readSignedDeviceIdFromRequest(request);

  try {
    const user = await getSessionUserFromRequest(request);
    const payload: AuthSessionResponse = {
      ok: true,
      authenticated: Boolean(user),
      guestId,
      user,
    };
    const response = NextResponse.json(payload, { status: 200, headers: NO_STORE_HEADERS });

    if (guestId && !boundDeviceId) {
      const existing = await getProfileByDeviceId(guestId).catch(() => ({
        persisted: false,
        profile: null,
      }));
      if (!existing.profile?.userId || existing.profile.userId === user?.id) {
        setSignedDeviceCookie(response, guestId, request);
      }
    }

    return response;
  } catch (err) {
    console.error('[GET /api/auth/session] Failed:', err);
    const payload: AuthSessionResponse = {
      ok: true,
      authenticated: false,
      guestId,
      user: null,
    };
    return NextResponse.json(payload, { status: 200, headers: NO_STORE_HEADERS });
  }
}
