'use client';

import type {
  AuthSessionResponse,
  AuthUserDto,
  GuestMergeMode,
  LocalMemorySnapshot,
  LogoutResponse,
  MergeGuestPayload,
  MergeGuestResponse,
  RequestOtpPayload,
  RequestOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from '@/types/auth';
import { getOrCreateDeviceId, resetTelemetryClientState } from '@/lib/telemetry';
import { clearScrollaPlayerId, getOrCreateScrollaPlayerId } from '@/utils/duelLobby';
import { clearLikedFacts, loadLikedFactIds, mergeLikedFactIds } from '@/utils/likedFacts';
import { clearSavedFacts, loadSavedFactIds, mergeSavedFactIds } from '@/utils/savedFacts';
import { clearSeenSlugsStorage, mergeSeenIdsInStorage } from '@/utils/seenFacts';
import {
  createEmptyWeights,
  deriveExplorerTagFromId,
  getDefaultNickname,
  getLeagueInfo,
  loadUserMemory,
  mergeRemoteProfileIntoMemory,
  normalizeCategoryAccuracy,
  resetUserMemory,
  saveUserMemory,
  TOTAL_CARDS_VIEWED_STORAGE_KEY,
  type UserMemoryState,
} from '@/utils/userMemory';
import {
  clearVocabNotebook,
  loadSavedVocabNotebook,
  mergeSavedVocabNotebook,
} from '@/utils/vocabNotebook';

export const AUTH_USER_EMAIL_KEY = 'scrolly_auth_user_email';
export const AUTH_USER_NICKNAME_KEY = 'scrolly_auth_user_nickname';
export const AUTH_USER_ID_KEY = 'scrolly_auth_user_id';
export const AUTH_CHANGED_EVENT = 'scrolly-auth-changed';
export const OPEN_AUTH_EVENT = 'scrolly-open-auth';

export interface AuthChangedEventDetail {
  user: AuthUserDto | null;
  loggedOut?: boolean;
  freshMemory?: UserMemoryState;
}

export function getCachedAuthUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.localStorage.getItem(AUTH_USER_EMAIL_KEY);
    return val && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

export function persistAuthCacheAndEmit(
  user: AuthUserDto | null,
  extra?: { loggedOut?: boolean; freshMemory?: UserMemoryState }
): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_EMAIL_KEY, user.email);
      window.localStorage.setItem(AUTH_USER_NICKNAME_KEY, user.nickname);
      window.localStorage.setItem(AUTH_USER_ID_KEY, user.id);
    } else {
      window.localStorage.removeItem(AUTH_USER_EMAIL_KEY);
      window.localStorage.removeItem(AUTH_USER_NICKNAME_KEY);
      window.localStorage.removeItem(AUTH_USER_ID_KEY);
    }
  } catch {
    // Ignore storage failures in private browsing
  }
  try {
    window.dispatchEvent(
      new CustomEvent<AuthChangedEventDetail>(AUTH_CHANGED_EVENT, {
        detail: {
          user,
          ...(extra?.loggedOut ? { loggedOut: true } : {}),
          ...(extra?.freshMemory ? { freshMemory: extra.freshMemory } : {}),
        },
      })
    );
  } catch {
    // Ignore CustomEvent failures
  }
}

export function openLazyAuthPrompt(trigger?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<{ trigger?: string }>(OPEN_AUTH_EVENT, {
        detail: { trigger },
      })
    );
  } catch {
    // Ignore CustomEvent failures
  }
}

export function buildLocalSnapshot(overrideMemory?: UserMemoryState): LocalMemorySnapshot {
  const mem = overrideMemory ?? loadUserMemory();
  const savedFactIds =
    typeof window !== 'undefined'
      ? Array.from(new Set([...(mem.favoriteIds ?? []), ...loadSavedFactIds()]))
      : [...(mem.favoriteIds ?? [])];
  const likedIds = typeof window !== 'undefined' ? loadLikedFactIds() : [];
  const vocabNotebook = typeof window !== 'undefined' ? loadSavedVocabNotebook() : [];

  return {
    nickname: mem.nickname,
    xp: mem.xp,
    weeklyXp: mem.weeklyXp,
    dailyBestScore: mem.dailyBestScore,
    lastDailyQuizDate: mem.lastDailyQuizDate,
    streak: mem.streakDays,
    lastVisitDate: mem.lastVisitDate,
    seenIds: mem.seenIds,
    favoriteIds: savedFactIds,
    likedIds,
    vocabNotebook,
    categoryWeights: mem.categoryWeights,
    categoryAccuracy: mem.categoryAccuracy,
    badges: mem.badges,
  };
}

export function hydrateLocalMemoryFromAuthUser(
  local: UserMemoryState,
  user: AuthUserDto,
  mode: GuestMergeMode = 'merge',
  options?: { freshDeviceId?: string }
): UserMemoryState {
  if (mode === 'keep_existing') {
    clearSavedFacts();
    clearLikedFacts();
    clearSeenSlugsStorage();
    clearVocabNotebook();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(TOTAL_CARDS_VIEWED_STORAGE_KEY);
      } catch {
        // Ignore storage failures in private browsing
      }
    }

    const nextPlayerId = options?.freshDeviceId || local.playerId;
    const baseWeights = createEmptyWeights();
    if (user.categoryWeights && typeof user.categoryWeights === 'object') {
      for (const key of Object.keys(baseWeights) as (keyof typeof baseWeights)[]) {
        const val = user.categoryWeights[key];
        if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
          baseWeights[key] = val;
        }
      }
    }

    const replaced: UserMemoryState = {
      ...local,
      playerId: nextPlayerId,
      nickname:
        user.nickname ||
        getDefaultNickname(local.lang, deriveExplorerTagFromId(nextPlayerId)),
      xp: user.xp,
      weeklyXp: user.weeklyXp,
      dailyBestScore: user.dailyBestScore,
      lastDailyQuizDate: user.lastDailyQuizDate,
      highestLeagueId: getLeagueInfo(user.xp, local.lang).id,
      streakDays: user.streak,
      lastVisitDate: user.lastVisitDate || local.lastVisitDate,
      lastActiveDate: user.streak > 0 ? user.lastVisitDate || local.lastVisitDate : '',
      seenIds: [...(user.seenIds ?? [])],
      recentFiveIds: [],
      cardsSinceLastQuiz: 0,
      favoriteIds: [...(user.favoriteIds ?? [])],
      categoryWeights: baseWeights,
      categoryAccuracy: normalizeCategoryAccuracy(user.categoryAccuracy),
      badges: [...(user.badges ?? [])],
      isReturningUser: (user.seenIds?.length ?? 0) > 0 || user.xp > 0,
    };
    saveUserMemory(replaced);
    mergeSavedFactIds(user.favoriteIds ?? []);
    mergeLikedFactIds(user.likedIds ?? []);
    mergeSeenIdsInStorage(user.seenIds ?? []);
    mergeSavedVocabNotebook(user.vocabNotebook ?? []);
    persistAuthCacheAndEmit(user);
    return replaced;
  }

  const merged = mergeRemoteProfileIntoMemory(local, {
    username: user.nickname,
    xp: user.xp,
    weeklyXp: user.weeklyXp,
    dailyBestScore: user.dailyBestScore,
    lastDailyQuizDate: user.lastDailyQuizDate,
    streak: user.streak,
    lastVisitDate: user.lastVisitDate,
    lastActiveDate: user.streak > 0 ? user.lastVisitDate : '',
    seenIds: user.seenIds,
    favoriteIds: user.favoriteIds,
    categoryWeights: user.categoryWeights,
    categoryAccuracy: user.categoryAccuracy,
    badges: user.badges,
  });

  mergeSavedFactIds(user.favoriteIds ?? []);
  mergeLikedFactIds(user.likedIds ?? []);
  mergeSeenIdsInStorage(user.seenIds ?? []);
  mergeSavedVocabNotebook(user.vocabNotebook ?? []);
  persistAuthCacheAndEmit(user);

  return merged;
}

export async function fetchSession(): Promise<AuthSessionResponse> {
  if (typeof window === 'undefined') {
    return { ok: false, authenticated: false, guestId: null, user: null };
  }
  try {
    const deviceId = getOrCreateDeviceId();
    const res = await fetch(`/api/auth/session?guestId=${encodeURIComponent(deviceId)}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const data = (await res.json()) as Partial<AuthSessionResponse>;
    const user = data?.user ?? null;
    if (res.ok && data?.authenticated && user) {
      persistAuthCacheAndEmit(user);
      return {
        ok: true,
        authenticated: true,
        guestId: data.guestId ?? null,
        user,
      };
    }
    persistAuthCacheAndEmit(null);
    return {
      ok: Boolean(data?.ok ?? res.ok),
      authenticated: false,
      guestId: data?.guestId ?? null,
      user: null,
    };
  } catch {
    return { ok: false, authenticated: false, guestId: null, user: null };
  }
}

export async function requestEmailOtp(
  payload: RequestOtpPayload
): Promise<RequestOtpResponse> {
  const resolvedLocale = payload.locale ?? payload.lang;
  const bodyPayload: RequestOtpPayload = {
    email: payload.email,
    ...(resolvedLocale ? { locale: resolvedLocale, lang: resolvedLocale } : {}),
  };

  try {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });
    const data = (await res.json()) as Partial<RequestOtpResponse>;
    return {
      ok: Boolean(res.ok && data?.ok),
      cooldownSec: typeof data?.cooldownSec === 'number' ? data.cooldownSec : 60,
      expiresInSec: typeof data?.expiresInSec === 'number' ? data.expiresInSec : 600,
      delivery: data?.delivery === 'dev_preview' ? 'dev_preview' : 'resend',
      ...(typeof data?.devOtpCode === 'string' ? { devOtpCode: data.devOtpCode } : {}),
      ...(typeof data?.error === 'string' ? { error: data.error } : {}),
    };
  } catch {
    return {
      ok: false,
      cooldownSec: 0,
      expiresInSec: 0,
      delivery: 'resend',
      error: 'network_error',
    };
  }
}

export async function verifyEmailOtp(
  payload: VerifyOtpPayload
): Promise<VerifyOtpResponse> {
  const resolvedLocale = payload.locale ?? payload.lang;
  const fullPayload: VerifyOtpPayload = {
    email: payload.email,
    code: payload.code,
    guestId: payload.guestId ?? getOrCreateDeviceId(),
    localSnapshot: payload.localSnapshot ?? buildLocalSnapshot(),
    ...(resolvedLocale ? { locale: resolvedLocale, lang: resolvedLocale } : {}),
  };

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    });
    const data = (await res.json()) as Partial<VerifyOtpResponse>;
    if (res.ok && data?.ok && data?.authenticated && data.user) {
      if (!data.needsMergeChoice) {
        persistAuthCacheAndEmit(data.user);
      }
      return {
        ok: true,
        authenticated: true,
        user: data.user,
        ...(data.replaceLocal ? { replaceLocal: true } : {}),
        ...(data.resetDeviceId ? { resetDeviceId: true } : {}),
        ...(data.needsMergeChoice
          ? {
              needsMergeChoice: true,
              existingAccountSummary: data.existingAccountSummary,
              guestSummary: data.guestSummary,
            }
          : {}),
      };
    }
    return {
      ok: false,
      authenticated: false,
      user: null,
      error: typeof data?.error === 'string' ? data.error : 'verification_failed',
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      user: null,
      error: 'network_error',
    };
  }
}

export async function mergeGuestToUser(
  payload?: MergeGuestPayload
): Promise<MergeGuestResponse> {
  const fullPayload: MergeGuestPayload = {
    guestId: payload?.guestId ?? getOrCreateDeviceId(),
    localSnapshot: payload?.localSnapshot ?? buildLocalSnapshot(),
    ...(payload?.mode ? { mode: payload.mode } : {}),
  };

  try {
    const res = await fetch('/api/auth/merge-guest', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    });
    const data = (await res.json()) as Partial<MergeGuestResponse>;
    if (res.ok && data?.ok && data?.authenticated && data.user) {
      persistAuthCacheAndEmit(data.user);
      return {
        ok: true,
        authenticated: true,
        user: data.user,
      };
    }
    return {
      ok: false,
      authenticated: false,
      user: null,
      error: typeof data?.error === 'string' ? data.error : 'merge_failed',
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      user: null,
      error: 'network_error',
    };
  }
}

export function resetLocalStateForNewGuestSession(): {
  memory: UserMemoryState;
  deviceId: string;
} {
  if (typeof window === 'undefined') {
    return { memory: loadUserMemory(), deviceId: 'server' };
  }

  const prev = loadUserMemory();
  const preservedPrefs = {
    lang: prev.lang,
    appearance: prev.appearance,
    darkMode: prev.darkMode,
    themeCustomized: prev.themeCustomized,
    soundEnabled: prev.soundEnabled,
    notificationsEnabled: prev.notificationsEnabled,
    cookieAccepted: prev.cookieAccepted,
  };

  clearSavedFacts();
  clearLikedFacts();
  clearSeenSlugsStorage();
  clearVocabNotebook();
  clearScrollaPlayerId();

  const { deviceId: newDeviceId } = resetTelemetryClientState();
  const baseFresh = resetUserMemory();
  const fresh: UserMemoryState = {
    ...baseFresh,
    ...preservedPrefs,
    playerId: newDeviceId,
    nickname: getDefaultNickname(
      preservedPrefs.lang,
      deriveExplorerTagFromId(newDeviceId)
    ),
  };
  saveUserMemory(fresh);
  getOrCreateScrollaPlayerId(newDeviceId);
  persistAuthCacheAndEmit(null, { loggedOut: true, freshMemory: fresh });
  return { memory: fresh, deviceId: newDeviceId };
}

export async function logoutSession(): Promise<LogoutResponse> {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const ok = res.ok;
    return { ok, authenticated: false, user: null };
  } catch {
    return { ok: false, authenticated: false, user: null };
  } finally {
    resetLocalStateForNewGuestSession();
  }
}
