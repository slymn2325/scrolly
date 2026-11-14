import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CATEGORIES = ['space', 'nature', 'human_body', 'history', 'science', 'records'];
const SKETCH_ID_PATTERN = /^(space|nature|human|history|science|weird)-(0[1-9]|10)$/;
const SKETCH_TYPES = [
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

const AI_MODELS_ENDPOINT =
  process.env.AI_MODELS_ENDPOINT ||
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gemini-4-hydrogen';

async function loadSeedFactsFromDisk() {
  const shardFiles = ['space.json', 'nature.json', 'human_body.json', 'history.json', 'science.json', 'records.json'];
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
    process.env.OPENAI_API_KEY || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || ''
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

async function validateGeneratedFact(item, existingSlugs, existingTitlesEn) {
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

  const sourceCheck = await verifyPrimarySourceUrl(sourceUrl);
  if (!sourceCheck.ok) {
    console.warn(
      `[generateFacts] Rejected candidate "${titleEn}" due to unverified primary source URL (${sourceCheck.reason}): ${sourceUrl}`
    );
    return null;
  }

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
    source_name: sourceName,
    source_url: sourceUrl,
  };
}

function buildPrompts(existingTitlesEn, topEngaged) {
  const recentTitlesSample = Array.from(existingTitlesEn).slice(0, 90);
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

  const userPrompt = `Create exactly 5 brand-new bilingual (TR & EN) micro-fact cards spanning science/culture categories (choose 5 distinct categories from: ${CATEGORIES.join(', ')}).

Top-performing cards based on real user engagement (use their pacing/wonder style as inspiration, but choose fresh topics — zero clichés from the ban list):
${engagementContext}

Forbidden existing topics (DO NOT duplicate or paraphrase these titles):
${recentTitlesSample.join(' | ')}

Available visual sketch themes for \`sketch_type\` (you MUST pick one exact value from this list):
${SKETCH_TYPES.join(', ')}

Return a JSON object with a single key \`"facts"\` containing an array of 5 items, each with EXACTLY these keys:
- "slug": lowercase ASCII kebab-case slug derived from English title (e.g. "europas-subsurface-ocean")
- "category": one of "space" | "nature" | "human_body" | "history" | "science" | "records"
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
- "sketch_type": exact matching value from the \`sketch_type\` list above
- "source_name": authoritative institution or journal name
- "source_url": real, live deep https:// article/DOI verification URL (never a root domain homepage)

ALSO include a second key \`"vocabulary"\` with exactly 2 brand-new B1–C2 English vocabulary learning cards (no duplicates of common A1 words). Each vocabulary item MUST have:
- "word": English lemma (lowercase unless proper noun)
- "phonetic": real IPA in slashes (e.g. "/rɪˈzɪl.i.ənt/") — NEVER fake placeholders
- "partOfSpeech": one of "isim" | "sıfat" | "fiil" | "zarf" | "edat"
- "meaningTr": concise Turkish meaning
- "definitionEn": one clear English definition sentence
- "exampleEn": natural English example sentence that CONTAINS the word
- "exampleTr": Turkish translation of that example
- "quizOptions": array of exactly 3 Turkish meaning options
- "correctIndex": 0 | 1 | 2 matching the correct Turkish meaning in quizOptions`;

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

async function fetchGeneratedFactsFromModel(existingTitlesEn, topEngaged) {
  const token = getGenerationToken();

  if (!token) {
    console.error(
      '[generateFacts] Fatal: Missing OPENAI_API_KEY, AI_API_KEY, or GEMINI_API_KEY environment variable.'
    );
    process.exit(1);
  }

  const { systemPrompt, userPrompt } = buildPrompts(existingTitlesEn, topEngaged);

  let response;
  try {
    response = await fetch(AI_MODELS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_AI_MODEL_NAME,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch (err) {
    console.error(
      `[generateFacts] Fatal network failure calling ${AI_MODELS_ENDPOINT}:`,
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }

  const rawText = (await response.text()).trim();
  if (!response.ok || !rawText.startsWith('{')) {
    console.error(
      `[generateFacts] Fatal: AI endpoint (${AI_MODELS_ENDPOINT}, model=${DEFAULT_AI_MODEL_NAME}) returned HTTP ${response.status} non-JSON response: ${rawText.slice(0, 300)}`
    );
    process.exit(1);
  }

  let parsedPayload;
  try {
    const data = JSON.parse(rawText);
    const rawContent = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!rawContent) {
      throw new Error('Empty choices[0].message.content returned by AI endpoint.');
    }
    const cleanedContent = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsedPayload = JSON.parse(cleanedContent);
  } catch (err) {
    console.error(
      '[generateFacts] Fatal: Invalid JSON returned by AI endpoint:',
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }

  if (!Array.isArray(parsedPayload?.facts) || parsedPayload.facts.length === 0) {
    console.error('[generateFacts] Fatal: AI response JSON does not contain a non-empty "facts" array.');
    process.exit(1);
  }

  return {
    facts: parsedPayload.facts,
    vocabulary: Array.isArray(parsedPayload.vocabulary) ? parsedPayload.vocabulary : [],
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
  });

  try {
    await ensureSchemaAndSeed(pool);

    const existingRes = await pool.query('SELECT slug, title_en FROM facts');
    const existingSlugs = new Set(existingRes.rows.map((r) => String(r.slug)));
    const existingTitlesEn = new Set(
      existingRes.rows
        .map((r) => String(r.title_en || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const topRes = await pool.query(`
      SELECT slug, category, title_en, likes_count, detail_opens, guess_attempts, avg_accuracy, avg_dwell_sec, shares_count
      FROM fact_engagement_summary
      ORDER BY likes_count DESC, avg_dwell_sec DESC, detail_opens DESC
      LIMIT 5
    `);

    console.log(`[generateFacts] Loaded ${existingSlugs.size} existing facts and top ${topRes.rows.length} engagement benchmarks.`);

    const modelPayload = await fetchGeneratedFactsFromModel(
      existingTitlesEn,
      topRes.rows
    );
    const rawGenerated = modelPayload.facts;

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

    if (validCandidates.length === 0) {
      console.error('[generateFacts] Fatal: Zero valid verified facts survived validation from remote AI output.');
      process.exit(1);
    }

    // Seed + generated vocabulary words for de-duplication
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
    const vocabAdded = await appendGeneratedVocabulary(validVocab.slice(0, 2));

    const insertedSummary = [];

    for (const clean of validCandidates) {
      const insertRes = await pool.query(
        `INSERT INTO facts (
          slug, category, title_tr, title_en, summary_tr, summary_en,
          detail_tr, detail_en, question_tr, question_en,
          unit_tr, unit_en, min_val, max_val, answer_val,
          sketch_type, source_name, source_url, likes_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, 0
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
          clean.source_name,
          clean.source_url,
        ]
      );

      if (insertRes.rows[0]) {
        existingSlugs.add(clean.slug);
        existingTitlesEn.add(clean.title_en.toLowerCase());
        insertedSummary.push({
          id: insertRes.rows[0].id,
          category: clean.category,
          slug: clean.slug,
          title_tr: clean.title_tr,
          sketch: clean.sketch_type,
          source: clean.source_name,
        });
      }
    }

    console.log('\n=== Scrolly gemini-4-hydrogen Generation Summary ===');
    console.log(`Facts generated: ${rawGenerated.length} | Verified: ${validCandidates.length} | Inserted into Postgres: ${insertedSummary.length}`);
    console.log(`Vocabulary candidates: ${modelPayload.vocabulary.length} | Valid: ${validVocab.length} | Appended to data/vocabularyGenerated.json: ${vocabAdded}`);
    if (insertedSummary.length > 0) {
      console.table(insertedSummary);
    }
    if (validVocab.length > 0) {
      console.table(validVocab.map((v) => ({ word: v.word, pos: v.partOfSpeech, meaningTr: v.meaningTr })));
    }
  } finally {
    await pool.end();
  }
}

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
