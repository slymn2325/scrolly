'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Target } from 'lucide-react';
import {
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import {
  getTopCategory,
  normalizeCategoryAccuracy,
  type UserMemoryState,
} from '@/utils/userMemory';

interface TopicRadarChartProps {
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  onExploreCategory: (category: CategoryId) => void;
  onButtonPop: () => void;
}

const RADAR_AXES: CategoryId[] = [
  'space',
  'nature',
  'science',
  'history',
  'records',
  'human_body',
];

const SHORT_TABLE_LABELS: Record<CategoryId, Record<Language, string>> = {
  space: { tr: 'Uzay', en: 'Space' },
  nature: { tr: 'Doğa', en: 'Nature' },
  science: { tr: 'Bilim', en: 'Sci' },
  history: { tr: 'Tarih', en: 'Hist' },
  records: { tr: 'Rekor', en: 'Recs' },
  human_body: { tr: 'Vücut', en: 'Body' },
};

const COMMUNITY_TARGET_ACCURACY: Record<CategoryId, number> = {
  space: 68,
  nature: 74,
  science: 64,
  history: 70,
  records: 66,
  human_body: 72,
};

const SVG_WIDTH = 380;
const SVG_HEIGHT = 264;
const CENTER_X = 190;
const CENTER_Y = 132;
const RADAR_RADIUS = 68;
const GRID_LEVELS = [20, 40, 60, 80, 100] as const;

interface LabelPlacement {
  className: string;
  style: React.CSSProperties;
}

const AXIS_LABEL_PLACEMENTS: Record<CategoryId, LabelPlacement> = {
  space: {
    className: '-translate-x-1/2 -translate-y-1/2 justify-center',
    style: { left: '50%', top: '10%' },
  },
  nature: {
    className: '-translate-y-1/2 justify-start',
    style: { left: '69%', top: '34%' },
  },
  science: {
    className: '-translate-y-1/2 justify-start',
    style: { left: '69%', top: '67%' },
  },
  history: {
    className: '-translate-x-1/2 -translate-y-1/2 justify-center',
    style: { left: '50%', top: '91%' },
  },
  records: {
    className: '-translate-y-1/2 justify-end',
    style: { right: '69%', top: '67%' },
  },
  human_body: {
    className: '-translate-y-1/2 justify-end',
    style: { right: '69%', top: '34%' },
  },
};

function getAxisPoint(index: number, pct: number): { x: number; y: number } {
  const angleDeg = -90 + index * 60;
  const angleRad = (angleDeg * Math.PI) / 180;
  const normalizedRadius = Math.max(0.05, Math.min(1, pct / 100)) * RADAR_RADIUS;
  return {
    x: Number((Math.cos(angleRad) * normalizedRadius).toFixed(2)),
    y: Number((Math.sin(angleRad) * normalizedRadius).toFixed(2)),
  };
}

function getRingPoint(index: number, levelPct: number): { x: number; y: number } {
  const angleDeg = -90 + index * 60;
  const angleRad = (angleDeg * Math.PI) / 180;
  const r = (levelPct / 100) * RADAR_RADIUS;
  return {
    x: Number((Math.cos(angleRad) * r).toFixed(2)),
    y: Number((Math.sin(angleRad) * r).toFixed(2)),
  };
}

interface AxisStat {
  id: CategoryId;
  total: number;
  seen: number;
  liked: number;
  discoveryPct: number;
  accuracyDisplayPct: number;
  hasPersonalAccuracy: boolean;
  accuracyAttempts: number;
  hasBadge: boolean;
}

export default function TopicRadarChart({
  lang,
  memory,
  allFacts,
  onExploreCategory,
  onButtonPop,
}: TopicRadarChartProps) {
  const t = translations[lang];

  const defaultCategory = useMemo<CategoryId>(() => {
    return getTopCategory(memory.categoryWeights) ?? 'space';
  }, [memory.categoryWeights]);

  const [selectedId, setSelectedId] = useState<CategoryId>(defaultCategory);

  const statsByCategory = useMemo(() => {
    const normalizedAccuracy = normalizeCategoryAccuracy(memory.categoryAccuracy);
    const map = {} as Record<CategoryId, AxisStat>;

    for (const catId of RADAR_AXES) {
      const factsInCat = allFacts.filter((f) => f.category === catId);
      const total = Math.max(1, factsInCat.length);
      const seen = factsInCat.filter((f) => memory.seenIds.includes(f.id)).length;
      const liked = factsInCat.filter((f) => memory.favoriteIds.includes(f.id)).length;
      const discoveryPct = Math.min(100, Math.round((seen / total) * 100));

      const accStat = normalizedAccuracy[catId];
      const hasPersonalAccuracy = Boolean(accStat && accStat.attempts > 0);
      const accuracyDisplayPct = hasPersonalAccuracy
        ? Math.min(100, Math.max(0, Math.round(accStat.totalPct / accStat.attempts)))
        : COMMUNITY_TARGET_ACCURACY[catId];

      map[catId] = {
        id: catId,
        total,
        seen,
        liked,
        discoveryPct,
        accuracyDisplayPct,
        hasPersonalAccuracy,
        accuracyAttempts: accStat?.attempts ?? 0,
        hasBadge: memory.badges.includes(catId),
      };
    }

    return map;
  }, [allFacts, memory.badges, memory.categoryAccuracy, memory.favoriteIds, memory.seenIds]);

  const { avgDiscoveryPct, avgAccuracyPct, hasAnyPersonalAccuracy } = useMemo(() => {
    let discSum = 0;
    let accSum = 0;
    let anyPersonal = false;

    for (const catId of RADAR_AXES) {
      const s = statsByCategory[catId];
      discSum += s.discoveryPct;
      accSum += s.accuracyDisplayPct;
      if (s.hasPersonalAccuracy) anyPersonal = true;
    }

    return {
      avgDiscoveryPct: Math.round(discSum / RADAR_AXES.length),
      avgAccuracyPct: Math.round(accSum / RADAR_AXES.length),
      hasAnyPersonalAccuracy: anyPersonal,
    };
  }, [statsByCategory]);

  const blueVertices = useMemo(
    () => RADAR_AXES.map((catId, idx) => getAxisPoint(idx, statsByCategory[catId].discoveryPct)),
    [statsByCategory]
  );

  const pinkVertices = useMemo(
    () =>
      RADAR_AXES.map((catId, idx) =>
        getAxisPoint(idx, statsByCategory[catId].accuracyDisplayPct)
      ),
    [statsByCategory]
  );

  const bluePolygonPoints = blueVertices.map((p) => `${p.x},${p.y}`).join(' ');
  const pinkPolygonPoints = pinkVertices.map((p) => `${p.x},${p.y}`).join(' ');

  const selectedMeta = getCategoryMeta(selectedId);
  const selectedStats = statsByCategory[selectedId];

  const handleSelectAxis = (catId: CategoryId) => {
    onButtonPop();
    setSelectedId(catId);
  };

  const formattedDiscoverySummary =
    lang === 'tr'
      ? `${selectedStats.seen}/${selectedStats.total} ${t.constellationSeenLabel} • %${selectedStats.discoveryPct}`
      : `${selectedStats.seen}/${selectedStats.total} ${t.constellationSeenLabel} • ${selectedStats.discoveryPct}%`;

  const formattedAccuracySummary =
    lang === 'tr'
      ? `${selectedStats.hasPersonalAccuracy ? t.radarPersonalAccuracyBadge : t.radarTargetBadge}: %${selectedStats.accuracyDisplayPct}`
      : `${selectedStats.hasPersonalAccuracy ? t.radarPersonalAccuracyBadge : t.radarTargetBadge}: ${selectedStats.accuracyDisplayPct}%`;

  return (
    <div data-testid="topic-constellation" className="space-y-3">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
          <Target className="h-3.5 w-3.5 text-blue-500" />
          <span>{t.constellationTitle}</span>
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-ink/60 dark:text-violet-200/70">
          {t.constellationSubtitle}
        </p>
      </div>

      {/* DataMB Style Card: Percentile Comparison Header + 6-Axis Radar SVG */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1E1932]">
        {/* 1. Compact DataMB Comparison Row */}
        <div
          data-testid="radar-percentile-table"
          className="rounded-2xl border border-slate-200/80 bg-slate-50/75 px-1.5 py-2 sm:px-2.5 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div className="grid grid-cols-[minmax(62px,1.05fr)_repeat(6,minmax(0,1fr))_minmax(28px,0.72fr)] items-center gap-1 sm:gap-1.5 text-center">
            {/* Header Row */}
            <div className="pl-1 text-left text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-violet-300/60">
              {hasAnyPersonalAccuracy ? 'LIVE' : 'DATA'}
            </div>
            {RADAR_AXES.map((catId) => {
              const meta = getCategoryMeta(catId);
              const isSelected = selectedId === catId;
              return (
                <button
                  key={`hdr-${catId}`}
                  type="button"
                  onClick={() => handleSelectAxis(catId)}
                  data-testid={`radar-table-col-${catId}`}
                  aria-label={meta.label[lang]}
                  className={`flex flex-col items-center justify-center rounded-lg px-0.5 py-1 transition-all ${
                    isSelected
                      ? 'bg-blue-500/15 text-blue-700 ring-1 ring-blue-500/50 dark:bg-blue-500/25 dark:text-blue-200'
                      : 'text-slate-600 hover:bg-slate-200/60 dark:text-violet-200/80 dark:hover:bg-white/10'
                  }`}
                >
                  <img
                    src={meta.iconPath}
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span className="mt-0.5 text-[8px] sm:text-[9.5px] font-extrabold leading-none tracking-tighter sm:tracking-tight">
                    {SHORT_TABLE_LABELS[catId][lang]}
                  </span>
                </button>
              );
            })}
            <div className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-violet-200/70">
              {t.radarAvgCol}
            </div>

            {/* Row 1: Blue Dot — Discovery % */}
            <div className="flex items-center gap-1 pl-1 pt-1.5 text-left">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.55)]"
              />
              <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight text-slate-700 dark:text-slate-100">
                {t.radarDiscoveryRow}
              </span>
            </div>
            {RADAR_AXES.map((catId) => {
              const stat = statsByCategory[catId];
              const isSelected = selectedId === catId;
              return (
                <button
                  key={`disc-${catId}`}
                  type="button"
                  onClick={() => handleSelectAxis(catId)}
                  className={`mt-1.5 rounded-md px-0.5 py-1 text-[9px] sm:text-[10.5px] font-black tabular-nums tracking-tighter sm:tracking-normal transition-colors ${
                    isSelected
                      ? 'bg-blue-500/12 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                      : 'text-slate-800 hover:bg-slate-200/50 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {stat.discoveryPct}%
                </button>
              );
            })}
            <div className="mt-1.5 text-[9px] sm:text-[10.5px] font-black tabular-nums text-blue-600 dark:text-blue-400">
              {avgDiscoveryPct}%
            </div>

            {/* Row 2: Pink Dot — Accuracy / Community Target % */}
            <div className="flex items-center gap-1 pl-1 pt-1 text-left">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-[#EC4899] shadow-[0_0_6px_rgba(236,72,153,0.55)]"
              />
              <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight text-slate-600 dark:text-violet-200/80">
                {t.radarAccuracyRow}
              </span>
            </div>
            {RADAR_AXES.map((catId) => {
              const stat = statsByCategory[catId];
              const isSelected = selectedId === catId;
              return (
                <button
                  key={`acc-${catId}`}
                  type="button"
                  onClick={() => handleSelectAxis(catId)}
                  className={`mt-1 rounded-md px-0.5 py-1 text-[9px] sm:text-[10.5px] font-bold tabular-nums tracking-tighter sm:tracking-normal transition-colors ${
                    isSelected
                      ? 'bg-pink-500/12 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'
                      : stat.hasPersonalAccuracy
                        ? 'text-pink-600 hover:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-white/10'
                        : 'text-slate-500 hover:bg-slate-200/50 dark:text-violet-300/70 dark:hover:bg-white/10'
                  }`}
                >
                  {stat.accuracyDisplayPct}%
                </button>
              );
            })}
            <div className="mt-1 text-[9px] sm:text-[10.5px] font-black tabular-nums text-pink-600 dark:text-pink-400">
              {avgAccuracyPct}%
            </div>
          </div>
        </div>

        {/* 2. Interactive 6-Axis Hexagon SVG Radar */}
        <div
          data-testid="topic-radar-svg-wrap"
          className="relative mx-auto mt-2 aspect-[380/264] w-full max-w-[440px]"
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={t.constellationTitle}
          >
            <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
              {/* 5 Concentric Hexagonal Rings (20%, 40%, 60%, 80%, 100%) */}
              {GRID_LEVELS.map((level) => {
                const ringPts = RADAR_AXES.map((_, idx) => getRingPoint(idx, level))
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ');
                return (
                  <polygon
                    key={`ring-${level}`}
                    points={ringPts}
                    fill={level === 100 ? 'rgba(148, 163, 184, 0.04)' : 'none'}
                    strokeWidth={1}
                    className="stroke-[#CBD5E1] dark:stroke-white/[0.12]"
                  />
                );
              })}

              {/* 6 Radial Axis Lines */}
              {RADAR_AXES.map((catId, idx) => {
                const end = getRingPoint(idx, 100);
                const isSelected = selectedId === catId;
                return (
                  <line
                    key={`axis-line-${catId}`}
                    x1={0}
                    y1={0}
                    x2={end.x}
                    y2={end.y}
                    strokeWidth={isSelected ? 1.75 : 1}
                    className={
                      isSelected
                        ? 'stroke-blue-500/75 dark:stroke-blue-400/75'
                        : 'stroke-[#CBD5E1] dark:stroke-white/[0.12]'
                    }
                  />
                );
              })}

              {/* Ring Percentage Ticks along Top Axis */}
              {GRID_LEVELS.map((level) => {
                const pos = getRingPoint(0, level);
                return (
                  <text
                    key={`tick-${level}`}
                    x={pos.x + 3.5}
                    y={pos.y + 3}
                    fontSize={7.5}
                    fontWeight={700}
                    className="fill-slate-400 dark:fill-violet-300/45 select-none pointer-events-none"
                  >
                    {level}
                  </text>
                );
              })}

              {/* Animated Dual-Layer Polygons + Data Vertices */}
              <motion.g
                initial={{ scale: 0.14, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              >
                {/* Layer 2 (Pink): Guess & Quiz Accuracy / Community Target */}
                <motion.polygon
                  initial={false}
                  animate={{ points: pinkPolygonPoints }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  fill="rgba(236, 72, 153, 0.16)"
                  stroke="#EC4899"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />

                {/* Layer 1 (Blue): User Discovery Ratio */}
                <motion.polygon
                  initial={false}
                  animate={{ points: bluePolygonPoints }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  fill="rgba(59, 130, 246, 0.20)"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />

                {/* Pink Data Points */}
                {RADAR_AXES.map((catId, idx) => {
                  const pt = pinkVertices[idx];
                  const isSelected = selectedId === catId;
                  return (
                    <motion.circle
                      key={`pink-pt-${catId}`}
                      initial={false}
                      animate={{ cx: pt.x, cy: pt.y }}
                      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                      r={isSelected ? 4.8 : 4}
                      fill="#EC4899"
                      stroke="#FFFFFF"
                      strokeWidth={1.2}
                      className="cursor-pointer"
                      onClick={() => handleSelectAxis(catId)}
                    />
                  );
                })}

                {/* Blue Data Points + Active Ring + Touch Hit Target */}
                {RADAR_AXES.map((catId, idx) => {
                  const pt = blueVertices[idx];
                  const isSelected = selectedId === catId;
                  return (
                    <g
                      key={`blue-pt-group-${catId}`}
                      className="cursor-pointer"
                      onClick={() => handleSelectAxis(catId)}
                    >
                      {isSelected && (
                        <motion.circle
                          initial={false}
                          animate={{ cx: pt.x, cy: pt.y }}
                          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                          r={8.5}
                          fill="rgba(59, 130, 246, 0.18)"
                          stroke="#3B82F6"
                          strokeWidth={1.5}
                        />
                      )}
                      <motion.circle
                        initial={false}
                        animate={{ cx: pt.x, cy: pt.y }}
                        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                        r={isSelected ? 5.5 : 4.5}
                        fill="#3B82F6"
                        stroke="#FFFFFF"
                        strokeWidth={1.4}
                      />
                      <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
                    </g>
                  );
                })}
              </motion.g>
            </g>
          </svg>

          {/* 6 Interactive Vertex Category Pills */}
          {RADAR_AXES.map((catId) => {
            const meta = getCategoryMeta(catId);
            const placement = AXIS_LABEL_PLACEMENTS[catId];
            const isSelected = selectedId === catId;

            return (
              <motion.button
                key={`axis-pill-${catId}`}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleSelectAxis(catId)}
                data-testid={`constellation-node-${catId}`}
                aria-label={meta.label[lang]}
                style={placement.style}
                className={`absolute flex max-w-[94px] sm:max-w-[130px] items-center gap-1 rounded-full border px-2 py-1 text-[10px] sm:text-[11px] font-extrabold leading-tight transition-all focus:outline-none ${placement.className} ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-950/85 dark:text-blue-100'
                    : 'border-slate-200/90 bg-white/95 text-slate-700 hover:border-blue-300 dark:border-white/15 dark:bg-[#26203E]/95 dark:text-violet-100'
                }`}
              >
                <img
                  src={meta.iconPath}
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span className="whitespace-normal break-words text-center">
                  {meta.label[lang]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Axis Info & Action Bar */}
      <div
        data-testid="radar-selected-info"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-blue-200/80 bg-blue-50/75 px-3.5 py-2.5 dark:border-blue-500/25 dark:bg-blue-950/25"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-ink dark:text-white">
            <img
              src={selectedMeta.iconPath}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>{selectedMeta.label[lang]}</span>
            {selectedStats.hasBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/35 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-300">
                <img
                  src={UI_ICON_PATHS.badgeStar}
                  alt=""
                  aria-hidden="true"
                  className="h-3 w-3 object-contain"
                />
                <span>{selectedMeta.badge[lang]}</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-700 dark:text-violet-200/85">
            <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
              <Compass className="h-3 w-3 shrink-0" />
              <span>{formattedDiscoverySummary}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-300">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EC4899]" />
              <span>{formattedAccuracySummary}</span>
            </span>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onExploreCategory(selectedId);
          }}
          data-testid="constellation-jump-btn"
          className="inline-flex min-h-[38px] w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-black text-white shadow-sm hover:opacity-95 dark:bg-blue-600 whitespace-normal break-words leading-snug"
        >
          <span>{t.constellationExploreCategoryBtn}</span>
        </motion.button>
      </div>
    </div>
  );
}
