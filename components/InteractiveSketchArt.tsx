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

const SKETCH_ID_PATTERN = /^(space|nature|human|history|science|weird)-\d{2}$/;

const SKETCH_KEYWORD_MAP: Record<string, string> = {
  venus: 'space-01',
  orbit: 'sketch-orbit',
  magnetar: 'space-02',
  titan: 'space-03',
  footprint: 'space-04',
  moon: 'space-04',
  sun_mass: 'space-05',
  cold_weld: 'space-06',
  sagittarius: 'space-07',
  saturn: 'space-08',
  mars_sunset: 'space-09',
  mars: 'space-09',
  voyager: 'space-10',
  black_hole: 'sketch-blackhole',
  blackhole: 'sketch-blackhole',
  olympus_mons: 'sketch-olympus-mons',
  iss: 'sketch-iss',
  station: 'sketch-iss',
  icefish: 'nature-01',
  mycelium: 'nature-02',
  wood_wide_web: 'nature-02',
  shark: 'nature-03',
  honeybee: 'nature-04',
  bee: 'nature-04',
  swift: 'nature-05',
  koala: 'nature-06',
  dolphin: 'nature-07',
  otter: 'nature-08',
  fungus: 'nature-09',
  cactus: 'nature-10',
  immortal_jellyfish: 'sketch-jellyfish',
  tardigrade: 'sketch-tardigrade',
  whale: 'sketch-whale',
  bones: 'human-01',
  skeleton: 'human-01',
  brain: 'human-02',
  vessels: 'human-03',
  circulation: 'human-03',
  stomach: 'human-04',
  acid: 'human-04',
  cornea: 'human-05',
  dna: 'sketch-dna',
  helix: 'sketch-dna',
  tongue: 'human-07',
  heart: 'human-08',
  heartbeat: 'human-08',
  pulse: 'human-08',
  stapes: 'human-09',
  eye: 'sketch-eye',
  vision: 'sketch-eye',
  sweat: 'sketch-sweat',
  liver: 'sketch-liver',
  cleopatra: 'history-01',
  oxford: 'history-02',
  war: 'history-03',
  hourglass: 'history-03',
  purple_snail: 'history-04',
  mammoth: 'history-05',
  pompeii: 'history-06',
  steam_turbine: 'history-07',
  knocker_upper: 'history-08',
  pineapple: 'history-09',
  piri_reis: 'history-10',
  compass: 'history-10',
  gobeklitepe: 'sketch-gobeklitepe',
  treaty: 'sketch-treaty',
  kadesh: 'sketch-treaty',
  viking: 'sketch-viking',
  printing: 'sketch-printing',
  triple_point: 'science-01',
  water: 'science-01',
  superfluid: 'science-02',
  helium: 'science-02',
  time_dilation: 'science-03',
  sonoluminescence: 'science-04',
  cloud: 'science-05',
  sound_water: 'science-06',
  rainbow: 'science-07',
  trees_stars: 'science-08',
  sun_photon: 'science-09',
  glass: 'science-10',
  lightning: 'sketch-lightning',
  plasma: 'sketch-lightning',
  atom: 'sketch-atom',
  photon: 'sketch-photon',
  prism: 'sketch-photon',
  entanglement: 'sketch-entanglement',
  protein: 'sketch-protein',
  titin: 'weird-01',
  pitch: 'weird-02',
  wombat: 'weird-03',
  mailbox: 'weird-04',
  stubbs: 'weird-05',
  norway: 'weird-06',
  bromelain: 'weird-07',
  duck: 'weird-08',
  organ: 'weird-09',
  cheese: 'weird-10',
  antarctica: 'sketch-antarctica',
  decibel: 'sketch-decibel',
  cards: 'sketch-cards',
  chess: 'sketch-chess',
};

const SPACE_NATURE_SKETCH_IDS = new Set([
  'sketch-olympus-mons',
  'sketch-iss',
  'sketch-blackhole',
  'sketch-orbit',
  'sketch-tardigrade',
  'sketch-whale',
  'sketch-jellyfish',
  'neutral-space',
  'neutral-nature',
]);

const BODY_HISTORY_SKETCH_IDS = new Set([
  'sketch-eye',
  'sketch-sweat',
  'sketch-liver',
  'sketch-dna',
  'sketch-gobeklitepe',
  'sketch-treaty',
  'sketch-viking',
  'sketch-printing',
  'neutral-human_body',
  'neutral-history',
]);

function normalizeNeutralCategory(category: CategoryId | string): string {
  if (category === 'weird_records' || category === 'records') return 'neutral-records';
  if (
    category === 'space' ||
    category === 'nature' ||
    category === 'human_body' ||
    category === 'history' ||
    category === 'science'
  ) {
    return `neutral-${category}`;
  }
  return 'neutral-science';
}

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

  return normalizeNeutralCategory(category);
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
    resolvedId.startsWith('space-') ||
    resolvedId.startsWith('nature-') ||
    SPACE_NATURE_SKETCH_IDS.has(resolvedId);
  const isBodyOrHistory =
    resolvedId.startsWith('human-') ||
    resolvedId.startsWith('history-') ||
    BODY_HISTORY_SKETCH_IDS.has(resolvedId);

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
