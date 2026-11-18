import { NextResponse } from 'next/server';
import {
  revokeSessionFromRequest,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
} from '@/lib/auth';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin } from '@/lib/requestSecurity';
import type { LogoutResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`auth_logout:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, authenticated: false, user: null, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    await revokeSessionFromRequest(request);
  } catch (err) {
    console.warn('[POST /api/auth/logout] Revoke warning:', err);
  }

  const payload: LogoutResponse = {
    ok: true,
    authenticated: false,
    user: null,
  };

  const response = NextResponse.json(payload, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: 0,
  });

  return response;
}
