'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import GuessWidget from '@/components/GuessWidget';
import type { GuessChallenge } from '@/types/fact';
import type { StoryCardItem, StoryLanguage, StoryTheme } from '@/types/story';
import { safeExternalHref } from '@/utils/phoneticDisplay';

interface ScrollyStoryPlayerProps {
  storyId?: string;
  title: string;
  sourceUrl?: string | null;
  language: StoryLanguage;
  theme: StoryTheme;
  cards: StoryCardItem[];
  activeCardIndex?: number;
  onActiveCardChange?: (index: number) => void;
  onCompleteStory?: (correctCount: number, totalCount: number) => void;
  className?: string;
}

export default function ScrollyStoryPlayer({
  storyId,
  title,
  sourceUrl,
  language,
  theme,
  cards,
  activeCardIndex,
  onActiveCardChange,
  onCompleteStory,
  className = '',
}: ScrollyStoryPlayerProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [answersByCardId, setAnswersByCardId] = useState<
    Record<
      string,
      {
        tier: 'spotOn' | 'close' | 'participated';
        earnedXp: number;
        accuracyPct: number;
        correct: boolean;
      }
    >
  >({});
  const [failedMediaIds, setFailedMediaIds] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasReportedCompletionRef = useRef(false);

  const controlled = typeof activeCardIndex === 'number';
  const currentIndex = Math.max(
    0,
    Math.min(Math.max(0, cards.length - 1), controlled ? activeCardIndex : internalIndex)
  );

  useEffect(() => {
    setAnswersByCardId({});
    setFailedMediaIds({});
    hasReportedCompletionRef.current = false;
  }, [storyId]);

  const setActiveSlide = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(Math.max(0, cards.length - 1), nextIdx));
    if (!controlled) {
      setInternalIndex(clamped);
    }
    onActiveCardChange?.(clamped);
    const el = scrollContainerRef.current;
    if (el && el.clientHeight > 0) {
      el.scrollTo({
        top: clamped * el.clientHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (typeof activeCardIndex !== 'number') return;
    const el = scrollContainerRef.current;
    if (!el || el.clientHeight <= 0) return;
    const targetTop = Math.max(0, Math.min(cards.length - 1, activeCardIndex)) * el.clientHeight;
    if (Math.abs(el.scrollTop - targetTop) > 12) {
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [activeCardIndex, cards.length]);

  const answeredCount = Object.keys(answersByCardId).length;
  const correctCount = Object.values(answersByCardId).filter((a) => a.correct).length;
  const allCompleted = cards.length > 0 && answeredCount >= cards.length;
  const safeStorySource = safeExternalHref(sourceUrl || undefined);

  useEffect(() => {
    if (allCompleted && !hasReportedCompletionRef.current) {
      hasReportedCompletionRef.current = true;
      onCompleteStory?.(correctCount, cards.length);
    }
  }, [allCompleted, correctCount, cards.length, onCompleteStory]);

  const handleContainerScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || el.clientHeight <= 0 || cards.length === 0) return;
    const idx = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollTop / el.clientHeight)));
    if (idx !== currentIndex) {
      if (!controlled) setInternalIndex(idx);
      onActiveCardChange?.(idx);
    }
  };

  const resetReplay = () => {
    setAnswersByCardId({});
    hasReportedCompletionRef.current = false;
    setActiveSlide(0);
  };

  return (
    <div
      data-testid="scrolly-story-player"
      data-story-mode={theme.mode}
      style={{ '--story-accent': theme.accent } as React.CSSProperties}
      className={`story-player-shell relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-cik-line shadow-e3 ${className}`}
    >
      {/* Top Progress & Deck Header */}
      <header className="relative z-hud shrink-0 border-b border-cik-line bg-cik-bg/85 px-3.5 pb-2.5 pt-3 backdrop-blur-md">
        <div className="mb-2 flex items-center gap-1" aria-label="Story progress">
          {cards.map((card, idx) => {
            const answered = Boolean(answersByCardId[card.id]);
            const active = idx === currentIndex;
            return (
              <button
                key={card.id}
                type="button"
                aria-label={`${language === 'tr' ? 'Kart' : 'Card'} ${idx + 1}`}
                onClick={() => setActiveSlide(idx)}
                className="group flex h-2.5 flex-1 items-center"
              >
                <span
                  className={`block h-1 w-full rounded-pill transition-all duration-200 ${
                    active
                      ? 'story-accent-bg'
                      : answered
                        ? 'bg-cik-mint-text opacity-80'
                        : 'bg-cik-line group-hover:opacity-80'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="cik-caption-1 truncate text-cik-text" title={title}>
              {title || (language === 'tr' ? 'İnteraktif Hikâye' : 'Interactive Story')}
            </p>
            <p className="cik-caption-2 text-cik-text-2">
              {cards.length > 0
                ? `${currentIndex + 1} / ${cards.length} · ${answeredCount}/${cards.length} ${
                    language === 'tr' ? 'tahmin' : 'answered'
                  }`
                : language === 'tr'
                  ? 'Kart bekleniyor'
                  : 'Waiting for cards'}
            </p>
          </div>

          {safeStorySource ? (
            <a
              href={safeStorySource}
              target="_blank"
              rel="noopener noreferrer"
              className="scrolly-tactile inline-flex min-h-8 shrink-0 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 text-[11px] font-bold text-cik-text-2 hover:text-cik-text"
            >
              <span>{language === 'tr' ? 'Kaynak' : 'Source'}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </header>

      {/* Vertical Snap Deck */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="tiktok-feed-scroll no-scrollbar relative min-h-0 flex-1 overflow-y-auto snap-y snap-mandatory"
      >
        {cards.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-cik-text-2">
            {language === 'tr'
              ? 'Önizleme için soldan içerik üretin veya kart ekleyin.'
              : 'Generate from a URL or add cards on the left to preview.'}
          </div>
        ) : (
          cards.map((card, idx) => {
            const mediaOk = Boolean(card.mediaUrl) && !failedMediaIds[card.id];
            const challenge: GuessChallenge = {
              type: 'binary',
              prompt: card.question,
              options: card.options,
              correctOptionIndex: card.correctIndex,
            };
            const existingAnswer = answersByCardId[card.id] ?? null;

            return (
              <section
                key={card.id}
                aria-label={`${idx + 1}. ${card.headline}`}
                className="story-hero-glow relative flex h-full min-h-full w-full shrink-0 snap-start snap-always flex-col justify-between overflow-y-auto p-4"
              >
                <div className="space-y-3">
                  {mediaOk ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-cik-line bg-cik-surface-2">
                      <img
                        src={card.mediaUrl}
                        alt={card.headline}
                        loading="lazy"
                        onError={() =>
                          setFailedMediaIds((prev) => ({ ...prev, [card.id]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-cik-line bg-cik-pink px-2.5 py-1 text-[11px] font-extrabold text-cik-cta">
                      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>
                        {language === 'tr' ? `Kart ${idx + 1}` : `Card ${idx + 1}`}
                      </span>
                    </span>
                    <span className="max-w-[210px] truncate rounded-pill border border-cik-line bg-cik-surface px-2.5 py-0.5 text-[11px] font-bold text-cik-text-2">
                      {card.sourceLabel}
                    </span>
                  </div>

                  <h2 className="cik-title-2 text-cik-text">{card.headline}</h2>
                  <p className="cik-callout leading-relaxed text-cik-text-2">{card.body}</p>
                </div>

                <div className="mt-4 space-y-2.5 pt-2">
                  <GuessWidget
                    factId={`${storyId || 'preview'}-${card.id}`}
                    challenge={challenge}
                    lang={language}
                    hideFlipCta
                    hideXpBadge
                    initialAnsweredState={
                      existingAnswer
                        ? {
                            tier: existingAnswer.tier,
                            earnedXp: existingAnswer.earnedXp,
                            accuracyPct: existingAnswer.accuracyPct,
                          }
                        : null
                    }
                    onGuessAnswered={(xpAwarded, isAccurate, details) => {
                      const tier: 'spotOn' | 'close' | 'participated' = isAccurate
                        ? 'spotOn'
                        : 'participated';
                      setAnswersByCardId((prev) => ({
                        ...prev,
                        [card.id]: {
                          tier,
                          earnedXp: xpAwarded,
                          accuracyPct: details.accuracyPct,
                          correct: isAccurate,
                        },
                      }));
                    }}
                    onRequestFlip={() => {}}
                    onButtonPop={() => {}}
                  />

                  {allCompleted && idx === cards.length - 1 ? (
                    <div
                      data-testid="story-completion-banner"
                      className="flex items-center justify-between gap-2 rounded-2xl border border-cik-line bg-cik-mint px-3.5 py-2.5 text-cik-mint-text"
                    >
                      <span className="flex items-center gap-2 text-xs font-extrabold">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                          {language === 'tr'
                            ? `Tamamlandı: ${correctCount}/${cards.length} doğru`
                            : `Completed: ${correctCount}/${cards.length} correct`}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={resetReplay}
                        className="scrolly-tactile inline-flex items-center gap-1 rounded-pill bg-cik-bg-elevated px-2.5 py-1 text-[11px] font-extrabold text-cik-text"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        <span>{language === 'tr' ? 'Tekrar' : 'Replay'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => setActiveSlide(idx - 1)}
                        className="scrolly-tactile inline-flex min-h-9 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-3 text-xs font-bold text-cik-text disabled:opacity-40"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{language === 'tr' ? 'Önceki' : 'Prev'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx >= cards.length - 1}
                        onClick={() => setActiveSlide(idx + 1)}
                        className="scrolly-tactile inline-flex min-h-9 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-3 text-xs font-bold text-cik-text disabled:opacity-40"
                      >
                        <span>{language === 'tr' ? 'Sonraki' : 'Next'}</span>
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Isolated Footer Attribution */}
      <footer className="relative z-hud flex shrink-0 items-center justify-center border-t border-cik-line bg-cik-bg/90 px-3 py-2 backdrop-blur-md">
        <a
          href="https://scrolly.live"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-tight text-cik-text-2 transition-colors hover:text-cik-cta"
        >
          <span>Powered by Scrolly.live</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
