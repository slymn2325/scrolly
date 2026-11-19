import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  LANG_COOKIE_NAME,
  detectInitialLocaleFromHeaders,
  isSearchOrAiBot,
  normalizeLocale,
  type SupportedLocale,
} from '@/lib/locale';
import { sanitizeInternalRedirectPath, verifySameOriginRequest } from '@/lib/originPolicy';
import { looksLikeIpaPhonetic } from '@/utils/phoneticDisplay';

function languageForRequest(request: NextRequest): SupportedLocale | null {
  const { pathname } = request.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  const raw = request.nextUrl.searchParams.get('lang');
  if (raw === 'en' || raw === 'tr') return raw;
  return null;
}

/** `?lang=en` on a path that already has an English URL becomes that URL. */
function englishPathFor(pathname: string): string | null {
  if (pathname === '/') return '/en';
  const fact = /^\/fact\/([^/]+)$/u.exec(pathname);
  if (fact?.[1]) return `/en/fact/${fact[1]}`;
  const category = /^\/category\/([^/]+)$/u.exec(pathname);
  if (category?.[1]) return `/en/category/${category[1]}`;
  return null;
}

function redirectEnglishQuery(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  if (url.searchParams.get('lang') !== 'en') return null;
  const candidate = englishPathFor(url.pathname);
  if (!candidate) return null;
  const pathname = sanitizeInternalRedirectPath(candidate, '');
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) return null;
  const dest = url.clone();
  dest.pathname = pathname;
  dest.searchParams.delete('lang');
  return NextResponse.redirect(dest, 308);
}

function isPrivateDuelPath(pathname: string): boolean {
  return pathname === '/duello' || pathname.startsWith('/duello/') || pathname.startsWith('/en/duel/');
}

const SINGLE_SEGMENT_IPA_RE = /[ˈˌːəɪʊæɒʌɜʃʒθðŋɡɾɑɔɛ]/u;

export function isSingleSegmentIpaPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Keep raw pathname if percent-decoding fails
  }
  const trimmed = decoded.replace(/^\/+|\/+$/g, '');
  if (!trimmed || trimmed.includes('/')) return false;
  if (trimmed.includes('\u200b')) return true;
  if (SINGLE_SEGMENT_IPA_RE.test(trimmed)) return true;
  return looksLikeIpaPhonetic(`/${trimmed}`);
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const verdict = verifySameOriginRequest(request);
    if (!verdict.ok) {
      return NextResponse.json(
        { ok: false, error: 'forbidden_origin' },
        {
          status: 403,
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        }
      );
    }
    return NextResponse.next();
  }

  if (isSingleSegmentIpaPath(request.nextUrl.pathname)) {
    const vocabDest = request.nextUrl.clone();
    vocabDest.pathname = '/';
    vocabDest.search = '?category=vocabulary';
    return NextResponse.redirect(vocabDest, 301);
  }

  const redirected = redirectEnglishQuery(request);
  if (redirected) return redirected;

  const { pathname } = request.nextUrl;
  const urlLang = languageForRequest(request);
  const cookieLang = normalizeLocale(request.cookies.get(LANG_COOKIE_NAME)?.value);
  const isBot = isSearchOrAiBot(request.headers.get('user-agent'));

  if (
    pathname === '/' &&
    urlLang === null &&
    !isBot &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    const targetLang = cookieLang ?? detectInitialLocaleFromHeaders(request.headers);
    if (targetLang === 'en') {
      const dest = request.nextUrl.clone();
      dest.pathname = '/en';
      return NextResponse.redirect(dest, {
        status: 307,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Vary: 'Cookie, CF-IPCountry, Accept-Language',
        },
      });
    }
  }

  const isTurkishCanonicalPath =
    pathname === '/' || pathname.startsWith('/fact/') || pathname.startsWith('/category/');
  const lang: SupportedLocale =
    urlLang ??
    (isTurkishCanonicalPath
      ? 'tr'
      : cookieLang ?? (!isBot ? detectInitialLocaleFromHeaders(request.headers) : 'tr'));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-scrolly-lang', lang);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Language', lang);
  if (isPrivateDuelPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api(?:/|$)|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|mjs|map|txt|xml|json|woff|woff2|ttf|eot|otf|webmanifest|mp4|webm|mp3|wav|pdf)$).*)',
    '/api/:path*',
  ],
};
