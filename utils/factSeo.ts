const DOCUMENT_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;
const TITLE_BRAND = 'Scrolly';

function clipAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = (
    lastSpace >= Math.floor(max * 0.6) ? slice.slice(0, lastSpace) : clean.slice(0, max)
  )
    .trim()
    .replace(/[\s,;:–—-]+$/u, '')
    .trim();
  return cut || clean.slice(0, max).trim();
}

/** Document `<title>` only. The on-page H1 keeps the full headline. */
export function buildFactDocumentTitle(headline: string): string {
  const clean = headline.replace(/\s+/g, ' ').trim();
  const suffix = ` | ${TITLE_BRAND}`;
  if (!clean) return TITLE_BRAND;
  const branded = `${clean}${suffix}`;
  if (branded.length <= DOCUMENT_TITLE_MAX) return branded;
  const budget = Math.max(12, DOCUMENT_TITLE_MAX - suffix.length);
  const short = clipAtWord(clean, budget);
  const titled = `${short}${suffix}`;
  return titled.length <= DOCUMENT_TITLE_MAX ? titled : clipAtWord(short, DOCUMENT_TITLE_MAX);
}

/** Meta description only. The visible fact sentence stays intact. */
export function buildFactMetaDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= META_DESCRIPTION_MAX) return clean;
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  let accumulated = '';
  for (const sentence of sentences) {
    const next = accumulated ? `${accumulated} ${sentence}` : sentence;
    if (next.length > META_DESCRIPTION_MAX) break;
    accumulated = next;
  }
  if (accumulated.length >= 40) return accumulated;
  return clipAtWord(clean, META_DESCRIPTION_MAX);
}
