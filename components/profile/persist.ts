import type { Language } from '@/i18n/translations';
import { applyAppearance, type AppearanceMode } from '@/lib/theme';
import type { UserMemoryState } from '@/utils/userMemory';

export const HAPTICS_STORAGE_KEY = 'scrolly_haptics_enabled';
export const APPEARANCE_EVENT = 'scrolly-set-appearance';
export const COOKIE_CHOICE_EVENT = 'scrolly-set-cookie';

export function readHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(HAPTICS_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeHapticsEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAPTICS_STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function prefersDarkScheme(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function paintAppearance(memory: UserMemoryState, appearance: AppearanceMode): UserMemoryState {
  const next = applyAppearance(memory, appearance, prefersDarkScheme());
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', next.darkMode);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AppearanceMode>(APPEARANCE_EVENT, { detail: appearance }));
  }
  return next;
}

export function paintLanguage(lang: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'en' ? 'en' : 'tr';
}

export function readCookieChoice(): 'granted' | 'denied' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const raw = window.localStorage.getItem('scrolly_consent_v2');
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {
    // Ignore storage restrictions.
  }
  return 'unknown';
}
