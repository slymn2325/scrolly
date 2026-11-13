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
  factText: string;
  deepDiveDetail: string;
  sourceHint: string;
  tag?: string;
  quiz: FactQuizContent;
  guessChallenge?: GuessChallenge;
}

export interface FactCard {
  id: string;
  category: CategoryId;
  accentColor: string;
  iconName: string;
  emoji?: string;
  readingTimeSec?: number;
  tr: LocalizedContent;
  en: LocalizedContent;
}
