export const FIRST_STICKER_KEY = 'scrolly_first_sticker_celebrated_v1';
export const STREAK_SEVEN_KEY = 'scrolly_streak7_celebrated_v1';

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Ignore private-mode storage failures.
  }
}

function removeFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function readFirstStickerCelebrated(): boolean {
  return readFlag(FIRST_STICKER_KEY);
}

export function persistFirstStickerCelebrated(): void {
  writeFlag(FIRST_STICKER_KEY);
}

export function readStreakSevenCelebrated(): boolean {
  return readFlag(STREAK_SEVEN_KEY);
}

export function persistStreakSevenCelebrated(): void {
  writeFlag(STREAK_SEVEN_KEY);
}

/** Clears one-time celebration flags. Call this from memory reset. */
export function clearCelebrationFlags(): void {
  removeFlag(FIRST_STICKER_KEY);
  removeFlag(STREAK_SEVEN_KEY);
}
