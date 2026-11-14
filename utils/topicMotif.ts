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
  | 'typographic'
  | 'generic';

/** Higher weight = more specific. First max score wins. */
const RULES: Array<{ motif: TopicMotif; re: RegExp; weight: number }> = [
  // —— Ultra-specific card topics ——
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

  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const deepSameAsTeaser = deep && teaser && normalize(deep) === normalize(teaser);

  if (!deep || deepSameAsTeaser) {
    if (teaser && !blocks.includes(teaser)) {
      if (!deep) blocks.unshift(teaser);
    }
  }

  if (explanation && !blocks.some((b) => normalize(b).includes(normalize(explanation).slice(0, 40)))) {
    blocks.push(explanation);
  }

  void question;

  if (tag) {
    blocks.push(`Konu başlığı: ${tag}. Bu kart, aynı temadaki diğer bilgilerle birlikte keşfetme akışında yer alır.`);
  }
  if (sourceHint) {
    blocks.push(
      `Araştırmacılar ve kurumlar bu gözlemi ${sourceHint} gibi kaynaklarda belgelemiştir. Tam metin ve atıflar için kaynak bağlantısını veya detay sayfasını kullanabilirsiniz.`
    );
  }

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
