import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { Pool } from 'pg';
import type { Language } from '@/i18n/translations';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { formatValueWithUnit } from '@/lib/formatUnit';
import type { CategoryId, FactCard, FactQuizContent, GuessChallenge } from '@/types/fact';
import type { VocabPartOfSpeech, VocabularyCard } from '@/types/vocabulary';
import { enrichFactWithGuessChallenge, getFactPrimarySlug } from '@/utils/factsData';
import { getAllFacts, LEGACY_SLUG_TO_FACT_ID } from '@/utils/factsServerData';

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
  visual_query?: string | null;
  gif_url?: string | null;
  gif_query?: string | null;
  quiz_tr?: FactQuizContent | null;
  quiz_en?: FactQuizContent | null;
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
  'statistics',
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
  statistics: {
    accentColor: '#6366F1',
    iconName: 'BarChart3',
    emoji: '📊',
    tagTr: 'İstatistik & Olasılık',
    tagEn: 'Statistics & Odds',
  },
};

declare global {
  var __scrollyPgPool: Pool | undefined;
  var __scrollySchemaReadyPromise: Promise<void> | undefined;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function resolveSslConfig(connectionString: string) {
  if (process.env.DATABASE_CA_CERT) {
    return { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT };
  }
  const lower = connectionString.toLowerCase();
  const isLocalHost =
    lower.includes('@localhost:') ||
    lower.includes('@localhost/') ||
    lower.includes('@127.0.0.1:') ||
    lower.includes('@127.0.0.1/');
  if (lower.includes('sslmode=disable') || (isLocalHost && !lower.includes('sslmode=require'))) {
    return false;
  }
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (!hasDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }

  if (!global.__scrollyPgPool) {
    const connectionString = process.env.DATABASE_URL!.trim();
    const pool = new Pool({
      connectionString,
      ssl: resolveSslConfig(connectionString),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[lib/db] Unexpected pg pool error:', err);
    });
    global.__scrollyPgPool = pool;
  }

  return global.__scrollyPgPool;
}

const FACT_SHARD_FILES = [
  'space.json',
  'nature.json',
  'human_body.json',
  'history.json',
  'science.json',
  'records.json',
  'statistics.json',
] as const;

function readFactJsonArraySafe(filePath: string): FactCard[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FactCard =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as FactCard).id === 'string' &&
        Boolean((item as FactCard).tr) &&
        Boolean((item as FactCard).en)
    );
  } catch (err) {
    console.warn(`[lib/db] Failed to read seed facts from ${filePath}:`, err);
    return [];
  }
}

export function loadSeedFactsFromDisk(): FactCard[] {
  const cwd = process.cwd();
  const shardCards: FactCard[] = [];

  for (const shardFile of FACT_SHARD_FILES) {
    const publicPath = path.join(cwd, 'public', 'data', 'facts', shardFile);
    const items = readFactJsonArraySafe(publicPath);
    if (items.length > 0) {
      shardCards.push(...items);
    }
  }

  const baseFacts = shardCards.length > 0 ? shardCards : getAllFacts();
  const generatedPath = path.join(cwd, 'data', 'factsGenerated.json');
  const generatedFacts = readFactJsonArraySafe(generatedPath);

  const merged: FactCard[] = [];
  const seenKeys = new Set<string>();

  for (const rawCard of [...baseFacts, ...generatedFacts]) {
    const enriched = enrichFactWithGuessChallenge(rawCard);
    const primarySlug = getFactPrimarySlug(enriched);
    const keys = [
      enriched.id,
      primarySlug,
      enriched.slug,
      enriched.tr?.slug,
      enriched.en?.slug,
    ].filter((k): k is string => typeof k === 'string' && k.trim().length > 0);

    if (keys.some((k) => seenKeys.has(k))) continue;
    keys.forEach((k) => seenKeys.add(k));

    merged.push({
      ...enriched,
      slug: primarySlug,
      sketchType: enriched.sketchType || enriched.id,
    });
  }

  return merged;
}

async function seedInitialFactsIfEmpty(pool: Pool): Promise<void> {
  const initialFacts = loadSeedFactsFromDisk();
  const initialSlugs = initialFacts.map((fact) => getFactPrimarySlug(fact));
  const checkRes = await pool.query<{
    total: number;
    stats_count: number;
    seeded_static_count: number;
    missing_static_fields: number;
  }>(
    `SELECT
       COUNT(*)::INT AS total,
       COUNT(*) FILTER (WHERE category = 'statistics')::INT AS stats_count,
       COUNT(*) FILTER (WHERE slug = ANY($1::text[]))::INT AS seeded_static_count,
       COUNT(*) FILTER (
         WHERE slug = ANY($1::text[])
           AND (visual_query IS NULL OR quiz_tr IS NULL OR quiz_en IS NULL)
       )::INT AS missing_static_fields
     FROM facts`,
    [initialSlugs]
  );
  const {
    total = 0,
    stats_count = 0,
    seeded_static_count = 0,
    missing_static_fields = 0,
  } = checkRes.rows[0] ?? {};
  if (
    total > 0 &&
    stats_count > 0 &&
    seeded_static_count >= initialSlugs.length &&
    missing_static_fields === 0
  ) {
    return;
  }

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
    const createdIso =
      typeof fact.createdAt === 'string' && !Number.isNaN(Date.parse(fact.createdAt))
        ? new Date(fact.createdAt).toISOString()
        : null;

    await pool.query(
      `INSERT INTO facts (
        slug, category, title_tr, title_en, summary_tr, summary_en,
        detail_tr, detail_en, question_tr, question_en,
        unit_tr, unit_en, min_val, max_val, answer_val,
        sketch_type, visual_query, gif_url, gif_query, quiz_tr, quiz_en,
        source_name, source_url, likes_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20::jsonb, $21::jsonb,
        $22, $23, 0, COALESCE($25::timestamptz, NOW() - ($24 * INTERVAL '1 second'))
      )
      ON CONFLICT (slug) DO UPDATE SET
        category = EXCLUDED.category,
        visual_query = COALESCE(facts.visual_query, EXCLUDED.visual_query),
        gif_url = COALESCE(facts.gif_url, EXCLUDED.gif_url),
        gif_query = COALESCE(facts.gif_query, EXCLUDED.gif_query),
        quiz_tr = COALESCE(EXCLUDED.quiz_tr, facts.quiz_tr),
        quiz_en = COALESCE(EXCLUDED.quiz_en, facts.quiz_en)`,
      [
        slug,
        fact.category,
        fact.tr.title,
        fact.en.title,
        fact.tr.factText,
        fact.en.factText,
        fact.tr.deepDiveDetail,
        fact.en.deepDiveDetail,
        guessTr?.prompt || fact.tr.quiz?.question || fact.tr.title,
        guessEn?.prompt || fact.en.quiz?.question || fact.en.title,
        guessTr?.unit || '',
        guessEn?.unit || '',
        minVal,
        maxVal,
        answerVal,
        fact.id,
        fact.visualQuery || null,
        fact.gifUrl || null,
        fact.gifQuery || fact.visualQuery || null,
        fact.tr.quiz ? JSON.stringify(fact.tr.quiz) : null,
        fact.en.quiz ? JSON.stringify(fact.en.quiz) : null,
        fact.en.sourceName || fact.sourceName || fact.en.sourceHint || '',
        fact.en.sourceUrl || fact.sourceUrl || '',
        idx + 1,
        createdIso,
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
          visual_query TEXT,
          gif_url TEXT,
          gif_query TEXT,
          quiz_tr JSONB,
          quiz_en JSONB,
          source_name TEXT,
          source_url TEXT,
          likes_count INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`ALTER TABLE facts ADD COLUMN IF NOT EXISTS visual_query TEXT;`);
      await pool.query(
        `ALTER TABLE facts ADD COLUMN IF NOT EXISTS gif_url TEXT, ADD COLUMN IF NOT EXISTS gif_query TEXT;`
      );
      await pool.query(`ALTER TABLE facts ADD COLUMN IF NOT EXISTS quiz_tr JSONB;`);
      await pool.query(`ALTER TABLE facts ADD COLUMN IF NOT EXISTS quiz_en JSONB;`);

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
          username TEXT DEFAULT 'Kâşif',
          handle TEXT DEFAULT '',
          xp INT DEFAULT 0,
          weekly_xp INT DEFAULT 0,
          daily_best_score INT DEFAULT 0,
          last_daily_quiz_date TEXT DEFAULT '',
          last_visit_date TEXT DEFAULT '',
          streak INT DEFAULT 1,
          last_active_date DATE,
          seen_ids JSONB DEFAULT '[]'::jsonb,
          favorite_ids JSONB DEFAULT '[]'::jsonb,
          category_weights JSONB DEFAULT '{}'::jsonb,
          category_accuracy JSONB DEFAULT '{}'::jsonb,
          badges JSONB DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle TEXT DEFAULT '';`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_xp INT DEFAULT 0;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_best_score INT DEFAULT 0;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_quiz_date TEXT DEFAULT '';`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_visit_date TEXT DEFAULT '';`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seen_ids JSONB DEFAULT '[]'::jsonb;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_ids JSONB DEFAULT '[]'::jsonb;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_weights JSONB DEFAULT '{}'::jsonb;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS category_accuracy JSONB DEFAULT '{}'::jsonb;`);
      await pool.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS quiz_submissions (
          id BIGSERIAL PRIMARY KEY,
          device_id TEXT NOT NULL,
          username TEXT NOT NULL,
          mode TEXT NOT NULL DEFAULT 'daily',
          score INT NOT NULL DEFAULT 0,
          correct_count INT NOT NULL DEFAULT 0,
          total_questions INT NOT NULL DEFAULT 0,
          quiz_date TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT '';`);
      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Kâşif';`);
      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'daily';`);
      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS correct_count INT DEFAULT 0;`);
      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 1;`);
      await pool.query(`ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS quiz_date TEXT DEFAULT '';`);
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE quiz_submissions ALTER COLUMN player_id DROP NOT NULL;
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN others THEN NULL;
        END $$;
      `);
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE quiz_submissions ALTER COLUMN quiz_mode DROP NOT NULL;
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN others THEN NULL;
        END $$;
      `);
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE quiz_submissions ALTER COLUMN duration_sec DROP NOT NULL;
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN others THEN NULL;
        END $$;
      `);
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE quiz_submissions ALTER COLUMN question_count DROP NOT NULL;
        EXCEPTION
          WHEN undefined_column THEN NULL;
          WHEN others THEN NULL;
        END $$;
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_quiz_submissions_mode_date
          ON quiz_submissions (mode, quiz_date, score DESC);
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS duel_rooms (
          code TEXT PRIMARY KEY,
          mode TEXT NOT NULL DEFAULT 'duel',
          category TEXT NOT NULL DEFAULT 'all',
          question_count INT NOT NULL DEFAULT 5,
          card_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          host_id TEXT NOT NULL,
          players JSONB NOT NULL DEFAULT '[]'::jsonb,
          kicked_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          status TEXT NOT NULL DEFAULT 'lobby',
          starts_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`ALTER TABLE duel_rooms ADD COLUMN IF NOT EXISTS kicked_ids JSONB DEFAULT '[]'::jsonb;`);
      await pool.query(`ALTER TABLE duel_rooms ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;`);
      await pool.query(`ALTER TABLE duel_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS vocabulary_cards (
          id TEXT PRIMARY KEY,
          word TEXT UNIQUE NOT NULL,
          phonetic TEXT DEFAULT '',
          part_of_speech TEXT DEFAULT '',
          meaning_tr TEXT NOT NULL,
          definition_en TEXT NOT NULL,
          example_en TEXT NOT NULL,
          example_tr TEXT NOT NULL,
          quiz_options JSONB NOT NULL,
          correct_index INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_vocabulary_cards_created
          ON vocabulary_cards (created_at DESC);
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
        CREATE TABLE IF NOT EXISTS fact_likes (
          id BIGSERIAL PRIMARY KEY,
          fact_slug TEXT NOT NULL,
          device_id TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (fact_slug, device_id)
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

function parseStoredQuiz(raw: unknown): FactQuizContent | null {
  let candidate = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== 'object') return null;
  const obj = candidate as Partial<FactQuizContent>;
  if (
    typeof obj.question === 'string' &&
    obj.question.trim().length > 6 &&
    Array.isArray(obj.options) &&
    obj.options.length === 3 &&
    obj.options.every((opt) => typeof opt === 'string' && opt.trim().length > 0) &&
    (obj.correctIndex === 0 || obj.correctIndex === 1 || obj.correctIndex === 2)
  ) {
    return {
      question: obj.question.trim(),
      options: [obj.options[0].trim(), obj.options[1].trim(), obj.options[2].trim()],
      correctIndex: obj.correctIndex,
      explanation: typeof obj.explanation === 'string' ? obj.explanation.trim() : '',
    };
  }
  return null;
}

const CONCEPT_DECOYS_TR: Record<CategoryId, [string, string, string, string]> = {
  space: [
    'Güneş rüzgârı ve radyasyon basıncı Ay yörüngesinin ötesinde tamamen sıfırlanır.',
    'Karman çizgisinin hemen üzerinde yer çekimi kuvveti tamamen yok olur.',
    'Ötegezegenler yıldızlar gibi çekirdek füzyonuyla kendi görünür ışıklarını üretir.',
    'Derin uzaydaki cisimlerin yörüngesi her yüzyılda kendiliğinden tersine döner.',
  ],
  nature: [
    'Bu olgu yalnızca kutup kışlarında sıfırın altındaki sularda görülen geçici bir durumdur.',
    'Canlılar arasındaki bu özellik sadece tozlaşmayı çekmek için sonradan gelişmiştir.',
    'Bu ekolojik süreç kıyıdan uzaklaştıkça bütün biyomlarda aynı sabit hızda işler.',
    'Söz konusu adaptasyon yalnızca yapay akvaryum koşullarında ortaya çıkar.',
  ],
  human_body: [
    'Bu biyolojik tepki beyin sapı sinyali olmadan yalnızca omurilik tarafından yönetilir.',
    'İlgili doku yalnızca bebeklik döneminde yenilenir ve yetişkinlikte tamamen durur.',
    'Bu işlev yalnızca kemik iliğindeki kırmızı kan hücrelerinin bölünmesiyle sağlanır.',
    'REM uykusu sırasında vücuttaki bu mekanizma birkaç saatliğine tamamen kapanır.',
  ],
  history: [
    'Bu uygulama yalnızca 19. yüzyıl Sanayi Devrimi sonrasında Avrupa saraylarında başlamıştır.',
    'İlgili buluntuların tamamı 1990 sonrası uydu taramalarına kadar tamamen uydurma sanılıyordu.',
    'Bu gelenek yazılı kayıtlar başlamadan önce küresel ölçekte yasaklanarak terk edilmiştir.',
    'Tarihsel kayıtlara göre bu yöntem yalnızca buharlı matbaanın icadından sonra ortaya çıktı.',
  ],
  science: [
    'Bu etki kapalı vakum odalarında enerjinin korunumu yasasını geçici olarak ihlal eder.',
    'Söz konusu olay yalnızca mutlak sıfıra yakın süperiletken bobinlerde gözlemlenebilir.',
    'Bu mekanizma atom yapısından ziyade yalnızca radyoaktif bozunma hızına bağlıdır.',
    'Bu süreç bugüne dek hiçbir deneyde doğrudan ölçülmemiş, yalnızca kâğıt üzerinde kalmıştır.',
  ],
  records: [
    'Bu rekor doğal fiziksel koşullardan değil, laboratuvar katalizörlerinden kaynaklanır.',
    'Söz konusu rekor yalnızca üç saniyeden kısa sürdükten sonra tamamen dağılmıştır.',
    'Bu değer yalnızca deniz seviyesindeki standart atmosfer basıncında elde edilebilir.',
    'Ölçülen bu ekstrem durum on yıl içinde küresel ölçekte tamamen tersine dönmüştür.',
  ],
  statistics: [
    'Bu oran nüfus ağırlıklandırması yapılmadan tek bir şehirdeki örneklemden çıkarılmıştır.',
    'Veriler çok yıllık eğilimleri değil, yalnızca birkaç haftalık mevsimsel dalgalanmayı yansıtır.',
    'Hesaplama tüm alt grupların her yıl birebir aynı doğrusal hızla büyüdüğünü varsayar.',
    'Karşılaştırma 2020 öncesi tüm tarihsel baz ölçümleri bilerek veri setinden çıkarır.',
  ],
};

const CONCEPT_DECOYS_EN: Record<CategoryId, [string, string, string, string]> = {
  space: [
    'Solar radiation pressure drops completely to zero beyond Earth’s orbital path.',
    'Gravity vanishes entirely once an object crosses the Karman boundary.',
    'Rocky exoplanets emit their own visible starlight through internal nuclear fusion.',
    'Deep-space orbits naturally reverse direction roughly once every century.',
  ],
  nature: [
    'This phenomenon occurs exclusively in sub-zero polar waters during winter.',
    'The trait evolved solely for seasonal coloration rather than ecosystem survival.',
    'The same biological pace remains identical across every terrestrial biome.',
    'This adaptation appears only inside controlled artificial enclosures.',
  ],
  human_body: [
    'This response runs solely through conscious cortical planning without reflex pathways.',
    'The tissue stops regenerating completely shortly after early infancy.',
    'This function depends entirely on red blood cell division inside long bones.',
    'The entire mechanism shuts down completely during deep REM sleep cycles.',
  ],
  history: [
    'This practice originated exclusively in 19th-century European industrial courts.',
    'Archaeologists dismissed every surviving trace as fiction until satellite scans in 1995.',
    'The custom was formally abolished worldwide centuries before written alphabets existed.',
    'Historical records confirm it emerged only after steam-powered printing arrived.',
  ],
  science: [
    'This effect briefly violates conservation of energy inside sealed vacuum chambers.',
    'The behavior emerges only inside superconducting coils cooled near absolute zero.',
    'The underlying mechanism relies on nuclear decay rather than molecular bonding.',
    'It remains purely mathematical and has never been observed in physical experiments.',
  ],
  records: [
    'This extreme milestone was produced using synthetic lab catalysts rather than nature.',
    'The recorded peak lasted under three seconds before collapsing back to baseline.',
    'Such measurements are only physically possible at standard sea-level pressure.',
    'Subsequent global shifts permanently erased this benchmark within a single decade.',
  ],
  statistics: [
    'The figure reflects an unweighted sample taken from a single metropolitan district.',
    'This trend captures short-term seasonal noise rather than multi-year measurements.',
    'The model assumes every demographic subgroup shifts at an identical linear rate.',
    'All baseline records prior to 2020 were excluded from the longitudinal series.',
  ],
};

function compactInsightSentence(text: string, maxLen = 112): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 22);
  const picked =
    sentences.find((s) => s.length <= maxLen) ||
    sentences[0] ||
    cleaned;
  if (picked.length <= maxLen) return picked;
  return `${picked.slice(0, maxLen - 3).trimEnd()}...`;
}

function deriveFallbackVisualQuery(row: DbFactRow): string | undefined {
  if (row.visual_query && row.visual_query.trim().length >= 2) {
    return row.visual_query.trim();
  }
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'most',
    'more', 'than', 'every', 'about', 'what', 'when', 'where', 'which', 'only',
    'tr', 'en', 'fact', 'record', 'average', 'daily', 'global', 'world',
  ]);
  const baseText = (row.title_en || row.slug || '').toLowerCase();
  const words = baseText
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));
  const unique = Array.from(new Set(words)).slice(0, 3);
  if (unique.length >= 2) {
    return unique.join(' ');
  }
  const catFallback: Record<string, string> = {
    space: 'deep space galaxy',
    nature: 'wildlife ocean forest',
    human_body: 'human brain heartbeat',
    history: 'ancient monument artifacts',
    science: 'physics laboratory atom',
    records: 'extreme earth lightning',
    statistics: 'global population city',
  };
  return catFallback[row.category] || 'science discovery';
}

interface SynthesizedQuizInput {
  category: CategoryId;
  question: string;
  minVal: number;
  maxVal: number;
  answerVal: number;
  unit: string;
  summary: string;
  detail: string;
  seedStr: string;
  lang: Language;
  title: string;
  sourceName: string;
}

function buildSynthesizedQuiz(input: SynthesizedQuizInput): FactQuizContent {
  const {
    category,
    question,
    minVal,
    maxVal,
    answerVal,
    unit,
    summary,
    detail,
    seedStr,
    lang,
    title,
    sourceName,
  } = input;

  let hash = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const correctIndex = (hash % 3) as 0 | 1 | 2;

  const insightSource = detail.trim().length >= 28 ? detail : summary;
  const compactRight = compactInsightSentence(insightSource, 112);

  // Always prefer an engaging, topic-relevant conceptual quiz when descriptive text exists
  if (compactRight.length >= 22 && title.trim().length >= 4) {
    const decoyPool = lang === 'tr' ? CONCEPT_DECOYS_TR[category] : CONCEPT_DECOYS_EN[category];
    const idxA = hash % decoyPool.length;
    const idxB = (idxA + 1 + (hash % (decoyPool.length - 1))) % decoyPool.length;
    const decoyA = decoyPool[idxA];
    const decoyB = decoyPool[idxB];

    const shortTitle = title.length > 64 ? `${title.slice(0, 61).trimEnd()}...` : title;
    const promptVariant = hash % 3;
    const qPrompt =
      lang === 'tr'
        ? promptVariant === 0
          ? `"${shortTitle}" olgusunu en doğru açıklayan ifade hangisidir?`
          : promptVariant === 1
            ? `"${shortTitle}" hakkında bilimsel veya tarihsel bulgular neyi gösterir?`
            : `Aşağıdakilerden hangisi "${shortTitle}" ile doğrudan açıklanan bir gerçektir?`
        : promptVariant === 0
          ? `Which statement best explains "${shortTitle}"?`
          : promptVariant === 1
            ? `What do verified findings reveal about "${shortTitle}"?`
            : `Which fact directly characterizes "${shortTitle}"?`;

    const options: [string, string, string] =
      correctIndex === 0
        ? [compactRight, decoyA, decoyB]
        : correctIndex === 1
          ? [decoyA, compactRight, decoyB]
          : [decoyA, decoyB, compactRight];

    const fullExplanation = detail.trim() || summary.trim() || compactRight;
    return {
      question: qPrompt,
      options,
      correctIndex,
      explanation: `${fullExplanation}${sourceName ? ` (${sourceName})` : ''}`,
    };
  }

  // Last-resort numeric fallback with non-trivial order-of-magnitude distractors (never +/-30% slider echo)
  const formatDist = (n: number) =>
    formatNumericValue(
      Number.isInteger(answerVal) ? Math.round(n) : Number(n.toFixed(1)),
      unit,
      lang
    );

  const safeBase = Math.abs(answerVal) >= 1 ? answerVal : 10;
  const span = Math.max(4, Math.abs(maxVal - minVal));
  const cand1 =
    answerVal > 0 && answerVal * 3.5 <= maxVal * 2
      ? answerVal * 3.5
      : answerVal - span * 0.45;
  const cand2 =
    answerVal > 4
      ? Math.max(minVal, answerVal / 4)
      : safeBase + span * 0.65;

  const correctStr = formatNumericValue(answerVal, unit, lang);
  let d1 = formatDist(cand1);
  let d2 = formatDist(cand2);
  if (d1 === correctStr) d1 = formatDist(answerVal + Math.max(2, span * 0.5));
  if (d2 === correctStr || d2 === d1) d2 = formatDist(answerVal - Math.max(3, span * 0.6));

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
    explanation: detail || summary || `${correctStr}${sourceName ? ` (${sourceName})` : ''}`,
  };
}

export function mapDbRowToFactCard(row: DbFactRow, preloadedSeedFacts?: FactCard[]): FactCard {
  const staticFacts = preloadedSeedFacts ?? loadSeedFactsFromDisk();
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
      visualQuery: row.visual_query?.trim() || staticMatch.visualQuery,
      gifUrl: row.gif_url?.trim() || staticMatch.gifUrl,
      gifQuery: row.gif_query?.trim() || staticMatch.gifQuery,
      likesCount,
      createdAt,
      sourceName: safeSourceName || staticMatch.sourceName,
      sourceUrl: safeSourceUrl || staticMatch.sourceUrl,
      tr: {
        ...staticMatch.tr,
        quiz: parseStoredQuiz(row.quiz_tr) || staticMatch.tr.quiz,
        sourceName: safeSourceName || staticMatch.tr.sourceName,
        sourceUrl: safeSourceUrl || staticMatch.tr.sourceUrl,
      },
      en: {
        ...staticMatch.en,
        quiz: parseStoredQuiz(row.quiz_en) || staticMatch.en.quiz,
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
    visualQuery: deriveFallbackVisualQuery(row),
    gifUrl: row.gif_url?.trim() || undefined,
    gifQuery: row.gif_query?.trim() || undefined,
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
      quiz:
        parseStoredQuiz(row.quiz_tr) ||
        buildSynthesizedQuiz({
          category,
          question: questionTr,
          minVal,
          maxVal,
          answerVal,
          unit: unitTr,
          summary: summaryTr,
          detail: detailTr,
          seedStr: `${row.slug}-tr`,
          lang: 'tr',
          title: titleTr,
          sourceName: resolvedSourceName,
        }),
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
      quiz:
        parseStoredQuiz(row.quiz_en) ||
        buildSynthesizedQuiz({
          category,
          question: questionEn,
          minVal,
          maxVal,
          answerVal,
          unit: unitEn,
          summary: summaryEn,
          detail: detailEn,
          seedStr: `${row.slug}-en`,
          lang: 'en',
          title: titleEn,
          sourceName: resolvedSourceName,
        }),
      guessChallenge: guessEn,
    },
  };
}

export interface ServerFactEntry {
  fact: FactCard;
  updatedAt: Date;
}

export interface ServerFactsFetchResult {
  source: 'postgres' | 'local';
  entries: ServerFactEntry[];
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

function buildStaticServerEntries(seedFacts = loadSeedFactsFromDisk()): ServerFactEntry[] {
  const defaultDate = new Date('2026-01-01T00:00:00.000Z');
  return seedFacts.map((fact) => ({
    fact: {
      ...fact,
      slug: getFactPrimarySlug(fact),
      sketchType: fact.sketchType || fact.id,
    },
    updatedAt: parseTimestamp(fact.createdAt, defaultDate),
  }));
}

export const fetchFactsWithSourceServer = cache(
  async (): Promise<ServerFactsFetchResult> => {
    const seedFacts = loadSeedFactsFromDisk();
    const staticEntries = buildStaticServerEntries(seedFacts);

    if (!hasDatabaseUrl()) {
      return { source: 'local', entries: staticEntries };
    }

    try {
      await ensureSchema();
      const pool = getPool();
      const result = await pool.query<DbFactRow>(
        'SELECT * FROM facts ORDER BY created_at DESC, id DESC'
      );

      if (result.rows.length === 0) {
        return { source: 'postgres', entries: staticEntries };
      }

      const seenKeys = new Set<string>();
      const combined: ServerFactEntry[] = [];

      for (const row of result.rows) {
        const card = mapDbRowToFactCard(row, seedFacts);
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

      return { source: 'postgres', entries: combined };
    } catch (err) {
      console.error('[lib/db] fetchFactsWithSourceServer fallback to static facts:', err);
      return { source: 'local', entries: staticEntries };
    }
  }
);

export const getAllFactsWithTimestampsServer = cache(
  async (): Promise<ServerFactEntry[]> => {
    const result = await fetchFactsWithSourceServer();
    return result.entries;
  }
);

// =========================================================================
// Live Vocabulary Cards (Postgres `vocabulary_cards` + static fallback)
// =========================================================================

interface DbVocabularyRow {
  id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  meaning_tr: string;
  definition_en: string;
  example_en: string;
  example_tr: string;
  quiz_options: unknown;
  correct_index: number | null;
  created_at: Date | string | null;
}

const VALID_PARTS_OF_SPEECH = new Set<VocabPartOfSpeech>(['isim', 'sıfat', 'fiil', 'zarf', 'edat']);

const PART_OF_SPEECH_ALIASES: Record<string, VocabPartOfSpeech> = {
  noun: 'isim',
  adjective: 'sıfat',
  adj: 'sıfat',
  sifat: 'sıfat',
  verb: 'fiil',
  adverb: 'zarf',
  adv: 'zarf',
  preposition: 'edat',
  prep: 'edat',
};

function normalizePartOfSpeech(raw: unknown): VocabPartOfSpeech {
  const clean = String(raw || '').trim().toLowerCase();
  if (VALID_PARTS_OF_SPEECH.has(clean as VocabPartOfSpeech)) {
    return clean as VocabPartOfSpeech;
  }
  return PART_OF_SPEECH_ALIASES[clean] ?? 'isim';
}

function parseVocabQuizOptions(raw: unknown): [string, string, string] | null {
  let candidate = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(candidate) || candidate.length !== 3) return null;
  const opts = candidate.map((opt) => (typeof opt === 'string' ? opt.trim() : ''));
  if (opts.some((opt) => opt.length === 0)) return null;
  return [opts[0], opts[1], opts[2]];
}

export function mapDbVocabularyRow(row: DbVocabularyRow): VocabularyCard | null {
  const word = String(row.word || '').trim();
  const meaningTr = String(row.meaning_tr || '').trim();
  const quizOptions = parseVocabQuizOptions(row.quiz_options);
  if (!word || !meaningTr || !quizOptions) return null;
  const rawIndex = Number(row.correct_index ?? 0);
  const correctIndex: 0 | 1 | 2 = rawIndex === 1 ? 1 : rawIndex === 2 ? 2 : 0;
  return {
    id: String(row.id || `vocab-db-${word.toLowerCase()}`).trim(),
    category: 'vocabulary',
    word,
    phonetic: String(row.phonetic || '').trim(),
    partOfSpeech: normalizePartOfSpeech(row.part_of_speech),
    meaningTr,
    definitionEn: String(row.definition_en || '').trim(),
    exampleEn: String(row.example_en || '').trim(),
    exampleTr: String(row.example_tr || '').trim(),
    quizOptions,
    correctIndex,
  };
}

export interface ServerVocabularyFetchResult {
  source: 'postgres' | 'local';
  vocabulary: VocabularyCard[];
}

/**
 * Reads fresh vocabulary cards on every call (no cross-request cache) so cards written by the
 * scheduled generator appear without redeploying. Postgres rows win over static cards that share
 * the same lowercase word or id.
 */
export async function fetchVocabularyWithSourceServer(): Promise<ServerVocabularyFetchResult> {
  const staticCards = getVocabularyFacts();

  const mergeCards = (primary: VocabularyCard[]): VocabularyCard[] => {
    const seenWords = new Set<string>();
    const seenIds = new Set<string>();
    const merged: VocabularyCard[] = [];
    for (const card of [...primary, ...staticCards]) {
      const wordKey = card.word.trim().toLowerCase();
      if (!wordKey || seenWords.has(wordKey) || seenIds.has(card.id)) continue;
      seenWords.add(wordKey);
      seenIds.add(card.id);
      merged.push(card);
    }
    return merged;
  };

  if (!hasDatabaseUrl()) {
    return { source: 'local', vocabulary: mergeCards([]) };
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<DbVocabularyRow>(
      `SELECT id, word, phonetic, part_of_speech, meaning_tr, definition_en,
              example_en, example_tr, quiz_options, correct_index, created_at
       FROM vocabulary_cards
       ORDER BY created_at DESC, word ASC
       LIMIT 1000`
    );
    const dbCards = res.rows
      .map(mapDbVocabularyRow)
      .filter((card): card is VocabularyCard => card !== null);
    return { source: 'postgres', vocabulary: mergeCards(dbCards) };
  } catch (err) {
    console.error('[lib/db] fetchVocabularyWithSourceServer fallback to static vocabulary:', err);
    return { source: 'local', vocabulary: mergeCards([]) };
  }
}

// =========================================================================
// Database Status Report (`GET /api/db-status`)
// =========================================================================

export interface DatabaseStatusReport {
  ok: boolean;
  databaseConfigured: boolean;
  source: 'postgres' | 'local';
  factsCount: number;
  vocabularyCount: number;
  byCategory: Record<string, number>;
  latestFacts: Array<{ slug: string; category: string; created_at: string | null }>;
  checkedAt: string;
  error?: string;
}

export async function getDatabaseStatusReport(): Promise<DatabaseStatusReport> {
  const checkedAt = new Date().toISOString();

  const buildLocalReport = (error?: string): DatabaseStatusReport => {
    const seedFacts = loadSeedFactsFromDisk();
    const byCategory: Record<string, number> = {};
    for (const fact of seedFacts) {
      byCategory[fact.category] = (byCategory[fact.category] ?? 0) + 1;
    }
    return {
      ok: !error,
      databaseConfigured: hasDatabaseUrl(),
      source: 'local',
      factsCount: seedFacts.length,
      vocabularyCount: getVocabularyFacts().length,
      byCategory,
      latestFacts: [],
      checkedAt,
      ...(error ? { error } : {}),
    };
  };

  if (!hasDatabaseUrl()) {
    return buildLocalReport();
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const [factsRes, vocabRes, categoryRes, latestRes] = await Promise.all([
      pool.query<{ count: number }>('SELECT COUNT(*)::INT AS count FROM facts'),
      pool.query<{ count: number }>('SELECT COUNT(*)::INT AS count FROM vocabulary_cards'),
      pool.query<{ category: string; count: number }>(
        `SELECT category, COUNT(*)::INT AS count
         FROM facts
         GROUP BY category
         ORDER BY category ASC`
      ),
      pool.query<{ slug: string; category: string; created_at: Date | string | null }>(
        `SELECT slug, category, created_at
         FROM facts
         ORDER BY created_at DESC NULLS LAST, id DESC
         LIMIT 10`
      ),
    ]);

    const byCategory: Record<string, number> = {};
    for (const row of categoryRes.rows) {
      byCategory[row.category] = Number(row.count ?? 0);
    }

    return {
      ok: true,
      databaseConfigured: true,
      source: 'postgres',
      factsCount: Number(factsRes.rows[0]?.count ?? 0),
      vocabularyCount: Number(vocabRes.rows[0]?.count ?? 0),
      byCategory,
      latestFacts: latestRes.rows.map((row) => ({
        slug: row.slug,
        category: row.category,
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at
              ? String(row.created_at)
              : null,
      })),
      checkedAt,
    };
  } catch (err) {
    console.error('[lib/db] getDatabaseStatusReport failed:', err);
    return buildLocalReport('database_unreachable');
  }
}

export const getAllFactsServer = cache(async (): Promise<FactCard[]> => {
  const entries = await getAllFactsWithTimestampsServer();
  return entries.map((entry) => entry.fact);
});

export const getFactsByCategoryServer = cache(
  async (category: CategoryId | 'all'): Promise<FactCard[]> => {
    const allFacts = await getAllFactsServer();
    if (category === 'all') return allFacts;
    return allFacts.filter((item) => item.category === category);
  }
);

export const getFactBySlugServer = cache(
  async (slug: string): Promise<FactCard | undefined> => {
    const normalized = slug.trim();
    if (!normalized) return undefined;

    const allFacts = await getAllFactsServer();
    const direct = allFacts.find(
      (item) =>
        item.slug === normalized ||
        getFactPrimarySlug(item) === normalized ||
        item.en.slug === normalized ||
        item.tr.slug === normalized ||
        item.id === normalized
    );
    if (direct) return direct;

    const legacyId = LEGACY_SLUG_TO_FACT_ID[normalized];
    return legacyId ? allFacts.find((item) => item.id === legacyId) : undefined;
  }
);

