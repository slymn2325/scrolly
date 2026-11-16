/**
 * IPA phonetics are conventionally wrapped in slashes (`/ˈskruː.tə.ni/`).
 * Crawlers (and accidental <Link href>) treat leading `/…/` as a site-relative URL
 * and pollute Search Console with 404s. Always render via a plain <span> and break
 * the path pattern with zero-width spaces for display.
 */

const ZWSP = '\u200B';

export function sanitizePhoneticText(raw: string | null | undefined): string {
  return String(raw || '').trim().slice(0, 80);
}

/** Display form that looks like IPA but is not a crawlable relative path. */
export function formatPhoneticForDisplay(raw: string | null | undefined): string {
  const phonetic = sanitizePhoneticText(raw);
  if (!phonetic) return '';
  if (phonetic.startsWith('/') && phonetic.endsWith('/') && phonetic.length > 2) {
    return `/${ZWSP}${phonetic.slice(1, -1)}${ZWSP}/`;
  }
  return phonetic;
}

/** True when a string looks like slash-wrapped IPA rather than a real URL/path. */
export function looksLikeIpaPhonetic(value: string | null | undefined): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith('/') || !trimmed.endsWith('/') || trimmed.length < 3) {
    return false;
  }
  // IPA typically contains stress marks, length marks, or non-ASCII phonetic letters.
  return /[ˈˌːɑɒæəɜɪʊʌθðʃʒŋɡ]/.test(trimmed) || /\\[uʊiɪeɛæɑɒɔoʊəɜ]/.test(trimmed);
}
