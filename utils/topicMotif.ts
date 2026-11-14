import type { CategoryId } from '@/types/fact';

/** Visual motif hints for cinematic Reels backgrounds — topic-relevant, not random. */
export type TopicMotif =
  | 'desert_cactus'
  | 'ocean'
  | 'forest'
  | 'ice'
  | 'volcano'
  | 'planet'
  | 'orbit'
  | 'heart'
  | 'cell'
  | 'brain'
  | 'map_borders'
  | 'astrolabe'
  | 'molecule'
  | 'crystal'
  | 'lightning'
  | 'typographic'
  | 'generic';

const RULES: Array<{ motif: TopicMotif; re: RegExp }> = [
  { motif: 'desert_cactus', re: /saguaro|cactus|kaktüs|kaktus|desert|çöl|col\b|accordion|akordeon|succulent/i },
  { motif: 'ocean', re: /ocean|deniz|sea\b|whale|balık|fish|coral|mercan|wave|dalga|plankton|icefish/i },
  { motif: 'ice', re: /\bice\b|buz|antarctic|arkt|glacier|buzul|frozen|soğuk/i },
  { motif: 'forest', re: /forest|orman|tree|ağaç|leaf|yaprak|amazon|rainforest/i },
  { motif: 'volcano', re: /volcano|yanardağ|lava|magma|erupt/i },
  { motif: 'planet', re: /venus|mars|planet|gezegen|moon|ay\b|jupiter|saturn|mercury/i },
  { motif: 'orbit', re: /orbit|yörünge|satellite|uydu|space station|iss|cold weld|soğuk kaynak/i },
  { motif: 'heart', re: /heart|kalp|blood|kan\b|ekg|pulse|nabız|circulat/i },
  { motif: 'brain', re: /brain|beyin|neuron|nöron|memory|hafıza|synapse/i },
  { motif: 'cell', re: /cell|hücre|dna|protein|enzyme|enzim|molecule|molekül/i },
  { motif: 'map_borders', re: /border|sınır|norway|norway|russia|korea|prk|map|coğraf/i },
  { motif: 'astrolabe', re: /cleopatra|pyramid|roma|roman|aztec|oxford|empire|tarih|ancient|antik/i },
  { motif: 'lightning', re: /lightning|şimşek|electric|elektrik|thunder|record|rekor|fastest|en hızlı/i },
  { motif: 'crystal', re: /crystal|kristal|diamond|elmas|mineral|gem/i },
  { motif: 'molecule', re: /atom|quantum|kuantum|physics|fizik|chem|kimya|interfer/i },
];

export function resolveTopicMotif(input: {
  category: CategoryId | 'vocabulary';
  title?: string;
  body?: string;
  sketchType?: string;
  tag?: string;
}): TopicMotif {
  if (input.category === 'vocabulary') return 'typographic';
  const hay = [input.title, input.body, input.sketchType, input.tag].filter(Boolean).join(' · ');
  for (const rule of RULES) {
    if (rule.re.test(hay)) return rule.motif;
  }
  // Category fallbacks that still feel on-theme
  switch (input.category) {
    case 'space':
      return 'planet';
    case 'nature':
      return 'forest';
    case 'human_body':
      return 'heart';
    case 'history':
      return 'astrolabe';
    case 'science':
      return 'molecule';
    case 'records':
      return 'lightning';
    default:
      return 'generic';
  }
}

/** Build a richer detail article from localized fact fields (≠ short teaser). */
export function buildFactDetailArticle(localized: {
  factText: string;
  deepDiveDetail: string;
  tag?: string;
  sourceHint?: string;
  quiz?: { question?: string; explanation?: string };
}): { article: string; wordCount: number; differsFromTeaser: boolean } {
  const teaser = (localized.factText || '').trim();
  const deep = (localized.deepDiveDetail || '').trim();
  const explanation = (localized.quiz?.explanation || '').trim();
  const question = (localized.quiz?.question || '').trim();
  const tag = (localized.tag || '').trim();
  const sourceHint = (localized.sourceHint || '').trim();

  const blocks: string[] = [];
  if (deep) blocks.push(deep);

  // If deep is missing or nearly identical to teaser, expand with available fields
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const deepSameAsTeaser = deep && teaser && normalize(deep) === normalize(teaser);

  if (!deep || deepSameAsTeaser) {
    if (teaser && !blocks.includes(teaser)) {
      // keep teaser only as a lead-in when deep is empty
      if (!deep) blocks.unshift(teaser);
    }
  }

  if (explanation && !blocks.some((b) => normalize(b).includes(normalize(explanation).slice(0, 40)))) {
    blocks.push(explanation);
  }

  if (question && explanation) {
    const bridge =
      // short connective sentence — not a copy of the card teaser
      `Bağlam: ${question.replace(/\?+$/, '')}? ${explanation}`;
    if (!blocks.some((b) => normalize(b).includes(normalize(explanation).slice(0, 40)))) {
      // already added explanation alone
    } else if (blocks.length < 3) {
      // optional — skip duplicate
    }
    void bridge;
  }

  if (tag) {
    blocks.push(`Konu başlığı: ${tag}. Bu kart, aynı temadaki diğer bilgilerle birlikte keşfetme akışında yer alır.`);
  }
  if (sourceHint) {
    blocks.push(`Araştırmacılar ve kurumlar bu gözlemi ${sourceHint} gibi kaynaklarda belgelemiştir. Tam metin ve atıflar için kaynak bağlantısını veya detay sayfasını kullanabilirsiniz.`);
  }

  // Ensure we never ship detail that is only the teaser
  let article = blocks.filter(Boolean).join('\n\n').trim();
  if (!article || normalize(article) === normalize(teaser)) {
    article = [
      deep || teaser,
      explanation,
      tag ? `Tema: ${tag}.` : '',
      sourceHint ? `Kaynak notu: ${sourceHint}.` : '',
      'Daha uzun okuma ve kaynak doğrulama için aşağıdaki bağlantıları kullanın.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const wordCount = article.split(/\s+/).filter(Boolean).length;
  const differsFromTeaser = normalize(article) !== normalize(teaser);
  return { article, wordCount, differsFromTeaser };
}
