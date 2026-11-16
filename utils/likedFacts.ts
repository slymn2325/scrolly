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

/** Remove a liked fact. Returns true when an id was removed. */
export function removeLikedFact(factId: string): boolean {
  if (typeof window === 'undefined' || !factId) return false;
  const current = readIds();
  if (!current.includes(factId)) return false;
  writeIds(current.filter((id) => id !== factId));
  return true;
}

export function clearLikedFacts(): void {
  if (typeof window === 'undefined') return;
  writeIds([]);
  try {
    window.localStorage.removeItem(LIKED_FACTS_KEY);
  } catch {
    // Ignore quota / private mode failures
  }
  window.dispatchEvent(new CustomEvent('scrolly-liked-facts-updated'));
}

export function mergeLikedFactIds(ids: string[]): string[] {
  if (typeof window === 'undefined' || !Array.isArray(ids) || ids.length === 0) {
    return readIds();
  }
  const current = readIds();
  const seen = new Set(current);
  let changed = false;
  const next = [...current];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    next.push(clean);
    changed = true;
  }
  if (changed) {
    writeIds(next);
  }
  return next;
}
