'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, HelpCircle, RotateCw, Sparkles, Target } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { formatValueWithUnit } from '@/lib/formatUnit';
import type { GuessChallenge } from '@/types/fact';

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
  onRequestFlip: () => void;
  onButtonPop: () => void;
}

export default function GuessWidget({
  factId,
  challenge,
  lang,
  onGuessAnswered,
  onRequestFlip,
  onButtonPop,
}: GuessWidgetProps) {
  const t = translations[lang];

  const isSlider = challenge.type === 'slider';
  const minVal = challenge.min ?? 0;
  const maxVal = challenge.max ?? 100;
  const stepVal = challenge.step ?? 1;

  const initialSliderValue = useMemo(() => {
    const mid = (minVal + maxVal) / 2;
    return Math.round(mid / stepVal) * stepVal;
  }, [minVal, maxVal, stepVal]);

  const [sliderValue, setSliderValue] = useState<number>(initialSliderValue);
  const [submitted, setSubmitted] = useState(false);
  const [tier, setTier] = useState<'spotOn' | 'close' | 'participated' | null>(null);
  const [earnedXp, setEarnedXp] = useState<number>(0);

  useEffect(() => {
    setSliderValue(initialSliderValue);
    setSubmitted(false);
    setTier(null);
    setEarnedXp(0);
  }, [factId, initialSliderValue]);

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleSliderSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submitted) return;
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

    const accuracyPct = Math.max(0, Math.min(100, Math.round((1 - diff / span) * 100)));

    setTier(nextTier);
    setEarnedXp(xpAwarded);
    setSubmitted(true);
    onGuessAnswered(xpAwarded, isAccurate, {
      userGuess: sliderValue,
      correctValue: target,
      accuracyPct,
    });
  };

  const handleBinaryPick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (submitted) return;
    onButtonPop();

    const correctIdx = challenge.correctOptionIndex ?? 0;
    const isCorrect = idx === correctIdx;
    const nextTier: 'spotOn' | 'participated' = isCorrect ? 'spotOn' : 'participated';
    const xpAwarded = isCorrect ? 20 : 10;

    setTier(nextTier);
    setEarnedXp(xpAwarded);
    setSubmitted(true);
    onGuessAnswered(xpAwarded, isCorrect, {
      userGuess: challenge.options?.[idx] ?? idx,
      correctValue: challenge.options?.[correctIdx] ?? correctIdx,
      accuracyPct: isCorrect ? 100 : 0,
    });
  };

  const sliderValueText = formatValueWithUnit(sliderValue, challenge.unit, lang);
  const minLabelText = formatValueWithUnit(minVal, challenge.unit, lang);
  const maxLabelText = formatValueWithUnit(maxVal, challenge.unit, lang);
  const correctDisplay = isSlider
    ? formatValueWithUnit(challenge.correctValue ?? initialSliderValue, challenge.unit, lang)
    : challenge.options?.[challenge.correctOptionIndex ?? 0] ?? '';

  const tierMessage =
    tier === 'spotOn'
      ? t.guessSpotOn
      : tier === 'close'
        ? t.guessClose
        : t.guessParticipated;

  const binaryOptions = (challenge.options ?? []).slice(0, 2);
  const useSingleColumn = binaryOptions.some((opt) => opt.length > 24);

  return (
    <div
      data-testid="guess-widget"
      onClick={stop}
      onDoubleClick={stop}
      onPointerDown={stop}
      onTouchStart={stop}
      className="pointer-events-auto mt-1.5 rounded-2xl border border-white/75 bg-white/78 p-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/15 dark:bg-[#141026]/80"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span
          lang={lang}
          className="inline-flex items-center gap-1 rounded-full bg-violet-100/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
        >
          <HelpCircle className="h-3 w-3 shrink-0" />
          <span>{t.guessBadge}</span>
        </span>
        {isSlider && !submitted && (
          <span
            data-testid="guess-live-value"
            className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-black tabular-nums text-ink dark:bg-white/15 dark:text-white"
          >
            {sliderValueText}
          </span>
        )}
      </div>

      <p className="mb-2 text-[11px] sm:text-xs md:text-sm font-bold leading-snug text-ink dark:text-white whitespace-normal break-words">
        {challenge.prompt}
      </p>

      {!submitted ? (
        isSlider ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-col">
              <input
                type="range"
                min={minVal}
                max={maxVal}
                step={stepVal}
                value={sliderValue}
                data-testid="guess-slider-input"
                onClick={stop}
                onDoubleClick={stop}
                onPointerDown={stop}
                onTouchStart={stop}
                onChange={(e) => {
                  e.stopPropagation();
                  setSliderValue(Number(e.target.value));
                }}
                className="h-2 w-full cursor-pointer accent-violet-600 dark:accent-violet-400"
              />
              <div className="mt-0.5 flex justify-between text-[9px] font-bold text-ink/55 dark:text-violet-200/60">
                <span>{minLabelText}</span>
                <span>{maxLabelText}</span>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              data-testid="guess-submit-btn"
              onClick={handleSliderSubmit}
              onDoubleClick={stop}
              className="shrink-0 min-h-[40px] rounded-xl bg-ink px-3.5 py-2 text-[11px] sm:text-xs font-black text-white shadow-sm dark:bg-violet-600 whitespace-normal break-words leading-snug"
            >
              {t.guessSubmitBtn}
            </motion.button>
          </div>
        ) : (
          <div
            data-testid="guess-binary-grid"
            className={`grid gap-2 ${useSingleColumn ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {binaryOptions.map((opt, idx) => (
              <motion.button
                key={`${factId}-opt-${idx}`}
                type="button"
                whileTap={{ scale: 0.96 }}
                data-testid={`guess-binary-${idx}`}
                onClick={(e) => handleBinaryPick(e, idx)}
                onDoubleClick={stop}
                className="h-auto min-h-[48px] py-2.5 px-3.5 rounded-xl border border-ink/15 bg-white/90 text-[12px] sm:text-xs md:text-sm font-extrabold text-ink shadow-xs transition hover:border-violet-400 dark:border-white/15 dark:bg-white/10 dark:text-white flex items-center justify-center text-center whitespace-normal break-words leading-snug"
              >
                <span className="whitespace-normal break-words leading-snug">{opt}</span>
              </motion.button>
            ))}
          </div>
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="guess-result-banner"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50/90 px-3 py-2.5 dark:bg-emerald-950/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-emerald-800 dark:text-emerald-200">
              {tier === 'spotOn' ? (
                <Target className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
              )}
              <span className="whitespace-normal break-words leading-snug">{tierMessage}</span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[10px] font-black text-amber-900 dark:text-amber-200">
                <Sparkles className="h-2.5 w-2.5" />+{earnedXp} XP
              </span>
            </div>
            <p className="mt-1 text-[10.5px] font-bold text-ink/75 dark:text-violet-100/80 whitespace-normal break-words leading-snug">
              {t.guessReveal}: <span className="font-black text-ink dark:text-white">{correctDisplay}</span>
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
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-black text-white shadow-sm dark:bg-violet-600 whitespace-normal break-words leading-snug"
          >
            <RotateCw className="h-3 w-3 shrink-0" />
            <span>{t.guessFlipCta}</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
