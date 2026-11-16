import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import type { Language } from '@/i18n/translations';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import {
  getMemoryProfileMap,
  getProfileByDeviceId,
  isValidDeviceId,
  sanitizeCategoryAccuracy,
  sanitizeCategoryWeights,
  sanitizeDateStr,
  sanitizeNonNegInt,
  sanitizeStringArray,
  sanitizeVocabNotebook,
} from '@/lib/dbActions';
import { isDisposableEmailDomain } from '@/lib/disposableDomains';
import { sendOtpEmail } from '@/lib/mailer';
import type { AuthUserDto, LocalMemorySnapshot } from '@/types/auth';
import type { SavedVocabularyEntry } from '@/types/vocabulary';

export const SESSION_COOKIE_NAME = 'scrolly_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const OTP_TTL_SECONDS = 600; // 10 minutes
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_HOURLY_EMAIL_LIMIT = 5;
export const OTP_HOURLY_IP_LIMIT = 12;
export const OTP_MAX_ATTEMPTS = 5;

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const GENERIC_NICKNAME_PATTERN =
  /^(?:merak\s+k[aâ]şifi|meraklı\s+k[aâ]şif|curiosity\s+explorer|k[aâ]şif|explorer)(?:\s*#\s*\d+)?$/i;

type MemoryUserRecord = AuthUserDto;

interface MemorySessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAtMs: number;
  lastSeenAtMs: number;
  createdAtMs: number;
}

interface MemoryOtpRecord {
  id: string;
  email: string;
  codeHash: string;
  expiresAtMs: number;
  attempts: number;
  consumedAtMs: number | null;
  ipHash: string;
  createdAtMs: number;
}

declare global {
  var __scrollyMemoryUsersById: Map<string, MemoryUserRecord> | undefined;
  var __scrollyMemoryUserIdByEmail: Map<string, string> | undefined;
  var __scrollyMemorySessionsByHash: Map<string, MemorySessionRecord> | undefined;
  var __scrollyMemoryOtps: MemoryOtpRecord[] | undefined;
}

function getMemoryUsersById(): Map<string, MemoryUserRecord> {
  if (!globalThis.__scrollyMemoryUsersById) {
    globalThis.__scrollyMemoryUsersById = new Map<string, MemoryUserRecord>();
  }
  return globalThis.__scrollyMemoryUsersById;
}

function getMemoryUserIdByEmail(): Map<string, string> {
  if (!globalThis.__scrollyMemoryUserIdByEmail) {
    globalThis.__scrollyMemoryUserIdByEmail = new Map<string, string>();
  }
  return globalThis.__scrollyMemoryUserIdByEmail;
}

function getMemorySessionsByHash(): Map<string, MemorySessionRecord> {
  if (!globalThis.__scrollyMemorySessionsByHash) {
    globalThis.__scrollyMemorySessionsByHash = new Map<string, MemorySessionRecord>();
  }
  return globalThis.__scrollyMemorySessionsByHash;
}

function getMemoryOtps(): MemoryOtpRecord[] {
  if (!globalThis.__scrollyMemoryOtps) {
    globalThis.__scrollyMemoryOtps = [];
  }
  return globalThis.__scrollyMemoryOtps;
}

function getOtpPepper(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || '';
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET (or SESSION_SECRET) must be set in production — refusing insecure OTP/session pepper.'
    );
  }
  return 'scrolly-dev-otp-pepper';
}

/**
 * Normalize for display / OTP targeting (lowercase trim).
 */
export function normalizeEmail(raw: unknown): string {
  return String(raw || '').trim().toLowerCase();
}

/**
 * Canonical identity key: Gmail/Googlemail +tag and dot stripping so
 * a.b+tag@gmail.com === ab@gmail.com.
 */
export function canonicalizeEmail(raw: unknown): string {
  const normalized = normalizeEmail(raw);
  if (!normalized.includes('@')) return normalized;
  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw === 'googlemail.com' ? 'gmail.com' : domainRaw;
  let local = localRaw.split('+')[0] || localRaw;
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '');
  }
  return `${local}@${domain}`;
}

function signSessionToken(rawToken: string): string {
  const sig = createHmac('sha256', getOtpPepper())
    .update(`session-cookie:${rawToken}`)
    .digest('base64url');
  return `${rawToken}.${sig}`;
}

function unsignSessionToken(cookieValue: string): string | null {
  const raw = String(cookieValue || '').trim();
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const token = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!token || !sig) return null;
  const expected = createHmac('sha256', getOtpPepper())
    .update(`session-cookie:${token}`)
    .digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return token;
}

export function isValidEmailFormat(email: string): boolean {
  return email.length >= 5 && email.length <= 254 && EMAIL_FORMAT_REGEX.test(email);
}

function hashOtpCode(email: string, code: string): string {
  return createHash('sha256')
    .update(`${getOtpPepper()}:otp:${email}:${code}`)
    .digest('hex');
}

function hashSessionToken(rawToken: string): string {
  return createHash('sha256')
    .update(`${getOtpPepper()}:session:${rawToken}`)
    .digest('hex');
}

function hashClientIp(ip: string): string {
  return createHash('sha256')
    .update(`${getOtpPepper()}:ip:${ip || 'unknown'}`)
    .digest('hex');
}

function timingSafeHexMatch(expectedHex: string, actualHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(actualHex, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function shouldUseSecureCookie(request?: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  if (!request) return true;
  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto === 'https') return true;
  if (forwardedProto === 'http') return false;
  try {
    const parsed = new URL(request.url);
    if (parsed.protocol === 'https:') return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return false;
    }
  } catch {
    // Fallback to secure in production
  }
  return true;
}

export function readSessionCookieFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  const prefix = `${SESSION_COOKIE_NAME}=`;
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      let raw = trimmed.slice(prefix.length).trim();
      if (!raw) return null;
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // keep raw
      }
      // Prefer HMAC-signed cookies; accept unsigned only outside production for migration.
      const unsigned = unsignSessionToken(raw);
      if (unsigned) return unsigned;
      if (process.env.NODE_ENV !== 'production' && !raw.includes('.')) {
        return raw;
      }
      return null;
    }
  }
  return null;
}

/** Build the HttpOnly cookie value (HMAC-signed opaque token). */
export function buildSignedSessionCookieValue(rawToken: string): string {
  return signSessionToken(rawToken);
}

function isGenericNickname(name: string): boolean {
  const clean = name.trim();
  if (!clean) return true;
  return GENERIC_NICKNAME_PATTERN.test(clean);
}

function pickPreferredNickname(...candidates: Array<string | undefined | null>): string {
  const cleaned = candidates
    .map((c) => (typeof c === 'string' ? c.trim().slice(0, 28) : ''))
    .filter(Boolean);
  const custom = cleaned.find((c) => !isGenericNickname(c));
  if (custom) return custom;
  return cleaned[0] || '';
}

function normalizeBadgeList(raw: unknown): string[] {
  const items = sanitizeStringArray(raw, 60).map((b) =>
    b === 'weird_records' ? 'records' : b
  );
  return Array.from(new Set(items));
}

function mergeCategoryWeights(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const rawMap of maps) {
    const clean = sanitizeCategoryWeights(rawMap);
    for (const [k, v] of Object.entries(clean)) {
      merged[k] = Math.max(merged[k] ?? 0, v);
    }
  }
  return merged;
}

function mergeCategoryAccuracy(
  ...maps: Array<Record<string, { attempts: number; totalPct: number }> | undefined>
): Record<string, { attempts: number; totalPct: number }> {
  const merged: Record<string, { attempts: number; totalPct: number }> = {};
  for (const rawMap of maps) {
    const clean = sanitizeCategoryAccuracy(rawMap);
    for (const [k, v] of Object.entries(clean)) {
      const existing = merged[k];
      if (
        !existing ||
        v.attempts > existing.attempts ||
        (v.attempts === existing.attempts && v.totalPct > existing.totalPct)
      ) {
        merged[k] = v;
      }
    }
  }
  return merged;
}

function resolveMergedDailyBest(
  candidates: Array<{ date: string; score: number }>
): { lastDailyQuizDate: string; dailyBestScore: number } {
  let bestDate = '';
  let bestScore = 0;

  for (const item of candidates) {
    const cleanDate = sanitizeDateStr(item.date);
    const cleanScore = sanitizeNonNegInt(item.score, 0, 50_000);
    if (!cleanDate) continue;
    if (!bestDate || cleanDate > bestDate) {
      bestDate = cleanDate;
      bestScore = cleanScore;
    } else if (cleanDate === bestDate) {
      bestScore = Math.max(bestScore, cleanScore);
    }
  }

  return { lastDailyQuizDate: bestDate, dailyBestScore: bestScore };
}

function resolveLatestDateStr(...dates: Array<string | undefined>): string {
  let latest = '';
  for (const d of dates) {
    const clean = sanitizeDateStr(d);
    if (clean && (!latest || clean > latest)) {
      latest = clean;
    }
  }
  return latest;
}

interface DbUserRow {
  id: string;
  email: string;
  canonical_email?: string | null;
  nickname: string | null;
  xp: number | null;
  weekly_xp: number | null;
  daily_best_score: number | null;
  last_daily_quiz_date: string | null;
  streak: number | null;
  last_visit_date: string | null;
  seen_ids: unknown;
  favorite_ids: unknown;
  liked_ids: unknown;
  vocab_notebook: unknown;
  category_weights: unknown;
  category_accuracy: unknown;
  badges: unknown;
  linked_device_ids: unknown;
  guest_merged_at?: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

function mapDbUserRowToDto(row: DbUserRow): AuthUserDto {
  const nowIso = new Date().toISOString();
  const guestMergedAt =
    row.guest_merged_at instanceof Date
      ? row.guest_merged_at.toISOString()
      : row.guest_merged_at
        ? String(row.guest_merged_at)
        : null;
  return {
    id: row.id,
    email: normalizeEmail(row.email),
    nickname: typeof row.nickname === 'string' ? row.nickname.trim().slice(0, 28) : '',
    xp: sanitizeNonNegInt(row.xp, 0),
    weeklyXp: sanitizeNonNegInt(row.weekly_xp, 0),
    dailyBestScore: sanitizeNonNegInt(row.daily_best_score, 0),
    lastDailyQuizDate: sanitizeDateStr(row.last_daily_quiz_date),
    streak: sanitizeNonNegInt(row.streak, 0, 36500),
    lastVisitDate: sanitizeDateStr(row.last_visit_date),
    seenIds: sanitizeStringArray(row.seen_ids, 2500),
    favoriteIds: sanitizeStringArray(row.favorite_ids, 500),
    likedIds: sanitizeStringArray(row.liked_ids, 500),
    vocabNotebook: sanitizeVocabNotebook(row.vocab_notebook, 250),
    categoryWeights: sanitizeCategoryWeights(row.category_weights),
    categoryAccuracy: sanitizeCategoryAccuracy(row.category_accuracy),
    badges: normalizeBadgeList(row.badges),
    linkedDeviceIds: sanitizeStringArray(row.linked_device_ids, 50),
    guestMergedAt,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || nowIso),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at || nowIso),
  };
}

function createZeroStartUserRecord(email: string, id = randomUUID()): AuthUserDto {
  const nowIso = new Date().toISOString();
  return {
    id,
    email: normalizeEmail(email),
    nickname: '',
    xp: 0,
    weeklyXp: 0,
    dailyBestScore: 0,
    lastDailyQuizDate: '',
    streak: 0,
    lastVisitDate: '',
    seenIds: [],
    favoriteIds: [],
    likedIds: [],
    vocabNotebook: [],
    categoryWeights: {},
    categoryAccuracy: {},
    badges: [],
    linkedDeviceIds: [],
    guestMergedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

interface GuestDbExtra {
  likedSlugs: string[];
  dailyBestScore: number;
  dailyQuizDate: string;
}

async function fetchGuestDbExtras(guestId: string): Promise<GuestDbExtra> {
  if (!isValidDeviceId(guestId) || !hasDatabaseUrl()) {
    return { likedSlugs: [], dailyBestScore: 0, dailyQuizDate: '' };
  }
  const pool = getPool();
  const [likesRes, quizRes] = await Promise.all([
    pool.query<{ fact_slug: string }>(
      `SELECT fact_slug FROM fact_likes WHERE device_id = $1`,
      [guestId]
    ),
    pool.query<{ quiz_date: string; max_score: number }>(
      `SELECT quiz_date, MAX(score)::INT AS max_score
       FROM quiz_submissions
       WHERE device_id = $1 AND mode = 'daily' AND quiz_date <> ''
       GROUP BY quiz_date
       ORDER BY quiz_date DESC
       LIMIT 1`,
      [guestId]
    ),
  ]);

  return {
    likedSlugs: likesRes.rows.map((r) => r.fact_slug).filter(Boolean),
    dailyBestScore: Number(quizRes.rows[0]?.max_score ?? 0),
    dailyQuizDate: sanitizeDateStr(quizRes.rows[0]?.quiz_date),
  };
}

function mergeUserProgress(
  base: AuthUserDto,
  guestProfile: Awaited<ReturnType<typeof getProfileByDeviceId>>['profile'],
  guestExtra: GuestDbExtra,
  guestId?: string,
  localSnapshot?: LocalMemorySnapshot
): AuthUserDto {
  const snap = localSnapshot ?? {};
  const cleanGuestId = isValidDeviceId(guestId) ? guestId.trim().slice(0, 128) : null;

  // Never trust client snapshot XP/streak for awards — only merge list/notebook state.
  // Server-persisted guest profile XP (from /api/events) may still merge via Math.max.
  const mergedDaily = resolveMergedDailyBest([
    { date: base.lastDailyQuizDate, score: base.dailyBestScore },
    { date: guestProfile?.lastDailyQuizDate ?? '', score: guestProfile?.dailyBestScore ?? 0 },
    { date: guestExtra.dailyQuizDate, score: guestExtra.dailyBestScore },
    // dailyBestScore from client is leaderboard display state, not XP — still date-bounded
    { date: snap.lastDailyQuizDate ?? '', score: snap.dailyBestScore ?? 0 },
  ]);

  const mergedSeen = sanitizeStringArray(
    [
      ...base.seenIds,
      ...(guestProfile?.seenIds ?? []),
      ...(Array.isArray(snap.seenIds) ? snap.seenIds : []),
    ],
    2500
  );

  const mergedFavorites = sanitizeStringArray(
    [
      ...base.favoriteIds,
      ...(guestProfile?.favoriteIds ?? []),
      ...(Array.isArray(snap.favoriteIds) ? snap.favoriteIds : []),
    ],
    500
  );

  const mergedLiked = sanitizeStringArray(
    [
      ...base.likedIds,
      ...(guestProfile?.likedIds ?? []),
      ...guestExtra.likedSlugs,
      ...(Array.isArray(snap.likedIds) ? snap.likedIds : []),
    ],
    500
  );

  const mergedVocab: SavedVocabularyEntry[] = sanitizeVocabNotebook(
    [
      ...base.vocabNotebook,
      ...(guestProfile?.vocabNotebook ?? []),
      ...(Array.isArray(snap.vocabNotebook) ? snap.vocabNotebook : []),
    ],
    250
  );

  const mergedBadges = normalizeBadgeList([
    ...base.badges,
    ...(guestProfile?.badges ?? []),
    ...(Array.isArray(snap.badges) ? snap.badges : []),
  ]);

  const mergedDeviceIds = sanitizeStringArray(
    [...base.linkedDeviceIds, ...(cleanGuestId ? [cleanGuestId] : [])],
    50
  );

  const mergedXp = Math.max(base.xp, guestProfile?.xp ?? 0);
  const mergedWeeklyXp = Math.max(base.weeklyXp, guestProfile?.weeklyXp ?? 0);
  const mergedStreak = Math.max(0, base.streak, guestProfile?.streak ?? 0);

  return {
    ...base,
    nickname: pickPreferredNickname(base.nickname, snap.nickname, guestProfile?.username),
    xp: mergedXp,
    weeklyXp: mergedWeeklyXp,
    dailyBestScore: mergedDaily.dailyBestScore,
    lastDailyQuizDate: mergedDaily.lastDailyQuizDate,
    streak: mergedStreak,
    lastVisitDate: resolveLatestDateStr(
      base.lastVisitDate,
      guestProfile?.lastVisitDate,
      snap.lastVisitDate
    ),
    seenIds: mergedSeen,
    favoriteIds: mergedFavorites,
    likedIds: mergedLiked,
    vocabNotebook: mergedVocab,
    categoryWeights: mergeCategoryWeights(
      base.categoryWeights,
      guestProfile?.categoryWeights,
      snap.categoryWeights
    ),
    categoryAccuracy: mergeCategoryAccuracy(
      base.categoryAccuracy,
      guestProfile?.categoryAccuracy,
      snap.categoryAccuracy
    ),
    badges: mergedBadges,
    linkedDeviceIds: mergedDeviceIds,
    updatedAt: new Date().toISOString(),
  };
}

async function saveMergedUserToDb(user: AuthUserDto, linkedGuestId?: string | null): Promise<AuthUserDto> {
  if (!hasDatabaseUrl()) {
    const usersById = getMemoryUsersById();
    const userIdByEmail = getMemoryUserIdByEmail();
    usersById.set(user.id, user);
    userIdByEmail.set(user.email, user.id);

    if (linkedGuestId && isValidDeviceId(linkedGuestId)) {
      const profileMap = getMemoryProfileMap();
      const existingProfile = profileMap.get(linkedGuestId);
      if (existingProfile) {
        profileMap.set(linkedGuestId, {
          ...existingProfile,
          userId: user.id,
        });
      }
    }
    return user;
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<DbUserRow>(
    `UPDATE users
     SET nickname = $2,
         xp = $3,
         weekly_xp = $4,
         daily_best_score = $5,
         last_daily_quiz_date = $6,
         streak = $7,
         last_visit_date = $8,
         last_active_date = CASE WHEN $3 > 0 OR $7 > 0 THEN CURRENT_DATE ELSE last_active_date END,
         seen_ids = $9::jsonb,
         favorite_ids = $10::jsonb,
         liked_ids = $11::jsonb,
         vocab_notebook = $12::jsonb,
         category_weights = $13::jsonb,
         category_accuracy = $14::jsonb,
         badges = $15::jsonb,
         linked_device_ids = $16::jsonb,
         guest_merged_at = COALESCE(guest_merged_at, $17::timestamptz),
         canonical_email = COALESCE(canonical_email, $18),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      user.id,
      user.nickname,
      user.xp,
      user.weeklyXp,
      user.dailyBestScore,
      user.lastDailyQuizDate,
      user.streak,
      user.lastVisitDate,
      JSON.stringify(user.seenIds),
      JSON.stringify(user.favoriteIds),
      JSON.stringify(user.likedIds),
      JSON.stringify(user.vocabNotebook),
      JSON.stringify(user.categoryWeights),
      JSON.stringify(user.categoryAccuracy),
      JSON.stringify(user.badges),
      JSON.stringify(user.linkedDeviceIds),
      user.guestMergedAt || null,
      canonicalizeEmail(user.email),
    ]
  );

  if (linkedGuestId && isValidDeviceId(linkedGuestId)) {
    await pool.query(
      `UPDATE profiles SET user_id = $2 WHERE device_id = $1`,
      [linkedGuestId, user.id]
    );
  }

  return res.rows[0] ? mapDbUserRowToDto(res.rows[0]) : user;
}

async function findOrCreateUserByEmail(email: string): Promise<AuthUserDto> {
  const cleanEmail = normalizeEmail(email);
  const canonical = canonicalizeEmail(cleanEmail);

  if (!hasDatabaseUrl()) {
    const usersById = getMemoryUsersById();
    const userIdByEmail = getMemoryUserIdByEmail();
    const existingId = userIdByEmail.get(canonical) || userIdByEmail.get(cleanEmail);
    if (existingId) {
      const existing = usersById.get(existingId);
      if (existing) return existing;
    }
    const created = createZeroStartUserRecord(cleanEmail);
    usersById.set(created.id, created);
    userIdByEmail.set(canonical, created.id);
    userIdByEmail.set(cleanEmail, created.id);
    return created;
  }

  await ensureSchema();
  const pool = getPool();

  const existing = await pool.query<DbUserRow>(
    `SELECT * FROM users
     WHERE canonical_email = $1 OR email = $2 OR email = $3
     ORDER BY created_at ASC
     LIMIT 1`,
    [canonical, cleanEmail, canonical]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (!row.canonical_email || row.canonical_email !== canonical) {
      await pool.query(
        `UPDATE users SET canonical_email = $2, updated_at = NOW() WHERE id = $1`,
        [row.id, canonical]
      );
      row.canonical_email = canonical;
    }
    return mapDbUserRowToDto(row);
  }

  const newId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, canonical_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [newId, cleanEmail, canonical]
  );

  const res = await pool.query<DbUserRow>(
    `SELECT * FROM users
     WHERE canonical_email = $1 OR email = $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [canonical, cleanEmail]
  );
  if (!res.rows[0]) {
    throw new Error('Failed to resolve user record.');
  }
  return mapDbUserRowToDto(res.rows[0]);
}

export async function getUserById(userId: string): Promise<AuthUserDto | null> {
  if (!userId) return null;

  if (!hasDatabaseUrl()) {
    return getMemoryUsersById().get(userId) ?? null;
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<DbUserRow>(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return res.rows[0] ? mapDbUserRowToDto(res.rows[0]) : null;
}

export interface RequestOtpOutcome {
  ok: boolean;
  status: number;
  cooldownSec: number;
  expiresInSec: number;
  delivery: 'resend' | 'dev_preview';
  devOtpCode?: string;
  retryAfterSec?: number;
  error?: string;
}

export async function requestOtpChallenge(params: {
  email: string;
  lang?: Language;
  clientIp: string;
}): Promise<RequestOtpOutcome> {
  const lang: Language = params.lang === 'en' ? 'en' : 'tr';
  const email = normalizeEmail(params.email);

  if (!isValidEmailFormat(email)) {
    return {
      ok: false,
      status: 400,
      cooldownSec: OTP_COOLDOWN_SECONDS,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error:
        lang === 'en'
          ? 'Please enter a valid email address.'
          : 'Lütfen geçerli bir e-posta adresi girin.',
    };
  }

  if (isDisposableEmailDomain(email)) {
    return {
      ok: false,
      status: 400,
      cooldownSec: OTP_COOLDOWN_SECONDS,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error:
        lang === 'en'
          ? 'Temporary or disposable email addresses are not supported. Please use a permanent email.'
          : 'Geçici veya tek kullanımlık e-posta adresleri desteklenmiyor. Lütfen kalıcı bir e-posta kullanın.',
    };
  }

  const ipHash = hashClientIp(params.clientIp);
  const nowMs = Date.now();
  const oneHourAgoMs = nowMs - 3_600_000;

  if (!hasDatabaseUrl()) {
    const otps = getMemoryOtps();
    // Prune records older than 24h to keep memory bounded
    const cutoff = nowMs - 86_400_000;
    for (let i = otps.length - 1; i >= 0; i -= 1) {
      if (otps[i].createdAtMs < cutoff) {
        otps.splice(i, 1);
      }
    }

    const emailRecent = otps
      .filter((o) => o.email === email && o.createdAtMs > oneHourAgoMs)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    const latestForEmail = emailRecent[0];
    if (latestForEmail) {
      const elapsedSec = Math.floor((nowMs - latestForEmail.createdAtMs) / 1000);
      if (elapsedSec < OTP_COOLDOWN_SECONDS) {
        const waitSec = Math.max(1, OTP_COOLDOWN_SECONDS - elapsedSec);
        return {
          ok: false,
          status: 429,
          cooldownSec: waitSec,
          expiresInSec: OTP_TTL_SECONDS,
          delivery: 'resend',
          retryAfterSec: waitSec,
          error:
            lang === 'en'
              ? `Please wait ${waitSec} seconds before requesting a new code.`
              : `Yeni bir kod istemeden önce lütfen ${waitSec} saniye bekleyin.`,
        };
      }
    }

    if (emailRecent.length >= OTP_HOURLY_EMAIL_LIMIT) {
      const oldestInWindow = emailRecent[emailRecent.length - 1];
      const waitSec = Math.max(
        60,
        Math.ceil((oldestInWindow.createdAtMs + 3_600_000 - nowMs) / 1000)
      );
      return {
        ok: false,
        status: 429,
        cooldownSec: waitSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        retryAfterSec: waitSec,
        error:
          lang === 'en'
            ? 'Hourly verification code limit reached for this email. Please try again later.'
            : 'Bu e-posta için saatlik doğrulama kodu limitine ulaşıldı. Lütfen daha sonra tekrar deneyin.',
      };
    }

    const ipRecent = otps
      .filter((o) => o.ipHash === ipHash && o.createdAtMs > oneHourAgoMs)
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
    if (ipRecent.length >= OTP_HOURLY_IP_LIMIT) {
      const waitSec = Math.max(
        60,
        Math.ceil((ipRecent[0].createdAtMs + 3_600_000 - nowMs) / 1000)
      );
      return {
        ok: false,
        status: 429,
        cooldownSec: waitSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        retryAfterSec: waitSec,
        error:
          lang === 'en'
            ? 'Too many verification requests from this network. Please try again later.'
            : 'Bu ağdan çok fazla doğrulama kodu isteği gönderildi. Lütfen daha sonra tekrar deneyin.',
      };
    }

    const code = String(randomInt(100_000, 1_000_000));
    const codeHash = hashOtpCode(email, code);

    for (const existing of otps) {
      if (existing.email === email && existing.consumedAtMs === null) {
        existing.consumedAtMs = nowMs;
      }
    }

    const otpId = randomUUID();
    otps.push({
      id: otpId,
      email,
      codeHash,
      expiresAtMs: nowMs + OTP_TTL_SECONDS * 1000,
      attempts: 0,
      consumedAtMs: null,
      ipHash,
      createdAtMs: nowMs,
    });

    const mailResult = await sendOtpEmail({
      to: email,
      code,
      lang,
      expiresInMin: OTP_TTL_SECONDS / 60,
    });

    if (!mailResult.ok) {
      const idx = otps.findIndex((o) => o.id === otpId);
      if (idx >= 0) otps.splice(idx, 1);
      console.error('[lib/auth] OTP email delivery failed (memory path)', {
        error: mailResult.error,
        errorCode: mailResult.errorCode || mailResult.error,
        delivery: mailResult.delivery,
      });
      return {
        ok: false,
        status: 503,
        cooldownSec: 0,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        error:
          lang === 'en'
            ? 'Verification email could not be delivered right now. Please try again shortly.'
            : 'Doğrulama e-postası şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin.',
      };
    }

    const exposeDevOtp =
      mailResult.delivery === 'dev_preview' && process.env.NODE_ENV !== 'production';

    return {
      ok: true,
      status: 200,
      cooldownSec: OTP_COOLDOWN_SECONDS,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: mailResult.delivery,
      ...(exposeDevOtp ? { devOtpCode: code } : {}),
    };
  }

  await ensureSchema();
  const pool = getPool();

  const [emailStatsRes, ipStatsRes] = await Promise.all([
    pool.query<{
      hourly_count: number;
      latest_created_at: Date | string | null;
      oldest_created_at: Date | string | null;
    }>(
      `SELECT
         COUNT(*)::INT AS hourly_count,
         MAX(created_at) AS latest_created_at,
         MIN(created_at) AS oldest_created_at
       FROM auth_otps
       WHERE email = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [email]
    ),
    pool.query<{
      hourly_count: number;
      oldest_created_at: Date | string | null;
    }>(
      `SELECT
         COUNT(*)::INT AS hourly_count,
         MIN(created_at) AS oldest_created_at
       FROM auth_otps
       WHERE ip_hash = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipHash]
    ),
  ]);

  const emailStats = emailStatsRes.rows[0];
  const latestEmailMs = emailStats?.latest_created_at
    ? new Date(emailStats.latest_created_at).getTime()
    : 0;
  if (latestEmailMs > 0) {
    const elapsedSec = Math.floor((nowMs - latestEmailMs) / 1000);
    if (elapsedSec < OTP_COOLDOWN_SECONDS) {
      const waitSec = Math.max(1, OTP_COOLDOWN_SECONDS - elapsedSec);
      return {
        ok: false,
        status: 429,
        cooldownSec: waitSec,
        expiresInSec: OTP_TTL_SECONDS,
        delivery: 'resend',
        retryAfterSec: waitSec,
        error:
          lang === 'en'
            ? `Please wait ${waitSec} seconds before requesting a new code.`
            : `Yeni bir kod istemeden önce lütfen ${waitSec} saniye bekleyin.`,
      };
    }
  }

  if (Number(emailStats?.hourly_count ?? 0) >= OTP_HOURLY_EMAIL_LIMIT) {
    const oldestMs = emailStats?.oldest_created_at
      ? new Date(emailStats.oldest_created_at).getTime()
      : nowMs;
    const waitSec = Math.max(60, Math.ceil((oldestMs + 3_600_000 - nowMs) / 1000));
    return {
      ok: false,
      status: 429,
      cooldownSec: waitSec,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      retryAfterSec: waitSec,
      error:
        lang === 'en'
          ? 'Hourly verification code limit reached for this email. Please try again later.'
          : 'Bu e-posta için saatlik doğrulama kodu limitine ulaşıldı. Lütfen daha sonra tekrar deneyin.',
    };
  }

  const ipStats = ipStatsRes.rows[0];
  if (Number(ipStats?.hourly_count ?? 0) >= OTP_HOURLY_IP_LIMIT) {
    const oldestIpMs = ipStats?.oldest_created_at
      ? new Date(ipStats.oldest_created_at).getTime()
      : nowMs;
    const waitSec = Math.max(60, Math.ceil((oldestIpMs + 3_600_000 - nowMs) / 1000));
    return {
      ok: false,
      status: 429,
      cooldownSec: waitSec,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      retryAfterSec: waitSec,
      error:
        lang === 'en'
          ? 'Too many verification requests from this network. Please try again later.'
          : 'Bu ağdan çok fazla doğrulama kodu isteği gönderildi. Lütfen daha sonra tekrar deneyin.',
    };
  }

  const code = String(randomInt(100_000, 1_000_000));
  const codeHash = hashOtpCode(email, code);
  const otpId = randomUUID();

  await pool.query(
    `UPDATE auth_otps
     SET consumed_at = NOW()
     WHERE email = $1 AND consumed_at IS NULL`,
    [email]
  );

  await pool.query(
    `INSERT INTO auth_otps (id, email, code_hash, expires_at, attempts, ip_hash)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', 0, $4)`,
    [otpId, email, codeHash, ipHash]
  );

  const mailResult = await sendOtpEmail({
    to: email,
    code,
    lang,
    expiresInMin: OTP_TTL_SECONDS / 60,
  });

  if (!mailResult.ok) {
    await pool.query(`DELETE FROM auth_otps WHERE id = $1`, [otpId]).catch(() => {});
    console.error('[lib/auth] OTP email delivery failed (postgres path)', {
      error: mailResult.error,
      errorCode: mailResult.errorCode || mailResult.error,
      delivery: mailResult.delivery,
    });
    return {
      ok: false,
      status: 503,
      cooldownSec: 0,
      expiresInSec: OTP_TTL_SECONDS,
      delivery: 'resend',
      error:
        lang === 'en'
          ? 'Verification email could not be delivered right now. Please try again shortly.'
          : 'Doğrulama e-postası şu anda gönderilemedi. Lütfen biraz sonra tekrar deneyin.',
    };
  }

  const exposeDevOtp =
    mailResult.delivery === 'dev_preview' && process.env.NODE_ENV !== 'production';

  return {
    ok: true,
    status: 200,
    cooldownSec: OTP_COOLDOWN_SECONDS,
    expiresInSec: OTP_TTL_SECONDS,
    delivery: mailResult.delivery,
    ...(exposeDevOtp ? { devOtpCode: code } : {}),
  };
}

export interface VerifyOtpOutcome {
  ok: boolean;
  status: number;
  user: AuthUserDto | null;
  sessionToken?: string;
  error?: string;
}

export async function verifyOtpAndCreateSession(params: {
  email: string;
  code: string;
  guestId?: string;
  localSnapshot?: LocalMemorySnapshot;
  lang?: Language;
}): Promise<VerifyOtpOutcome> {
  const lang: Language = params.lang === 'en' ? 'en' : 'tr';
  const email = normalizeEmail(params.email);
  const code = String(params.code || '').replace(/\s+/g, '');

  if (!isValidEmailFormat(email) || isDisposableEmailDomain(email)) {
    return {
      ok: false,
      status: 400,
      user: null,
      error:
        lang === 'en'
          ? 'Please enter a valid email address.'
          : 'Lütfen geçerli bir e-posta adresi girin.',
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      ok: false,
      status: 400,
      user: null,
      error:
        lang === 'en'
          ? 'Please enter the 6-digit verification code.'
          : 'Lütfen 6 haneli doğrulama kodunu girin.',
    };
  }

  const candidateHash = hashOtpCode(email, code);
  const nowMs = Date.now();

  if (!hasDatabaseUrl()) {
    const otps = getMemoryOtps();
    const recentForEmail = otps
      .filter((o) => o.email === email)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
    const active = recentForEmail.find((o) => o.consumedAtMs === null);

    if (!active) {
      const latest = recentForEmail[0];
      if (latest && latest.attempts >= OTP_MAX_ATTEMPTS && latest.expiresAtMs > nowMs) {
        return {
          ok: false,
          status: 429,
          user: null,
          error:
            lang === 'en'
              ? 'Too many incorrect attempts. Please request a new verification code.'
              : 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
        };
      }
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'No active verification code found. Please request a new code.'
            : 'Aktif bir doğrulama kodu bulunamadı. Lütfen yeni bir kod isteyin.',
      };
    }

    if (active.expiresAtMs <= nowMs) {
      active.consumedAtMs = nowMs;
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'This verification code has expired. Please request a new one.'
            : 'Bu doğrulama kodunun süresi doldu. Lütfen yeni bir kod isteyin.',
      };
    }

    if (active.attempts >= OTP_MAX_ATTEMPTS) {
      active.consumedAtMs = nowMs;
      return {
        ok: false,
        status: 429,
        user: null,
        error:
          lang === 'en'
            ? 'Too many incorrect attempts. Please request a new verification code.'
            : 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
      };
    }

    if (!timingSafeHexMatch(active.codeHash, candidateHash)) {
      active.attempts += 1;
      if (active.attempts >= OTP_MAX_ATTEMPTS) {
        active.consumedAtMs = nowMs;
        return {
          ok: false,
          status: 429,
          user: null,
          error:
            lang === 'en'
              ? 'Too many incorrect attempts. This code is locked, please request a new one.'
              : 'Çok fazla hatalı deneme yapıldı. Bu kod kilitlendi, lütfen yeni bir kod isteyin.',
        };
      }
      const left = OTP_MAX_ATTEMPTS - active.attempts;
      return {
        ok: false,
        status: 401,
        user: null,
        error:
          lang === 'en'
            ? `Incorrect verification code. ${left} attempt(s) left.`
            : `Hatalı doğrulama kodu. ${left} deneme hakkınız kaldı.`,
      };
    }

    active.consumedAtMs = nowMs;
  } else {
    await ensureSchema();
    const pool = getPool();

    const activeRes = await pool.query<{
      id: string;
      code_hash: string;
      expires_at: Date | string;
      attempts: number;
      consumed_at: Date | string | null;
    }>(
      `SELECT id, code_hash, expires_at, attempts, consumed_at
       FROM auth_otps
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    const latest = activeRes.rows[0];
    if (!latest) {
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'No active verification code found. Please request a new code.'
            : 'Aktif bir doğrulama kodu bulunamadı. Lütfen yeni bir kod isteyin.',
      };
    }

    const expiresMs = new Date(latest.expires_at).getTime();
    if (latest.consumed_at !== null) {
      if (Number(latest.attempts) >= OTP_MAX_ATTEMPTS && expiresMs > nowMs) {
        return {
          ok: false,
          status: 429,
          user: null,
          error:
            lang === 'en'
              ? 'Too many incorrect attempts. Please request a new verification code.'
              : 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
        };
      }
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'This verification code has already been used. Please request a new code.'
            : 'Bu doğrulama kodu daha önce kullanıldı. Lütfen yeni bir kod isteyin.',
      };
    }

    if (expiresMs <= nowMs) {
      await pool.query(`UPDATE auth_otps SET consumed_at = NOW() WHERE id = $1`, [latest.id]);
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'This verification code has expired. Please request a new one.'
            : 'Bu doğrulama kodunun süresi doldu. Lütfen yeni bir kod isteyin.',
      };
    }

    if (Number(latest.attempts) >= OTP_MAX_ATTEMPTS) {
      await pool.query(`UPDATE auth_otps SET consumed_at = NOW() WHERE id = $1`, [latest.id]);
      return {
        ok: false,
        status: 429,
        user: null,
        error:
          lang === 'en'
            ? 'Too many incorrect attempts. Please request a new verification code.'
            : 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
      };
    }

    if (!timingSafeHexMatch(latest.code_hash, candidateHash)) {
      const updRes = await pool.query<{ attempts: number }>(
        `UPDATE auth_otps
         SET attempts = attempts + 1,
             consumed_at = CASE WHEN attempts + 1 >= $2 THEN NOW() ELSE consumed_at END
         WHERE id = $1 AND consumed_at IS NULL
         RETURNING attempts`,
        [latest.id, OTP_MAX_ATTEMPTS]
      );
      const nextAttempts = Number(updRes.rows[0]?.attempts ?? Number(latest.attempts) + 1);
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        return {
          ok: false,
          status: 429,
          user: null,
          error:
            lang === 'en'
              ? 'Too many incorrect attempts. This code is locked, please request a new one.'
              : 'Çok fazla hatalı deneme yapıldı. Bu kod kilitlendi, lütfen yeni bir kod isteyin.',
        };
      }
      const left = Math.max(1, OTP_MAX_ATTEMPTS - nextAttempts);
      return {
        ok: false,
        status: 401,
        user: null,
        error:
          lang === 'en'
            ? `Incorrect verification code. ${left} attempt(s) left.`
            : `Hatalı doğrulama kodu. ${left} deneme hakkınız kaldı.`,
      };
    }

    const consumeRes = await pool.query<{ id: string }>(
      `UPDATE auth_otps
       SET consumed_at = NOW()
       WHERE id = $1
         AND consumed_at IS NULL
         AND expires_at > NOW()
         AND attempts < $2
       RETURNING id`,
      [latest.id, OTP_MAX_ATTEMPTS]
    );

    if ((consumeRes.rowCount ?? 0) === 0) {
      return {
        ok: false,
        status: 400,
        user: null,
        error:
          lang === 'en'
            ? 'This verification code is no longer valid. Please request a new code.'
            : 'Bu doğrulama kodu artık geçerli değil. Lütfen yeni bir kod isteyin.',
      };
    }
  }

  const baseUser = await findOrCreateUserByEmail(email);
  const cleanGuestId = isValidDeviceId(params.guestId) ? params.guestId.trim().slice(0, 128) : undefined;
  const alreadyMerged = Boolean(baseUser.guestMergedAt);
  const guestProfileRes =
    cleanGuestId && !alreadyMerged
      ? await getProfileByDeviceId(cleanGuestId)
      : { profile: null };
  const guestExtra =
    cleanGuestId && !alreadyMerged
      ? await fetchGuestDbExtras(cleanGuestId)
      : { likedSlugs: [], dailyBestScore: 0, dailyQuizDate: '' };

  const mergedUser = alreadyMerged
    ? {
        ...baseUser,
        // Still allow non-XP list merges from snapshot when already merged once.
        seenIds: sanitizeStringArray(
          [...baseUser.seenIds, ...(params.localSnapshot?.seenIds ?? [])],
          2500
        ),
        favoriteIds: sanitizeStringArray(
          [...baseUser.favoriteIds, ...(params.localSnapshot?.favoriteIds ?? [])],
          500
        ),
        likedIds: sanitizeStringArray(
          [...baseUser.likedIds, ...(params.localSnapshot?.likedIds ?? [])],
          500
        ),
        vocabNotebook: sanitizeVocabNotebook(
          [...baseUser.vocabNotebook, ...(params.localSnapshot?.vocabNotebook ?? [])],
          250
        ),
      }
    : mergeUserProgress(
        baseUser,
        guestProfileRes.profile,
        guestExtra,
        cleanGuestId,
        params.localSnapshot
      );

  if (!alreadyMerged && cleanGuestId) {
    mergedUser.guestMergedAt = new Date().toISOString();
  }
  const persistedUser = await saveMergedUserToDb(mergedUser, alreadyMerged ? null : cleanGuestId);

  const sessionToken = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(sessionToken);
  const sessionId = randomUUID();

  if (!hasDatabaseUrl()) {
    getMemorySessionsByHash().set(tokenHash, {
      id: sessionId,
      userId: persistedUser.id,
      tokenHash,
      expiresAtMs: nowMs + SESSION_MAX_AGE_SECONDS * 1000,
      lastSeenAtMs: nowMs,
      createdAtMs: nowMs,
    });
  } else {
    const pool = getPool();
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')`,
      [sessionId, persistedUser.id, tokenHash]
    );
  }

  return {
    ok: true,
    status: 200,
    user: persistedUser,
    sessionToken,
  };
}

export async function mergeGuestDataIntoUser(params: {
  userId: string;
  guestId?: string;
  localSnapshot?: LocalMemorySnapshot;
}): Promise<AuthUserDto | null> {
  const user = await getUserById(params.userId);
  if (!user) return null;

  // Guest merge is one-shot via guest_merged_at.
  if (user.guestMergedAt) {
    return user;
  }

  const cleanGuestId = isValidDeviceId(params.guestId) ? params.guestId.trim().slice(0, 128) : undefined;
  const guestProfileRes = cleanGuestId ? await getProfileByDeviceId(cleanGuestId) : { profile: null };
  const guestExtra = cleanGuestId
    ? await fetchGuestDbExtras(cleanGuestId)
    : { likedSlugs: [], dailyBestScore: 0, dailyQuizDate: '' };

  const merged = mergeUserProgress(
    user,
    guestProfileRes.profile,
    guestExtra,
    cleanGuestId,
    params.localSnapshot
  );
  merged.guestMergedAt = new Date().toISOString();

  return saveMergedUserToDb(merged, cleanGuestId);
}

export async function getSessionUserFromToken(
  rawToken: string | null | undefined
): Promise<AuthUserDto | null> {
  if (!rawToken || rawToken.trim().length < 16) return null;
  const tokenHash = hashSessionToken(rawToken.trim());
  const nowMs = Date.now();

  if (!hasDatabaseUrl()) {
    const sessions = getMemorySessionsByHash();
    const session = sessions.get(tokenHash);
    if (!session) return null;
    if (session.expiresAtMs <= nowMs) {
      sessions.delete(tokenHash);
      return null;
    }
    session.lastSeenAtMs = nowMs;
    return getMemoryUsersById().get(session.userId) ?? null;
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<DbUserRow & { session_id: string }>(
    `SELECT u.*, s.id AS session_id
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  const row = res.rows[0];
  if (!row) return null;

  await pool
    .query(`UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1`, [row.session_id])
    .catch(() => {});

  return mapDbUserRowToDto(row);
}

export async function getSessionUserFromRequest(request: Request): Promise<AuthUserDto | null> {
  const token = readSessionCookieFromRequest(request);
  return getSessionUserFromToken(token);
}

export async function revokeSessionFromRequest(request: Request): Promise<void> {
  const token = readSessionCookieFromRequest(request);
  if (!token || token.trim().length < 16) return;
  const tokenHash = hashSessionToken(token.trim());

  if (!hasDatabaseUrl()) {
    getMemorySessionsByHash().delete(tokenHash);
    return;
  }

  await ensureSchema();
  const pool = getPool();
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function syncAuthenticatedUserFromProfile(params: {
  userId: string;
  deviceId?: string;
  snapshot: LocalMemorySnapshot;
}): Promise<AuthUserDto | null> {
  const user = await getUserById(params.userId);
  if (!user) return null;

  const cleanDeviceId = isValidDeviceId(params.deviceId)
    ? params.deviceId.trim().slice(0, 128)
    : undefined;
  const merged = mergeUserProgress(
    user,
    null,
    { likedSlugs: [], dailyBestScore: 0, dailyQuizDate: '' },
    cleanDeviceId,
    params.snapshot
  );

  // Allow explicit custom nickname updates from an already-authenticated session
  const incomingNick =
    typeof params.snapshot.nickname === 'string'
      ? params.snapshot.nickname.trim().slice(0, 28)
      : '';
  if (incomingNick && !isGenericNickname(incomingNick)) {
    merged.nickname = incomingNick;
  }

  return saveMergedUserToDb(merged, cleanDeviceId);
}

export async function syncAuthenticatedUserFromEvents(params: {
  userId: string;
  deviceId?: string;
  xpDelta: number;
  streak?: number;
  username?: string;
  addedLikes?: string[];
  removedLikes?: string[];
}): Promise<void> {
  const user = await getUserById(params.userId);
  if (!user) return;

  const cleanDeviceId = isValidDeviceId(params.deviceId)
    ? params.deviceId.trim().slice(0, 128)
    : undefined;
  const xpDelta = Math.max(0, Math.floor(params.xpDelta));
  const incomingStreak =
    typeof params.streak === 'number' ? sanitizeNonNegInt(params.streak, 0, 36500) : 0;

  const removedSet = new Set(params.removedLikes ?? []);
  const likedSet = new Set(user.likedIds.filter((id) => !removedSet.has(id)));
  for (const slug of params.addedLikes ?? []) {
    if (slug && !removedSet.has(slug)) {
      likedSet.add(slug);
    }
  }

  const nextUser: AuthUserDto = {
    ...user,
    nickname: pickPreferredNickname(user.nickname, params.username),
    xp: user.xp + xpDelta,
    weeklyXp: user.weeklyXp + xpDelta,
    streak: Math.max(0, user.streak, incomingStreak, xpDelta > 0 ? 1 : 0),
    likedIds: Array.from(likedSet).slice(0, 500),
    linkedDeviceIds: sanitizeStringArray(
      [...user.linkedDeviceIds, ...(cleanDeviceId ? [cleanDeviceId] : [])],
      50
    ),
    updatedAt: new Date().toISOString(),
  };

  await saveMergedUserToDb(nextUser, cleanDeviceId);
}
