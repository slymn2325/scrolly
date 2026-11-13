/**
 * Deterministic PRNG utilities (mulberry32 + FNV-1a string hash)
 * Enables synchronized Daily Sprint and Weekly Marathon fact selections even completely offline.
 */

export function hashSeedString(seedStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailySeedKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

export function getWeeklySeedKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `weekly-${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function pickSeededFacts<T extends { id: string }>(
  pool: T[],
  count: number,
  seedKey: string
): T[] {
  if (pool.length === 0) return [];
  const copy = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const rng = mulberry32(hashSeedString(seedKey));

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  return copy.slice(0, Math.min(count, copy.length));
}
