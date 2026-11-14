export type CategoryId =
  | 'space'
  | 'nature'
  | 'human_body'
  | 'history'
  | 'science'
  | 'records';

export interface GuessChallenge {
  type: 'slider' | 'binary';
  prompt: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  correctValue?: number;
  options?: [string, string];
  correctOptionIndex?: 0 | 1;
}

export interface FactQuizContent {
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation?: string;
}

export interface LocalizedContent {
  slug: string;
  title: string;
  teaserTitle?: string;
  factText: string;
  deepDiveDetail: string;
  sourceHint: string;
  sourceName?: string;
  sourceUrl?: string;
  tag?: string;
  quiz: FactQuizContent;
  guessChallenge?: GuessChallenge;
}

export interface FactCard {
  id: string;
  slug?: string;
  category: CategoryId;
  accentColor: string;
  iconName: string;
  emoji?: string;
  sketchType?: string;
  likesCount?: number;
  createdAt?: string;
  readingTimeSec?: number;
  sourceName?: string;
  sourceUrl?: string;
  tr: LocalizedContent;
  en: LocalizedContent;
}
