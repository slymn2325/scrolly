const DOCUMENT_TITLE_MIN = 50;
const DOCUMENT_TITLE_MAX = 60;
const META_DESCRIPTION_MIN = 140;
const META_DESCRIPTION_MAX = 155;
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

function buildTitleEnrichmentCandidates(
  head: string,
  lang: 'tr' | 'en',
  categoryLabel?: string
): string[] {
  const cat = categoryLabel?.trim();
  const qualifiers =
    lang === 'tr'
      ? [
          cat ? ` — ${cat} Bilgi Kartı & Quiz` : null,
          cat ? ` — Kaynaklı ${cat} Kartı & Quiz` : null,
          ' — Kaynaklı Bilgi Kartı & Quiz',
          cat ? ` — ${cat} Bilgi Kartı` : null,
          ' — Kaynaklı Bilgi Kartı',
          cat ? ` — ${cat} Kartı & Quiz` : null,
          ' — Bilgi Kartı & Quiz',
          cat ? ` — ${cat} & Quiz` : null,
          cat ? ` — ${cat} Kartı` : null,
          ' — Bilgi Kartı',
          cat ? ` — ${cat}` : null,
          ' — Kısa Bilgi',
          ' & Quiz',
        ]
      : [
          cat ? ` — ${cat} Fact Card & Quiz` : null,
          cat ? ` — Verified ${cat} Fact & Quiz` : null,
          ' — Verified Fact Card & Quiz',
          cat ? ` — ${cat} Fact Card` : null,
          ' — Verified Fact Card',
          cat ? ` — ${cat} Fact & Quiz` : null,
          ' — Fact Card & Quiz',
          cat ? ` — ${cat} & Quiz` : null,
          cat ? ` — ${cat} Fact` : null,
          ' — Fact Card',
          cat ? ` — ${cat}` : null,
          ' — Science Fact',
          ' & Quiz',
        ];

  return qualifiers
    .filter((q): q is string => Boolean(q))
    .map((q) => `${head}${q} | ${TITLE_BRAND}`)
    .filter((candidate) => candidate.length <= DOCUMENT_TITLE_MAX);
}

export interface FactTitleOptions {
  categoryLabel?: string;
  lang?: 'tr' | 'en';
}

/** Document `<title>` only. Keeps headline within 50–60 chars when possible; on-page H1 stays full. */
export function buildFactDocumentTitle(headline: string, options?: FactTitleOptions): string {
  const clean = headline.replace(/\s+/g, ' ').trim();
  if (!clean) return TITLE_BRAND;

  const base = `${clean} | ${TITLE_BRAND}`;
  const current = base.length > DOCUMENT_TITLE_MAX ? fitDocumentTitle(base) : base;

  if (current.length >= DOCUMENT_TITLE_MIN || !options?.lang) {
    return current;
  }

  const head = current.endsWith(` | ${TITLE_BRAND}`)
    ? current.slice(0, -(` | ${TITLE_BRAND}`).length).trim()
    : current;
  const candidates = buildTitleEnrichmentCandidates(head, options.lang, options.categoryLabel);
  const ideal = candidates.find(
    (c) => c.length >= DOCUMENT_TITLE_MIN && c.length <= DOCUMENT_TITLE_MAX
  );
  if (ideal) return ideal;
  const longest = [...candidates].sort((a, b) => b.length - a.length)[0];
  if (longest && longest.length > current.length) return longest;
  return current;
}

function ensureTerminalPunctuation(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (/[.!?…]$/u.test(clean)) return clean;
  return `${clean}.`;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clipDescriptionToRange(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= META_DESCRIPTION_MAX) return clean;
  const sentences = splitSentences(clean);
  let accumulated = '';
  for (const sentence of sentences) {
    const next = accumulated ? `${accumulated} ${sentence}` : sentence;
    if (next.length > META_DESCRIPTION_MAX) break;
    accumulated = next;
  }
  if (accumulated.length >= META_DESCRIPTION_MIN && accumulated.length <= META_DESCRIPTION_MAX) {
    return accumulated;
  }
  const clipped = clipAtWord(clean, META_DESCRIPTION_MAX - 1);
  return `${clipped}…`;
}

export interface FactDescriptionOptions {
  deepDiveDetail?: string;
  sourceName?: string;
  lang?: 'tr' | 'en';
}

/** Meta description only, targeting 140–155 chars cleanly without modifying visible card copy. */
export function buildFactMetaDescription(text: string, options?: FactDescriptionOptions): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length >= META_DESCRIPTION_MIN && clean.length <= META_DESCRIPTION_MAX) {
    return clean;
  }
  if (clean.length > META_DESCRIPTION_MAX) {
    return clipDescriptionToRange(clean);
  }

  const base = ensureTerminalPunctuation(clean);
  const deep = options?.deepDiveDetail?.replace(/\s+/g, ' ').trim() || '';
  if (deep && deep.toLowerCase() !== clean.toLowerCase()) {
    let expanded = base;
    for (const sentence of splitSentences(deep)) {
      const next = `${expanded} ${sentence}`;
      if (next.length > META_DESCRIPTION_MAX) break;
      expanded = next;
      if (expanded.length >= META_DESCRIPTION_MIN) return expanded;
    }
  }

  const lang = options?.lang;
  const src = options?.sourceName?.replace(/\s+/g, ' ').trim() || '';
  if (lang) {
    const tails =
      lang === 'tr'
        ? [
            src ? ` ${src} kaynaklı kart, Neden/Nasıl açıklaması ve quiz ile keşfet.` : null,
            src ? ` Birincil kaynaklı kart (${src}) ve anlık quiz ile keşfet.` : null,
            src ? ` ${src} kaynaklı özet ve quiz ile keşfet.` : null,
            ' Birincil bilimsel kaynaklı özet, detaylı açıklama ve anlık quiz ile keşfet.',
            src ? ` Kaynak: ${src} — detaylı açıklama ve quiz.` : null,
            ' Doğrulanmış kaynak ve anlık quiz ile keşfet.',
            ' Kaynaklı özet ve anlık quiz ile keşfet.',
            ' Detaylı bilimsel açıklama ve quiz.',
            ' Doğrulanmış kaynak ve anlık quiz.',
            src ? ` Kaynak: ${src}.` : null,
            ' Kaynaklı kart & quiz.',
            ' Quiz ile keşfet.',
          ]
        : [
            src ? ` Verified via ${src} with Why/How breakdown and instant quiz.` : null,
            src ? ` Primary-source card (${src}) with breakdown and recall quiz.` : null,
            src ? ` Verified via ${src} with instant recall quiz.` : null,
            ' Verified primary-source summary, Why/How breakdown, and instant recall quiz.',
            src ? ` Source: ${src} — science breakdown and quiz.` : null,
            ' Verified source, breakdown, and instant quiz.',
            ' Verified source & instant recall quiz.',
            ' Full Why/How breakdown and recall quiz.',
            ' Verified card & instant quiz.',
            src ? ` Source: ${src}.` : null,
            ' Explore source & quiz.',
            ' Plus instant quiz.',
          ];

    for (const tail of tails) {
      if (!tail) continue;
      const candidate = `${base}${tail}`;
      if (candidate.length >= META_DESCRIPTION_MIN && candidate.length <= META_DESCRIPTION_MAX) {
        return candidate;
      }
    }
  }

  if (deep && deep.toLowerCase() !== clean.toLowerCase()) {
    return clipDescriptionToRange(`${base} ${deep}`);
  }
  return base;
}
