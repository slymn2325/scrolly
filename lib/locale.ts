export const LANG_COOKIE_NAME = 'scrolly_lang';
export const LANG_COOKIE_MAX_AGE = 31536000;

export type SupportedLocale = 'tr' | 'en';

const SEARCH_OR_AI_BOT_PATTERN =
  /\b(Googlebot|Google-InspectionTool|GoogleOther|AdsBot-Google|Applebot|Bingbot|msnbot|OAI-SearchBot|ChatGPT-User|GPTBot|PerplexityBot|Perplexity-User|ClaudeBot|Claude-Web|anthropic-ai|DuckDuckBot|YandexBot|Baiduspider|Slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|TelegramBot)\b/i;

export function isSearchOrAiBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SEARCH_OR_AI_BOT_PATTERN.test(userAgent);
}

export function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  if (clean === 'en') return 'en';
  if (clean === 'tr') return 'tr';
  return null;
}

export function readLocaleFromCookieHeader(
  cookieHeader: string | null | undefined
): SupportedLocale | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = part.slice(0, eqIndex).trim();
    if (name !== LANG_COOKIE_NAME) continue;
    const rawValue = part.slice(eqIndex + 1).trim();
    try {
      return normalizeLocale(decodeURIComponent(rawValue));
    } catch {
      return normalizeLocale(rawValue);
    }
  }
  return null;
}

export function detectLocaleFromCountryHeader(
  headers: Pick<Headers, 'get'>
): SupportedLocale | null {
  const rawCountry =
    headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country') || '';
  const country = rawCountry.trim().toUpperCase();
  if (!country || country === 'XX' || country === 'T1') {
    return null;
  }
  if (country === 'TR' || country === 'CY') {
    return 'tr';
  }
  if (/^[A-Z]{2}$/.test(country)) {
    return 'en';
  }
  return null;
}

export function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined
): SupportedLocale {
  if (!acceptLanguage) return 'en';
  const entries = acceptLanguage.split(',');
  for (const entry of entries) {
    const [rawTag, ...params] = entry.split(';');
    const tag = (rawTag || '').trim();
    if (!tag) continue;
    const isZeroQ = params.some((param) => /^q=0(?:\.0+)?$/i.test(param.trim()));
    if (isZeroQ) continue;
    if (/^tr(?:-|$)/i.test(tag)) {
      return 'tr';
    }
  }
  return 'en';
}

export function detectInitialLocaleFromHeaders(
  headers: Pick<Headers, 'get'>
): SupportedLocale {
  return (
    detectLocaleFromCountryHeader(headers) ??
    detectLocaleFromAcceptLanguage(headers.get('accept-language'))
  );
}

export function resolveApiLocale(
  request: Request,
  explicitLocale?: unknown,
  fallbackLang?: unknown
): SupportedLocale {
  return (
    normalizeLocale(explicitLocale) ??
    normalizeLocale(fallbackLang) ??
    readLocaleFromCookieHeader(request.headers.get('cookie')) ??
    detectLocaleFromCountryHeader(request.headers) ??
    detectLocaleFromAcceptLanguage(request.headers.get('accept-language'))
  );
}

export function readLanguageCookie(): SupportedLocale | null {
  if (typeof document === 'undefined') return null;
  return readLocaleFromCookieHeader(document.cookie);
}

export function writeLanguageCookie(lang: SupportedLocale): void {
  if (typeof document === 'undefined') return;
  const safe: SupportedLocale = lang === 'en' ? 'en' : 'tr';
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${LANG_COOKIE_NAME}=${safe}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax${
    isHttps ? '; Secure' : ''
  }`;
}
