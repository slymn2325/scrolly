'use client';

import React, { useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Hand, Sparkles } from 'lucide-react';
import type { CategoryId } from '@/types/fact';
import { SpaceNatureSketch } from './sketch/SpaceNatureSketches';
import { BodyHistorySketch } from './sketch/BodyHistorySketches';
import { ScienceWeirdSketch } from './sketch/ScienceWeirdSketches';

interface InteractiveSketchArtProps {
  factId?: string;
  category: CategoryId;
  accentColor: string;
  lang: 'tr' | 'en';
  onButtonPop?: () => void;
}

const FALLBACK_FACT_BY_CATEGORY: Record<CategoryId, string> = {
  space: 'space-01',
  nature: 'nature-01',
  human_body: 'human-01',
  history: 'history-01',
  science: 'science-01',
  records: 'weird-01',
};

export default function InteractiveSketchArt({
  factId,
  category,
  accentColor,
  lang,
  onButtonPop,
}: InteractiveSketchArtProps) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.25 });
  const shouldAnimate = !reduceMotion && isInView;
  const uid = useId().replace(/:/g, '');
  const gridPatternId = `sketch-grid-${uid}`;

  const resolvedId = factId || FALLBACK_FACT_BY_CATEGORY[category];
  const isSpaceOrNature =
    resolvedId.startsWith('space-') || resolvedId.startsWith('nature-');
  const isBodyOrHistory =
    resolvedId.startsWith('human-') || resolvedId.startsWith('history-');

  const handleInteract = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onButtonPop?.();
    setActive((prev) => !prev);
  };

  const hintLabel =
    lang === 'tr'
      ? active
        ? 'Ölçüm Aktif'
        : 'Dokun & Canlandır'
      : active
      ? 'Sim Active'
      : 'Tap to Simulate';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.35 }}
      data-testid="interactive-sketch-art"
      data-fact-id={resolvedId}
      data-sketch-active={active ? 'true' : 'false'}
      onClick={handleInteract}
      onDoubleClick={(e) => e.stopPropagation()}
      className="pointer-events-auto relative mx-auto flex h-full w-full max-w-[348px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-ink/15 bg-white/55 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors hover:bg-white/70 dark:border-violet-300/20 dark:bg-[#120F24]/65 dark:hover:bg-[#181430]/75 select-none"
    >
      {/* Top-Left Notebook Sketch Index Badge */}
      <div className="pointer-events-none absolute left-2.5 top-2 z-10 flex items-center gap-1 rounded-md border border-ink/10 bg-white/75 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-ink/70 dark:border-white/15 dark:bg-black/45 dark:text-violet-200/85">
        <span>FIG. {resolvedId.toUpperCase()}</span>
      </div>

      {/* Top-Right Interactive Hotspot Control Badge */}
      <button
        type="button"
        onClick={handleInteract}
        data-testid="sketch-interact-btn"
        aria-pressed={active}
        className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold transition-all ${
          active
            ? 'border-amber-400 bg-amber-400/90 text-ink shadow-sm'
            : 'border-ink/15 bg-white/80 text-ink/80 hover:bg-white dark:border-white/20 dark:bg-white/15 dark:text-violet-100'
        }`}
      >
        {active ? <Sparkles className="h-2.5 w-2.5" /> : <Hand className="h-2.5 w-2.5" />}
        <span>{hintLabel}</span>
      </button>

      {/* Hand-Drawn Sketch & Blueprint SVG Canvas */}
      <svg
        viewBox="0 0 320 170"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full text-ink dark:text-violet-100"
      >
        <defs>
          <pattern
            id={gridPatternId}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.06"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>

        {/* Graph-Paper Sketchbook Grid Background */}
        <rect x="0" y="0" width="320" height="170" fill={`url(#${gridPatternId})`} />

        {/* Notebook Corner Calibration Marks */}
        <path
          d="M 12 20 L 12 12 L 20 12 M 300 12 L 308 12 L 308 20 M 12 150 L 12 158 L 20 158 M 300 158 L 308 158 L 308 150"
          fill="none"
          stroke={accentColor}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />

        {/* Topic-Specific Interactive Sketch Diagram */}
        {isSpaceOrNature ? (
          <SpaceNatureSketch
            factId={resolvedId}
            lang={lang}
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
          />
        ) : isBodyOrHistory ? (
          <BodyHistorySketch
            factId={resolvedId}
            lang={lang}
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
          />
        ) : (
          <ScienceWeirdSketch
            factId={resolvedId}
            lang={lang}
            accentColor={accentColor}
            active={active}
            shouldAnimate={shouldAnimate}
          />
        )}
      </svg>
    </motion.div>
  );
}
