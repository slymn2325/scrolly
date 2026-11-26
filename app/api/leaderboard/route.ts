import { NextResponse } from 'next/server';
import {
  getSessionUserFromRequest,
  syncAuthenticatedUserFromEvents,
  syncAuthenticatedUserFromProfile,
} from '@/lib/auth';
import {
  getLeaderboardRows,
  getProfileByDeviceId,
  isValidDeviceId,
  recordQuizSubmission,
} from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  computeOpaquePublicLeaderboardId,
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';

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
  const rawQueryDeviceId = url.searchParams.get('deviceId') || '';
  const queryDeviceId = isValidDeviceId(rawQueryDeviceId)
    ? rawQueryDeviceId.trim().slice(0, 128)
    : '';
  const boundDeviceId = readSignedDeviceIdFromRequest(request);
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  try {
    const result = await getLeaderboardRows(tab, limit, clientDate);
    const entries = result.rows.map(({ userId: rowUserId, ...row }) => {
      const isCurrentUser = Boolean(
        (sessionUser &&
          ((rowUserId && rowUserId === sessionUser.id) ||
            sessionUser.linkedDeviceIds.includes(row.deviceId))) ||
          (boundDeviceId && row.deviceId === boundDeviceId) ||
          (!boundDeviceId && !rowUserId && queryDeviceId && row.deviceId === queryDeviceId)
      );
      return {
        ...row,
        deviceId: isCurrentUser ? row.deviceId : computeOpaquePublicLeaderboardId(row.deviceId),
        isCurrentUser,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        tab,
        source: result.source,
        entries,
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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`leaderboard_post:${ip}`, 40, 60_000);
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
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : 'Kâşif';
    const handle = typeof body.handle === 'string' ? body.handle.trim() : undefined;
    const clientDate = typeof body.clientDate === 'string' ? body.clientDate.trim() : undefined;
    const rawMode = String(body.mode || 'daily');
    const mode: 'daily' | 'weekly' | 'memory' | 'duel' =
      rawMode === 'weekly' || rawMode === 'memory' || rawMode === 'duel'
        ? rawMode
        : 'daily';

    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_device_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const boundDeviceId = readSignedDeviceIdFromRequest(request);
    const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
    const existing = await getProfileByDeviceId(deviceId).catch(() => ({
      persisted: false,
      profile: null,
    }));

    if (
      (existing.profile?.userId && sessionUser?.id !== existing.profile.userId) ||
      (boundDeviceId &&
        boundDeviceId !== deviceId &&
        !(
          sessionUser &&
          (existing.profile?.userId === sessionUser.id ||
            sessionUser.linkedDeviceIds.includes(deviceId))
        ))
    ) {
      return NextResponse.json(
        { ok: false, error: 'forbidden' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const score = Number(body.score || 0);
    const correctCount = Number(body.correctCount || 0);
    const totalQuestions = Number(body.totalQuestions || 1);
    const answers = Array.isArray(body.answers)
      ? body.answers.slice(0, 15).map(Boolean)
      : undefined;
    const durationSec = typeof body.durationSec === 'number' ? body.durationSec : undefined;

    const result = await recordQuizSubmission({
      deviceId,
      username,
      handle,
      mode,
      score,
      correctCount,
      totalQuestions,
      answers,
      durationSec,
      clientDate,
    });

    if (sessionUser) {
      const today = new Date().toISOString().slice(0, 10);
      if (mode === 'daily' && result.safeScore > 0) {
        await syncAuthenticatedUserFromProfile({
          userId: sessionUser.id,
          deviceId,
          snapshot: {
            nickname: username,
            dailyBestScore: result.safeScore,
            lastDailyQuizDate: clientDate || today,
          },
          trustedDailyBestScore: true,
        }).catch(() => {});
      } else if (username) {
        await syncAuthenticatedUserFromProfile({
          userId: sessionUser.id,
          deviceId,
          snapshot: {
            nickname: username,
          },
        }).catch(() => {});
      }

      if (result.xpAwarded > 0) {
        await syncAuthenticatedUserFromEvents({
          userId: sessionUser.id,
          deviceId,
          xpDelta: result.xpAwarded,
          username,
        }).catch(() => {});
      }
    }

    const response = NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        xpAwarded: result.xpAwarded,
      },
      { headers: NO_STORE_HEADERS }
    );

    if (!boundDeviceId && (!existing.profile?.userId || existing.profile.userId === sessionUser?.id)) {
      setSignedDeviceCookie(response, deviceId, request);
    }

    return response;
  } catch (err) {
    console.warn('[API /api/leaderboard POST] Degraded cleanly:', err);
    return NextResponse.json(
      { ok: true, persisted: false },
      { headers: NO_STORE_HEADERS }
    );
  }
}
