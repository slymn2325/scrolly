import type { FactCard } from '@/types/fact';
import type { CategoryFilter } from '@/i18n/translations';
import type { DuelKind } from '@/utils/duelCodec';
import { pickSeededFacts } from '@/utils/seededRandom';

export const DUEL_QUESTION_COUNTS = [3, 5, 7, 10] as const;
export type DuelQuestionCount = (typeof DUEL_QUESTION_COUNTS)[number];

export interface DuelLobbyPlayer {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
}

export interface DuelLobbyState {
  duelId: string;
  kind: DuelKind;
  category: CategoryFilter;
  questionCount: number;
  cardIds: string[];
  hostId: string;
  players: DuelLobbyPlayer[];
  started: boolean;
  updatedAt: number;
}

function lobbyKey(duelId: string): string {
  return `scrolly_duel_lobby_${duelId}`;
}

export function createDuelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return `d${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  }
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`;
}

export function requiredReadyCount(kind: DuelKind): number {
  return kind === 'group' ? 3 : 2;
}

export function filterFactsForDuel(
  allFacts: FactCard[],
  category: CategoryFilter
): FactCard[] {
  if (category === 'all') return allFacts;
  return allFacts.filter((f) => f.category === category);
}

export function pickDuelQuestionIds(
  allFacts: FactCard[],
  category: CategoryFilter,
  questionCount: number,
  duelId: string
): string[] {
  const pool = filterFactsForDuel(allFacts, category);
  const fallback = pool.length > 0 ? pool : allFacts;
  const picked = pickSeededFacts(fallback, questionCount, `duel-${duelId}`);
  return picked.map((f) => f.id);
}

export function resolveFactsByIds(allFacts: FactCard[], ids: string[]): FactCard[] {
  const matched = ids
    .map((id) =>
      allFacts.find((f) => f.id === id || f.slug === id || f.en.slug === id || f.tr.slug === id)
    )
    .filter((f): f is FactCard => Boolean(f));
  return matched;
}

export function loadDuelLobby(duelId: string): DuelLobbyState | null {
  if (typeof window === 'undefined' || !duelId) return null;
  try {
    const raw = window.localStorage.getItem(lobbyKey(duelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DuelLobbyState;
    if (!parsed?.duelId || !Array.isArray(parsed.players)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDuelLobby(state: DuelLobbyState): void {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...state, updatedAt: Date.now() };
    window.localStorage.setItem(lobbyKey(state.duelId), JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('scrolly-duel-lobby', { detail: { duelId: state.duelId } })
    );
  } catch {
    // private mode / quota
  }
}

export function subscribeDuelLobby(
  duelId: string,
  onChange: (state: DuelLobbyState | null) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const emit = () => onChange(loadDuelLobby(duelId));

  const onStorage = (event: StorageEvent) => {
    if (event.key === lobbyKey(duelId)) emit();
  };
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ duelId?: string }>).detail;
    if (!detail?.duelId || detail.duelId === duelId) emit();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('scrolly-duel-lobby', onCustom as EventListener);
  emit();

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('scrolly-duel-lobby', onCustom as EventListener);
  };
}

export function upsertLobbyPlayer(
  state: DuelLobbyState,
  player: DuelLobbyPlayer
): DuelLobbyState {
  const others = state.players.filter((p) => p.id !== player.id);
  return {
    ...state,
    players: [...others, player].sort((a, b) => Number(b.isHost) - Number(a.isHost)),
  };
}

export function setPlayerReady(
  state: DuelLobbyState,
  playerId: string,
  ready: boolean
): DuelLobbyState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ready } : p)),
  };
}

export function allRequiredReady(state: DuelLobbyState): boolean {
  const need = requiredReadyCount(state.kind);
  const readyCount = state.players.filter((p) => p.ready).length;
  return readyCount >= need && state.players.length >= need;
}

export function ensureSeatPlayers(
  state: DuelLobbyState,
  localPlayer: DuelLobbyPlayer
): DuelLobbyState {
  let next = upsertLobbyPlayer(state, localPlayer);
  const need = requiredReadyCount(state.kind);
  while (next.players.length < need) {
    const idx = next.players.length + 1;
    next = {
      ...next,
      players: [
        ...next.players,
        {
          id: `${state.duelId}-seat-${idx}`,
          name: `P${idx}`,
          ready: false,
          isHost: false,
        },
      ],
    };
  }
  return next;
}
