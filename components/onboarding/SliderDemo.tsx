'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import { usePrefersReducedMotion } from '@/components/onboarding/usePrefersReducedMotion';

const MIN = 0;
const MAX = 100;
const REST = 42;

interface SliderDemoProps {
  lang: Language;
}

export default function SliderDemo({ lang }: SliderDemoProps) {
  const copy = translations[lang];
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(REST);
  const [trackWidth, setTrackWidth] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setTrackWidth(track.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const cycle = ((now - started) / 1000) % 4;
      const phase = cycle / 4;
      const sweep = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      setValue(Math.round(12 + sweep * 76));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced]);

  const span = MAX - MIN;
  const ratio = span === 0 ? 0 : (value - MIN) / span;
  const travel = Math.max(0, trackWidth - 28);
  const thumbX = ratio * travel;
  const valueText = `${value} ${copy.onboardingDemoUnit}`;

  const nudge = (direction: number) => {
    setPaused(true);
    setValue((current) => Math.min(MAX, Math.max(MIN, current + direction)));
  };

  return (
    <div className="flex flex-col gap-4 rounded-cik-md bg-cik-surface-2 p-5">
      <p className="cik-title-2 cik-tabular flex items-baseline gap-2 text-cik-text">
        <span>{value}</span>
        <span className="cik-footnote text-cik-text-2">{copy.onboardingDemoUnit}</span>
      </p>
      <div ref={trackRef} className="relative h-11">
        <div className="absolute left-0 right-0 top-4 h-2 overflow-hidden rounded-pill bg-cik-line">
          <div
            className="h-full w-full origin-left rounded-pill bg-cik-cta"
            style={{ transform: `scaleX(${ratio})` }}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-2 h-7 w-7 rounded-pill bg-cik-surface shadow-sticker"
          style={{ transform: `translateX(${thumbX}px)` }}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={value}
          data-testid="onboarding-slider"
          aria-label={copy.onboardingDemoAria}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={valueText}
          className="absolute inset-0 h-11 w-full cursor-pointer opacity-0"
          onPointerDown={() => setPaused(true)}
          onChange={(event) => {
            setPaused(true);
            setValue(Number(event.target.value));
          }}
          onKeyDown={(event) => {
            if (!event.shiftKey) return;
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
              return;
            }
            event.preventDefault();
            const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 10 : -10;
            nudge(direction);
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="cik-footnote cik-tabular text-cik-text-2">{MIN}</span>
        <span className="cik-footnote cik-tabular text-cik-text-2">{MAX}</span>
      </div>
    </div>
  );
}
