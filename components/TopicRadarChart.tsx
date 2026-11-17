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
  'statistics',
  'history',
  'records',
  'human_body',
];

const SHORT_TABLE_LABELS: Record<CategoryId, Record<Language, string>> = {
  space: { tr: 'Uzay', en: 'Space' },
  nature: { tr: 'Doğa', en: 'Nature' },
  science: { tr: 'Bilim', en: 'Sci' },
  statistics: { tr: 'İstat.', en: 'Stats' },
  history: { tr: 'Tarih', en: 'Hist' },
  records: { tr: 'Rekor', en: 'Recs' },
  human_body: { tr: 'Vücut', en: 'Body' },
};

const COMMUNITY_TARGET_ACCURACY: Record<CategoryId, number> = {
  space: 68,
  nature: 74,
  science: 64,
  statistics: 62,
  history: 70,
  records: 66,
  human_body: 72,
};

const SVG_WIDTH = 380;
const SVG_HEIGHT = 312;
const CENTER_X = 190;
const CENTER_Y = 144;
const RADAR_RADIUS = 68;
const GRID_LEVELS = [20, 40, 60, 80, 100] as const;

interface LabelPlacement {
  className: string;
  style: React.CSSProperties;
}

const AXIS_LABEL_PLACEMENTS: Record<CategoryId, LabelPlacement> = {
  space: {
    className: '-translate-x-1/2 -translate-y-1/2 justify-center',
    style: { left: '50%', top: '8.5%' },
  },
  nature: {
    className: '-translate-y-1/2 justify-start',
    style: { left: '68%', top: '27.5%' },
  },
  science: {
    className: '-translate-y-1/2 justify-start',
    style: { left: '70%', top: '55.5%' },
  },
  statistics: {
    className: '-translate-y-1/2 justify-start',
    style: { left: '57%', top: '83.5%' },
  },
  history: {
    className: '-translate-y-1/2 justify-end',
    style: { right: '57%', top: '83.5%' },
  },
  records: {
    className: '-translate-y-1/2 justify-end',
    style: { right: '70%', top: '55.5%' },
  },
  human_body: {
    className: '-translate-y-1/2 justify-end',
    style: { right: '68%', top: '27.5%' },
  },
};

function getAxisPoint(index: number, pct: number): { x: number; y: number } {
  const angleStep = 360 / RADAR_AXES.length;
  const angleDeg = -90 + index * angleStep;
  const angleRad = (angleDeg * Math.PI) / 180;
  const normalizedRadius = Math.max(0.05, Math.min(1, pct / 100)) * RADAR_RADIUS;
  return {
    x: Number((Math.cos(angleRad) * normalizedRadius).toFixed(2)),
    y: Number((Math.sin(angleRad) * normalizedRadius).toFixed(2)),
  };
}

function getRingPoint(index: number, levelPct: number): { x: number; y: number } {
  const angleStep = 360 / RADAR_AXES.length;
  const angleDeg = -90 + index * angleStep;
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
        <h3 className="cik-headline flex items-center gap-2 text-cik-text">
          <Target className="h-5 w-5 text-cik-cta" />
          <span>{t.constellationTitle}</span>
        </h3>
        <p className="cik-footnote mt-1 text-cik-text-2">
          {t.constellationSubtitle}
        </p>
      </div>

      {/* DataMB Style Card: Percentile Comparison Header + 7-Axis Radar SVG */}
      <div className="overflow-visible rounded-sticker border border-cik-line bg-cik-surface p-4 shadow-e1">
        {/* 1. Compact DataMB Comparison Row */}
        <div
          data-testid="radar-percentile-table"
          className="overflow-x-auto rounded-cik-lg border border-cik-line bg-cik-surface-2 px-2 py-2"
        >
          <div className="grid min-w-max grid-cols-[minmax(72px,1fr)_repeat(7,minmax(44px,1fr))_minmax(44px,0.7fr)] items-center gap-1 text-center">
            {/* Header Row */}
            <div className="cik-caption-2 pl-1 text-left text-cik-text-3">
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
                  className={`cik-caption-2 flex min-h-11 flex-col items-center justify-center rounded-cik-sm px-1 py-1 ${
                    isSelected ? 'bg-cik-pink text-cik-text' : 'text-cik-text-2'
                  }`}
                >
                  <img
                    src={meta.iconPath}
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span className="cik-caption-2 mt-1 leading-none">
                    {SHORT_TABLE_LABELS[catId][lang]}
                  </span>
                </button>
              );
            })}
            <div className="cik-caption-2 text-cik-text-2">
              {t.radarAvgCol}
            </div>

            {/* Row 1: Blue Dot — Discovery % */}
            <div className="flex items-center gap-1 pl-1 pt-1.5 text-left">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-cik-cta"
              />
              <span className="cik-caption-2 leading-tight text-cik-text">
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
                  className={`cik-caption-2 mt-2 min-h-11 rounded-cik-sm px-1 py-1 tabular-nums ${
                    isSelected ? 'bg-cik-pink text-cik-text' : 'text-cik-text'
                  }`}
                >
                  {stat.discoveryPct}%
                </button>
              );
            })}
            <div className="cik-caption-2 mt-2 tabular-nums text-cik-cta">
              {avgDiscoveryPct}%
            </div>

            {/* Row 2: Pink Dot — Accuracy / Community Target % */}
            <div className="flex items-center gap-1 pl-1 pt-1 text-left">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-cik-berry"
              />
              <span className="cik-caption-2 leading-tight text-cik-text-2">
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
                  className={`cik-caption-2 mt-1 min-h-11 rounded-cik-sm px-1 py-1 tabular-nums ${
                    isSelected ? 'bg-cik-pink text-cik-text' : 'text-cik-text-2'
                  }`}
                >
                  {stat.accuracyDisplayPct}%
                </button>
              );
            })}
            <div className="cik-caption-2 mt-1 tabular-nums text-cik-cta">
              {avgAccuracyPct}%
            </div>
          </div>
        </div>

        {/* 2. Interactive 7-Axis Heptagon SVG Radar */}
        <div
          data-testid="topic-radar-svg-wrap"
          className="relative mx-auto mt-2 mb-6 aspect-[380/312] w-full max-w-[440px] pb-3"
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={t.constellationTitle}
          >
            <g transform={`translate(${CENTER_X}, ${CENTER_Y})`}>
              {/* 5 Concentric Heptagonal Rings (20%, 40%, 60%, 80%, 100%) */}
              {GRID_LEVELS.map((level) => {
                const ringPts = RADAR_AXES.map((_, idx) => getRingPoint(idx, level))
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ');
                return (
                  <polygon
                    key={`ring-${level}`}
                    points={ringPts}
                    fill="none"
                    stroke="var(--cik-line)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* 7 Radial Axis Lines */}
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
                    stroke={isSelected ? 'var(--cik-cta)' : 'var(--cik-line)'}
                    strokeWidth={isSelected ? 1.75 : 1}
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
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--cik-text-3)"
                    className="pointer-events-none select-none"
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
                  fill="color-mix(in srgb, var(--cik-berry) 28%, transparent)"
                  stroke="var(--cik-berry)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />

                {/* Layer 1 (Blue): User Discovery Ratio */}
                <motion.polygon
                  initial={false}
                  animate={{ points: bluePolygonPoints }}
                  transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                  fill="color-mix(in srgb, var(--cik-cta) 24%, transparent)"
                  stroke="var(--cik-cta)"
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
                      fill="var(--cik-berry)"
                      stroke="var(--cik-sticker-rim)"
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
                          fill="color-mix(in srgb, var(--cik-cta) 24%, transparent)"
                          stroke="var(--cik-cta)"
                          strokeWidth={1.5}
                        />
                      )}
                      <motion.circle
                        initial={false}
                        animate={{ cx: pt.x, cy: pt.y }}
                        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                        r={isSelected ? 5.5 : 4.5}
                        fill="var(--cik-cta)"
                        stroke="var(--cik-sticker-rim)"
                        strokeWidth={1.4}
                      />
                      <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />
                    </g>
                  );
                })}
              </motion.g>
            </g>
          </svg>

          {/* 7 Interactive Vertex Category Pills */}
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
                className={`cik-caption-2 absolute flex max-w-[8rem] items-center gap-1 rounded-pill border px-2 py-1 leading-tight ${placement.className} ${
                  isSelected
                    ? 'border-cik-berry bg-cik-pink text-cik-text'
                    : 'border-cik-line bg-cik-surface text-cik-text-2'
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
        className="flex flex-col justify-between gap-3 rounded-cik-lg border border-cik-line bg-cik-surface-2 p-4 sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="cik-footnote flex flex-wrap items-center gap-2 text-cik-text">
            <img
              src={selectedMeta.iconPath}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span>{selectedMeta.label[lang]}</span>
            {selectedStats.hasBadge && (
              <span className="cik-caption-2 inline-flex items-center gap-1 rounded-pill bg-cik-butter px-2 py-1 text-cik-butter-text">
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
          <div className="cik-caption-2 mt-1 flex flex-wrap items-center gap-3 text-cik-text-2">
            <span className="inline-flex items-center gap-1 text-cik-text">
              <Compass className="h-3 w-3 shrink-0" />
              <span>{formattedDiscoverySummary}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-cik-text-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cik-berry" />
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
          className="cik-footnote inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta sm:w-auto"
        >
          <span>{t.constellationExploreCategoryBtn}</span>
        </motion.button>
      </div>
    </div>
  );
}
