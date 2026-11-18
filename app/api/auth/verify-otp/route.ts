import { NextResponse } from 'next/server';
import {
  canonicalizeEmail,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  buildSignedSessionCookieValue,
  shouldUseSecureCookie,
  verifyOtpAndCreateSession,
} from '@/lib/auth';
import { isValidDeviceId } from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';
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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`auth_verify_otp_ip:${ip}`, 15, 10 * 60_000);
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

  const parsed = await readJsonBodyWithLimit<Partial<VerifyOtpPayload> & { lang?: unknown }>(
    request,
    128 * 1024
  );
  if (!parsed.ok) {
    const payload: VerifyOtpResponse = {
      ok: false,
      authenticated: false,
      user: null,
      error: parsed.status === 413 ? 'Request body too large.' : 'Invalid JSON request body.',
    };
    return NextResponse.json(payload, { status: parsed.status, headers: NO_STORE_HEADERS });
  }
  const body = parsed.data;

  const lang = inferLangFromRequest(request, body.lang);
  const email = typeof body.email === 'string' ? body.email : '';
  const canonical = canonicalizeEmail(email);

  if (canonical.includes('@')) {
    const emailLimit = checkRateLimit(`auth_verify_otp_email:${canonical}`, 10, 10 * 60_000);
    if (!emailLimit.allowed) {
      const payload: VerifyOtpResponse = {
        ok: false,
        authenticated: false,
        user: null,
        error:
          lang === 'en'
            ? 'Too many verification attempts for this email. Please wait a few minutes.'
            : 'Bu e-posta için çok fazla doğrulama denemesi yapıldı. Lütfen birkaç dakika bekleyin.',
      };
      return NextResponse.json(payload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(emailLimit.retryAfterSec) },
      });
    }

    const pairLimit = checkRateLimit(`auth_verify_otp_pair:${ip}:${canonical}`, 8, 10 * 60_000);
    if (!pairLimit.allowed) {
      const payload: VerifyOtpResponse = {
        ok: false,
        authenticated: false,
        user: null,
        error:
          lang === 'en'
            ? 'Too many verification attempts. Please wait a few minutes.'
            : 'Çok fazla doğrulama denemesi yapıldı. Lütfen birkaç dakika bekleyin.',
      };
      return NextResponse.json(payload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(pairLimit.retryAfterSec) },
      });
    }
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const guestId = typeof body.guestId === 'string' ? body.guestId : undefined;
  const boundDeviceId = readSignedDeviceIdFromRequest(request);
  const localSnapshot =
    body.localSnapshot && typeof body.localSnapshot === 'object' && !Array.isArray(body.localSnapshot)
      ? (body.localSnapshot as LocalMemorySnapshot)
      : undefined;

  try {
    const outcome = await verifyOtpAndCreateSession({
      email,
      code,
      guestId,
      boundDeviceId,
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
    response.cookies.set(
      SESSION_COOKIE_NAME,
      buildSignedSessionCookieValue(outcome.sessionToken),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: shouldUseSecureCookie(request),
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      }
    );

    const cleanGuest = isValidDeviceId(guestId) ? guestId.trim().slice(0, 128) : null;
    if (
      !boundDeviceId &&
      cleanGuest &&
      (outcome.user.linkedDeviceIds.length === 0 || outcome.user.linkedDeviceIds.includes(cleanGuest))
    ) {
      setSignedDeviceCookie(response, cleanGuest, request);
    }

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
