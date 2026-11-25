import { randomInt } from 'node:crypto';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import {
  DEFAULT_STORY_THEME,
  STORY_GRADIENT_PRESETS,
  type StoryCardItem,
  type StoryFontStyle,
  type StoryLanguage,
  type StoryQuotaSummary,
  type StoryRecord,
  type StorySurfaceStyle,
  type StoryTextAlign,
  type StoryTheme,
} from '@/types/story';
import { PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export const STARTER_MONTHLY_AI_LIMIT = 2;
export const STARTER_ACTIVE_STORIES_LIMIT = 3;

const STORY_ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const STORY_ID_REGEX = /^[a-zA-Z0-9_-]{4,40}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const VALID_GRADIENT_IDS = new Set(STORY_GRADIENT_PRESETS.map((g) => g.id));

declare global {
  var __scrollyMemoryStories: Map<string, StoryRecord> | undefined;
  var __scrollyMemoryStoryUsage: Map<string, number> | undefined;
}

function getMemoryStoriesMap(): Map<string, StoryRecord> {
  if (!globalThis.__scrollyMemoryStories) {
    globalThis.__scrollyMemoryStories = new Map<string, StoryRecord>();
  }
  return globalThis.__scrollyMemoryStories;
}

function getMemoryStoryUsageMap(): Map<string, number> {
  if (!globalThis.__scrollyMemoryStoryUsage) {
    globalThis.__scrollyMemoryStoryUsage = new Map<string, number>();
  }
  return globalThis.__scrollyMemoryStoryUsage;
}

export function getMaxDailyAiGenerations(): number {
  const parsed = Number(process.env.MAX_DAILY_AI_STORY_GENERATIONS);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(5000, Math.floor(parsed));
  }
  return 50;
}

function currentMonthBucketKey(userId: string): string {
  const ym = new Date().toISOString().slice(0, 7);
  return `user_month:${userId}:${ym}`;
}

function currentGlobalDayBucketKey(): string {
  const ymd = new Date().toISOString().slice(0, 10);
  return `global_day:${ymd}`;
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

  const surfaceStyle: StorySurfaceStyle =
    obj.surfaceStyle === 'solid' || obj.surfaceStyle === 'editorial' ? obj.surfaceStyle : 'glass';

  const rawOpacity = Number(obj.overlayOpacity);
  const overlayOpacity = Number.isFinite(rawOpacity)
    ? Math.max(20, Math.min(85, Math.round(rawOpacity)))
    : (DEFAULT_STORY_THEME.overlayOpacity ?? 58);

  const textAlign: StoryTextAlign = obj.textAlign === 'center' ? 'center' : 'left';
  const fontStyle: StoryFontStyle =
    obj.fontStyle === 'editorial' || obj.fontStyle === 'rounded' ? obj.fontStyle : 'modern';

  return { mode, accent, surfaceStyle, overlayOpacity, textAlign, fontStyle };
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
    if (!headline || !body) continue;

    const quizEnabled = obj.quizEnabled === false ? false : true;
    const rawQuestion = sanitizeDisplayText(obj.question, 220);
    const question =
      rawQuestion ||
      (quizEnabled
        ? ''
        : lang === 'tr'
          ? 'Hızlı Tahmin: Bu karttaki temel bulgu hangisidir?'
          : 'Quick Guess: What is the key takeaway of this card?');
    if (!question) continue;

    const rawOptions = Array.isArray(obj.options) ? obj.options : [];
    let options = rawOptions
      .slice(0, 4)
      .map((opt) => sanitizeDisplayText(opt, 120))
      .filter((opt) => Boolean(opt));
    if (options.length < 2) {
      if (quizEnabled) continue;
      options =
        lang === 'tr' ? ['Doğru Seçenek', 'Diğer Seçenek'] : ['Key Answer', 'Alternative'];
    }

    const rawIndex = Number(obj.correctIndex);
    const correctIndex =
      Number.isFinite(rawIndex) && rawIndex >= 0
        ? Math.min(options.length - 1, Math.floor(rawIndex))
        : 0;

    const sourceLabel =
      sanitizeDisplayText(obj.sourceLabel, 100) ||
      (lang === 'tr' ? 'Doğrulanmış Kaynak' : 'Verified Source');
    const mediaUrl = sanitizeStoryMediaUrl(obj.mediaUrl);

    const rawGradient = typeof obj.gradientId === 'string' ? obj.gradientId.trim() : '';
    const gradientId = VALID_GRADIENT_IDS.has(rawGradient)
      ? rawGradient
      : STORY_GRADIENT_PRESETS[out.length % STORY_GRADIENT_PRESETS.length].id;

    const ctaLabel = sanitizeDisplayText(obj.ctaLabel, 60) || undefined;
    const sanitizedCtaUrl = sanitizeStoryHttpUrl(obj.ctaUrl);
    const ctaUrl = ctaLabel && sanitizedCtaUrl ? sanitizedCtaUrl : undefined;

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
      gradientId,
      quizEnabled,
      ...(ctaLabel ? { ctaLabel } : {}),
      ...(ctaUrl ? { ctaUrl } : {}),
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

interface StoryDbRow {
  id: string;
  owner_user_id?: string | null;
  title: string;
  source_url: string | null;
  language: string | null;
  theme: unknown;
  cards: unknown;
  views_count: number | null;
  completions_count: number | null;
  created_at: Date | string | null;
  updated_at?: Date | string | null;
}

function rowToStoryRecord(row: StoryDbRow): StoryRecord {
  const language: StoryLanguage = row.language === 'en' ? 'en' : 'tr';
  return {
    id: row.id,
    ownerUserId: row.owner_user_id ?? null,
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
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at
          ? String(row.updated_at)
          : undefined,
  };
}

export async function getStoryQuotaSummary(userId: string): Promise<StoryQuotaSummary> {
  const userBucket = currentMonthBucketKey(userId);
  const globalBucket = currentGlobalDayBucketKey();
  const dailyMax = getMaxDailyAiGenerations();

  if (!hasDatabaseUrl()) {
    const usage = getMemoryStoryUsageMap();
    const stories = Array.from(getMemoryStoriesMap().values()).filter(
      (s) => s.ownerUserId === userId
    );
    const aiMonthlyUsed = Math.max(0, usage.get(userBucket) ?? 0);
    const dailyUsed = Math.max(0, usage.get(globalBucket) ?? 0);
    return {
      plan: 'starter',
      aiMonthlyLimit: STARTER_MONTHLY_AI_LIMIT,
      aiMonthlyUsed,
      aiMonthlyRemaining: Math.max(0, STARTER_MONTHLY_AI_LIMIT - aiMonthlyUsed),
      activeStoriesLimit: STARTER_ACTIVE_STORIES_LIMIT,
      activeStoriesCount: stories.length,
      dailyGlobalRemaining: Math.max(0, dailyMax - dailyUsed),
    };
  }

  await ensureSchema();
  const pool = getPool();
  const [usageRes, countRes] = await Promise.all([
    pool.query<{ bucket_key: string; count: number }>(
      `SELECT bucket_key, count FROM story_usage WHERE bucket_key = ANY($1::text[])`,
      [[userBucket, globalBucket]]
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::INT AS total FROM stories WHERE owner_user_id = $1`,
      [userId]
    ),
  ]);

  let aiMonthlyUsed = 0;
  let dailyUsed = 0;
  for (const row of usageRes.rows) {
    if (row.bucket_key === userBucket) aiMonthlyUsed = Math.max(0, Number(row.count) || 0);
    if (row.bucket_key === globalBucket) dailyUsed = Math.max(0, Number(row.count) || 0);
  }
  const activeStoriesCount = Math.max(0, Number(countRes.rows[0]?.total) || 0);

  return {
    plan: 'starter',
    aiMonthlyLimit: STARTER_MONTHLY_AI_LIMIT,
    aiMonthlyUsed,
    aiMonthlyRemaining: Math.max(0, STARTER_MONTHLY_AI_LIMIT - aiMonthlyUsed),
    activeStoriesLimit: STARTER_ACTIVE_STORIES_LIMIT,
    activeStoriesCount,
    dailyGlobalRemaining: Math.max(0, dailyMax - dailyUsed),
  };
}

export async function checkAiGenerationAllowed(
  userId: string
): Promise<
  | { ok: true; quota: StoryQuotaSummary }
  | { ok: false; error: 'daily_circuit_breaker' | 'monthly_ai_quota_exceeded'; quota: StoryQuotaSummary }
> {
  const quota = await getStoryQuotaSummary(userId);
  if (quota.dailyGlobalRemaining <= 0) {
    return { ok: false, error: 'daily_circuit_breaker', quota };
  }
  if (quota.aiMonthlyRemaining <= 0) {
    return { ok: false, error: 'monthly_ai_quota_exceeded', quota };
  }
  return { ok: true, quota };
}

export async function consumeAiGenerationCredit(userId: string): Promise<StoryQuotaSummary> {
  const userBucket = currentMonthBucketKey(userId);
  const globalBucket = currentGlobalDayBucketKey();

  if (!hasDatabaseUrl()) {
    const usage = getMemoryStoryUsageMap();
    usage.set(userBucket, (usage.get(userBucket) ?? 0) + 1);
    usage.set(globalBucket, (usage.get(globalBucket) ?? 0) + 1);
    return getStoryQuotaSummary(userId);
  }

  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO story_usage (bucket_key, count, updated_at)
     VALUES ($1, 1, NOW()), ($2, 1, NOW())
     ON CONFLICT (bucket_key) DO UPDATE
       SET count = story_usage.count + 1,
           updated_at = NOW()`,
    [userBucket, globalBucket]
  );

  return getStoryQuotaSummary(userId);
}

export async function listStoriesByOwner(ownerUserId: string): Promise<StoryRecord[]> {
  const cleanOwner = String(ownerUserId || '').trim();
  if (!cleanOwner) return [];

  if (!hasDatabaseUrl()) {
    return Array.from(getMemoryStoriesMap().values())
      .filter((s) => s.ownerUserId === cleanOwner)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<StoryDbRow>(
    `SELECT id, owner_user_id, title, source_url, language, theme, cards,
            views_count, completions_count, created_at, updated_at
     FROM stories
     WHERE owner_user_id = $1
     ORDER BY created_at DESC
     LIMIT 24`,
    [cleanOwner]
  );
  return res.rows.map(rowToStoryRecord);
}

export async function createStory(input: {
  ownerUserId: string;
  title?: unknown;
  sourceUrl?: unknown;
  language?: unknown;
  theme?: unknown;
  cards?: unknown;
}): Promise<
  | { ok: true; story: StoryRecord }
  | { ok: false; error: 'invalid_title' | 'invalid_cards' | 'story_limit_reached' }
> {
  const ownerUserId = String(input.ownerUserId || '').trim();
  const language: StoryLanguage = input.language === 'en' ? 'en' : 'tr';
  const title = sanitizeDisplayText(input.title, 140);
  if (!title || title.length < 2) {
    return { ok: false, error: 'invalid_title' };
  }

  const cards = sanitizeStoryCards(input.cards, language);
  if (cards.length === 0) {
    return { ok: false, error: 'invalid_cards' };
  }

  const quota = await getStoryQuotaSummary(ownerUserId);
  if (quota.activeStoriesCount >= STARTER_ACTIVE_STORIES_LIMIT) {
    return { ok: false, error: 'story_limit_reached' };
  }

  const sourceUrl = sanitizeStoryHttpUrl(input.sourceUrl);
  const theme = sanitizeStoryTheme(input.theme);
  const nowIso = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const map = getMemoryStoriesMap();
    let id = generateStoryId(8);
    for (let attempt = 0; attempt < 6 && map.has(id); attempt += 1) {
      id = generateStoryId(8);
    }
    const story: StoryRecord = {
      id,
      ownerUserId,
      title,
      sourceUrl,
      language,
      theme,
      cards,
      viewsCount: 0,
      completionsCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    map.set(id, story);
    return { ok: true, story };
  }

  await ensureSchema();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = generateStoryId(8);
    const res = await pool.query<StoryDbRow>(
      `INSERT INTO stories (id, owner_user_id, title, source_url, language, theme, cards, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())
       ON CONFLICT (id) DO NOTHING
       RETURNING id, owner_user_id, title, source_url, language, theme, cards,
                 views_count, completions_count, created_at, updated_at`,
      [id, ownerUserId, title, sourceUrl, language, JSON.stringify(theme), JSON.stringify(cards)]
    );
    const row = res.rows[0];
    if (row) {
      return { ok: true, story: rowToStoryRecord(row) };
    }
  }

  throw new Error('Failed to allocate unique story id.');
}

export async function updateStory(
  rawId: string,
  ownerUserId: string,
  patch: {
    title?: unknown;
    sourceUrl?: unknown;
    language?: unknown;
    theme?: unknown;
    cards?: unknown;
  }
): Promise<
  | { ok: true; story: StoryRecord }
  | { ok: false; error: 'not_found' | 'forbidden' | 'invalid_title' | 'invalid_cards' }
> {
  const id = String(rawId || '').trim();
  if (!isValidStoryId(id)) return { ok: false, error: 'not_found' };

  const language: StoryLanguage = patch.language === 'en' ? 'en' : 'tr';
  const title = sanitizeDisplayText(patch.title, 140);
  if (!title || title.length < 2) {
    return { ok: false, error: 'invalid_title' };
  }
  const cards = sanitizeStoryCards(patch.cards, language);
  if (cards.length === 0) {
    return { ok: false, error: 'invalid_cards' };
  }
  const sourceUrl = sanitizeStoryHttpUrl(patch.sourceUrl);
  const theme = sanitizeStoryTheme(patch.theme);

  if (!hasDatabaseUrl()) {
    const map = getMemoryStoriesMap();
    const existing = map.get(id);
    if (!existing) return { ok: false, error: 'not_found' };
    if (existing.ownerUserId !== ownerUserId) return { ok: false, error: 'forbidden' };
    const updated: StoryRecord = {
      ...existing,
      title,
      sourceUrl,
      language,
      theme,
      cards,
      updatedAt: new Date().toISOString(),
    };
    map.set(id, updated);
    return { ok: true, story: updated };
  }

  await ensureSchema();
  const pool = getPool();
  const existingRes = await pool.query<{ owner_user_id: string | null }>(
    `SELECT owner_user_id FROM stories WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existingRes.rowCount === 0) {
    return { ok: false, error: 'not_found' };
  }
  if (existingRes.rows[0]?.owner_user_id !== ownerUserId) {
    return { ok: false, error: 'forbidden' };
  }

  const res = await pool.query<StoryDbRow>(
    `UPDATE stories
     SET title = $2,
         source_url = $3,
         language = $4,
         theme = $5::jsonb,
         cards = $6::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND owner_user_id = $7
     RETURNING id, owner_user_id, title, source_url, language, theme, cards,
               views_count, completions_count, created_at, updated_at`,
    [id, title, sourceUrl, language, JSON.stringify(theme), JSON.stringify(cards), ownerUserId]
  );
  const row = res.rows[0];
  if (!row) return { ok: false, error: 'forbidden' };
  return { ok: true, story: rowToStoryRecord(row) };
}

export async function deleteStory(
  rawId: string,
  ownerUserId: string
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'forbidden' }> {
  const id = String(rawId || '').trim();
  if (!isValidStoryId(id)) return { ok: false, error: 'not_found' };

  if (!hasDatabaseUrl()) {
    const map = getMemoryStoriesMap();
    const existing = map.get(id);
    if (!existing) return { ok: false, error: 'not_found' };
    if (existing.ownerUserId !== ownerUserId) return { ok: false, error: 'forbidden' };
    map.delete(id);
    return { ok: true };
  }

  await ensureSchema();
  const pool = getPool();
  const existingRes = await pool.query<{ owner_user_id: string | null }>(
    `SELECT owner_user_id FROM stories WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existingRes.rowCount === 0) {
    return { ok: false, error: 'not_found' };
  }
  if (existingRes.rows[0]?.owner_user_id !== ownerUserId) {
    return { ok: false, error: 'forbidden' };
  }

  await pool.query(`DELETE FROM stories WHERE id = $1 AND owner_user_id = $2`, [id, ownerUserId]);
  return { ok: true };
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
       RETURNING id, owner_user_id, title, source_url, language, theme, cards,
                 views_count, completions_count, created_at, updated_at`
    : `SELECT id, owner_user_id, title, source_url, language, theme, cards,
              views_count, completions_count, created_at, updated_at
       FROM stories
       WHERE id = $1
       LIMIT 1`;

  const res = await pool.query<StoryDbRow>(queryText, [id]);
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
