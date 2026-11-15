import type { SavedVocabularyEntry, VocabularyCard } from '@/types/vocabulary';

const VOCAB_NOTEBOOK_KEY = 'scrolly_vocab_notebook_v1';

export function speakVocabularyText(text: string, locale: 'en-US' | 'tr-TR', rate = 1): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = rate;
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

export function loadSavedVocabNotebook(): SavedVocabularyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VOCAB_NOTEBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedVocabularyEntry[]) : [];
  } catch {
    return [];
  }
}

export function isVocabWordSaved(word: string): boolean {
  const target = word.trim().toLowerCase();
  return loadSavedVocabNotebook().some((item) => item.word.trim().toLowerCase() === target);
}

export function toggleSaveVocabularyCard(card: VocabularyCard): {
  saved: boolean;
  entries: SavedVocabularyEntry[];
} {
  if (typeof window === 'undefined') return { saved: false, entries: [] };
  const current = loadSavedVocabNotebook();
  const normalized = card.word.trim().toLowerCase();
  const exists = current.some((item) => item.word.trim().toLowerCase() === normalized);

  const next = exists
    ? current.filter((item) => item.word.trim().toLowerCase() !== normalized)
    : [
        {
          id: card.id,
          word: card.word,
          phonetic: card.phonetic,
          partOfSpeech: card.partOfSpeech,
          meaningTr: card.meaningTr,
          exampleEn: card.exampleEn,
          exampleTr: card.exampleTr,
          savedAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 120);

  try {
    window.localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('scrolly-vocab-updated'));
  } catch {
    // Ignore storage quota errors
  }

  return { saved: !exists, entries: next };
}

export function removeSavedVocabWord(word: string): SavedVocabularyEntry[] {
  if (typeof window === 'undefined') return [];
  const target = word.trim().toLowerCase();
  const next = loadSavedVocabNotebook().filter(
    (item) => item.word.trim().toLowerCase() !== target
  );
  try {
    window.localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('scrolly-vocab-updated'));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function clearVocabNotebook(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(VOCAB_NOTEBOOK_KEY);
    window.dispatchEvent(new Event('scrolly-vocab-updated'));
  } catch {
    // Ignore storage quota errors
  }
}
