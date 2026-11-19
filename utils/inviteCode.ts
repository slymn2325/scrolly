const PARAM_PRIORITY: Record<'league' | 'duel', readonly string[]> = {
  league: ['league', 'code', 'room', 'duel'],
  duel: ['room', 'duel', 'code', 'league'],
};

const IGNORED_PATH_SEGMENTS = new Set([
  'en',
  'tr',
  'duello',
  'duel',
  'league',
  'challenge',
  'leaderboard',
  'explore',
]);

function cleanCodeToken(raw: string, maxLen: number): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLen);
}

function tryExtractFromUrlCandidate(
  candidate: string,
  mode: 'league' | 'duel',
  maxLen: number
): string | null {
  try {
    const withProto = /^scrolly\.live/i.test(candidate) ? `https://${candidate}` : candidate;
    const parsed = new URL(withProto, 'https://scrolly.live');

    for (const key of PARAM_PRIORITY[mode]) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const cleaned = cleanCodeToken(value, maxLen);
      if (cleaned.length >= 4) {
        return cleaned;
      }
    }

    const segments = parsed.pathname
      .split('/')
      .map((seg) => seg.trim())
      .filter(Boolean);

    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const seg = segments[i];
      if (IGNORED_PATH_SEGMENTS.has(seg.toLowerCase())) continue;
      const cleaned = cleanCodeToken(seg, maxLen);
      if (/^[A-Z0-9]{6,8}$/.test(seg.toUpperCase()) && cleaned.length >= 6) {
        return cleaned;
      }
      if (i > 0) {
        const prev = segments[i - 1]?.toLowerCase() || '';
        if ((prev === 'duello' || prev === 'duel' || prev === 'league') && cleaned.length >= 4) {
          return cleaned;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Extracts a normalized uppercase Friend League (6–8 chars) or Scrolla 1v1 (6 chars)
 * invite code from either a pasted full URL / share message or a manually typed code.
 */
export function extractInviteCode(raw: string, mode: 'league' | 'duel'): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const maxLen = mode === 'duel' ? 6 : 8;

  const looksLikeUrlOrInvite =
    /https?:\/\//i.test(trimmed) ||
    /scrolly\.live/i.test(trimmed) ||
    /(?:league|duel|room|code)=/i.test(trimmed) ||
    /(?:\/duello\/|\/duel\/|\/league\/|[/?=])/.test(trimmed);

  if (looksLikeUrlOrInvite) {
    const embeddedUrlMatch =
      /(?:https?:\/\/|scrolly\.live)[^\s"'<>]+/i.exec(trimmed);
    if (embeddedUrlMatch?.[0]) {
      const extracted = tryExtractFromUrlCandidate(embeddedUrlMatch[0], mode, maxLen);
      if (extracted) return extracted;
    }

    const directExtracted = tryExtractFromUrlCandidate(trimmed, mode, maxLen);
    if (directExtracted) return directExtracted;

    const paramMatch = /(?:^|[?&\s])(?:league|room|duel|code)=([A-Za-z0-9]{4,12})/i.exec(trimmed);
    if (paramMatch?.[1]) {
      return cleanCodeToken(paramMatch[1], maxLen);
    }

    const pathMatch = /(?:duello|duel|league)\/([A-Za-z0-9]{4,12})/i.exec(trimmed);
    if (pathMatch?.[1]) {
      return cleanCodeToken(pathMatch[1], maxLen);
    }

    return '';
  }

  return cleanCodeToken(trimmed, maxLen);
}
