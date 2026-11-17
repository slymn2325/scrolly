const DOCUMENT_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;
const TITLE_BRAND = 'Scrolly';
const BRAND_SUFFIX = /\s+\|\s+(?:Scrolly|scrolly\.live)\s*$/u;

function tidyEdge(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s,;:.!?…—–-]+$/u, '')
    .trim();
}

function clauseEndIndexes(text: string): number[] {
  const ends: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? '';
    const prev = text[i - 1] ?? '';
    const next = text[i + 1] ?? '';
    if (ch === ',') {
      if (/\d/u.test(prev) && /\d/u.test(next)) continue;
      ends.push(i);
      continue;
    }
    if (ch === ';' || ch === '!' || ch === '?' || ch === '…' || ch === '—' || ch === '–') {
      ends.push(i);
      continue;
    }
    if (ch === ':' && (next === '' || /\s/u.test(next))) {
      ends.push(i);
      continue;
    }
    if (ch === '.' || ch === '。') {
      if (/\d/u.test(prev)) continue;
      if (next === '' || /\s/u.test(next)) ends.push(i);
    }
  }
  return ends;
}

function clipAtWord(text: string, max: number): string {
  const clean = tidyEdge(text);
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  const lastSpace = slice.lastIndexOf(' ');
  let cut = tidyEdge(
    lastSpace >= Math.floor(max * 0.6) ? slice.slice(0, lastSpace) : clean.slice(0, max)
  );
  const lastWord = cut.split(' ').pop() ?? '';
  if (/^\d+$/u.test(lastWord) && cut.includes(' ')) {
    const withoutNumber = tidyEdge(cut.slice(0, cut.lastIndexOf(' ')));
    if (withoutNumber.length >= 12) cut = withoutNumber;
  }
  return cut || clean.slice(0, max).trim();
}

/** Keep whole clauses. A word cut stays inside one clause, so a title cannot end on "… 3". */
function clipHeadline(text: string, max: number): string {
  const clean = tidyEdge(text);
  if (clean.length <= max) return clean;
  const ends = clauseEndIndexes(clean);
  let best = '';
  for (const end of ends) {
    const piece = tidyEdge(clean.slice(0, end));
    if (piece.length >= 12 && piece.length <= max && piece.length > best.length) {
      best = piece;
    }
  }
  if (best) return best;
  const firstEnd = ends.find((end) => end > 0);
  const firstClause = firstEnd === undefined ? '' : tidyEdge(clean.slice(0, firstEnd));
  const scope = firstClause.length >= 12 ? firstClause : clean;
  return clipAtWord(scope, max);
}

/** Any document `<title>`, including ones that already end with the brand. */
export function fitDocumentTitle(title: string): string {
  const clean = title.replace(/\s+/g, ' ').trim();
  if (!clean) return TITLE_BRAND;
  if (clean.length <= DOCUMENT_TITLE_MAX) return clean;
  const match = BRAND_SUFFIX.exec(clean);
  if (!match || match.index < 12) return clipHeadline(clean, DOCUMENT_TITLE_MAX);
  const suffix = clean.slice(match.index);
  const head = clean.slice(0, match.index).trim();
  const budget = DOCUMENT_TITLE_MAX - suffix.length;
  if (budget < 12) return clipAtWord(clean, DOCUMENT_TITLE_MAX);
  const short = clipHeadline(head, budget);
  const titled = `${short}${suffix}`;
  return titled.length <= DOCUMENT_TITLE_MAX ? titled : clipAtWord(short, DOCUMENT_TITLE_MAX);
}

/** Document `<title>` only. The on-page H1 keeps the full headline. */
export function buildFactDocumentTitle(headline: string): string {
  const clean = headline.replace(/\s+/g, ' ').trim();
  if (!clean) return TITLE_BRAND;
  return fitDocumentTitle(`${clean} | ${TITLE_BRAND}`);
}

/** Meta description only. The visible fact sentence stays intact. */
export function buildFactMetaDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= META_DESCRIPTION_MAX) return clean;
  const sentences = clean
    .split(/(?<=[.!?])\s+/u)
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
