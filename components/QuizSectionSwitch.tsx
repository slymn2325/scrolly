'use client';

import React from 'react';
import type { Language } from '@/i18n/translations';

export default function QuizSectionSwitch({
  section,
  lang,
}: {
  section: 'quiz' | 'leaderboard';
  lang: Language;
}) {
  const choose = (next: 'quiz' | 'leaderboard') => {
    window.dispatchEvent(new CustomEvent('scrolly-quiz-section', { detail: { section: next } }));
  };
  const item = (id: 'quiz' | 'leaderboard', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={section === id}
      data-testid={`quiz-section-${id}`}
      onClick={() => choose(id)}
      className={`min-h-[40px] w-full rounded-full text-sm font-semibold transition-colors duration-150 ${
        section === id ? 'bg-white text-slate-900 shadow-pill' : 'text-slate-700 dark:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="tablist"
      aria-label={lang === 'tr' ? 'Quiz ve liderlik' : 'Quiz and leaderboard'}
      className="mx-auto mb-3 grid w-full max-w-[280px] grid-cols-2 gap-1 rounded-full bg-violet-soft p-1"
    >
      {item('quiz', 'Quiz')}
      {item('leaderboard', lang === 'tr' ? 'Liderlik' : 'Leaderboard')}
    </div>
  );
}
