/**
 * Legacy Language Lab helpers.
 * Fake phonetic / "bağlam terimi" extractors were removed.
 * Vocabulary Reels now live in `data/vocabularyFacts.ts` + `VocabularySlide`.
 */
export {
  isVocabWordSaved,
  loadSavedVocabNotebook,
  speakVocabularyText,
  toggleSaveVocabularyCard as toggleSaveVocabEntry,
} from '@/utils/vocabNotebook';

export type { SavedVocabularyEntry as SavedVocabEntry } from '@/types/vocabulary';
