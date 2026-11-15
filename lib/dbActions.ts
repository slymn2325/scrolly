import type { CategoryFilter } from '@/i18n/translations';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import {
  generateRoomCode,
  getMemoryDuelMap,
  isShortRoomCode,
  normalizeDuelCategory,
  normalizeRoomCode,
  resolveEffectiveRoom,
  sanitizePlayerEmoji,
  sanitizePlayerName,
  type ScrollaPlayer,
  type ScrollaRoom,
  type ScrollaRoomStatus,
} from '@/lib/duelStore';
import type { CategoryId } from '@/types/fact';

export interface PersistedProfileDto {
  deviceId: string;
  username: string;
  handle: string;
  xp: number;
  weeklyXp: number;
  dailyBestScore: number;
  lastDailyQuizDate: string;
  streak: number;
  lastVisitDate: string;
  seenIds: string[];
  favoriteIds: string[];
  categoryWeights: Record<string, number>;
  categoryAccuracy: Record<string, { attempts: number; totalPct: number }>;
  badges: string[];
  updatedAt: string;
}

export interface ProfileUpsertInput {
  deviceId: string;
  username?: string;
  handle?: string;
  xp?: number;
  weeklyXp?: number;
  dailyBestScore?: number;
  lastDailyQuizDate?: string;
  streak?: number;
  lastVisitDate?: string;
  seenIds?: string[];
  favoriteIds?: string[];
  categoryWeights?: Record<string, number>;
  categoryAccuracy?: Record<string, { attempts: number; totalPct: number }>;
  badges?: string[];
  reset?: boolean;
}

export interface DbLeaderboardRow {
  deviceId: string;
  username: string;
  handle?: string;
  score: number;
  xp: number;
  weeklyXp: number;
  streak: number;
  updatedAt: string;
}

interface MemoryQuizSubmission {
  deviceId: string;
  username: string;
  mode: 'daily' | 'weekly' | 'memory' | 'duel';
  score: number;
  correctCount: number;
  totalQuestions: number;
  quizDate: string;
  createdAtMs: number;
}

const VALID_CATEGORY_IDS = new Set<CategoryId>([
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
]);

declare global {
  var __scrollyMemoryProfiles: Map<string, PersistedProfileDto> | undefined;
  var __scrollyMemoryQuizSubmissions: MemoryQuizSubmission[] | undefined;
  var __scrollyRecentSubmissions: Map<string, number> | undefined;
}

function getMemoryProfileMap(): Map<string, PersistedProfileDto> {
  if (!globalThis.__scrollyMemoryProfiles) {
    globalThis.__scrollyMemoryProfiles = new Map<string, PersistedProfileDto>();
  }
  return globalThis.__scrollyMemoryProfiles;
}

function getMemoryQuizSubmissions(): MemoryQuizSubmission[] {
  if (!globalThis.__scrollyMemoryQuizSubmissions) {
    globalThis.__scrollyMemoryQuizSubmissions = [];
  }
  return globalThis.__scrollyMemoryQuizSubmissions;
}

function isDuplicateRecentSubmission(dedupeKey: string, windowMs = 8_000): boolean {
  if (!globalThis.__scrollyRecentSubmissions) {
    globalThis.__scrollyRecentSubmissions = new Map<string, number>();
  }
  const map = globalThis.__scrollyRecentSubmissions;
  const now = Date.now();
  const prev = map.get(dedupeKey);
  if (typeof prev === 'number' && now - prev < windowMs) {
    return true;
  }
  if (map.size > 1000) {
    for (const [k, ts] of map.entries()) {
      if (now - ts >= windowMs) {
        map.delete(k);
      }
    }
  }
  map.set(dedupeKey, now);
  return false;
}

function sanitizeStringArray(arr: unknown, maxLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const clean = item.trim().slice(0, 140);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
        if (out.length >= maxLen) break;
      }
    }
  }
  return out;
}

function sanitizeNonNegInt(value: unknown, fallback = 0, max = 5_000_000): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.min(max, Math.floor(num));
}

function sanitizeUsername(raw: unknown): string {
  const clean = String(raw || '').trim().slice(0, 28);
  return clean || 'Merak Kâşifi';
}

function sanitizeHandle(raw: unknown): string {
  const clean = String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 28);
  return clean ? `@${clean.toLowerCase()}` : '';
}

function sanitizeCategoryKey(rawKey: string): CategoryId | null {
  const clean = rawKey.trim().toLowerCase();
  if (clean === 'weird_records') return 'records';
  if (clean === 'human-body') return 'human_body';
  if (clean === 'istatistik') return 'statistics';
  return VALID_CATEGORY_IDS.has(clean as CategoryId) ? (clean as CategoryId) : null;
}

function sanitizeCategoryWeights(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const cat = sanitizeCategoryKey(k);
    const num = Number(v);
    if (cat && Number.isFinite(num) && num > 0) {
      out[cat] = Math.min(10, Math.max(0.1, Number(num.toFixed(2))));
    }
  }
  return out;
}

function sanitizeCategoryAccuracy(
  raw: unknown
): Record<string, { attempts: number; totalPct: number }> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, { attempts: number; totalPct: number }> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const cat = sanitizeCategoryKey(k);
    if (!cat || !v || typeof v !== 'object') continue;
    const obj = v as { attempts?: unknown; totalPct?: unknown };
    out[cat] = {
      attempts: sanitizeNonNegInt(obj.attempts, 0, 50_000),
      totalPct: sanitizeNonNegInt(obj.totalPct, 0, 5_000_000),
    };
  }
  return out;
}

function sanitizeDateStr(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
}

function isDateNearUtc(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = Date.parse(`${dateStr}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(Date.now() - parsed) <= 42 * 60 * 60 * 1000;
}

function getDailyLookupDates(clientDate?: string): string[] {
  const now = new Date();
  const utcToday = now.toISOString().slice(0, 10);
  const dates = new Set<string>([utcToday]);
  // Eastern timezones (e.g. UTC+3 at 00:00-02:59 local) enter next calendar day before UTC midnight
  if (now.getUTCHours() >= 14) {
    dates.add(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  const cleanClient = sanitizeDateStr(clientDate);
  if (cleanClient && isDateNearUtc(cleanClient)) {
    dates.add(cleanClient);
  }
  return Array.from(dates);
}

export async function getFactGifUrlDb(slugOrId: string): Promise<string | null> {
  if (!hasDatabaseUrl() || !slugOrId) return null;
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{ gif_url: string | null }>(
      `SELECT gif_url
       FROM facts
       WHERE (slug = $1 OR sketch_type = $1)
         AND gif_url IS NOT NULL
         AND TRIM(gif_url) <> ''
       LIMIT 1`,
      [slugOrId.trim().slice(0, 160)]
    );
    const url = res.rows[0]?.gif_url?.trim() || '';
    return url.length > 0 ? url : null;
  } catch (err) {
    console.warn('[dbActions] getFactGifUrlDb skipped:', err);
    return null;
  }
}

export async function updateFactGifUrlDb(
  slugOrId: string,
  gifUrl: string,
  gifQuery?: string
): Promise<void> {
  if (!hasDatabaseUrl() || !slugOrId || !gifUrl) return;
  const cleanUrl = gifUrl.trim().slice(0, 500);
  if (!cleanUrl.startsWith('https://') || /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(cleanUrl)) {
    return;
  }
  const cleanQuery = gifQuery ? gifQuery.trim().slice(0, 120) : '';
  try {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `UPDATE facts
       SET gif_url = $2,
           gif_query = COALESCE(NULLIF($3, ''), gif_query)
       WHERE (slug = $1 OR sketch_type = $1)
         AND (gif_url IS NULL OR TRIM(gif_url) = '')`,
      [slugOrId.trim().slice(0, 160), cleanUrl, cleanQuery]
    );
  } catch (err) {
    console.warn('[dbActions] updateFactGifUrlDb skipped:', err);
  }
}

export async function updateFactGifQueryOnlyDb(
  slugOrId: string,
  gifQuery: string
): Promise<void> {
  if (!hasDatabaseUrl() || !slugOrId || !gifQuery) return;
  const cleanQuery = gifQuery.trim().slice(0, 120);
  if (!cleanQuery) return;
  try {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `UPDATE facts
       SET gif_query = $2
       WHERE (slug = $1 OR sketch_type = $1)
         AND (gif_query IS NULL OR TRIM(gif_query) = '')`,
      [slugOrId.trim().slice(0, 160), cleanQuery]
    );
  } catch (err) {
    console.warn('[dbActions] updateFactGifQueryOnlyDb skipped:', err);
  }
}

export async function getVocabularyGifUrlDb(
  idOrWord: string,
  fallbackWord?: string
): Promise<string | null> {
  if (!hasDatabaseUrl() || (!idOrWord && !fallbackWord)) return null;
  const primary = String(idOrWord || '').trim().slice(0, 160);
  const secondary = String(fallbackWord || idOrWord || '').trim().slice(0, 160);
  if (!primary && !secondary) return null;
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{ gif_url: string | null }>(
      `SELECT gif_url
       FROM vocabulary_cards
       WHERE (
         id = $1
         OR LOWER(word) = LOWER($1)
         OR ($2 <> '' AND LOWER(word) = LOWER($2))
       )
         AND gif_url IS NOT NULL
         AND TRIM(gif_url) <> ''
       LIMIT 1`,
      [primary || secondary, secondary]
    );
    const url = res.rows[0]?.gif_url?.trim() || '';
    return url.length > 0 ? url : null;
  } catch (err) {
    console.warn('[dbActions] getVocabularyGifUrlDb skipped:', err);
    return null;
  }
}

export async function updateVocabularyGifUrlDb(
  idOrWord: string,
  gifUrl: string,
  gifQuery = '',
  fallbackWord?: string
): Promise<void> {
  if (!hasDatabaseUrl() || (!idOrWord && !fallbackWord) || !gifUrl) return;
  const cleanUrl = gifUrl.trim().slice(0, 500);
  if (!cleanUrl.startsWith('https://') || /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(cleanUrl)) {
    return;
  }
  const primary = String(idOrWord || '').trim().slice(0, 160);
  const secondary = String(fallbackWord || idOrWord || '').trim().slice(0, 160);
  const cleanQuery = gifQuery ? gifQuery.trim().slice(0, 120) : '';
  try {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `UPDATE vocabulary_cards
       SET gif_url = $2,
           gif_query = COALESCE(NULLIF($3, ''), gif_query)
       WHERE (
         id = $1
         OR LOWER(word) = LOWER($1)
         OR ($4 <> '' AND LOWER(word) = LOWER($4))
       )
         AND (gif_url IS NULL OR TRIM(gif_url) = '')`,
      [primary || secondary, cleanUrl, cleanQuery, secondary]
    );
  } catch (err) {
    console.warn('[dbActions] updateVocabularyGifUrlDb skipped:', err);
  }
}

export async function updateVocabularyGifQueryOnlyDb(
  idOrWord: string,
  gifQuery: string,
  fallbackWord?: string
): Promise<void> {
  if (!hasDatabaseUrl() || (!idOrWord && !fallbackWord) || !gifQuery) return;
  const cleanQuery = gifQuery.trim().slice(0, 120);
  if (!cleanQuery) return;
  const primary = String(idOrWord || '').trim().slice(0, 160);
  const secondary = String(fallbackWord || idOrWord || '').trim().slice(0, 160);
  try {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `UPDATE vocabulary_cards
       SET gif_query = $2
       WHERE (
         id = $1
         OR LOWER(word) = LOWER($1)
         OR ($3 <> '' AND LOWER(word) = LOWER($3))
       )
         AND (gif_query IS NULL OR TRIM(gif_query) = '')`,
      [primary || secondary, cleanQuery, secondary]
    );
  } catch (err) {
    console.warn('[dbActions] updateVocabularyGifQueryOnlyDb skipped:', err);
  }
}

export async function getProfileByDeviceId(
  deviceId: string
): Promise<{ persisted: boolean; profile: PersistedProfileDto | null }> {
  const cleanId = String(deviceId || '').trim().slice(0, 128);
  if (!cleanId) {
    return { persisted: false, profile: null };
  }
  if (!hasDatabaseUrl()) {
    return {
      persisted: false,
      profile: getMemoryProfileMap().get(cleanId) ?? null,
    };
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<{
    device_id: string;
    username: string | null;
    handle: string | null;
    xp: number | null;
    weekly_xp: number | null;
    daily_best_score: number | null;
    last_daily_quiz_date: string | null;
    streak: number | null;
    last_visit_date: string | null;
    seen_ids: unknown;
    favorite_ids: unknown;
    category_weights: unknown;
    category_accuracy: unknown;
    badges: unknown;
    updated_at: Date | string | null;
  }>(
    `SELECT device_id, username, handle, xp, weekly_xp, daily_best_score,
            last_daily_quiz_date, streak, last_visit_date,
            seen_ids, favorite_ids, category_weights, category_accuracy, badges, updated_at
     FROM profiles
     WHERE device_id = $1`,
    [cleanId]
  );

  const row = res.rows[0];
  if (!row) {
    return { persisted: true, profile: null };
  }

  return {
    persisted: true,
    profile: {
      deviceId: row.device_id,
      username: sanitizeUsername(row.username),
      handle: sanitizeHandle(row.handle),
      xp: sanitizeNonNegInt(row.xp, 0),
      weeklyXp: sanitizeNonNegInt(row.weekly_xp, 0),
      dailyBestScore: sanitizeNonNegInt(row.daily_best_score, 0),
      lastDailyQuizDate: sanitizeDateStr(row.last_daily_quiz_date),
      streak: Math.max(1, sanitizeNonNegInt(row.streak, 1, 36500)),
      lastVisitDate: sanitizeDateStr(row.last_visit_date),
      seenIds: sanitizeStringArray(row.seen_ids, 500),
      favoriteIds: sanitizeStringArray(row.favorite_ids, 300),
      categoryWeights: sanitizeCategoryWeights(row.category_weights),
      categoryAccuracy: sanitizeCategoryAccuracy(row.category_accuracy),
      badges: sanitizeStringArray(row.badges, 40),
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at || new Date().toISOString()),
    },
  };
}

export async function upsertProfileState(
  input: ProfileUpsertInput
): Promise<{ persisted: boolean; profile: PersistedProfileDto | null }> {
  const cleanId = String(input.deviceId || '').trim().slice(0, 128);
  if (!cleanId) {
    return { persisted: false, profile: null };
  }

  const memOnly = !hasDatabaseUrl();
  const today = new Date().toISOString().slice(0, 10);

  if (input.reset) {
    const username = sanitizeUsername(input.username);
    const handle = sanitizeHandle(input.handle);
    const resetProfile: PersistedProfileDto = {
      deviceId: cleanId,
      username,
      handle,
      xp: 0,
      weeklyXp: 0,
      dailyBestScore: 0,
      lastDailyQuizDate: '',
      streak: 1,
      lastVisitDate: today,
      seenIds: [],
      favoriteIds: [],
      categoryWeights: {},
      categoryAccuracy: {},
      badges: [],
      updatedAt: new Date().toISOString(),
    };

    if (memOnly) {
      getMemoryProfileMap().set(cleanId, resetProfile);
      return { persisted: false, profile: resetProfile };
    }

    await ensureSchema();
    const pool = getPool();
    const res = await pool.query(
      `INSERT INTO profiles (
        device_id, username, handle, xp, weekly_xp, daily_best_score,
        last_daily_quiz_date, streak, last_visit_date, last_active_date,
        seen_ids, favorite_ids, category_weights, category_accuracy, badges, updated_at
      ) VALUES (
        $1, $2, $3, 0, 0, 0,
        '', 1, $4, CURRENT_DATE,
        '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, NOW()
      )
      ON CONFLICT (device_id) DO UPDATE SET
        username = EXCLUDED.username,
        handle = EXCLUDED.handle,
        xp = 0,
        weekly_xp = 0,
        daily_best_score = 0,
        last_daily_quiz_date = '',
        streak = 1,
        last_visit_date = EXCLUDED.last_visit_date,
        last_active_date = CURRENT_DATE,
        seen_ids = '[]'::jsonb,
        favorite_ids = '[]'::jsonb,
        category_weights = '{}'::jsonb,
        category_accuracy = '{}'::jsonb,
        badges = '[]'::jsonb,
        updated_at = NOW()
      RETURNING updated_at`,
      [cleanId, username, handle, today]
    );
    resetProfile.updatedAt =
      res.rows[0]?.updated_at instanceof Date
        ? res.rows[0].updated_at.toISOString()
        : resetProfile.updatedAt;
    return { persisted: true, profile: resetProfile };
  }

  // Fetch existing first to bound anomalous jumps and never lose newer scores/XP
  const currentRes = await getProfileByDeviceId(cleanId);
  const prev = currentRes.profile;

  const username =
    typeof input.username === 'string' && input.username.trim().length > 0
      ? sanitizeUsername(input.username)
      : prev?.username || 'Merak Kâşifi';

  const handle =
    typeof input.handle === 'string' && input.handle.trim().length > 0
      ? sanitizeHandle(input.handle)
      : prev?.handle || '';

  const prevXp = prev?.xp ?? 0;
  const reqXp =
    typeof input.xp === 'number' ? sanitizeNonNegInt(input.xp, prevXp) : prevXp;
  const boundedXp = Math.max(prevXp, Math.min(prevXp + 15_000, reqXp));

  const prevWeekly = prev?.weeklyXp ?? 0;
  const reqWeekly =
    typeof input.weeklyXp === 'number'
      ? sanitizeNonNegInt(input.weeklyXp, prevWeekly)
      : prevWeekly;
  const boundedWeekly = Math.max(prevWeekly, Math.min(prevWeekly + 15_000, reqWeekly));

  const prevQuizDate = sanitizeDateStr(prev?.lastDailyQuizDate);
  const rawIncomingDate = sanitizeDateStr(input.lastDailyQuizDate);
  const incomingQuizDate =
    rawIncomingDate && isDateNearUtc(rawIncomingDate) ? rawIncomingDate : '';

  const prevDailyBest = prev?.dailyBestScore ?? 0;
  const reqDaily =
    typeof input.dailyBestScore === 'number'
      ? sanitizeNonNegInt(input.dailyBestScore, prevDailyBest, 50000)
      : prevDailyBest;

  let nextDailyQuizDate = prevQuizDate;
  let finalDailyBest = prevDailyBest;
  if (incomingQuizDate) {
    if (!prevQuizDate || incomingQuizDate > prevQuizDate) {
      nextDailyQuizDate = incomingQuizDate;
      finalDailyBest = reqDaily;
    } else if (incomingQuizDate === prevQuizDate) {
      nextDailyQuizDate = prevQuizDate;
      finalDailyBest = Math.max(prevDailyBest, reqDaily);
    }
    // If incomingQuizDate < prevQuizDate, ignore stale client date & preserve newer dailyBestScore
  } else if (!prevQuizDate && reqDaily > 0) {
    nextDailyQuizDate = today;
    finalDailyBest = reqDaily;
  }

  const streak = Math.max(
    1,
    prev?.streak ?? 1,
    sanitizeNonNegInt(input.streak, prev?.streak ?? 1, 36500)
  );
  const rawVisit = sanitizeDateStr(input.lastVisitDate);
  const prevVisit = sanitizeDateStr(prev?.lastVisitDate);
  const lastVisitDate =
    rawVisit && rawVisit >= prevVisit ? rawVisit : prevVisit || today;

  const mergedSeen = sanitizeStringArray(
    [...(prev?.seenIds ?? []), ...(input.seenIds ?? [])],
    500
  );
  const finalFavorites = Array.isArray(input.favoriteIds)
    ? sanitizeStringArray(input.favoriteIds, 300)
    : (prev?.favoriteIds ?? []);
  const finalWeights =
    input.categoryWeights && typeof input.categoryWeights === 'object'
      ? sanitizeCategoryWeights(input.categoryWeights)
      : (prev?.categoryWeights ?? {});
  const finalAccuracy =
    input.categoryAccuracy && typeof input.categoryAccuracy === 'object'
      ? sanitizeCategoryAccuracy(input.categoryAccuracy)
      : (prev?.categoryAccuracy ?? {});
  const mergedBadges = sanitizeStringArray(
    [...(prev?.badges ?? []), ...(input.badges ?? [])],
    40
  );

  const nextProfile: PersistedProfileDto = {
    deviceId: cleanId,
    username,
    handle,
    xp: boundedXp,
    weeklyXp: boundedWeekly,
    dailyBestScore: finalDailyBest,
    lastDailyQuizDate: nextDailyQuizDate,
    streak,
    lastVisitDate,
    seenIds: mergedSeen,
    favoriteIds: finalFavorites,
    categoryWeights: finalWeights,
    categoryAccuracy: finalAccuracy,
    badges: mergedBadges,
    updatedAt: new Date().toISOString(),
  };

  if (memOnly) {
    getMemoryProfileMap().set(cleanId, nextProfile);
    return { persisted: false, profile: nextProfile };
  }

  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO profiles (
      device_id, username, handle, xp, weekly_xp, daily_best_score,
      last_daily_quiz_date, streak, last_visit_date, last_active_date,
      seen_ids, favorite_ids, category_weights, category_accuracy, badges, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, CURRENT_DATE,
      $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, NOW()
    )
    ON CONFLICT (device_id) DO UPDATE SET
      username = EXCLUDED.username,
      handle = CASE WHEN TRIM(EXCLUDED.handle) <> '' THEN EXCLUDED.handle ELSE COALESCE(profiles.handle, '') END,
      xp = GREATEST(COALESCE(profiles.xp, 0), EXCLUDED.xp),
      weekly_xp = GREATEST(COALESCE(profiles.weekly_xp, 0), EXCLUDED.weekly_xp),
      daily_best_score = CASE
        WHEN EXCLUDED.last_daily_quiz_date > COALESCE(profiles.last_daily_quiz_date, '')
          THEN EXCLUDED.daily_best_score
        WHEN EXCLUDED.last_daily_quiz_date = COALESCE(profiles.last_daily_quiz_date, '')
          THEN GREATEST(COALESCE(profiles.daily_best_score, 0), EXCLUDED.daily_best_score)
        ELSE COALESCE(profiles.daily_best_score, 0)
      END,
      last_daily_quiz_date = GREATEST(
        COALESCE(profiles.last_daily_quiz_date, ''),
        EXCLUDED.last_daily_quiz_date
      ),
      streak = GREATEST(COALESCE(profiles.streak, 1), EXCLUDED.streak),
      last_visit_date = GREATEST(COALESCE(profiles.last_visit_date, ''), EXCLUDED.last_visit_date),
      last_active_date = CURRENT_DATE,
      seen_ids = EXCLUDED.seen_ids,
      favorite_ids = EXCLUDED.favorite_ids,
      category_weights = EXCLUDED.category_weights,
      category_accuracy = EXCLUDED.category_accuracy,
      badges = EXCLUDED.badges,
      updated_at = NOW()`,
    [
      cleanId,
      username,
      handle,
      boundedXp,
      boundedWeekly,
      finalDailyBest,
      nextDailyQuizDate,
      streak,
      lastVisitDate,
      JSON.stringify(mergedSeen),
      JSON.stringify(finalFavorites),
      JSON.stringify(finalWeights),
      JSON.stringify(finalAccuracy),
      JSON.stringify(mergedBadges),
    ]
  );

  return { persisted: true, profile: nextProfile };
}

const GENERIC_EXPLORER_EXACT_KEYS = new Set([
  '',
  'kasif',
  'merak kasifi',
  'curiosity explorer',
  'explorer',
  'scrolla explorer',
  'player',
  'anonim',
  'anonymous',
]);

const GENERIC_42_KEY_PATTERN =
  /^(?:merak\s+kasifi|curiosity\s+explorer|kasif|explorer)\s*#?\s*42$/i;

function normalizeLeaderboardNameKey(name: string): string {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0131/g, 'i')
    .replace(/\s+/g, ' ');
}

function deriveDeterministicExplorerTag(deviceId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < deviceId.length; i += 1) {
    hash ^= deviceId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return 100 + (unsigned % 9899);
}

/**
 * Normalizes legacy `#42` / generic explorer defaults and deduplicates any colliding
 * nicknames across distinct devices while preserving custom higher-ranked names.
 */
export function deduplicateLeaderboardRows(rows: DbLeaderboardRow[]): DbLeaderboardRow[] {
  const seenDeviceIds = new Set<string>();
  const usedNameKeys = new Set<string>();
  const out: DbLeaderboardRow[] = [];

  for (const row of rows) {
    const cleanDeviceId = String(row.deviceId || '').trim();
    if (!cleanDeviceId || seenDeviceIds.has(cleanDeviceId)) {
      continue;
    }
    seenDeviceIds.add(cleanDeviceId);

    const rawName = String(row.username || '').trim().slice(0, 28);
    const rawKey = normalizeLeaderboardNameKey(rawName);
    const baseTag = deriveDeterministicExplorerTag(cleanDeviceId);
    const isGeneric =
      GENERIC_EXPLORER_EXACT_KEYS.has(rawKey) || GENERIC_42_KEY_PATTERN.test(rawKey);
    const isEnglishDefault = /\b(curiosity|explorer|player|anonymous)\b/i.test(rawKey);

    let finalName = rawName;
    let finalHandle = row.handle ? sanitizeHandle(row.handle) : '';

    if (isGeneric) {
      const baseLabel = isEnglishDefault ? 'Curiosity Explorer' : 'Merak Kaşifi';
      let tag = baseTag;
      let candidate = `${baseLabel} #${tag}`;
      while (usedNameKeys.has(normalizeLeaderboardNameKey(candidate))) {
        tag = 100 + ((tag - 100 + 1) % 9899);
        candidate = `${baseLabel} #${tag}`;
      }
      finalName = candidate;
      if (!finalHandle || /^@?(?:kasif|explorer)42$/i.test(finalHandle)) {
        finalHandle = `@${isEnglishDefault ? 'explorer' : 'kasif'}${tag}`;
      }
    } else if (usedNameKeys.has(rawKey)) {
      const strippedBase = rawName.replace(/\s*#\d+\s*$/, '').trim().slice(0, 20) || 'Kaşif';
      let tag = baseTag;
      let candidate = `${strippedBase} #${tag}`;
      while (usedNameKeys.has(normalizeLeaderboardNameKey(candidate))) {
        tag = 100 + ((tag - 100 + 1) % 9899);
        candidate = `${strippedBase} #${tag}`;
      }
      finalName = candidate;
      if (!finalHandle) {
        finalHandle = sanitizeHandle(`${strippedBase}${tag}`);
      }
    }

    usedNameKeys.add(normalizeLeaderboardNameKey(finalName));

    out.push({
      ...row,
      deviceId: cleanDeviceId,
      username: finalName,
      handle: finalHandle || undefined,
    });
  }

  return out;
}

export async function getLeaderboardRows(
  tab: 'daily' | 'weekly' | 'alltime',
  limit = 50,
  clientDate?: string
): Promise<{ source: 'postgres' | 'local'; rows: DbLeaderboardRow[] }> {
  const safeLimit = Math.min(100, Math.max(5, limit));
  const dailyDates = getDailyLookupDates(clientDate);

  if (!hasDatabaseUrl()) {
    const profiles = Array.from(getMemoryProfileMap().values());
    const submissions = getMemoryQuizSubmissions();
    const dailyMaxByDevice = new Map<string, number>();
    const activeDateSet = new Set(dailyDates);

    for (const sub of submissions) {
      if (activeDateSet.has(sub.quizDate)) {
        const cur = dailyMaxByDevice.get(sub.deviceId) ?? 0;
        if (sub.score > cur) dailyMaxByDevice.set(sub.deviceId, sub.score);
      }
    }

    const rows: DbLeaderboardRow[] = profiles
      .filter((p) => p.username.trim().length > 0 || p.xp > 0 || p.weeklyXp > 0)
      .map((p) => {
        const dailyProfileScore = activeDateSet.has(p.lastDailyQuizDate)
          ? p.dailyBestScore
          : 0;
        const dailySubScore = dailyMaxByDevice.get(p.deviceId) ?? 0;
        const score =
          tab === 'daily'
            ? Math.max(dailyProfileScore, dailySubScore)
            : tab === 'weekly'
              ? p.weeklyXp > 0
                ? p.weeklyXp
                : p.xp
              : p.xp;
        return {
          deviceId: p.deviceId,
          username: p.username,
          handle: p.handle || undefined,
          score,
          xp: p.xp,
          weeklyXp: p.weeklyXp,
          streak: p.streak,
          updatedAt: p.updatedAt,
        };
      })
      .sort((a, b) => b.score - a.score || b.xp - a.xp || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, safeLimit);

    return { source: 'local', rows: deduplicateLeaderboardRows(rows) };
  }

  await ensureSchema();
  const pool = getPool();

  if (tab === 'daily') {
    const res = await pool.query<{
      device_id: string;
      username: string | null;
      handle: string | null;
      score: number;
      xp: number;
      weekly_xp: number;
      streak: number;
      updated_at: Date | string;
    }>(
      `SELECT
         p.device_id,
         COALESCE(NULLIF(TRIM(p.username), ''), 'Kâşif') AS username,
         COALESCE(p.handle, '') AS handle,
         GREATEST(
           CASE WHEN p.last_daily_quiz_date = ANY($1::text[]) THEN COALESCE(p.daily_best_score, 0) ELSE 0 END,
           COALESCE(qs.max_score, 0)
         )::INT AS score,
         COALESCE(p.xp, 0)::INT AS xp,
         COALESCE(p.weekly_xp, 0)::INT AS weekly_xp,
         COALESCE(p.streak, 1)::INT AS streak,
         p.updated_at
       FROM profiles p
       LEFT JOIN (
         SELECT device_id, MAX(score)::INT AS max_score
         FROM quiz_submissions
         WHERE quiz_date = ANY($1::text[])
         GROUP BY device_id
       ) qs ON qs.device_id = p.device_id
       WHERE NULLIF(TRIM(p.username), '') IS NOT NULL
          OR (p.last_daily_quiz_date = ANY($1::text[]) AND COALESCE(p.daily_best_score, 0) > 0)
          OR COALESCE(qs.max_score, 0) > 0
          OR COALESCE(p.xp, 0) > 0
       ORDER BY score DESC, p.xp DESC, p.updated_at DESC
       LIMIT $2`,
      [dailyDates, safeLimit]
    );

    const mapped = res.rows.map((r) => ({
      deviceId: r.device_id,
      username: sanitizeUsername(r.username),
      handle: sanitizeHandle(r.handle) || undefined,
      score: r.score,
      xp: r.xp,
      weeklyXp: r.weekly_xp,
      streak: r.streak,
      updatedAt:
        r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    }));

    return {
      source: 'postgres',
      rows: deduplicateLeaderboardRows(mapped),
    };
  }

  const orderColumn =
    tab === 'weekly'
      ? 'CASE WHEN COALESCE(weekly_xp, 0) > 0 THEN COALESCE(weekly_xp, 0) ELSE COALESCE(xp, 0) END'
      : 'COALESCE(xp, 0)';
  const res = await pool.query<{
    device_id: string;
    username: string | null;
    handle: string | null;
    xp: number;
    weekly_xp: number;
    streak: number;
    updated_at: Date | string;
  }>(
    `SELECT
       device_id,
       COALESCE(NULLIF(TRIM(username), ''), 'Kâşif') AS username,
       COALESCE(handle, '') AS handle,
       COALESCE(xp, 0)::INT AS xp,
       COALESCE(weekly_xp, 0)::INT AS weekly_xp,
       COALESCE(streak, 1)::INT AS streak,
       updated_at
     FROM profiles
     WHERE NULLIF(TRIM(username), '') IS NOT NULL OR COALESCE(xp, 0) > 0 OR COALESCE(weekly_xp, 0) > 0
     ORDER BY ${orderColumn} DESC, COALESCE(xp, 0) DESC, COALESCE(streak, 0) DESC, updated_at DESC
     LIMIT $1`,
    [safeLimit]
  );

  const mapped = res.rows.map((r) => ({
    deviceId: r.device_id,
    username: sanitizeUsername(r.username),
    handle: sanitizeHandle(r.handle) || undefined,
    score: tab === 'weekly' ? (r.weekly_xp > 0 ? r.weekly_xp : r.xp) : r.xp,
    xp: r.xp,
    weeklyXp: r.weekly_xp,
    streak: r.streak,
    updatedAt:
      r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }));

  return {
    source: 'postgres',
    rows: deduplicateLeaderboardRows(mapped),
  };
}

export async function recordQuizSubmission(input: {
  deviceId: string;
  username: string;
  handle?: string;
  mode: 'daily' | 'weekly' | 'memory' | 'duel';
  score: number;
  correctCount: number;
  totalQuestions: number;
  clientDate?: string;
}): Promise<{ persisted: boolean }> {
  const cleanId = String(input.deviceId || '').trim().slice(0, 128);
  if (!cleanId) {
    return { persisted: false };
  }

  const username = sanitizeUsername(input.username);
  const handle = sanitizeHandle(input.handle);
  const safeScore = sanitizeNonNegInt(input.score, 0, 5000);
  const safeCorrect = sanitizeNonNegInt(input.correctCount, 0, 100);
  const safeTotal = sanitizeNonNegInt(input.totalQuestions, 1, 100);
  const cleanClientDate = sanitizeDateStr(input.clientDate);
  const quizDate =
    cleanClientDate && isDateNearUtc(cleanClientDate)
      ? cleanClientDate
      : new Date().toISOString().slice(0, 10);

  const dedupeKey = `${cleanId}:${input.mode}:${safeScore}:${safeCorrect}`;
  if (isDuplicateRecentSubmission(dedupeKey)) {
    return { persisted: hasDatabaseUrl() };
  }

  if (!hasDatabaseUrl()) {
    const subs = getMemoryQuizSubmissions();
    subs.push({
      deviceId: cleanId,
      username,
      mode: input.mode,
      score: safeScore,
      correctCount: safeCorrect,
      totalQuestions: safeTotal,
      quizDate,
      createdAtMs: Date.now(),
    });
    if (subs.length > 500) subs.splice(0, subs.length - 500);

    const map = getMemoryProfileMap();
    const prev = map.get(cleanId);
    const nowIso = new Date().toISOString();
    const nextDailyBest =
      input.mode === 'daily'
        ? prev && prev.lastDailyQuizDate === quizDate
          ? Math.max(prev.dailyBestScore, safeScore)
          : safeScore
        : prev?.dailyBestScore ?? 0;
    const nextDailyDate =
      input.mode === 'daily' ? quizDate : prev?.lastDailyQuizDate ?? '';

    map.set(cleanId, {
      deviceId: cleanId,
      username,
      handle: handle || prev?.handle || '',
      xp: (prev?.xp ?? 0) + safeScore,
      weeklyXp: (prev?.weeklyXp ?? 0) + safeScore,
      dailyBestScore: nextDailyBest,
      lastDailyQuizDate: nextDailyDate,
      streak: prev?.streak ?? 1,
      lastVisitDate: prev?.lastVisitDate || quizDate,
      seenIds: prev?.seenIds ?? [],
      favoriteIds: prev?.favoriteIds ?? [],
      categoryWeights: prev?.categoryWeights ?? {},
      categoryAccuracy: prev?.categoryAccuracy ?? {},
      badges: prev?.badges ?? [],
      updatedAt: nowIso,
    });
    return { persisted: false };
  }

  await ensureSchema();
  const pool = getPool();

  await pool.query(
    `INSERT INTO quiz_submissions (device_id, username, mode, score, correct_count, total_questions, quiz_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [cleanId, username, input.mode, safeScore, safeCorrect, safeTotal, quizDate]
  );

  await pool.query(
    `INSERT INTO profiles (
      device_id, username, handle, xp, weekly_xp, daily_best_score, last_daily_quiz_date, last_visit_date, last_active_date, streak, updated_at
    ) VALUES (
      $1, $2, $3, $4, $4, $5, $6, $7, CURRENT_DATE, 1, NOW()
    )
    ON CONFLICT (device_id) DO UPDATE SET
      username = EXCLUDED.username,
      handle = CASE WHEN TRIM(EXCLUDED.handle) <> '' THEN EXCLUDED.handle ELSE COALESCE(profiles.handle, '') END,
      xp = COALESCE(profiles.xp, 0) + $4,
      weekly_xp = COALESCE(profiles.weekly_xp, 0) + $4,
      daily_best_score = CASE
        WHEN $8 = 'daily' AND COALESCE(profiles.last_daily_quiz_date, '') = $7
          THEN GREATEST(COALESCE(profiles.daily_best_score, 0), $5)
        WHEN $8 = 'daily' AND COALESCE(profiles.last_daily_quiz_date, '') < $7
          THEN $5
        ELSE COALESCE(profiles.daily_best_score, 0)
      END,
      last_daily_quiz_date = CASE
        WHEN $8 = 'daily' THEN GREATEST(COALESCE(profiles.last_daily_quiz_date, ''), $7)
        ELSE COALESCE(profiles.last_daily_quiz_date, '')
      END,
      last_active_date = CURRENT_DATE,
      updated_at = NOW()`,
    [
      cleanId,
      username,
      handle,
      safeScore,
      input.mode === 'daily' ? safeScore : 0,
      input.mode === 'daily' ? quizDate : '',
      quizDate,
      input.mode,
    ]
  );

  return { persisted: true };
}

// =========================================================================
// Scrolla (1v1 Duel) Authoritative Server Room Store
// =========================================================================

function mapDbRoomRow(row: {
  code: string;
  mode: string;
  category: string;
  question_count: number;
  card_ids: unknown;
  host_id: string;
  players: unknown;
  kicked_ids: unknown;
  status: string;
  starts_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}): ScrollaRoom {
  return {
    code: normalizeRoomCode(row.code),
    mode: 'duel',
    category: normalizeDuelCategory(row.category),
    questionCount: Number(row.question_count || 5),
    cardIds: Array.isArray(row.card_ids) ? (row.card_ids as string[]) : [],
    hostId: String(row.host_id),
    players: Array.isArray(row.players) ? (row.players as ScrollaPlayer[]) : [],
    kickedIds: Array.isArray(row.kicked_ids) ? (row.kicked_ids as string[]) : [],
    status: (row.status || 'lobby') as ScrollaRoomStatus,
    startsAt:
      row.starts_at instanceof Date
        ? row.starts_at.toISOString()
        : row.starts_at
          ? String(row.starts_at)
          : null,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function createDuelRoomDb(params: {
  hostId: string;
  hostName: string;
  hostEmoji?: string;
  category: CategoryFilter;
  questionCount: number;
  cardIds: string[];
}): Promise<{ room: ScrollaRoom; serverNow: string }> {
  const hostId = params.hostId.trim().slice(0, 128);
  const hostName = sanitizePlayerName(params.hostName);
  const hostEmoji = sanitizePlayerEmoji(params.hostEmoji);

  if (!hasDatabaseUrl()) {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const map = getMemoryDuelMap();
    const cutoff = nowMs - 6 * 60 * 60 * 1000;
    for (const [existingCode, existingRoom] of map.entries()) {
      const updatedMs = Date.parse(existingRoom.updatedAt || existingRoom.createdAt);
      if (Number.isFinite(updatedMs) && updatedMs < cutoff) {
        map.delete(existingCode);
      }
    }

    let code = generateRoomCode(6);
    while (map.has(code)) {
      code = generateRoomCode(6);
    }
    const hostPlayer: ScrollaPlayer = {
      id: hostId,
      name: hostName,
      emoji: hostEmoji,
      ready: false,
      score: null,
      finishedAt: null,
      joinedAt: nowIso,
    };
    const room: ScrollaRoom = {
      code,
      mode: 'duel',
      category: params.category,
      questionCount: params.questionCount,
      cardIds: params.cardIds,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      kickedIds: [],
      status: 'lobby',
      startsAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    map.set(code, room);
    return { room, serverNow: nowIso };
  }

  await ensureSchema();
  const pool = getPool();

  // Opportunistic prune of expired rooms (> 6 hours old)
  await pool.query(`DELETE FROM duel_rooms WHERE updated_at < NOW() - INTERVAL '6 hours'`);

  const nowPlaceholder = new Date().toISOString();
  const hostPlayer: ScrollaPlayer = {
    id: hostId,
    name: hostName,
    emoji: hostEmoji,
    ready: false,
    score: null,
    finishedAt: null,
    joinedAt: nowPlaceholder,
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode(6);
    const res = await pool.query(
      `INSERT INTO duel_rooms (
        code, mode, category, question_count, card_ids, host_id, players, kicked_ids, status, starts_at, created_at, updated_at
      ) VALUES (
        $1, 'duel', $2, $3, $4::jsonb, $5, $6::jsonb, '[]'::jsonb, 'lobby', NULL, NOW(), NOW()
      )
      ON CONFLICT (code) DO NOTHING
      RETURNING *, NOW() AS db_now`,
      [
        code,
        params.category,
        params.questionCount,
        JSON.stringify(params.cardIds),
        hostPlayer.id,
        JSON.stringify([hostPlayer]),
      ]
    );
    const row = res.rows[0];
    if (row) {
      const dbNowDate = row.db_now instanceof Date ? row.db_now : new Date();
      return {
        room: mapDbRoomRow(row),
        serverNow: dbNowDate.toISOString(),
      };
    }
  }

  throw new Error('Could not allocate unique Scrolla room code.');
}

export async function getDuelRoomDb(
  rawCode: string
): Promise<{ room: ScrollaRoom; serverNow: string } | null> {
  if (!isShortRoomCode(rawCode)) return null;
  const code = normalizeRoomCode(rawCode);

  if (!hasDatabaseUrl()) {
    const nowMs = Date.now();
    const room = getMemoryDuelMap().get(code);
    if (!room) return null;
    return {
      room: resolveEffectiveRoom(room, nowMs),
      serverNow: new Date(nowMs).toISOString(),
    };
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query(
    `SELECT *, NOW() AS db_now FROM duel_rooms WHERE code = $1`,
    [code]
  );
  const row = res.rows[0];
  if (!row) return null;
  const dbNowDate = row.db_now instanceof Date ? row.db_now : new Date();
  return {
    room: resolveEffectiveRoom(mapDbRoomRow(row), dbNowDate.getTime()),
    serverNow: dbNowDate.toISOString(),
  };
}

export async function mutateDuelRoomDb(
  rawCode: string,
  mutator: (room: ScrollaRoom, nowIso: string) => { next: ScrollaRoom; errorStatus?: number; errorCode?: string }
): Promise<{ ok: boolean; room?: ScrollaRoom; serverNow: string; status: number; error?: string }> {
  const fallbackNow = new Date().toISOString();
  if (!isShortRoomCode(rawCode)) {
    return { ok: false, status: 400, error: 'invalid_code', serverNow: fallbackNow };
  }
  const code = normalizeRoomCode(rawCode);

  if (!hasDatabaseUrl()) {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const map = getMemoryDuelMap();
    const existing = map.get(code);
    if (!existing) {
      return { ok: false, status: 404, error: 'room_not_found', serverNow: nowIso };
    }
    const effective = resolveEffectiveRoom(existing, nowMs);
    const outcome = mutator(structuredClone(effective), nowIso);
    if (outcome.errorCode) {
      return {
        ok: false,
        status: outcome.errorStatus || 400,
        error: outcome.errorCode,
        room: effective,
        serverNow: nowIso,
      };
    }
    const updated = { ...outcome.next, updatedAt: nowIso };
    if (updated.players.length === 0) {
      map.delete(code);
    } else {
      map.set(code, updated);
    }
    return { ok: true, status: 200, room: updated, serverNow: nowIso };
  }

  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const selectRes = await client.query(
      `SELECT *, NOW() AS db_now FROM duel_rooms WHERE code = $1 FOR UPDATE`,
      [code]
    );
    const row = selectRes.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return { ok: false, status: 404, error: 'room_not_found', serverNow: new Date().toISOString() };
    }

    const nowDate = row.db_now instanceof Date ? row.db_now : new Date();
    const nowIso = nowDate.toISOString();
    const effective = resolveEffectiveRoom(mapDbRoomRow(row), nowDate.getTime());
    const outcome = mutator(structuredClone(effective), nowIso);

    if (outcome.errorCode) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        status: outcome.errorStatus || 400,
        error: outcome.errorCode,
        room: effective,
        serverNow: nowIso,
      };
    }

    const next = { ...outcome.next, updatedAt: nowIso };
    if (next.players.length === 0) {
      await client.query(`DELETE FROM duel_rooms WHERE code = $1`, [code]);
    } else {
      await client.query(
        `UPDATE duel_rooms
         SET host_id = $2,
             players = $3::jsonb,
             kicked_ids = $4::jsonb,
             status = $5,
             starts_at = $6,
             updated_at = NOW()
         WHERE code = $1`,
        [
          code,
          next.hostId,
          JSON.stringify(next.players),
          JSON.stringify(next.kickedIds),
          next.status,
          next.startsAt,
        ]
      );
    }
    await client.query('COMMIT');
    return { ok: true, status: 200, room: next, serverNow: nowIso };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export type { CategoryId };
