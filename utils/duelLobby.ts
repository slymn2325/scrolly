import { VOCABULARY_FACTS } from '@/data/vocabularyFacts';
import { getCategoryMeta, type CategoryFilter, type Language } from '@/i18n/translations';
import type { CategoryId, FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import {
  normalizeRoomCode,
  type ScrollaPlayer,
  type ScrollaReactionGif,
  type ScrollaRoom,
  type ScrollaRoomStatus,
} from '@/lib/duelStore';
import { pickSeededFacts } from '@/utils/seededRandom';

export type { ScrollaPlayer, ScrollaReactionGif, ScrollaRoom, ScrollaRoomStatus };

export const DUEL_QUESTION_COUNTS = [3, 5, 7, 10] as const;
export type DuelQuestionCount = (typeof DUEL_QUESTION_COUNTS)[number];

const SCROLLA_PLAYER_KEY = 'scrolly_scrolla_player_id_v1';
const USER_MEMORY_STORAGE_KEY = 'merak_user_state_v1';

export function getOrCreateScrollaPlayerId(preferredId?: string): string {
  const cleanPreferred =
    preferredId && preferredId.trim().length >= 4 && preferredId !== 'local-default-player'
      ? preferredId.trim().slice(0, 64)
      : '';

  if (typeof window !== 'undefined') {
    if (cleanPreferred) {
      try {
        window.localStorage.setItem(SCROLLA_PLAYER_KEY, cleanPreferred);
      } catch {
        // Ignore storage failures
      }
      return cleanPreferred;
    }

    try {
      // Align with UserMemory playerId so DuelModal & ShareResultModal share host identity
      const rawMemory = window.localStorage.getItem(USER_MEMORY_STORAGE_KEY);
      if (rawMemory) {
        const parsed = JSON.parse(rawMemory) as { playerId?: unknown };
        if (
          typeof parsed?.playerId === 'string' &&
          parsed.playerId.trim().length >= 4 &&
          parsed.playerId !== 'local-default-player'
        ) {
          const unified = parsed.playerId.trim().slice(0, 64);
          window.localStorage.setItem(SCROLLA_PLAYER_KEY, unified);
          return unified;
        }
      }

      const existing = window.localStorage.getItem(SCROLLA_PLAYER_KEY);
      if (existing && existing.trim().length >= 4) {
        return existing.trim().slice(0, 64);
      }
      const created = createPlayerId();
      window.localStorage.setItem(SCROLLA_PLAYER_KEY, created);
      return created;
    } catch {
      // Ignore storage failures
    }
  }
  return cleanPreferred || createPlayerId();
}

export function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function clearScrollaPlayerId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SCROLLA_PLAYER_KEY);
  } catch {
    // Ignore storage failures
  }
}

/** Converts a VocabularyCard into a playable FactCard quiz item for Scrolla/Quiz modes. */
export function vocabCardToFactCard(
  vocab: VocabularyCard,
  pool: VocabularyCard[] = VOCABULARY_FACTS
): FactCard {
  const distractors = pool
    .filter((v) => v.id !== vocab.id && v.definitionEn !== vocab.definitionEn)
    .slice(0, 2)
    .map((v) => v.definitionEn);
  while (distractors.length < 2) {
    distractors.push(
      distractors.length === 0
        ? 'Moving rapidly without clear direction.'
        : 'Relating purely to decorative shapes.'
    );
  }
  const enOptions: [string, string, string] = [
    vocab.definitionEn,
    distractors[0],
    distractors[1],
  ];

  return {
    id: vocab.id,
    slug: vocab.id,
    category: 'science',
    accentColor: '#6366F1',
    iconName: 'globe',
    emoji: '🌐',
    sketchType: 'vocabulary',
    tr: {
      slug: vocab.id,
      title: `${vocab.word} (${vocab.partOfSpeech})`,
      teaserTitle: `🌐 ${vocab.word}`,
      factText: `"${vocab.word}" ${vocab.phonetic}: ${vocab.meaningTr}`,
      deepDiveDetail: `${vocab.exampleEn} — ${vocab.exampleTr}`,
      sourceHint: 'Scrolly Dil Laboratuvarı',
      tag: 'Dil Öğrenme',
      quiz: {
        question: `"${vocab.word}" (${vocab.partOfSpeech}) kelimesinin Türkçesi nedir?`,
        options: vocab.quizOptions,
        correctIndex: vocab.correctIndex,
        explanation: `"${vocab.word}" = "${vocab.meaningTr}". Örnek: ${vocab.exampleTr}`,
      },
    },
    en: {
      slug: vocab.id,
      title: `${vocab.word} (${vocab.phonetic})`,
      teaserTitle: `🌐 ${vocab.word}`,
      factText: `"${vocab.word}": ${vocab.definitionEn}`,
      deepDiveDetail: `Example: "${vocab.exampleEn}"`,
      sourceHint: 'Scrolly Language Lab',
      tag: 'Language Learning',
      quiz: {
        question: `What does "${vocab.word}" mean?`,
        options: enOptions,
        correctIndex: 0,
        explanation: `"${vocab.word}" means: ${vocab.definitionEn} ("${vocab.exampleEn}").`,
      },
    },
  };
}

export function filterFactsForDuel(
  allFacts: FactCard[],
  category: CategoryFilter
): FactCard[] {
  if (category === 'vocabulary') {
    return VOCABULARY_FACTS.map((v) => vocabCardToFactCard(v, VOCABULARY_FACTS));
  }
  if (category === 'all') return allFacts;
  return allFacts.filter((f) => f.category === category);
}

export function pickDuelQuestionIds(
  allFacts: FactCard[],
  category: CategoryFilter,
  questionCount: number,
  seedId: string
): string[] {
  const pool = filterFactsForDuel(allFacts, category);
  const fallback = pool.length > 0 ? pool : allFacts;
  const picked = pickSeededFacts(fallback, questionCount, `scrolla-${seedId}`);
  return picked.map((f) => f.id);
}

export function resolveFactsByIds(allFacts: FactCard[], ids: string[]): FactCard[] {
  return ids
    .map((id) => {
      const direct = allFacts.find(
        (f) => f.id === id || f.slug === id || f.en.slug === id || f.tr.slug === id
      );
      if (direct) return direct;
      const vocab = VOCABULARY_FACTS.find(
        (v) => v.id === id || v.word.toLowerCase() === id.toLowerCase()
      );
      return vocab ? vocabCardToFactCard(vocab, VOCABULARY_FACTS) : undefined;
    })
    .filter((f): f is FactCard => Boolean(f));
}

function inferCategoryFromCardId(cardId: string): CategoryId | null {
  const lower = cardId.toLowerCase();
  if (lower.startsWith('space')) return 'space';
  if (lower.startsWith('nature')) return 'nature';
  if (lower.startsWith('human') || lower.startsWith('body')) return 'human_body';
  if (lower.startsWith('history')) return 'history';
  if (lower.startsWith('science')) return 'science';
  if (lower.startsWith('weird') || lower.startsWith('record')) return 'records';
  if (lower.startsWith('stat')) return 'statistics';
  return null;
}

function truncatePackTitle(raw: string, maxLen = 32): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1).trim();
  const lastSpace = sliced.lastIndexOf(' ');
  return `${lastSpace > 14 ? sliced.slice(0, lastSpace) : sliced}…`;
}

/**
 * Resolves human-readable pack preview labels for Scrolla Lobby ("Ortak paket")
 * and never exposes raw slug/id strings to the user.
 */
export function resolveDuelPackItems(
  allFacts: FactCard[],
  cardIds: string[],
  lang: Language
): string[] {
  return cardIds.map((id, idx) => {
    const vocab = VOCABULARY_FACTS.find(
      (v) => v.id === id || v.word.toLowerCase() === id.toLowerCase()
    );
    if (vocab) {
      return `🌐 ${vocab.word}`;
    }

    const fact = allFacts.find(
      (f) => f.id === id || f.slug === id || f.en.slug === id || f.tr.slug === id
    );
    if (fact) {
      const title = (fact[lang]?.teaserTitle || fact[lang]?.title || '').trim();
      if (title) return truncatePackTitle(title);
      return `${getCategoryMeta(fact.category).label[lang]} #${idx + 1}`;
    }

    const inferred = inferCategoryFromCardId(id);
    if (inferred) {
      return `${getCategoryMeta(inferred).label[lang]} #${idx + 1}`;
    }

    return lang === 'tr' ? `Kart #${idx + 1}` : `Card #${idx + 1}`;
  });
}

export interface ScrollaApiResult {
  ok: boolean;
  room?: ScrollaRoom;
  serverNowMs?: number;
  kicked?: boolean;
  error?: string;
  status?: number;
}

function parseServerNow(raw?: string): number {
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export async function createScrollaRoom(params: {
  hostId: string;
  hostName: string;
  hostEmoji?: string;
  category: CategoryFilter;
  questionCount: number;
  cardIds?: string[];
}): Promise<ScrollaApiResult> {
  try {
    const res = await fetch('/api/duels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      room?: ScrollaRoom;
      serverNow?: string;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && json.ok && json.room),
      room: json.room,
      serverNowMs: parseServerNow(json.serverNow),
      error: json.error,
      status: res.status,
    };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function fetchScrollaRoom(
  code: string,
  playerId: string
): Promise<ScrollaApiResult> {
  const cleanCode = normalizeRoomCode(code);
  if (cleanCode.length !== 6) {
    return { ok: false, error: 'invalid_code', status: 400 };
  }
  try {
    const res = await fetch(
      `/api/duels/${encodeURIComponent(cleanCode)}?playerId=${encodeURIComponent(playerId)}`,
      { cache: 'no-store' }
    );
    const json = (await res.json()) as {
      ok?: boolean;
      kicked?: boolean;
      room?: ScrollaRoom;
      serverNow?: string;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && json.ok && json.room),
      kicked: Boolean(json.kicked),
      room: json.room,
      serverNowMs: parseServerNow(json.serverNow),
      error: json.error,
      status: res.status,
    };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

async function postScrollaAction(
  code: string,
  payload: Record<string, unknown>
): Promise<ScrollaApiResult> {
  const cleanCode = normalizeRoomCode(code);
  if (cleanCode.length !== 6) {
    return { ok: false, error: 'invalid_code', status: 400 };
  }
  try {
    const res = await fetch(`/api/duels/${encodeURIComponent(cleanCode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      room?: ScrollaRoom | null;
      serverNow?: string;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && json.ok && json.room),
      room: json.room ?? undefined,
      serverNowMs: parseServerNow(json.serverNow),
      error: json.error,
      status: res.status,
    };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export function joinScrollaRoom(
  code: string,
  params: { playerId: string; name: string; emoji?: string }
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, { action: 'join', ...params });
}

export function setSelfScrollaReady(
  code: string,
  playerId: string,
  ready: boolean
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, { action: 'ready', playerId, ready });
}

export function kickScrollaPlayer(
  code: string,
  hostId: string,
  targetPlayerId: string
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, { action: 'kick', playerId: hostId, targetPlayerId });
}

export function startScrollaRoom(
  code: string,
  hostId: string
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, { action: 'start', playerId: hostId });
}

export function completeScrollaRoom(
  code: string,
  playerId: string,
  score: number,
  options?: { elapsedSec?: number; answers?: boolean[] }
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, {
    action: 'complete',
    playerId,
    score,
    ...(options?.elapsedSec !== undefined ? { elapsedSec: options.elapsedSec } : {}),
    ...(options?.answers !== undefined ? { answers: options.answers } : {}),
  });
}

export function sendScrollaReaction(
  code: string,
  playerId: string,
  gif: { url: string; title?: string }
): Promise<ScrollaApiResult> {
  return postScrollaAction(code, {
    action: 'reaction',
    playerId,
    gifUrl: gif.url,
    ...(gif.title ? { title: gif.title } : {}),
  });
}

export async function leaveScrollaRoom(code: string, playerId: string): Promise<void> {
  await postScrollaAction(code, { action: 'leave', playerId });
}
