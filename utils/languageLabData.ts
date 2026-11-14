import type { CategoryId, FactCard } from '@/types/fact';

export interface VocabItem {
  id: string;
  termEn: string;
  termTr: string;
  partOfSpeech: string;
  phonetic: string;
  contextEn: string;
  contextTr: string;
  category: CategoryId;
}

export interface FillBlankChallenge {
  sentenceWithBlank: string;
  fullSentence: string;
  targetWord: string;
  targetMeaningTr: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export interface SavedVocabEntry {
  id: string;
  termEn: string;
  termTr: string;
  partOfSpeech: string;
  phonetic: string;
  exampleEn: string;
  exampleTr: string;
  factId: string;
  savedAt: string;
}

interface GlossaryEntry {
  key: string;
  aliases?: string[];
  termEn: string;
  termTr: string;
  pos: string;
  phonetic: string;
  category?: CategoryId;
}

const SCIENTIFIC_GLOSSARY: GlossaryEntry[] = [
  { key: 'superfluid', termEn: 'superfluid', termTr: 'süperakışkan', pos: 'noun / adj', phonetic: '/ˌsuː.pərˈfluː.ɪd/', category: 'science' },
  { key: 'perihelion', termEn: 'perihelion', termTr: 'günberi (en yakın nokta)', pos: 'noun', phonetic: '/ˌpɛr.ɪˈhiː.li.ən/', category: 'space' },
  { key: 'bioluminescence', aliases: ['bioluminescent'], termEn: 'bioluminescence', termTr: 'biyolüminesans (canlı ışık)', pos: 'noun', phonetic: '/ˌbaɪ.oʊ.luː.mɪˈnɛs.əns/', category: 'nature' },
  { key: 'entanglement', aliases: ['entangled'], termEn: 'entanglement', termTr: 'kuantum dolanıklık', pos: 'noun', phonetic: '/ɪnˈtæŋ.ɡəl.mənt/', category: 'science' },
  { key: 'photon', aliases: ['photons'], termEn: 'photon', termTr: 'foton (ışık parçacığı)', pos: 'noun', phonetic: '/ˈfoʊ.tɑːn/', category: 'science' },
  { key: 'black hole', aliases: ['event horizon', 'singularity'], termEn: 'black hole', termTr: 'kara delik', pos: 'noun phrase', phonetic: '/blæk hoʊl/', category: 'space' },
  { key: 'neutron star', aliases: ['neutron', 'pulsar'], termEn: 'neutron star', termTr: 'nötron yıldızı', pos: 'noun phrase', phonetic: '/ˈnuː.trɑːn stɑːr/', category: 'space' },
  { key: 'orbit', aliases: ['orbital', 'orbits'], termEn: 'orbit', termTr: 'yörünge', pos: 'noun / verb', phonetic: '/ˈɔːr.bɪt/', category: 'space' },
  { key: 'gravity', aliases: ['gravitational'], termEn: 'gravity', termTr: 'kütleçekimi', pos: 'noun', phonetic: '/ˈɡræv.ɪ.ti/', category: 'space' },
  { key: 'atmosphere', aliases: ['atmospheric'], termEn: 'atmosphere', termTr: 'atmosfer', pos: 'noun', phonetic: '/ˈæt.məs.fɪr/', category: 'space' },
  { key: 'nebula', termEn: 'nebula', termTr: 'bulutsu', pos: 'noun', phonetic: '/ˈnɛb.jə.lə/', category: 'space' },
  { key: 'galaxy', aliases: ['galaxies'], termEn: 'galaxy', termTr: 'galaksi (gökada)', pos: 'noun', phonetic: '/ˈɡæl.ək.si/', category: 'space' },
  { key: 'eclipse', termEn: 'eclipse', termTr: 'tutulma', pos: 'noun', phonetic: '/ɪˈklɪps/', category: 'space' },
  { key: 'radiation', aliases: ['radioactive'], termEn: 'radiation', termTr: 'radyasyon (ışınım)', pos: 'noun', phonetic: '/ˌreɪ.diˈeɪ.ʃən/', category: 'science' },
  { key: 'tardigrade', aliases: ['water bear'], termEn: 'tardigrade', termTr: 'su ayısı (tardigrad)', pos: 'noun', phonetic: '/ˈtɑːr.dɪ.ɡreɪd/', category: 'nature' },
  { key: 'photosynthesis', termEn: 'photosynthesis', termTr: 'fotosentez', pos: 'noun', phonetic: '/ˌfoʊ.toʊˈsɪn.θə.sɪs/', category: 'nature' },
  { key: 'ecosystem', aliases: ['habitat'], termEn: 'ecosystem', termTr: 'ekosistem', pos: 'noun', phonetic: '/ˈiː.koʊ.sɪs.təm/', category: 'nature' },
  { key: 'migration', aliases: ['migrate'], termEn: 'migration', termTr: 'göç', pos: 'noun', phonetic: '/maɪˈɡreɪ.ʃən/', category: 'nature' },
  { key: 'camouflage', termEn: 'camouflage', termTr: 'kamuflaj (gizlenme)', pos: 'noun / verb', phonetic: '/ˈkæm.ə.flɑːʒ/', category: 'nature' },
  { key: 'venom', aliases: ['venomous'], termEn: 'venom', termTr: 'hayvansal zehir', pos: 'noun', phonetic: '/ˈvɛn.əm/', category: 'nature' },
  { key: 'coral', termEn: 'coral', termTr: 'mercan', pos: 'noun', phonetic: '/ˈkɔːr.əl/', category: 'nature' },
  { key: 'synapse', aliases: ['synapses', 'neural'], termEn: 'synapse', termTr: 'sinaps (sinir kavşağı)', pos: 'noun', phonetic: '/ˈsɪn.æps/', category: 'human_body' },
  { key: 'neuron', aliases: ['neurons'], termEn: 'neuron', termTr: 'nöron (sinir hücresi)', pos: 'noun', phonetic: '/ˈnʊr.ɑːn/', category: 'human_body' },
  { key: 'cornea', termEn: 'cornea', termTr: 'kornea (saydam tabaka)', pos: 'noun', phonetic: '/ˈkɔːr.ni.ə/', category: 'human_body' },
  { key: 'circulatory', aliases: ['blood vessel', 'capillary'], termEn: 'blood vessel', termTr: 'kan damarı', pos: 'noun phrase', phonetic: '/blʌd ˈvɛs.əl/', category: 'human_body' },
  { key: 'metabolism', aliases: ['metabolic'], termEn: 'metabolism', termTr: 'metabolizma', pos: 'noun', phonetic: '/məˈtæb.ə.lɪz.əm/', category: 'human_body' },
  { key: 'dna', termEn: 'DNA', termTr: 'DNA (genetik şifre)', pos: 'noun', phonetic: '/ˌdiː.ɛnˈeɪ/', category: 'human_body' },
  { key: 'enzyme', aliases: ['enzymes'], termEn: 'enzyme', termTr: 'enzim', pos: 'noun', phonetic: '/ˈɛn.zaɪm/', category: 'human_body' },
  { key: 'immune', aliases: ['immunity'], termEn: 'immune system', termTr: 'bağışıklık sistemi', pos: 'noun phrase', phonetic: '/ɪˈmjuːn ˈsɪs.təm/', category: 'human_body' },
  { key: 'oxygen', termEn: 'oxygen', termTr: 'oksijen', pos: 'noun', phonetic: '/ˈɑːk.sɪ.dʒən/', category: 'human_body' },
  { key: 'artifact', aliases: ['relic'], termEn: 'artifact', termTr: 'tarihî eser / kalıntı', pos: 'noun', phonetic: '/ˈɑːr.tə.fækt/', category: 'history' },
  { key: 'treaty', aliases: ['pact'], termEn: 'treaty', termTr: 'antlaşma', pos: 'noun', phonetic: '/ˈtriː.ti/', category: 'history' },
  { key: 'excavation', aliases: ['archaeological', 'archaeologists'], termEn: 'excavation', termTr: 'arkeolojik kazı', pos: 'noun', phonetic: '/ˌɛk.skəˈveɪ.ʃən/', category: 'history' },
  { key: 'manuscript', aliases: ['scroll', 'tablet'], termEn: 'manuscript', termTr: 'el yazması', pos: 'noun', phonetic: '/ˈmæn.jə.skrɪpt/', category: 'history' },
  { key: 'civilization', aliases: ['empire'], termEn: 'civilization', termTr: 'medeniyet (uygarlık)', pos: 'noun', phonetic: '/ˌsɪv.ə.ləˈzeɪ.ʃən/', category: 'history' },
  { key: 'monument', aliases: ['megalith'], termEn: 'monument', termTr: 'anıt', pos: 'noun', phonetic: '/ˈmɑːn.jə.mənt/', category: 'history' },
  { key: 'quantum', termEn: 'quantum', termTr: 'kuantum', pos: 'adj / noun', phonetic: '/ˈkwɑːn.təm/', category: 'science' },
  { key: 'molecule', aliases: ['molecules', 'molecular'], termEn: 'molecule', termTr: 'molekül', pos: 'noun', phonetic: '/ˈmɑːl.ɪ.kjuːl/', category: 'science' },
  { key: 'friction', termEn: 'friction', termTr: 'sürtünme', pos: 'noun', phonetic: '/ˈfrɪk.ʃən/', category: 'science' },
  { key: 'viscosity', aliases: ['viscous'], termEn: 'viscosity', termTr: 'akışkanlık direnci', pos: 'noun', phonetic: '/vɪsˈkɑː.sə.ti/', category: 'science' },
  { key: 'velocity', aliases: ['speed'], termEn: 'velocity', termTr: 'hız (sürat)', pos: 'noun', phonetic: '/vəˈlɑː.sə.ti/', category: 'science' },
  { key: 'pressure', aliases: ['compression'], termEn: 'pressure', termTr: 'basınç', pos: 'noun', phonetic: '/ˈprɛʃ.ər/', category: 'science' },
  { key: 'temperature', aliases: ['kelvin', 'celsius'], termEn: 'temperature', termTr: 'sıcaklık', pos: 'noun', phonetic: '/ˈtɛm.prə.tʃər/', category: 'science' },
  { key: 'magnetic', aliases: ['magnetism', 'magnet'], termEn: 'magnetic field', termTr: 'manyetik alan', pos: 'noun phrase', phonetic: '/mæɡˈnɛt.ɪk fiːld/', category: 'science' },
  { key: 'electricity', aliases: ['lightning', 'electric'], termEn: 'electric charge', termTr: 'elektrik yükü', pos: 'noun phrase', phonetic: '/ɪˈlɛk.trɪk tʃɑːrdʒ/', category: 'science' },
  { key: 'crystal', aliases: ['crystalline'], termEn: 'crystal', termTr: 'kristal', pos: 'noun', phonetic: '/ˈkrɪs.təl/', category: 'science' },
  { key: 'decibel', aliases: ['decibels', 'acoustic'], termEn: 'decibel', termTr: 'desibel (ses birimi)', pos: 'noun', phonetic: '/ˈdɛs.ə.bɛl/', category: 'records' },
  { key: 'altitude', aliases: ['elevation', 'summit'], termEn: 'altitude', termTr: 'irtifa (yükseklik)', pos: 'noun', phonetic: '/ˈæl.tə.tuːd/', category: 'records' },
  { key: 'depth', aliases: ['deepest', 'trench'], termEn: 'depth', termTr: 'derinlik', pos: 'noun', phonetic: '/dɛpθ/', category: 'records' },
  { key: 'density', aliases: ['dense'], termEn: 'density', termTr: 'yoğunluk', pos: 'noun', phonetic: '/ˈdɛn.sə.ti/', category: 'science' },
  { key: 'wavelength', aliases: ['frequency'], termEn: 'frequency', termTr: 'frekans (sıklık)', pos: 'noun', phonetic: '/ˈfriː.kwən.si/', category: 'science' },
  { key: 'evolution', aliases: ['species'], termEn: 'species', termTr: 'canlı türü', pos: 'noun', phonetic: '/ˈspiː.ʃiːz/', category: 'nature' },
  { key: 'volcano', aliases: ['volcanic', 'lava'], termEn: 'volcano', termTr: 'yanardağ (volkan)', pos: 'noun', phonetic: '/vɑːlˈkeɪ.noʊ/', category: 'nature' },
  { key: 'glacier', aliases: ['ice sheet', 'antarctica'], termEn: 'glacier', termTr: 'buzul', pos: 'noun', phonetic: '/ˈɡleɪ.ʃər/', category: 'nature' },
  { key: 'heart', aliases: ['heartbeat', 'pulse'], termEn: 'heartbeat', termTr: 'kalp atışı', pos: 'noun', phonetic: '/ˈhɑːrt.biːt/', category: 'human_body' },
  { key: 'bone', aliases: ['skeleton', 'bones'], termEn: 'skeleton', termTr: 'iskelet', pos: 'noun', phonetic: '/ˈskɛl.ə.tən/', category: 'human_body' },
  { key: 'galaxy cluster', aliases: ['universe', 'cosmos'], termEn: 'cosmos', termTr: 'kozmos (evren)', pos: 'noun', phonetic: '/ˈkɑːz.moʊs/', category: 'space' },
  { key: 'discovery', aliases: ['discovered', 'research'], termEn: 'discovery', termTr: 'keşif', pos: 'noun', phonetic: '/dɪˈskʌv.ər.i/', category: 'science' },
  { key: 'record', aliases: ['fastest', 'largest', 'oldest'], termEn: 'record', termTr: 'rekor (en uç değer)', pos: 'noun', phonetic: '/ˈrɛk.ərd/', category: 'records' },
];

const STOP_WORDS_EN = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'alone', 'along', 'already', 'although',
  'always', 'among', 'another', 'around', 'became', 'because', 'before', 'behind', 'being', 'below',
  'between', 'beyond', 'could', 'doing', 'during', 'earth', 'every', 'first', 'found', 'further',
  'great', 'having', 'heavy', 'higher', 'human', 'inside', 'large', 'later', 'least', 'level',
  'light', 'local', 'longer', 'makes', 'making', 'maybe', 'might', 'million', 'millions', 'months',
  'nearly', 'never', 'other', 'others', 'outer', 'people', 'place', 'point', 'quite', 'rather',
  'really', 'right', 'roughly', 'second', 'several', 'should', 'shows', 'single', 'since', 'small',
  'smaller', 'somehow', 'someone', 'something', 'sometimes', 'still', 'study', 'their', 'there',
  'these', 'thing', 'things', 'think', 'third', 'those', 'though', 'three', 'through', 'times',
  'today', 'together', 'total', 'under', 'until', 'using', 'usually', 'values', 'varies', 'water',
  'where', 'which', 'while', 'whole', 'whose', 'within', 'without', 'world', 'would', 'years',
]);

const VOCAB_NOTEBOOK_KEY = 'scrolly_vocab_notebook_v1';
const VOCAB_STREAK_KEY = 'scrolly_vocab_streak_v1';

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractContextSentence(text: string, term: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
  return sentences.find((s) => regex.test(s)) ?? sentences[0] ?? text;
}

/**
 * Extracts 3-5 interactive bilingual vocabulary items for any fact card,
 * matching curated scientific terms first and filling gaps from long content words.
 */
export function extractVocabularyForFact(fact: FactCard): VocabItem[] {
  const combinedEn = `${fact.en.title} ${fact.en.factText} ${fact.en.deepDiveDetail || ''}`;
  const lowerEn = combinedEn.toLowerCase();
  const matched: VocabItem[] = [];
  const seenKeys = new Set<string>();

  for (const entry of SCIENTIFIC_GLOSSARY) {
    const candidates = [entry.key, ...(entry.aliases ?? [])];
    const hit = candidates.find((candidate) => {
      const re = new RegExp(`\\b${escapeRegExp(candidate.toLowerCase())}\\b`, 'i');
      return re.test(lowerEn);
    });
    if (hit && !seenKeys.has(entry.termEn.toLowerCase())) {
      seenKeys.add(entry.termEn.toLowerCase());
      matched.push({
        id: `${fact.id}__${entry.key.replace(/\s+/g, '-')}`,
        termEn: entry.termEn,
        termTr: entry.termTr,
        partOfSpeech: entry.pos,
        phonetic: entry.phonetic,
        contextEn: extractContextSentence(`${fact.en.title}. ${fact.en.factText}`, hit),
        contextTr: extractContextSentence(`${fact.tr.title}. ${fact.tr.factText}`, fact.tr.title.split(' ')[0] ?? ''),
        category: entry.category ?? fact.category,
      });
    }
    if (matched.length >= 4) break;
  }

  // Fallback: extract memorable long domain words from the English fact sentence
  if (matched.length < 3) {
    const tokens = combinedEn
      .replace(/[^a-zA-Z\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 7 && !STOP_WORDS_EN.has(word.toLowerCase()));

    for (const token of tokens) {
      const normalized = token.toLowerCase();
      if (seenKeys.has(normalized)) continue;
      seenKeys.add(normalized);
      const matchingTrWord =
        fact.tr.factText
          .split(/\s+/)
          .find((w) => w.length >= 5) ?? fact.tr.title.split(/\s+/)[0] ?? '';

      matched.push({
        id: `${fact.id}__dyn-${normalized}`,
        termEn: normalized,
        termTr: `${matchingTrWord.replace(/[.,!?;:"]/g, '')} (bağlam terimi)`,
        partOfSpeech: 'domain term',
        phonetic: `/${normalized.slice(0, 4)}…/`,
        contextEn: extractContextSentence(`${fact.en.title}. ${fact.en.factText}`, normalized),
        contextTr: `${fact.tr.title}. ${fact.tr.factText}`.split(/(?<=[.!?])\s+/)[0] ?? fact.tr.title,
        category: fact.category,
      });
      if (matched.length >= 3) break;
    }
  }

  // Ensure every card has at least 2 items even for ultra-short text
  if (matched.length < 2) {
    for (const fallback of SCIENTIFIC_GLOSSARY) {
      if (fallback.category === fact.category && !seenKeys.has(fallback.termEn.toLowerCase())) {
        seenKeys.add(fallback.termEn.toLowerCase());
        matched.push({
          id: `${fact.id}__cat-${fallback.key.replace(/\s+/g, '-')}`,
          termEn: fallback.termEn,
          termTr: fallback.termTr,
          partOfSpeech: fallback.pos,
          phonetic: fallback.phonetic,
          contextEn: `${fact.en.title}. ${fact.en.factText}`,
          contextTr: `${fact.tr.title}. ${fact.tr.factText}`,
          category: fact.category,
        });
      }
      if (matched.length >= 3) break;
    }
  }

  return matched.slice(0, 4);
}

/**
 * Builds a deterministic 3-option "Fill the Blank" mini exercise from the card's English sentence.
 */
export function buildFillBlankChallenge(fact: FactCard): FillBlankChallenge {
  const vocab = extractVocabularyForFact(fact);
  const fullText = `${fact.en.title}. ${fact.en.factText}`;

  let targetWord = '';
  let targetMeaningTr = '';

  for (const item of vocab) {
    const regex = new RegExp(`\\b(${escapeRegExp(item.termEn)})\\b`, 'i');
    const match = regex.exec(fullText);
    if (match) {
      targetWord = match[1];
      targetMeaningTr = item.termTr;
      break;
    }
  }

  if (!targetWord) {
    const rawWords = fullText
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOP_WORDS_EN.has(w.toLowerCase()));
    targetWord = rawWords[0] ?? 'energy';
    targetMeaningTr = fact.tr.title;
  }

  const blankRegex = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`, 'i');
  const firstSentence =
    fullText
      .split(/(?<=[.!?])\s+/)
      .find((s) => blankRegex.test(s)) ?? fact.en.factText;
  const sentenceWithBlank = firstSentence.replace(blankRegex, '_____');

  // Pick 2 plausible distractors from other glossary words of similar category/general science
  const distractorPool = SCIENTIFIC_GLOSSARY.map((g) => g.termEn).filter(
    (w) => w.toLowerCase() !== targetWord.toLowerCase() && !w.includes(' ')
  );

  const seed = hashSeed(fact.id + targetWord);
  const d1 = distractorPool[seed % distractorPool.length] || 'gravity';
  const d2 = distractorPool[(seed + 7) % distractorPool.length] || 'molecule';
  const rawOptions = [targetWord, d1 === targetWord ? 'photon' : d1, d2 === targetWord || d2 === d1 ? 'velocity' : d2];

  const correctIndex = (seed % 3) as 0 | 1 | 2;
  const arranged: [string, string, string] = ['', '', ''];
  arranged[correctIndex] = rawOptions[0];
  let idx = 1;
  for (let i = 0; i < 3; i += 1) {
    if (i !== correctIndex) {
      arranged[i] = rawOptions[idx];
      idx += 1;
    }
  }

  return {
    sentenceWithBlank,
    fullSentence: firstSentence,
    targetWord,
    targetMeaningTr,
    options: arranged,
    correctIndex,
  };
}

export function loadSavedVocabNotebook(): SavedVocabEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VOCAB_NOTEBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedVocabEntry[]) : [];
  } catch {
    return [];
  }
}

export function isVocabWordSaved(termEn: string): boolean {
  const target = termEn.trim().toLowerCase();
  return loadSavedVocabNotebook().some((item) => item.termEn.trim().toLowerCase() === target);
}

export function toggleSaveVocabEntry(entry: Omit<SavedVocabEntry, 'savedAt'>): {
  saved: boolean;
  entries: SavedVocabEntry[];
} {
  if (typeof window === 'undefined') return { saved: false, entries: [] };
  const current = loadSavedVocabNotebook();
  const normalized = entry.termEn.trim().toLowerCase();
  const exists = current.some((item) => item.termEn.trim().toLowerCase() === normalized);

  const next = exists
    ? current.filter((item) => item.termEn.trim().toLowerCase() !== normalized)
    : [{ ...entry, savedAt: new Date().toISOString() }, ...current].slice(0, 120);

  try {
    window.localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('scrolly-vocab-updated'));
  } catch {
    // Ignore storage quota errors
  }

  return { saved: !exists, entries: next };
}

export function loadVocabStreak(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(VOCAB_STREAK_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function incrementVocabStreak(): number {
  const next = loadVocabStreak() + 1;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOCAB_STREAK_KEY, String(next));
      window.dispatchEvent(new Event('scrolly-vocab-updated'));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function speakVocabularyText(text: string, locale: 'en-US' | 'tr-TR'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = locale === 'en-US' ? 0.92 : 0.96;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = locale.slice(0, 2).toLowerCase();
    const matchedVoice =
      voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
