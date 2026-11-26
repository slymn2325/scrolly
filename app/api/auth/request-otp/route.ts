import { NextResponse } from 'next/server';
import {
  canonicalizeEmail,
  isValidEmailFormat,
  normalizeEmail,
  OTP_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  requestOtpChallenge,
} from '@/lib/auth';
import { isDisposableEmailDomain } from '@/lib/disposableDomains';
import { resolveApiLocale } from '@/lib/locale';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import type { RequestOtpPayload, RequestOtpResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const clientIp = extractClientIp(request);
  const rl = checkRateLimit(`auth_request_otp_ip:${clientIp}`, 10, 10 * 60_000);
  if (!rl.allowed) {
    const errPayload: RequestOtpResponse = {
      ok: false,
      cooldownSec: OTP_COOLDOWN_SECONDS,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error: 'Too many OTP requests. Please wait a few minutes.',
    };
    return NextResponse.json(errPayload, {
      status: 429,
      headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) },
    });
  }

  const parsed = await readJsonBodyWithLimit<Partial<RequestOtpPayload>>(request, 4 * 1024);
  if (!parsed.ok) {
    const errPayload: RequestOtpResponse = {
      ok: false,
      cooldownSec: 0,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error: parsed.status === 413 ? 'Request body too large.' : 'Invalid JSON request body.',
    };
    return NextResponse.json(errPayload, { status: parsed.status, headers: NO_STORE_HEADERS });
  }
  const body = parsed.data;

  const lang = resolveApiLocale(request, body.locale, body.lang);
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  const cleanEmail = normalizeEmail(rawEmail);
  const canonical = canonicalizeEmail(cleanEmail);

  if (isValidEmailFormat(cleanEmail) && !isDisposableEmailDomain(cleanEmail)) {
    const burstLimit = checkRateLimit(`auth_request_otp_burst:${canonical}`, 1, 55_000);
    if (!burstLimit.allowed) {
      const waitSec = Math.max(1, burstLimit.retryAfterSec);
      const errPayload: RequestOtpResponse = {
        ok: false,
        cooldownSec: waitSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        error:
          lang === 'en'
            ? `Please wait ${waitSec} seconds before requesting a new code.`
            : `Yeni bir kod istemeden önce lütfen ${waitSec} saniye bekleyin.`,
      };
      return NextResponse.json(errPayload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(waitSec) },
      });
    }

    const emailLimit = checkRateLimit(`auth_request_otp_email:${canonical}`, 3, 10 * 60_000);
    if (!emailLimit.allowed) {
      const errPayload: RequestOtpResponse = {
        ok: false,
        cooldownSec: emailLimit.retryAfterSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        error:
          lang === 'en'
            ? 'Too many verification code requests for this email. Please wait a few minutes.'
            : 'Bu e-posta için çok fazla doğrulama kodu istendi. Lütfen birkaç dakika bekleyin.',
      };
      return NextResponse.json(errPayload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(emailLimit.retryAfterSec) },
      });
    }

    const pairLimit = checkRateLimit(`auth_request_otp_pair:${clientIp}:${canonical}`, 3, 10 * 60_000);
    if (!pairLimit.allowed) {
      const errPayload: RequestOtpResponse = {
        ok: false,
        cooldownSec: pairLimit.retryAfterSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        error:
          lang === 'en'
            ? 'Too many verification code requests from this device. Please wait a few minutes.'
            : 'Bu cihazdan bu e-posta için çok fazla doğrulama kodu istendi. Lütfen birkaç dakika bekleyin.',
      };
      return NextResponse.json(errPayload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(pairLimit.retryAfterSec) },
      });
    }

    const globalLimit = checkRateLimit('auth_request_otp_global', 100, 60 * 60_000);
    if (!globalLimit.allowed) {
      const errPayload: RequestOtpResponse = {
        ok: false,
        cooldownSec: globalLimit.retryAfterSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        error:
          lang === 'en'
            ? 'Verification service is temporarily busy. Please try again shortly.'
            : 'Doğrulama servisi şu anda yoğun. Lütfen kısa süre sonra tekrar deneyin.',
      };
      return NextResponse.json(errPayload, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(globalLimit.retryAfterSec) },
      });
    }
  }

  try {
    const outcome = await requestOtpChallenge({
      email: rawEmail,
      lang,
      clientIp,
    });

    const responseBody: RequestOtpResponse = {
      ok: outcome.ok,
      cooldownSec: outcome.cooldownSec,
      expiresInSec: outcome.expiresInSec,
      delivery: outcome.delivery,
      ...(outcome.devOtpCode && process.env.NODE_ENV !== 'production'
        ? { devOtpCode: outcome.devOtpCode }
        : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
    };

    const headers: Record<string, string> = { ...NO_STORE_HEADERS };
    if (outcome.status === 429 && outcome.retryAfterSec) {
      headers['Retry-After'] = String(outcome.retryAfterSec);
    }

    return NextResponse.json(responseBody, {
      status: outcome.status,
      headers,
    });
  } catch (err) {
    console.error('[POST /api/auth/request-otp] Failed:', err);
    const errPayload: RequestOtpResponse = {
      ok: false,
      cooldownSec: OTP_COOLDOWN_SECONDS,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error:
        lang === 'en'
          ? 'Could not process verification request right now. Please try again.'
          : 'Doğrulama kodu isteği şu anda işlenemedi. Lütfen tekrar deneyin.',
    };
    return NextResponse.json(errPayload, { status: 500, headers: NO_STORE_HEADERS });
  }
}
