import { Pool } from 'pg';
import type { Language } from '@/i18n/translations';
import { formatValueWithUnit } from '@/lib/formatUnit';
import type { CategoryId, FactCard, FactQuizContent, GuessChallenge } from '@/types/fact';
import { getAllFacts, getFactPrimarySlug } from '@/utils/factsData';

export interface DbFactRow {
  id: number;
  slug: string;
  category: string;
  title_tr: string | null;
  title_en: string | null;
  summary_tr: string | null;
  summary_en: string | null;
  detail_tr: string | null;
  detail_en: string | null;
  question_tr: string | null;
  question_en: string | null;
  unit_tr: string | null;
  unit_en: string | null;
  min_val: string | number | null;
  max_val: string | number | null;
  answer_val: string | number | null;
  sketch_type: string | null;
  source_name: string | null;
  source_url: string | null;
  likes_count: number | null;
  created_at: Date | string | null;
}

const VALID_CATEGORIES = new Set<CategoryId>([
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
]);

const CATEGORY_VISUAL_DEFAULTS: Record<
  CategoryId,
  { accentColor: string; iconName: string; emoji: string; tagTr: string; tagEn: string }
> = {
  space: {
    accentColor: '#7C3AED',
    iconName: 'Orbit',
    emoji: '🪐',
    tagTr: 'Kozmik Keşif',
    tagEn: 'Cosmic Discovery',
  },
  nature: {
    accentColor: '#059669',
    iconName: 'Leaf',
    emoji: '🌿',
    tagTr: 'Doğa Harikası',
    tagEn: 'Nature Wonder',
  },
  human_body: {
    accentColor: '#E11D48',
    iconName: 'HeartPulse',
    emoji: '🫀',
    tagTr: 'İnsan Biyolojisi',
    tagEn: 'Human Biology',
  },
  history: {
    accentColor: '#D97706',
    iconName: 'Hourglass',
    emoji: '🏛️',
    tagTr: 'Tarih Arşivi',
    tagEn: 'History Archive',
  },
  science: {
    accentColor: '#0284C7',
    iconName: 'Atom',
    emoji: '⚛️',
    tagTr: 'Bilimsel Bulgu',
    tagEn: 'Scientific Finding',
  },
  records: {
    accentColor: '#DB2777',
    iconName: 'Trophy',
    emoji: '🏆',
    tagTr: 'İlginç Rekor',
    tagEn: 'Odd Record',
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __scrollyPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __scrollySchemaReadyPromise: Promise<void> | undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPool(): Pool {
  if (!hasDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  if (!global.__scrollyPgPool) {
    global.__scrollyPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  return global.__scrollyPgPool;
}

async function seedInitialFactsIfEmpty(pool: Pool): Promise<void> {
  const countRes = await pool.query<{ count: number }>(
    'SELECT COUNT(*)::INT AS count FROM facts'
  );
  const existingCount = countRes.rows[0]?.count ?? 0;
  if (existingCount > 0) return;

  const initialFacts = getAllFacts();
  for (let idx = 0; idx < initialFacts.length; idx += 1) {
    const fact = initialFacts[idx];
    const slug = getFactPrimarySlug(fact);
    const guessTr = fact.tr.guessChallenge;
    const guessEn = fact.en.guessChallenge;
    const minVal = typeof guessEn?.min === 'number' ? guessEn.min : 0;
    const maxVal = typeof guessEn?.max === 'number' ? guessEn.max : 100;
    const answerVal =
      typeof guessEn?.correctValue === 'number'
        ? guessEn.correctValue
        : guessEn?.type === 'binary'
          ? 1
          : 50;

    await pool.query(
      `INSERT INTO facts (
        slug, category, title_tr, title_en, summary_tr, summary_en,
        detail_tr, detail_en, question_tr, question_en,
        unit_tr, unit_en, min_val, max_val, answer_val,
        sketch_type, source_name, source_url, likes_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, 0, NOW() - ($19 * INTERVAL '1 second')
      )
      ON CONFLICT (slug) DO NOTHING`,
      [
        slug,
        fact.category,
        fact.tr.title,
        fact.en.title,
        fact.tr.factText,
        fact.en.factText,
        fact.tr.deepDiveDetail,
        fact.en.deepDiveDetail,
        guessTr?.prompt || fact.tr.quiz.question,
        guessEn?.prompt || fact.en.quiz.question,
        guessTr?.unit || '',
        guessEn?.unit || '',
        minVal,
        maxVal,
        answerVal,
        fact.id,
        fact.en.sourceName || fact.sourceName || fact.en.sourceHint,
        fact.en.sourceUrl || fact.sourceUrl || '',
        idx + 1,
      ]
    );
  }
}

export async function ensureSchema(): Promise<void> {
  if (!hasDatabaseUrl()) return;

  if (!global.__scrollySchemaReadyPromise) {
    global.__scrollySchemaReadyPromise = (async () => {
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS facts (
          id SERIAL PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL,
          title_tr TEXT,
          title_en TEXT,
          summary_tr TEXT,
          summary_en TEXT,
          detail_tr TEXT,
          detail_en TEXT,
          question_tr TEXT,
          question_en TEXT,
          unit_tr TEXT,
          unit_en TEXT,
          min_val NUMERIC,
          max_val NUMERIC,
          answer_val NUMERIC,
          sketch_type TEXT,
          source_name TEXT,
          source_url TEXT,
          likes_count INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS fact_events (
          id BIGSERIAL PRIMARY KEY,
          device_id TEXT NOT NULL,
          fact_slug TEXT NOT NULL,
          category TEXT NOT NULL,
          event_type TEXT NOT NULL,
          meta JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_fact_events_slug_type
          ON fact_events (fact_slug, event_type);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_fact_events_device
          ON fact_events (device_id, created_at DESC);
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          device_id TEXT PRIMARY KEY,
          username TEXT,
          xp INT DEFAULT 0,
          streak INT DEFAULT 0,
          last_active_date DATE,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          lang TEXT DEFAULT 'tr',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE OR REPLACE VIEW fact_engagement_summary AS
        SELECT
          f.id,
          f.slug,
          f.category,
          f.title_tr,
          f.title_en,
          COALESCE(f.likes_count, 0) AS likes_count,
          COUNT(e.id) FILTER (WHERE e.event_type = 'detail_open')::INT AS detail_opens,
          COUNT(e.id) FILTER (WHERE e.event_type = 'quick_guess')::INT AS guess_attempts,
          COALESCE(
            ROUND(
              AVG((e.meta->>'accuracy')::NUMERIC) FILTER (
                WHERE e.event_type = 'quick_guess'
                  AND (e.meta ? 'accuracy')
                  AND (e.meta->>'accuracy') ~ '^[0-9]+(\\.[0-9]+)?$'
              ),
              2
            ),
            0
          ) AS avg_accuracy,
          COALESCE(
            ROUND(
              AVG((e.meta->>'dwell_sec')::NUMERIC) FILTER (
                WHERE e.event_type = 'card_dwell'
                  AND (e.meta ? 'dwell_sec')
                  AND (e.meta->>'dwell_sec') ~ '^[0-9]+(\\.[0-9]+)?$'
              ),
              2
            ),
            0
          ) AS avg_dwell_sec,
          COUNT(e.id) FILTER (WHERE e.event_type = 'share')::INT AS shares_count,
          f.created_at
        FROM facts f
        LEFT JOIN fact_events e ON e.fact_slug = f.slug
        GROUP BY
          f.id,
          f.slug,
          f.category,
          f.title_tr,
          f.title_en,
          f.likes_count,
          f.created_at;
      `);

      await seedInitialFactsIfEmpty(pool);
    })().catch((err) => {
      global.__scrollySchemaReadyPromise = undefined;
      throw err;
    });
  }

  return global.__scrollySchemaReadyPromise;
}

function sanitizeSourceUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

function computeSliderStep(minVal: number, maxVal: number, answerVal: number): number {
  const span = Math.max(1, Math.abs(maxVal - minVal));
  if (!Number.isInteger(answerVal) || span <= 10) {
    return Number((span / 100).toFixed(2)) || 0.1;
  }
  if (span <= 250) return 1;
  if (span <= 2500) return 5;
  return Math.max(1, Math.round(span / 100));
}

function formatNumericValue(value: number, unit: string, lang: Language = 'en'): string {
  return formatValueWithUnit(value, unit, lang);
}

function buildSynthesizedQuiz(
  question: string,
  minVal: number,
  maxVal: number,
  answerVal: number,
  unit: string,
  explanation: string,
  seedStr: string,
  lang: Language = 'en'
): FactQuizContent {
  const span = Math.max(2, Math.abs(maxVal - minVal));
  const deltaLow = Math.max(1, Math.round(span * 0.28));
  const deltaHigh = Math.max(1, Math.round(span * 0.34));

  let lowVal = answerVal - deltaLow;
  if (lowVal < minVal || lowVal === answerVal) {
    lowVal = answerVal + Math.max(1, Math.round(span * 0.18));
  }
  let highVal = answerVal + deltaHigh;
  if (highVal > maxVal || highVal === answerVal || highVal === lowVal) {
    highVal = Math.max(minVal, answerVal - Math.max(2, Math.round(span * 0.42)));
  }

  const formatDist = (n: number) =>
    formatNumericValue(
      Number.isInteger(answerVal) ? Math.round(n) : Number(n.toFixed(1)),
      unit,
      lang
    );

  const correctStr = formatNumericValue(answerVal, unit, lang);
  let d1 = formatDist(lowVal);
  let d2 = formatDist(highVal);
  if (d1 === correctStr) d1 = formatDist(answerVal + Math.max(1, deltaLow));
  if (d2 === correctStr || d2 === d1) d2 = formatDist(answerVal + Math.max(2, deltaHigh * 2));

  let hash = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash += seedStr.charCodeAt(i);
  }
  const correctIndex = (hash % 3) as 0 | 1 | 2;
  const options: [string, string, string] =
    correctIndex === 0
      ? [correctStr, d1, d2]
      : correctIndex === 1
        ? [d1, correctStr, d2]
        : [d1, d2, correctStr];

  return {
    question,
    options,
    correctIndex,
    explanation,
  };
}

export function mapDbRowToFactCard(row: DbFactRow): FactCard {
  const staticFacts = getAllFacts();
  const staticMatch = staticFacts.find(
    (item) =>
      item.en.slug === row.slug ||
      item.tr.slug === row.slug ||
      item.id === row.slug ||
      item.id === row.sketch_type
  );

  const likesCount = Math.max(0, Number(row.likes_count ?? 0));
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at
        ? String(row.created_at)
        : undefined;
  const safeSourceUrl = sanitizeSourceUrl(row.source_url);
  const safeSourceName = row.source_name?.trim() || undefined;

  if (staticMatch) {
    return {
      ...staticMatch,
      slug: row.slug,
      sketchType: row.sketch_type || staticMatch.id,
      likesCount,
      createdAt,
      sourceName: safeSourceName || staticMatch.sourceName,
      sourceUrl: safeSourceUrl || staticMatch.sourceUrl,
      tr: {
        ...staticMatch.tr,
        sourceName: safeSourceName || staticMatch.tr.sourceName,
        sourceUrl: safeSourceUrl || staticMatch.tr.sourceUrl,
      },
      en: {
        ...staticMatch.en,
        sourceName: safeSourceName || staticMatch.en.sourceName,
        sourceUrl: safeSourceUrl || staticMatch.en.sourceUrl,
      },
    };
  }

  const category: CategoryId = VALID_CATEGORIES.has(row.category as CategoryId)
    ? (row.category as CategoryId)
    : 'science';
  const visual = CATEGORY_VISUAL_DEFAULTS[category];

  const minRaw = Number(row.min_val ?? 0);
  const maxRaw = Number(row.max_val ?? 100);
  const answerRaw = Number(row.answer_val ?? (minRaw + maxRaw) / 2);
  const minVal = Math.min(minRaw, maxRaw);
  const maxVal = Math.max(minRaw, maxRaw === minRaw ? minRaw + 10 : maxRaw);
  const answerVal = Math.min(maxVal, Math.max(minVal, answerRaw));
  const step = computeSliderStep(minVal, maxVal, answerVal);

  const unitTr = (row.unit_tr ?? '').trim();
  const unitEn = (row.unit_en ?? '').trim();
  const titleTr = (row.title_tr || row.title_en || 'Bilimsel Keşif').trim();
  const titleEn = (row.title_en || row.title_tr || 'Scientific Discovery').trim();
  const summaryTr = (row.summary_tr || row.summary_en || '').trim();
  const summaryEn = (row.summary_en || row.summary_tr || '').trim();
  const detailTr = (row.detail_tr || summaryTr).trim();
  const detailEn = (row.detail_en || summaryEn).trim();
  const questionTr = (row.question_tr || titleTr).trim();
  const questionEn = (row.question_en || titleEn).trim();
  const resolvedSourceName = safeSourceName || 'Scrolly Research Archive';

  const guessTr: GuessChallenge = {
    type: 'slider',
    prompt: questionTr,
    min: minVal,
    max: maxVal,
    step,
    unit: unitTr,
    correctValue: answerVal,
  };

  const guessEn: GuessChallenge = {
    type: 'slider',
    prompt: questionEn,
    min: minVal,
    max: maxVal,
    step,
    unit: unitEn,
    correctValue: answerVal,
  };

  return {
    id: row.slug,
    slug: row.slug,
    category,
    accentColor: visual.accentColor,
    iconName: visual.iconName,
    emoji: visual.emoji,
    sketchType: row.sketch_type || undefined,
    likesCount,
    createdAt,
    readingTimeSec: 20,
    sourceName: resolvedSourceName,
    sourceUrl: safeSourceUrl,
    tr: {
      slug: row.slug,
      title: titleTr,
      factText: summaryTr,
      deepDiveDetail: detailTr,
      sourceHint: resolvedSourceName,
      sourceName: resolvedSourceName,
      sourceUrl: safeSourceUrl,
      tag: visual.tagTr,
      quiz: buildSynthesizedQuiz(
        questionTr,
        minVal,
        maxVal,
        answerVal,
        unitTr,
        detailTr,
        `${row.slug}-tr`,
        'tr'
      ),
      guessChallenge: guessTr,
    },
    en: {
      slug: row.slug,
      title: titleEn,
      factText: summaryEn,
      deepDiveDetail: detailEn,
      sourceHint: resolvedSourceName,
      sourceName: resolvedSourceName,
      sourceUrl: safeSourceUrl,
      tag: visual.tagEn,
      quiz: buildSynthesizedQuiz(
        questionEn,
        minVal,
        maxVal,
        answerVal,
        unitEn,
        detailEn,
        `${row.slug}-en`,
        'en'
      ),
      guessChallenge: guessEn,
    },
  };
}

export interface ServerFactEntry {
  fact: FactCard;
  updatedAt: Date;
}

function parseTimestamp(value?: string | Date | null, fallback = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function buildStaticServerEntries(): ServerFactEntry[] {
  const defaultDate = new Date('2026-01-01T00:00:00.000Z');
  return getAllFacts().map((fact) => ({
    fact: {
      ...fact,
      slug: getFactPrimarySlug(fact),
      sketchType: fact.sketchType || fact.id,
    },
    updatedAt: parseTimestamp(fact.createdAt, defaultDate),
  }));
}

export async function getAllFactsWithTimestampsServer(): Promise<ServerFactEntry[]> {
  const staticEntries = buildStaticServerEntries();

  if (!hasDatabaseUrl()) {
    return staticEntries;
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbFactRow>(
      'SELECT * FROM facts ORDER BY created_at DESC, id DESC'
    );

    if (result.rows.length === 0) {
      return staticEntries;
    }

    const seenKeys = new Set<string>();
    const combined: ServerFactEntry[] = [];

    for (const row of result.rows) {
      const card = mapDbRowToFactCard(row);
      const updatedAt = parseTimestamp(row.created_at ?? card.createdAt);
      const keys = [
        row.slug,
        getFactPrimarySlug(card),
        card.id,
        card.en.slug,
        card.tr.slug,
      ].filter(Boolean);
      keys.forEach((k) => seenKeys.add(k));
      combined.push({ fact: card, updatedAt });
    }

    for (const entry of staticEntries) {
      const f = entry.fact;
      const keys = [getFactPrimarySlug(f), f.id, f.en.slug, f.tr.slug].filter(Boolean);
      const alreadyPresent = keys.some((k) => seenKeys.has(k));
      if (!alreadyPresent) {
        keys.forEach((k) => seenKeys.add(k));
        combined.push(entry);
      }
    }

    return combined;
  } catch (err) {
    console.error('[lib/db] getAllFactsWithTimestampsServer fallback to static facts:', err);
    return staticEntries;
  }
}

export async function getAllFactsServer(): Promise<FactCard[]> {
  const entries = await getAllFactsWithTimestampsServer();
  return entries.map((entry) => entry.fact);
}

export async function getFactBySlugServer(slug: string): Promise<FactCard | undefined> {
  const normalized = slug.trim();
  if (!normalized) return undefined;

  const allFacts = await getAllFactsServer();
  return allFacts.find(
    (item) =>
      item.slug === normalized ||
      getFactPrimarySlug(item) === normalized ||
      item.en.slug === normalized ||
      item.tr.slug === normalized ||
      item.id === normalized
  );
}

