import { randomInt } from 'node:crypto';
import type { Language } from '@/i18n/translations';
import {
  ensureSchema,
  fetchVocabularyWithSourceServer,
  getAllFactsServer,
  getPool,
  hasDatabaseUrl,
} from '@/lib/db';
import { normalizeDuelCategory } from '@/lib/duelStore';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import type {
  ChallengeLocalizedQuizSnapshot,
  ChallengeQuestionSnapshot,
  ChallengeRecord,
} from '@/types/challenge';
import type { CategoryId, FactCard } from '@/types/fact';
import type { VocabularyCard } from '@/types/vocabulary';
import { vocabCardToFactCard } from '@/utils/duelLobby';
import { getFactPrimarySlug } from '@/utils/factsData';
import type { QuizQuestionItem } from '@/utils/recommendation';
import { PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export type {
  ChallengeLocalizedQuizSnapshot,
  ChallengeQuestionSnapshot,
  ChallengeRecord,
};

const CHALLENGE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHALLENGE_CODE_REGEX = /^[A-Z0-9]{6,8}$/;
const VALID_FACT_CATEGORIES: ReadonlySet<CategoryId> = new Set<CategoryId>([
  'space',
  'nature',
  'human_body',
  'history',
  'science',
  'records',
  'statistics',
]);

declare global {
  var __scrollyMemoryChallenges: Map<string, ChallengeRecord> | undefined;
}

function getMemoryChallengesMap(): Map<string, ChallengeRecord> {
  if (!globalThis.__scrollyMemoryChallenges) {
    globalThis.__scrollyMemoryChallenges = new Map<string, ChallengeRecord>();
  }
  return globalThis.__scrollyMemoryChallenges;
}

export function normalizeChallengeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

export function isValidChallengeCode(raw: unknown): boolean {
  return CHALLENGE_CODE_REGEX.test(normalizeChallengeCode(raw));
}

export function generateChallengeCode(length = 7): string {
  const safeLen = Math.max(6, Math.min(8, Math.floor(length)));
  let code = '';
  for (let i = 0; i < safeLen; i += 1) {
    code += CHALLENGE_CODE_ALPHABET[randomInt(0, CHALLENGE_CODE_ALPHABET.length)];
  }
  return code;
}

export function challengePublicUrl(code: string, origin?: string): string {
  const safeCode = normalizeChallengeCode(code);
  const base =
    origin && /^https?:\/\//.test(origin)
      ? origin.replace(/\/$/, '')
      : PUBLIC_SITE_ORIGIN;
  return `${base}/challenge/${safeCode}`;
}

export function challengeOgTitle(challenge: {
  creatorNickname: string;
  creatorScore: number;
  lang: Language;
}): string {
  const creator =
    sanitizeDisplayText(challenge.creatorNickname, 28) ||
    (challenge.lang === 'en' ? 'Explorer' : 'Kâşif');
  const score = Math.max(0, Math.round(challenge.creatorScore));
  return challenge.lang === 'en'
    ? `${creator} scored ${score} XP — Can you beat it?`
    : `${creator} ${score} XP yaptı — Geçebilir misin?`;
}

function sanitizeQuestionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().slice(0, 120);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 20) break;
  }
  return out;
}

function sanitizeLocalizedQuizSnapshot(
  raw: unknown
): ChallengeLocalizedQuizSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const quizRaw = obj.quiz;
  if (!quizRaw || typeof quizRaw !== 'object' || Array.isArray(quizRaw)) return null;

  const qObj = quizRaw as Record<string, unknown>;
  const question = sanitizeDisplayText(qObj.question, 300);
  if (!question) return null;

  if (!Array.isArray(qObj.options) || qObj.options.length < 3) return null;
  const cleanOptions = qObj.options
    .slice(0, 3)
    .map((opt) => sanitizeDisplayText(opt, 220));
  if (cleanOptions.length !== 3 || cleanOptions.some((opt) => !opt)) return null;

  const rawIdx = Number(qObj.correctIndex);
  const correctIndex: 0 | 1 | 2 = rawIdx === 1 ? 1 : rawIdx === 2 ? 2 : 0;
  const explanation = sanitizeDisplayText(qObj.explanation, 600);
  const title = sanitizeDisplayText(obj.title, 180) || question;
  const tag = sanitizeDisplayText(obj.tag, 80);
  const factText = sanitizeDisplayText(obj.factText, 600) || explanation || title;
  const deepDiveDetail = sanitizeDisplayText(obj.deepDiveDetail, 800);
  const sourceHint = sanitizeDisplayText(obj.sourceHint, 180);
  const sourceName = sanitizeDisplayText(obj.sourceName, 180);

  return {
    title,
    ...(tag ? { tag } : {}),
    factText,
    ...(deepDiveDetail ? { deepDiveDetail } : {}),
    ...(sourceHint ? { sourceHint } : {}),
    ...(sourceName ? { sourceName } : {}),
    quiz: {
      question,
      options: [cleanOptions[0], cleanOptions[1], cleanOptions[2]],
      correctIndex,
      ...(explanation ? { explanation } : {}),
    },
  };
}

export function sanitizeQuestionSnapshots(raw: unknown): ChallengeQuestionSnapshot[] {
  let candidate = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(candidate)) return [];

  const seen = new Set<string>();
  const out: ChallengeQuestionSnapshot[] = [];

  for (const item of candidate) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id.trim().slice(0, 120) : '';
    if (!id || seen.has(id)) continue;

    const trLoc = sanitizeLocalizedQuizSnapshot(obj.tr);
    const enLoc = sanitizeLocalizedQuizSnapshot(obj.en);
    const resolvedTr = trLoc ?? enLoc;
    const resolvedEn = enLoc ?? trLoc;
    if (!resolvedTr || !resolvedEn) continue;

    const rawCategory =
      typeof obj.category === 'string' ? obj.category.trim().toLowerCase().slice(0, 40) : 'science';
    const category = normalizeDuelCategory(rawCategory);
    const emoji = sanitizeDisplayText(obj.emoji, 16);
    const sourceName = sanitizeDisplayText(obj.sourceName, 180);

    seen.add(id);
    out.push({
      id,
      category: rawCategory === 'vocabulary' ? 'vocabulary' : category === 'all' ? 'science' : category,
      ...(emoji ? { emoji } : {}),
      ...(sourceName ? { sourceName } : {}),
      tr: resolvedTr,
      en: resolvedEn,
    });

    if (out.length >= 20) break;
  }

  return out;
}

function toValidFactCategory(rawCategory: string): CategoryId {
  return VALID_FACT_CATEGORIES.has(rawCategory as CategoryId)
    ? (rawCategory as CategoryId)
    : 'science';
}

export function snapshotToFactCard(snap: ChallengeQuestionSnapshot): FactCard {
  const isVocab = snap.category === 'vocabulary' || snap.id.startsWith('vocab-');
  const factCategory = toValidFactCategory(snap.category);

  return {
    id: snap.id,
    slug: snap.id,
    category: factCategory,
    accentColor: isVocab ? '#6366F1' : '#818CF8',
    iconName: isVocab ? 'globe' : 'sparkles',
    emoji: snap.emoji || (isVocab ? '🌐' : '✨'),
    sketchType: isVocab ? 'vocabulary' : undefined,
    sourceName: snap.sourceName || snap.tr.sourceName || snap.en.sourceName,
    tr: {
      slug: snap.id,
      title: snap.tr.title,
      tag: snap.tr.tag,
      factText: snap.tr.factText,
      deepDiveDetail: snap.tr.deepDiveDetail || snap.tr.factText,
      sourceHint:
        snap.tr.sourceHint ||
        snap.tr.sourceName ||
        snap.sourceName ||
        (isVocab ? 'Scrolly Dil Laboratuvarı' : 'Scrolly'),
      sourceName: snap.tr.sourceName || snap.sourceName,
      quiz: snap.tr.quiz,
    },
    en: {
      slug: snap.id,
      title: snap.en.title,
      tag: snap.en.tag,
      factText: snap.en.factText,
      deepDiveDetail: snap.en.deepDiveDetail || snap.en.factText,
      sourceHint:
        snap.en.sourceHint ||
        snap.en.sourceName ||
        snap.sourceName ||
        (isVocab ? 'Scrolly Language Lab' : 'Scrolly'),
      sourceName: snap.en.sourceName || snap.sourceName,
      quiz: snap.en.quiz,
    },
  };
}

export async function createChallenge(input: {
  creatorNickname?: string;
  creatorScore?: number;
  creatorCorrect?: number;
  totalQuestions?: number;
  questionIds?: string[];
  questionsSnapshot?: unknown;
  category?: string;
  lang?: Language;
}): Promise<
  | { ok: true; challenge: ChallengeRecord }
  | { ok: false; error: 'missing_questions' }
> {
  const lang: Language = input.lang === 'en' ? 'en' : 'tr';
  const questionsSnapshot = sanitizeQuestionSnapshots(input.questionsSnapshot);
  let questionIds = sanitizeQuestionIds(input.questionIds);
  if (questionIds.length === 0 && questionsSnapshot.length > 0) {
    questionIds = questionsSnapshot.map((s) => s.id);
  }
  if (questionIds.length === 0) {
    return { ok: false, error: 'missing_questions' };
  }

  const totalQuestions = Math.max(
    questionIds.length,
    Math.min(20, Math.floor(Number(input.totalQuestions) || questionIds.length))
  );
  const creatorCorrect = Math.max(
    0,
    Math.min(totalQuestions, Math.floor(Number(input.creatorCorrect) || 0))
  );
  const rawScore = Number(input.creatorScore);
  const creatorScore =
    Number.isFinite(rawScore) && rawScore >= 0
      ? Math.min(10_000, Math.round(rawScore))
      : 0;
  const creatorNickname =
    sanitizeDisplayText(input.creatorNickname || '', 28) ||
    (lang === 'en' ? 'Explorer' : 'Kâşif');
  const category = normalizeDuelCategory(input.category);
  const createdAt = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const map = getMemoryChallengesMap();
    let code = generateChallengeCode(7);
    for (let attempt = 0; attempt < 6 && map.has(code); attempt += 1) {
      code = generateChallengeCode(7);
    }
    const challenge: ChallengeRecord = {
      code,
      creatorNickname,
      creatorScore,
      creatorCorrect,
      totalQuestions,
      questionIds,
      questionsSnapshot,
      category,
      lang,
      createdAt,
    };
    map.set(code, challenge);
    return { ok: true, challenge };
  }

  await ensureSchema();
  const pool = getPool();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateChallengeCode(7);
    const res = await pool.query<{
      code: string;
      creator_nickname: string;
      creator_score: number;
      creator_correct: number;
      total_questions: number;
      question_ids: unknown;
      questions_snapshot: unknown;
      category: string;
      lang: string;
      created_at: Date | string;
    }>(
      `INSERT INTO challenges (
        code, creator_nickname, creator_score, creator_correct,
        total_questions, question_ids, questions_snapshot, category, lang
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
      ON CONFLICT (code) DO NOTHING
      RETURNING code, creator_nickname, creator_score, creator_correct,
                total_questions, question_ids, questions_snapshot, category, lang, created_at`,
      [
        code,
        creatorNickname,
        creatorScore,
        creatorCorrect,
        totalQuestions,
        JSON.stringify(questionIds),
        JSON.stringify(questionsSnapshot),
        category,
        lang,
      ]
    );
    const row = res.rows[0];
    if (row) {
      const savedIds = sanitizeQuestionIds(row.question_ids);
      const savedSnapshots = sanitizeQuestionSnapshots(row.questions_snapshot);
      return {
        ok: true,
        challenge: {
          code: row.code,
          creatorNickname: row.creator_nickname,
          creatorScore: Number(row.creator_score) || 0,
          creatorCorrect: Number(row.creator_correct) || 0,
          totalQuestions: Number(row.total_questions) || savedIds.length,
          questionIds: savedIds,
          questionsSnapshot: savedSnapshots,
          category: row.category || 'all',
          lang: row.lang === 'en' ? 'en' : 'tr',
          createdAt:
            row.created_at instanceof Date
              ? row.created_at.toISOString()
              : String(row.created_at || createdAt),
        },
      };
    }
  }

  throw new Error('Failed to generate unique challenge code.');
}

export async function getChallengeByCode(rawCode: string): Promise<ChallengeRecord | null> {
  const code = normalizeChallengeCode(rawCode);
  if (!isValidChallengeCode(code)) return null;

  if (!hasDatabaseUrl()) {
    return getMemoryChallengesMap().get(code) ?? null;
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<{
    code: string;
    creator_nickname: string;
    creator_score: number;
    creator_correct: number;
    total_questions: number;
    question_ids: unknown;
    questions_snapshot: unknown;
    category: string;
    lang: string;
    created_at: Date | string;
  }>(
    `SELECT code, creator_nickname, creator_score, creator_correct,
            total_questions, question_ids, questions_snapshot, category, lang, created_at
     FROM challenges
     WHERE code = $1
     LIMIT 1`,
    [code]
  );

  const row = res.rows[0];
  if (!row) return null;

  const ids = sanitizeQuestionIds(row.question_ids);
  const snapshots = sanitizeQuestionSnapshots(row.questions_snapshot);
  return {
    code: row.code,
    creatorNickname:
      sanitizeDisplayText(row.creator_nickname, 28) ||
      (row.lang === 'en' ? 'Explorer' : 'Kâşif'),
    creatorScore: Math.max(0, Number(row.creator_score) || 0),
    creatorCorrect: Math.max(0, Number(row.creator_correct) || 0),
    totalQuestions: Math.max(1, Number(row.total_questions) || ids.length || snapshots.length || 5),
    questionIds: ids.length > 0 ? ids : snapshots.map((s) => s.id),
    questionsSnapshot: snapshots,
    category: row.category || 'all',
    lang: row.lang === 'en' ? 'en' : 'tr',
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || ''),
  };
}

export async function resolveChallengeQuestions(challenge: ChallengeRecord): Promise<{
  questions: QuizQuestionItem[];
  vocabularyPool: VocabularyCard[];
}> {
  const [allFacts, { vocabulary }] = await Promise.all([
    getAllFactsServer(),
    fetchVocabularyWithSourceServer(),
  ]);

  const factLookup = new Map<string, FactCard>();
  for (const fact of allFacts) {
    factLookup.set(fact.id, fact);
    const primarySlug = getFactPrimarySlug(fact);
    if (primarySlug) factLookup.set(primarySlug, fact);
    if (fact.tr.slug) factLookup.set(fact.tr.slug, fact);
    if (fact.en.slug) factLookup.set(fact.en.slug, fact);
  }

  const vocabLookup = new Map<string, VocabularyCard>();
  for (const card of vocabulary) {
    vocabLookup.set(card.id, card);
    vocabLookup.set(card.word.toLowerCase(), card);
  }

  const snapshotLookup = new Map<string, ChallengeQuestionSnapshot>();
  for (const snap of challenge.questionsSnapshot ?? []) {
    snapshotLookup.set(snap.id, snap);
  }

  const orderedIds: string[] = [];
  const seenOrder = new Set<string>();
  for (const rawId of [
    ...challenge.questionIds,
    ...(challenge.questionsSnapshot ?? []).map((s) => s.id),
  ]) {
    if (!rawId || seenOrder.has(rawId)) continue;
    seenOrder.add(rawId);
    orderedIds.push(rawId);
  }

  const resolved: QuizQuestionItem[] = [];
  const usedIds = new Set<string>();

  for (const rawId of orderedIds) {
    const matchedFact = factLookup.get(rawId);
    if (matchedFact && !usedIds.has(matchedFact.id)) {
      usedIds.add(matchedFact.id);
      resolved.push({ fact: matchedFact });
      continue;
    }

    const matchedVocab = vocabLookup.get(rawId) ?? vocabLookup.get(rawId.toLowerCase());
    if (matchedVocab && !usedIds.has(matchedVocab.id)) {
      usedIds.add(matchedVocab.id);
      resolved.push({ fact: vocabCardToFactCard(matchedVocab, vocabulary) });
      continue;
    }

    const matchedSnapshot = snapshotLookup.get(rawId);
    if (matchedSnapshot && !usedIds.has(matchedSnapshot.id)) {
      usedIds.add(matchedSnapshot.id);
      resolved.push({ fact: snapshotToFactCard(matchedSnapshot) });
    }
  }

  const targetCount = Math.max(
    1,
    Math.min(20, challenge.totalQuestions || orderedIds.length || 5)
  );
  if (resolved.length < targetCount) {
    if (challenge.category === 'vocabulary') {
      for (const card of vocabulary) {
        if (usedIds.has(card.id)) continue;
        usedIds.add(card.id);
        resolved.push({ fact: vocabCardToFactCard(card, vocabulary) });
        if (resolved.length >= targetCount) break;
      }
    } else {
      for (const fact of allFacts) {
        if (usedIds.has(fact.id)) continue;
        usedIds.add(fact.id);
        resolved.push({ fact });
        if (resolved.length >= targetCount) break;
      }
    }
  }

  return {
    questions: resolved.slice(0, targetCount),
    vocabularyPool: vocabulary,
  };
}
