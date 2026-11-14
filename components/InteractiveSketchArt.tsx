'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Hand, Sparkles } from 'lucide-react';
import type { CategoryId } from '@/types/fact';
import { SpaceNatureSketch } from './sketch/SpaceNatureSketches';
import { BodyHistorySketch } from './sketch/BodyHistorySketches';
import { ScienceWeirdSketch } from './sketch/ScienceWeirdSketches';

export const DIAGRAM_INTERACTED_STORAGE_KEY = 'scrolly_diagram_interacted';

interface InteractiveSketchArtProps {
  factId?: string;
  sketchType?: string;
  category: CategoryId;
  accentColor: string;
  lang: 'tr' | 'en';
  isFirstCard?: boolean;
  isActive?: boolean;
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

const SKETCH_ID_PATTERN = /^(space|nature|human|history|science|weird)-\d{2}$/;

const SKETCH_KEYWORD_MAP: Record<string, string> = {
  orbit: 'space-01',
  planet: 'space-01',
  neutron: 'space-02',
  star: 'space-02',
  diamond_rain: 'space-03',
  footprint: 'space-04',
  moon: 'space-04',
  galaxy: 'space-05',
  voyager: 'space-06',
  sunset: 'space-07',
  mars: 'space-07',
  black_hole: 'space-08',
  olympus_mons: 'space-09',
  iss: 'space-10',
  station: 'space-10',
  octopus: 'nature-01',
  tree: 'nature-02',
  forest: 'nature-02',
  immortal_jellyfish: 'nature-03',
  tardigrade: 'nature-04',
  shark: 'nature-05',
  honeybee: 'nature-06',
  bee: 'nature-06',
  flamingo: 'nature-07',
  fungi: 'nature-08',
  mycelium: 'nature-08',
  sloth: 'nature-09',
  whale: 'nature-10',
  bones: 'human-01',
  skeleton: 'human-01',
  brain: 'human-02',
  neurons: 'human-02',
  vessels: 'human-03',
  circulation: 'human-03',
  stomach: 'human-04',
  acid: 'human-04',
  dna: 'human-05',
  helix: 'human-05',
  eye: 'human-06',
  vision: 'human-06',
  heart: 'human-07',
  pulse: 'human-07',
  sweat: 'human-08',
  skin: 'human-08',
  liver: 'human-09',
  fingerprint: 'human-10',
  gobeklitepe: 'history-01',
  monolith: 'history-01',
  pyramid: 'history-01',
  war: 'history-02',
  hourglass: 'history-02',
  oxford: 'history-03',
  aztec: 'history-03',
  cleopatra: 'history-04',
  timeline: 'history-04',
  printing: 'history-05',
  scroll: 'history-05',
  olympics: 'history-06',
  napoleon: 'history-07',
  viking: 'history-08',
  kadesh: 'history-09',
  treaty: 'history-09',
  map: 'history-10',
  compass: 'history-10',
  water: 'science-01',
  triple_point: 'science-01',
  banana: 'science-02',
  radiation: 'science-02',
  lightning: 'science-03',
  plasma: 'science-03',
  atom: 'science-04',
  quantum: 'science-04',
  light: 'science-05',
  photon: 'science-05',
  gold: 'science-06',
  supernova: 'science-06',
  helium: 'science-07',
  superfluid: 'science-07',
  entanglement: 'science-08',
  sun_photon: 'science-09',
  glass: 'science-10',
  amorphous: 'science-10',
  protein: 'weird-01',
  word: 'weird-01',
  eiffel: 'weird-02',
  thermal: 'weird-02',
  cloud: 'weird-03',
  weight: 'weird-03',
  chess: 'weird-04',
  honey: 'weird-05',
  jar: 'weird-05',
  wombat: 'weird-06',
  cube: 'weird-06',
  antarctica: 'weird-07',
  desert: 'weird-07',
  shuffling: 'weird-08',
  cards: 'weird-08',
  saturn: 'weird-09',
  density: 'weird-09',
  sound: 'weird-10',
  decibel: 'weird-10',
};

export function resolveSketchId(
  factId?: string,
  sketchType?: string,
  category: CategoryId = 'space'
): string {
  if (factId && SKETCH_ID_PATTERN.test(factId)) {
    return factId;
  }

  if (sketchType) {
    const normalized = sketchType.trim().toLowerCase();
    if (SKETCH_ID_PATTERN.test(normalized)) {
      return normalized;
    }
    if (SKETCH_KEYWORD_MAP[normalized]) {
      return SKETCH_KEYWORD_MAP[normalized];
    }
    for (const [keyword, mappedId] of Object.entries(SKETCH_KEYWORD_MAP)) {
      if (normalized.includes(keyword)) {
        return mappedId;
      }
    }
  }

  return FALLBACK_FACT_BY_CATEGORY[category];
}

export default function InteractiveSketchArt({
  factId,
  sketchType,
  category,
  accentColor,
  lang,
  isFirstCard = false,
  isActive = true,
  onButtonPop,
}: InteractiveSketchArtProps) {
  const [active, setActive] = useState(false);
  const [hasInteractedEver, setHasInteractedEver] = useState(true);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.25 });
  const shouldAnimate = isActive && !reduceMotion && isInView;
  const uid = useId().replace(/:/g, '');
  const gridPatternId = `sketch-grid-${uid}`;

  useEffect(() => {
    if (!isActive) {
      setActive(false);
    }
  }, [isActive]);

  useEffect(() => {
    try {
      const interacted = window.localStorage.getItem(DIAGRAM_INTERACTED_STORAGE_KEY) === 'true';
      setHasInteractedEver(interacted);
    } catch {
      setHasInteractedEver(false);
    }

    const onSync = () => setHasInteractedEver(true);
    window.addEventListener('scrolly-diagram-interacted', onSync);
    return () => window.removeEventListener('scrolly-diagram-interacted', onSync);
  }, []);

  const resolvedId = resolveSketchId(factId, sketchType, category);
  const isSpaceOrNature =
    resolvedId.startsWith('space-') || resolvedId.startsWith('nature-');
  const isBodyOrHistory =
    resolvedId.startsWith('human-') || resolvedId.startsWith('history-');

  const handleInteract = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onButtonPop?.();
    if (!hasInteractedEver) {
      setHasInteractedEver(true);
      try {
        window.localStorage.setItem(DIAGRAM_INTERACTED_STORAGE_KEY, 'true');
        window.dispatchEvent(new Event('scrolly-diagram-interacted'));
      } catch {
        // Ignore storage restrictions in private mode
      }
    }
    setActive((prev) => !prev);
  };

  const showOnboardingHint = isFirstCard && isActive && !hasInteractedEver && !active;

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
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="pointer-events-auto relative mx-auto flex h-full w-full max-w-[348px] lg:max-w-[460px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors hover:bg-white dark:border-violet-300/20 dark:bg-slate-900/95 dark:hover:bg-slate-800/95 select-none"
    >
      {/* Top-Left Notebook Sketch Index Badge */}
      <div className="pointer-events-none absolute left-2.5 top-2 z-10 flex items-center gap-1 rounded-md border border-ink/10 bg-white/75 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-ink/70 dark:border-white/15 dark:bg-black/45 dark:text-violet-200/85">
        <span>FIG. {resolvedId.toUpperCase()}</span>
      </div>

      {/* Top-Right Interactive Hotspot Control Badge */}
      <button
        type="button"
        onClick={handleInteract}
        onDoubleClick={(e) => e.stopPropagation()}
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

      {/* First-Time Onboarding Pulsing Ring + Compact Badge */}
      {showOnboardingHint && (
        <div
          data-testid="diagram-onboarding-hint"
          className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-violet-300 bg-violet-950/95 px-3 py-1 text-[10.5px] font-black text-white shadow-lg dark:border-amber-300/50 dark:bg-violet-600/95"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90 ${
                isActive ? 'animate-ping' : ''
              }`}
            />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300" />
          </span>
          <span className="whitespace-nowrap">
            {lang === 'tr' ? 'Dokun & Keşfet' : 'Tap Diagram'}
          </span>
        </div>
      )}

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
