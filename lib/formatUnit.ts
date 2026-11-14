import type { Language } from '@/i18n/translations';

interface UnitPair {
  singular: string;
  plural: string;
}

const ENGLISH_UNIT_PAIRS: UnitPair[] = [
  // Irregulars
  { singular: 'person', plural: 'people' },
  { singular: 'foot', plural: 'feet' },
  { singular: 'tooth', plural: 'teeth' },
  { singular: 'species', plural: 'species' },
  { singular: 'century', plural: 'centuries' },
  // Regular / domain units
  { singular: 'heart', plural: 'hearts' },
  { singular: 'day', plural: 'days' },
  { singular: 'second', plural: 'seconds' },
  { singular: 'minute', plural: 'minutes' },
  { singular: 'hour', plural: 'hours' },
  { singular: 'year', plural: 'years' },
  { singular: 'month', plural: 'months' },
  { singular: 'week', plural: 'weeks' },
  { singular: 'time', plural: 'times' },
  { singular: 'side', plural: 'sides' },
  { singular: 'type', plural: 'types' },
  { singular: 'gear', plural: 'gears' },
  { singular: 'beat', plural: 'beats' },
  { singular: 'drop', plural: 'drops' },
  { singular: 'degree', plural: 'degrees' },
  { singular: 'meter', plural: 'meters' },
  { singular: 'metre', plural: 'metres' },
  { singular: 'kilometer', plural: 'kilometers' },
  { singular: 'kilometre', plural: 'kilometres' },
  { singular: 'gram', plural: 'grams' },
  { singular: 'ton', plural: 'tons' },
  { singular: 'percent', plural: 'percent' },
  { singular: 'layer', plural: 'layers' },
  { singular: 'atom', plural: 'atoms' },
  { singular: 'bone', plural: 'bones' },
  { singular: 'cell', plural: 'cells' },
  { singular: 'lung', plural: 'lungs' },
  { singular: 'eye', plural: 'eyes' },
  { singular: 'neuron', plural: 'neurons' },
  { singular: 'planet', plural: 'planets' },
  { singular: 'moon', plural: 'moons' },
  { singular: 'star', plural: 'stars' },
];

const INVARIANT_SYMBOLS = new Set([
  '%',
  '°',
  '°c',
  '°f',
  'k',
  'km',
  'm',
  'cm',
  'mm',
  'nm',
  'µm',
  'um',
  'db',
  'bpm',
  'm/s',
  'km/h',
  'km/s',
  'kg',
  'g',
  'mg',
  'hz',
  'khz',
  'mhz',
  'ghz',
  'w',
  'kw',
  'v',
  'ev',
  'x',
  '×',
  'x daha',
  'kat',
  'katı',
  'sn',
]);

const COMPACT_SYMBOLS = new Set(['%', '°', '°C', '°F']);

const ENGLISH_LOOKUP = new Map<string, UnitPair>();
for (const pair of ENGLISH_UNIT_PAIRS) {
  ENGLISH_LOOKUP.set(pair.singular.toLowerCase(), pair);
  ENGLISH_LOOKUP.set(pair.plural.toLowerCase(), pair);
}

function formatNumericDisplay(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

function matchCase(source: string, template: string): string {
  if (!template) return source;
  if (template === template.toUpperCase() && template !== template.toLowerCase()) {
    return source.toUpperCase();
  }
  if (template[0] === template[0].toUpperCase() && template[0] !== template[0].toLowerCase()) {
    return source.charAt(0).toUpperCase() + source.slice(1);
  }
  return source;
}

function normalizeTurkishUnit(rawUnit: string): string {
  const trimmed = rawUnit.trim();
  if (!trimmed) return '';
  if (INVARIANT_SYMBOLS.has(trimmed.toLowerCase())) {
    return trimmed;
  }
  // In Turkish, units following numbers are never pluralized (e.g., "3 kalp", never "3 kalpler").
  const lower = trimmed.toLowerCase();
  if (lower.length > 4 && (lower.endsWith('lar') || lower.endsWith('ler'))) {
    // Only strip obvious accidental Turkish plural suffix if not part of root exceptions.
    const rootExceptions = new Set(['dolar', 'saatler', 'kiler']);
    if (!rootExceptions.has(lower)) {
      return trimmed.slice(0, -3);
    }
  }
  return trimmed;
}

/**
 * Formats a numeric value together with an appropriately inflected singular/plural unit.
 * - English: singular when Math.abs(value) === 1 (e.g. `1 heart`, `1 day`), plural otherwise (`0 hearts`, `2 hearts`).
 * - Turkish: never appends plural suffixes after numbers (e.g. `1 kalp`, `3 kalp`).
 */
export function formatUnit(
  value: number,
  singular: string,
  plural?: string,
  lang: Language = 'en'
): string {
  const numStr = formatNumericDisplay(value);
  const trimmedSingular = singular.trim();
  if (!trimmedSingular) return numStr;

  if (lang === 'tr') {
    const unit = normalizeTurkishUnit(trimmedSingular);
    if (!unit) return numStr;
    return COMPACT_SYMBOLS.has(unit) ? `${numStr}${unit}` : `${numStr} ${unit}`;
  }

  const lower = trimmedSingular.toLowerCase();
  if (INVARIANT_SYMBOLS.has(lower)) {
    return COMPACT_SYMBOLS.has(trimmedSingular)
      ? `${numStr}${trimmedSingular}`
      : `${numStr} ${trimmedSingular}`;
  }

  const known = ENGLISH_LOOKUP.get(lower);
  const resolvedSingular = known ? matchCase(known.singular, trimmedSingular) : trimmedSingular;
  const resolvedPlural =
    plural?.trim() ||
    (known
      ? matchCase(known.plural, trimmedSingular)
      : lower.endsWith('s')
        ? trimmedSingular
        : lower.endsWith('y') && !/[aeiou]y$/.test(lower)
          ? `${trimmedSingular.slice(0, -1)}ies`
          : /(s|x|z|ch|sh)$/.test(lower)
            ? `${trimmedSingular}es`
            : `${trimmedSingular}s`);

  const chosen = Math.abs(value) === 1 ? resolvedSingular : resolvedPlural;
  return COMPACT_SYMBOLS.has(chosen) ? `${numStr}${chosen}` : `${numStr} ${chosen}`;
}

/**
 * Convenience helper for single-unit strings stored in card schemas (`challenge.unit`).
 * Handles cases where `challenge.unit` was stored in plural form (e.g. `"hearts"`, `"days"`).
 */
export function formatValueWithUnit(
  value: number,
  unit?: string,
  lang: Language = 'en'
): string {
  const numStr = formatNumericDisplay(value);
  if (!unit || !unit.trim()) return numStr;

  const trimmed = unit.trim();
  if (lang === 'tr') {
    return formatUnit(value, trimmed, trimmed, 'tr');
  }

  const lower = trimmed.toLowerCase();
  if (INVARIANT_SYMBOLS.has(lower)) {
    return COMPACT_SYMBOLS.has(trimmed) ? `${numStr}${trimmed}` : `${numStr} ${trimmed}`;
  }

  const known = ENGLISH_LOOKUP.get(lower);
  if (known) {
    return formatUnit(
      value,
      matchCase(known.singular, trimmed),
      matchCase(known.plural, trimmed),
      'en'
    );
  }

  // Handle regular plural inputs like "minutes", "seconds", "years", "planets"
  if (lower.endsWith('ies') && lower.length > 4) {
    const singularGuess = `${trimmed.slice(0, -3)}y`;
    return formatUnit(value, singularGuess, trimmed, 'en');
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) {
    const singularGuess = trimmed.slice(0, -1);
    return formatUnit(value, singularGuess, trimmed, 'en');
  }

  return formatUnit(value, trimmed, undefined, 'en');
}
