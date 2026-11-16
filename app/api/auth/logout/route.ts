import { NextResponse } from 'next/server';
import {
  revokeSessionFromRequest,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
} from '@/lib/auth';
import type { LogoutResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
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
