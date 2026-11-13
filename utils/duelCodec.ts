/**
 * URL-safe Base64 codec for 1v1 Friend Duel links (?duel=<CODE>)
 * Packs 5 cardIds, challenger score, elapsed duration (sec), nickname, and mode.
 */

export interface DuelPayload {
  cardIds: string[];
  score: number;
  timeSec: number;
  name: string;
  mode?: 'duel' | 'daily' | 'weekly' | 'memory';
}

interface CompactDuelWire {
  c: string[];
  s: number;
  t: number;
  n: string;
  m?: 'd' | 'da' | 'w' | 'me';
}

const MODE_TO_SHORT: Record<NonNullable<DuelPayload['mode']>, CompactDuelWire['m']> = {
  duel: 'd',
  daily: 'da',
  weekly: 'w',
  memory: 'me',
};

const SHORT_TO_MODE: Record<NonNullable<CompactDuelWire['m']>, DuelPayload['mode']> = {
  d: 'duel',
  da: 'daily',
  w: 'weekly',
  me: 'memory',
};

function toUrlSafeBase64(input: string): string {
  const utf8Percent = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const rawB64 =
    typeof btoa !== 'undefined'
      ? btoa(utf8Percent)
      : Buffer.from(utf8Percent, 'binary').toString('base64');

  return rawB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(b64Url: string): string {
  const padded = b64Url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64Url.length + 3) % 4);
  const binary =
    typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');

  const percentEncoded = Array.from(binary)
    .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');

  return decodeURIComponent(percentEncoded);
}

export function encodeDuelPayload(payload: DuelPayload): string {
  const compact: CompactDuelWire = {
    c: payload.cardIds.slice(0, 5),
    s: Math.max(0, Math.round(payload.score)),
    t: Math.max(1, Math.round(payload.timeSec)),
    n: (payload.name || 'Player').trim().slice(0, 24),
    m: payload.mode ? MODE_TO_SHORT[payload.mode] : 'd',
  };

  try {
    return toUrlSafeBase64(JSON.stringify(compact));
  } catch {
    return `${compact.c.join(',')}~${encodeURIComponent(compact.n)}~${compact.s}`;
  }
}

export function decodeDuelPayload(rawParam: string): DuelPayload | null {
  if (!rawParam || !rawParam.trim()) return null;
  const trimmed = rawParam.trim();

  // Fallback support for legacy ~ delimited format
  if (trimmed.includes('~')) {
    const [idsRaw, rawName, rawScore, rawTime] = trimmed.split('~');
    const cardIds = (idsRaw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (cardIds.length === 0) return null;
    return {
      cardIds,
      name: decodeURIComponent(rawName || 'Friend'),
      score: Math.max(0, Number(rawScore) || 320),
      timeSec: Math.max(1, Number(rawTime) || 28),
      mode: 'duel',
    };
  }

  try {
    const jsonStr = fromUrlSafeBase64(trimmed);
    const parsed = JSON.parse(jsonStr) as Partial<CompactDuelWire>;
    if (!Array.isArray(parsed.c) || parsed.c.length === 0) {
      return null;
    }

    return {
      cardIds: parsed.c.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 5),
      score: typeof parsed.s === 'number' && Number.isFinite(parsed.s) ? Math.max(0, parsed.s) : 320,
      timeSec: typeof parsed.t === 'number' && Number.isFinite(parsed.t) ? Math.max(1, parsed.t) : 28,
      name: typeof parsed.n === 'string' && parsed.n.trim() ? parsed.n.trim().slice(0, 24) : 'Friend',
      mode: parsed.m && SHORT_TO_MODE[parsed.m] ? SHORT_TO_MODE[parsed.m] : 'duel',
    };
  } catch {
    return null;
  }
}
