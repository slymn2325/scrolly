import type { CategoryId } from '@/types/fact';

/** Visual motif hints for cinematic Reels backgrounds — topic-relevant, not random. */
export type TopicMotif =
  | 'desert_cactus'
  | 'antarctic_fish'
  | 'ocean'
  | 'octopus'
  | 'animal'
  | 'bird'
  | 'insect'
  | 'forest'
  | 'ice'
  | 'volcano'
  | 'planet'
  | 'orbit'
  | 'welding'
  | 'heart'
  | 'cell'
  | 'brain'
  | 'anatomy'
  | 'map_borders'
  | 'astrolabe'
  | 'molecule'
  | 'crystal'
  | 'lightning'
  | 'statistics'
  | 'typographic'
  | 'generic';

/** Higher weight = more specific. First max score wins. */
const RULES: Array<{ motif: TopicMotif; re: RegExp; weight: number }> = [
  // —— Ultra-specific card topics ——
  {
    motif: 'statistics',
    re: /probability|bayes|paradox|paradoks|olasilik|olasılık|istatistik|statistics|percentile|yüzdelik|dağılım|distribution|ortalama|medyan|median|simpson|monty hall|benford|survivorship|hayatta kalma|berkson|korelas|correlation|bell curve|çan eğrisi|standart sapma/i,
    weight: 115,
  },
  {
    motif: 'antarctic_fish',
    re: /icefish|buzbalığ|buzbalig|buz balığ|hemoglobin|hemoglobinsiz|transparent blood|şeffaf kan|antarctic icefish|antarktika buz/i,
    weight: 120,
  },
  {
    motif: 'desert_cactus',
    re: /saguaro|cactus|kaktüs|kaktus|succulent|akordeon|accordion pleat|su depola/i,
    weight: 110,
  },
  {
    motif: 'welding',
    re: /cold weld|soğuk kaynak|cold[- ]welding|vacuum weld|oksit tabaka|oxide layer|kaynak.*uzay|weld.*space|space.*weld|\bwelding\b/i,
    weight: 110,
  },
  {
    motif: 'octopus',
    re: /octopus|octopi|ahtapot|üç kalp|3 hearts|three hearts|blue blood|mavi kan/i,
    weight: 100,
  },
  {
    motif: 'volcano',
    re: /volcano|yanardağ|lava|magma|erupt|pompeii|pompei|krater/i,
    weight: 95,
  },

  // —— Animals / nature life ——
  {
    motif: 'bird',
    re: /\bbird\b|\bkuş\b|eagle|kartal|penguin|penguen|\bowl\b|baykuş|feather|\btüy\b|falcon|\bhawk\b|flamingo|\bcrow\b|karga|sparrow/i,
    weight: 90,
  },
  {
    motif: 'insect',
    re: /insect|böcek|\bbee\b|bal\s*arı|arılar|\bhoneybee\b|\bant\b|karınca|butterfly|kelebek|spider|örümcek|mosquito|sivrisinek|beetle|mantis/i,
    weight: 90,
  },
  {
    motif: 'animal',
    re: /\banimal\b|hayvan|mammal|memeli|\bwolf\b|\bkurt\b|\bbear\b|\bayı\b|\blion\b|aslan|tiger|kaplan|elephant|\bfil\b|whale|balina|dolphin|yunus|shark|köpekbalığı|frog|kurbağa|snake|yılan|lizard|kertenkele|deer|geyik|\bfox\b|tilki|\bcat\b|\bkedi\b|\bdog\b|\bköpek\b|horse|\batlar\b|chimp|chimpanzee|gorilla|maymun|monkey|\bbat\b|yarasa|\bseal\b|\bfok\b|turtle|kaplumbağa|crocodile|timsah|koala|otter|samur|penguin|penguen/i,
    weight: 85,
  },
  {
    motif: 'antarctic_fish',
    re: /\bfish\b|balık|buzbal|school of fish|yüzgeç|gill|solungaç/i,
    weight: 82,
  },

  // —— Environments ——
  {
    motif: 'desert_cactus',
    re: /desert|çöl|sahara|arid|kurak/i,
    weight: 75,
  },
  {
    motif: 'ocean',
    re: /ocean|deniz|sea\b|coral|mercan|wave|dalga|plankton|tide|gelgit|abyss|derin deniz|underwater|sualtı/i,
    weight: 70,
  },
  {
    motif: 'ice',
    re: /\bice\b|buz\b|antarctic|antarkt|arctic|arktika|glacier|buzul|frozen|donmuş|polar|kutup|iceberg/i,
    weight: 70,
  },
  {
    motif: 'forest',
    re: /wood wide web|mikoriza|mycorrhiza|orman|rainforest|jungle|ormanlık/i,
    weight: 96,
  },
  {
    motif: 'forest',
    re: /forest|tree|ağaç|leaf|yaprak|amazon|spore|kök/i,
    weight: 80,
  },
  {
    motif: 'forest',
    re: /mantar|mushroom|fungus|mycorrh|yer altı mantar/i,
    weight: 92,
  },

  // —— Space ——
  {
    motif: 'welding',
    re: /\bweld(?:ing|ed|s)?\b|alloy|alaşım|titanium|titanyum|\bsteel\b|\bçelik\b/i,
    weight: 68,
  },
  {
    motif: 'orbit',
    re: /orbit|yörünge|satellite|uydu|space station|iss\b|astronaut|astronot|rocket|roket/i,
    weight: 72,
  },
  {
    motif: 'planet',
    re: /venus|mars\b|planet|gezegen|moon|jupiter|saturn|mercury|neptune|uranus|pluto|exoplanet|ötegezegen|asteroid|göktaşı|comet|kuyruklu/i,
    weight: 72,
  },

  // —— Human body / anatomy ——
  {
    motif: 'brain',
    re: /brain|beyin|neuron|nöron|memory|hafıza|synapse|sinaps|cortex|korteks/i,
    weight: 80,
  },
  {
    motif: 'heart',
    re: /\bheart\b|kalp|blood|kan\b|ekg|pulse|nabız|circulat|dolaşım|artery|atardamar|vein|damar/i,
    weight: 78,
  },
  {
    motif: 'anatomy',
    re: /anatomy|anatomi|skeleton|iskelet|bone|kemik|muscle|kas\b|organ|organlar|lung|akciğer|liver|karaciğer|stomach|mide|skin|deri|eye\b|göz\b|ear\b|kulak/i,
    weight: 76,
  },
  {
    motif: 'cell',
    re: /\bcell\b|hücre|dna\b|protein|enzyme|enzim|mitochond|mitokondri|chromosome|kromozom/i,
    weight: 74,
  },

  // —— History / science / records ——
  {
    motif: 'map_borders',
    re: /border|sınır|norway|norway|russia|korea|prk|map|coğraf|territor|ülke/i,
    weight: 70,
  },
  {
    motif: 'astrolabe',
    re: /cleopatra|pyramid|roma|roman|aztec|oxford|empire|tarih|ancient|antik|pharaoh|firavun|medieval|ortaçağ|castle|kale/i,
    weight: 70,
  },
  {
    motif: 'lightning',
    re: /lightning|şimşek|electric|elektrik|thunder|gök gürültü|fastest|en hızlı|speed record|hız rekor/i,
    weight: 68,
  },
  {
    motif: 'crystal',
    re: /crystal|kristal|diamond|elmas|mineral|gem|mücevher|quartz|kuvars/i,
    weight: 68,
  },
  {
    motif: 'molecule',
    re: /atom|quantum|kuantum|physics|fizik|chem|kimya|interfer|particle|parçacık|photon|foton/i,
    weight: 65,
  },
];

/** sketchType / slug tokens → strong motif override */
const SKETCH_MOTIF: Array<{ re: RegExp; motif: TopicMotif }> = [
  { re: /icefish|antarctica|antarctic/i, motif: 'antarctic_fish' },
  { re: /cactus|saguaro|desert/i, motif: 'desert_cactus' },
  { re: /cold_?weld|weld/i, motif: 'welding' },
  { re: /octopus|ahtapot/i, motif: 'octopus' },
  { re: /volcano|lava/i, motif: 'volcano' },
  { re: /orbit|satellite|iss/i, motif: 'orbit' },
  { re: /planet|mars|venus|moon/i, motif: 'planet' },
  { re: /heart|blood|ekg/i, motif: 'heart' },
  { re: /brain|neuron/i, motif: 'brain' },
  { re: /cell|dna/i, motif: 'cell' },
  { re: /forest|tree|leaf/i, motif: 'forest' },
  { re: /ocean|whale|fish|coral/i, motif: 'ocean' },
  { re: /bird|penguin/i, motif: 'bird' },
  { re: /insect|böcek|honeybee|karınca|\bbee\b|\bant\b/i, motif: 'insect' },
  { re: /animal|hayvan|mammal|\bwolf\b|\bbear\b/i, motif: 'animal' },
  { re: /lightning|electric|şimşek/i, motif: 'lightning' },
  { re: /\bmap\b|border|sınır/i, motif: 'map_borders' },
  { re: /molecule|atom|quantum|molekül/i, motif: 'molecule' },
];

export function resolveTopicMotif(input: {
  category: CategoryId | 'vocabulary';
  title?: string;
  body?: string;
  sketchType?: string;
  tag?: string;
}): TopicMotif {
  if (input.category === 'vocabulary') return 'typographic';

  const sketch = (input.sketchType || '').trim();
  if (sketch) {
    for (const row of SKETCH_MOTIF) {
      if (row.re.test(sketch)) return row.motif;
    }
  }

  const hay = [input.title, input.body, input.tag, sketch].filter(Boolean).join(' · ');
  let best: TopicMotif | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    const match = hay.match(rule.re);
    if (!match) continue;
    // slight boost when match is in the title
    const inTitle = input.title ? rule.re.test(input.title) : false;
    const score = rule.weight + (inTitle ? 15 : 0) + Math.min(10, match[0].length);
    if (score > bestScore) {
      bestScore = score;
      best = rule.motif;
    }
  }

  if (best) return best;

  switch (input.category) {
    case 'space':
      return 'planet';
    case 'nature':
      return 'forest';
    case 'human_body':
      return 'anatomy';
    case 'history':
      return 'astrolabe';
    case 'science':
      return 'molecule';
    case 'records':
      return 'lightning';
    case 'statistics':
      return 'statistics';
    default:
      return 'generic';
  }
}

/** Backward-compatible alias for older slide/feed imports. */
export const classifyTopicMotif = resolveTopicMotif;

const MOTIF_VISUAL_FALLBACKS: Record<string, string> = {
  planet: 'planet Earth space',
  forest: 'forest canopy nature',
  anatomy: 'human brain neuron',
  astrolabe: 'ancient compass map',
  molecule: 'chemistry molecule atom',
  lightning: 'lightning storm sky',
  statistics: 'data chart animation',
};

const CATEGORY_VISUAL_FALLBACKS: Record<string, string> = {
  space: 'outer space galaxy',
  nature: 'wild nature landscape',
  human_body: 'human biology science',
  history: 'ancient architecture history',
  science: 'physics chemistry lab',
  records: 'world record extreme',
  statistics: 'data visualization graph',
};

const BANNED_VISUAL_WORDS = new Set([
  'meme',
  'reaction',
  'funny',
  'lol',
  'gif',
  'anime',
  'sticker',
  'text',
  'quote',
  'scrolly',
  'scrolla',
]);

/** Resolve a crisp 2-4 word English ASCII visualQuery suitable for GIF/media search. */
export function resolveFallbackVisualQuery(input: {
  category: CategoryId | string;
  title?: string;
  visualQuery?: string;
  factText?: string;
  tag?: string;
}): string {
  const sanitizeAsciiWords = (raw: string | undefined): string[] => {
    if (!raw) return [];
    return raw
      .replace(/[^A-Za-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2 && !BANNED_VISUAL_WORDS.has(w));
  };

  const explicitWords = sanitizeAsciiWords(input.visualQuery);
  if (explicitWords.length >= 2) {
    return explicitWords.slice(0, 4).join(' ');
  }

  const motif = resolveTopicMotif({
    category: (input.category as CategoryId) || 'science',
    title: input.title,
    body: input.factText,
    tag: input.tag,
  });

  if (explicitWords.length === 1) {
    const baseCategoryWord = (CATEGORY_VISUAL_FALLBACKS[input.category] || 'science animation')
      .split(' ')[0];
    return `${explicitWords[0]} ${baseCategoryWord}`;
  }

  return (
    MOTIF_VISUAL_FALLBACKS[motif] ||
    CATEGORY_VISUAL_FALLBACKS[input.category] ||
    'science cosmos motion'
  );
}

export interface DetailHighlights {
  deepSummary: string;
  keyInsight: string;
  curiosityHook: string;
  topicTag: string;
  sourceNote: string;
}

/** Extract engaging structured highlights for Detail cards & /fact/[slug] pages. */
export function buildStructuredDetailHighlights(
  localized: {
    factText: string;
    deepDiveDetail: string;
    tag?: string;
    sourceHint?: string;
    quiz?: { question?: string; explanation?: string; options?: string[]; correctIndex?: number };
  },
  lang: 'tr' | 'en' = 'tr'
): DetailHighlights {
  const teaser = (localized.factText || '').trim();
  const deep = (localized.deepDiveDetail || '').trim();
  const explanation = (localized.quiz?.explanation || '').trim();
  const correctOpt =
    localized.quiz?.options && typeof localized.quiz?.correctIndex === 'number'
      ? (localized.quiz.options[localized.quiz.correctIndex] || '').trim()
      : '';
  const tag = (localized.tag || '').trim() || (lang === 'tr' ? 'Mikro Keşif' : 'Micro-Discovery');
  const sourceNote =
    (localized.sourceHint || '').trim() ||
    (lang === 'tr' ? 'Doğrulanmış Bilimsel Arşiv' : 'Verified Scientific Source');

  const deepSummary = deep && deep.toLowerCase() !== teaser.toLowerCase() ? deep : teaser;
  const keyInsight =
    explanation ||
    (correctOpt
      ? lang === 'tr'
        ? `Kritik Mekanizma: ${correctOpt}`
        : `Key Mechanism: ${correctOpt}`
      : teaser);
  const curiosityHook =
    localized.quiz?.question?.trim() ||
    (lang === 'tr'
      ? 'Aşağıdaki interaktif tahminde bilimsel mekanizmayı test et!'
      : 'Test your intuition on the underlying science below!');

  return {
    deepSummary,
    keyInsight,
    curiosityHook,
    topicTag: tag,
    sourceNote,
  };
}

/** Build a vivid, non-repetitive detail article from localized fact fields (≠ short teaser). */
export function buildFactDetailArticle(
  localized: {
    factText: string;
    deepDiveDetail: string;
    tag?: string;
    sourceHint?: string;
    quiz?: { question?: string; explanation?: string; options?: string[]; correctIndex?: number };
  },
  lang: 'tr' | 'en' = 'tr'
): { article: string; wordCount: number; differsFromTeaser: boolean } {
  const teaser = (localized.factText || '').trim();
  const deep = (localized.deepDiveDetail || '').trim();
  const explanation = (localized.quiz?.explanation || '').trim();
  const tag = (localized.tag || '').trim();
  const sourceHint = (localized.sourceHint || '').trim();
  const quizQuestion = (localized.quiz?.question || '').trim();
  const quizAnswer =
    typeof localized.quiz?.correctIndex === 'number' &&
    Array.isArray(localized.quiz?.options)
      ? (localized.quiz.options[localized.quiz.correctIndex] || '').trim()
      : '';

  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const normTeaser = normalize(teaser);

  const blocks: string[] = [];
  if (deep && normalize(deep) !== normTeaser) {
    blocks.push(deep);
  }

  // Deduplicate quiz explanation at sentence level against existing deep-dive narrative
  if (explanation) {
    const currentNorm = normalize(blocks.join(' '));
    const sentences = explanation
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const freshSentences = sentences.filter((sentence) => {
      const normSent = normalize(sentence);
      if (normSent.length < 12) return !currentNorm.includes(normSent);
      return !currentNorm.includes(normSent.slice(0, Math.min(48, normSent.length)));
    });
    const freshExplanation = freshSentences.join(' ').trim();
    if (freshExplanation && normalize(freshExplanation) !== normTeaser) {
      blocks.push(freshExplanation);
    }
  }

  const currentWords = blocks.join(' ').split(/\s+/).filter(Boolean).length;

  // Only enrich thin/missing deep-dives using real card quiz insight or source framing
  if (blocks.length === 0 || currentWords < 14) {
    if (blocks.length === 0 && teaser) {
      blocks.push(teaser);
    }
    if (quizQuestion && quizAnswer && !normalize(blocks.join(' ')).includes(normalize(quizAnswer))) {
      blocks.push(
        lang === 'tr'
          ? `Kritik nokta şu soruda gizli: ${quizQuestion} Yanıtı ise "${quizAnswer}" olarak öne çıkıyor.`
          : `The real twist lies behind one question: ${quizQuestion} The surprising answer is ${quizAnswer}.`
      );
    } else if (sourceHint && !normalize(blocks.join(' ')).includes(normalize(sourceHint))) {
      blocks.push(
        lang === 'tr'
          ? `${tag ? `${tag} başlığında ` : ''}${sourceHint} verileri incelendiğinde bu tablonun sanılandan çok daha keskin bir mekanizmaya dayandığı görülüyor.`
          : `Looking closely at ${sourceHint}${tag ? ` within ${tag}` : ''}, the underlying mechanism turns out to be far more striking than intuition suggests.`
      );
    }
  }

  let article = blocks.filter(Boolean).join('\n\n').trim();
  if (!article) {
    article = deep || teaser || explanation;
  }

  const wordCount = article.split(/\s+/).filter(Boolean).length;
  const differsFromTeaser = normalize(article) !== normTeaser;
  return { article, wordCount, differsFromTeaser };
}
