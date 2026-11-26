import { LEAGUE_SHIELD_MAP, type LeagueTierId } from '@/utils/icons8Assets';
import { getOrCreateDeviceId } from '@/lib/telemetry';
import {
  deriveExplorerTagFromId,
  isLegacyUntaggedOrTag42Nickname,
} from '@/utils/userMemory';

export type LeaderboardTab = 'daily' | 'weekly' | 'alltime';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isUser: boolean;
  zone: 'promotion' | 'neutral' | 'relegation';
  leagueId?: LeagueTierId;
}

export interface LeaderboardFetchResult {
  entries: LeaderboardEntry[];
  isLiveSupabase: boolean;
  isLiveBackend: boolean;
}

export interface WeeklyLeagueTierMeta {
  id: LeagueTierId;
  minXp: number;
  shieldIcon: string;
  label: { tr: string; en: string };
}

export const WEEKLY_LEAGUE_TIERS: WeeklyLeagueTierMeta[] = [
  {
    id: 'bronze',
    minXp: 0,
    shieldIcon: LEAGUE_SHIELD_MAP.bronze,
    label: { tr: 'Bronz Kaşif', en: 'Bronze Explorer' },
  },
  {
    id: 'silver',
    minXp: 400,
    shieldIcon: LEAGUE_SHIELD_MAP.silver,
    label: { tr: 'Gümüş Meraklı', en: 'Silver Curious' },
  },
  {
    id: 'gold',
    minXp: 1000,
    shieldIcon: LEAGUE_SHIELD_MAP.gold,
    label: { tr: 'Altın Bilgin', en: 'Gold Scholar' },
  },
  {
    id: 'platinum',
    minXp: 1800,
    shieldIcon: LEAGUE_SHIELD_MAP.platinum,
    label: { tr: 'Platin Deha', en: 'Platinum Genius' },
  },
  {
    id: 'diamond',
    minXp: 2800,
    shieldIcon: LEAGUE_SHIELD_MAP.diamond,
    label: { tr: 'Elmas Üstat', en: 'Diamond Grandmaster' },
  },
];

export function isSupabaseConfigured(): boolean {
  return true;
}

function avatarForScore(xp: number, streak: number): string {
  if (xp >= 2800) return '💎';
  if (xp >= 1800) return '💠';
  if (xp >= 1000) return '🥇';
  if (streak >= 5) return '🔥';
  return '🧠';
}

const DISTINCT_EXPLORER_ALIASES = [
  'NovaKaşif',
  'Kuantumİzci',
  'KozmikBilgin',
  'VeriGezgini',
  'FotonAvcısı',
  'NöronYolcu',
  'AtomGözcü',
  'YıldızAnalist',
  'GalaksiYolcusu',
  'EvrenGözlemci',
  'Kutupİzci',
  'BulutsuGezgin',
  'OrbitalBilgin',
  'ZamanAnalist',
  'BiyomKaşif',
  'Spektrumİzci',
  'AstroMerak',
  'DerinVeri',
] as const;

type UnrankedLeaderboardRow = Omit<LeaderboardEntry, 'rank' | 'zone'>;

function buildUniqueExplorerAlias(
  rowId: string,
  rowIndex: number,
  usedNames: Set<string>
): string {
  const baseTag = deriveExplorerTagFromId(`${rowId}:${rowIndex}`);
  const startIdx = (baseTag + rowIndex) % DISTINCT_EXPLORER_ALIASES.length;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const alias =
      DISTINCT_EXPLORER_ALIASES[(startIdx + attempt) % DISTINCT_EXPLORER_ALIASES.length];
    const tag =
      attempt === 0
        ? baseTag
        : deriveExplorerTagFromId(`${rowId}:${rowIndex}:${attempt}`);
    const candidate = `${alias} #${tag}`;
    if (!usedNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `Kaşif #${baseTag}-${rowIndex + 1}`;
}

function buildUniqueCustomName(
  baseName: string,
  rowId: string,
  rowIndex: number,
  usedNames: Set<string>
): string {
  const trimmed = baseName.trim().slice(0, 20);
  if (trimmed && !usedNames.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const tag = deriveExplorerTagFromId(`${rowId}:${rowIndex}:${attempt}`);
    const candidate = `${trimmed || 'Kaşif'} #${tag}`;
    if (!usedNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return buildUniqueExplorerAlias(rowId, rowIndex, usedNames);
}

function resolveViewerNickname(rawName: string, rowId: string): string {
  const clean = rawName.trim().slice(0, 24);
  if (clean && !isLegacyUntaggedOrTag42Nickname(clean)) {
    return clean;
  }
  const tag = deriveExplorerTagFromId(rowId);
  const useEnglishPrefix = /curiosity|explorer/i.test(clean);
  return useEnglishPrefix ? `Curiosity Explorer #${tag}` : `Merak Kaşifi #${tag}`;
}

/**
 * Aggressively deduplicates leaderboard rows by ID and case-insensitive name so
 * legacy generic names like `Curiosity Explorer #42` / `Merak Kaşifi #42` never repeat.
 */
export function deduplicateLeaderboardRows(
  rows: UnrankedLeaderboardRow[],
  fallbackDeviceId = 'local-device'
): UnrankedLeaderboardRow[] {
  const byId = new Map<string, UnrankedLeaderboardRow>();
  for (const row of rows) {
    const id = String(row.id || '').trim() || `anon-${byId.size}`;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { ...row, id });
      continue;
    }
    const pickIncoming =
      (row.isUser && !existing.isUser) ||
      (row.isUser === existing.isUser && row.score > existing.score);
    if (pickIncoming) {
      byId.set(id, { ...row, id });
    }
  }

  const dedupedById = Array.from(byId.values());
  const usedNames = new Set<string>();
  const resolved = new Map<string, UnrankedLeaderboardRow>();

  // Reserve viewer row(s) first so the active user's own name never gets altered by NPC/DB duplicates
  for (const row of dedupedById) {
    if (!row.isUser) continue;
    const viewerName = resolveViewerNickname(row.name || '', row.id || fallbackDeviceId);
    const uniqueName = !usedNames.has(viewerName.toLowerCase())
      ? viewerName
      : buildUniqueCustomName(viewerName, row.id || fallbackDeviceId, 0, usedNames);
    usedNames.add(uniqueName.toLowerCase());
    resolved.set(row.id, { ...row, name: uniqueName });
  }

  const nonUsers = dedupedById
    .filter((row) => !row.isUser)
    .sort((a, b) => b.score - a.score || b.streak - a.streak || a.id.localeCompare(b.id));

  nonUsers.forEach((row, idx) => {
    const rawName = (row.name || '').trim();
    const isGeneric = !rawName || isLegacyUntaggedOrTag42Nickname(rawName);

    let finalName: string;
    if (isGeneric) {
      finalName = buildUniqueExplorerAlias(row.id, idx, usedNames);
    } else if (!usedNames.has(rawName.toLowerCase())) {
      finalName = rawName;
    } else {
      finalName = buildUniqueCustomName(rawName, row.id, idx, usedNames);
    }

    usedNames.add(finalName.toLowerCase());
    resolved.set(row.id, { ...row, name: finalName });
  });

  return dedupedById.map((row) => resolved.get(row.id) ?? row);
}

function assignRanksAndZones(rows: Omit<LeaderboardEntry, 'rank' | 'zone'>[]): LeaderboardEntry[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score || b.streak - a.streak);
  const total = sorted.length;
  return sorted.map((entry, idx) => {
    const rank = idx + 1;
    let zone: LeaderboardEntry['zone'] = 'neutral';
    if (rank <= 10) {
      zone = 'promotion';
    } else if (total >= 15 && rank > total - 5) {
      zone = 'relegation';
    }
    return {
      ...entry,
      rank,
      zone,
    };
  });
}

export async function fetchLeaderboardEntries(
  tab: LeaderboardTab,
  nickname: string,
  userXp: number,
  weeklyXp: number,
  dailyBestScore: number,
  streakDays: number
): Promise<LeaderboardFetchResult> {
  const myDeviceId = typeof window !== 'undefined' ? getOrCreateDeviceId() : 'local-device';
  const myScore =
    tab === 'daily'
      ? dailyBestScore
      : tab === 'weekly'
        ? Math.max(weeklyXp, userXp)
        : userXp;

  const myFallbackRow: Omit<LeaderboardEntry, 'rank' | 'zone'> = {
    id: myDeviceId,
    name: resolveViewerNickname(nickname || '', myDeviceId),
    avatar: avatarForScore(userXp, streakDays),
    score: Math.max(0, Math.floor(myScore)),
    streak: Math.max(0, Math.floor(streakDays)),
    isUser: true,
  };

  if (typeof window === 'undefined') {
    return {
      entries: assignRanksAndZones(
        deduplicateLeaderboardRows([myFallbackRow], myDeviceId)
      ),
      isLiveSupabase: false,
      isLiveBackend: false,
    };
  }

  try {
    const res = await fetch(
      `/api/leaderboard?tab=${encodeURIComponent(tab)}&deviceId=${encodeURIComponent(myDeviceId)}`,
      { cache: 'no-store', credentials: 'same-origin' }
    );

    if (!res.ok) {
      return {
        entries: assignRanksAndZones(
          deduplicateLeaderboardRows([myFallbackRow], myDeviceId)
        ),
        isLiveSupabase: false,
        isLiveBackend: false,
      };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      source?: 'postgres' | 'local';
      entries?: Array<{
        deviceId: string;
        isCurrentUser?: boolean;
        username: string;
        score: number;
        xp: number;
        weeklyXp: number;
        streak: number;
      }>;
    };

    const serverRows = Array.isArray(json.entries) ? json.entries : [];
    const isPostgresLive = json.source === 'postgres';

    if (serverRows.length === 0) {
      return {
        entries: assignRanksAndZones(
          deduplicateLeaderboardRows([myFallbackRow], myDeviceId)
        ),
        isLiveSupabase: isPostgresLive,
        isLiveBackend: isPostgresLive,
      };
    }

    const mapped: Omit<LeaderboardEntry, 'rank' | 'zone'>[] = serverRows.map((row) => {
      const isMe =
        typeof row.isCurrentUser === 'boolean' ? row.isCurrentUser : row.deviceId === myDeviceId;
      const rowXp = Number(row.xp || row.score || 0);
      const parsedStreak = Number(row.streak ?? 0);
      const rowStreak = Number.isFinite(parsedStreak) ? Math.max(0, Math.floor(parsedStreak)) : 0;
      return {
        id: row.deviceId,
        name: isMe ? myFallbackRow.name : (row.username || '').trim(),
        avatar: avatarForScore(isMe ? userXp : rowXp, rowStreak),
        score: isMe ? Math.max(myFallbackRow.score, Number(row.score || 0)) : Math.max(0, Number(row.score || 0)),
        streak: isMe ? Math.max(myFallbackRow.streak, rowStreak) : rowStreak,
        isUser: isMe,
      };
    });

    if (!mapped.some((e) => e.isUser)) {
      mapped.push(myFallbackRow);
    }

    return {
      entries: assignRanksAndZones(
        deduplicateLeaderboardRows(mapped, myDeviceId)
      ),
      isLiveSupabase: isPostgresLive,
      isLiveBackend: isPostgresLive,
    };
  } catch {
    return {
      entries: assignRanksAndZones(
        deduplicateLeaderboardRows([myFallbackRow], myDeviceId)
      ),
      isLiveSupabase: false,
      isLiveBackend: false,
    };
  }
}

export async function submitQuizScoreToLeaderboard(params: {
  playerId?: string;
  nickname?: string;
  username?: string;
  quizMode?: 'daily' | 'weekly' | 'memory' | 'duel';
  mode?: 'daily' | 'weekly' | 'memory' | 'duel';
  score: number;
  durationSec?: number;
  correctCount: number;
  questionCount?: number;
  totalQuestions?: number;
  answers?: boolean[];
}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const deviceId = getOrCreateDeviceId();
    const safeUsername = resolveViewerNickname(
      params.username || params.nickname || '',
      deviceId
    );
    await fetch('/api/leaderboard', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        username: safeUsername,
        mode: params.mode || params.quizMode || 'daily',
        score: params.score,
        correctCount: params.correctCount,
        totalQuestions: params.totalQuestions || params.questionCount || 1,
        ...(typeof params.durationSec === 'number' ? { durationSec: params.durationSec } : {}),
        ...(Array.isArray(params.answers) ? { answers: params.answers } : {}),
      }),
    });
  } catch {
    // Non-blocking telemetry failure; local memory persists anyway
  }
}

export function subscribeLeaderboardRealtime(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const timer = window.setInterval(onUpdate, 12_000);
  return () => {
    window.clearInterval(timer);
  };
}
