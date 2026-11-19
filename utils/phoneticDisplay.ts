/**
 * IPA phonetics are conventionally wrapped in slashes (`/ˈskruː.tə.ni/`).
 * Crawlers (and accidental <Link href>) treat leading `/…/` as a site-relative URL
 * and pollute Search Console with 404s. Always render via a plain <span> and break
 * the path pattern with zero-width spaces for display.
 */

const ZWSP = '\u200B';
const IPA_SYMBOL_PATTERN = /[ˈˌːəɪʊæɒʌɜʃʒθðŋɡɾɑɔɛ]/u;
const IPA_ESCAPE_PATTERN = /\\[uʊiɪeɛæɑɒɔoʊəɜ]/;

export function sanitizePhoneticText(raw: string | null | undefined): string {
  return String(raw || '').trim().slice(0, 80);
}

/** Display form that looks like IPA but is not a crawlable relative path. */
export function formatPhoneticForDisplay(raw: string | null | undefined): string {
  const phonetic = sanitizePhoneticText(raw);
  if (!phonetic) return '';
  if (phonetic.includes(ZWSP)) return phonetic;
  if (phonetic.startsWith('/') && phonetic.endsWith('/') && phonetic.length > 2) {
    return `/${ZWSP}${phonetic.slice(1, -1)}${ZWSP}/`;
  }
  return phonetic;
}

/** True when a string looks like slash-wrapped IPA rather than a real URL/path. */
export function looksLikeIpaPhonetic(value: string | null | undefined): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith('/') || trimmed.length < 3) {
    return false;
  }
  // Strip outer slashes and zero-width spaces cleanly for single-segment IPA paths
  // (e.g. /\u200bfəˈleɪ.ʃəs\u200b, /ˌæs.əˈteɪn, /prəˈfaʊnd).
  const withoutOuterSlashes = trimmed.replace(/^\/+|\/+$/g, '');
  if (!withoutOuterSlashes || withoutOuterSlashes.includes('/')) {
    return false;
  }
  const normalizedBody = withoutOuterSlashes.replace(/\u200B/g, '');
  if (!normalizedBody && withoutOuterSlashes.includes(ZWSP)) {
    return true;
  }
  return (
    withoutOuterSlashes.includes(ZWSP) ||
    IPA_SYMBOL_PATTERN.test(normalizedBody) ||
    IPA_ESCAPE_PATTERN.test(normalizedBody)
  );
}

/**
 * Absolute http(s) href only. Rejects IPA phonetics and other relative paths so
 * they never become `<a href>` / `<Link href>` targets.
 */
export function safeExternalHref(url: string | null | undefined): string | undefined {
  const trimmed = String(url || '').trim();
  if (!trimmed) return undefined;
  if (looksLikeIpaPhonetic(trimmed)) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}
