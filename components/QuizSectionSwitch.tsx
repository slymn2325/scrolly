'use client';

import React from 'react';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';

const focusRing =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus';

export default function QuizSectionSwitch({
  section,
  lang,
}: {
  section: 'quiz' | 'leaderboard';
  lang: Language;
}) {
  const t = translations[lang];
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
      className={`cik-headline min-h-11 w-full rounded-pill px-4 ${focusRing} ${
        section === id
          ? 'bg-cik-bg-elevated text-cik-text shadow-e1'
          : 'bg-transparent text-cik-text'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="tablist"
      aria-label={t.quizSectionAria}
      className="mb-4 grid w-full grid-cols-2 gap-1 rounded-pill bg-cik-pink p-1"
    >
      {item('quiz', 'Quiz')}
      {item('leaderboard', t.quizSectionRank)}
    </div>
  );
}
