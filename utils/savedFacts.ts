const SAVED_FACTS_KEY = 'scrolly_saved_facts_v1';
export const SAVED_FACTS_UPDATED_EVENT = 'scrolly-saved-facts-updated';

function emitSavedFactsUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SAVED_FACTS_UPDATED_EVENT));
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

export function loadSavedFactIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_FACTS_KEY);
    if (!raw) return [];
    return normalizeIdList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveSavedFactIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVED_FACTS_KEY, JSON.stringify(normalizeIdList(ids)));
  } catch {
    // Ignore storage quota / private-mode failures
  }
  emitSavedFactsUpdated();
}

/**
 * Seeds saved fact IDs once on first hydration when the dedicated saved storage
 * has never been initialized (`localStorage.getItem` is `null`).
 */
export function seedSavedFactsIfUnset(ids: string[]): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const existingRaw = window.localStorage.getItem(SAVED_FACTS_KEY);
    if (existingRaw !== null) {
      return normalizeIdList(JSON.parse(existingRaw));
    }
    const clean = normalizeIdList(ids);
    if (clean.length === 0) return [];
    saveSavedFactIds(clean);
    return clean;
  } catch {
    return loadSavedFactIds();
  }
}

export function isFactSaved(factId: string): boolean {
  return loadSavedFactIds().includes(factId);
}

export function toggleSavedFact(factId: string): boolean {
  const current = loadSavedFactIds();
  const exists = current.includes(factId);
  const next = exists ? current.filter((id) => id !== factId) : [factId, ...current];
  saveSavedFactIds(next);
  return !exists;
}

export function removeSavedFact(factId: string): void {
  const next = loadSavedFactIds().filter((id) => id !== factId);
  saveSavedFactIds(next);
}

export function clearSavedFacts(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVED_FACTS_KEY);
  } catch {
    // Ignore storage failures
  }
  emitSavedFactsUpdated();
}

export function mergeSavedFactIds(ids: string[]): string[] {
  if (typeof window === 'undefined') return [];
  const cleanIncoming = normalizeIdList(ids);
  const current = loadSavedFactIds();
  if (cleanIncoming.length === 0) return current;
  const merged = normalizeIdList([...current, ...cleanIncoming]);
  if (merged.length !== current.length) {
    saveSavedFactIds(merged);
  }
  return merged;
}
