import { NextResponse } from 'next/server';
import { getSessionUserFromRequest, syncAuthenticatedUserFromProfile } from '@/lib/auth';
import {
  getProfileByDeviceId,
  isValidDeviceId,
  type PersistedProfileDto,
  sanitizeVocabNotebook,
  upsertProfileState,
} from '@/lib/dbActions';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';
import type { AuthUserDto, LocalMemorySnapshot } from '@/types/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function isProfileOwnerOrAllowed(params: {
  requestedDeviceId: string;
  existingUserId: string | null | undefined;
  boundDeviceId: string | null;
  sessionUser: AuthUserDto | null;
  allowNewReset: boolean;
}): boolean {
  const { requestedDeviceId, existingUserId, boundDeviceId, sessionUser, allowNewReset } = params;
  if (existingUserId) {
    return Boolean(sessionUser && sessionUser.id === existingUserId);
  }
  if (boundDeviceId && boundDeviceId !== requestedDeviceId) {
    return Boolean(allowNewReset || (sessionUser && sessionUser.linkedDeviceIds.includes(requestedDeviceId)));
  }
  return true;
}

function sanitizeProfileResponse(
  profile: PersistedProfileDto | null,
  sessionUser: AuthUserDto | null
): PersistedProfileDto | Omit<PersistedProfileDto, 'userId'> | null {
  if (!profile) return null;
  if (!sessionUser || sessionUser.id !== profile.userId) {
    const { userId: _ignoredUserId, ...rest } = profile;
    return rest;
  }
  return profile;
}

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

  const boundDeviceId = readSignedDeviceIdFromRequest(request);
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);

  try {
    const result = await getProfileByDeviceId(deviceId);
    if (
      !isProfileOwnerOrAllowed({
        requestedDeviceId: deviceId,
        existingUserId: result.profile?.userId ?? null,
        boundDeviceId,
        sessionUser,
        allowNewReset: false,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: 'forbidden' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        profile: sanitizeProfileResponse(result.profile, sessionUser),
      },
      { headers: NO_STORE_HEADERS }
    );

    if (!boundDeviceId && (!result.profile?.userId || result.profile.userId === sessionUser?.id)) {
      setSignedDeviceCookie(response, deviceId, request);
    }

    return response;
  } catch (err) {
    console.warn('[API /api/profile GET] DB degraded cleanly:', err);
    return NextResponse.json(
      { ok: true, persisted: false, profile: null },
      { headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`profile_post:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 256 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

  try {
    const rawDeviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    if (!isValidDeviceId(rawDeviceId)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_device_id' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const isReset = Boolean(body.reset);
    const boundDeviceId = readSignedDeviceIdFromRequest(request);
    const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
    const existing = await getProfileByDeviceId(rawDeviceId).catch(() => ({
      persisted: false,
      profile: null,
    }));

    if (
      !isProfileOwnerOrAllowed({
        requestedDeviceId: rawDeviceId,
        existingUserId: existing.profile?.userId ?? null,
        boundDeviceId,
        sessionUser,
        allowNewReset: isReset && !existing.profile,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: 'forbidden' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const vocabNotebook = Array.isArray(body.vocabNotebook)
      ? sanitizeVocabNotebook(body.vocabNotebook, 250)
      : undefined;
    const likedIds = Array.isArray(body.likedIds) ? (body.likedIds as string[]) : undefined;

    const result = await upsertProfileState({
      deviceId: rawDeviceId,
      userId: isReset ? null : sessionUser?.id,
      username: typeof body.username === 'string' ? body.username : undefined,
      handle: typeof body.handle === 'string' ? body.handle : undefined,
      // Server-authoritative fields only: ignore client xp/weeklyXp/dailyBestScore/lastDailyQuizDate/streak.
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
        // Ignore client xp/weeklyXp/dailyBestScore/lastDailyQuizDate/streak during profile sync.
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

    const response = NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        profile: sanitizeProfileResponse(result.profile, sessionUser),
      },
      { headers: NO_STORE_HEADERS }
    );

    if (!boundDeviceId || (isReset && !existing.profile)) {
      setSignedDeviceCookie(response, rawDeviceId, request);
    }

    return response;
  } catch (err) {
    console.warn('[API /api/profile POST] Degraded gracefully:', err);
    return NextResponse.json(
      { ok: true, persisted: false, profile: null },
      { headers: NO_STORE_HEADERS }
    );
  }
}
