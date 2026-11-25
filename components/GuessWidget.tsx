'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, HelpCircle, RotateCw, Sparkles, Target } from 'lucide-react';
import { FEED_EXPERIENCE_COPY, type Language, translations } from '@/i18n/translations';
import { formatValueWithUnit } from '@/lib/formatUnit';
import { motionSpring, pressTransition } from '@/lib/motion';
import type { GuessChallenge } from '@/types/fact';
import { vibrateTap } from '@/utils/haptics';

export interface GuessAnswerDetails {
  userGuess: number | string;
  correctValue: number | string;
  accuracyPct: number;
}

interface GuessWidgetProps {
  factId: string;
  challenge: GuessChallenge;
  lang: Language;
  hideFlipCta?: boolean;
  hideXpBadge?: boolean;
  onGuessAnswered: (
    xpAwarded: number,
    isAccurate: boolean,
    details: GuessAnswerDetails
  ) => void;
  onGuessLocked?: (factId: string) => void;
  onRequestFlip: () => void;
  onButtonPop: () => void;
  initialAnsweredState?: {
    tier: 'spotOn' | 'close' | 'participated';
    earnedXp: number;
    accuracyPct: number;
  } | null;
}

function pluralizeUnit(value: number, unit: string | undefined, lang: Language): string {
  if (!unit) return formatValueWithUnit(value, unit, lang);
  const u = unit.trim();
  if (lang === 'en') {
    const lower = u.toLowerCase();
    if (lower === 'heart' || lower === 'hearts') {
      return `${value} ${value === 1 ? 'heart' : 'hearts'}`;
    }
  }
  return formatValueWithUnit(value, unit, lang);
}

function clampStep(value: number, min: number, max: number, step: number): number {
  const snapped = Math.round(value / step) * step;
  const rounded = Number(snapped.toFixed(4));
  return Math.min(max, Math.max(min, rounded));
}

export default function GuessWidget({
  factId,
  challenge,
  lang,
  hideFlipCta = false,
  hideXpBadge = false,
  onGuessAnswered,
  onGuessLocked,
  onRequestFlip,
  onButtonPop,
  initialAnsweredState = null,
}: GuessWidgetProps) {
  const t = translations[lang];
  const copy = FEED_EXPERIENCE_COPY[lang];
  const reduced = useReducedMotion() === true;

  const isSlider = challenge.type === 'slider';
  const minVal = challenge.min ?? 0;
  const maxVal = challenge.max ?? 100;
  const stepVal = challenge.step ?? 1;

  const initialSliderValue = useMemo(() => {
    const mid = (minVal + maxVal) / 2;
    return clampStep(mid, minVal, maxVal, stepVal);
  }, [minVal, maxVal, stepVal]);

  const [sliderValue, setSliderValue] = useState<number>(initialSliderValue);
  const [submitted, setSubmitted] = useState<boolean>(Boolean(initialAnsweredState));
  const [tier, setTier] = useState<'spotOn' | 'close' | 'participated' | null>(
    initialAnsweredState?.tier ?? null
  );
  const [earnedXp, setEarnedXp] = useState<number>(initialAnsweredState?.earnedXp ?? 0);
  const [accuracyPct, setAccuracyPct] = useState<number>(
    initialAnsweredState?.accuracyPct ?? 100
  );

  useEffect(() => {
    setSliderValue(initialSliderValue);
    if (initialAnsweredState) {
      setSubmitted(true);
      setTier(initialAnsweredState.tier);
      setEarnedXp(initialAnsweredState.earnedXp);
      setAccuracyPct(initialAnsweredState.accuracyPct);
    } else {
      setSubmitted(false);
      setTier(null);
      setEarnedXp(0);
      setAccuracyPct(100);
    }
  }, [factId, initialSliderValue, initialAnsweredState]);

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const lockGuess = () => {
    if (submitted) return;
    vibrateTap(15);
    onButtonPop();

    const target = challenge.correctValue ?? initialSliderValue;
    const span = Math.max(1, maxVal - minVal);
    const diff = Math.abs(sliderValue - target);
    const spotOnTol = Math.max(stepVal * 0.5, span * 0.08);
    const closeTol = Math.max(stepVal * 1.5, span * 0.22);

    let nextTier: 'spotOn' | 'close' | 'participated' = 'participated';
    let xpAwarded = 10;
    let isAccurate = false;

    if (diff <= spotOnTol) {
      nextTier = 'spotOn';
      xpAwarded = 20;
      isAccurate = true;
    } else if (diff <= closeTol) {
      nextTier = 'close';
      xpAwarded = 15;
      isAccurate = true;
    }

    const computedAccuracyPct = Math.max(0, Math.min(100, Math.round((1 - diff / span) * 100)));

    setTier(nextTier);
    setEarnedXp(xpAwarded);
    setAccuracyPct(computedAccuracyPct);
    setSubmitted(true);
    onGuessLocked?.(factId);
    onGuessAnswered(xpAwarded, isAccurate, {
      userGuess: sliderValue,
      correctValue: target,
      accuracyPct: computedAccuracyPct,
    });
  };

  const handleSliderSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    lockGuess();
  };

  const handleBinaryPick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (submitted) return;
    vibrateTap(15);
    onButtonPop();

    const correctIdx = challenge.correctOptionIndex ?? 0;
    const isCorrect = idx === correctIdx;
    const nextTier: 'spotOn' | 'participated' = isCorrect ? 'spotOn' : 'participated';
    const xpAwarded = isCorrect ? 20 : 10;
    const computedAccuracyPct = isCorrect ? 100 : 0;

    setTier(nextTier);
    setEarnedXp(xpAwarded);
    setAccuracyPct(computedAccuracyPct);
    setSubmitted(true);
    onGuessLocked?.(factId);
    onGuessAnswered(xpAwarded, isCorrect, {
      userGuess: challenge.options?.[idx] ?? idx,
      correctValue: challenge.options?.[correctIdx] ?? correctIdx,
      accuracyPct: computedAccuracyPct,
    });
  };

  const nudgeSlider = (direction: 1 | -1, steps: number) => {
    setSliderValue((current) => clampStep(current + direction * stepVal * steps, minVal, maxVal, stepVal));
  };

  const sliderValueText = pluralizeUnit(sliderValue, challenge.unit, lang);
  const minLabelText = pluralizeUnit(minVal, challenge.unit, lang);
  const maxLabelText = pluralizeUnit(maxVal, challenge.unit, lang);
  const correctDisplay = isSlider
    ? pluralizeUnit(challenge.correctValue ?? initialSliderValue, challenge.unit, lang)
    : challenge.options?.[challenge.correctOptionIndex ?? 0] ?? '';
  const valueIsLong = sliderValueText.length > 16;

  const rawTierMessage =
    tier === 'spotOn'
      ? t.guessSpotOn
      : tier === 'close'
        ? t.guessClose
        : t.guessParticipated;
  const tierMessage = rawTierMessage
    .replace(/\s*\(\s*\+\d+\s*XP\s*\)/gi, '')
    .replace(/\s*·?\s*\+\d+\s*XP/gi, '')
    .trim();

  const binaryOptions = (challenge.options ?? []).slice(0, 4);
  const accurate = tier === 'spotOn' || tier === 'close';

  return (
    <div
      data-testid="guess-widget"
      onClick={stop}
      onDoubleClick={stop}
      onPointerDown={stop}
      onTouchStart={stop}
      className="pointer-events-auto rounded-cik-md border border-black/10 bg-cik-surface-2/90 p-3 text-cik-text shadow-e1 backdrop-blur-md transition-colors dark:border-white/10"
    >
      <style>{`
        .guess-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 44px;
          margin: 0;
          background: transparent;
          cursor: pointer;
        }
        .guess-range:focus-visible {
          outline: 3px solid var(--cik-focus);
          outline-offset: 2px;
        }
        .guess-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: var(--cik-line);
        }
        .guess-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 28px;
          width: 28px;
          margin-top: -12px;
          border-radius: 999px;
          border: 2px solid var(--cik-bg-elevated);
          background: var(--cik-cta);
          box-shadow: var(--cik-e1);
        }
        .guess-range::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: var(--cik-line);
          border: 0;
        }
        .guess-range::-moz-range-thumb {
          height: 28px;
          width: 28px;
          border-radius: 999px;
          border: 2px solid var(--cik-bg-elevated);
          background: var(--cik-cta);
          box-shadow: var(--cik-e1);
        }
      `}</style>
      <p className="cik-callout mb-2 flex items-start gap-2 text-cik-text">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-cik-text-2" aria-hidden="true" />
        <span className="line-clamp-2 min-w-0 flex-1">{challenge.prompt}</span>
      </p>

      {!submitted ? (
        isSlider ? (
          <div className="flex flex-col gap-2">
            <p
              data-testid="guess-live-value"
              title={sliderValueText}
              className={`cik-tabular mx-auto max-w-full truncate text-center text-cik-text ${
                valueIsLong ? 'cik-title-3' : 'cik-title-2'
              }`}
            >
              {sliderValueText}
            </p>
            <input
              type="range"
              min={minVal}
              max={maxVal}
              step={stepVal}
              value={sliderValue}
              aria-label={copy.guessSliderAriaLabel}
              aria-valuemin={minVal}
              aria-valuemax={maxVal}
              aria-valuenow={sliderValue}
              aria-valuetext={sliderValueText}
              data-testid="guess-slider-input"
              onClick={stop}
              onDoubleClick={stop}
              onPointerDown={stop}
              onTouchStart={stop}
              onKeyDown={(e) => {
                if (
                  e.key !== 'ArrowLeft' &&
                  e.key !== 'ArrowRight' &&
                  e.key !== 'ArrowUp' &&
                  e.key !== 'ArrowDown'
                ) {
                  return;
                }
                e.preventDefault();
                e.stopPropagation();
                const direction = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1;
                nudgeSlider(direction, e.shiftKey ? 10 : 1);
              }}
              onChange={(e) => {
                e.stopPropagation();
                setSliderValue(clampStep(Number(e.target.value), minVal, maxVal, stepVal));
              }}
              className="guess-range"
            />
            <div className="flex items-start justify-between gap-3">
              <span data-testid="guess-min" className="cik-footnote min-w-0 truncate text-cik-text-2">
                {minLabelText}
              </span>
              <span data-testid="guess-max" className="cik-footnote min-w-0 truncate text-right text-cik-text-2">
                {maxLabelText}
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={reduced ? undefined : { scale: 0.96 }}
              transition={pressTransition(reduced)}
              data-testid="guess-submit-btn"
              onClick={handleSliderSubmit}
              onDoubleClick={stop}
              className="cik-headline mx-auto mt-1 flex min-h-11 min-w-[160px] items-center justify-center rounded-pill border border-white/15 bg-cik-cta px-5 text-cik-on-cta shadow-sticker transition hover:brightness-105 active:shadow-sticker-press"
            >
              {lang === 'tr' ? 'Tahmini kilitle' : 'Lock guess'}
            </motion.button>
          </div>
        ) : (
          <div data-testid="guess-binary-grid" className="grid grid-cols-1 gap-2">
            {binaryOptions.map((opt, idx) => (
              <motion.button
                key={`${factId}-opt-${idx}`}
                type="button"
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={pressTransition(reduced)}
                data-testid={`guess-binary-${idx}`}
                onClick={(e) => handleBinaryPick(e, idx)}
                onDoubleClick={stop}
                className="cik-headline flex min-h-11 items-center justify-center rounded-cik-md border border-black/10 bg-cik-bg-elevated/95 px-3 py-2 text-center text-cik-text shadow-e1 transition hover:border-cik-cta/50 hover:bg-cik-surface dark:border-white/10"
              >
                <span>{opt}</span>
              </motion.button>
            ))}
          </div>
        )
      ) : (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0.15 } : motionSpring.reveal}
          data-testid="guess-result-banner"
          role="status"
          aria-live="polite"
          className={`flex flex-wrap items-center justify-between gap-2 rounded-cik-md border px-3 py-2 backdrop-blur-sm ${
            accurate
              ? 'border-cik-mint-text/20 bg-cik-mint text-cik-mint-text'
              : 'border-cik-rose-text/20 bg-cik-rose text-cik-rose-text'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="cik-footnote flex flex-wrap items-center gap-2">
              {tier === 'spotOn' ? (
                <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span className="min-w-0 leading-snug">{tierMessage}</span>
              {!hideXpBadge && (
                <span className="cik-caption-2 cik-tabular inline-flex shrink-0 items-center gap-1 rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />+{earnedXp} XP
                  {isSlider ? ` · ${lang === 'en' ? `${accuracyPct}%` : `%${accuracyPct}`}` : ''}
                </span>
              )}
            </div>
            <p className="cik-footnote mt-1">
              {t.guessReveal}: <span className="font-extrabold">{correctDisplay}</span>
            </p>
          </div>

          {!hideFlipCta && (
            <motion.button
              type="button"
              whileTap={reduced ? undefined : { scale: 0.96 }}
              transition={pressTransition(reduced)}
              data-testid="guess-flip-cta-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRequestFlip();
              }}
              onDoubleClick={stop}
              className="cik-footnote inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border border-black/10 bg-cik-bg-elevated px-3 text-cik-text shadow-e1 transition hover:bg-cik-surface dark:border-white/10"
            >
              <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.guessFlipCta}</span>
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
