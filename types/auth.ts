import type { SavedVocabularyEntry } from '@/types/vocabulary';

export interface LocalMemorySnapshot {
  nickname?: string;
  xp?: number;
  weeklyXp?: number;
  dailyBestScore?: number;
  lastDailyQuizDate?: string;
  streak?: number;
  lastVisitDate?: string;
  seenIds?: string[];
  favoriteIds?: string[];
  likedIds?: string[];
  vocabNotebook?: SavedVocabularyEntry[];
  categoryWeights?: Record<string, number>;
  categoryAccuracy?: Record<string, { attempts: number; totalPct: number }>;
  badges?: string[];
}

export interface AuthUserDto {
  id: string;
  email: string;
  nickname: string;
  xp: number;
  weeklyXp: number;
  dailyBestScore: number;
  lastDailyQuizDate: string;
  streak: number;
  lastVisitDate: string;
  seenIds: string[];
  favoriteIds: string[];
  likedIds: string[];
  vocabNotebook: SavedVocabularyEntry[];
  categoryWeights: Record<string, number>;
  categoryAccuracy: Record<string, { attempts: number; totalPct: number }>;
  badges: string[];
  linkedDeviceIds: string[];
  /** ISO timestamp once guest progress was merged; further merges are no-ops. */
  guestMergedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  ok: boolean;
  authenticated: boolean;
  guestId: string | null;
  user: AuthUserDto | null;
}

export interface RequestOtpPayload {
  email: string;
  locale?: 'tr' | 'en';
  lang?: 'tr' | 'en';
}

export interface RequestOtpResponse {
  ok: boolean;
  cooldownSec: number;
  expiresInSec: number;
  delivery: 'resend' | 'dev_preview';
  devOtpCode?: string;
  error?: string;
}

export interface AccountProgressSummary {
  nickname: string;
  xp: number;
  streak: number;
  savedCount: number;
}

export interface VerifyOtpPayload {
  email: string;
  code: string;
  locale?: 'tr' | 'en';
  lang?: 'tr' | 'en';
  guestId?: string;
  localSnapshot?: LocalMemorySnapshot;
}

export interface VerifyOtpResponse {
  ok: boolean;
  authenticated: boolean;
  user: AuthUserDto | null;
  replaceLocal?: boolean;
  resetDeviceId?: boolean;
  needsMergeChoice?: boolean;
  existingAccountSummary?: AccountProgressSummary;
  guestSummary?: AccountProgressSummary;
  error?: string;
}

export type GuestMergeMode = 'merge' | 'keep_existing';

export interface MergeGuestPayload {
  guestId?: string;
  localSnapshot?: LocalMemorySnapshot;
  mode?: GuestMergeMode;
}

export interface MergeGuestResponse {
  ok: boolean;
  authenticated: boolean;
  user: AuthUserDto | null;
  error?: string;
}

export interface LogoutResponse {
  ok: boolean;
  authenticated: boolean;
  user: null;
}
