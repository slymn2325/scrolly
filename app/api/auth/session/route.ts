import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isValidDeviceId } from '@/lib/dbActions';
import type { AuthSessionResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawGuestId = url.searchParams.get('guestId');
  const guestId = isValidDeviceId(rawGuestId) ? rawGuestId.trim().slice(0, 128) : null;

  try {
    const user = await getSessionUserFromRequest(request);
    const payload: AuthSessionResponse = {
      ok: true,
      authenticated: Boolean(user),
      guestId,
      user,
    };
    return NextResponse.json(payload, { status: 200, headers: NO_STORE_HEADERS });
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
