import { NextResponse } from 'next/server';
import { getChallengeByCode, isValidChallengeCode } from '@/lib/challenges';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`challenges_get:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { code } = await context.params;
  if (!isValidChallengeCode(code)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const challenge = await getChallengeByCode(code);
    if (!challenge) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(
      { ok: true, challenge },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[GET /api/challenges/[code]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'challenge_fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
