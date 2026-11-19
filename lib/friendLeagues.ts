import { randomInt } from 'node:crypto';
import type { Language } from '@/i18n/translations';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { getMemoryProfileMap, getProfileByDeviceId, isValidDeviceId, upsertProfileState } from '@/lib/dbActions';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import { computeOpaquePublicLeaderboardId } from '@/lib/requestSecurity';
import { PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export interface FriendLeagueRecord {
  code: string;
  name: string;
  creatorDeviceId: string;
  createdAt: string;
}

export interface FriendLeagueMemberEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  weeklyXp: number;
  xp: number;
  streak: number;
  isUser: boolean;
  joinedAt: string;
}

export interface FriendLeagueSummary {
  code: string;
  name: string;
  memberCount: number;
  joinedAt: string;
}

const LEAGUE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LEAGUE_CODE_REGEX = /^[A-Z0-9]{6,8}$/;
const MEMBER_AVATARS = ['🦁', '🚀', '🧬', '🦊', '🐙', '🧠', '🪐', '🦖', '🦉', '⚡'];

interface MemoryLeagueMember {
  leagueCode: string;
  deviceId: string;
  userId: string | null;
  joinedAt: string;
}

declare global {
  var __scrollyMemoryFriendLeagues: Map<string, FriendLeagueRecord> | undefined;
  var __scrollyMemoryFriendLeagueMembers: Map<string, MemoryLeagueMember[]> | undefined;
}

function getMemoryLeaguesMap(): Map<string, FriendLeagueRecord> {
  if (!globalThis.__scrollyMemoryFriendLeagues) {
    globalThis.__scrollyMemoryFriendLeagues = new Map();
  }
  return globalThis.__scrollyMemoryFriendLeagues;
}

function getMemoryLeagueMembersMap(): Map<string, MemoryLeagueMember[]> {
  if (!globalThis.__scrollyMemoryFriendLeagueMembers) {
    globalThis.__scrollyMemoryFriendLeagueMembers = new Map();
  }
  return globalThis.__scrollyMemoryFriendLeagueMembers;
}

export function normalizeLeagueCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export function isValidLeagueCode(raw: unknown): boolean {
  return LEAGUE_CODE_REGEX.test(normalizeLeagueCode(raw));
}

function generateLeagueCode(length = 6): string {
  const safeLen = Math.max(6, Math.min(8, length));
  let code = '';
  for (let i = 0; i < safeLen; i += 1) {
    code += LEAGUE_CODE_ALPHABET[randomInt(0, LEAGUE_CODE_ALPHABET.length)];
  }
  return code;
}

export function friendLeagueInviteUrl(code: string, origin?: string): string {
  const safe = normalizeLeagueCode(code);
  const base =
    origin && /^https?:\/\//.test(origin)
      ? origin.replace(/\/$/, '')
      : PUBLIC_SITE_ORIGIN;
  return `${base}/?tab=leaderboard&league=${safe}`;
}

function pickAvatarForMember(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MEMBER_AVATARS[hash % MEMBER_AVATARS.length] ?? '🧭';
}

function sanitizeLeagueName(raw: unknown, lang: Language = 'tr'): string {
  const cleaned = sanitizeDisplayText(typeof raw === 'string' ? raw : '', 40);
  if (cleaned.length >= 2) return cleaned;
  return lang === 'en' ? 'Study Squad' : 'Arkadaş Ligi';
}

async function ensureMemberProfileExists(params: {
  deviceId: string;
  userId?: string | null;
  username?: string;
}): Promise<void> {
  const existing = await getProfileByDeviceId(params.deviceId).catch(() => ({
    persisted: false,
    profile: null,
  }));
  if (existing.profile) return;
  const fallbackName = sanitizeDisplayText(params.username || '', 28) || 'Merak Kâşifi';
  await upsertProfileState({
    deviceId: params.deviceId,
    userId: params.userId ?? undefined,
    username: fallbackName,
  }).catch(() => {});
}

export async function createFriendLeague(input: {
  name: string;
  deviceId: string;
  userId?: string | null;
  username?: string;
  lang?: Language;
}): Promise<FriendLeagueRecord> {
  const cleanDevice = input.deviceId.trim().slice(0, 128);
  const leagueName = sanitizeLeagueName(input.name, input.lang);
  const createdAt = new Date().toISOString();

  await ensureMemberProfileExists({
    deviceId: cleanDevice,
    userId: input.userId ?? null,
    username: input.username,
  });

  if (!hasDatabaseUrl()) {
    const leagues = getMemoryLeaguesMap();
    const membersMap = getMemoryLeagueMembersMap();
    let code = generateLeagueCode(6);
    for (let i = 0; i < 6 && leagues.has(code); i += 1) {
      code = generateLeagueCode(6);
    }
    const league: FriendLeagueRecord = {
      code,
      name: leagueName,
      creatorDeviceId: cleanDevice,
      createdAt,
    };
    leagues.set(code, league);
    membersMap.set(code, [
      {
        leagueCode: code,
        deviceId: cleanDevice,
        userId: input.userId ?? null,
        joinedAt: createdAt,
      },
    ]);
    return league;
  }

  await ensureSchema();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateLeagueCode(6);
    const insRes = await pool.query<{
      code: string;
      name: string;
      creator_device_id: string;
      created_at: Date | string;
    }>(
      `INSERT INTO friend_leagues (code, name, creator_device_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO NOTHING
       RETURNING code, name, creator_device_id, created_at`,
      [code, leagueName, cleanDevice]
    );
    const row = insRes.rows[0];
    if (!row) continue;

    await pool.query(
      `INSERT INTO friend_league_members (league_code, device_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (league_code, device_id) DO UPDATE SET
         user_id = COALESCE(friend_league_members.user_id, EXCLUDED.user_id)`,
      [row.code, cleanDevice, input.userId ?? null]
    );

    return {
      code: row.code,
      name: row.name,
      creatorDeviceId: row.creator_device_id,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  throw new Error('Failed to create friend league.');
}

export async function joinFriendLeague(input: {
  code: string;
  deviceId: string;
  userId?: string | null;
  username?: string;
}): Promise<FriendLeagueRecord | null> {
  const code = normalizeLeagueCode(input.code);
  if (!isValidLeagueCode(code) || !isValidDeviceId(input.deviceId)) return null;
  const cleanDevice = input.deviceId.trim().slice(0, 128);

  if (!hasDatabaseUrl()) {
    const league = getMemoryLeaguesMap().get(code);
    if (!league) return null;
    await ensureMemberProfileExists({
      deviceId: cleanDevice,
      userId: input.userId ?? null,
      username: input.username,
    });
    const membersMap = getMemoryLeagueMembersMap();
    const list = membersMap.get(code) ?? [];
    const idx = list.findIndex((m) => m.deviceId === cleanDevice);
    if (idx >= 0) {
      if (!list[idx].userId && input.userId) {
        list[idx] = { ...list[idx], userId: input.userId };
      }
    } else {
      list.push({
        leagueCode: code,
        deviceId: cleanDevice,
        userId: input.userId ?? null,
        joinedAt: new Date().toISOString(),
      });
    }
    membersMap.set(code, list);
    return league;
  }

  await ensureSchema();
  const pool = getPool();
  const leagueRes = await pool.query<{
    code: string;
    name: string;
    creator_device_id: string;
    created_at: Date | string;
  }>(
    `SELECT code, name, creator_device_id, created_at
     FROM friend_leagues
     WHERE code = $1
     LIMIT 1`,
    [code]
  );
  const leagueRow = leagueRes.rows[0];
  if (!leagueRow) return null;

  await ensureMemberProfileExists({
    deviceId: cleanDevice,
    userId: input.userId ?? null,
    username: input.username,
  });

  await pool.query(
    `INSERT INTO friend_league_members (league_code, device_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (league_code, device_id) DO UPDATE SET
       user_id = COALESCE(friend_league_members.user_id, EXCLUDED.user_id)`,
    [code, cleanDevice, input.userId ?? null]
  );

  return {
    code: leagueRow.code,
    name: leagueRow.name,
    creatorDeviceId: leagueRow.creator_device_id,
    createdAt:
      leagueRow.created_at instanceof Date
        ? leagueRow.created_at.toISOString()
        : String(leagueRow.created_at),
  };
}

export async function getFriendLeagueBoard(input: {
  code: string;
  viewerDeviceId?: string | null;
  viewerUserId?: string | null;
  viewerLinkedDeviceIds?: string[];
}): Promise<{
  league: FriendLeagueRecord;
  entries: FriendLeagueMemberEntry[];
} | null> {
  const code = normalizeLeagueCode(input.code);
  if (!isValidLeagueCode(code)) return null;

  const cleanViewerDevice = isValidDeviceId(input.viewerDeviceId)
    ? input.viewerDeviceId!.trim().slice(0, 128)
    : '';
  const linkedSet = new Set(input.viewerLinkedDeviceIds ?? []);

  interface RawMemberRow {
    deviceId: string;
    userId: string | null;
    name: string;
    weeklyXp: number;
    xp: number;
    streak: number;
    joinedAt: string;
  }

  let league: FriendLeagueRecord;
  let rawMembers: RawMemberRow[];

  if (!hasDatabaseUrl()) {
    const foundLeague = getMemoryLeaguesMap().get(code) ?? null;
    if (!foundLeague) return null;
    league = foundLeague;
    const members = getMemoryLeagueMembersMap().get(code) ?? [];
    const profiles = getMemoryProfileMap();
    rawMembers = members.map((m) => {
      const prof = profiles.get(m.deviceId);
      const userId = prof?.userId || m.userId || null;
      const weeklyXp = prof ? (prof.weeklyXp > 0 ? prof.weeklyXp : prof.xp) : 0;
      return {
        deviceId: m.deviceId,
        userId,
        name: sanitizeDisplayText(prof?.username || 'Merak Kâşifi', 28) || 'Merak Kâşifi',
        weeklyXp,
        xp: prof?.xp ?? 0,
        streak: prof?.streak ?? 0,
        joinedAt: m.joinedAt,
      };
    });
  } else {
    await ensureSchema();
    const pool = getPool();
    const leagueRes = await pool.query<{
      code: string;
      name: string;
      creator_device_id: string;
      created_at: Date | string;
    }>(
      `SELECT code, name, creator_device_id, created_at
       FROM friend_leagues
       WHERE code = $1
       LIMIT 1`,
      [code]
    );
    const leagueRow = leagueRes.rows[0];
    if (!leagueRow) return null;

    league = {
      code: leagueRow.code,
      name: leagueRow.name,
      creatorDeviceId: leagueRow.creator_device_id,
      createdAt:
        leagueRow.created_at instanceof Date
          ? leagueRow.created_at.toISOString()
          : String(leagueRow.created_at),
    };

    const membersRes = await pool.query<{
      device_id: string;
      resolved_user_id: string | null;
      username: string | null;
      xp: number;
      weekly_xp: number;
      streak: number;
      joined_at: Date | string;
    }>(
      `SELECT
         m.device_id,
         COALESCE(m.user_id, p.user_id) AS resolved_user_id,
         COALESCE(NULLIF(TRIM(u.nickname), ''), NULLIF(TRIM(p.username), ''), 'Merak Kâşifi') AS username,
         GREATEST(COALESCE(p.xp, 0), COALESCE(u.xp, 0))::INT AS xp,
         GREATEST(
           CASE WHEN COALESCE(p.weekly_xp, 0) > 0 THEN COALESCE(p.weekly_xp, 0) ELSE COALESCE(p.xp, 0) END,
           CASE WHEN COALESCE(u.weekly_xp, 0) > 0 THEN COALESCE(u.weekly_xp, 0) ELSE COALESCE(u.xp, 0) END
         )::INT AS weekly_xp,
         GREATEST(COALESCE(p.streak, 0), COALESCE(u.streak, 0))::INT AS streak,
         m.joined_at
       FROM friend_league_members m
       LEFT JOIN profiles p ON p.device_id = m.device_id
       LEFT JOIN users u ON u.id = COALESCE(m.user_id, p.user_id)
       WHERE m.league_code = $1`,
      [code]
    );

    rawMembers = membersRes.rows.map((r) => ({
      deviceId: r.device_id,
      userId: r.resolved_user_id || null,
      name: sanitizeDisplayText(r.username || 'Merak Kâşifi', 28) || 'Merak Kâşifi',
      weeklyXp: Math.max(0, Number(r.weekly_xp) || 0),
      xp: Math.max(0, Number(r.xp) || 0),
      streak: Math.max(0, Number(r.streak) || 0),
      joinedAt: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
    }));
  }

  // Deduplicate authenticated users across multiple devices within the same league
  const byIdentity = new Map<string, RawMemberRow>();
  for (const row of rawMembers) {
    const key = row.userId ? `u:${row.userId}` : `d:${row.deviceId}`;
    const prev = byIdentity.get(key);
    if (!prev) {
      byIdentity.set(key, row);
      continue;
    }
    const rowWins =
      row.weeklyXp > prev.weeklyXp ||
      (row.weeklyXp === prev.weeklyXp &&
        (row.xp > prev.xp || (cleanViewerDevice && row.deviceId === cleanViewerDevice)));
    if (rowWins) {
      byIdentity.set(key, row);
    }
  }

  const sorted = Array.from(byIdentity.values()).sort(
    (a, b) =>
      b.weeklyXp - a.weeklyXp ||
      b.xp - a.xp ||
      b.streak - a.streak ||
      a.joinedAt.localeCompare(b.joinedAt)
  );

  const entries: FriendLeagueMemberEntry[] = sorted.map((row, idx) => {
    const isUser = Boolean(
      (cleanViewerDevice && row.deviceId === cleanViewerDevice) ||
        (input.viewerUserId && row.userId === input.viewerUserId) ||
        linkedSet.has(row.deviceId)
    );
    const opaqueId = isUser ? row.deviceId : computeOpaquePublicLeaderboardId(row.deviceId);
    return {
      id: opaqueId,
      rank: idx + 1,
      name: row.name,
      avatar: pickAvatarForMember(opaqueId),
      weeklyXp: row.weeklyXp,
      xp: row.xp,
      streak: row.streak,
      isUser,
      joinedAt: row.joinedAt,
    };
  });

  return { league, entries };
}

export async function listUserFriendLeagues(input: {
  deviceId?: string | null;
  userId?: string | null;
}): Promise<FriendLeagueSummary[]> {
  const cleanDevice = isValidDeviceId(input.deviceId)
    ? input.deviceId!.trim().slice(0, 128)
    : '';
  const userId = input.userId || null;
  if (!cleanDevice && !userId) return [];

  if (!hasDatabaseUrl()) {
    const leagues = getMemoryLeaguesMap();
    const membersMap = getMemoryLeagueMembersMap();
    const result: FriendLeagueSummary[] = [];
    for (const [code, members] of membersMap.entries()) {
      const mine = members.find(
        (m) => (cleanDevice && m.deviceId === cleanDevice) || (userId && m.userId === userId)
      );
      if (!mine) continue;
      const league = leagues.get(code);
      if (!league) continue;
      result.push({
        code,
        name: league.name,
        memberCount: members.length,
        joinedAt: mine.joinedAt,
      });
    }
    return result.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<{
    code: string;
    name: string;
    member_count: number;
    joined_at: Date | string;
  }>(
    `SELECT
       fl.code,
       fl.name,
       COUNT(all_m.device_id)::INT AS member_count,
       MAX(mine.joined_at) AS joined_at
     FROM friend_league_members mine
     INNER JOIN friend_leagues fl ON fl.code = mine.league_code
     INNER JOIN friend_league_members all_m ON all_m.league_code = fl.code
     WHERE ($1 <> '' AND mine.device_id = $1)
        OR ($2::text IS NOT NULL AND mine.user_id = $2)
     GROUP BY fl.code, fl.name
     ORDER BY MAX(mine.joined_at) DESC`,
    [cleanDevice, userId]
  );

  return res.rows.map((r) => ({
    code: r.code,
    name: r.name,
    memberCount: Math.max(1, Number(r.member_count) || 1),
    joinedAt: r.joined_at instanceof Date ? r.joined_at.toISOString() : String(r.joined_at),
  }));
}
