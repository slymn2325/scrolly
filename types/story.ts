export type StoryLanguage = 'tr' | 'en';
export type StoryThemeMode = 'dark' | 'light';

export interface StoryTheme {
  mode: StoryThemeMode;
  accent: string;
}

export interface StoryCardItem {
  id: string;
  headline: string;
  body: string;
  question: string;
  options: string[];
  correctIndex: number;
  sourceLabel: string;
  mediaUrl: string;
}

export interface StoryRecord {
  id: string;
  title: string;
  sourceUrl: string | null;
  language: StoryLanguage;
  theme: StoryTheme;
  cards: StoryCardItem[];
  viewsCount: number;
  completionsCount: number;
  createdAt: string;
}

export interface StoryDraft {
  title: string;
  sourceUrl: string | null;
  language: StoryLanguage;
  cards: StoryCardItem[];
}

export const STORY_ACCENT_PRESETS: ReadonlyArray<{ id: string; label: string; hex: string }> = [
  { id: 'violet', label: 'Violet', hex: '#7C3AED' },
  { id: 'rose', label: 'Berry Rose', hex: '#C44569' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'sky', label: 'Sky Blue', hex: '#0284C7' },
  { id: 'amber', label: 'Amber', hex: '#D97706' },
  { id: 'indigo', label: 'Indigo', hex: '#6366F1' },
];

export const DEFAULT_STORY_THEME: StoryTheme = {
  mode: 'dark',
  accent: '#7C3AED',
};
