import { NextResponse } from 'next/server';
import { getSessionUserFromRequest, mergeGuestDataIntoUser } from '@/lib/auth';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
} from '@/lib/requestSecurity';
import type { LocalMemorySnapshot, MergeGuestPayload, MergeGuestResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

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

  const parsed = await readJsonBodyWithLimit<Partial<MergeGuestPayload>>(request, 128 * 1024, {
    allowEmpty: true,
  });
  if (!parsed.ok) {
    const payload: MergeGuestResponse = {
      ok: false,
      authenticated: true,
      user: sessionUser,
      error: parsed.error,
    };
    return NextResponse.json(payload, { status: parsed.status, headers: NO_STORE_HEADERS });
  }
  const body = parsed.data;

  const guestId = typeof body.guestId === 'string' ? body.guestId : undefined;
  const boundDeviceId = readSignedDeviceIdFromRequest(request);
  const mode = body.mode === 'keep_existing' ? 'keep_existing' : 'merge';
  const localSnapshot =
    body.localSnapshot && typeof body.localSnapshot === 'object' && !Array.isArray(body.localSnapshot)
      ? (body.localSnapshot as LocalMemorySnapshot)
      : undefined;

  try {
    const mergedUser = await mergeGuestDataIntoUser({
      userId: sessionUser.id,
      guestId,
      boundDeviceId,
      localSnapshot,
      mode,
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
