function triggerVibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore on unsupported or blocked environments
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
