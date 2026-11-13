'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Heart, Sparkles } from 'lucide-react';
import {
  CATEGORIES,
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { getTopCategory, type UserMemoryState } from '@/utils/userMemory';

interface TopicConstellationProps {
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  onExploreCategory: (category: CategoryId) => void;
  onButtonPop: () => void;
}

interface StarCoord {
  id: CategoryId;
  x: number;
  y: number;
}

const CATEGORY_ACCENT_HEX: Record<CategoryId, string> = {
  space: '#8B5CF6',
  nature: '#10B981',
  human_body: '#F43F5E',
  history: '#F59E0B',
  science: '#0EA5E9',
  records: '#EC4899',
};

const CONSTELLATION_NODES: StarCoord[] = [
  { id: 'space', x: 50, y: 19 },
  { id: 'nature', x: 82, y: 38 },
  { id: 'science', x: 76, y: 78 },
  { id: 'records', x: 24, y: 78 },
  { id: 'human_body', x: 18, y: 38 },
  { id: 'history', x: 50, y: 51 },
];

const CONSTELLATION_EDGES: Array<[CategoryId, CategoryId]> = [
  ['space', 'nature'],
  ['nature', 'science'],
  ['science', 'records'],
  ['records', 'human_body'],
  ['human_body', 'space'],
  ['history', 'space'],
  ['history', 'nature'],
  ['history', 'science'],
  ['history', 'records'],
  ['history', 'human_body'],
];

const BG_SPARKLES = [
  { cx: 10, cy: 14, r: 0.7 },
  { cx: 28, cy: 12, r: 0.55 },
  { cx: 68, cy: 10, r: 0.7 },
  { cx: 91, cy: 18, r: 0.6 },
  { cx: 8, cy: 62, r: 0.55 },
  { cx: 92, cy: 64, r: 0.65 },
  { cx: 50, cy: 92, r: 0.7 },
  { cx: 38, cy: 33, r: 0.5 },
  { cx: 63, cy: 35, r: 0.55 },
  { cx: 40, cy: 67, r: 0.6 },
];

export default function TopicConstellation({
  lang,
  memory,
  allFacts,
  onExploreCategory,
  onButtonPop,
}: TopicConstellationProps) {
  const t = translations[lang];

  const defaultCategory = useMemo<CategoryId>(() => {
    return getTopCategory(memory.categoryWeights) ?? 'space';
  }, [memory.categoryWeights]);

  const [selectedId, setSelectedId] = useState<CategoryId>(defaultCategory);

  const statsByCategory = useMemo(() => {
    const map = {} as Record<
      CategoryId,
      {
        total: number;
        seen: number;
        liked: number;
        weight: number;
        hasBadge: boolean;
        brightness: number;
      }
    >;

    const catIds = CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id as CategoryId);
    for (const catId of catIds) {
      const factsInCat = allFacts.filter((f) => f.category === catId);
      const total = Math.max(1, factsInCat.length);
      const seen = factsInCat.filter((f) => memory.seenIds.includes(f.id)).length;
      const liked = factsInCat.filter((f) => memory.favoriteIds.includes(f.id)).length;
      const weight = memory.categoryWeights[catId] ?? 0;
      const hasBadge = memory.badges.includes(catId);

      const seenRatio = seen / total;
      const weightBoost = Math.min(0.25, weight * 0.05);
      const badgeBoost = hasBadge ? 0.25 : 0;
      const brightness = Math.min(1, Math.max(0.22, 0.22 + seenRatio * 0.6 + weightBoost + badgeBoost));

      map[catId] = { total, seen, liked, weight, hasBadge, brightness };
    }

    return map;
  }, [allFacts, memory.badges, memory.categoryWeights, memory.favoriteIds, memory.seenIds]);

  const coordMap = useMemo(() => {
    const map = {} as Record<CategoryId, StarCoord>;
    for (const node of CONSTELLATION_NODES) {
      map[node.id] = node;
    }
    return map;
  }, []);

  const selectedMeta = getCategoryMeta(selectedId);
  const selectedStats = statsByCategory[selectedId];

  return (
    <div data-testid="topic-constellation" className="space-y-2.5">
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span>{t.constellationTitle}</span>
        </h3>
        <p className="mt-0.5 text-[11px] font-medium text-ink/60 dark:text-violet-200/70">
          {t.constellationSubtitle}
        </p>
      </div>

      {/* Interactive Celestial Web Canvas */}
      <div className="relative h-52 w-full overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-[#120D2B] via-[#1B1443] to-[#0D1936] shadow-inner dark:border-violet-500/30">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {/* Ambient Micro-Stars */}
          {BG_SPARKLES.map((star, idx) => (
            <circle
              key={`bg-star-${idx}`}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill="rgba(255, 255, 255, 0.45)"
            />
          ))}

          {/* Constellation Filament Lines */}
          {CONSTELLATION_EDGES.map(([aId, bId]) => {
            const a = coordMap[aId];
            const b = coordMap[bId];
            const aActive = (statsByCategory[aId]?.seen ?? 0) > 0 || (statsByCategory[aId]?.weight ?? 0) > 0;
            const bActive = (statsByCategory[bId]?.seen ?? 0) > 0 || (statsByCategory[bId]?.weight ?? 0) > 0;
            const isHighlightedEdge = aId === selectedId || bId === selectedId;

            return (
              <line
                key={`${aId}-${bId}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  isHighlightedEdge
                    ? 'rgba(196, 181, 253, 0.78)'
                    : aActive && bActive
                      ? 'rgba(167, 139, 250, 0.48)'
                      : 'rgba(255, 255, 255, 0.16)'
                }
                strokeWidth={isHighlightedEdge ? 0.85 : 0.45}
                strokeDasharray={aActive || bActive ? undefined : '1.5 1.5'}
              />
            );
          })}
        </svg>

        {/* Interactive Star Nodes */}
        {CONSTELLATION_NODES.map((node) => {
          const meta = getCategoryMeta(node.id);
          const stat = statsByCategory[node.id];
          const isSelected = selectedId === node.id;

          return (
            <motion.button
              key={node.id}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onButtonPop();
                setSelectedId(node.id);
              }}
              data-testid={`constellation-node-${node.id}`}
              aria-label={meta.label[lang]}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus:outline-none"
            >
              <span
                style={{
                  opacity: stat?.brightness ?? 0.3,
                  boxShadow: isSelected
                    ? `0 0 22px 6px ${CATEGORY_ACCENT_HEX[node.id]}`
                    : `0 0 ${Math.round(8 + (stat?.brightness ?? 0.3) * 14)}px 2px ${CATEGORY_ACCENT_HEX[node.id]}`,
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-full border p-1.5 transition-all ${
                  isSelected
                    ? 'scale-110 border-white bg-white/30'
                    : 'border-white/40 bg-white/15 group-hover:scale-105'
                }`}
              >
                <img
                  src={meta.iconPath}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 object-contain drop-shadow-sm"
                />
              </span>
              <span
                className={`mt-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight ${
                  isSelected
                    ? 'bg-white text-ink shadow-sm'
                    : 'bg-black/45 text-white/85'
                }`}
              >
                {meta.label[lang]}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Star Detail Strip + Jump Button */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-violet-200/70 bg-violet-50/75 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink dark:text-white">
            <img
              src={selectedMeta.iconPath}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 object-contain"
            />
            <span className="truncate">{selectedMeta.label[lang]}</span>
            {selectedStats?.hasBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/30 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-300">
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
          <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-ink/65 dark:text-violet-200/75">
            <span className="inline-flex items-center gap-1">
              <Compass className="h-3 w-3 text-violet-600 dark:text-violet-300" />
              {selectedStats?.seen ?? 0}/{selectedStats?.total ?? 10} {t.constellationSeenLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-500" />
              {selectedStats?.liked ?? 0} {t.constellationLikedLabel}
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
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:opacity-95 dark:bg-violet-600"
        >
          <span>{t.constellationExploreCategoryBtn}</span>
          <ArrowRight className="h-3 w-3" />
        </motion.button>
      </div>
    </div>
  );
}
