const HAPTICS_STORAGE_KEY = 'scrolly_haptics_enabled';

function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(HAPTICS_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

function triggerVibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Missing or blocked vibration stays silent.
  }
}

export function vibrateTap(ms = 12): void {
  triggerVibrate(ms);
}

export function vibrateDoubleTap(ms = 12): void {
  triggerVibrate(ms);
}

export function vibrateFlip(ms = 12): void {
  triggerVibrate(ms);
}

export function vibrateThreshold(ms = 12): void {
  triggerVibrate(ms);
}

export function vibrateSheet(ms = 12): void {
  triggerVibrate(ms);
}

export function vibrateSuccess(): void {
  triggerVibrate([12, 35, 12]);
}
