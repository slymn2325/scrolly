import { LEAGUE_SHIELD_MAP, type LeagueTierId } from '@/utils/icons8Assets';
import { getOrCreateDeviceId } from '@/lib/telemetry';

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

const TARGET_LEAGUE_PLAYER_COUNT = 18;

interface SeededExplorerTemplate {
  id: string;
  name: string;
  streak: number;
  dailyScore: number;
  weeklyScore: number;
  alltimeScore: number;
}

const SEEDED_EXPLORER_POOL: SeededExplorerTemplate[] = [
  { id: 'npc-ada-kozmos', name: 'AstronomAda', streak: 14, dailyScore: 520, weeklyScore: 2250, alltimeScore: 3650 },
  { id: 'npc-atlas-evren', name: 'EvrenAtlas', streak: 11, dailyScore: 445, weeklyScore: 1890, alltimeScore: 3120 },
  { id: 'npc-deniz-kuantum', name: 'KuantumDeniz', streak: 9, dailyScore: 390, weeklyScore: 1580, alltimeScore: 2680 },
  { id: 'npc-selin-veri', name: 'VeriKahiniSelin', streak: 8, dailyScore: 345, weeklyScore: 1340, alltimeScore: 2290 },
  { id: 'npc-ege-biyolog', name: 'BiyologEge', streak: 7, dailyScore: 300, weeklyScore: 1120, alltimeScore: 1920 },
  { id: 'npc-mert-tarih', name: 'TarihMert', streak: 6, dailyScore: 260, weeklyScore: 940, alltimeScore: 1590 },
  { id: 'npc-elif-botanik', name: 'BotanikElif', streak: 6, dailyScore: 225, weeklyScore: 780, alltimeScore: 1280 },
  { id: 'npc-kerem-noron', name: 'NöronKerem', streak: 5, dailyScore: 190, weeklyScore: 640, alltimeScore: 1020 },
  { id: 'npc-nehir-kutup', name: 'KutupNehir', streak: 4, dailyScore: 160, weeklyScore: 510, alltimeScore: 810 },
  { id: 'npc-arda-foton', name: 'FotonArda', streak: 4, dailyScore: 135, weeklyScore: 405, alltimeScore: 620 },
  { id: 'npc-duru-galaksi', name: 'GalaksiDuru', streak: 3, dailyScore: 110, weeklyScore: 320, alltimeScore: 460 },
  { id: 'npc-can-genetik', name: 'GenetikCan', streak: 3, dailyScore: 90, weeklyScore: 245, alltimeScore: 340 },
  { id: 'npc-zeynep-arkeo', name: 'ArkeoZeynep', streak: 2, dailyScore: 70, weeklyScore: 185, alltimeScore: 240 },
  { id: 'npc-emre-kozmos', name: 'KozmosEmre', streak: 2, dailyScore: 50, weeklyScore: 130, alltimeScore: 170 },
  { id: 'npc-defne-okyanus', name: 'OkyanusDefne', streak: 2, dailyScore: 35, weeklyScore: 85, alltimeScore: 115 },
  { id: 'npc-bora-istatistik', name: 'VeriBora', streak: 1, dailyScore: 25, weeklyScore: 55, alltimeScore: 75 },
  { id: 'npc-asya-atom', name: 'AtomAsya', streak: 1, dailyScore: 15, weeklyScore: 30, alltimeScore: 45 },
  { id: 'npc-kaan-fosil', name: 'FosilKaan', streak: 1, dailyScore: 5, weeklyScore: 10, alltimeScore: 15 },
];

function padLeagueWithSeededExplorers(
  realRows: Omit<LeaderboardEntry, 'rank' | 'zone'>[],
  tab: LeaderboardTab
): Omit<LeaderboardEntry, 'rank' | 'zone'>[] {
  if (realRows.length >= TARGET_LEAGUE_PLAYER_COUNT) {
    return realRows;
  }

  const combined = [...realRows];
  const existingIds = new Set(combined.map((r) => r.id));
  const existingNames = new Set(combined.map((r) => r.name.trim().toLowerCase()));

  // Spread picks across the score curve (top promotion, mid, bottom relegation) even if realRows > 1
  const needed = TARGET_LEAGUE_PLAYER_COUNT - combined.length;
  const available = SEEDED_EXPLORER_POOL.filter(
    (npc) => !existingIds.has(npc.id) && !existingNames.has(npc.name.toLowerCase())
  );

  for (let i = 0; i < Math.min(needed, available.length); i += 1) {
    // Pick balanced indices across Promotion + Neutral + Relegation zones
    const pickIdx =
      needed === available.length
        ? i
        : Math.min(available.length - 1, Math.floor((i * available.length) / needed));
    const npc = available[pickIdx];
    const score =
      tab === 'daily'
        ? npc.dailyScore
        : tab === 'weekly'
          ? npc.weeklyScore
          : npc.alltimeScore;

    if (existingIds.has(npc.id)) continue;
    existingIds.add(npc.id);

    combined.push({
      id: npc.id,
      name: npc.name,
      avatar: avatarForScore(npc.alltimeScore, npc.streak),
      score,
      streak: npc.streak,
      isUser: false,
    });
  }

  return combined;
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
    name: (nickname || 'Merak Kâşifi').trim(),
    avatar: avatarForScore(userXp, streakDays),
    score: Math.max(0, Math.floor(myScore)),
    streak: Math.max(1, Math.floor(streakDays)),
    isUser: true,
  };

  if (typeof window === 'undefined') {
    return {
      entries: assignRanksAndZones(padLeagueWithSeededExplorers([myFallbackRow], tab)),
      isLiveSupabase: false,
      isLiveBackend: false,
    };
  }

  try {
    const res = await fetch(
      `/api/leaderboard?tab=${encodeURIComponent(tab)}&deviceId=${encodeURIComponent(myDeviceId)}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return {
        entries: assignRanksAndZones(padLeagueWithSeededExplorers([myFallbackRow], tab)),
        isLiveSupabase: false,
        isLiveBackend: false,
      };
    }

    const json = (await res.json()) as {
      ok?: boolean;
      source?: 'postgres' | 'local';
      entries?: Array<{
        deviceId: string;
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
        entries: assignRanksAndZones(padLeagueWithSeededExplorers([myFallbackRow], tab)),
        isLiveSupabase: isPostgresLive,
        isLiveBackend: isPostgresLive,
      };
    }

    const mapped: Omit<LeaderboardEntry, 'rank' | 'zone'>[] = serverRows.map((row) => {
      const isMe = row.deviceId === myDeviceId;
      const rowXp = Number(row.xp || row.score || 0);
      const rowStreak = Math.max(1, Number(row.streak || 1));
      return {
        id: row.deviceId,
        name: isMe ? myFallbackRow.name : (row.username || 'Kâşif').trim(),
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
      entries: assignRanksAndZones(padLeagueWithSeededExplorers(mapped, tab)),
      isLiveSupabase: isPostgresLive,
      isLiveBackend: isPostgresLive,
    };
  } catch {
    return {
      entries: assignRanksAndZones(padLeagueWithSeededExplorers([myFallbackRow], tab)),
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
}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const deviceId = getOrCreateDeviceId();
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        username: (params.username || params.nickname || 'Merak Kâşifi').trim(),
        mode: params.mode || params.quizMode || 'daily',
        score: params.score,
        correctCount: params.correctCount,
        totalQuestions: params.totalQuestions || params.questionCount || 1,
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
