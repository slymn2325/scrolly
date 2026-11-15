import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CATEGORIES = ['space', 'nature', 'human_body', 'history', 'science', 'records', 'statistics'];
const SKETCH_ID_PATTERN = /^(space|nature|human|history|science|weird|statistics)-(0[1-9]|10)$/;
const SKETCH_TYPES = [
  'statistics',
  'probability',
  'venus',
  'orbit',
  'magnetar',
  'titan',
  'footprint',
  'moon',
  'sun_mass',
  'cold_weld',
  'sagittarius',
  'saturn',
  'mars_sunset',
  'mars',
  'voyager',
  'black_hole',
  'blackhole',
  'olympus_mons',
  'iss',
  'station',
  'icefish',
  'mycelium',
  'wood_wide_web',
  'shark',
  'honeybee',
  'bee',
  'swift',
  'koala',
  'dolphin',
  'otter',
  'fungus',
  'cactus',
  'immortal_jellyfish',
  'tardigrade',
  'whale',
  'bones',
  'skeleton',
  'brain',
  'vessels',
  'circulation',
  'stomach',
  'acid',
  'cornea',
  'dna',
  'helix',
  'tongue',
  'heart',
  'heartbeat',
  'pulse',
  'stapes',
  'eye',
  'vision',
  'sweat',
  'liver',
  'cleopatra',
  'oxford',
  'war',
  'hourglass',
  'purple_snail',
  'mammoth',
  'pompeii',
  'steam_turbine',
  'knocker_upper',
  'pineapple',
  'piri_reis',
  'compass',
  'gobeklitepe',
  'treaty',
  'kadesh',
  'viking',
  'printing',
  'triple_point',
  'water',
  'superfluid',
  'helium',
  'time_dilation',
  'sonoluminescence',
  'cloud',
  'sound_water',
  'rainbow',
  'trees_stars',
  'sun_photon',
  'glass',
  'lightning',
  'plasma',
  'atom',
  'photon',
  'prism',
  'entanglement',
  'protein',
  'titin',
  'pitch',
  'wombat',
  'mailbox',
  'stubbs',
  'norway',
  'bromelain',
  'duck',
  'organ',
  'cheese',
  'antarctica',
  'decibel',
  'cards',
  'chess',
];
const VALID_SKETCH_TYPES = new Set(SKETCH_TYPES);

const CUSTOM_AI_MODELS_ENDPOINT = String(process.env.AI_MODELS_ENDPOINT || '').trim();
const DEFAULT_AI_MODEL_NAME = String(process.env.AI_MODEL_NAME || 'gemini-4-hydrogen').trim() || 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODELS = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-2.5-pro'];

const CATEGORY_VISUAL_DEFAULTS = {
  space: { accentColor: '#7C3AED', iconName: 'Orbit', emoji: '🪐' },
  nature: { accentColor: '#0D9488', iconName: 'Waves', emoji: '🧊' },
  human_body: { accentColor: '#E11D48', iconName: 'Bone', emoji: '🦴' },
  history: { accentColor: '#D97706', iconName: 'Landmark', emoji: '🏛️' },
  science: { accentColor: '#0284C7', iconName: 'Zap', emoji: '⚡' },
  records: { accentColor: '#DB2777', iconName: 'Trophy', emoji: '🏆' },
  statistics: { accentColor: '#6366F1', iconName: 'Percent', emoji: '📊' },
};

const MAX_GIF_REQUESTS_PER_HOUR = 90;
const GIF_QUOTA_WINDOW_MS = 60 * 60 * 1000;
const GIF_FETCH_TIMEOUT_MS = 4000;
const BANNED_GIF_PATTERN =
  /(?:^|[^a-z0-9])(meme|memes|reaction|reactions|funny|anime|text|quote|quotes|caption|lol|wtf|mrw|mfw|subtitles|sticker|stickers|gif\s*text|giphy\s*clips)(?:$|[^a-z0-9])/i;
const DISALLOWED_VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v)(?:$|[?#])/i;
const GIF_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by',
  'with', 'is', 'are', 'was', 'were', 'can', 'than', 'that', 'this', 'your', 'only',
  'more', 'most', 'nearly', 'over', 'about', 'just', 'into', 'like', 'its', 'not',
  'how', 'why', 'what', 'when', 'where', 'have', 'has', 'had', 'actually', 'really',
]);
const CATEGORY_GIF_FALLBACK_QUERY = {
  space: 'planet cosmos',
  nature: 'ocean wildlife',
  human_body: 'human anatomy',
  history: 'ancient monument',
  science: 'physics experiment',
  records: 'world record',
  statistics: 'data chart',
};

const gifRequestTimestamps = [];
const sessionGifQueryCache = new Map();

function pruneGifQuotaWindow(now = Date.now()) {
  const cutoff = now - GIF_QUOTA_WINDOW_MS;
  while (gifRequestTimestamps.length > 0 && gifRequestTimestamps[0] <= cutoff) {
    gifRequestTimestamps.shift();
  }
}

function getHourlyGifQuotaStatus(now = Date.now()) {
  pruneGifQuotaWindow(now);
  const used = gifRequestTimestamps.length;
  return {
    limit: MAX_GIF_REQUESTS_PER_HOUR,
    used,
    remaining: Math.max(0, MAX_GIF_REQUESTS_PER_HOUR - used),
    windowMs: GIF_QUOTA_WINDOW_MS,
  };
}

function canConsumeGifQuota(now = Date.now()) {
  return getHourlyGifQuotaStatus(now).remaining > 0;
}

function consumeGifQuota(now = Date.now()) {
  pruneGifQuotaWindow(now);
  if (gifRequestTimestamps.length >= MAX_GIF_REQUESTS_PER_HOUR) {
    return false;
  }
  gifRequestTimestamps.push(now);
  return true;
}

function lockGifQuotaForWindow(now = Date.now()) {
  pruneGifQuotaWindow(now);
  while (gifRequestTimestamps.length < MAX_GIF_REQUESTS_PER_HOUR) {
    gifRequestTimestamps.push(now);
  }
}

function resetGifQuotaForTest() {
  gifRequestTimestamps.length = 0;
  sessionGifQueryCache.clear();
}

function extractCleanEnglishKeywords(rawText) {
  return String(rawText || '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !/^\d+$/.test(token) &&
        !GIF_STOP_WORDS.has(token) &&
        !BANNED_GIF_PATTERN.test(token)
    );
}

function buildGifSearchQuery({ visualQuery = '', titleEn = '', category = 'science' } = {}) {
  const visualTokens = extractCleanEnglishKeywords(visualQuery);
  const titleTokens = extractCleanEnglishKeywords(titleEn);
  const categoryTokens = extractCleanEnglishKeywords(
    CATEGORY_GIF_FALLBACK_QUERY[category] || 'science nature'
  );

  const combined = [];
  const seen = new Set();
  const pushToken = (token) => {
    if (!seen.has(token) && combined.length < 3) {
      seen.add(token);
      combined.push(token);
    }
  };

  for (const token of visualTokens) {
    pushToken(token);
  }
  if (combined.length < 2) {
    for (const token of titleTokens) {
      pushToken(token);
    }
  }
  if (combined.length < 2) {
    for (const token of categoryTokens) {
      pushToken(token);
    }
  }

  if (combined.length === 0) {
    return 'science discovery';
  }
  return combined.slice(0, 3).join(' ');
}

function isCleanGifCandidateUrl(url, metaParts = []) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl.startsWith('https://')) return false;
  if (DISALLOWED_VIDEO_EXT_PATTERN.test(cleanUrl)) return false;

  const combined = [cleanUrl, ...metaParts].filter(Boolean).join(' ').trim();
  if (combined && BANNED_GIF_PATTERN.test(combined)) {
    return false;
  }
  return true;
}

function selectTopicRelevantCleanGif(candidates, gifQuery, category) {
  const queryWords = extractCleanEnglishKeywords(gifQuery);
  const categoryWords = extractCleanEnglishKeywords(CATEGORY_GIF_FALLBACK_QUERY[category] || '');
  const relevanceSet = new Set([...queryWords, ...categoryWords]);

  const cleanList = [];
  for (const candidate of candidates) {
    if (!candidate || !candidate.url || candidate.isSticker) continue;
    const metaParts = [candidate.title || '', candidate.slug || '', ...(candidate.tags || [])];
    if (!isCleanGifCandidateUrl(candidate.url, metaParts)) continue;
    cleanList.push({
      url: String(candidate.url).trim(),
      metaText: metaParts.join(' ').toLowerCase(),
    });
  }

  if (cleanList.length === 0) return null;

  for (const item of cleanList) {
    const metaTokens = extractCleanEnglishKeywords(item.metaText);
    if (metaTokens.some((tok) => relevanceSet.has(tok))) {
      return item.url;
    }
  }

  // Fallback to first safe non-meme image URL when upstream omits descriptive tags
  return cleanList[0].url;
}

function pickGiphyCandidateUrl(row) {
  const urls = [
    row?.images?.fixed_height?.webp,
    row?.images?.downsized_medium?.url,
    row?.images?.fixed_height?.url,
    row?.images?.original?.url,
  ];
  for (const candidate of urls) {
    const clean = String(candidate || '').trim();
    if (clean.startsWith('https://') && !DISALLOWED_VIDEO_EXT_PATTERN.test(clean)) {
      return clean;
    }
  }
  return '';
}

function pickTenorCandidateUrl(row) {
  const urls = [
    row?.media_formats?.tinygif?.url,
    row?.media_formats?.mediumgif?.url,
    row?.media_formats?.gif?.url,
  ];
  for (const candidate of urls) {
    const clean = String(candidate || '').trim();
    if (clean.startsWith('https://') && !DISALLOWED_VIDEO_EXT_PATTERN.test(clean)) {
      return clean;
    }
  }
  return '';
}

async function fetchGifCandidate(url, gifQuery, category, extractCandidates) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(GIF_FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 429) {
      lockGifQuotaForWindow();
      return { gifUrl: null, rateLimited: true };
    }
    if (!res.ok) {
      return { gifUrl: null, rateLimited: false };
    }
    const json = await res.json();
    const candidates = extractCandidates(json);
    return {
      gifUrl: selectTopicRelevantCleanGif(candidates, gifQuery, category),
      rateLimited: false,
    };
  } catch {
    return { gifUrl: null, rateLimited: false };
  }
}

async function fetchGiphyCleanGif(gifQuery, category, apiKey) {
  const params = new URLSearchParams({
    api_key: apiKey,
    q: gifQuery,
    limit: '8',
    offset: '0',
    rating: 'g',
    lang: 'en',
  });

  return fetchGifCandidate(
    `https://api.giphy.com/v1/gifs/search?${params.toString()}`,
    gifQuery,
    category,
    (json) => {
      const rows = Array.isArray(json?.data) ? json.data : [];
      return rows.map((row) => ({
        url: pickGiphyCandidateUrl(row),
        title: row?.title || '',
        slug: `${row?.slug || ''} ${row?.url || ''}`.trim(),
        tags: Array.isArray(row?.tags) ? row.tags : [],
        isSticker: Boolean(row?.is_sticker),
      }));
    }
  );
}

async function fetchTenorCleanGif(gifQuery, category, apiKey) {
  const params = new URLSearchParams({
    key: apiKey,
    q: gifQuery,
    limit: '8',
    contentfilter: 'high',
    media_filter: 'tinygif,mediumgif,gif',
    locale: 'en_US',
  });

  return fetchGifCandidate(
    `https://tenor.googleapis.com/v2/search?${params.toString()}`,
    gifQuery,
    category,
    (json) => {
      const rows = Array.isArray(json?.results) ? json.results : [];
      return rows.map((row) => ({
        url: pickTenorCandidateUrl(row),
        title: [row?.content_description, row?.title, row?.h1_title].filter(Boolean).join(' '),
        slug: [row?.itemurl, row?.url].filter(Boolean).join(' '),
        tags: Array.isArray(row?.tags) ? row.tags : [],
        isSticker: Array.isArray(row?.flags) && row.flags.includes('sticker'),
      }));
    }
  );
}

async function resolveServerGifForFact({
  visualQuery = '',
  titleEn = '',
  category = 'science',
  existingGifUrl = '',
} = {}) {
  const gifQuery = buildGifSearchQuery({ visualQuery, titleEn, category });
  const existing = String(existingGifUrl || '').trim();
  if (existing.startsWith('https://') && !DISALLOWED_VIDEO_EXT_PATTERN.test(existing)) {
    return { gifQuery, gifUrl: existing, source: 'existing', skippedReason: null };
  }

  const giphyKey = String(process.env.GIPHY_API_KEY || '').trim();
  const tenorKey = String(process.env.TENOR_API_KEY || '').trim();
  if (!giphyKey && !tenorKey) {
    return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'no_api_key' };
  }

  if (sessionGifQueryCache.has(gifQuery)) {
    const cachedUrl = sessionGifQueryCache.get(gifQuery) || null;
    return {
      gifQuery,
      gifUrl: cachedUrl,
      source: cachedUrl ? 'cache' : 'none',
      skippedReason: cachedUrl ? null : 'cached_miss',
    };
  }

  if (giphyKey) {
    if (!consumeGifQuota()) {
      return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'quota_exhausted' };
    }
    const giphyRes = await fetchGiphyCleanGif(gifQuery, category, giphyKey);
    if (giphyRes.rateLimited) {
      return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'rate_limited' };
    }
    if (giphyRes.gifUrl) {
      sessionGifQueryCache.set(gifQuery, giphyRes.gifUrl);
      return { gifQuery, gifUrl: giphyRes.gifUrl, source: 'giphy', skippedReason: null };
    }
  }

  if (tenorKey) {
    if (!consumeGifQuota()) {
      return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'quota_exhausted' };
    }
    const tenorRes = await fetchTenorCleanGif(gifQuery, category, tenorKey);
    if (tenorRes.rateLimited) {
      return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'rate_limited' };
    }
    if (tenorRes.gifUrl) {
      sessionGifQueryCache.set(gifQuery, tenorRes.gifUrl);
      return { gifQuery, gifUrl: tenorRes.gifUrl, source: 'tenor', skippedReason: null };
    }
  }

  sessionGifQueryCache.set(gifQuery, null);
  return { gifQuery, gifUrl: null, source: 'none', skippedReason: 'no_clean_match' };
}

async function backfillMissingFactGifs(pool, { maxPerRun = 30 } = {}) {
  const giphyKey = String(process.env.GIPHY_API_KEY || '').trim();
  const tenorKey = String(process.env.TENOR_API_KEY || '').trim();
  if (!giphyKey && !tenorKey) {
    return { attempted: 0, updated: 0, queryUpdated: 0, skippedReason: 'no_api_key' };
  }

  const quotaStatus = getHourlyGifQuotaStatus();
  if (quotaStatus.remaining <= 0) {
    return { attempted: 0, updated: 0, queryUpdated: 0, skippedReason: 'quota_exhausted' };
  }

  const limit = Math.max(1, Math.min(maxPerRun, quotaStatus.remaining));
  const pendingRes = await pool.query(
    `SELECT id, slug, category, title_en, visual_query, gif_query
     FROM facts
     WHERE gif_url IS NULL OR TRIM(gif_url) = ''
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  let attempted = 0;
  let updated = 0;
  let queryUpdated = 0;
  let stopReason = null;

  for (const row of pendingRes.rows) {
    if (!canConsumeGifQuota()) {
      stopReason = 'quota_exhausted';
      break;
    }

    attempted += 1;
    const resolved = await resolveServerGifForFact({
      visualQuery: row.gif_query || row.visual_query || '',
      titleEn: row.title_en || '',
      category: row.category || 'science',
    });

    if (resolved.gifUrl) {
      await pool.query(
        `UPDATE facts
         SET gif_url = $2,
             gif_query = COALESCE(NULLIF($3, ''), gif_query)
         WHERE id = $1
           AND (gif_url IS NULL OR TRIM(gif_url) = '')`,
        [row.id, resolved.gifUrl, resolved.gifQuery]
      );
      updated += 1;
    } else if (!row.gif_query && resolved.gifQuery) {
      await pool.query(
        `UPDATE facts
         SET gif_query = $2
         WHERE id = $1
           AND (gif_query IS NULL OR TRIM(gif_query) = '')`,
        [row.id, resolved.gifQuery]
      );
      queryUpdated += 1;
    }

    if (resolved.skippedReason === 'quota_exhausted' || resolved.skippedReason === 'rate_limited') {
      stopReason = resolved.skippedReason;
      break;
    }
  }

  return {
    attempted,
    updated,
    queryUpdated,
    skippedReason: stopReason,
  };
}

async function loadSeedFactsFromDisk() {
  const shardFiles = ['space.json', 'nature.json', 'human_body.json', 'history.json', 'science.json', 'records.json', 'statistics.json'];
  const all = [];

  for (const file of shardFiles) {
    const publicPath = path.join(ROOT_DIR, 'public', 'data', 'facts', file);
    const dataPath = path.join(ROOT_DIR, 'data', 'facts', file);
    let raw;
    try {
      raw = await fs.readFile(publicPath, 'utf8');
    } catch {
      try {
        raw = await fs.readFile(dataPath, 'utf8');
      } catch {
        raw = null;
      }
    }
    if (!raw) continue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      all.push(...parsed);
    }
  }
  return all;
}

async function ensureSchemaAndSeed(pool) {
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

  await pool.query(`
    ALTER TABLE facts
      ADD COLUMN IF NOT EXISTS visual_query TEXT,
      ADD COLUMN IF NOT EXISTS gif_url TEXT,
      ADD COLUMN IF NOT EXISTS gif_query TEXT,
      ADD COLUMN IF NOT EXISTS quiz_tr JSONB,
      ADD COLUMN IF NOT EXISTS quiz_en JSONB;
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
    CREATE TABLE IF NOT EXISTS scheduler_state (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      last_card_generation_at TIMESTAMPTZ,
      gif_hour_window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      gif_requests_in_window INTEGER NOT NULL DEFAULT 0,
      is_generating_cards BOOLEAN NOT NULL DEFAULT FALSE,
      is_matching_gifs BOOLEAN NOT NULL DEFAULT FALSE,
      card_lock_started_at TIMESTAMPTZ,
      gif_lock_started_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO scheduler_state (
      id, gif_hour_window_start, gif_requests_in_window, is_generating_cards, is_matching_gifs
    )
    VALUES (1, NOW(), 0, FALSE, FALSE)
    ON CONFLICT (id) DO NOTHING;
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

  const countRes = await pool.query('SELECT COUNT(*)::INT AS count FROM facts');
  const existingCount = countRes.rows[0]?.count ?? 0;
  if (existingCount === 0) {
    const seedFacts = await loadSeedFactsFromDisk();
    for (let idx = 0; idx < seedFacts.length; idx += 1) {
      const fact = seedFacts[idx];
      const slug = fact.slug || fact.en?.slug || fact.tr?.slug || fact.id;
      const guessTr = fact.tr?.guessChallenge;
      const guessEn = fact.en?.guessChallenge;
      const minVal = typeof guessEn?.min === 'number' ? guessEn.min : 0;
      const maxVal = typeof guessEn?.max === 'number' ? guessEn.max : 100;
      const answerVal =
        typeof guessEn?.correctValue === 'number'
          ? guessEn.correctValue
          : guessEn?.type === 'binary'
            ? 1
            : 50;

      const seedGifQuery = buildGifSearchQuery({
        visualQuery: fact.visualQuery || '',
        titleEn: fact.en?.title || '',
        category: fact.category || 'science',
      });
      const rawSeedGifUrl = String(fact.gifUrl || '').trim();
      const seedGifUrl =
        rawSeedGifUrl.startsWith('https://') && !DISALLOWED_VIDEO_EXT_PATTERN.test(rawSeedGifUrl)
          ? rawSeedGifUrl
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
          $22, $23, 0, NOW() - ($24 * INTERVAL '1 second')
        )
        ON CONFLICT (slug) DO NOTHING`,
        [
          slug,
          fact.category,
          fact.tr?.title ?? '',
          fact.en?.title ?? '',
          fact.tr?.factText ?? '',
          fact.en?.factText ?? '',
          fact.tr?.deepDiveDetail ?? '',
          fact.en?.deepDiveDetail ?? '',
          guessTr?.prompt || fact.tr?.quiz?.question || fact.tr?.title || '',
          guessEn?.prompt || fact.en?.quiz?.question || fact.en?.title || '',
          guessTr?.unit || '',
          guessEn?.unit || '',
          minVal,
          maxVal,
          answerVal,
          fact.id,
          fact.visualQuery || null,
          seedGifUrl,
          seedGifQuery || null,
          fact.tr?.quiz ? JSON.stringify(fact.tr.quiz) : null,
          fact.en?.quiz ? JSON.stringify(fact.en.quiz) : null,
          fact.en?.sourceName || fact.sourceName || fact.en?.sourceHint || '',
          fact.en?.sourceUrl || fact.sourceUrl || '',
          idx + 1,
        ]
      );
    }
    console.log(`[generateFacts] Seeded ${seedFacts.length} initial facts into empty Postgres table.`);
  }
}

export const BANNED_CLICHE_PATTERNS = [
  // 1. Neutron star teaspoon weight
  /(teaspoon|tea\s*spoon).{0,40}neutron\s*star/i,
  /neutron\s*star.{0,40}(teaspoon|tea\s*spoon|billion\s*tons)/i,
  /bir\s*çay\s*kaşığı.{0,30}nötron\s*yıldız/i,
  /nötron\s*yıldız.{0,30}çay\s*kaşığı/i,
  // 2. Diamond rain on Neptune / Uranus
  /(rains?|raining)\s*diamonds?.{0,35}(neptune|uranus)/i,
  /(neptune|uranus).{0,35}diamonds?\s*rain/i,
  /(neptün|uranüs).{0,35}elmas\s*yağmur/i,
  /elmas\s*yağmur.{0,35}(neptün|uranüs)/i,
  // 3. Flamingos born grey
  /flamingos?.{0,35}born\s*(grey|gray|white)/i,
  /flamingolar?.{0,35}(gri|beyaz).{0,25}doğ/i,
  // 4. Octopus 3 hearts
  /octopus(?:es)?\s*(?:have|with)\s*(?:3|three)\s*hearts/i,
  /ahtapot(?:ların|lar)?\s*(?:3|üç)\s*kal[bp]/i,
  // 5. Honey never spoils / 3000-year-old Egyptian tomb honey
  /honey.{0,35}(never\s*spoils|never\s*goes\s*bad|still\s*edible|egyptian\s*tombs?)/i,
  /(bal.{0,30}(asla\s*bozulmaz|bozulmayan|hala\s*yenebilir)|antik\s*mısır.{0,30}bal)/i,
  // 6. Eiffel Tower grows in summer
  /eiffel\s*tower.{0,40}(grows?|taller|expand).{0,30}summer/i,
  /eyfel\s*kulesi.{0,40}(yaz.{0,20}uzar|uzar.{0,20}yaz|santimetre\s*uzar)/i,
  // 7. Bananas are berries / strawberries aren't berries / bananas are radioactive
  /(strawberr(?:y|ies).{0,30}berr(?:y|ies).{0,35}banana|banana.{0,30}is\s*a\s*berry|banana.{0,35}radioactive)/i,
  /(çilek.{0,30}meyve\s*değil.{0,35}muz|muz.{0,25}üzümsü|muz.{0,35}(radyoaktif|antimadde))/i,
  // 8. Sharks older than trees
  /sharks?.{0,35}older\s*than.{0,30}(trees|saturn)/i,
  /köpekbalık(?:ları|lar)?.{0,35}ağaçlardan.{0,25}yaşlı/i,
];

export function isBannedCliche(item) {
  if (!item || typeof item !== 'object') return false;
  const fieldsToScan = [
    item.slug,
    item.title_tr,
    item.title_en,
    item.summary_tr,
    item.summary_en,
    item.detail_tr,
    item.detail_en,
    item.tr?.title,
    item.tr?.factText,
    item.tr?.deepDiveDetail,
    item.en?.title,
    item.en?.factText,
    item.en?.deepDiveDetail,
  ]
    .filter(Boolean)
    .join(' ');

  return BANNED_CLICHE_PATTERNS.some((pattern) => pattern.test(fieldsToScan));
}

function normalizeSlug(rawSlug, titleEn) {
  const base = (rawSlug || titleEn || `fact-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `scrolly-fact-${Date.now()}`;
}

function getGenerationToken() {
  return String(
    process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''
  ).trim();
}

function isRootOrGenericUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return true;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (
      cleanPath === '' ||
      cleanPath === '/en' ||
      cleanPath === '/tr' ||
      cleanPath === '/index.html' ||
      cleanPath === '/index.php' ||
      cleanPath === '/home' ||
      cleanPath === '/home.html'
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function verifyPrimarySourceUrl(urlStr) {
  if (isRootOrGenericUrl(urlStr)) {
    return { ok: false, reason: 'root-or-invalid-url' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const headers = {
    'User-Agent': 'ScrollyFactVerifier/1.0 (+https://scrolly.live)',
    Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  };

  try {
    let res = await fetch(urlStr, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(urlStr, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      });
    }
    if (res.status === 200) {
      return { ok: true, status: res.status };
    }
    return { ok: false, reason: `http-${res.status}` };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network-error',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function validateGeneratedFact(item, existingSlugs, existingTitlesEn, options = {}) {
  const { skipUrlFetch = false } = options;
  if (!item || typeof item !== 'object') return null;

  const category = String(item.category || '').trim().toLowerCase();
  if (!CATEGORIES.includes(category)) return null;

  const titleTr = String(item.title_tr || '').trim();
  const titleEn = String(item.title_en || '').trim();
  const summaryTr = String(item.summary_tr || '').trim();
  const summaryEn = String(item.summary_en || '').trim();
  const detailTr = String(item.detail_tr || '').trim();
  const detailEn = String(item.detail_en || '').trim();
  const questionTr = String(item.question_tr || '').trim();
  const questionEn = String(item.question_en || '').trim();
  const sourceName = String(item.source_name || '').trim();
  const sourceUrl = String(item.source_url || '').trim();

  if (
    !titleTr ||
    !titleEn ||
    !summaryTr ||
    !summaryEn ||
    !detailTr ||
    !detailEn ||
    !questionTr ||
    !questionEn ||
    !sourceName ||
    !/^https:\/\/[^\s]+$/i.test(sourceUrl)
  ) {
    return null;
  }

  if (existingTitlesEn.has(titleEn.toLowerCase())) {
    return null;
  }

  if (isBannedCliche(item)) {
    console.warn(`[generateFacts] Rejected overused trivia cliché candidate: "${titleEn}"`);
    return null;
  }

  let slug = normalizeSlug(item.slug, titleEn);
  if (existingSlugs.has(slug)) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const rawMin = Number(item.min_val);
  const rawMax = Number(item.max_val);
  const rawAnswer = Number(item.answer_val);
  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || !Number.isFinite(rawAnswer)) {
    return null;
  }

  const minVal = Math.min(rawMin, rawMax);
  const maxVal = rawMax <= minVal ? minVal + 10 : rawMax;
  const answerVal = Math.min(maxVal, Math.max(minVal, rawAnswer));

  const sketchTypeRaw = String(item.sketch_type || '').trim().toLowerCase();
  if (!VALID_SKETCH_TYPES.has(sketchTypeRaw) && !SKETCH_ID_PATTERN.test(sketchTypeRaw)) {
    console.warn(
      `[generateFacts] Rejected candidate "${titleEn}" due to invalid sketch_type "${sketchTypeRaw}".`
    );
    return null;
  }

  const sourceCheck = skipUrlFetch
    ? { ok: !isRootOrGenericUrl(sourceUrl), reason: 'root-or-invalid-url' }
    : await verifyPrimarySourceUrl(sourceUrl);
  if (!sourceCheck.ok) {
    console.warn(
      `[generateFacts] Rejected candidate "${titleEn}" due to unverified primary source URL (${sourceCheck.reason}): ${sourceUrl}`
    );
    return null;
  }

  const BANNED_VISUAL_WORDS = new Set([
    'meme',
    'memes',
    'reaction',
    'reactions',
    'funny',
    'anime',
    'text',
    'quote',
    'quotes',
    'caption',
    'lol',
    'wtf',
    'mrw',
    'mfw',
    'subtitles',
  ]);
  const visualTokens = String(item.visualQuery || item.visual_query || '')
    .toLowerCase()
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !BANNED_VISUAL_WORDS.has(w))
    .slice(0, 3);
  const fallbackTokens = titleEn
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !BANNED_VISUAL_WORDS.has(w))
    .slice(0, 3);
  const visualQuery =
    visualTokens.length >= 2
      ? visualTokens.join(' ')
      : fallbackTokens.length >= 2
        ? fallbackTokens.join(' ')
        : 'science discovery animation';

  const normalizeQuizObj = (qObj, fallbackExplanation) => {
    if (
      qObj &&
      typeof qObj === 'object' &&
      typeof qObj.question === 'string' &&
      qObj.question.trim().length > 0 &&
      Array.isArray(qObj.options) &&
      qObj.options.length === 3 &&
      (qObj.correctIndex === 0 || qObj.correctIndex === 1 || qObj.correctIndex === 2)
    ) {
      const options = qObj.options.map((o) => String(o).trim());
      const uniqueCount = new Set(options.map((o) => o.toLowerCase())).size;
      const allPureNumbers = options.every((o) => /^[\d.,%+\-\s]+$/.test(o));
      if (uniqueCount !== 3 || options.some((o) => !o) || allPureNumbers) {
        return null;
      }
      return {
        question: qObj.question.trim(),
        options,
        correctIndex: qObj.correctIndex,
        explanation: String(qObj.explanation || '').trim() || fallbackExplanation,
      };
    }
    return null;
  };

  return {
    slug,
    category,
    title_tr: titleTr,
    title_en: titleEn,
    summary_tr: summaryTr,
    summary_en: summaryEn,
    detail_tr: detailTr,
    detail_en: detailEn,
    question_tr: questionTr,
    question_en: questionEn,
    unit_tr: String(item.unit_tr || '').trim(),
    unit_en: String(item.unit_en || '').trim(),
    min_val: minVal,
    max_val: maxVal,
    answer_val: answerVal,
    sketch_type: sketchTypeRaw,
    visual_query: visualQuery,
    quiz_tr: normalizeQuizObj(item.quiz_tr, detailTr),
    quiz_en: normalizeQuizObj(item.quiz_en, detailEn),
    source_name: sourceName,
    source_url: sourceUrl,
  };
}

function buildPrompts(existingTitlesEn, topEngaged, batchOptions = {}) {
  const factsCount = Math.max(1, Number(batchOptions.factsCount) || 5);
  const vocabCount = Math.max(0, Number.isFinite(Number(batchOptions.vocabCount)) ? Number(batchOptions.vocabCount) : 2);
  const targetCategories =
    Array.isArray(batchOptions.targetCategories) && batchOptions.targetCategories.length > 0
      ? batchOptions.targetCategories
      : CATEGORIES;
  const recentTitlesSample = Array.from(existingTitlesEn).slice(-120);
  const existingVocabSample = Array.from(batchOptions.existingVocabWords || []).slice(-120);
  const engagementContext =
    topEngaged.length > 0
      ? topEngaged
          .map(
            (r, idx) =>
              `${idx + 1}. [${r.category}] "${r.title_en}" (likes=${r.likes_count}, avg_dwell_sec=${r.avg_dwell_sec}, detail_opens=${r.detail_opens})`
          )
          .join('\n')
      : 'No prior telemetry events yet—aim for crisp, astonishing, verified scientific hooks.';

  const systemPrompt = `You are the chief scientific editor for Scrolly (scrolly.live), a bilingual (Turkish & English) micro-learning discovery feed.
Generate strictly valid JSON matching the exact schema requested. Every fact MUST be scientifically true, verifiable, fascinating, and cite a REAL, permanent, deep primary source URL starting with https:// (such as a specific NASA/ESA/NOAA article URL, NIH/PubMed paper, Nature/Science DOI, Smithsonian/UNESCO/Guinness specific entry page, or university press release — NEVER a root homepage like https://www.nasa.gov/ or https://www.nature.com/).

STRICT ANTI-CLICHÉ BAN LIST — NEVER generate or paraphrase these overused internet trivia tropes:
1. A teaspoon of neutron star weighing billions of tons
2. Diamond rain on Neptune or Uranus
3. Flamingos being born grey/white
4. Octopuses having 3 hearts
5. Honey never spoiling / 3,000-year-old edible honey from Egyptian tombs
6. The Eiffel Tower growing taller in summer due to thermal expansion
7. Bananas being botanical berries / strawberries not being berries / bananas being radioactive
8. Sharks being older than trees or Saturn's rings

Instead, write fresh, counter-intuitive, peer-reviewed scientific mechanisms and little-known empirical discoveries.`;

  const vocabBlock =
    vocabCount > 0
      ? `

ALSO include a second key \`"vocabulary"\` with exactly ${vocabCount} brand-new B1–C2 English vocabulary learning card${vocabCount === 1 ? '' : 's'} (no duplicates of common A1 words or these existing words: ${existingVocabSample.join(', ') || 'none'}). Each vocabulary item MUST have:
- "word": English lemma (lowercase unless proper noun)
- "phonetic": real IPA in slashes (e.g. "/rɪˈzɪl.i.ənt/") — NEVER fake placeholders
- "partOfSpeech": one of "isim" | "sıfat" | "fiil" | "zarf" | "edat"
- "meaningTr": concise Turkish meaning
- "definitionEn": one clear English definition sentence
- "exampleEn": natural English example sentence that CONTAINS the word
- "exampleTr": Turkish translation of that example
- "quizOptions": array of exactly 3 Turkish meaning options
- "correctIndex": 0 | 1 | 2 matching the correct Turkish meaning in quizOptions`
      : `\n\nInclude \`"vocabulary": []\` (0 vocabulary items in this batch).`;

  const userPrompt = `Create exactly ${factsCount} brand-new bilingual (TR & EN) micro-fact card${factsCount === 1 ? '' : 's'} distributed across ALL 7 categories in balanced rotation (${targetCategories.join(', ')} — cover every listed category before repeating any).

Top-performing cards based on real user engagement (use their pacing/wonder style as inspiration, but choose fresh topics — zero clichés from the ban list):
${engagementContext}

Forbidden existing topics (DO NOT duplicate or paraphrase these titles):
${recentTitlesSample.join(' | ')}

Available visual sketch themes for \`sketch_type\` (you MUST pick one exact value from this list):
${SKETCH_TYPES.join(', ')}

Return a JSON object with a key \`"facts"\` containing an array of exactly ${factsCount} items, each with EXACTLY these keys:
- "slug": lowercase ASCII kebab-case slug derived from English title (e.g. "europas-subsurface-ocean")
- "category": one of "space" | "nature" | "human_body" | "history" | "science" | "records" | "statistics"
- "visual_query": strictly 2-3 concrete English words depicting the real physical/natural/historical/statistical subject for GIF & media lookup (e.g. "swift bird sky", "colorful space nebula", "probability dice roll") — NEVER a full sentence and NEVER meme/reaction/funny/anime/text/quote words
- "title_tr": punchy Turkish headline (max 90 chars)
- "title_en": punchy English headline (max 90 chars)
- "summary_tr": 1-2 engaging Turkish sentences explaining the hook (max 220 chars)
- "summary_en": 1-2 engaging English sentences explaining the hook (max 220 chars)
- "detail_tr": deeper Turkish scientific/historical mechanism (2-3 sentences, max 420 chars)
- "detail_en": deeper English scientific/historical mechanism (2-3 sentences, max 420 chars)
- "question_tr": interactive numerical estimation prompt in Turkish ending in "?"
- "question_en": interactive numerical estimation prompt in English ending in "?"
- "unit_tr": short Turkish unit string (e.g. "km", "°C", "yıl", "%", "m", or "")
- "unit_en": short English unit string (e.g. "km", "°C", "years", "%", "m", or "")
- "min_val": realistic minimum slider integer/number strictly less than max_val
- "max_val": realistic maximum slider integer/number strictly greater than min_val
- "answer_val": exact verified numerical answer between min_val and max_val
- "quiz_tr": { "question": fascinating conceptual WHY/HOW/MECHANISM question in Turkish (NEVER a +/-30% number-guessing clone of the slider!), "options": [3 short distinct conceptual strings, never plain numbers], "correctIndex": 0|1|2 (vary evenly across 0, 1, 2 across items!), "explanation": "concise TR scientific takeaway" }
- "quiz_en": { "question": fascinating conceptual WHY/HOW/MECHANISM question in English (NEVER a +/-30% number-guessing clone!), "options": [3 short distinct conceptual strings, never plain numbers], "correctIndex": 0|1|2 (vary evenly across 0, 1, 2 across items!), "explanation": "concise EN scientific takeaway" }
- "sketch_type": exact matching value from the \`sketch_type\` list above
- "source_name": authoritative institution or journal name
- "source_url": real, live deep https:// article/DOI verification URL (never a root domain homepage)${vocabBlock}`;

  return { systemPrompt, userPrompt };
}

function slugifyVocabWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function validateVocabularyCard(raw, existingWords) {
  if (!raw || typeof raw !== 'object') return null;
  const word = String(raw.word || '').trim();
  const phonetic = String(raw.phonetic || '').trim();
  const partOfSpeech = String(raw.partOfSpeech || '').trim();
  const meaningTr = String(raw.meaningTr || '').trim();
  const definitionEn = String(raw.definitionEn || '').trim();
  const exampleEn = String(raw.exampleEn || '').trim();
  const exampleTr = String(raw.exampleTr || '').trim();
  const quizOptions = Array.isArray(raw.quizOptions)
    ? raw.quizOptions.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  const correctIndex = Number(raw.correctIndex);

  if (!word || word.length < 3) return null;
  if (existingWords.has(word.toLowerCase())) return null;
  if (!phonetic.startsWith('/') || !phonetic.endsWith('/') || phonetic.includes('…') || phonetic.includes('mart')) {
    return null;
  }
  if (!['isim', 'sıfat', 'fiil', 'zarf', 'edat'].includes(partOfSpeech)) return null;
  if (!meaningTr || !definitionEn || !exampleEn || !exampleTr) return null;
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${escapedWord}\\b`, 'i').test(exampleEn)) {
    return null;
  }
  if (quizOptions.length !== 3) return null;
  if (![0, 1, 2].includes(correctIndex)) return null;

  return {
    id: `vocab-gen-${slugifyVocabWord(word)}-${Date.now().toString(36)}`,
    category: 'vocabulary',
    word,
    phonetic,
    partOfSpeech,
    meaningTr,
    definitionEn,
    exampleEn,
    exampleTr,
    quizOptions: /** @type {[string, string, string]} */ ([quizOptions[0], quizOptions[1], quizOptions[2]]),
    correctIndex: /** @type {0|1|2} */ (correctIndex),
  };
}

async function appendGeneratedVocabulary(cards) {
  if (!cards.length) return 0;
  const target = path.join(ROOT_DIR, 'data', 'vocabularyGenerated.json');
  let existing = [];
  try {
    const raw = await fs.readFile(target, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  const seen = new Set(
    existing
      .map((item) => String(item?.word || '').toLowerCase())
      .filter(Boolean)
  );
  let added = 0;
  for (const card of cards) {
    const key = card.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    existing.push(card);
    added += 1;
  }
  await fs.writeFile(target, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
  return added;
}

function sleep(ms) {
  if (!ms || ms <= 0 || process.env.SCROLLY_NO_RETRY_DELAY === '1') {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripJsonCodeFences(rawText) {
  return String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonCandidate(rawText) {
  const input = String(rawText || '').trim();
  if (!input) return null;

  const stripped = stripJsonCodeFences(input);
  try {
    return JSON.parse(stripped);
  } catch {
    // Fall through to scan fenced blocks or embedded object boundaries
  }

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = fenceRegex.exec(input)) !== null) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Keep scanning other fenced blocks
    }
  }

  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(input.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function ensureQuizTriplet(quizObj, fallbackQuestion, correctAnswerText, altOne, altTwo, fallbackExplanation) {
  if (
    quizObj &&
    typeof quizObj === 'object' &&
    typeof quizObj.question === 'string' &&
    Array.isArray(quizObj.options) &&
    quizObj.options.length === 3 &&
    [0, 1, 2].includes(quizObj.correctIndex)
  ) {
    return quizObj;
  }
  return {
    question: fallbackQuestion,
    options: [correctAnswerText, altOne, altTwo],
    correctIndex: 0,
    explanation: fallbackExplanation,
  };
}

function toFactCardSchema(clean, idx = 0) {
  const meta = CATEGORY_VISUAL_DEFAULTS[clean.category] ?? CATEGORY_VISUAL_DEFAULTS.science;
  const createdMs = Date.now() + idx;
  const slugPart = String(clean.slug || `fact-${createdMs}`).slice(0, 44);
  const id = `gen-${slugPart}`;
  const isIntScale =
    Number.isInteger(clean.min_val) &&
    Number.isInteger(clean.max_val) &&
    Number.isInteger(clean.answer_val);

  const buildGuess = (prompt, unit) => ({
    type: 'slider',
    prompt,
    min: clean.min_val,
    max: clean.max_val,
    step: isIntScale ? 1 : 0.1,
    unit: unit || '',
    correctValue: clean.answer_val,
  });

  return {
    id,
    slug: clean.slug,
    category: clean.category,
    accentColor: meta.accentColor,
    iconName: meta.iconName,
    emoji: meta.emoji,
    sketchType: clean.sketch_type,
    visualQuery: clean.visual_query,
    gifQuery:
      clean.gif_query ||
      buildGifSearchQuery({
        visualQuery: clean.visual_query,
        titleEn: clean.title_en,
        category: clean.category,
      }),
    ...(clean.gif_url ? { gifUrl: clean.gif_url } : {}),
    readingTimeSec: 18,
    sourceName: clean.source_name,
    sourceUrl: clean.source_url,
    createdAt: new Date(createdMs).toISOString(),
    tr: {
      slug: clean.slug,
      title: clean.title_tr,
      factText: clean.summary_tr,
      deepDiveDetail: clean.detail_tr,
      sourceHint: clean.source_name,
      sourceName: clean.source_name,
      sourceUrl: clean.source_url,
      quiz: ensureQuizTriplet(
        clean.quiz_tr,
        clean.question_tr,
        clean.title_tr,
        clean.summary_tr,
        clean.source_name,
        clean.detail_tr
      ),
      guessChallenge: buildGuess(clean.question_tr, clean.unit_tr),
    },
    en: {
      slug: clean.slug,
      title: clean.title_en,
      factText: clean.summary_en,
      deepDiveDetail: clean.detail_en,
      sourceHint: clean.source_name,
      sourceName: clean.source_name,
      sourceUrl: clean.source_url,
      quiz: ensureQuizTriplet(
        clean.quiz_en,
        clean.question_en,
        clean.title_en,
        clean.summary_en,
        clean.source_name,
        clean.detail_en
      ),
      guessChallenge: buildGuess(clean.question_en, clean.unit_en),
    },
  };
}

async function loadExistingGeneratedFacts() {
  const target = path.join(ROOT_DIR, 'data', 'factsGenerated.json');
  try {
    const raw = await fs.readFile(target, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendGeneratedFacts(cleanFacts, seedSlugs = new Set(), seedIds = new Set()) {
  if (!cleanFacts.length) return 0;
  const target = path.join(ROOT_DIR, 'data', 'factsGenerated.json');
  const existing = await loadExistingGeneratedFacts();

  const seenSlugs = new Set(seedSlugs);
  const seenIds = new Set(seedIds);
  for (const item of existing) {
    if (item?.id) seenIds.add(String(item.id));
    for (const candidateSlug of [item?.slug, item?.tr?.slug, item?.en?.slug]) {
      if (candidateSlug) seenSlugs.add(String(candidateSlug));
    }
  }

  let added = 0;
  for (let i = 0; i < cleanFacts.length; i += 1) {
    const card = toFactCardSchema(cleanFacts[i], i);
    if (seenSlugs.has(card.slug) || seenIds.has(card.id)) {
      continue;
    }
    seenSlugs.add(card.slug);
    seenIds.add(card.id);
    existing.push(card);
    added += 1;
  }

  await fs.writeFile(target, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
  return added;
}

async function requestNativeGemini({ modelName, token, systemPrompt, userPrompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(token)}`;
  const buildBody = (includeThinkingLevel) => {
    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 32768,
      responseMimeType: 'application/json',
    };
    if (includeThinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
    }
    return {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig,
    };
  };

  let response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify(buildBody(true)),
  });

  let rawText = (await response.text()).trim();

  // If a 2.5 fallback model rejects thinkingLevel in generationConfig, retry once without it
  if (
    response.status === 400 &&
    /thinkingLevel|thinking_config|thinkingConfig/i.test(rawText)
  ) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify(buildBody(false)),
    });
    rawText = (await response.text()).trim();
  }

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason || data?.error?.status || 'unknown';
  const usageMetadata = data?.usageMetadata || null;
  const contentText = (candidate?.content?.parts || [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();

  return {
    ok: response.ok,
    status: response.status,
    finishReason,
    usageMetadata,
    rawText,
    contentText,
    parsedPayload: extractJsonCandidate(contentText),
  };
}

async function requestOpenAICompat({ endpoint, modelName, token, systemPrompt, userPrompt }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: modelName,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 32768,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const rawText = (await response.text()).trim();
  let data;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason || data?.error?.code || 'unknown';
  const usageMetadata = data?.usage || null;
  const contentText = String(choice?.message?.content || '').trim();
  const reasoningText = String(choice?.message?.reasoning_content || '').trim();

  let parsedPayload = contentText ? extractJsonCandidate(contentText) : null;
  if (!parsedPayload && reasoningText) {
    parsedPayload = extractJsonCandidate(reasoningText);
  }

  return {
    ok: response.ok,
    status: response.status,
    finishReason,
    usageMetadata,
    rawText,
    contentText: contentText || reasoningText,
    parsedPayload,
  };
}

async function fetchGeneratedFactsFromModel(existingTitlesEn, topEngaged, batchOptions = {}) {
  const token = getGenerationToken();

  if (!token) {
    throw new Error(
      'Missing GEMINI_API_KEY, AI_API_KEY, or OPENAI_API_KEY environment variable.'
    );
  }

  const factsTarget = Math.max(1, Number(batchOptions.factsCount) || 5);
  const vocabTarget = Math.max(
    0,
    Number.isFinite(Number(batchOptions.vocabCount)) ? Number(batchOptions.vocabCount) : 2
  );
  const { systemPrompt, userPrompt } = buildPrompts(existingTitlesEn, topEngaged, {
    ...batchOptions,
    factsCount: factsTarget,
    vocabCount: vocabTarget,
  });
  const customEndpoint = String(process.env.AI_MODELS_ENDPOINT || CUSTOM_AI_MODELS_ENDPOINT).trim();
  const preferredModel =
    String(process.env.AI_MODEL_NAME || DEFAULT_AI_MODEL_NAME).trim() || 'gemini-4-hydrogen';
  const useCustomOpenAIEndpoint = Boolean(customEndpoint);
  const modelCandidates = Array.from(
    new Set([preferredModel, ...GEMINI_FALLBACK_MODELS].filter(Boolean))
  );
  const maxAttempts = 3;
  const failures = [];

  for (const modelName of modelCandidates) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = useCustomOpenAIEndpoint
          ? await requestOpenAICompat({
              endpoint: customEndpoint,
              modelName,
              token,
              systemPrompt,
              userPrompt,
            })
          : await requestNativeGemini({
              modelName,
              token,
              systemPrompt,
              userPrompt,
            });

        const payload = result.parsedPayload;
        const factsArr = Array.isArray(payload?.facts) ? payload.facts : [];
        const vocabArr = Array.isArray(payload?.vocabulary) ? payload.vocabulary : [];

        if (result.ok && factsArr.length > 0) {
          if (factsArr.length < factsTarget || vocabArr.length < vocabTarget) {
            console.warn(
              `[generateFacts] Partial counts from ${modelName} (attempt ${attempt}/${maxAttempts}): facts=${factsArr.length}/${factsTarget}, vocabulary=${vocabArr.length}/${vocabTarget}, finishReason=${result.finishReason}, usageMetadata=${JSON.stringify(result.usageMetadata)}`
            );
            if (factsArr.length < factsTarget && attempt < maxAttempts) {
              await sleep(1000 * 2 ** (attempt - 1));
              continue;
            }
          }
          return {
            model: modelName,
            facts: factsArr.slice(0, factsTarget),
            vocabulary: vocabTarget > 0 ? vocabArr.slice(0, vocabTarget) : [],
          };
        }

        const diag = `model=${modelName} attempt=${attempt}/${maxAttempts} status=${result.status} finishReason=${result.finishReason} usageMetadata=${JSON.stringify(result.usageMetadata)} snippet=${result.rawText.slice(0, 220)}`;
        console.warn(`[generateFacts] Empty/invalid AI response: ${diag}`);
        failures.push(diag);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const diag = `model=${modelName} attempt=${attempt}/${maxAttempts} error=${msg}`;
        console.warn(`[generateFacts] Request error: ${diag}`);
        failures.push(diag);
      }

      if (attempt < maxAttempts) {
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }
  }

  throw new Error(
    `All model attempts failed across [${modelCandidates.join(', ')}]: ${failures[failures.length - 1] || 'unknown failure'}`
  );
}

async function loadLocalBaselineState() {
  const seedFacts = await loadSeedFactsFromDisk();
  const generatedFacts = await loadExistingGeneratedFacts();

  const existingSlugs = new Set();
  const existingIds = new Set();
  const existingTitlesEn = new Set();

  for (const item of [...seedFacts, ...generatedFacts]) {
    if (item?.id) existingIds.add(String(item.id));
    for (const s of [item?.slug, item?.tr?.slug, item?.en?.slug]) {
      if (s) existingSlugs.add(String(s));
    }
    const titleEn = String(item?.en?.title || item?.title_en || '').trim().toLowerCase();
    if (titleEn) existingTitlesEn.add(titleEn);
  }

  let seedVocabWords = new Set();
  try {
    const seedRaw = await fs.readFile(path.join(ROOT_DIR, 'data', 'vocabularyFacts.ts'), 'utf8');
    const wordMatches = seedRaw.matchAll(/word:\s*'([^']+)'/g);
    for (const match of wordMatches) {
      seedVocabWords.add(match[1].toLowerCase());
    }
  } catch {
    seedVocabWords = new Set();
  }
  try {
    const genRaw = await fs.readFile(path.join(ROOT_DIR, 'data', 'vocabularyGenerated.json'), 'utf8');
    const genParsed = JSON.parse(genRaw);
    if (Array.isArray(genParsed)) {
      for (const item of genParsed) {
        if (item?.word) seedVocabWords.add(String(item.word).toLowerCase());
      }
    }
  } catch {
    // ignore missing generated file
  }

  return { seedFacts, generatedFacts, existingSlugs, existingIds, existingTitlesEn, seedVocabWords };
}

function resolveTargetCardsPerRun(argv = process.argv, env = process.env) {
  let rawCount = env?.TARGET_CARDS_PER_RUN;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '');
    if (arg.startsWith('--count=')) {
      rawCount = arg.slice('--count='.length);
      break;
    }
    if (arg === '--count' && argv[i + 1]) {
      rawCount = argv[i + 1];
      break;
    }
  }
  const parsed = Number.parseInt(String(rawCount ?? '25'), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(100, Math.max(1, parsed));
}

function buildBatchPlan(targetTotal) {
  const BATCH_SIZE = 10;
  const plan = [];
  let remaining = Math.min(100, Math.max(1, Number(targetTotal) || 25));
  let batchIndex = 0;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    const vocabCount = batchSize >= 2 ? Math.max(1, Math.round(batchSize * 0.2)) : 0;
    const factsCount = batchSize - vocabCount;
    const startOffset = (batchIndex * 3) % CATEGORIES.length;
    const targetCategories = [];
    for (let i = 0; i < Math.min(factsCount, CATEGORIES.length); i += 1) {
      targetCategories.push(CATEGORIES[(startOffset + i) % CATEGORIES.length]);
    }

    plan.push({
      batchNumber: batchIndex + 1,
      batchSize,
      factsCount,
      vocabCount,
      targetCategories,
    });
    remaining -= batchSize;
    batchIndex += 1;
  }

  return plan;
}

async function runDryRun() {
  const baseline = await loadLocalBaselineState();
  const { VERIFIED_FACT_RESERVOIR, selectAutonomousSixFacts } = await import('./scientificFactReservoir.mjs');

  if (baseline.seedFacts.length === 0) {
    throw new Error('Dry-run failed: no seed facts loaded from public/data/facts/*.json');
  }

  for (const card of baseline.seedFacts) {
    const vqWords = String(card.visualQuery || '').trim().split(/\s+/).filter(Boolean);
    if (vqWords.length < 2 || vqWords.length > 3) {
      throw new Error(`Dry-run failed: invalid visualQuery "${card.visualQuery}" on ${card.id}`);
    }
    if (!card.tr?.quiz || card.tr.quiz.options?.length !== 3 || !card.en?.quiz || card.en.quiz.options?.length !== 3) {
      throw new Error(`Dry-run failed: missing bilingual quiz on ${card.id}`);
    }
  }

  const reservoirSample = selectAutonomousSixFacts(new Set(), new Set(), []);
  if (reservoirSample.length !== CATEGORIES.length) {
    throw new Error(`Dry-run failed: expected ${CATEGORIES.length} reservoir sample categories, got ${reservoirSample.length}`);
  }

  const validatedSampleCards = [];
  const tempSlugs = new Set();
  const tempTitles = new Set();
  for (const candidate of reservoirSample) {
    const clean = await validateGeneratedFact(candidate, tempSlugs, tempTitles, { skipUrlFetch: true });
    if (!clean) {
      throw new Error(`Dry-run failed: reservoir item failed schema validation (${candidate.slug})`);
    }
    tempSlugs.add(clean.slug);
    tempTitles.add(clean.title_en.toLowerCase());
    validatedSampleCards.push(toFactCardSchema(clean));
  }

  const targetTotal = resolveTargetCardsPerRun();
  const plan = buildBatchPlan(targetTotal);
  const prompts = buildPrompts(baseline.existingTitlesEn, [], {
    factsCount: plan[0]?.factsCount || 8,
    vocabCount: plan[0]?.vocabCount || 2,
    targetCategories: plan[0]?.targetCategories || CATEGORIES,
    existingVocabWords: baseline.seedVocabWords,
  });
  if (!prompts.systemPrompt || !prompts.userPrompt) {
    throw new Error('Dry-run failed: empty prompt template');
  }

  const vocabTest = validateVocabularyCard(
    {
      word: 'ephemeral',
      phonetic: '/ɪˈfɛm.ər.əl/',
      partOfSpeech: 'sıfat',
      meaningTr: 'kısa ömürlü, geçici',
      definitionEn: 'Lasting for a very short period of time.',
      exampleEn: 'Cherry blossoms offer an ephemeral spectacle each spring.',
      exampleTr: 'Kiraz çiçekleri her bahar kısa ömürlü bir şölen sunar.',
      quizOptions: ['kısa ömürlü, geçici', 'sonsuz, kalıcı', 'ağır, dayanıklı'],
      correctIndex: 0,
    },
    new Set()
  );
  if (!vocabTest) {
    throw new Error('Dry-run failed: validateVocabularyCard rejected valid sample');
  }

  console.log(
    `[generateFacts] Dry-run OK: seedFacts=${baseline.seedFacts.length}, reservoirTotal=${VERIFIED_FACT_RESERVOIR.length}, validatedSample=${validatedSampleCards.length}, vocabWordsTracked=${baseline.seedVocabWords.size}, targetTotal=${targetTotal}, batches=${plan.length}`
  );
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    await runDryRun();
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '[generateFacts] Fatal: DATABASE_URL is required in Postgres-first mode (pass --dry-run for offline schema verification).'
    );
    process.exit(1);
  }

  const writeLocalJson = process.argv.includes('--local-json');
  const targetTotal = resolveTargetCardsPerRun();
  const batchPlan = buildBatchPlan(targetTotal);

  const baseline = await loadLocalBaselineState();
  const { existingSlugs, existingIds, existingTitlesEn, seedVocabWords } = baseline;
  const seedSlugs = new Set(existingSlugs);
  const seedIds = new Set(existingIds);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
  });

  try {
    await ensureSchemaAndSeed(pool);

    const existingRes = await pool.query('SELECT slug, title_en FROM facts');
    for (const r of existingRes.rows) {
      if (r.slug) existingSlugs.add(String(r.slug));
      const t = String(r.title_en || '').trim().toLowerCase();
      if (t) existingTitlesEn.add(t);
    }

    const existingVocabRes = await pool.query('SELECT word FROM vocabulary_cards');
    for (const r of existingVocabRes.rows) {
      if (r.word) seedVocabWords.add(String(r.word).trim().toLowerCase());
    }

    const topRes = await pool.query(`
      SELECT slug, category, title_en, likes_count, detail_opens, guess_attempts, avg_accuracy, avg_dwell_sec, shares_count
      FROM fact_engagement_summary
      ORDER BY likes_count DESC, avg_dwell_sec DESC, detail_opens DESC
      LIMIT 5
    `);
    const topEngaged = topRes.rows;

    console.log(
      `[generateFacts] Postgres connected: existingFacts=${existingSlugs.size}, existingVocab=${seedVocabWords.size}, targetCards=${targetTotal}, batches=${batchPlan.length}, localJson=${writeLocalJson}`
    );

    const insertedFactsSummary = [];
    const insertedVocabSummary = [];
    let totalGeneratedFacts = 0;
    let totalGeneratedVocab = 0;
    let lastModelUsed = DEFAULT_AI_MODEL_NAME;

    for (let i = 0; i < batchPlan.length; i += 1) {
      const batch = batchPlan[i];
      console.log(
        `[generateFacts] Batch ${batch.batchNumber}/${batchPlan.length}: requesting ${batch.factsCount} facts + ${batch.vocabCount} vocab across [${batch.targetCategories.join(', ')}]...`
      );

      let modelPayload;
      try {
        modelPayload = await fetchGeneratedFactsFromModel(existingTitlesEn, topEngaged, {
          factsCount: batch.factsCount,
          vocabCount: batch.vocabCount,
          targetCategories: batch.targetCategories,
          existingVocabWords: seedVocabWords,
        });
      } catch (batchErr) {
        console.warn(
          `[generateFacts] Batch ${batch.batchNumber}/${batchPlan.length} generation failed:`,
          batchErr instanceof Error ? batchErr.message : String(batchErr)
        );
        if (insertedFactsSummary.length + insertedVocabSummary.length === 0 && i === batchPlan.length - 1) {
          throw batchErr;
        }
        if (i < batchPlan.length - 1) {
          await sleep(2000);
        }
        continue;
      }

      lastModelUsed = modelPayload.model;
      const rawGenerated = modelPayload.facts;
      totalGeneratedFacts += rawGenerated.length;
      totalGeneratedVocab += modelPayload.vocabulary.length;

      const validCandidates = [];
      const tempSlugs = new Set(existingSlugs);
      const tempTitles = new Set(existingTitlesEn);

      for (const candidate of rawGenerated) {
        const clean = await validateGeneratedFact(candidate, tempSlugs, tempTitles);
        if (!clean) {
          console.warn('[generateFacts] Skipped invalid or duplicate candidate:', candidate?.title_en || candidate?.slug);
          continue;
        }
        tempSlugs.add(clean.slug);
        tempTitles.add(clean.title_en.toLowerCase());
        validCandidates.push(clean);
      }

      const validVocab = [];
      for (const candidate of modelPayload.vocabulary) {
        const cleanVocab = validateVocabularyCard(candidate, seedVocabWords);
        if (!cleanVocab) {
          console.warn('[generateFacts] Skipped invalid/duplicate vocabulary candidate:', candidate?.word);
          continue;
        }
        seedVocabWords.add(cleanVocab.word.toLowerCase());
        validVocab.push(cleanVocab);
      }

      // Immediate Postgres persistence for this batch so subsequent batches dedup accurately
      for (const clean of validCandidates.slice(0, batch.factsCount)) {
        const gifResolved = await resolveServerGifForFact({
          visualQuery: clean.visual_query || '',
          titleEn: clean.title_en || '',
          category: clean.category || 'science',
          existingGifUrl: clean.gif_url || '',
        });
        clean.gif_url = gifResolved.gifUrl;
        clean.gif_query = gifResolved.gifQuery;

        const insertRes = await pool.query(
          `INSERT INTO facts (
            slug, category, title_tr, title_en, summary_tr, summary_en,
            detail_tr, detail_en, question_tr, question_en,
            unit_tr, unit_en, min_val, max_val, answer_val,
            sketch_type, visual_query, gif_url, gif_query, quiz_tr, quiz_en,
            source_name, source_url, likes_count
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20::jsonb, $21::jsonb,
            $22, $23, 0
          )
          ON CONFLICT (slug) DO NOTHING
          RETURNING id, slug, category`,
          [
            clean.slug,
            clean.category,
            clean.title_tr,
            clean.title_en,
            clean.summary_tr,
            clean.summary_en,
            clean.detail_tr,
            clean.detail_en,
            clean.question_tr,
            clean.question_en,
            clean.unit_tr,
            clean.unit_en,
            clean.min_val,
            clean.max_val,
            clean.answer_val,
            clean.sketch_type,
            clean.visual_query || null,
            clean.gif_url || null,
            clean.gif_query || null,
            clean.quiz_tr ? JSON.stringify(clean.quiz_tr) : null,
            clean.quiz_en ? JSON.stringify(clean.quiz_en) : null,
            clean.source_name,
            clean.source_url,
          ]
        );

        existingSlugs.add(clean.slug);
        existingTitlesEn.add(clean.title_en.toLowerCase());
        if (insertRes.rows[0]) {
          insertedFactsSummary.push({
            id: insertRes.rows[0].id,
            category: clean.category,
            slug: clean.slug,
            title_tr: clean.title_tr,
            sketch: clean.sketch_type,
            gifResolved: Boolean(clean.gif_url),
            source: clean.source_name,
          });
        }
      }

      for (const vocab of validVocab.slice(0, batch.vocabCount)) {
        const insertVocabRes = await pool.query(
          `INSERT INTO vocabulary_cards (
            id, word, phonetic, part_of_speech, meaning_tr,
            definition_en, example_en, example_tr, quiz_options, correct_index
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9::jsonb, $10
          )
          ON CONFLICT (word) DO NOTHING
          RETURNING id, word`,
          [
            vocab.id,
            vocab.word,
            vocab.phonetic,
            vocab.partOfSpeech,
            vocab.meaningTr,
            vocab.definitionEn,
            vocab.exampleEn,
            vocab.exampleTr,
            JSON.stringify(vocab.quizOptions),
            vocab.correctIndex,
          ]
        );

        seedVocabWords.add(vocab.word.toLowerCase());
        if (insertVocabRes.rows[0]) {
          insertedVocabSummary.push({
            id: insertVocabRes.rows[0].id,
            word: vocab.word,
            pos: vocab.partOfSpeech,
            meaningTr: vocab.meaningTr,
          });
        }
      }

      if (writeLocalJson) {
        await appendGeneratedFacts(validCandidates.slice(0, batch.factsCount), seedSlugs, seedIds);
        await appendGeneratedVocabulary(validVocab.slice(0, batch.vocabCount));
      }

      console.log(
        `[generateFacts] Batch ${batch.batchNumber}/${batchPlan.length} committed to Postgres: factsInsertedTotal=${insertedFactsSummary.length}, vocabInsertedTotal=${insertedVocabSummary.length}`
      );

      if (i < batchPlan.length - 1) {
        await sleep(2000);
      }
    }

    if (insertedFactsSummary.length + insertedVocabSummary.length === 0) {
      throw new Error('Zero verified facts or vocabulary cards were inserted into Postgres.');
    }

    let backfillStats = { attempted: 0, updated: 0, queryUpdated: 0, skippedReason: null };
    try {
      backfillStats = await backfillMissingFactGifs(pool, { maxPerRun: 30 });
    } catch (backfillErr) {
      console.warn(
        '[generateFacts] GIF backfill pass skipped due to error:',
        backfillErr instanceof Error ? backfillErr.message : String(backfillErr)
      );
    }

    const quotaAfterRun = getHourlyGifQuotaStatus();

    console.log(`\n=== Scrolly ${lastModelUsed} Postgres Batch Generation Summary ===`);
    console.log(
      `Facts generated: ${totalGeneratedFacts} | Inserted into Postgres: ${insertedFactsSummary.length} | Vocab generated: ${totalGeneratedVocab} | Inserted into Postgres: ${insertedVocabSummary.length} | GIF backfill updated=${backfillStats.updated}/${backfillStats.attempted} (queries=${backfillStats.queryUpdated}, skipped=${backfillStats.skippedReason || 'none'}) | Hourly GIF quota used=${quotaAfterRun.used}/${quotaAfterRun.limit}`
    );
    if (insertedFactsSummary.length > 0) {
      console.table(insertedFactsSummary.slice(0, 20));
    }
    if (insertedVocabSummary.length > 0) {
      console.table(insertedVocabSummary.slice(0, 10));
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

export {
  appendGeneratedFacts,
  backfillMissingFactGifs,
  buildBatchPlan,
  buildGifSearchQuery,
  canConsumeGifQuota,
  consumeGifQuota,
  extractJsonCandidate,
  fetchGeneratedFactsFromModel,
  fetchGifCandidate,
  getHourlyGifQuotaStatus,
  lockGifQuotaForWindow,
  pickGiphyCandidateUrl,
  pickTenorCandidateUrl,
  resetGifQuotaForTest,
  resolveServerGifForFact,
  resolveTargetCardsPerRun,
  selectTopicRelevantCleanGif,
  toFactCardSchema,
  validateGeneratedFact,
  validateVocabularyCard,
};

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  main().catch((err) => {
    console.error('[generateFacts] Fatal error:', err);
    process.exit(1);
  });
}
