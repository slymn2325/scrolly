const PRODUCTION_ALLOWED_ORIGINS = new Set<string>([
  'https://scrolly.live',
  'https://www.scrolly.live',
]);

function stripBracketsAndDot(hostname: string): string {
  let clean = hostname.trim().toLowerCase();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }
  while (clean.endsWith('.')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

export function isLocalHostname(hostname: string): boolean {
  const clean = stripBracketsAndDot(hostname);
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1';
}

function isRequestHostLocal(request: Request): boolean {
  const hostHeader = request.headers.get('host');
  if (hostHeader) {
    const first = hostHeader.split(',')[0]?.trim() || '';
    try {
      const parsed = new URL(`http://${first}`);
      if (isLocalHostname(parsed.hostname)) return true;
    } catch {
      // Ignore malformed host header and inspect request.url
    }
  }
  try {
    const parsedReq = new URL(request.url);
    return isLocalHostname(parsedReq.hostname);
  } catch {
    return false;
  }
}

function getExtraAllowedOrigins(): Set<string> {
  const out = new Set<string>();
  const raw =
    typeof process !== 'undefined' && process.env ? process.env.ALLOWED_ORIGINS : undefined;
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        !parsed.username &&
        !parsed.password
      ) {
        out.add(parsed.origin.toLowerCase());
      }
    } catch {
      // Ignore invalid entries
    }
  }
  return out;
}

export function isAllowedOriginUrl(rawOrigin: string, request: Request): boolean {
  const trimmed = String(rawOrigin || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.username !== '' || parsed.password !== '') return false;
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  const normalizedOrigin = parsed.origin.toLowerCase();
  if (PRODUCTION_ALLOWED_ORIGINS.has(normalizedOrigin)) {
    return true;
  }

  const extra = getExtraAllowedOrigins();
  if (extra.has(normalizedOrigin)) {
    return true;
  }

  const isNonProd =
    typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
  if (isLocalHostname(parsed.hostname) && (isNonProd || isRequestHostLocal(request))) {
    return true;
  }

  return false;
}

export function verifySameOriginRequest(
  request: Request
): { ok: true } | { ok: false; reason: string } {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { ok: true };
  }

  const secFetchSite = (request.headers.get('sec-fetch-site') || '').trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return { ok: false, reason: 'cross_site_fetch' };
  }

  const origin = request.headers.get('origin');
  if (origin !== null && origin.trim().length > 0) {
    return isAllowedOriginUrl(origin, request)
      ? { ok: true }
      : { ok: false, reason: 'origin_mismatch' };
  }

  const referer = request.headers.get('referer');
  if (referer !== null && referer.trim().length > 0) {
    try {
      const parsedReferer = new URL(referer);
      return isAllowedOriginUrl(parsedReferer.origin, request)
        ? { ok: true }
        : { ok: false, reason: 'referer_mismatch' };
    } catch {
      return { ok: false, reason: 'referer_mismatch' };
    }
  }

  if (secFetchSite === 'same-origin') {
    return { ok: true };
  }

  const isNonProd =
    typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
  if (isNonProd || isRequestHostLocal(request)) {
    return { ok: true };
  }

  return { ok: false, reason: 'missing_origin' };
}

function hasDisallowedControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function stripAsciiControlChars(
  value: string,
  replacement: string,
  keepNewlines: boolean
): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const isLineFeed = keepNewlines && code === 0x0a;
    if (!isLineFeed && (code <= 0x1f || code === 0x7f)) {
      if (replacement) out += replacement;
    } else {
      out += value[i];
    }
  }
  return out;
}

export function sanitizeInternalRedirectPath(raw: unknown, fallback = '/'): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\') || hasDisallowedControlChars(trimmed)) return fallback;

  try {
    const parsed = new URL(trimmed, 'https://scrolly.live');
    if (parsed.origin !== 'https://scrolly.live') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sanitizeDisplayText(raw: unknown, maxLen: number, fallback = ''): string {
  const withoutControls = stripAsciiControlChars(String(raw || ''), ' ', false);
  const clean = withoutControls
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return clean || fallback;
}

export function stripControlCharsKeepNewlines(raw: unknown, maxLen: number): string {
  const normalizedNewlines = String(raw || '').replace(/\r\n?/g, '\n');
  return stripAsciiControlChars(normalizedNewlines, '', true)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, maxLen);
}
