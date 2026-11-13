import type { CategoryId, Language } from '@/i18n/translations';
import { LEAGUE_SHIELD_MAP, type LeagueTierId } from '@/utils/icons8Assets';

const LOCAL_STORAGE_KEY = 'merak_user_state_v1';
const COOKIE_NAME = 'merak_user_summary';

export type { LeagueTierId };

export interface UserMemoryState {
  playerId: string;
  nickname: string;
  lang: Language;
  darkMode: boolean;
  xp: number;
  weeklyXp: number;
  dailyBestScore: number;
  lastDailyQuizDate: string;
  highestLeagueId: LeagueTierId;
  notificationsEnabled: boolean;
  seenIds: string[];
  recentFiveIds: string[];
  cardsSinceLastQuiz: number;
  totalSwipes: number;
  favoriteIds: string[];
  categoryWeights: Record<CategoryId, number>;
  streakDays: number;
  lastVisitDate: string;
  badges: string[];
  soundEnabled: boolean;
  cookieAccepted: boolean;
  isReturningUser: boolean;
  rewindsRemaining: number;
  unlimitedRewindsUnlocked: boolean;
}

export interface LeagueInfo {
  id: LeagueTierId;
  label: string;
  emoji: string;
  shieldIcon: string;
  colorClass: string;
  minXp: number;
  nextMinXp: number | null;
}

const LEAGUE_ORDER: Record<LeagueTierId, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

export function getLeagueInfo(xp: number, lang: Language): LeagueInfo {
  if (xp >= 2800) {
    return {
      id: 'diamond',
      label: lang === 'tr' ? 'Elmas Üstat' : 'Diamond Grandmaster',
      emoji: '💎',
      shieldIcon: LEAGUE_SHIELD_MAP.diamond,
      colorClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700',
      minXp: 2800,
      nextMinXp: null,
    };
  }
  if (xp >= 1800) {
    return {
      id: 'platinum',
      label: lang === 'tr' ? 'Platin Deha' : 'Platinum Genius',
      emoji: '💠',
      shieldIcon: LEAGUE_SHIELD_MAP.platinum,
      colorClass: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-700',
      minXp: 1800,
      nextMinXp: 2800,
    };
  }
  if (xp >= 1000) {
    return {
      id: 'gold',
      label: lang === 'tr' ? 'Altın Bilgin' : 'Gold Scholar',
      emoji: '🥇',
      shieldIcon: LEAGUE_SHIELD_MAP.gold,
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
      minXp: 1000,
      nextMinXp: 1800,
    };
  }
  if (xp >= 400) {
    return {
      id: 'silver',
      label: lang === 'tr' ? 'Gümüş Meraklı' : 'Silver Curious',
      emoji: '🥈',
      shieldIcon: LEAGUE_SHIELD_MAP.silver,
      colorClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
      minXp: 400,
      nextMinXp: 1000,
    };
  }
  return {
    id: 'bronze',
    label: lang === 'tr' ? 'Bronz Kaşif' : 'Bronze Explorer',
    emoji: '🥉',
    shieldIcon: LEAGUE_SHIELD_MAP.bronze,
    colorClass: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-700',
    minXp: 0,
    nextMinXp: 400,
  };
}

export function createEmptyWeights(): Record<CategoryId, number> {
  return {
    space: 0,
    nature: 0,
    human_body: 0,
    history: 0,
    science: 0,
    records: 0,
  };
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'tr';
  const lang = (navigator.language || 'en').toLowerCase();
  return lang.startsWith('tr') ? 'tr' : 'en';
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createClientPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultNickname(lang: Language): string {
  return lang === 'tr' ? 'Merak Kaşifi #42' : 'Curiosity Explorer #42';
}

function getYesterdayDateString(): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - 1);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getDefaultUserState(): UserMemoryState {
  const detectedLang = detectBrowserLanguage();
  return {
    playerId: 'local-default-player',
    nickname: getDefaultNickname(detectedLang),
    lang: detectedLang,
    darkMode: false,
    xp: 0,
    weeklyXp: 0,
    dailyBestScore: 0,
    lastDailyQuizDate: '',
    highestLeagueId: 'bronze',
    notificationsEnabled: false,
    seenIds: [],
    recentFiveIds: [],
    cardsSinceLastQuiz: 0,
    totalSwipes: 0,
    favoriteIds: [],
    categoryWeights: createEmptyWeights(),
    streakDays: 1,
    lastVisitDate: getTodayDateString(),
    badges: [],
    soundEnabled: true,
    cookieAccepted: false,
    isReturningUser: false,
    rewindsRemaining: 2,
    unlimitedRewindsUnlocked: false,
  };
}

function normalizeWeights(rawWeights?: Record<string, number>): Record<CategoryId, number> {
  const base = createEmptyWeights();
  if (!rawWeights) return base;
  (Object.keys(base) as CategoryId[]).forEach((k) => {
    if (typeof rawWeights[k] === 'number') {
      base[k] = rawWeights[k];
    }
  });
  if (typeof rawWeights.weird_records === 'number') {
    base.records += rawWeights.weird_records;
  }
  return base;
}

function normalizeBadges(rawBadges?: string[]): string[] {
  if (!Array.isArray(rawBadges)) return [];
  const mapped = rawBadges.map((b) => (b === 'weird_records' ? 'records' : b));
  return Array.from(new Set(mapped));
}

export function loadUserMemory(): UserMemoryState {
  const fallback = getDefaultUserState();
  if (typeof window === 'undefined') return fallback;

  let parsed: Partial<UserMemoryState> | null = null;
  let hadPriorStorage = false;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      parsed = JSON.parse(raw) as Partial<UserMemoryState>;
      hadPriorStorage = true;
    }
  } catch {
    parsed = null;
  }

  if (!parsed) {
    try {
      const cookieRaw = readCookie(COOKIE_NAME);
      if (cookieRaw) {
        parsed = JSON.parse(cookieRaw) as Partial<UserMemoryState>;
        hadPriorStorage = true;
      }
    } catch {
      parsed = null;
    }
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let streakDays = parsed?.streakDays ?? 1;
  const lastVisit = parsed?.lastVisitDate ?? today;

  if (hadPriorStorage && lastVisit !== today) {
    if (lastVisit === yesterday) {
      streakDays = streakDays + 1;
    } else {
      streakDays = 1;
    }
  }

  const resolvedLang: Language =
    parsed?.lang === 'tr' || parsed?.lang === 'en' ? parsed.lang : detectBrowserLanguage();
  const resolvedXp = typeof parsed?.xp === 'number' ? parsed.xp : 0;
  const computedLeague = getLeagueInfo(resolvedXp, resolvedLang).id;
  const savedHighest = parsed?.highestLeagueId;
  const highestLeagueId: LeagueTierId =
    savedHighest && LEAGUE_ORDER[savedHighest] > LEAGUE_ORDER[computedLeague]
      ? savedHighest
      : computedLeague;

  const state: UserMemoryState = {
    playerId:
      typeof parsed?.playerId === 'string' && parsed.playerId !== 'local-default-player'
        ? parsed.playerId
        : createClientPlayerId(),
    nickname:
      typeof parsed?.nickname === 'string' && parsed.nickname.trim()
        ? parsed.nickname.trim().slice(0, 24)
        : getDefaultNickname(resolvedLang),
    lang: resolvedLang,
    darkMode: Boolean(parsed?.darkMode),
    xp: resolvedXp,
    weeklyXp: typeof parsed?.weeklyXp === 'number' ? parsed.weeklyXp : resolvedXp,
    dailyBestScore: typeof parsed?.dailyBestScore === 'number' ? parsed.dailyBestScore : 0,
    lastDailyQuizDate: typeof parsed?.lastDailyQuizDate === 'string' ? parsed.lastDailyQuizDate : '',
    highestLeagueId,
    notificationsEnabled: Boolean(parsed?.notificationsEnabled),
    seenIds: Array.isArray(parsed?.seenIds) ? parsed.seenIds : [],
    recentFiveIds: Array.isArray(parsed?.recentFiveIds) ? parsed.recentFiveIds.slice(-5) : [],
    cardsSinceLastQuiz: typeof parsed?.cardsSinceLastQuiz === 'number' ? parsed.cardsSinceLastQuiz : 0,
    totalSwipes: typeof parsed?.totalSwipes === 'number' ? parsed.totalSwipes : 0,
    favoriteIds: Array.isArray(parsed?.favoriteIds) ? parsed.favoriteIds : [],
    categoryWeights: normalizeWeights(parsed?.categoryWeights as Record<string, number> | undefined),
    streakDays: Math.max(1, streakDays),
    lastVisitDate: today,
    badges: normalizeBadges(parsed?.badges),
    soundEnabled: typeof parsed?.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    cookieAccepted: Boolean(parsed?.cookieAccepted),
    isReturningUser:
      hadPriorStorage && ((parsed?.seenIds?.length ?? 0) > 0 || Boolean(parsed?.isReturningUser)),
    rewindsRemaining:
      typeof parsed?.rewindsRemaining === 'number' ? parsed.rewindsRemaining : 2,
    unlimitedRewindsUnlocked: Boolean(parsed?.unlimitedRewindsUnlocked),
  };

  saveUserMemory(state);
  return state;
}

export function saveUserMemory(state: UserMemoryState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }

  const cookieSummary = {
    lang: state.lang,
    darkMode: state.darkMode,
    xp: state.xp,
    seenIds: state.seenIds.slice(-40),
    categoryWeights: state.categoryWeights,
    streakDays: state.streakDays,
    lastVisitDate: state.lastVisitDate,
    badges: state.badges,
    cookieAccepted: state.cookieAccepted,
    isReturningUser: state.seenIds.length > 0 || state.isReturningUser,
  };

  try {
    writeCookie(COOKIE_NAME, JSON.stringify(cookieSummary), 365);
  } catch {
    // Ignore cookie errors
  }
}

export function addUserXp(state: UserMemoryState, amount: number): UserMemoryState {
  const nextState: UserMemoryState = {
    ...state,
    xp: Math.max(0, state.xp + amount),
  };
  saveUserMemory(nextState);
  return nextState;
}

export function recordCardRead(
  state: UserMemoryState,
  factId: string,
  category: CategoryId
): UserMemoryState {
  const isNew = !state.seenIds.includes(factId);
  const seenIds = isNew ? [...state.seenIds, factId] : state.seenIds;
  const recentFiveIds = [...state.recentFiveIds.filter((id) => id !== factId), factId].slice(-5);

  const nextWeights = {
    ...state.categoryWeights,
    [category]: (state.categoryWeights[category] ?? 0) + 1,
  };

  const xpGain = isNew ? 15 : 5;
  const nextXp = state.xp + xpGain;
  const currentTier = getLeagueInfo(nextXp, state.lang).id;
  const highestLeagueId =
    LEAGUE_ORDER[currentTier] > LEAGUE_ORDER[state.highestLeagueId]
      ? currentTier
      : state.highestLeagueId;

  const nextState: UserMemoryState = {
    ...state,
    xp: nextXp,
    weeklyXp: state.weeklyXp + xpGain,
    highestLeagueId,
    seenIds,
    recentFiveIds,
    cardsSinceLastQuiz: state.cardsSinceLastQuiz + 1,
    totalSwipes: state.totalSwipes + 1,
    categoryWeights: nextWeights,
    isReturningUser: seenIds.length > 0,
  };

  saveUserMemory(nextState);
  return nextState;
}

export function boostCategoryWeight(
  state: UserMemoryState,
  category: CategoryId,
  amount = 1
): UserMemoryState {
  const nextState: UserMemoryState = {
    ...state,
    categoryWeights: {
      ...state.categoryWeights,
      [category]: (state.categoryWeights[category] ?? 0) + amount,
    },
  };
  saveUserMemory(nextState);
  return nextState;
}

export function toggleFavoriteFact(
  state: UserMemoryState,
  factId: string,
  category: CategoryId,
  forceAdd = false
): UserMemoryState {
  const exists = state.favoriteIds.includes(factId);
  if (forceAdd && exists) {
    return state;
  }

  const favoriteIds = exists
    ? state.favoriteIds.filter((id) => id !== factId)
    : [...state.favoriteIds, factId];

  const weightDelta = exists ? 0 : 2;
  const xpDelta = exists ? 0 : 10;
  const nextState: UserMemoryState = {
    ...state,
    xp: state.xp + xpDelta,
    weeklyXp: state.weeklyXp + xpDelta,
    favoriteIds,
    categoryWeights: {
      ...state.categoryWeights,
      [category]: (state.categoryWeights[category] ?? 0) + weightDelta,
    },
  };

  saveUserMemory(nextState);
  return nextState;
}

export function consumeRewind(state: UserMemoryState): UserMemoryState {
  if (state.unlimitedRewindsUnlocked) return state;
  const nextState: UserMemoryState = {
    ...state,
    rewindsRemaining: Math.max(0, state.rewindsRemaining - 1),
  };
  saveUserMemory(nextState);
  return nextState;
}

export function unlockUnlimitedRewinds(state: UserMemoryState): UserMemoryState {
  const nextState: UserMemoryState = {
    ...state,
    unlimitedRewindsUnlocked: true,
    rewindsRemaining: 99,
  };
  saveUserMemory(nextState);
  return nextState;
}

export function getTopCategory(weights: Record<CategoryId, number>): CategoryId | null {
  let topCat: CategoryId | null = null;
  let maxScore = 0;

  (Object.keys(weights) as CategoryId[]).forEach((cat) => {
    if (weights[cat] > maxScore) {
      maxScore = weights[cat];
      topCat = cat;
    }
  });

  return maxScore > 0 ? topCat : null;
}

export function updateUserNickname(state: UserMemoryState, nickname: string): UserMemoryState {
  const clean = nickname.trim().slice(0, 24) || getDefaultNickname(state.lang);
  const nextState: UserMemoryState = {
    ...state,
    nickname: clean,
  };
  saveUserMemory(nextState);
  return nextState;
}

export function toggleUserNotifications(state: UserMemoryState): UserMemoryState {
  const nextState: UserMemoryState = {
    ...state,
    notificationsEnabled: !state.notificationsEnabled,
  };
  saveUserMemory(nextState);
  return nextState;
}

export function completeMemoryQuiz(
  state: UserMemoryState,
  earnedBadgeId: string,
  earnedXp = 0,
  quizMode: 'memory' | 'daily' | 'weekly' | 'duel' = 'memory'
): UserMemoryState {
  const normalizedBadge = earnedBadgeId === 'weird_records' ? 'records' : earnedBadgeId;
  const badges = state.badges.includes(normalizedBadge)
    ? state.badges
    : [...state.badges, normalizedBadge];

  const nextXp = state.xp + earnedXp;
  const nextWeeklyXp = state.weeklyXp + earnedXp;
  const currentTier = getLeagueInfo(nextXp, state.lang).id;
  const highestLeagueId =
    LEAGUE_ORDER[currentTier] > LEAGUE_ORDER[state.highestLeagueId]
      ? currentTier
      : state.highestLeagueId;

  const today = getTodayDateString();
  const nextState: UserMemoryState = {
    ...state,
    xp: nextXp,
    weeklyXp: nextWeeklyXp,
    highestLeagueId,
    dailyBestScore:
      quizMode === 'daily' ? Math.max(state.dailyBestScore, earnedXp) : state.dailyBestScore,
    lastDailyQuizDate: quizMode === 'daily' ? today : state.lastDailyQuizDate,
    cardsSinceLastQuiz: 0,
    badges,
  };
  saveUserMemory(nextState);
  return nextState;
}

export function resetUserMemory(): UserMemoryState {
  const fresh = getDefaultUserState();
  fresh.cookieAccepted = true;
  saveUserMemory(fresh);
  return fresh;
}
