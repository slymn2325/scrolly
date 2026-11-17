/** A first card read awards 15 XP. Anything past that is no longer the opening visit. */
const FIRST_VISIT_XP_CEILING = 30;

interface StoredVisit {
  xp?: number;
  seenIds?: unknown;
  totalSwipes?: number;
}

/**
 * First visit is derived from the existing memory record.
 * A single automatic card read can land before the sheet opens, so one card and its XP still count.
 */
function readStoredVisit(): StoredVisit | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('merak_user_state_v1');
    return raw ? (JSON.parse(raw) as StoredVisit) : null;
  } catch {
    return null;
  }
}

export function isFirstVisitProfile(liveXp = 0): boolean {
  if (typeof window === 'undefined') return false;
  const stored = readStoredVisit();
  if (!stored) return liveXp <= FIRST_VISIT_XP_CEILING;

  const seen = Array.isArray(stored.seenIds) ? stored.seenIds.length : 0;
  const swipes = typeof stored.totalSwipes === 'number' ? stored.totalSwipes : 0;
  const xp = Math.max(liveXp, typeof stored.xp === 'number' ? stored.xp : 0);
  if (seen > 1 || swipes > 1 || xp > FIRST_VISIT_XP_CEILING) return false;
  return true;
}
