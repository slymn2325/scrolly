import type { SavedVocabularyEntry, VocabularyCard } from '@/types/vocabulary';

const VOCAB_NOTEBOOK_KEY = 'scrolly_vocab_notebook_v1';
let activeSpeechResetTimer: ReturnType<typeof setTimeout> | null = null;

export interface SpeakVocabularyHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export function speakVocabularyText(
  text: string,
  locale: 'en-US' | 'tr-TR',
  rate = 1,
  handlers?: SpeakVocabularyHandlers
): boolean {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    handlers?.onError?.();
    return false;
  }
  try {
    if (activeSpeechResetTimer) {
      clearTimeout(activeSpeechResetTimer);
      activeSpeechResetTimer = null;
    }
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
    let finished = false;
    const finishCleanly = () => {
      if (finished) return;
      finished = true;
      if (activeSpeechResetTimer) {
        clearTimeout(activeSpeechResetTimer);
        activeSpeechResetTimer = null;
      }
      handlers?.onEnd?.();
    };
    utterance.onstart = () => {
      handlers?.onStart?.();
    };
    utterance.onend = finishCleanly;
    utterance.onerror = (event) => {
      if (finished) return;
      finished = true;
      if (activeSpeechResetTimer) {
        clearTimeout(activeSpeechResetTimer);
        activeSpeechResetTimer = null;
      }
      const errCode = (event as { error?: string }).error;
      if (errCode === 'interrupted' || errCode === 'canceled') {
        handlers?.onEnd?.();
      } else {
        handlers?.onError?.();
      }
    };
    handlers?.onStart?.();
    const estimatedMs = Math.max(1600, Math.round((text.length * 95) / Math.max(0.5, rate)));
    activeSpeechResetTimer = setTimeout(finishCleanly, estimatedMs);
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    handlers?.onError?.();
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

export function mergeSavedVocabNotebook(entries: SavedVocabularyEntry[]): SavedVocabularyEntry[] {
  if (typeof window === 'undefined' || !Array.isArray(entries) || entries.length === 0) {
    return loadSavedVocabNotebook();
  }
  const current = loadSavedVocabNotebook();
  const byWord = new Map<string, SavedVocabularyEntry>();
  for (const entry of current) {
    const key = entry.word?.trim().toLowerCase();
    if (key) byWord.set(key, entry);
  }
  let changed = false;
  for (const entry of entries) {
    if (!entry || typeof entry.word !== 'string') continue;
    const key = entry.word.trim().toLowerCase();
    if (!key) continue;
    if (!byWord.has(key)) {
      byWord.set(key, entry);
      changed = true;
    }
  }
  const next = Array.from(byWord.values()).slice(0, 120);
  if (changed) {
    try {
      window.localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('scrolly-vocab-updated'));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}
