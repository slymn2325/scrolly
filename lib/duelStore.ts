import type { CategoryFilter } from '@/i18n/translations';
import { sanitizeDisplayText } from '@/lib/originPolicy';

const ALLOWED_REACTION_GIF_HOSTS = new Set([
  'media.giphy.com',
  'media0.giphy.com',
  'media1.giphy.com',
  'media2.giphy.com',
  'media3.giphy.com',
  'media4.giphy.com',
  'i.giphy.com',
]);

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

export interface ScrollaReactionGif {
  url: string;
  title?: string;
  sentAt: string;
}

export interface ScrollaPlayer {
  id: string;
  name: string;
  emoji: string;
  ready: boolean;
  score: number | null;
  finishedAt: string | null;
  joinedAt: string;
  elapsedSec?: number | null;
  answers?: boolean[] | null;
  reactionGif?: ScrollaReactionGif | null;
  actorKey?: string;
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
  kickedActorKeys?: string[];
  status: ScrollaRoomStatus;
  startsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const DUMMY_ACTOR_IDS = new Set([
  'default',
  'local-default-player',
  'server',
  'unknown',
  'anonymous',
  'null',
  'undefined',
]);

export function isDummyActorId(raw: unknown): boolean {
  if (typeof raw !== 'string') return true;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length < 3) return true;
  return DUMMY_ACTOR_IDS.has(trimmed);
}

export function generateRoomCode(length = 6): string {
  let out = '';
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    cryptoApi.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      out += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
    }
    return out;
  }
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
  return sanitizeDisplayText(name, 24, 'Kâşif');
}

export function sanitizePlayerEmoji(emoji?: string | null): string {
  const clean = sanitizeDisplayText(emoji, 12);
  return clean || '⚡';
}

export function sanitizeElapsedSec(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(3600, Math.round(num));
}

export function sanitizeAnswersArray(raw: unknown): boolean[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, 20).map((entry) => Boolean(entry));
}

export function sanitizeReactionGifUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  if (/[\s"'<>]/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password || parsed.port !== '') return null;
    if (!ALLOWED_REACTION_GIF_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function toPublicScrollaRoom(room: ScrollaRoom): ScrollaRoom {
  const { kickedActorKeys: _ignoredKeys, players, ...rest } = room;
  return {
    ...rest,
    players: players.map(({ actorKey: _ignoredActor, ...playerRest }) => playerRest),
  };
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
