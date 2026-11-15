import type { FactCard } from '@/types/fact';

export const SEEN_SLUGS_STORAGE_KEY = 'scrolly_seen_slugs_v1';
const MAX_SEEN_RECORDS = 2500;

export interface SeenFactRecord {
  slug: string;
  id: string;
  enSlug?: string;
  trSlug?: string;
  seenAt: number;
}

export interface SeenFactCandidate {
  id: string;
  slug?: string;
  en?: { slug?: string };
  tr?: { slug?: string };
}

function normalizeRecord(raw: unknown): SeenFactRecord | null {
  if (typeof raw === 'string') {
    const clean = raw.trim();
    if (!clean) return null;
    return { slug: clean, id: clean, seenAt: 1 };
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const slug = typeof obj.slug === 'string' ? obj.slug.trim() : id;
  if (!id && !slug) return null;
  const enSlug = typeof obj.enSlug === 'string' ? obj.enSlug.trim() || undefined : undefined;
  const trSlug = typeof obj.trSlug === 'string' ? obj.trSlug.trim() || undefined : undefined;
  const seenAt = typeof obj.seenAt === 'number' && Number.isFinite(obj.seenAt) ? obj.seenAt : Date.now();
  return {
    slug: slug || id,
    id: id || slug,
    ...(enSlug ? { enSlug } : {}),
    ...(trSlug ? { trSlug } : {}),
    seenAt,
  };
}

/** Loads all seen card records from `localStorage` (`scrolly_seen_slugs_v1`), ordered oldest to newest. */
export function loadSeenRecords(): SeenFactRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEEN_SLUGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const records: SeenFactRecord[] = [];
    const dedup = new Set<string>();
    for (const item of parsed) {
      const normalized = normalizeRecord(item);
      if (!normalized) continue;
      const primaryKey = `${normalized.id}|${normalized.slug}`;
      if (dedup.has(primaryKey)) continue;
      dedup.add(primaryKey);
      records.push(normalized);
    }
    return records.sort((a, b) => a.seenAt - b.seenAt);
  } catch {
    return [];
  }
}

function writeSeenRecords(records: SeenFactRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sliced =
      records.length > MAX_SEEN_RECORDS
        ? records.slice(records.length - MAX_SEEN_RECORDS)
        : records;
    window.localStorage.setItem(SEEN_SLUGS_STORAGE_KEY, JSON.stringify(sliced));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

/** Builds a fast token Set and oldest-timestamp Map from `scrolly_seen_slugs_v1` plus `memory.seenIds`. */
export function buildSeenLookup(extraSeenIds: string[] = []): {
  tokenSet: Set<string>;
  timestampByToken: Map<string, number>;
} {
  const records = loadSeenRecords();
  const tokenSet = new Set<string>();
  const timestampByToken = new Map<string, number>();

  for (const rec of records) {
    const tokens = [rec.slug, rec.id, rec.enSlug, rec.trSlug];
    for (const token of tokens) {
      if (!token) continue;
      tokenSet.add(token);
      if (!timestampByToken.has(token)) {
        timestampByToken.set(token, rec.seenAt);
      }
    }
  }

  for (let i = 0; i < extraSeenIds.length; i += 1) {
    const clean = typeof extraSeenIds[i] === 'string' ? extraSeenIds[i].trim() : '';
    if (!clean) continue;
    tokenSet.add(clean);
    if (!timestampByToken.has(clean)) {
      timestampByToken.set(clean, i + 1);
    }
  }

  return { tokenSet, timestampByToken };
}

/** Collects all canonical identifiers (`id`, `slug`, `en.slug`, `tr.slug`) for a fact card. */
export function getFactSeenTokens(fact: SeenFactCandidate): string[] {
  const tokens: string[] = [];
  if (fact.slug) tokens.push(fact.slug.trim());
  if (fact.en?.slug) tokens.push(fact.en.slug.trim());
  if (fact.tr?.slug) tokens.push(fact.tr.slug.trim());
  if (fact.id) tokens.push(fact.id.trim());
  return Array.from(new Set(tokens.filter(Boolean)));
}

/** Checks whether any identifier of `fact` is marked seen. */
export function isFactSeen(fact: FactCard | SeenFactCandidate, seenTokenSet: Set<string>): boolean {
  const tokens = getFactSeenTokens(fact);
  return tokens.some((token) => seenTokenSet.has(token));
}

/** Resolves the seen timestamp for ordering exhausted pools oldest-first. */
export function getFactSeenTimestamp(
  fact: FactCard | SeenFactCandidate,
  timestampByToken: Map<string, number>
): number {
  let oldest = Number.MAX_SAFE_INTEGER;
  for (const token of getFactSeenTokens(fact)) {
    const ts = timestampByToken.get(token);
    if (typeof ts === 'number' && ts < oldest) {
      oldest = ts;
    }
  }
  return oldest === Number.MAX_SAFE_INTEGER ? 0 : oldest;
}

/** Immediately persists `fact`'s slug and id into `scrolly_seen_slugs_v1` with a current timestamp. */
export function markFactSeenInStorage(fact: SeenFactCandidate): SeenFactRecord[] {
  const existing = loadSeenRecords();
  const primarySlug = (fact.slug || fact.en?.slug || fact.tr?.slug || fact.id || '').trim();
  const id = (fact.id || primarySlug).trim();
  if (!id && !primarySlug) return existing;

  const now = Date.now();
  const filtered = existing.filter(
    (rec) =>
      rec.id !== id &&
      rec.slug !== primarySlug &&
      (!fact.en?.slug || rec.enSlug !== fact.en.slug) &&
      (!fact.tr?.slug || rec.trSlug !== fact.tr.slug)
  );
  const nextRecord: SeenFactRecord = {
    slug: primarySlug || id,
    id: id || primarySlug,
    ...(fact.en?.slug ? { enSlug: fact.en.slug } : {}),
    ...(fact.tr?.slug ? { trSlug: fact.tr.slug } : {}),
    seenAt: now,
  };
  const next = [...filtered, nextRecord];
  writeSeenRecords(next);
  return next;
}

/** Clears `scrolly_seen_slugs_v1` during memory reset. */
export function clearSeenSlugsStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SEEN_SLUGS_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}
