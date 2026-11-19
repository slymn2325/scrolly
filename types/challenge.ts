export interface ChallengeLocalizedQuizSnapshot {
  title: string;
  tag?: string;
  factText: string;
  deepDiveDetail?: string;
  sourceHint?: string;
  sourceName?: string;
  quiz: {
    question: string;
    options: [string, string, string];
    correctIndex: 0 | 1 | 2;
    explanation?: string;
  };
}

export interface ChallengeQuestionSnapshot {
  id: string;
  category: string;
  emoji?: string;
  sourceName?: string;
  tr: ChallengeLocalizedQuizSnapshot;
  en: ChallengeLocalizedQuizSnapshot;
}

export interface ChallengeRecord {
  code: string;
  creatorNickname: string;
  creatorScore: number;
  creatorCorrect: number;
  totalQuestions: number;
  questionIds: string[];
  questionsSnapshot: ChallengeQuestionSnapshot[];
  category: string;
  lang: 'tr' | 'en';
  createdAt: string;
}
