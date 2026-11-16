import { NextResponse } from 'next/server';
import { getSessionUserFromRequest, syncAuthenticatedUserFromProfile } from '@/lib/auth';
import {
  getProfileByDeviceId,
  isValidDeviceId,
  sanitizeVocabNotebook,
  upsertProfileState,
} from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import type { LocalMemorySnapshot } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`profile_get:${ip}`, 90, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(request.url);
  const deviceId = (url.searchParams.get('deviceId') || '').trim();
  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json(
      { ok: true, persisted: false, profile: null },
      { headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await getProfileByDeviceId(deviceId);
    return NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        profile: result.profile,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.warn('[API /api/profile GET] DB degraded cleanly:', err);
    return NextResponse.json(
      { ok: true, persisted: false, profile: null },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`profile_post:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!isValidDeviceId(rawDeviceId)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_device_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const isReset = Boolean(body.reset);
    const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
    const vocabNotebook = Array.isArray(body.vocabNotebook)
      ? sanitizeVocabNotebook(body.vocabNotebook, 250)
      : undefined;
    const likedIds = Array.isArray(body.likedIds) ? (body.likedIds as string[]) : undefined;

    const result = await upsertProfileState({
      deviceId: rawDeviceId,
      userId: isReset ? null : sessionUser?.id,
      username: typeof body.username === 'string' ? body.username : undefined,
      handle: typeof body.handle === 'string' ? body.handle : undefined,
      // XP is server-awarded only — ignore client xp/weeklyXp.
      dailyBestScore: typeof body.dailyBestScore === 'number' ? body.dailyBestScore : undefined,
      lastDailyQuizDate:
        typeof body.lastDailyQuizDate === 'string' ? body.lastDailyQuizDate : undefined,
      streak: typeof body.streak === 'number' ? body.streak : undefined,
      lastVisitDate: typeof body.lastVisitDate === 'string' ? body.lastVisitDate : undefined,
      seenIds: Array.isArray(body.seenIds) ? (body.seenIds as string[]) : undefined,
      favoriteIds: Array.isArray(body.favoriteIds) ? (body.favoriteIds as string[]) : undefined,
      likedIds,
      vocabNotebook,
      categoryWeights:
        body.categoryWeights && typeof body.categoryWeights === 'object'
          ? (body.categoryWeights as Record<string, number>)
          : undefined,
      categoryAccuracy:
        body.categoryAccuracy && typeof body.categoryAccuracy === 'object'
          ? (body.categoryAccuracy as Record<string, { attempts: number; totalPct: number }>)
          : undefined,
      badges: Array.isArray(body.badges) ? (body.badges as string[]) : undefined,
      reset: isReset,
    });

    if (sessionUser && !isReset) {
      const snapshot: LocalMemorySnapshot = {
        nickname: typeof body.username === 'string' ? body.username : undefined,
        // Do not pass client XP into auth sync.
        dailyBestScore: typeof body.dailyBestScore === 'number' ? body.dailyBestScore : undefined,
        lastDailyQuizDate:
          typeof body.lastDailyQuizDate === 'string' ? body.lastDailyQuizDate : undefined,
        lastVisitDate: typeof body.lastVisitDate === 'string' ? body.lastVisitDate : undefined,
        seenIds: Array.isArray(body.seenIds) ? (body.seenIds as string[]) : undefined,
        favoriteIds: Array.isArray(body.favoriteIds) ? (body.favoriteIds as string[]) : undefined,
        likedIds,
        vocabNotebook,
        categoryWeights:
          body.categoryWeights && typeof body.categoryWeights === 'object'
            ? (body.categoryWeights as Record<string, number>)
            : undefined,
        categoryAccuracy:
          body.categoryAccuracy && typeof body.categoryAccuracy === 'object'
            ? (body.categoryAccuracy as Record<string, { attempts: number; totalPct: number }>)
            : undefined,
        badges: Array.isArray(body.badges) ? (body.badges as string[]) : undefined,
      };
      await syncAuthenticatedUserFromProfile({
        userId: sessionUser.id,
        deviceId: rawDeviceId,
        snapshot,
      }).catch((err) => {
        console.warn('[API /api/profile POST] User session sync skipped:', err);
      });
    }

    return NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        profile: result.profile,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.warn('[API /api/profile POST] Degraded gracefully:', err);
    return NextResponse.json(
      { ok: true, persisted: false, profile: null },
      { headers: NO_STORE_HEADERS }
    );
  }
}
