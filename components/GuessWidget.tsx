'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, HelpCircle, RotateCw, Sparkles, Target } from 'lucide-react';
import { FEED_EXPERIENCE_COPY, type Language, translations } from '@/i18n/translations';
import { formatValueWithUnit } from '@/lib/formatUnit';
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
  // English common singular/plural for heart(s) and generic trailing s
  if (lang === 'en') {
    const lower = u.toLowerCase();
    if (lower === 'heart' || lower === 'hearts') {
      return `${value} ${value === 1 ? 'heart' : 'hearts'}`;
    }
  }
  return formatValueWithUnit(value, unit, lang);
}

export default function GuessWidget({
  factId,
  challenge,
  lang,
  onGuessAnswered,
  onGuessLocked,
  onRequestFlip,
  onButtonPop,
  initialAnsweredState = null,
}: GuessWidgetProps) {
  const t = translations[lang];
  const copy = FEED_EXPERIENCE_COPY[lang];

  const isSlider = challenge.type === 'slider';
  const minVal = challenge.min ?? 0;
  const maxVal = challenge.max ?? 100;
  const stepVal = challenge.step ?? 1;

  const initialSliderValue = useMemo(() => {
    const mid = (minVal + maxVal) / 2;
    return Math.round(mid / stepVal) * stepVal;
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

  const handleSliderSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submitted) return;
    vibrateTap(30);
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

  const handleBinaryPick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (submitted) return;
    vibrateTap(30);
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

  const sliderValueText = pluralizeUnit(sliderValue, challenge.unit, lang);
  const minLabelText = pluralizeUnit(minVal, challenge.unit, lang);
  const maxLabelText = pluralizeUnit(maxVal, challenge.unit, lang);
  const correctDisplay = isSlider
    ? pluralizeUnit(challenge.correctValue ?? initialSliderValue, challenge.unit, lang)
    : challenge.options?.[challenge.correctOptionIndex ?? 0] ?? '';

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

  const binaryOptions = (challenge.options ?? []).slice(0, 2);

  return (
    <div
      data-testid="guess-widget"
      onClick={stop}
      onDoubleClick={stop}
      onPointerDown={stop}
      onTouchStart={stop}
      className="pointer-events-auto mt-1 rounded-nest bg-[#FFF1E3] p-3 text-ink"
    >
      <p className="mb-2 flex items-start gap-1.5 text-[13px] font-medium leading-snug text-ink">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden="true" />
        <span className="min-w-0 flex-1">{challenge.prompt}</span>
      </p>

      {!submitted ? (
        isSlider ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex w-full flex-col">
              <div className="flex min-h-[36px] items-center py-0.5">
                <input
                  type="range"
                  min={minVal}
                  max={maxVal}
                  step={stepVal}
                  value={sliderValue}
                  aria-label={copy.guessSliderAriaLabel}
                  aria-valuetext={sliderValueText}
                  data-testid="guess-slider-input"
                  onClick={stop}
                  onDoubleClick={stop}
                  onPointerDown={stop}
                  onTouchStart={stop}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSliderValue(Number(e.target.value));
                  }}
                  className="h-2 w-full cursor-pointer rounded-full accent-[#6B4BFF]"
                />
              </div>
              <div className="mt-1 flex items-end justify-between gap-2 pb-2 text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                <span className="whitespace-nowrap">{minLabelText}</span>
                <span
                  data-testid="guess-live-value"
                  className="font-display text-[28px] font-semibold tabular-nums text-slate-900 dark:text-slate-100"
                >
                  {sliderValueText}
                </span>
                <span className="whitespace-nowrap text-right">{maxLabelText}</span>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              data-testid="guess-submit-btn"
              onClick={handleSliderSubmit}
              onDoubleClick={stop}
              className="mx-auto mt-2 flex min-h-[44px] min-w-[160px] items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-cream"
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
                whileTap={{ scale: 0.96 }}
                data-testid={`guess-binary-${idx}`}
                onClick={(e) => handleBinaryPick(e, idx)}
                onDoubleClick={stop}
                className="flex min-h-[42px] h-auto items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-extrabold leading-snug text-slate-900 whitespace-normal break-words transition hover:bg-slate-50"
              >
                <span>{opt}</span>
              </motion.button>
            ))}
          </div>
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          data-testid="guess-result-banner"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-700/30 bg-emerald-100 px-3 py-2 text-emerald-950"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-emerald-950">
              {tier === 'spotOn' ? (
                <Target className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="whitespace-normal break-words leading-snug">{tierMessage}</span>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-slate-900">
                <Sparkles className="h-2.5 w-2.5" />+{earnedXp} XP{isSlider ? ` · %${accuracyPct}` : ''}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-900 whitespace-normal break-words leading-snug">
              {t.guessReveal}: <span className="font-black text-slate-900">{correctDisplay}</span>
            </p>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            data-testid="guess-flip-cta-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRequestFlip();
            }}
            onDoubleClick={stop}
            className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10.5px] font-black text-[#09090B]"
          >
            <RotateCw className="h-3 w-3 shrink-0" />
            <span>{t.guessFlipCta}</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
