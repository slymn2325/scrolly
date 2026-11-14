const LIKED_FACTS_KEY = 'scrolly_liked_facts_v1';

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LIKED_FACTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIKED_FACTS_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('scrolly-liked-facts-updated'));
  } catch {
    // Ignore quota / private mode failures
  }
}

export function loadLikedFactIds(): string[] {
  return readIds();
}

export function isFactLiked(factId: string): boolean {
  if (!factId) return false;
  return readIds().includes(factId);
}

/** Toggle like. Returns the next liked state. */
export function toggleLikedFact(factId: string): boolean {
  if (typeof window === 'undefined' || !factId) return false;
  const current = readIds();
  const exists = current.includes(factId);
  const next = exists ? current.filter((id) => id !== factId) : [...current, factId];
  writeIds(next);
  return !exists;
}
