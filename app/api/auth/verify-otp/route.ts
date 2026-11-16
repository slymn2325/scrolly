import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  shouldUseSecureCookie,
  verifyOtpAndCreateSession,
} from '@/lib/auth';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import type { LocalMemorySnapshot, VerifyOtpPayload, VerifyOtpResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function inferLangFromRequest(request: Request, bodyLang?: unknown): 'tr' | 'en' {
  if (bodyLang === 'en') return 'en';
  if (bodyLang === 'tr') return 'tr';
  const accept = (request.headers.get('accept-language') || '').toLowerCase();
  return accept.startsWith('en') ? 'en' : 'tr';
}

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`auth_verify_otp:${ip}`, 30, 10 * 60_000);
  if (!rl.allowed) {
    const payload: VerifyOtpResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error: 'Too many verification attempts. Please wait a few minutes.',
    };
    return NextResponse.json(payload, {
      status: 429,
      headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  let body: Partial<VerifyOtpPayload> & { lang?: unknown };
  try {
    body = (await request.json()) as Partial<VerifyOtpPayload> & { lang?: unknown };
  } catch {
    const payload: VerifyOtpResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error: 'Invalid JSON request body.',
    };
    return NextResponse.json(payload, { status: 400, headers: NO_STORE_HEADERS });
  }

  const lang = inferLangFromRequest(request, body.lang);
  const email = typeof body.email === 'string' ? body.email : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const guestId = typeof body.guestId === 'string' ? body.guestId : undefined;
  const localSnapshot =
    body.localSnapshot && typeof body.localSnapshot === 'object' && !Array.isArray(body.localSnapshot)
      ? (body.localSnapshot as LocalMemorySnapshot)
      : undefined;

  try {
    const outcome = await verifyOtpAndCreateSession({
      email,
      code,
      guestId,
      localSnapshot,
      lang,
    });

    if (!outcome.ok || !outcome.user || !outcome.sessionToken) {
      const failPayload: VerifyOtpResponse = {
        ok: false,
        authenticated: false,
        user: null,
        error: outcome.error || 'Verification failed.',
      };
      return NextResponse.json(failPayload, {
        status: outcome.status,
        headers: NO_STORE_HEADERS,
      });
    }

    const okPayload: VerifyOtpResponse = {
      ok: true,
      authenticated: true,
      user: outcome.user,
    };

    const response = NextResponse.json(okPayload, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
    response.cookies.set(SESSION_COOKIE_NAME, outcome.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(request),
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    console.error('[POST /api/auth/verify-otp] Failed:', err);
    const errPayload: VerifyOtpResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error:
        lang === 'en'
          ? 'Could not verify code right now. Please try again.'
          : 'Doğrulama kodu şu anda kontrol edilemedi. Lütfen tekrar deneyin.',
    };
    return NextResponse.json(errPayload, { status: 500, headers: NO_STORE_HEADERS });
  }
}
