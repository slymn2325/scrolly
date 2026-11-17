export type AppearanceMode = 'light' | 'dark' | 'system';

export interface DocumentThemeInput {
  darkMode: boolean;
  themeCustomized?: boolean;
  appearance?: AppearanceMode;
}

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Light is the default. Dark is applied only when the user chose it,
 * or when appearance is system and the OS prefers dark.
 */
export function resolveDocumentDark(input: DocumentThemeInput, prefersDark: boolean): boolean {
  const appearance = input.appearance;
  if (appearance === 'light' || appearance === 'dark' || appearance === 'system') {
    switch (appearance) {
      case 'light':
        return false;
      case 'dark':
        return true;
      case 'system':
        return prefersDark;
      default: {
        const neverAppearance: never = appearance;
        return neverAppearance;
      }
    }
  }
  return input.themeCustomized === true && input.darkMode === true;
}

export function applyAppearance<T extends DocumentThemeInput>(
  state: T,
  appearance: AppearanceMode,
  prefersDark: boolean,
): T & { appearance: AppearanceMode; themeCustomized: true; darkMode: boolean } {
  const next = { ...state, appearance, themeCustomized: true as const };
  return { ...next, darkMode: resolveDocumentDark(next, prefersDark) };
}
