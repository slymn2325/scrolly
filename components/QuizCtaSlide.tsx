'use client';

import React from 'react';
import { ArrowDown, ListChecks } from 'lucide-react';
import { Button } from '@/components/cikartma';
import { type Language, translations } from '@/i18n/translations';

interface QuizCtaSlideProps {
  lang: Language;
  recentReadCount: number;
  cookieBannerVisible?: boolean;
  onOpenQuizHub: () => void;
  onSkipNext: () => void;
}

export default function QuizCtaSlide({
  lang,
  recentReadCount,
  cookieBannerVisible = false,
  onOpenQuizHub,
  onSkipNext,
}: QuizCtaSlideProps) {
  const t = translations[lang];
  const ready = Math.min(5, recentReadCount);

  return (
    <div
      data-testid="quiz-cta-slide"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`reels-slide relative flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-cik-bg px-4 pt-[calc(4rem+env(safe-area-inset-top))] text-cik-text select-none md:px-6 ${
        cookieBannerVisible
          ? 'pb-[calc(env(safe-area-inset-bottom)+11rem)] lg:pb-8'
          : 'pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8'
      }`}
    >
      <div className="relative mx-auto flex h-full w-full max-w-xl flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            data-testid="quiz-cta-badge"
            className="cik-footnote inline-flex items-center gap-2 rounded-pill bg-cik-pink px-4 py-2 text-cik-text"
          >
            <ListChecks size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t.quizCtaBadge}</span>
          </span>
          {ready > 0 ? (
            <span className="cik-footnote cik-tabular rounded-pill bg-cik-butter px-4 py-2 text-cik-butter-text">
              {ready}/5
            </span>
          ) : null}
        </div>

        <div className="my-auto rounded-sticker bg-cik-surface p-5 shadow-sticker">
          <h2 className="cik-title-2 text-cik-text">{t.quizCtaTitle}</h2>
          <p className="cik-body mt-2 text-cik-text-2">{t.quizCtaSubtitle}</p>
          <Button data-testid="quiz-cta-slide-btn" className="mt-5 w-full" onClick={onOpenQuizHub}>
            {t.quizCtaPrimaryBtn}
          </Button>
        </div>

        <button
          type="button"
          onClick={onSkipNext}
          data-testid="quiz-cta-continue-btn"
          className="cik-footnote mx-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-cik-surface px-4 text-cik-text-2 shadow-e1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
        >
          <span>{t.quizCtaContinueHint}</span>
          <ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
