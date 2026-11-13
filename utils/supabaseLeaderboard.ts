import type { Language } from '@/i18n/translations';
import { LEAGUE_SHIELD_MAP, type LeagueTierId } from '@/utils/icons8Assets';

export type LeaderboardTab = 'daily' | 'weekly' | 'alltime';
export type { LeagueTierId };

export interface WeeklyLeagueTierMeta {
  id: LeagueTierId;
  emoji: string;
  shieldIcon: string;
  minXp: number;
  maxXp: number | null;
  label: Record<Language, string>;
  badgeGradient: string;
}

export const WEEKLY_LEAGUE_TIERS: WeeklyLeagueTierMeta[] = [
  {
    id: 'bronze',
    emoji: '🥉',
    shieldIcon: LEAGUE_SHIELD_MAP.bronze,
    minXp: 0,
    maxXp: 399,
    label: { tr: 'Bronz Kaşif', en: 'Bronze Explorer' },
    badgeGradient: 'from-orange-200 to-amber-100 text-orange-950 border-orange-300',
  },
  {
    id: 'silver',
    emoji: '🥈',
    shieldIcon: LEAGUE_SHIELD_MAP.silver,
    minXp: 400,
    maxXp: 999,
    label: { tr: 'Gümüş Meraklı', en: 'Silver Curious' },
    badgeGradient: 'from-slate-200 to-zinc-100 text-slate-900 border-slate-300',
  },
  {
    id: 'gold',
    emoji: '🥇',
    shieldIcon: LEAGUE_SHIELD_MAP.gold,
    minXp: 1000,
    maxXp: 1799,
    label: { tr: 'Altın Bilgin', en: 'Gold Scholar' },
    badgeGradient: 'from-amber-200 to-yellow-100 text-amber-950 border-amber-300',
  },
  {
    id: 'platinum',
    emoji: '💠',
    shieldIcon: LEAGUE_SHIELD_MAP.platinum,
    minXp: 1800,
    maxXp: 2799,
    label: { tr: 'Platin Deha', en: 'Platinum Genius' },
    badgeGradient: 'from-cyan-200 to-teal-100 text-cyan-950 border-cyan-300',
  },
  {
    id: 'diamond',
    emoji: '💎',
    shieldIcon: LEAGUE_SHIELD_MAP.diamond,
    minXp: 2800,
    maxXp: null,
    label: { tr: 'Elmas Üstat', en: 'Diamond Grandmaster' },
    badgeGradient: 'from-violet-200 to-sky-100 text-violet-950 border-violet-300',
  },
];

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isUser: boolean;
  zone: 'promotion' | 'safe' | 'relegation';
}

const LOCAL_PEERS = [
  { id: 'p1', name: 'AstroZeynep', avatar: '🚀', baseAll: 3420, baseWeekly: 1180, baseDaily: 920, streak: 14 },
  { id: 'p2', name: 'KuantumMert', avatar: '⚛️', baseAll: 2940, baseWeekly: 1040, baseDaily: 860, streak: 11 },
  { id: 'p3', name: 'BioLuna', avatar: '🧬', baseAll: 2510, baseWeekly: 920, baseDaily: 810, streak: 9 },
  { id: 'p4', name: 'OrionAda', avatar: '🪐', baseAll: 2150, baseWeekly: 830, baseDaily: 770, streak: 8 },
  { id: 'p5', name: 'DoğaKaşifi', avatar: '🌿', baseAll: 1860, baseWeekly: 760, baseDaily: 720, streak: 7 },
  { id: 'p6', name: 'ZamanKaan', avatar: '🏛️', baseAll: 1620, baseWeekly: 680, baseDaily: 680, streak: 6 },
  { id: 'p7', name: 'CurioMax', avatar: '⚡', baseAll: 1380, baseWeekly: 610, baseDaily: 640, streak: 5 },
  { id: 'p8', name: 'NovaEge', avatar: '🌌', baseAll: 1140, baseWeekly: 540, baseDaily: 590, streak: 4 },
  { id: 'p9', name: 'AtomElif', avatar: '🔬', baseAll: 960, baseWeekly: 490, baseDaily: 540, streak: 5 },
  { id: 'p10', name: 'SputnikCan', avatar: '🛰️', baseAll: 820, baseWeekly: 430, baseDaily: 495, streak: 3 },
  { id: 'p11', name: 'VegaDeniz', avatar: '✨', baseAll: 680, baseWeekly: 370, baseDaily: 440, streak: 3 },
  { id: 'p12', name: 'HelixNehir', avatar: '🧠', baseAll: 540, baseWeekly: 310, baseDaily: 390, streak: 4 },
  { id: 'p13', name: 'FloraAras', avatar: '🌱', baseAll: 420, baseWeekly: 260, baseDaily: 340, streak: 2 },
  { id: 'p14', name: 'KronoMasal', avatar: '⏳', baseAll: 340, baseWeekly: 215, baseDaily: 310, streak: 2 },
  { id: 'p15', name: 'PulsarUraz', avatar: '💫', baseAll: 260, baseWeekly: 170, baseDaily: 265, streak: 2 },
  { id: 'p16', name: 'NebulaPera', avatar: '🌙', baseAll: 190, baseWeekly: 130, baseDaily: 210, streak: 1 },
  { id: 'p17', name: 'FotonBora', avatar: '🔆', baseAll: 145, baseWeekly: 95, baseDaily: 175, streak: 1 },
  { id: 'p18', name: 'DinoIpek', avatar: '🦕', baseAll: 110, baseWeekly: 70, baseDaily: 140, streak: 1 },
  { id: 'p19', name: 'OrbitAlp', avatar: '🛸', baseAll: 75, baseWeekly: 45, baseDaily: 110, streak: 1 },
];

export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_SUPABASE_URL &&
      process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function assignZones(
  rows: Array<Omit<LeaderboardEntry, 'rank' | 'zone'>>
): LeaderboardEntry[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const total = sorted.length;
  return sorted.map((row, idx) => {
    const rank = idx + 1;
    let zone: LeaderboardEntry['zone'] = 'safe';
    if (rank <= 10) {
      zone = 'promotion';
    } else if (rank > total - 5) {
      zone = 'relegation';
    }
    return {
      ...row,
      rank,
      zone,
    };
  });
}

export async function fetchLeaderboardEntries(
  tab: LeaderboardTab,
  userNickname: string,
  userTotalXp: number,
  userWeeklyXp: number,
  userDailyScore: number,
  streakDays: number
): Promise<{ entries: LeaderboardEntry[]; isLiveSupabase: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const orderColumn =
        tab === 'daily'
          ? 'daily_sprint_score'
          : tab === 'weekly'
          ? 'weekly_xp'
          : 'xp';
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/players?select=id,nickname,xp,weekly_xp,daily_sprint_score,streak_days&order=${orderColumn}.desc&limit=25`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (resp.ok) {
        const data = (await resp.json()) as Array<{
          id: string;
          nickname: string;
          xp: number;
          weekly_xp: number;
          daily_sprint_score: number;
          streak_days: number;
        }>;

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((row) => ({
            id: row.id,
            name: row.nickname,
            avatar: '⚡',
            score:
              tab === 'daily'
                ? row.daily_sprint_score
                : tab === 'weekly'
                ? row.weekly_xp
                : row.xp,
            streak: row.streak_days,
            isUser: row.nickname === userNickname,
          }));

          return {
            entries: assignZones(mapped),
            isLiveSupabase: true,
          };
        }
      }
    } catch {
      // Fall back gracefully to local dynamic leaderboard
    }
  }

  const userScore =
    tab === 'daily' ? userDailyScore : tab === 'weekly' ? userWeeklyXp : userTotalXp;

  const userRow: Omit<LeaderboardEntry, 'rank' | 'zone'> = {
    id: 'current-user',
    name: userNickname,
    avatar: '🧠',
    score: userScore,
    streak: streakDays,
    isUser: true,
  };

  const peers: Array<Omit<LeaderboardEntry, 'rank' | 'zone'>> = LOCAL_PEERS.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: tab === 'daily' ? p.baseDaily : tab === 'weekly' ? p.baseWeekly : p.baseAll,
    streak: p.streak,
    isUser: false,
  }));

  return {
    entries: assignZones([...peers, userRow]),
    isLiveSupabase: false,
  };
}

export async function submitQuizScoreToLeaderboard(params: {
  playerId: string;
  nickname: string;
  quizMode: 'daily' | 'weekly' | 'memory' | 'duel';
  score: number;
  durationSec: number;
  correctCount: number;
  questionCount: number;
}): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_quiz_score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        p_player_id: params.playerId,
        p_nickname: params.nickname,
        p_quiz_mode: params.quizMode,
        p_score: params.score,
        p_duration_sec: Math.max(2, params.durationSec),
        p_correct_count: params.correctCount,
        p_question_count: params.questionCount,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function subscribeLeaderboardRealtime(onUpdate: () => void): () => void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || typeof window === 'undefined') {
    return () => {};
  }

  // Lightweight polling / focus refresh when Supabase REST is enabled without full SDK overhead
  const interval = window.setInterval(onUpdate, 15000);
  return () => window.clearInterval(interval);
}
