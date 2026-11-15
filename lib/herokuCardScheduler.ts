import fs from 'node:fs/promises';
import path from 'node:path';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { ensureSchema, getPool, hasDatabaseUrl, loadSeedFactsFromDisk } from '@/lib/db';
import { hasConfiguredGifProviderKeys } from '@/lib/gifService';
import {
  backfillMissingFactGifsServer,
  buildSpecificGifQuery,
  getHourlyGifQuotaStatusServer,
  type BackfillGifResult,
} from '@/lib/serverGifMatcher';
import type { CategoryId } from '@/types/fact';

export const CARD_GENERATION_INTERVAL_HOURS = 12;
export const TARGET_CARDS_PER_HEROKU_RUN = 100;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;
const SCHEDULER_INTERVAL_MS = 15 * 60 * 1000;
const SCHEDULER_STARTUP_DELAY_MS = 8000;
const SCHEDULER_TICK_THROTTLE_MS = 60 * 1000;

const CATEGORIES: CategoryId[] = [
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
];

const SKETCH_ID_PATTERN = /^(space|nature|human|history|science|weird|statistics)-(0[1-9]|10)$/;
const SKETCH_TYPES = [
  'statistics', 'probability', 'venus', 'orbit', 'magnetar', 'titan', 'footprint', 'moon',
  'sun_mass', 'cold_weld', 'sagittarius', 'saturn', 'mars_sunset', 'mars', 'voyager',
  'black_hole', 'blackhole', 'olympus_mons', 'iss', 'station', 'icefish', 'mycelium',
  'wood_wide_web', 'shark', 'honeybee', 'bee', 'swift', 'koala', 'dolphin', 'otter',
  'fungus', 'cactus', 'immortal_jellyfish', 'tardigrade', 'whale', 'bones', 'skeleton',
  'brain', 'vessels', 'circulation', 'stomach', 'acid', 'cornea', 'dna', 'helix',
  'tongue', 'heart', 'heartbeat', 'pulse', 'stapes', 'eye', 'vision', 'sweat', 'liver',
  'cleopatra', 'oxford', 'war', 'hourglass', 'purple_snail', 'mammoth', 'pompeii',
  'steam_turbine', 'knocker_upper', 'pineapple', 'piri_reis', 'compass', 'gobeklitepe',
  'treaty', 'kadesh', 'viking', 'printing', 'triple_point', 'water', 'superfluid',
  'helium', 'time_dilation', 'sonoluminescence', 'cloud', 'sound_water', 'rainbow',
  'trees_stars', 'sun_photon', 'glass', 'lightning', 'plasma', 'atom', 'photon', 'prism',
  'entanglement', 'protein', 'titin', 'pitch', 'wombat', 'mailbox', 'stubbs', 'norway',
  'bromelain', 'duck', 'organ', 'cheese', 'antarctica', 'decibel', 'cards', 'chess',
];
const VALID_SKETCH_TYPES = new Set(SKETCH_TYPES);
const VALID_CATEGORIES = new Set<string>(CATEGORIES);
const VALID_VOCAB_POS = new Set(['isim', 'sıfat', 'fiil', 'zarf', 'edat']);
const GEMINI_FALLBACK_MODELS = ['gemini-4-hydrogen', 'gemini-2.5-flash', 'gemini-2.5-pro'];

const BANNED_CLICHE_PATTERNS = [
  /(teaspoon|tea\s*spoon).{0,40}neutron\s*star/i,
  /neutron\s*star.{0,40}(teaspoon|tea\s*spoon|billion\s*tons)/i,
  /bir\s*çay\s*kaşığı.{0,30}nötron\s*yıldız/i,
  /nötron\s*yıldız.{0,30}çay\s*kaşığı/i,
  /(rains?|raining)\s*diamonds?.{0,35}(neptune|uranus)/i,
  /(neptune|uranus).{0,35}diamonds?\s*rain/i,
  /(neptün|uranüs).{0,35}elmas\s*yağmur/i,
  /elmas\s*yağmur.{0,35}(neptün|uranüs)/i,
  /flamingos?.{0,35}born\s*(grey|gray|white)/i,
  /flamingolar?.{0,35}(gri|beyaz).{0,25}doğ/i,
  /octopus(?:es)?\s*(?:have|with)\s*(?:3|three)\s*hearts/i,
  /ahtapot(?:ların|lar)?\s*(?:3|üç)\s*kal[bp]/i,
  /honey.{0,35}(never\s*spoils|never\s*goes\s*bad|still\s*edible|egyptian\s*tombs?)/i,
  /(bal.{0,30}(asla\s*bozulmaz|bozulmayan|hala\s*yenebilir)|antik\s*mısır.{0,30}bal)/i,
  /eiffel\s*tower.{0,40}(grows?|taller|expand).{0,30}summer/i,
  /eyfel\s*kulesi.{0,40}(yaz.{0,20}uzar|uzar.{0,20}yaz|santimetre\s*uzar)/i,
  /(strawberr(?:y|ies).{0,30}berr(?:y|ies).{0,35}banana|banana.{0,30}is\s*a\s*berry|banana.{0,35}radioactive)/i,
  /(çilek.{0,30}meyve\s*değil.{0,35}muz|muz.{0,25}üzümsü|muz.{0,35}(radyoaktif|antimadde))/i,
  /sharks?.{0,35}older\s*than.{0,30}(trees|saturn)/i,
  /köpekbalık(?:ları|lar)?.{0,35}ağaçlardan.{0,25}yaşlı/i,
];

const BANNED_VISUAL_WORDS = new Set([
  'meme', 'memes', 'reaction', 'reactions', 'funny', 'anime', 'text',
  'quote', 'quotes', 'caption', 'lol', 'wtf', 'mrw', 'mfw', 'subtitles',
  'sticker', 'stickers',
]);

export interface SchedulerBatchPlanItem {
  batchNumber: number;
  batchSize: number;
  factsCount: number;
  vocabCount: number;
  targetCategories: CategoryId[];
}

export interface ValidatedQuiz {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
}

export interface ValidatedGeneratedFact {
  slug: string;
  category: CategoryId;
  title_tr: string;
  title_en: string;
  summary_tr: string;
  summary_en: string;
  detail_tr: string;
  detail_en: string;
  question_tr: string;
  question_en: string;
  unit_tr: string;
  unit_en: string;
  min_val: number;
  max_val: number;
  answer_val: number;
  sketch_type: string;
  visual_query: string;
  gif_query: string;
  quiz_tr: ValidatedQuiz | null;
  quiz_en: ValidatedQuiz | null;
  source_name: string;
  source_url: string;
}

export interface ValidatedVocabularyCard {
  id: string;
  category: 'vocabulary';
  word: string;
  phonetic: string;
  partOfSpeech: 'isim' | 'sıfat' | 'fiil' | 'zarf' | 'edat';
  meaningTr: string;
  definitionEn: string;
  exampleEn: string;
  exampleTr: string;
  quizOptions: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export interface CardGenerationJobResult {
  started: boolean;
  insertedFacts: number;
  insertedVocab: number;
  batchesCompleted: number;
  modelUsed?: string;
  skippedReason?: string;
  error?: string;
}

interface EngagementRow {
  category: string;
  title_en: string;
  likes_count: number;
  avg_dwell_sec: number;
  detail_opens: number;
}

declare global {
  var __scrollyHerokuSchedulerStarted: boolean | undefined;
  var __scrollySchedulerTickLastAt: number | undefined;
  var __scrollyCardGenerationInFlight: Promise<CardGenerationJobResult> | undefined;
  var __scrollySchedulerTickInFlight:
    | Promise<{ cardsTriggered: boolean; gifsTriggered: boolean }>
    | undefined;
}

function getGenerationToken(): string {
  return String(
    process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ''
  ).trim();
}

function sleep(ms: number): Promise<void> {
  if (!ms || ms <= 0 || process.env.SCROLLY_NO_RETRY_DELAY === '1') {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isBannedCliche(item: Record<string, unknown> | null | undefined): boolean {
  if (!item || typeof item !== 'object') return false;
  const tr = item.tr as Record<string, unknown> | undefined;
  const en = item.en as Record<string, unknown> | undefined;
  const fieldsToScan = [
    item.slug,
    item.title_tr,
    item.title_en,
    item.summary_tr,
    item.summary_en,
    item.detail_tr,
    item.detail_en,
    tr?.title,
    tr?.factText,
    tr?.deepDiveDetail,
    en?.title,
    en?.factText,
    en?.deepDiveDetail,
  ]
    .filter(Boolean)
    .map(String)
    .join(' ');

  return BANNED_CLICHE_PATTERNS.some((pattern) => pattern.test(fieldsToScan));
}

function normalizeSlug(rawSlug: unknown, titleEn: string): string {
  const base = String(rawSlug || titleEn || `fact-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `scrolly-fact-${Date.now()}`;
}

function isRootOrGenericUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return true;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    return (
      cleanPath === '' ||
      cleanPath === '/en' ||
      cleanPath === '/tr' ||
      cleanPath === '/index.html' ||
      cleanPath === '/index.php' ||
      cleanPath === '/home' ||
      cleanPath === '/home.html'
    );
  } catch {
    return true;
  }
}

async function verifyPrimarySourceUrl(urlStr: string): Promise<{ ok: boolean; reason?: string }> {
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
      return { ok: true };
    }
    return { ok: false, reason: `http-${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'network-error' };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeQuizObj(rawQuiz: unknown, fallbackExplanation: string): ValidatedQuiz | null {
  if (!rawQuiz || typeof rawQuiz !== 'object') return null;
  const q = rawQuiz as Record<string, unknown>;
  const question = typeof q.question === 'string' ? q.question.trim() : '';
  const correctIndex = Number(q.correctIndex);
  if (!question || !Array.isArray(q.options) || q.options.length !== 3) return null;
  if (correctIndex !== 0 && correctIndex !== 1 && correctIndex !== 2) return null;

  const options = q.options.map((o) => String(o || '').trim());
  const uniqueCount = new Set(options.map((o) => o.toLowerCase())).size;
  const allPureNumbers = options.every((o) => /^[\d.,%+\-\s]+$/.test(o));
  if (uniqueCount !== 3 || options.some((o) => !o) || allPureNumbers) {
    return null;
  }

  return {
    question,
    options: [options[0], options[1], options[2]],
    correctIndex: correctIndex as 0 | 1 | 2,
    explanation:
      typeof q.explanation === 'string' && q.explanation.trim()
        ? q.explanation.trim()
        : fallbackExplanation,
  };
}

function areDistinctSummaryAndDetail(shortSummary: string, fullDetail: string): boolean {
  const normSummary = shortSummary.trim().replace(/\s+/g, ' ').toLowerCase();
  const normDetail = fullDetail.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normSummary || !normDetail) return false;
  return normSummary !== normDetail;
}

export async function validateGeneratedFact(
  rawItem: unknown,
  existingSlugs: Set<string>,
  existingTitlesEn: Set<string>,
  options: { skipUrlFetch?: boolean } = {}
): Promise<ValidatedGeneratedFact | null> {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;

  const categoryRaw = String(item.category || '').trim().toLowerCase();
  if (!VALID_CATEGORIES.has(categoryRaw)) return null;
  const category = categoryRaw as CategoryId;

  const titleTr = String(item.title_tr || '').trim();
  const titleEn = String(item.title_en || '').trim();
  const summaryTr = String(item.summary_tr || item.shortSummary || '').trim();
  const summaryEn = String(item.summary_en || '').trim();
  const detailTr = String(item.detail_tr || item.fullDetail || '').trim();
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

  if (!areDistinctSummaryAndDetail(summaryTr, detailTr) || !areDistinctSummaryAndDetail(summaryEn, detailEn)) {
    return null;
  }

  if (existingTitlesEn.has(titleEn.toLowerCase())) {
    return null;
  }

  if (isBannedCliche(item)) {
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
    return null;
  }

  const sourceCheck = options.skipUrlFetch
    ? { ok: !isRootOrGenericUrl(sourceUrl) }
    : await verifyPrimarySourceUrl(sourceUrl);
  if (!sourceCheck.ok) {
    return null;
  }

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

  const gifQuery =
    buildSpecificGifQuery({
      slug,
      category,
      visualQuery,
      titleEn,
      summaryEn,
    }) || visualQuery;

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
    gif_query: gifQuery,
    quiz_tr: normalizeQuizObj(item.quiz_tr, detailTr),
    quiz_en: normalizeQuizObj(item.quiz_en, detailEn),
    source_name: sourceName,
    source_url: sourceUrl,
  };
}

export function validateVocabularyCard(
  raw: unknown,
  existingWords: Set<string>
): ValidatedVocabularyCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const word = String(item.word || '').trim();
  const phonetic = String(item.phonetic || '').trim();
  const partOfSpeechRaw = String(item.partOfSpeech || '').trim();
  const meaningTr = String(item.meaningTr || '').trim();
  const definitionEn = String(item.definitionEn || '').trim();
  const exampleEn = String(item.exampleEn || '').trim();
  const exampleTr = String(item.exampleTr || '').trim();
  const quizOptions = Array.isArray(item.quizOptions)
    ? item.quizOptions.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  const correctIndex = Number(item.correctIndex);

  if (!word || word.length < 3 || existingWords.has(word.toLowerCase())) return null;
  if (
    !phonetic.startsWith('/') ||
    !phonetic.endsWith('/') ||
    phonetic.includes('…') ||
    phonetic.includes('mart')
  ) {
    return null;
  }
  if (!VALID_VOCAB_POS.has(partOfSpeechRaw)) return null;
  if (!meaningTr || !definitionEn || !exampleEn || !exampleTr) return null;

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${escapedWord}\\b`, 'i').test(exampleEn)) {
    return null;
  }
  if (quizOptions.length !== 3 || new Set(quizOptions.map((o) => o.toLowerCase())).size !== 3) {
    return null;
  }
  if (correctIndex !== 0 && correctIndex !== 1 && correctIndex !== 2) return null;

  const slugWord = word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return {
    id: `vocab-gen-${slugWord}-${Date.now().toString(36)}`,
    category: 'vocabulary',
    word,
    phonetic,
    partOfSpeech: partOfSpeechRaw as ValidatedVocabularyCard['partOfSpeech'],
    meaningTr,
    definitionEn,
    exampleEn,
    exampleTr,
    quizOptions: [quizOptions[0], quizOptions[1], quizOptions[2]],
    correctIndex: correctIndex as 0 | 1 | 2,
  };
}

export function buildSchedulerBatchPlan(
  targetTotal = TARGET_CARDS_PER_HEROKU_RUN
): SchedulerBatchPlanItem[] {
  const plan: SchedulerBatchPlanItem[] = [];
  let remaining = Math.min(TARGET_CARDS_PER_HEROKU_RUN, Math.max(1, Math.floor(targetTotal)));
  let batchIndex = 0;

  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    const vocabCount = batchSize >= 2 ? Math.max(1, Math.round(batchSize * 0.2)) : 0;
    const factsCount = batchSize - vocabCount;
    const startOffset = (batchIndex * 3) % CATEGORIES.length;
    const targetCategories: CategoryId[] = [];
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

function buildCardGenerationPrompts(
  existingTitlesEn: Set<string>,
  topEngaged: EngagementRow[],
  options: {
    factsCount: number;
    vocabCount: number;
    targetCategories: CategoryId[];
    existingVocabWords: Set<string>;
  }
): { systemPrompt: string; userPrompt: string } {
  const recentTitlesSample = Array.from(existingTitlesEn).slice(-120);
  const existingVocabSample = Array.from(options.existingVocabWords).slice(-120);
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
Also keep shortSummary (summary_tr/summary_en) crisp and DISTINCT from deep dive fullDetail (detail_tr/detail_en).

STRICT ANTI-CLICHÉ BAN LIST — NEVER generate or paraphrase these overused internet trivia tropes:
1. A teaspoon of neutron star weighing billions of tons
2. Diamond rain on Neptune or Uranus
3. Flamingos being born grey/white
4. Octopuses having 3 hearts
5. Honey never spoiling / 3,000-year-old edible honey from Egyptian tombs
6. The Eiffel Tower growing taller in summer due to thermal expansion
7. Bananas being botanical berries / strawberries not being berries / bananas being radioactive
8. Sharks being older than trees or Saturn's rings`;

  const vocabBlock =
    options.vocabCount > 0
      ? `\n\nALSO include a second key "vocabulary" with exactly ${options.vocabCount} brand-new B1-C2 English vocabulary learning card${options.vocabCount === 1 ? '' : 's'} (no duplicates of these existing words: ${existingVocabSample.join(', ') || 'none'}). Each vocabulary item MUST have:
- "word": English lemma (lowercase unless proper noun)
- "phonetic": real IPA in slashes (e.g. "/rɪˈzɪl.i.ənt/")
- "partOfSpeech": one of "isim" | "sıfat" | "fiil" | "zarf" | "edat"
- "meaningTr": concise Turkish meaning
- "definitionEn": one clear English definition sentence
- "exampleEn": natural English example sentence that CONTAINS the word
- "exampleTr": Turkish translation of that example
- "quizOptions": array of exactly 3 distinct Turkish meaning options
- "correctIndex": 0 | 1 | 2 matching the correct Turkish meaning in quizOptions`
      : '\n\nInclude "vocabulary": [] (0 vocabulary items in this batch).';

  const userPrompt = `Create exactly ${options.factsCount} brand-new bilingual (TR & EN) micro-fact card${options.factsCount === 1 ? '' : 's'} distributed across categories (${options.targetCategories.join(', ')} — cover every listed category before repeating any).

Top-performing cards based on real user engagement:
${engagementContext}

Forbidden existing topics (DO NOT duplicate or paraphrase these titles):
${recentTitlesSample.join(' | ')}

Available visual sketch themes for "sketch_type" (pick one exact value from this list):
${SKETCH_TYPES.join(', ')}

Return a JSON object with a key "facts" containing an array of exactly ${options.factsCount} items, each with EXACTLY these keys:
- "slug": lowercase ASCII kebab-case slug
- "category": one of "space" | "nature" | "human_body" | "history" | "science" | "records" | "statistics"
- "visual_query": strictly 2-3 concrete English words for GIF lookup (never meme/reaction/funny/anime/text/quote)
- "title_tr": punchy Turkish headline (max 90 chars)
- "title_en": punchy English headline (max 90 chars)
- "summary_tr": 1-2 engaging Turkish sentences (max 220 chars, distinct from detail_tr)
- "summary_en": 1-2 engaging English sentences (max 220 chars, distinct from detail_en)
- "detail_tr": deeper Turkish scientific/historical mechanism (2-3 sentences, max 420 chars)
- "detail_en": deeper English scientific/historical mechanism (2-3 sentences, max 420 chars)
- "question_tr": numerical estimation prompt in Turkish ending in "?"
- "question_en": numerical estimation prompt in English ending in "?"
- "unit_tr": short Turkish unit string
- "unit_en": short English unit string
- "min_val": realistic minimum slider number < max_val
- "max_val": realistic maximum slider number > min_val
- "answer_val": exact verified numerical answer between min_val and max_val
- "quiz_tr": { "question": conceptual WHY/HOW question in Turkish, "options": [3 short distinct conceptual strings, never plain numbers], "correctIndex": 0|1|2, "explanation": "concise TR scientific takeaway" }
- "quiz_en": { "question": conceptual WHY/HOW question in English, "options": [3 short distinct conceptual strings, never plain numbers], "correctIndex": 0|1|2, "explanation": "concise EN scientific takeaway" }
- "sketch_type": exact value from the sketch_type list above
- "source_name": authoritative institution or journal name
- "source_url": real deep https:// verification URL (never a root domain homepage)${vocabBlock}`;

  return { systemPrompt, userPrompt };
}

function extractJsonCandidate(rawText: string): Record<string, unknown> | null {
  const input = String(rawText || '').trim();
  if (!input) return null;
  const stripped = input.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    // scan embedded JSON braces
  }
  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(input.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function safeParseJsonRecord(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function requestNativeGemini(params: {
  modelName: string;
  token: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    params.modelName
  )}:generateContent?key=${encodeURIComponent(params.token)}`;

  const buildBody = (includeThinkingLevel: boolean) => {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.7,
      maxOutputTokens: 32768,
      responseMimeType: 'application/json',
    };
    if (includeThinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
    }
    return {
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
      generationConfig,
    };
  };

  let response = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify(buildBody(true)),
  });
  let rawText = (await response.text()).trim();

  if (response.status === 400 && /thinkingLevel|thinking_config|thinkingConfig/i.test(rawText)) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify(buildBody(false)),
    });
    rawText = (await response.text()).trim();
  }

  const data = safeParseJsonRecord(rawText);

  const candidates = Array.isArray(data?.candidates)
    ? (data.candidates as Array<Record<string, unknown>>)
    : [];
  const parts = Array.isArray((candidates[0]?.content as Record<string, unknown> | undefined)?.parts)
    ? ((candidates[0].content as Record<string, unknown>).parts as Array<Record<string, unknown>>)
    : [];
  const contentText = parts
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => String(p.text))
    .join('\n')
    .trim();

  return {
    ok: response.ok,
    status: response.status,
    rawText,
    parsedPayload: extractJsonCandidate(contentText),
  };
}

async function requestOpenAICompat(params: {
  endpoint: string;
  modelName: string;
  token: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: params.modelName,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 32768,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  });
  const rawText = (await response.text()).trim();
  const data = safeParseJsonRecord(rawText);
  const choices = Array.isArray(data?.choices)
    ? (data.choices as Array<Record<string, unknown>>)
    : [];
  const msg = (choices[0]?.message as Record<string, unknown> | undefined) || {};
  const contentText = String(msg.content || msg.reasoning_content || '').trim();
  return {
    ok: response.ok,
    status: response.status,
    rawText,
    parsedPayload: contentText ? extractJsonCandidate(contentText) : null,
  };
}

async function fetchGeneratedBatchFromModel(
  existingTitlesEn: Set<string>,
  topEngaged: EngagementRow[],
  options: {
    factsCount: number;
    vocabCount: number;
    targetCategories: CategoryId[];
    existingVocabWords: Set<string>;
  }
): Promise<{ model: string; facts: unknown[]; vocabulary: unknown[] }> {
  const token = getGenerationToken();
  if (!token) {
    throw new Error('Missing GEMINI_API_KEY / AI_API_KEY / OPENAI_API_KEY');
  }

  const { systemPrompt, userPrompt } = buildCardGenerationPrompts(existingTitlesEn, topEngaged, options);
  const customEndpoint = String(process.env.AI_MODELS_ENDPOINT || '').trim();
  const preferredModel = String(process.env.AI_MODEL_NAME || 'gemini-4-hydrogen').trim() || 'gemini-4-hydrogen';
  const modelCandidates = Array.from(
    new Set([preferredModel, ...GEMINI_FALLBACK_MODELS].filter(Boolean))
  );

  let lastFailure = 'unknown failure';
  for (const modelName of modelCandidates) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = customEndpoint
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
        const factsArr = Array.isArray(res.parsedPayload?.facts)
          ? res.parsedPayload.facts
          : [];
        const vocabArr = Array.isArray(res.parsedPayload?.vocabulary)
          ? res.parsedPayload.vocabulary
          : [];
        if (res.ok && factsArr.length > 0) {
          if (factsArr.length < options.factsCount && attempt < 3) {
            await sleep(1000 * 2 ** (attempt - 1));
            continue;
          }
          return {
            model: modelName,
            facts: factsArr.slice(0, options.factsCount),
            vocabulary: options.vocabCount > 0 ? vocabArr.slice(0, options.vocabCount) : [],
          };
        }
        lastFailure = `model=${modelName} status=${res.status} snippet=${res.rawText.slice(0, 140)}`;
      } catch (err) {
        lastFailure = err instanceof Error ? err.message : String(err);
      }
      if (attempt < 3) {
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }
  }
  throw new Error(`Model generation failed: ${lastFailure}`);
}

async function acquirePostgresCardGenerationLock(force: boolean): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<{ id: number }>(
    `UPDATE scheduler_state
     SET is_generating_cards = TRUE,
         card_lock_started_at = NOW(),
         updated_at = NOW()
     WHERE id = 1
       AND (
         is_generating_cards = FALSE
         OR card_lock_started_at IS NULL
         OR card_lock_started_at <= NOW() - INTERVAL '30 minutes'
       )
       AND (
         $1::boolean = TRUE
         OR last_card_generation_at IS NULL
         OR last_card_generation_at <= NOW() - INTERVAL '12 hours'
       )
     RETURNING id`,
    [force]
  );
  return (res.rowCount ?? 0) > 0;
}

async function releasePostgresCardGenerationLock(markCompletedRun: boolean): Promise<void> {
  if (!hasDatabaseUrl()) return;
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE scheduler_state
       SET is_generating_cards = FALSE,
           card_lock_started_at = NULL,
           last_card_generation_at = CASE
             WHEN $1::boolean = TRUE THEN NOW()
             ELSE last_card_generation_at
           END,
           updated_at = NOW()
       WHERE id = 1`,
      [markCompletedRun]
    );
  } catch (err) {
    console.warn('[herokuCardScheduler] Failed releasing Postgres card generation lock:', err);
  }
}

async function loadDedupBaselinesFromDbAndSeed() {
  const pool = getPool();
  const seedFacts = loadSeedFactsFromDisk();
  const existingSlugs = new Set<string>();
  const existingTitlesEn = new Set<string>();
  const existingVocabWords = new Set<string>();

  for (const f of seedFacts) {
    for (const s of [f.slug, f.tr?.slug, f.en?.slug]) {
      if (s) existingSlugs.add(String(s));
    }
    if (f.en?.title) existingTitlesEn.add(f.en.title.trim().toLowerCase());
  }
  for (const v of getVocabularyFacts()) {
    if (v.word) existingVocabWords.add(v.word.trim().toLowerCase());
  }
  try {
    const vocabGenRaw = await fs.readFile(
      path.join(process.cwd(), 'data', 'vocabularyGenerated.json'),
      'utf8'
    );
    const parsed = JSON.parse(vocabGenRaw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item?.word) existingVocabWords.add(String(item.word).trim().toLowerCase());
      }
    }
  } catch {
    // optional file
  }

  const [dbFacts, dbVocab, topEngaged] = await Promise.all([
    pool.query<{ slug: string; title_en: string | null }>('SELECT slug, title_en FROM facts'),
    pool.query<{ word: string }>('SELECT word FROM vocabulary_cards'),
    pool
      .query<EngagementRow>(
        `SELECT category, title_en, likes_count, avg_dwell_sec, detail_opens
         FROM fact_engagement_summary
         ORDER BY likes_count DESC, avg_dwell_sec DESC, detail_opens DESC
         LIMIT 5`
      )
      .then((r) => r.rows)
      .catch(() => [] as EngagementRow[]),
  ]);

  for (const r of dbFacts.rows) {
    if (r.slug) existingSlugs.add(String(r.slug));
    if (r.title_en) existingTitlesEn.add(String(r.title_en).trim().toLowerCase());
  }
  for (const r of dbVocab.rows) {
    if (r.word) existingVocabWords.add(String(r.word).trim().toLowerCase());
  }

  return { existingSlugs, existingTitlesEn, existingVocabWords, topEngaged };
}

/**
 * Generates up to 100 bilingual cards (10 batches x 8 facts + 2 vocab) and commits
 * each batch immediately to Postgres under a 30-minute auto-expiring `scheduler_state` lock.
 */
export async function runCardGenerationJob(options?: {
  force?: boolean;
  targetTotal?: number;
}): Promise<CardGenerationJobResult> {
  if (!hasDatabaseUrl()) {
    return {
      started: false,
      insertedFacts: 0,
      insertedVocab: 0,
      batchesCompleted: 0,
      skippedReason: 'no_database',
    };
  }
  if (!getGenerationToken()) {
    return {
      started: false,
      insertedFacts: 0,
      insertedVocab: 0,
      batchesCompleted: 0,
      skippedReason: 'no_api_key',
    };
  }
  if (globalThis.__scrollyCardGenerationInFlight) {
    return globalThis.__scrollyCardGenerationInFlight;
  }

  const job = (async (): Promise<CardGenerationJobResult> => {
    const acquired = await acquirePostgresCardGenerationLock(Boolean(options?.force));
    if (!acquired) {
      return {
        started: false,
        insertedFacts: 0,
        insertedVocab: 0,
        batchesCompleted: 0,
        skippedReason: 'not_due_or_locked',
      };
    }

    let insertedFacts = 0;
    let insertedVocab = 0;
    let batchesCompleted = 0;
    let lastModelUsed: string | undefined;

    try {
      const pool = getPool();
      const { existingSlugs, existingTitlesEn, existingVocabWords, topEngaged } =
        await loadDedupBaselinesFromDbAndSeed();
      const batchPlan = buildSchedulerBatchPlan(
        options?.targetTotal ?? TARGET_CARDS_PER_HEROKU_RUN
      );

      for (let i = 0; i < batchPlan.length; i += 1) {
        const batch = batchPlan[i];
        try {
          const payload = await fetchGeneratedBatchFromModel(existingTitlesEn, topEngaged, {
            factsCount: batch.factsCount,
            vocabCount: batch.vocabCount,
            targetCategories: batch.targetCategories,
            existingVocabWords,
          });
          lastModelUsed = payload.model;

          const tempSlugs = new Set(existingSlugs);
          const tempTitles = new Set(existingTitlesEn);
          const validFacts: ValidatedGeneratedFact[] = [];

          for (const candidate of payload.facts) {
            const clean = await validateGeneratedFact(candidate, tempSlugs, tempTitles);
            if (!clean) continue;
            tempSlugs.add(clean.slug);
            tempTitles.add(clean.title_en.toLowerCase());
            validFacts.push(clean);
          }

          const validVocab: ValidatedVocabularyCard[] = [];
          for (const candidate of payload.vocabulary) {
            const cleanVocab = validateVocabularyCard(candidate, existingVocabWords);
            if (!cleanVocab) continue;
            existingVocabWords.add(cleanVocab.word.toLowerCase());
            validVocab.push(cleanVocab);
          }

          for (const clean of validFacts.slice(0, batch.factsCount)) {
            const res = await pool.query<{ id: number }>(
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
                $16, $17, NULL, $18, $19::jsonb, $20::jsonb,
                $21, $22, 0
              )
              ON CONFLICT (slug) DO NOTHING
              RETURNING id`,
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
                clean.visual_query,
                clean.gif_query,
                clean.quiz_tr ? JSON.stringify(clean.quiz_tr) : null,
                clean.quiz_en ? JSON.stringify(clean.quiz_en) : null,
                clean.source_name,
                clean.source_url,
              ]
            );
            existingSlugs.add(clean.slug);
            existingTitlesEn.add(clean.title_en.toLowerCase());
            if ((res.rowCount ?? 0) > 0) insertedFacts += 1;
          }

          for (const vocab of validVocab.slice(0, batch.vocabCount)) {
            const res = await pool.query<{ id: string }>(
              `INSERT INTO vocabulary_cards (
                id, word, phonetic, part_of_speech, meaning_tr,
                definition_en, example_en, example_tr, quiz_options, correct_index
              ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9::jsonb, $10
              )
              ON CONFLICT (word) DO NOTHING
              RETURNING id`,
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
            existingVocabWords.add(vocab.word.toLowerCase());
            if ((res.rowCount ?? 0) > 0) insertedVocab += 1;
          }

          batchesCompleted += 1;
        } catch (batchErr) {
          console.warn(
            `[herokuCardScheduler] Batch ${batch.batchNumber}/${batchPlan.length} failed:`,
            batchErr instanceof Error ? batchErr.message : String(batchErr)
          );
        }

        if (i < batchPlan.length - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      if (insertedFacts > 0 && hasConfiguredGifProviderKeys()) {
        triggerGifQueueJob({ force: false });
      }

      return {
        started: true,
        insertedFacts,
        insertedVocab,
        batchesCompleted,
        ...(lastModelUsed ? { modelUsed: lastModelUsed } : {}),
      };
    } catch (err) {
      return {
        started: true,
        insertedFacts,
        insertedVocab,
        batchesCompleted,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      await releasePostgresCardGenerationLock(insertedFacts + insertedVocab > 0);
    }
  })().finally(() => {
    globalThis.__scrollyCardGenerationInFlight = undefined;
  });

  globalThis.__scrollyCardGenerationInFlight = job;
  return job;
}

export async function runGifQueueJob(options?: {
  force?: boolean;
  maxPerRun?: number;
}): Promise<BackfillGifResult> {
  return backfillMissingFactGifsServer({
    ...(typeof options?.maxPerRun === 'number' ? { maxPerRun: options.maxPerRun } : {}),
    ...(options?.force !== undefined ? { force: options.force } : {}),
  });
}

export function triggerCardGenerationJob(options?: { force?: boolean }): boolean {
  if (!hasDatabaseUrl() || !getGenerationToken()) {
    return false;
  }
  if (globalThis.__scrollyCardGenerationInFlight) {
    return false;
  }
  queueMicrotask(() => {
    void runCardGenerationJob(options).catch((err) => {
      console.warn('[herokuCardScheduler] Card generation background job error:', err);
    });
  });
  return true;
}

export function triggerGifQueueJob(options?: { force?: boolean; maxPerRun?: number }): boolean {
  if (!hasDatabaseUrl() || !hasConfiguredGifProviderKeys()) {
    return false;
  }
  if (globalThis.__scrollyGifBackfillInFlight) {
    return false;
  }
  queueMicrotask(() => {
    void runGifQueueJob(options).catch((err) => {
      console.warn('[herokuCardScheduler] GIF queue background job error:', err);
    });
  });
  return true;
}

/**
 * Checks whether 12-hour card generation or the 90/hr GIF queue needs background work
 * and launches each non-blockingly under Postgres lock guards.
 */
export async function runSchedulerTick(): Promise<{
  cardsTriggered: boolean;
  gifsTriggered: boolean;
}> {
  if (!hasDatabaseUrl()) {
    return { cardsTriggered: false, gifsTriggered: false };
  }
  if (globalThis.__scrollySchedulerTickInFlight) {
    return globalThis.__scrollySchedulerTickInFlight;
  }

  const tick = (async () => {
    let cardsTriggered = false;
    let gifsTriggered = false;

    try {
      await ensureSchema();
      const pool = getPool();
      const [schedRes, missingGifRes, quotaStatus] = await Promise.all([
        pool.query<{
          cards_due: boolean;
          card_lock_active: boolean;
          gif_lock_active: boolean;
        }>(
          `SELECT
             (last_card_generation_at IS NULL OR last_card_generation_at <= NOW() - INTERVAL '12 hours') AS cards_due,
             (is_generating_cards = TRUE AND (card_lock_started_at IS NULL OR card_lock_started_at > NOW() - INTERVAL '30 minutes')) AS card_lock_active,
             (is_matching_gifs = TRUE AND (gif_lock_started_at IS NULL OR gif_lock_started_at > NOW() - INTERVAL '10 minutes')) AS gif_lock_active
           FROM scheduler_state
           WHERE id = 1`
        ),
        pool.query<{ has_missing: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM facts WHERE gif_url IS NULL OR TRIM(gif_url) = ''
           ) AS has_missing`
        ),
        getHourlyGifQuotaStatusServer(),
      ]);

      const state = schedRes.rows[0];
      if (state?.cards_due && !state.card_lock_active && getGenerationToken()) {
        cardsTriggered = triggerCardGenerationJob({ force: false });
      }

      if (
        missingGifRes.rows[0]?.has_missing &&
        !state?.gif_lock_active &&
        hasConfiguredGifProviderKeys() &&
        !quotaStatus.exhausted
      ) {
        gifsTriggered = triggerGifQueueJob({ force: false });
      }
    } catch (err) {
      console.warn('[herokuCardScheduler] Scheduler tick failed cleanly:', err);
    }

    return { cardsTriggered, gifsTriggered };
  })().finally(() => {
    globalThis.__scrollySchedulerTickInFlight = undefined;
  });

  globalThis.__scrollySchedulerTickInFlight = tick;
  return tick;
}

/**
 * Throttled (60s), zero-blocking entrypoint wired to `/api/facts` so user traffic
 * also nudges overdue 12h card runs or pending GIF queue items without slowing responses.
 */
export function triggerSchedulerTickNonBlocking(): boolean {
  if (!hasDatabaseUrl()) return false;
  if (!getGenerationToken() && !hasConfiguredGifProviderKeys()) return false;

  const now = Date.now();
  const lastAt = globalThis.__scrollySchedulerTickLastAt ?? 0;
  if (now - lastAt < SCHEDULER_TICK_THROTTLE_MS) {
    return false;
  }
  globalThis.__scrollySchedulerTickLastAt = now;

  queueMicrotask(() => {
    void runSchedulerTick().catch((err) => {
      console.warn('[herokuCardScheduler] Throttled tick ignored error:', err);
    });
  });

  return true;
}

/**
 * Starts the Heroku server singleton scheduler with `.unref()` timers so CLI tools
 * and production builds never hang waiting on intervals.
 */
export function startHerokuCardScheduler(): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }
  if (!hasDatabaseUrl()) {
    return;
  }
  if (globalThis.__scrollyHerokuSchedulerStarted) {
    return;
  }
  globalThis.__scrollyHerokuSchedulerStarted = true;

  const startupTimer = setTimeout(() => {
    void runSchedulerTick().catch((err) => {
      console.warn('[herokuCardScheduler] Startup tick failed:', err);
    });
  }, SCHEDULER_STARTUP_DELAY_MS);
  startupTimer.unref?.();

  const periodicTimer = setInterval(() => {
    void runSchedulerTick().catch((err) => {
      console.warn('[herokuCardScheduler] Periodic tick failed:', err);
    });
  }, SCHEDULER_INTERVAL_MS);
  periodicTimer.unref?.();
}
