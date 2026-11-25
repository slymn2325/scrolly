import { randomInt } from 'node:crypto';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import {
  DEFAULT_STORY_THEME,
  type StoryCardItem,
  type StoryLanguage,
  type StoryRecord,
  type StoryTheme,
} from '@/types/story';
import { PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

const STORY_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const STORY_ID_REGEX = /^[a-zA-Z0-9_-]{4,40}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

declare global {
  var __scrollyMemoryStories: Map<string, StoryRecord> | undefined;
}

function getMemoryStoriesMap(): Map<string, StoryRecord> {
  if (!globalThis.__scrollyMemoryStories) {
    globalThis.__scrollyMemoryStories = new Map<string, StoryRecord>();
  }
  return globalThis.__scrollyMemoryStories;
}

export function generateStoryId(length = 8): string {
  const safeLen = Math.max(6, Math.min(12, Math.floor(length)));
  let suffix = '';
  for (let i = 0; i < safeLen; i += 1) {
    suffix += STORY_ID_ALPHABET[randomInt(0, STORY_ID_ALPHABET.length)];
  }
  return `st_${suffix}`;
}

export function isValidStoryId(raw: unknown): raw is string {
  return typeof raw === 'string' && STORY_ID_REGEX.test(raw.trim());
}

export function sanitizeStoryHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 800);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (parsed.username !== '' || parsed.password !== '') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeStoryMediaUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 800);
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    if (parsed.username !== '' || parsed.password !== '') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function sanitizeStoryTheme(raw: unknown): StoryTheme {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_STORY_THEME };
  }
  const obj = raw as Record<string, unknown>;
  const mode = obj.mode === 'light' ? 'light' : 'dark';
  const accentRaw = typeof obj.accent === 'string' ? obj.accent.trim() : '';
  const accent = HEX_COLOR_REGEX.test(accentRaw) ? accentRaw.toUpperCase() : DEFAULT_STORY_THEME.accent;
  return { mode, accent };
}

export function sanitizeStoryCards(raw: unknown, lang: StoryLanguage): StoryCardItem[] {
  let candidate = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(candidate)) return [];

  const seenIds = new Set<string>();
  const out: StoryCardItem[] = [];

  for (let idx = 0; idx < candidate.length; idx += 1) {
    const item = candidate[idx];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;

    const rawId = typeof obj.id === 'string' ? obj.id.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
    let cardId = rawId.slice(0, 48) || `card-${idx + 1}`;
    if (seenIds.has(cardId)) {
      cardId = `${cardId}-${idx + 1}`;
    }

    const headline = sanitizeDisplayText(obj.headline, 140);
    const body = sanitizeDisplayText(obj.body, 520);
    const question = sanitizeDisplayText(obj.question, 220);
    if (!headline || !body || !question) continue;

    const rawOptions = Array.isArray(obj.options) ? obj.options : [];
    const options = rawOptions
      .slice(0, 4)
      .map((opt) => sanitizeDisplayText(opt, 120))
      .filter((opt) => Boolean(opt));
    if (options.length < 2) continue;

    const rawIndex = Number(obj.correctIndex);
    const correctIndex =
      Number.isFinite(rawIndex) && rawIndex >= 0
        ? Math.min(options.length - 1, Math.floor(rawIndex))
        : 0;

    const sourceLabel =
      sanitizeDisplayText(obj.sourceLabel, 100) ||
      (lang === 'tr' ? 'Doğrulanmış Kaynak' : 'Verified Source');
    const mediaUrl = sanitizeStoryMediaUrl(obj.mediaUrl);

    seenIds.add(cardId);
    out.push({
      id: cardId,
      headline,
      body,
      question,
      options,
      correctIndex,
      sourceLabel,
      mediaUrl,
    });

    if (out.length >= 12) break;
  }

  return out;
}

export function buildStoryEmbedArtifacts(
  id: string,
  title: string,
  origin?: string
): { embedUrl: string; iframeCode: string } {
  const safeBase =
    origin && /^https?:\/\//i.test(origin)
      ? origin.replace(/\/+$/, '')
      : PUBLIC_SITE_ORIGIN;
  const safeId = encodeURIComponent(id);
  const embedUrl = `${safeBase}/embed/${safeId}`;
  const safeTitle = sanitizeDisplayText(title, 100, 'Scrolly Story').replace(/"/g, '&quot;');
  const iframeCode = `<iframe src="${embedUrl}" title="${safeTitle}" width="100%" height="640" style="border:0;border-radius:20px;overflow:hidden;max-width:460px;" loading="lazy" allow="clipboard-write" allowfullscreen></iframe>`;
  return { embedUrl, iframeCode };
}

function rowToStoryRecord(row: {
  id: string;
  title: string;
  source_url: string | null;
  language: string | null;
  theme: unknown;
  cards: unknown;
  views_count: number | null;
  completions_count: number | null;
  created_at: Date | string | null;
}): StoryRecord {
  const language: StoryLanguage = row.language === 'en' ? 'en' : 'tr';
  return {
    id: row.id,
    title: sanitizeDisplayText(row.title, 140, 'Scrolly Story'),
    sourceUrl: sanitizeStoryHttpUrl(row.source_url),
    language,
    theme: sanitizeStoryTheme(row.theme),
    cards: sanitizeStoryCards(row.cards, language),
    viewsCount: Math.max(0, Number(row.views_count) || 0),
    completionsCount: Math.max(0, Number(row.completions_count) || 0),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
  };
}

export async function createStory(input: {
  title?: unknown;
  sourceUrl?: unknown;
  language?: unknown;
  theme?: unknown;
  cards?: unknown;
}): Promise<{ ok: true; story: StoryRecord } | { ok: false; error: 'invalid_title' | 'invalid_cards' }> {
  const language: StoryLanguage = input.language === 'en' ? 'en' : 'tr';
  const title = sanitizeDisplayText(input.title, 140);
  if (!title || title.length < 2) {
    return { ok: false, error: 'invalid_title' };
  }

  const cards = sanitizeStoryCards(input.cards, language);
  if (cards.length === 0) {
    return { ok: false, error: 'invalid_cards' };
  }

  const sourceUrl = sanitizeStoryHttpUrl(input.sourceUrl);
  const theme = sanitizeStoryTheme(input.theme);
  const createdAt = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const map = getMemoryStoriesMap();
    let id = generateStoryId(8);
    for (let attempt = 0; attempt < 6 && map.has(id); attempt += 1) {
      id = generateStoryId(8);
    }
    const story: StoryRecord = {
      id,
      title,
      sourceUrl,
      language,
      theme,
      cards,
      viewsCount: 0,
      completionsCount: 0,
      createdAt,
    };
    map.set(id, story);
    return { ok: true, story };
  }

  await ensureSchema();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateStoryId(8);
    const res = await pool.query<{
      id: string;
      title: string;
      source_url: string | null;
      language: string;
      theme: unknown;
      cards: unknown;
      views_count: number;
      completions_count: number;
      created_at: Date | string;
    }>(
      `INSERT INTO stories (id, title, source_url, language, theme, cards)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, title, source_url, language, theme, cards, views_count, completions_count, created_at`,
      [id, title, sourceUrl, language, JSON.stringify(theme), JSON.stringify(cards)]
    );
    const row = res.rows[0];
    if (row) {
      return { ok: true, story: rowToStoryRecord(row) };
    }
  }

  throw new Error('Failed to allocate unique story id.');
}

export async function getStoryById(
  rawId: string,
  options?: { incrementViews?: boolean }
): Promise<StoryRecord | null> {
  const id = String(rawId || '').trim();
  if (!isValidStoryId(id)) return null;

  if (!hasDatabaseUrl()) {
    const map = getMemoryStoriesMap();
    const existing = map.get(id);
    if (!existing) return null;
    if (options?.incrementViews) {
      existing.viewsCount += 1;
    }
    return { ...existing };
  }

  await ensureSchema();
  const pool = getPool();
  const queryText = options?.incrementViews
    ? `UPDATE stories
       SET views_count = views_count + 1
       WHERE id = $1
       RETURNING id, title, source_url, language, theme, cards, views_count, completions_count, created_at`
    : `SELECT id, title, source_url, language, theme, cards, views_count, completions_count, created_at
       FROM stories
       WHERE id = $1
       LIMIT 1`;

  const res = await pool.query<{
    id: string;
    title: string;
    source_url: string | null;
    language: string;
    theme: unknown;
    cards: unknown;
    views_count: number;
    completions_count: number;
    created_at: Date | string;
  }>(queryText, [id]);

  const row = res.rows[0];
  return row ? rowToStoryRecord(row) : null;
}

export async function incrementStoryCompletions(rawId: string): Promise<boolean> {
  const id = String(rawId || '').trim();
  if (!isValidStoryId(id)) return false;

  if (!hasDatabaseUrl()) {
    const existing = getMemoryStoriesMap().get(id);
    if (!existing) return false;
    existing.completionsCount += 1;
    return true;
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE stories
     SET completions_count = completions_count + 1
     WHERE id = $1`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}
