/**
 * Exact HTTPS media hosts the proxy may contact.
 * Hosts were taken from card media resolvers, Giphy/Pexels/Pixabay/Wikimedia
 * URL builders, and next.config remotePatterns — not wildcard suffixes.
 */
const ALLOWED_MEDIA_HOST_LIST = [
  'images.pexels.com',
  'videos.pexels.com',
  'cdn.pixabay.com',
  'pixabay.com',
  'media.giphy.com',
  'media0.giphy.com',
  'media1.giphy.com',
  'media2.giphy.com',
  'media3.giphy.com',
  'media4.giphy.com',
  'i.giphy.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'images.unsplash.com',
  'apod.nasa.gov',
  'images-assets.nasa.gov',
] as const;

export const ALLOWED_MEDIA_HOSTS: ReadonlySet<string> = new Set(ALLOWED_MEDIA_HOST_LIST);

export interface SafeMediaParts {
  verifiedHost: string;
  pathname: string;
  search: string;
}

function stripHostDecorations(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  while (host.endsWith('.')) {
    host = host.slice(0, -1);
  }
  return host;
}

function isIPv4Literal(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isPublicIPv4(host: string): boolean {
  if (!isIPv4Literal(host)) return false;
  const parts = host.split('.').map((part) => Number(part));
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  const c = parts[2] ?? -1;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 224) return false;
  return true;
}

function ipv4FromMapped(host: string): string | null {
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (hex) {
    const hi = Number.parseInt(hex[1] ?? '', 16);
    const lo = Number.parseInt(hex[2] ?? '', 16);
    if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(host);
  return dotted?.[1] ?? null;
}

function ipv4From6to4(host: string): string | null {
  const parts = host.split(':');
  if (parts.length < 3 || parts[0] !== '2002') return null;
  const hi = Number.parseInt(parts[1] ?? '', 16);
  const lo = Number.parseInt(parts[2] ?? '', 16);
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isPublicIPv6(host: string): boolean {
  const mapped = ipv4FromMapped(host);
  if (mapped) return isPublicIPv4(mapped);

  const first = host.split(':')[0] || '0';
  const firstHextet = Number.parseInt(first, 16);
  if (!Number.isFinite(firstHextet)) return false;
  if (firstHextet >> 13 !== 1) return false;
  if (/^2001:0*db8(?:$|:)/.test(host)) return false;
  if (host.startsWith('2002:')) {
    const embedded = ipv4From6to4(host);
    if (!embedded) return false;
    return isPublicIPv4(embedded);
  }
  return true;
}

/** Private, loopback, link-local, and other non-public hosts. */
export function isBlockedMediaHost(hostname: string): boolean {
  const host = stripHostDecorations(hostname);
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  if (isIPv4Literal(host)) return !isPublicIPv4(host);
  if (host.includes(':')) return !isPublicIPv6(host);
  return false;
}

/**
 * Returns the allowlisted host constant when `hostname` matches exactly.
 * The returned string is one of ALLOWED_MEDIA_HOST_LIST, not the request bytes.
 */
export function verifiedMediaHost(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (!ALLOWED_MEDIA_HOSTS.has(host)) return null;
  for (const allowed of ALLOWED_MEDIA_HOST_LIST) {
    if (allowed === host) return allowed;
  }
  return null;
}

export function isBadMediaUrlRequest(parsed: URL): boolean {
  return parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '';
}

function isSafePathAndQuery(pathAndQuery: string): boolean {
  return (
    pathAndQuery.startsWith('/') &&
    !pathAndQuery.startsWith('//') &&
    !pathAndQuery.includes('\\') &&
    !pathAndQuery.includes('\0')
  );
}

/**
 * Validate a parsed URL and return path pieces tied to an allowlisted host.
 * Callers must rebuild `new URL(pathname + search, https://verifiedHost)` before fetch.
 */
export function safeMediaParts(parsed: URL): SafeMediaParts | null {
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;
  if (parsed.port !== '') return null;
  if (isBlockedMediaHost(parsed.hostname)) return null;
  const verifiedHost = verifiedMediaHost(parsed.hostname.toLowerCase());
  if (!verifiedHost || !ALLOWED_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  if (!isSafePathAndQuery(pathAndQuery)) return null;
  return {
    verifiedHost,
    pathname: parsed.pathname,
    search: parsed.search,
  };
}
