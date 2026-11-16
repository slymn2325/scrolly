import { NextResponse } from 'next/server';
import { getSessionUserFromRequest, mergeGuestDataIntoUser } from '@/lib/auth';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import type { LocalMemorySnapshot, MergeGuestPayload, MergeGuestResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`auth_merge_guest:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    const payload: MergeGuestResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error: 'rate_limited',
    };
    return NextResponse.json(payload, {
      status: 429,
      headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
  if (!sessionUser) {
    const payload: MergeGuestResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error: 'unauthenticated',
    };
    return NextResponse.json(payload, { status: 401, headers: NO_STORE_HEADERS });
  }

  let body: Partial<MergeGuestPayload> = {};
  try {
    body = (await request.json()) as Partial<MergeGuestPayload>;
  } catch {
    // Allow empty body if client relies solely on session cookie or defaults
  }

  const guestId = typeof body.guestId === 'string' ? body.guestId : undefined;
  const localSnapshot =
    body.localSnapshot && typeof body.localSnapshot === 'object' && !Array.isArray(body.localSnapshot)
      ? (body.localSnapshot as LocalMemorySnapshot)
      : undefined;

  try {
    const mergedUser = await mergeGuestDataIntoUser({
      userId: sessionUser.id,
      guestId,
      localSnapshot,
    });

    if (!mergedUser) {
      const payload: MergeGuestResponse = {
        ok: false,
        authenticated: false,
        user: null,
        error: 'user_not_found',
      };
      return NextResponse.json(payload, { status: 404, headers: NO_STORE_HEADERS });
    }

    const payload: MergeGuestResponse = {
      ok: true,
      authenticated: true,
      user: mergedUser,
    };
    return NextResponse.json(payload, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[POST /api/auth/merge-guest] Failed:', err);
    const payload: MergeGuestResponse = {
      ok: false,
      authenticated: true,
      user: sessionUser,
      error: 'merge_failed',
    };
    return NextResponse.json(payload, { status: 500, headers: NO_STORE_HEADERS });
  }
}
