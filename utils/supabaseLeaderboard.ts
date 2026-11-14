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
      entries: assignRanksAndZones([myFallbackRow]),
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
        entries: assignRanksAndZones([myFallbackRow]),
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
        entries: assignRanksAndZones([myFallbackRow]),
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
      entries: assignRanksAndZones(mapped),
      isLiveSupabase: isPostgresLive,
      isLiveBackend: isPostgresLive,
    };
  } catch {
    return {
      entries: assignRanksAndZones([myFallbackRow]),
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
