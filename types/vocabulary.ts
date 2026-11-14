export type VocabPartOfSpeech = 'isim' | 'sıfat' | 'fiil' | 'zarf' | 'edat';

export interface VocabularyCard {
  id: string;
  category: 'vocabulary';
  word: string;
  phonetic: string;
  partOfSpeech: VocabPartOfSpeech;
  meaningTr: string;
  definitionEn: string;
  exampleEn: string;
  exampleTr: string;
  quizOptions: [string, string, string];
  correctIndex: 0 | 1 | 2;
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
