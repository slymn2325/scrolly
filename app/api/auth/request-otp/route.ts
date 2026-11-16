import { NextResponse } from 'next/server';
import {
  OTP_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  requestOtpChallenge,
} from '@/lib/auth';
import { extractClientIp } from '@/lib/rateLimit';
import type { RequestOtpPayload, RequestOtpResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  let body: Partial<RequestOtpPayload>;
  try {
    body = (await request.json()) as Partial<RequestOtpPayload>;
  } catch {
    const errPayload: RequestOtpResponse = {
      ok: false,
      cooldownSec: 0,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error: 'Invalid JSON request body.',
    };
    return NextResponse.json(errPayload, { status: 400, headers: NO_STORE_HEADERS });
  }

  const lang = body.lang === 'en' ? 'en' : 'tr';
  const email = typeof body.email === 'string' ? body.email : '';
  const clientIp = extractClientIp(request);

  try {
    const outcome = await requestOtpChallenge({
      email,
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
