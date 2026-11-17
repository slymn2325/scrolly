export type VocabPartOfSpeech = 'isim' | 'sıfat' | 'fiil' | 'zarf' | 'edat';

export interface VocabularyCard {
  id: string;
  category: 'vocabulary';
  word: string;
  phonetic: string;
  partOfSpeech: VocabPartOfSpeech;
  cefrLevel?: string;
  synonyms?: string[];
  meaningTr: string;
  definitionEn: string;
  exampleEn: string;
  exampleTr: string;
  /** 3–4 Turkish meaning choices; UI must never clip the 3rd/4th option. */
  quizOptions: [string, string, string] | [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  gifUrl?: string;
  gifQuery?: string;
  mediaType?: string;
  mediaSource?: string;
  mediaCredit?: string;
  posterUrl?: string;
}

export interface SavedVocabularyEntry {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: VocabPartOfSpeech;
  meaningTr: string;
  exampleEn: string;
  exampleTr: string;
  savedAt: string;
}
