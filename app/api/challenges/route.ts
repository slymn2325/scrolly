import { NextResponse } from 'next/server';
import { challengePublicUrl, createChallenge } from '@/lib/challenges';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`challenges_create:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 8 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

  try {
    const result = await createChallenge({
      creatorNickname: typeof body.creatorNickname === 'string' ? body.creatorNickname : undefined,
      creatorScore: typeof body.creatorScore === 'number' ? body.creatorScore : undefined,
      creatorCorrect: typeof body.creatorCorrect === 'number' ? body.creatorCorrect : undefined,
      totalQuestions: typeof body.totalQuestions === 'number' ? body.totalQuestions : undefined,
      questionIds: Array.isArray(body.questionIds) ? (body.questionIds as string[]) : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      lang: body.lang === 'en' ? 'en' : 'tr',
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const url = challengePublicUrl(result.challenge.code);
    return NextResponse.json(
      {
        ok: true,
        code: result.challenge.code,
        url,
        challenge: result.challenge,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[POST /api/challenges] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'challenge_create_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
