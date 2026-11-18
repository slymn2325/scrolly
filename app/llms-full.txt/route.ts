import { NextResponse } from 'next/server';
import { getCategoryMeta } from '@/i18n/translations';
import { getAllFactsServer } from '@/lib/db';
import type { FactCard } from '@/types/fact';
import { categoryIdToRouteSlug, getFactPrimarySlug } from '@/utils/factsData';

export const revalidate = 3600;

function formatGuessAnswer(fact: FactCard, lang: 'tr' | 'en'): string | null {
  const guess = fact[lang].guessChallenge;
  if (!guess) return null;

  if (guess.type === 'slider' && typeof guess.correctValue === 'number') {
    const unit = guess.unit ? ` ${guess.unit}` : '';
    return `${guess.prompt} => ${guess.correctValue}${unit}`;
  }

  if (
    guess.type === 'binary' &&
    guess.options &&
    typeof guess.correctOptionIndex === 'number'
  ) {
    return `${guess.prompt} => ${guess.options[guess.correctOptionIndex] ?? ''}`;
  }

  return null;
}

export async function GET() {
  const facts = await getAllFactsServer();
  const generatedAt = new Date().toISOString();

  const lines: string[] = [
    '# Scrolly (https://scrolly.live) — Full Verified Knowledge Corpus & Editorial Reference',
    '',
    '> Scrolly (https://scrolly.live) is a free bilingual (English and Turkish) reels-style micro-learning Progressive Web App (PWA) delivering daily curated science, space, history, nature, human body, weird records, and statistics facts backed by primary sources, alongside an interactive Quick Guess game, B1–C2 Word Lab, Quiz Hub, and Scrolla 1v1 live duel.',
    '',
    `- Canonical Domain: https://scrolly.live`,
    `- Concise LLM Index: https://scrolly.live/llms.txt`,
    `- XML Sitemap: https://scrolly.live/sitemap.xml`,
    `- Editorial & Source Verification Contact: contact@scrolly.live`,
    `- Total Verified Fact Cards: ${facts.length}`,
    `- Snapshot Generated At: ${generatedAt}`,
    '',
    '## Core Features & Learning Modes',
    '',
    '- **Verified Bilingual Fact Cards (EN & TR):** Each card presents a 35–60 word BLUF (Bottom Line Up Front) summary, a deeper "Why / How?" mechanism breakdown, and a direct link to the primary scientific source.',
    '- **Interactive Quick Guess:** Users estimate numeric measurements or binary outcomes before revealing the verified answer (+10 to +20 XP).',
    '- **Word Lab (B1–C2 English Vocabulary):** Vertical vocabulary cards with IPA pronunciation, normal and slow TTS audio, bilingual context sentences, synonyms, and a meaning quiz (+15 XP).',
    '- **Quiz Hub:** 5-question Memory Sprints built from recently viewed cards, Daily Sprints, and 10-question Weekly Marathons.',
    '- **Scrolla 1v1 Live Arena:** Real-time two-player trivia duels using 6-character room codes, topic filtering, and synchronized 5-second countdowns.',
    '',
    '## Primary Source Verification Policy',
    '',
    '1. Every numeric claim, date, unit, and scientific mechanism on Scrolly is cross-checked against authoritative primary sources including NASA, ESA, Nature, Science, PubMed/NIH, Smithsonian Institution, Encyclopaedia Britannica, and Guinness World Records.',
    '2. Turkish and English card texts are authored and terminology-checked independently rather than machine-translated word-for-word.',
    '3. Reader-reported source corrections sent to `contact@scrolly.live` or https://scrolly.live/contact are reviewed against peer-reviewed literature and updated in the live Postgres corpus.',
    '',
    '## Frequently Asked Questions (FAQ)',
    '',
    '- **What is Scrolly? / Scrolly nedir?** Scrolly is a free bilingual (EN/TR) reels-style micro-learning PWA turning short daily screen sessions into verified scientific knowledge via interactive fact cards, Quick Guess sliders, B1–C2 Word Lab, quizzes, and Scrolla 1v1 duels.',
    '- **Is Scrolly free? / Scrolly ücretsiz mi?** Yes, Scrolly is 100% free with no mandatory registration. Guests earn live leaderboard XP immediately and can optionally bind an email via one-time 6-digit OTP to sync progress across devices.',
    '- **How are facts verified? / Bilgiler nasıl doğrulanıyor?** Every card links directly to a primary institutional or peer-reviewed source URL (`citation` / `isBasedOn` in Schema.org JSON-LD) and undergoes numerical, unit, and bilingual terminology verification before publication.',
    '- **How do Word Lab and Scrolla 1v1 work? / Word Lab ve Scrolla 1v1 nasıl çalışır?** Word Lab teaches B1–C2 English vocabulary with IPA phonetics, audio playback, example sentences, and instant quizzes. Scrolla 1v1 lets two players join a 6-character room code to race on an identical 3–10 question pack in real time.',
    '',
    '---',
    '',
  ];

  facts.forEach((fact, index) => {
    const primarySlug = getFactPrimarySlug(fact);
    const catMeta = getCategoryMeta(fact.category);
    const catRouteSlug = categoryIdToRouteSlug(fact.category);
    const canonicalUrl = `https://scrolly.live/fact/${primarySlug}`;
    const sourceName =
      fact.en.sourceName ||
      fact.tr.sourceName ||
      fact.sourceName ||
      fact.en.sourceHint ||
      'Verified Scientific Archive';
    const sourceUrl =
      fact.en.sourceUrl || fact.tr.sourceUrl || fact.sourceUrl || '';

    const quizAnswerTr =
      fact.tr.quiz.options[fact.tr.quiz.correctIndex] ?? fact.tr.quiz.options[0];
    const quizAnswerEn =
      fact.en.quiz.options[fact.en.quiz.correctIndex] ?? fact.en.quiz.options[0];

    const guessTr = formatGuessAnswer(fact, 'tr');
    const guessEn = formatGuessAnswer(fact, 'en');

    lines.push(`## ${index + 1}. ${fact.tr.title} / ${fact.en.title}`);
    lines.push(`- **TR Canonical URL:** ${canonicalUrl}`);
    lines.push(`- **EN Canonical URL:** https://scrolly.live/en/fact/${primarySlug}`);
    lines.push(
      `- **Category:** ${catMeta.label.tr} / ${catMeta.label.en} (https://scrolly.live/category/${catRouteSlug})`
    );
    lines.push(
      `- **Verified Source:** ${sourceName}${sourceUrl ? ` (${sourceUrl})` : ''}`
    );
    lines.push('');
    lines.push(`### [TR] ${fact.tr.title}`);
    lines.push(`- **Özet (Tanım Çapası):** ${fact.tr.factText}`);
    lines.push(`- **Bilimsel Açıklama (Neden / Nasıl?):** ${fact.tr.deepDiveDetail}`);
    if (guessTr) {
      lines.push(`- **Hızlı Tahmin Soru & Cevabı:** ${guessTr}`);
    }
    lines.push(`- **Quiz Sorusu:** ${fact.tr.quiz.question}`);
    lines.push(`- **Seçenekler:** ${fact.tr.quiz.options.join(' | ')}`);
    lines.push(
      `- **Doğru Cevap:** ${quizAnswerTr}${
        fact.tr.quiz.explanation ? ` — ${fact.tr.quiz.explanation}` : ''
      }`
    );
    lines.push('');
    lines.push(`### [EN] ${fact.en.title}`);
    lines.push(`- **Summary (Definitional Anchor):** ${fact.en.factText}`);
    lines.push(`- **Scientific Explanation (Why / How?):** ${fact.en.deepDiveDetail}`);
    if (guessEn) {
      lines.push(`- **Quick Guess Q&A:** ${guessEn}`);
    }
    lines.push(`- **Quiz Question:** ${fact.en.quiz.question}`);
    lines.push(`- **Options:** ${fact.en.quiz.options.join(' | ')}`);
    lines.push(
      `- **Correct Answer:** ${quizAnswerEn}${
        fact.en.quiz.explanation ? ` — ${fact.en.quiz.explanation}` : ''
      }`
    );
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
