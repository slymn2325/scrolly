import type { CategoryFilter } from '@/i18n/translations';

export const DUEL_VALID_CATEGORIES: ReadonlySet<CategoryFilter> = new Set<CategoryFilter>([
  'all',
  'vocabulary',
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
]);

export function normalizeDuelCategory(raw: unknown): CategoryFilter {
  const clean = typeof raw === 'string' ? raw.trim().toLowerCase() : 'all';
  if (clean === 'weird_records') return 'records';
  if (clean === 'human-body') return 'human_body';
  if (clean === 'istatistik') return 'statistics';
  if (clean === 'vocab' || clean === 'dil_ogrenme' || clean === 'dil-ogrenme' || clean === 'english') {
    return 'vocabulary';
  }
  return DUEL_VALID_CATEGORIES.has(clean as CategoryFilter)
    ? (clean as CategoryFilter)
    : 'all';
}

export interface ScrollaPlayer {
  id: string;
  name: string;
  emoji: string;
  ready: boolean;
  score: number | null;
  finishedAt: string | null;
  joinedAt: string;
}

export type ScrollaRoomStatus = 'lobby' | 'countdown' | 'started';

export interface ScrollaRoom {
  code: string;
  mode: 'duel';
  category: CategoryFilter;
  questionCount: number;
  cardIds: string[];
  hostId: string;
  players: ScrollaPlayer[];
  kickedIds: string[];
  status: ScrollaRoomStatus;
  startsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function isShortRoomCode(raw: string): boolean {
  const trimmed = String(raw || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(trimmed);
}

// In-memory store used automatically when DATABASE_URL is absent (local/dev/CI)
const globalForDuels = globalThis as typeof globalThis & {
  __scrollyMemoryDuels?: Map<string, ScrollaRoom>;
};

export function getMemoryDuelMap(): Map<string, ScrollaRoom> {
  if (!globalForDuels.__scrollyMemoryDuels) {
    globalForDuels.__scrollyMemoryDuels = new Map<string, ScrollaRoom>();
  }
  // Prune rooms older than 6 hours
  const cutoff = Date.now() - 1000 * 60 * 60 * 6;
  for (const [k, room] of globalForDuels.__scrollyMemoryDuels) {
    if (Date.parse(room.updatedAt) < cutoff) {
      globalForDuels.__scrollyMemoryDuels.delete(k);
    }
  }
  return globalForDuels.__scrollyMemoryDuels;
}

export function sanitizePlayerName(name?: string | null): string {
  const clean = String(name || '').trim().slice(0, 24);
  return clean || 'Kâşif';
}

export function sanitizePlayerEmoji(emoji?: string | null): string {
  const clean = String(emoji || '').trim();
  return clean && clean.length <= 12 ? clean : '⚡';
}

/**
 * Resolves live status from `startsAt` against current server clock so
 * countdown automatically transitions to `'started'` once 5s expires.
 */
export function resolveEffectiveRoom(room: ScrollaRoom, nowMs = Date.now()): ScrollaRoom {
  if (room.status === 'countdown' && room.startsAt) {
    const targetMs = Date.parse(room.startsAt);
    if (Number.isFinite(targetMs) && nowMs >= targetMs) {
      return { ...room, status: 'started' };
    }
  }
  return room;
}
