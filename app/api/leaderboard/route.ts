import { NextResponse } from 'next/server';
import { getLeaderboardRows, recordQuizSubmission } from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`leaderboard_get:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const rawTab = url.searchParams.get('tab') || 'daily';
  const tab: 'daily' | 'weekly' | 'alltime' =
    rawTab === 'weekly' || rawTab === 'alltime' ? rawTab : 'daily';
  const clientDate = url.searchParams.get('clientDate') || undefined;
  const rawLimit = Number(url.searchParams.get('limit') || '50');
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 50;

  try {
    const result = await getLeaderboardRows(tab, limit, clientDate);
    return NextResponse.json(
      {
        ok: true,
        tab,
        source: result.source,
        entries: result.rows,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.warn('[API /api/leaderboard GET] Degraded cleanly:', err);
    return NextResponse.json(
      {
        ok: true,
        tab,
        source: 'local',
        entries: [],
      },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`leaderboard_post:${ip}`, 40, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : 'Kâşif';
    const handle = typeof body.handle === 'string' ? body.handle.trim() : undefined;
    const clientDate = typeof body.clientDate === 'string' ? body.clientDate.trim() : undefined;
    const rawMode = String(body.mode || 'daily');
    const mode: 'daily' | 'weekly' | 'memory' | 'duel' =
      rawMode === 'weekly' || rawMode === 'memory' || rawMode === 'duel'
        ? rawMode
        : 'daily';

    if (!deviceId || deviceId.length < 4) {
      return NextResponse.json(
        { ok: false, error: 'invalid_device_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await recordQuizSubmission({
      deviceId,
      username,
      handle,
      mode,
      score: Number(body.score || 0),
      correctCount: Number(body.correctCount || 0),
      totalQuestions: Number(body.totalQuestions || 1),
      clientDate,
    });

    return NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.warn('[API /api/leaderboard POST] Degraded cleanly:', err);
    return NextResponse.json(
      { ok: true, persisted: false },
      { headers: NO_STORE_HEADERS }
    );
  }
}
