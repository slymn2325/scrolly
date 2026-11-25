import dns from 'node:dns/promises';
import { sanitizeVisualQuery, searchStudioGifs } from '@/lib/gifService';
import { isBlockedMediaHost } from '@/lib/mediaProxyPolicy';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import { buildSpecificGifQuery, resolveServerGifForQuery } from '@/lib/serverGifMatcher';
import { sanitizeStoryCards } from '@/lib/stories';
import {
  STORY_GRADIENT_PRESETS,
  type StoryCardItem,
  type StoryDraft,
  type StoryLanguage,
} from '@/types/story';

const MAX_FETCH_BYTES = 512 * 1024;
const MAX_REDIRECT_HOPS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const LLM_TIMEOUT_MS = 22_000;

const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

function decodeHtmlEntitiesOnce(input: string): string {
  return input.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|(amp|quot|apos|lt|gt|nbsp));/gi,
    (match, hex, dec, named) => {
      if (hex) {
        const code = Number.parseInt(hex, 16);
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      if (dec) {
        const code = Number.parseInt(dec, 10);
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
      }
      if (named) {
        return HTML_NAMED_ENTITIES[named.toLowerCase()] ?? match;
      }
      return match;
    }
  );
}

async function assertPublicHttpTarget(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('invalid_url');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('unsupported_protocol');
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new Error('credentials_not_allowed');
  }
  if (parsed.port !== '' && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('port_not_allowed');
  }
  if (isBlockedMediaHost(parsed.hostname)) {
    throw new Error('blocked_private_host');
  }

  // Resolve DNS records and block any private/loopback/link-local IP resolution (SSRF protection).
  const lookupResults = await dns.lookup(parsed.hostname, { all: true }).catch(() => null);
  if (!lookupResults || lookupResults.length === 0) {
    throw new Error('dns_resolution_failed');
  }
  for (const record of lookupResults) {
    if (isBlockedMediaHost(record.address)) {
      throw new Error('blocked_private_ip');
    }
  }

  return parsed;
}

async function readResponseTextBounded(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    const remaining = maxBytes - total;
    if (remaining <= 0) {
      await reader.cancel().catch(() => {});
      break;
    }
    if (value.byteLength > remaining) {
      chunks.push(value.subarray(0, remaining));
      total += remaining;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(combined);
}

function extractTitleAndTextFromHtml(rawHtml: string): { pageTitle: string; cleanText: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(rawHtml);
  const pageTitle = sanitizeDisplayText(decodeHtmlEntitiesOnce(titleMatch?.[1] || ''), 140);

  const withoutNoise = rawHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ');

  const strippedTags = withoutNoise.replace(/<[^>]+>/g, ' ');
  const decoded = decodeHtmlEntitiesOnce(strippedTags).replace(/\s+/g, ' ').trim();
  return {
    pageTitle,
    cleanText: decoded.slice(0, 12_000),
  };
}

export async function fetchCleanTextFromPublicUrl(rawUrl: string): Promise<{
  finalUrl: string;
  hostLabel: string;
  pageTitle: string;
  text: string;
}> {
  let currentUrl = await assertPublicHttpTarget(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const response = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8',
        'User-Agent': 'ScrollyStudioBot/1.0 (+https://scrolly.live)',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REDIRECT_HOPS) {
        throw new Error('too_many_redirects');
      }
      const nextUrl = new URL(location, currentUrl);
      currentUrl = await assertPublicHttpTarget(nextUrl.toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`upstream_http_${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/xhtml+xml')
    ) {
      throw new Error('unsupported_content_type');
    }

    const rawBody = await readResponseTextBounded(response, MAX_FETCH_BYTES);
    const { pageTitle, cleanText } = contentType.includes('text/plain')
      ? { pageTitle: '', cleanText: rawBody.replace(/\s+/g, ' ').trim().slice(0, 12_000) }
      : extractTitleAndTextFromHtml(rawBody);

    if (cleanText.length < 80) {
      throw new Error('insufficient_extracted_text');
    }

    return {
      finalUrl: currentUrl.toString(),
      hostLabel: currentUrl.hostname.replace(/^www\./i, ''),
      pageTitle,
      text: cleanText,
    };
  }

  throw new Error('fetch_failed');
}

function extractJsonObjectFromText(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function callConfiguredLlm(params: {
  sourceText: string;
  pageTitle: string;
  sourceLabel: string;
  language: StoryLanguage;
  cardCount: number;
}): Promise<{ title: string; cards: StoryCardItem[]; visualQueries?: string[] } | null> {
  const token =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    '';
  if (!token) return null;

  const langLabel = params.language === 'tr' ? 'Turkish' : 'English';
  const systemPrompt = [
    'You are a senior interactive micro-learning editor for Scrolly.live.',
    `Write strictly in ${langLabel}.`,
    'Transform the provided source article into an engaging scrollytelling deck of micro-cards.',
    'Return ONLY a single valid JSON object with this exact shape:',
    '{',
    '  "title": "concise engaging story deck title (max 80 chars)",',
    '  "cards": [',
    '    {',
    '      "headline": "punchy card headline (max 80 chars)",',
    '      "body": "clear 1-2 sentence micro-learning takeaway (max 240 chars)",',
    '      "question": "1 crisp Quick Guess comprehension question based strictly on this card",',
    '      "options": ["Option A", "Option B", "Option C"],',
    '      "correctIndex": 0,',
    '      "sourceLabel": "short source attribution",',
    '      "visualQuery": "2-4 English visual keywords for GIF background"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const userPrompt = [
    `Target card count: ${params.cardCount} (between 5 and 7).`,
    `Default sourceLabel: ${params.sourceLabel}`,
    params.pageTitle ? `Page title: ${params.pageTitle}` : '',
    `Source content:\n${params.sourceText.slice(0, 7500)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const customEndpoint = String(process.env.AI_MODELS_ENDPOINT || '').trim();
  const preferredModel = String(process.env.AI_MODEL_NAME || '').trim();

  if (customEndpoint) {
    try {
      const response = await fetch(customEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        body: JSON.stringify({
          model: preferredModel || 'gemini-2.5-flash',
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = data?.choices?.[0]?.message?.content || '';
      const parsed = extractJsonObjectFromText(rawContent);
      if (!parsed) return null;
      const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];
      const visualQueries = rawCards.map((c) =>
        c && typeof c === 'object' && 'visualQuery' in c
          ? sanitizeVisualQuery(String((c as { visualQuery?: unknown }).visualQuery || '')) || ''
          : ''
      );
      const cards = sanitizeStoryCards(parsed.cards, params.language);
      if (cards.length < 2) return null;
      return {
        title: sanitizeDisplayText(parsed.title, 120) || params.pageTitle || params.sourceLabel,
        cards,
        visualQueries,
      };
    } catch {
      return null;
    }
  }

  const candidateModels = [preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(
    (m, i, arr) => Boolean(m) && arr.indexOf(m) === i
  );

  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(token)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      const rawText = (data?.candidates?.[0]?.content?.parts || [])
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('\n');
      const parsed = extractJsonObjectFromText(rawText);
      if (!parsed) continue;
      const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];
      const visualQueries = rawCards.map((c) =>
        c && typeof c === 'object' && 'visualQuery' in c
          ? sanitizeVisualQuery(String((c as { visualQuery?: unknown }).visualQuery || '')) || ''
          : ''
      );
      const cards = sanitizeStoryCards(parsed.cards, params.language);
      if (cards.length < 2) continue;
      return {
        title: sanitizeDisplayText(parsed.title, 120) || params.pageTitle || params.sourceLabel,
        cards,
        visualQueries,
      };
    } catch {
      // Try next fallback model or deterministic synthesizer
    }
  }

  return null;
}

function buildQuickGuessFromSegment(
  segment: string,
  idx: number,
  lang: StoryLanguage,
  allSegments: string[]
): { question: string; options: string[]; correctIndex: number } {
  const numMatch = /\b(\d+(?:[.,]\d+)?)\s*(%|km|m|mm|cm|saniye|dakika|saat|yıl|kat|derece|°C|°F|million|billion|years|percent|seconds|hours|meters)?/i.exec(
    segment
  );

  if (numMatch?.[1]) {
    const rawNumStr = numMatch[1].replace(',', '.');
    const numeric = Number.parseFloat(rawNumStr);
    const unit = numMatch[2] ? ` ${numMatch[2]}` : '';
    if (Number.isFinite(numeric) && numeric > 0) {
      const fmt = (n: number) =>
        Number.isInteger(numeric) ? `${Math.round(n)}${unit}` : `${n.toFixed(1)}${unit}`;
      const correct = fmt(numeric);
      const low = fmt(Math.max(0.1, numeric < 10 ? numeric * 0.5 : numeric * 0.6));
      const high = fmt(numeric < 10 ? numeric * 2 : numeric * 1.8);
      const unique = [...new Set([correct, low, high])];
      if (unique.length >= 3) {
        const rotatedIdx = idx % 3;
        const ordered =
          rotatedIdx === 0
            ? [correct, low, high]
            : rotatedIdx === 1
              ? [low, correct, high]
              : [low, high, correct];
        return {
          question:
            lang === 'tr'
              ? 'Hızlı Tahmin: Bu kartta vurgulanan temel değer hangisidir?'
              : 'Quick Guess: Which key figure highlights this finding?',
          options: ordered,
          correctIndex: rotatedIdx,
        };
      }
    }
  }

  const words = segment
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5);
  const keyword = words[Math.min(words.length - 1, Math.floor(words.length / 2))] || (lang === 'tr' ? 'Temel Bulgu' : 'Key Finding');

  const otherSegment = allSegments[(idx + 1) % allSegments.length] || segment;
  const distractorPool = otherSegment
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && w.toLowerCase() !== keyword.toLowerCase());

  const d1 = distractorPool[0] || (lang === 'tr' ? 'Karşıt Varsayım' : 'Reverse Effect');
  const d2 = distractorPool[1] || (lang === 'tr' ? 'Rastgele Dağılım' : 'Random Drift');
  const uniqueOpts = [...new Set([keyword, d1, d2])];
  while (uniqueOpts.length < 3) {
    uniqueOpts.push(lang === 'tr' ? `Seçenek ${uniqueOpts.length + 1}` : `Choice ${uniqueOpts.length + 1}`);
  }
  const rotatedIdx = idx % 3;
  const arranged =
    rotatedIdx === 0
      ? [uniqueOpts[0], uniqueOpts[1], uniqueOpts[2]]
      : rotatedIdx === 1
        ? [uniqueOpts[1], uniqueOpts[0], uniqueOpts[2]]
        : [uniqueOpts[1], uniqueOpts[2], uniqueOpts[0]];

  return {
    question:
      lang === 'tr'
        ? 'Hızlı Tahmin: Bu karttaki ana mekanizma veya kavram hangisiyle ilgilidir?'
        : 'Quick Guess: Which core concept drives the mechanism in this card?',
    options: arranged,
    correctIndex: rotatedIdx,
  };
}

function synthesizeDeterministicDraft(params: {
  sourceText: string;
  pageTitle: string;
  sourceLabel: string;
  language: StoryLanguage;
  cardCount: number;
}): { title: string; cards: StoryCardItem[] } {
  const clean = params.sourceText.replace(/\s+/g, ' ').trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24);

  const chunks: string[] = [];
  if (sentences.length >= params.cardCount) {
    const perCard = Math.max(1, Math.floor(sentences.length / params.cardCount));
    for (let i = 0; i < params.cardCount; i += 1) {
      const slice = sentences.slice(i * perCard, (i + 1) * perCard).join(' ');
      if (slice) chunks.push(slice.slice(0, 320));
    }
  }

  while (chunks.length < params.cardCount) {
    const fallbackPool = sentences.length > 0 ? sentences : [clean];
    const base = fallbackPool[chunks.length % fallbackPool.length] || clean;
    chunks.push(base.slice(0, 320));
  }

  const cards: StoryCardItem[] = chunks.slice(0, params.cardCount).map((seg, idx) => {
    const firstWords = seg
      .split(/\s+/)
      .slice(0, 7)
      .join(' ')
      .replace(/[,:;.-]+$/u, '');
    const headline =
      sanitizeDisplayText(firstWords, 78) ||
      (params.language === 'tr' ? `Bölüm ${idx + 1}` : `Insight ${idx + 1}`);
    const body = sanitizeDisplayText(seg, 320) || clean.slice(0, 240);
    const quiz = buildQuickGuessFromSegment(body, idx, params.language, chunks);

    return {
      id: `card-${idx + 1}`,
      headline,
      body,
      question: quiz.question,
      options: quiz.options,
      correctIndex: quiz.correctIndex,
      sourceLabel: params.sourceLabel,
      mediaUrl: '',
    };
  });

  const derivedTitle =
    params.pageTitle ||
    sanitizeDisplayText(chunks[0]?.split(/\s+/).slice(0, 6).join(' '), 80) ||
    (params.language === 'tr' ? 'Yeni Scrolly Hikâyesi' : 'New Scrolly Story');

  return { title: derivedTitle, cards };
}

async function attachAutoMediaToCards(
  cards: StoryCardItem[],
  visualQueries: string[],
  language: StoryLanguage
): Promise<StoryCardItem[]> {
  const usedUrls = new Set<string>();
  const enriched: StoryCardItem[] = [];

  for (let idx = 0; idx < cards.length; idx += 1) {
    const card = cards[idx];
    const gradientId =
      card.gradientId ||
      STORY_GRADIENT_PRESETS[idx % STORY_GRADIENT_PRESETS.length].id;

    if (card.mediaUrl) {
      usedUrls.add(card.mediaUrl);
      enriched.push({
        ...card,
        gradientId,
        quizEnabled: card.quizEnabled !== false,
      });
      continue;
    }

    const rawQuery =
      visualQueries[idx] ||
      buildSpecificGifQuery({
        id: card.id,
        title: card.headline,
        factText: card.body,
        titleEn: language === 'en' ? card.headline : undefined,
        summaryEn: language === 'en' ? card.body : undefined,
      }) ||
      'science discovery cosmos';

    let mediaUrl = '';

    try {
      const direct = await resolveServerGifForQuery(rawQuery);
      if (direct?.gifUrl && !usedUrls.has(direct.gifUrl)) {
        mediaUrl = direct.gifUrl;
      }
    } catch {
      // Ignore single-card GIF error and try studio visual fallback
    }

    if (!mediaUrl) {
      try {
        const studioFallback = await searchStudioGifs(rawQuery, 8);
        const uniqueCandidate = studioFallback.gifs.find(
          (item) => item?.url && !usedUrls.has(item.url)
        );
        if (uniqueCandidate?.url) {
          mediaUrl = uniqueCandidate.url;
        }
      } catch {
        // Card falls back cleanly to curated gradient background
      }
    }

    if (mediaUrl) {
      usedUrls.add(mediaUrl);
    }

    enriched.push({
      ...card,
      mediaUrl,
      gradientId,
      quizEnabled: card.quizEnabled !== false,
    });
  }

  return enriched;
}

export async function generateStoryDraft(input: {
  inputType: 'url' | 'text';
  content: string;
  language: StoryLanguage;
  cardCount?: number;
}): Promise<{
  mode: 'llm' | 'structured_fallback';
  draft: StoryDraft;
}> {
  const cardCount = Math.max(5, Math.min(7, Math.floor(Number(input.cardCount) || 5)));
  const language: StoryLanguage = input.language === 'en' ? 'en' : 'tr';

  let sourceUrl: string | null = null;
  let sourceLabel = language === 'tr' ? 'Editöryal Not' : 'Editorial Note';
  let pageTitle = '';
  let cleanText: string;

  if (input.inputType === 'url') {
    const fetched = await fetchCleanTextFromPublicUrl(input.content);
    sourceUrl = fetched.finalUrl;
    sourceLabel = fetched.hostLabel || sourceLabel;
    pageTitle = fetched.pageTitle;
    cleanText = fetched.text;
  } else {
    cleanText = sanitizeDisplayText(input.content, 12_000);
    if (cleanText.length < 40) {
      throw new Error('content_too_short');
    }
  }

  const llmResult = await callConfiguredLlm({
    sourceText: cleanText,
    pageTitle,
    sourceLabel,
    language,
    cardCount,
  });

  if (llmResult && llmResult.cards.length > 0) {
    const sliced = llmResult.cards.slice(0, 7);
    const enrichedCards = await attachAutoMediaToCards(
      sliced,
      llmResult.visualQueries || [],
      language
    );
    return {
      mode: 'llm',
      draft: {
        title: llmResult.title,
        sourceUrl,
        language,
        cards: enrichedCards,
      },
    };
  }

  const fallback = synthesizeDeterministicDraft({
    sourceText: cleanText,
    pageTitle,
    sourceLabel,
    language,
    cardCount,
  });

  const enrichedFallback = await attachAutoMediaToCards(
    fallback.cards,
    [],
    language
  );

  return {
    mode: 'structured_fallback',
    draft: {
      title: fallback.title,
      sourceUrl,
      language,
      cards: enrichedFallback,
    },
  };
}
