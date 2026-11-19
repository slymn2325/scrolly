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
import type { VocabularyCard } from '@/types/vocabulary';
import { vocabCardToFactCard } from '@/utils/duelLobby';
import { type FactCard, getFactPrimarySlug } from '@/utils/factsData';
import type { QuizQuestionItem } from '@/utils/recommendation';
import { PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export interface ChallengeRecord {
  code: string;
  creatorNickname: string;
  creatorScore: number;
  creatorCorrect: number;
  totalQuestions: number;
  questionIds: string[];
  category: string;
  lang: Language;
  createdAt: string;
}

const CHALLENGE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHALLENGE_CODE_REGEX = /^[A-Z0-9]{6,8}$/;

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

export async function createChallenge(input: {
  creatorNickname?: string;
  creatorScore?: number;
  creatorCorrect?: number;
  totalQuestions?: number;
  questionIds?: string[];
  category?: string;
  lang?: Language;
}): Promise<
  | { ok: true; challenge: ChallengeRecord }
  | { ok: false; error: 'missing_questions' }
> {
  const lang: Language = input.lang === 'en' ? 'en' : 'tr';
  const questionIds = sanitizeQuestionIds(input.questionIds);
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
      ? Math.min(2500, Math.round(rawScore))
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
      category: string;
      lang: string;
      created_at: Date | string;
    }>(
      `INSERT INTO challenges (
        code, creator_nickname, creator_score, creator_correct,
        total_questions, question_ids, category, lang
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      ON CONFLICT (code) DO NOTHING
      RETURNING code, creator_nickname, creator_score, creator_correct,
                total_questions, question_ids, category, lang, created_at`,
      [
        code,
        creatorNickname,
        creatorScore,
        creatorCorrect,
        totalQuestions,
        JSON.stringify(questionIds),
        category,
        lang,
      ]
    );
    const row = res.rows[0];
    if (row) {
      return {
        ok: true,
        challenge: {
          code: row.code,
          creatorNickname: row.creator_nickname,
          creatorScore: Number(row.creator_score) || 0,
          creatorCorrect: Number(row.creator_correct) || 0,
          totalQuestions: Number(row.total_questions) || questionIds.length,
          questionIds: sanitizeQuestionIds(row.question_ids),
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
    category: string;
    lang: string;
    created_at: Date | string;
  }>(
    `SELECT code, creator_nickname, creator_score, creator_correct,
            total_questions, question_ids, category, lang, created_at
     FROM challenges
     WHERE code = $1
     LIMIT 1`,
    [code]
  );

  const row = res.rows[0];
  if (!row) return null;

  const ids = sanitizeQuestionIds(row.question_ids);
  return {
    code: row.code,
    creatorNickname:
      sanitizeDisplayText(row.creator_nickname, 28) ||
      (row.lang === 'en' ? 'Explorer' : 'Kâşif'),
    creatorScore: Math.max(0, Number(row.creator_score) || 0),
    creatorCorrect: Math.max(0, Number(row.creator_correct) || 0),
    totalQuestions: Math.max(1, Number(row.total_questions) || ids.length || 5),
    questionIds: ids,
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
  }

  const resolved: QuizQuestionItem[] = [];
  const usedIds = new Set<string>();

  for (const rawId of challenge.questionIds) {
    const matchedFact = factLookup.get(rawId);
    if (matchedFact && !usedIds.has(matchedFact.id)) {
      usedIds.add(matchedFact.id);
      resolved.push({ fact: matchedFact });
      continue;
    }

    const matchedVocab = vocabLookup.get(rawId);
    if (matchedVocab && !usedIds.has(matchedVocab.id)) {
      usedIds.add(matchedVocab.id);
      resolved.push({ fact: vocabCardToFactCard(matchedVocab, vocabulary) });
    }
  }

  const targetCount = Math.max(1, Math.min(20, challenge.totalQuestions || challenge.questionIds.length || 5));
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
