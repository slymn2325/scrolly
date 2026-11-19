import { NextResponse } from 'next/server';
import { getDailyGuessDateIso } from '@/lib/dailyGuess';
import { getDailyGuessStats, submitDailyGuessAttempt } from '@/lib/dailyGuessStore';
import { isValidDeviceId } from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';
import { parseIsoDate } from '@/utils/viralShare';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`daily_guess_get:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const date = parseIsoDate(url.searchParams.get('date')) ?? getDailyGuessDateIso();
  const rawQueryDevice = url.searchParams.get('deviceId');
  const boundDevice = readSignedDeviceIdFromRequest(request);
  const deviceId =
    boundDevice ??
    (isValidDeviceId(rawQueryDevice) ? rawQueryDevice!.trim().slice(0, 128) : null);

  try {
    const stats = await getDailyGuessStats({ date, deviceId });
    return NextResponse.json({ ok: true, ...stats }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.warn('[GET /api/daily-guess] Degraded cleanly:', err);
    return NextResponse.json(
      {
        ok: true,
        date,
        puzzleNumber: 1,
        totalParticipants: 0,
        attempt: null,
      },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`daily_guess_post:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 4 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

  const boundDevice = readSignedDeviceIdFromRequest(request);
  const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  const deviceId = boundDevice ?? (isValidDeviceId(rawDeviceId) ? rawDeviceId.slice(0, 128) : '');
  const factId = typeof body.factId === 'string' ? body.factId.trim() : '';
  const rawAcc = Number(body.accuracyPct);
  const date = parseIsoDate(typeof body.date === 'string' ? body.date : undefined) ?? getDailyGuessDateIso();

  if (!deviceId || !factId || !Number.isFinite(rawAcc)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_payload' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const outcome = await submitDailyGuessAttempt({
      date,
      factId,
      deviceId,
      accuracyPct: rawAcc,
    });
    const response = NextResponse.json(
      { ok: true, ...outcome },
      { status: 200, headers: NO_STORE_HEADERS }
    );
    if (!boundDevice && isValidDeviceId(deviceId)) {
      setSignedDeviceCookie(response, deviceId, request);
    }
    return response;
  } catch (err) {
    console.error('[POST /api/daily-guess] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'daily_guess_save_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
