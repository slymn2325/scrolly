'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import GuessWidget from '@/components/GuessWidget';
import type { GuessChallenge } from '@/types/fact';
import {
  getStoryGradientCss,
  type StoryCardItem,
  type StoryLanguage,
  type StoryTheme,
} from '@/types/story';
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
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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
    setExpandedCardId(null);
    hasReportedCompletionRef.current = false;
  }, [storyId]);

  useEffect(() => {
    setExpandedCardId(null);
  }, [currentIndex]);

  const setActiveSlide = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(Math.max(0, cards.length - 1), nextIdx));
    setExpandedCardId(null);
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

  const quizCards = cards.filter((c) => c.quizEnabled !== false);
  const answeredQuizCount = quizCards.filter((c) => Boolean(answersByCardId[c.id])).length;
  const correctCount = Object.values(answersByCardId).filter((a) => a.correct).length;
  const allCompleted =
    cards.length > 0 &&
    (quizCards.length > 0
      ? answeredQuizCount >= quizCards.length
      : currentIndex >= cards.length - 1);
  const safeStorySource = safeExternalHref(sourceUrl || undefined);

  useEffect(() => {
    if (allCompleted && !hasReportedCompletionRef.current) {
      hasReportedCompletionRef.current = true;
      onCompleteStory?.(correctCount, Math.max(1, quizCards.length));
    }
  }, [allCompleted, correctCount, quizCards.length, onCompleteStory]);

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

  const overlayRatio = Math.max(
    0.2,
    Math.min(0.85, Number(theme.overlayOpacity ?? 58) / 100)
  );
  const sheetSurfaceClass =
    theme.surfaceStyle === 'solid'
      ? 'story-surface-solid'
      : theme.surfaceStyle === 'editorial'
        ? 'story-surface-editorial'
        : 'story-surface-glass';
  const alignClass = theme.textAlign === 'center' ? 'text-center items-center' : 'text-left items-start';
  const fontClass =
    theme.fontStyle === 'editorial'
      ? 'story-font-editorial'
      : theme.fontStyle === 'rounded'
        ? 'story-font-rounded'
        : 'story-font-modern';

  return (
    <div
      data-testid="scrolly-story-player"
      data-story-mode={theme.mode}
      style={
        {
          '--story-accent': theme.accent,
          '--story-overlay': String(overlayRatio),
        } as React.CSSProperties
      }
      className={`story-player-shell relative flex h-full w-full flex-col overflow-hidden rounded-[26px] border border-cik-line shadow-e3 ${fontClass} ${className}`}
    >
      {/* Top Progress & Deck Header */}
      <header className="relative z-hud shrink-0 border-b border-cik-line bg-cik-bg/90 px-3.5 pb-2 pt-2.5 backdrop-blur-md">
        <div className="mb-1.5 flex items-center gap-1" aria-label="Story progress">
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
                ? `${currentIndex + 1} / ${cards.length}${
                    quizCards.length > 0
                      ? ` · ${answeredQuizCount}/${quizCards.length} ${
                          language === 'tr' ? 'tahmin' : 'answered'
                        }`
                      : ''
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

      {/* Full-Bleed GIF / Gradient Snap Stage */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="tiktok-feed-scroll no-scrollbar relative min-h-0 flex-1 overflow-y-auto snap-y snap-mandatory"
      >
        {cards.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm font-semibold text-cik-text-2">
            {language === 'tr'
              ? 'Önizleme için soldan içerik üretin veya boş kart ekleyin.'
              : 'Generate from a URL or add a blank card on the left to preview.'}
          </div>
        ) : (
          cards.map((card, idx) => {
            const mediaOk = Boolean(card.mediaUrl) && !failedMediaIds[card.id];
            const isVideo = mediaOk && /\.(mp4|webm|mov)(?:$|[?#])/i.test(card.mediaUrl);
            const gradientBg = getStoryGradientCss(card.gradientId, idx);
            const quizActive = card.quizEnabled !== false;
            const isExpanded = expandedCardId === card.id;
            const challenge: GuessChallenge = {
              type: 'binary',
              prompt: card.question,
              options: card.options,
              correctOptionIndex: card.correctIndex,
            };
            const existingAnswer = answersByCardId[card.id] ?? null;
            const safeCtaUrl = safeExternalHref(card.ctaUrl || undefined);

            return (
              <section
                key={card.id}
                aria-label={`${idx + 1}. ${card.headline}`}
                style={{ background: gradientBg }}
                className="relative flex h-full min-h-full w-full shrink-0 snap-start snap-always flex-col justify-between overflow-hidden"
              >
                {/* Layer 1: Full-Bleed GIF / Video / Image Media Stage */}
                {mediaOk ? (
                  isVideo ? (
                    <video
                      src={card.mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onError={() =>
                        setFailedMediaIds((prev) => ({ ...prev, [card.id]: true }))
                      }
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={card.mediaUrl}
                      alt={card.headline}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      onError={() =>
                        setFailedMediaIds((prev) => ({ ...prev, [card.id]: true }))
                      }
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                  )
                ) : null}

                {/* Layer 2: Soft Top + Bottom Scrim Keeping Upper 45-50% Media Open */}
                <div
                  aria-hidden="true"
                  className="story-stage-scrim pointer-events-none absolute inset-0"
                />

                {/* Layer 3: Foreground Top Badges & Unified Bottom-Sheet Drawer */}
                <div
                  onClick={() => {
                    if (isExpanded) setExpandedCardId(null);
                  }}
                  className="relative z-content flex h-full min-h-0 flex-col justify-between overflow-hidden"
                >
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-cik-line bg-cik-bg/85 px-2.5 py-1 text-[11px] font-extrabold text-cik-cta backdrop-blur-md">
                      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>
                        {language === 'tr' ? `Kart ${idx + 1}` : `Card ${idx + 1}`}
                      </span>
                    </span>
                    <span className="max-w-[210px] truncate rounded-pill border border-cik-line bg-cik-bg/85 px-2.5 py-0.5 text-[11px] font-bold text-cik-text-2 backdrop-blur-md">
                      {card.sourceLabel}
                    </span>
                  </div>

                  {/* Open Media Viewport Window (top 45-50%) */}
                  <div className="min-h-0 flex-1" aria-hidden="true" />

                  {/* Single Unified Bottom-Sheet Drawer (matches fact-bottom-sheet) */}
                  <div
                    data-testid="story-bottom-sheet"
                    data-expanded={isExpanded ? 'true' : 'false'}
                    data-scroll-contain={isExpanded ? 'true' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isExpanded) setExpandedCardId(card.id);
                    }}
                    className={`pointer-events-auto mt-auto flex min-h-0 w-full flex-col gap-2 rounded-t-3xl border-t border-cik-line px-4 pt-2 backdrop-blur-xl transition-all duration-300 ease-out ${sheetSurfaceClass} ${alignClass} ${
                      isExpanded
                        ? 'max-h-[72%] overflow-y-auto overscroll-y-contain pb-3.5'
                        : 'max-h-[42%] cursor-pointer overflow-hidden pb-3'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={
                        isExpanded
                          ? language === 'tr'
                            ? 'Çekmeceyi daralt'
                            : 'Collapse drawer'
                          : language === 'tr'
                            ? 'Çekmeceyi genişlet'
                            : 'Expand drawer'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCardId((prev) => (prev === card.id ? null : card.id));
                      }}
                      className="mx-auto flex w-full shrink-0 items-center justify-center py-1"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-10 rounded-full bg-cik-text/25"
                      />
                    </button>

                    <div className="flex w-full shrink-0 items-start justify-between gap-2">
                      <h2
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCardId((prev) => (prev === card.id ? null : card.id));
                        }}
                        className={`flex-1 cursor-pointer text-base font-extrabold leading-snug text-cik-text sm:text-lg ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {card.headline}
                      </h2>
                      {isExpanded ? (
                        <button
                          type="button"
                          data-testid="story-sheet-collapse-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(null);
                          }}
                          className="shrink-0 rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 text-[11px] font-extrabold text-cik-cta hover:bg-cik-pink"
                        >
                          {language === 'tr' ? 'Daralt ▾' : 'Collapse ▾'}
                        </button>
                      ) : null}
                    </div>

                    <p
                      className={`w-full text-xs font-semibold leading-relaxed text-cik-text-2 sm:text-[13px] ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {card.body}
                    </p>

                    {!isExpanded ? (
                      <div className="flex w-full items-center pt-0.5">
                        <button
                          type="button"
                          data-testid="story-sheet-expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCardId(card.id);
                          }}
                          className="scrolly-tactile inline-flex min-h-8 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-3 py-1 text-xs font-extrabold text-cik-cta shadow-e1 hover:bg-cik-pink"
                        >
                          <span>
                            {quizActive
                              ? language === 'tr'
                                ? 'Tahmin Et / Genişlet ▴'
                                : 'Guess / Expand ▴'
                              : language === 'tr'
                                ? 'Genişlet ▴'
                                : 'Expand ▴'}
                          </span>
                        </button>
                      </div>
                    ) : null}

                    {/* Expanded Region: Optional CTA + Quick Guess + Completion */}
                    <div
                      className={`grid w-full transition-all duration-300 ease-out ${
                        isExpanded
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'pointer-events-none grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="flex flex-col gap-2.5 pt-1 text-left">
                          {card.ctaLabel && safeCtaUrl ? (
                            <div className={`flex w-full ${theme.textAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                              <a
                                href={safeCtaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="scrolly-tactile story-accent-bg inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-xs font-extrabold text-cik-on-cta shadow-e1"
                              >
                                <span>{card.ctaLabel}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              </a>
                            </div>
                          ) : null}

                          {quizActive ? (
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
                          ) : null}

                          {allCompleted && idx === cards.length - 1 ? (
                            <div
                              data-testid="story-completion-banner"
                              className="flex items-center justify-between gap-2 rounded-2xl border border-cik-line bg-cik-mint px-3.5 py-2.5 text-cik-mint-text shadow-e1"
                            >
                              <span className="flex items-center gap-2 text-xs font-extrabold">
                                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                  {quizCards.length > 0
                                    ? language === 'tr'
                                      ? `Tamamlandı: ${correctCount}/${quizCards.length} doğru`
                                      : `Completed: ${correctCount}/${quizCards.length} correct`
                                    : language === 'tr'
                                      ? 'Hikâye tamamlandı'
                                      : 'Story completed'}
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
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Fixed Bottom Controls Strip: Prev · Powered by Scrolly.live · Next/Replay */}
      <footer className="relative z-hud flex shrink-0 items-center justify-between gap-2 border-t border-cik-line bg-cik-bg/95 px-3 py-2 backdrop-blur-md">
        <button
          type="button"
          disabled={cards.length === 0 || currentIndex === 0}
          onClick={() => setActiveSlide(currentIndex - 1)}
          data-testid="story-prev-btn"
          className="scrolly-tactile inline-flex min-h-8 shrink-0 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 text-[11px] font-bold text-cik-text disabled:cursor-not-allowed disabled:bg-cik-bg/80 disabled:text-cik-muted"
        >
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{language === 'tr' ? 'Önceki' : 'Prev'}</span>
        </button>

        <a
          href="https://scrolly.live"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] font-bold tracking-tight text-cik-text-2 transition-colors hover:text-cik-cta"
        >
          <span className="truncate">Powered by Scrolly.live</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>

        {allCompleted && currentIndex >= cards.length - 1 ? (
          <button
            type="button"
            onClick={resetReplay}
            data-testid="story-replay-btn"
            className="scrolly-tactile story-accent-bg inline-flex min-h-8 shrink-0 items-center gap-1 rounded-pill px-2.5 text-[11px] font-extrabold text-cik-on-cta shadow-e1"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>{language === 'tr' ? 'Tekrar' : 'Replay'}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={cards.length === 0 || currentIndex >= cards.length - 1}
            onClick={() => setActiveSlide(currentIndex + 1)}
            data-testid="story-next-btn"
            className="scrolly-tactile inline-flex min-h-8 shrink-0 items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 text-[11px] font-bold text-cik-text disabled:cursor-not-allowed disabled:bg-cik-bg/80 disabled:text-cik-muted"
          >
            <span>{language === 'tr' ? 'Sonraki' : 'Next'}</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </footer>
    </div>
  );
}
