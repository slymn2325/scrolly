'use client';

import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Brain, Calendar, CheckCircle2, Timer, Trophy, X } from 'lucide-react';
import { IconButton } from '@/components/cikartma';
import { CATEGORIES, type Language, translations, VOCABULARY_META } from '@/i18n/translations';
import { sheetTransition } from '@/lib/motion';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';
import { useEscapeClose } from '@/utils/useEscapeClose';

export type QuizModeChoice = 'daily' | 'weekly' | 'memory' | 'vocabulary';

interface QuizHubModalProps {
  open: boolean;
  lang: Language;
  dailyCompleted: boolean;
  dailyBestScore: number;
  recentCount: number;
  presentation?: 'modal' | 'page';
  onSelectMode: (mode: QuizModeChoice) => void;
  onClose: () => void;
  onButtonPop: () => void;
}

const focusRing =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus';

const pagePad =
  'px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-6 lg:px-8 lg:pb-8 lg:pt-8';

export default function QuizHubModal({
  open,
  lang,
  dailyCompleted,
  dailyBestScore,
  recentCount,
  presentation = 'modal',
  onSelectMode,
  onClose,
  onButtonPop,
}: QuizHubModalProps) {
  const t = translations[lang];
  const isPage = presentation === 'page';
  const reduced = useReducedMotion() === true;
  const topicDomains = [...CATEGORIES.filter((c) => c.id !== 'all'), VOCABULARY_META];
  const clampedRecent = Math.min(5, Math.max(0, recentCount));

  useEscapeClose(open && !isPage, onClose);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadImg = new window.Image();
    preloadImg.decoding = 'sync';
    preloadImg.src = STATE_ILLUSTRATION_PATHS.quizCelebration;
  }, []);

  if (!open) return null;

  const modes: Array<{
    id: QuizModeChoice;
    testId: string;
    title: string;
    body: string;
    icon: React.ReactNode;
    meta?: string;
  }> = [
    {
      id: 'daily',
      testId: 'start-daily-sprint-btn',
      title: t.dailySprintTitle,
      body: t.dailySprintDesc,
      icon: <Calendar size={24} strokeWidth={2} aria-hidden="true" />,
      meta: dailyCompleted
        ? dailyBestScore > 0
          ? `${dailyBestScore} XP`
          : t.dailySprintDoneBadge
        : undefined,
    },
    {
      id: 'weekly',
      testId: 'start-weekly-marathon-btn',
      title: t.weeklyMarathonTitle,
      body: t.weeklyMarathonDesc,
      icon: <Trophy size={24} strokeWidth={2} aria-hidden="true" />,
      meta: '2x XP',
    },
    {
      id: 'memory',
      testId: 'start-memory-quiz-btn',
      title: t.memoryQuizTitle,
      body: t.memoryQuizDesc,
      icon: <Brain size={24} strokeWidth={2} aria-hidden="true" />,
      meta: `${clampedRecent}/5`,
    },
    {
      id: 'vocabulary',
      testId: 'start-vocab-quiz-btn',
      title: t.wordLabTitle,
      body: t.wordLabDesc,
      icon: <BookOpen size={24} strokeWidth={2} aria-hidden="true" />,
      meta: 'B1–C2',
    },
  ];

  const body = (
    <>
      {!isPage && (
        <div className="absolute right-3 top-3">
          <IconButton
            label={t.sheetClose}
            data-testid="quiz-hub-close-btn"
            onClick={() => {
              onButtonPop();
              onClose();
            }}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </div>
      )}

      <div className="flex items-center gap-4">
        <img
          src={STATE_ILLUSTRATION_PATHS.quizCelebration}
          alt=""
          aria-hidden="true"
          width={72}
          height={72}
          className="h-16 w-16 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <h2 className="cik-title-3 text-cik-text">{t.quizHubTitle}</h2>
          <p className="cik-subhead mt-1 text-cik-text-2">{t.quizHubSubtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {topicDomains.map((cat) => (
          <span
            key={cat.id}
            className="cik-footnote inline-flex h-11 shrink-0 items-center gap-2 rounded-pill bg-cik-surface px-4 text-cik-text-2 shadow-e1"
          >
            <img
              src={cat.iconPath}
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
            <span className="whitespace-nowrap">{cat.label[lang]}</span>
          </span>
        ))}
      </div>

      <p
        data-testid="quiz-hub-progress-strip"
        className="cik-footnote cik-tabular mt-4 text-cik-text-2"
      >
        {clampedRecent}/5
        {' · '}
        {dailyCompleted
          ? `${t.dailySprintDoneBadge}${dailyBestScore > 0 ? ` · ${dailyBestScore} XP` : ''}`
          : t.dailySprintTitle}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            type="button"
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={sheetTransition(reduced, 'close')}
            onClick={() => {
              onButtonPop();
              onSelectMode(mode.id);
            }}
            data-testid={mode.testId}
            className={`flex min-h-[52px] w-full items-center gap-4 rounded-cik-lg bg-cik-surface p-5 text-left text-cik-text shadow-e1 ${focusRing}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-cik-md bg-cik-pink text-cik-cta">
              {mode.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="cik-headline text-cik-text">{mode.title}</span>
                {mode.meta ? (
                  <span className="cik-caption-2 inline-flex items-center gap-1 rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
                    {mode.id === 'daily' && dailyCompleted ? (
                      <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                    ) : null}
                    {mode.meta}
                  </span>
                ) : null}
              </span>
              <span className="cik-subhead mt-1 block text-cik-text-2">{mode.body}</span>
              {mode.id === 'memory' ? (
                <span className="mt-2 flex items-center gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((slot) => (
                    <span
                      key={slot}
                      className={`h-1 w-8 rounded-pill ${
                        slot < clampedRecent ? 'bg-cik-cta' : 'bg-cik-pink'
                      }`}
                    />
                  ))}
                </span>
              ) : null}
            </span>
            {mode.id === 'daily' ? (
              <Timer size={20} strokeWidth={2} className="shrink-0 text-cik-text-2" aria-hidden="true" />
            ) : null}
          </motion.button>
        ))}
      </div>

    </>
  );

  return (
    <div
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t.quizHubTitle}
      data-testid="quiz-hub-modal"
      data-presentation={presentation}
      className={
        isPage
          ? 'relative z-20 flex h-full min-h-0 w-full flex-1 flex-col bg-cik-bg text-cik-text'
          : 'absolute inset-0 z-modal flex h-full w-full items-center justify-center bg-cik-text/30 p-4'
      }
    >
      <motion.div
        initial={reduced || isPage ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={sheetTransition(reduced, 'open')}
        className={
          isPage
            ? `relative h-full w-full overflow-y-auto ${pagePad}`
            : 'relative max-h-[84dvh] w-full max-w-xl overflow-y-auto rounded-sheet bg-cik-bg-elevated p-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-cik-text shadow-e3'
        }
      >
        {body}
      </motion.div>
    </div>
  );
}
