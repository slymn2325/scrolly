import { buildFactHref } from '@/utils/factsData';

/** 2026-07-17 is puzzle #0, so 2026-11-17 is Scrolly Günlük #123. */
const DAILY_EPOCH_UTC = Date.UTC(2026, 6, 17);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const PUBLIC_SITE_HOST = 'scrolly.live';
export const PUBLIC_SITE_ORIGIN = `https://${PUBLIC_SITE_HOST}`;

export function parseIsoDate(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

export function dailyPuzzleNumber(isoDate: string): number {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return 0;
  const [year, month, day] = parsed.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  return Math.round((utc - DAILY_EPOCH_UTC) / 86_400_000);
}

export function istanbulTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function canonicalFactShareUrl(slug: string, lang: 'tr' | 'en'): string {
  return `${PUBLIC_SITE_ORIGIN}${buildFactHref(slug, lang)}`;
}

export function dailyResultPath(isoDate: string, lang: 'tr' | 'en'): string {
  return lang === 'en' ? `/en/daily/${isoDate}` : `/gunluk/${isoDate}`;
}

export function dailyPlayHref(isoDate: string, lang: 'tr' | 'en'): string {
  const params = new URLSearchParams({ openQuiz: 'daily', quizDate: isoDate });
  if (lang === 'en') params.set('lang', 'en');
  return `/?${params.toString()}`;
}

export function buildDailyResultShareText(input: {
  lang: 'tr' | 'en';
  isoDate: string;
  results: boolean[];
  elapsedSec: number;
}): string {
  const number = dailyPuzzleNumber(input.isoDate);
  const grid = input.results.map((ok) => (ok ? '🟩' : '🟥')).join('');
  const correct = input.results.filter(Boolean).length;
  const total = input.results.length;
  const seconds = Math.max(0, Math.round(input.elapsedSec));
  const path = `${PUBLIC_SITE_HOST}${dailyResultPath(input.isoDate, input.lang)}`;
  if (input.lang === 'en') {
    return `Scrolly Daily #${number} ${grid} ${correct}/${total} ⏱ ${seconds}s ${path}`;
  }
  return `Scrolly Günlük #${number} ${grid} ${correct}/${total} ⏱ ${seconds} sn ${path}`;
}

export function duelInvitePath(code: string, lang: 'tr' | 'en'): string {
  const safe = String(code || '').trim().toUpperCase();
  return lang === 'en' ? `/en/duel/${safe}` : `/duello/${safe}`;
}

export function duelInviteUrl(code: string, lang: 'tr' | 'en', origin?: string): string {
  const base = origin && /^https?:\/\//.test(origin) ? origin.replace(/\/$/, '') : PUBLIC_SITE_ORIGIN;
  return `${base}${duelInvitePath(code, lang)}`;
}

export function duelJoinHref(code: string, lang: 'tr' | 'en'): string {
  const params = new URLSearchParams({ tab: 'duel', room: code.trim().toUpperCase() });
  if (lang === 'en') params.set('lang', 'en');
  return `/?${params.toString()}`;
}

function cleanInviteName(name: string): string {
  let out = '';
  const source = String(name || '');
  for (let i = 0; i < source.length && out.length < 24; i += 1) {
    const code = source.charCodeAt(i);
    const ch = source[i];
    if (code < 32 || ch === '<' || ch === '>') continue;
    out += ch;
  }
  return out.trim();
}

export function duelInviteTitle(name: string, lang: 'tr' | 'en'): string {
  const clean = cleanInviteName(name);
  if (lang === 'en') {
    return clean ? `${clean} challenged you to a Scrolly duel` : 'You are invited to a Scrolly duel';
  }
  return clean ? `${clean} seni Scrolly düellosuna çağırdı` : 'Seni Scrolly düellosuna çağırdı';
}
