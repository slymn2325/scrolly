import { NextResponse } from 'next/server';
import { getCategoryMeta } from '@/i18n/translations';
import { getAllFactsServer } from '@/lib/db';
import type { FactCard } from '@/types/fact';
import { categoryIdToRouteSlug, getFactPrimarySlug } from '@/utils/factsData';

export const dynamic = 'force-dynamic';

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
    '# Scrolly (https://scrolly.live) — Tam Bilimsel Bilgi Külliyatı / Full Verified Knowledge Corpus',
    '',
    '> Scrolly (https://scrolly.live), uzay, doğa, bilim, tarih, insan vücudu ve dünya rekorları alanlarında doğrulanmış bilimsel kaynaklara dayalı, etkileşimli iki dilli (Türkçe ve İngilizce) mikro öğrenme kartları sunan bir bilgi platformudur.',
    '',
    `- Canonical Domain: https://scrolly.live`,
    `- Concise Index: https://scrolly.live/llms.txt`,
    `- XML Sitemap: https://scrolly.live/sitemap.xml`,
    `- Total Verified Fact Cards: ${facts.length}`,
    `- Snapshot Generated At: ${generatedAt}`,
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
    lines.push(`- **Canonical URL:** ${canonicalUrl}`);
    lines.push(`- **TR URL:** ${canonicalUrl}?lang=tr`);
    lines.push(`- **EN URL:** ${canonicalUrl}?lang=en`);
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
