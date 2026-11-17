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

export function isBadMediaUrlRequest(parsed: URL): boolean {
  return parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '';
}

/**
 * Each branch returns a string literal so the request origin is not the caller's host text.
 */
function allowedMediaOrigin(hostname: string): string | null {
  switch (hostname) {
    case 'images.pexels.com':
      return 'https://images.pexels.com';
    case 'videos.pexels.com':
      return 'https://videos.pexels.com';
    case 'cdn.pixabay.com':
      return 'https://cdn.pixabay.com';
    case 'pixabay.com':
      return 'https://pixabay.com';
    case 'media.giphy.com':
      return 'https://media.giphy.com';
    case 'media0.giphy.com':
      return 'https://media0.giphy.com';
    case 'media1.giphy.com':
      return 'https://media1.giphy.com';
    case 'media2.giphy.com':
      return 'https://media2.giphy.com';
    case 'media3.giphy.com':
      return 'https://media3.giphy.com';
    case 'media4.giphy.com':
      return 'https://media4.giphy.com';
    case 'i.giphy.com':
      return 'https://i.giphy.com';
    case 'upload.wikimedia.org':
      return 'https://upload.wikimedia.org';
    case 'commons.wikimedia.org':
      return 'https://commons.wikimedia.org';
    case 'images.unsplash.com':
      return 'https://images.unsplash.com';
    case 'apod.nasa.gov':
      return 'https://apod.nasa.gov';
    case 'images-assets.nasa.gov':
      return 'https://images-assets.nasa.gov';
    default:
      return null;
  }
}

function encodePathSegment(decoded: string): string {
  return encodeURIComponent(decoded)
    .replaceAll('%3A', ':')
    .replaceAll('%2C', ',')
    .replaceAll('%40', '@')
    .replaceAll('%24', '$')
    .replaceAll('%3B', ';')
    .replaceAll('%2B', '+')
    .replaceAll('%3D', '=')
    .replaceAll('%26', '&');
}

function encodeMediaPath(pathname: string): string | null {
  if (pathname === '/') return '/';
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    pathname.includes('\0')
  ) {
    return null;
  }

  const segments = pathname.split('/');
  let encoded = '';
  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index] ?? '';
    if (segment.length === 0 || segment === '.' || segment === '..') return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (
      decoded.length === 0 ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('\0') ||
      decoded.includes('?') ||
      decoded.includes('#')
    ) {
      return null;
    }
    encoded += `/${encodePathSegment(decoded)}`;
  }
  return encoded.length > 0 ? encoded : null;
}

function encodeMediaQuery(search: string): string | null {
  if (search.length === 0) return '';
  if (!search.startsWith('?') || search.includes('\\') || search.includes('\0') || search.includes('#')) {
    return null;
  }

  const params = new URLSearchParams(search);
  let encoded = '';
  for (const [key, value] of params) {
    const pair = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    encoded = encoded.length === 0 ? `?${pair}` : `${encoded}&${pair}`;
  }
  return encoded;
}

function confirmedMediaUrl(safeUrl: string, hostname: string): string | null {
  let rebuilt: URL;
  try {
    rebuilt = new URL(safeUrl);
  } catch {
    return null;
  }
  if (
    rebuilt.protocol !== 'https:' ||
    rebuilt.hostname !== hostname ||
    rebuilt.username !== '' ||
    rebuilt.password !== '' ||
    rebuilt.port !== '' ||
    !ALLOWED_MEDIA_HOSTS.has(rebuilt.hostname)
  ) {
    return null;
  }
  return safeUrl;
}

/**
 * Absolute https URL whose host is an allowlist literal and whose path and
 * query were passed through encodeURIComponent. Returns null when the URL
 * must not be fetched.
 */
export function buildSafeMediaUrlString(parsed: URL): string | null {
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;
  if (parsed.port !== '') return null;
  if (isBlockedMediaHost(parsed.hostname)) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_MEDIA_HOSTS.has(hostname)) return null;
  if (!allowedMediaOrigin(hostname)) return null;

  const path = encodeMediaPath(parsed.pathname);
  const query = encodeMediaQuery(parsed.search);
  if (path === null || query === null) return null;

  switch (hostname) {
    case 'images.pexels.com':
      return confirmedMediaUrl(`https://images.pexels.com${path}${query}`, hostname);
    case 'videos.pexels.com':
      return confirmedMediaUrl(`https://videos.pexels.com${path}${query}`, hostname);
    case 'cdn.pixabay.com':
      return confirmedMediaUrl(`https://cdn.pixabay.com${path}${query}`, hostname);
    case 'pixabay.com':
      return confirmedMediaUrl(`https://pixabay.com${path}${query}`, hostname);
    case 'media.giphy.com':
      return confirmedMediaUrl(`https://media.giphy.com${path}${query}`, hostname);
    case 'media0.giphy.com':
      return confirmedMediaUrl(`https://media0.giphy.com${path}${query}`, hostname);
    case 'media1.giphy.com':
      return confirmedMediaUrl(`https://media1.giphy.com${path}${query}`, hostname);
    case 'media2.giphy.com':
      return confirmedMediaUrl(`https://media2.giphy.com${path}${query}`, hostname);
    case 'media3.giphy.com':
      return confirmedMediaUrl(`https://media3.giphy.com${path}${query}`, hostname);
    case 'media4.giphy.com':
      return confirmedMediaUrl(`https://media4.giphy.com${path}${query}`, hostname);
    case 'i.giphy.com':
      return confirmedMediaUrl(`https://i.giphy.com${path}${query}`, hostname);
    case 'upload.wikimedia.org':
      return confirmedMediaUrl(`https://upload.wikimedia.org${path}${query}`, hostname);
    case 'commons.wikimedia.org':
      return confirmedMediaUrl(`https://commons.wikimedia.org${path}${query}`, hostname);
    case 'images.unsplash.com':
      return confirmedMediaUrl(`https://images.unsplash.com${path}${query}`, hostname);
    case 'apod.nasa.gov':
      return confirmedMediaUrl(`https://apod.nasa.gov${path}${query}`, hostname);
    case 'images-assets.nasa.gov':
      return confirmedMediaUrl(`https://images-assets.nasa.gov${path}${query}`, hostname);
    default:
      return null;
  }
}
