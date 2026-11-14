'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface DomainSketchProps {
  factId: string;
  lang: 'tr' | 'en';
  accentColor: string;
  active: boolean;
  shouldAnimate: boolean;
}

/**
 * Shared Dimension / Caliper Arrow (`<---| label |--->`) for blueprint notebook sketches.
 */
export function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  color = 'currentColor',
}: {
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  label?: string;
  color?: string;
}) {
  const nx1 = Number(x1);
  const ny1 = Number(y1);
  const nx2 = Number(x2);
  const ny2 = Number(y2);
  const mx = (nx1 + nx2) / 2;
  const my = (ny1 + ny2) / 2;
  return (
    <g stroke={color} strokeOpacity="0.65" strokeWidth="1.2" fill="none">
      <line x1={nx1} y1={ny1} x2={nx2} y2={ny2} strokeDasharray="3 2" />
      <line x1={nx1} y1={ny1 - 4} x2={nx1} y2={ny1 + 4} />
      <line x1={nx2} y1={ny2 - 4} x2={nx2} y2={ny2 + 4} />
      {label && (
        <g>
          <rect
            x={mx - label.length * 3.1 - 4}
            y={my - 8}
            width={label.length * 6.2 + 8}
            height={14}
            rx={4}
            fill="var(--sketch-pill-bg, rgba(255,255,255,0.88))"
            stroke="none"
          />
          <text
            x={mx}
            y={my + 2}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="800"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fill={color}
            stroke="none"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Interactive pulsing hotspot circle with notebook pointer label.
 */
export function HotspotPin({
  cx,
  cy,
  accentColor,
  active,
  shouldAnimate,
  label,
  align = 'right',
}: {
  cx: number | string;
  cy: number | string;
  accentColor: string;
  active: boolean;
  shouldAnimate: boolean;
  label: string;
  align?: 'left' | 'right' | 'top';
}) {
  const ncx = Number(cx);
  const ncy = Number(cy);
  const lx = align === 'left' ? ncx - 10 : align === 'top' ? ncx : ncx + 10;
  const ly = align === 'top' ? ncy - 12 : ncy + 3;
  const anchor = align === 'left' ? 'end' : align === 'top' ? 'middle' : 'start';

  return (
    <g>
      <motion.circle
        cx={ncx}
        cy={ncy}
        r={active ? 10 : 7}
        fill={accentColor}
        fillOpacity={active ? 0.28 : 0.16}
        animate={
          shouldAnimate
            ? { scale: [1, 1.45, 1], opacity: [0.65, 0.15, 0.65] }
            : undefined
        }
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: `${ncx}px`, originY: `${ncy}px` }}
      />
      <circle
        cx={ncx}
        cy={ncy}
        r="3.5"
        fill={active ? '#F59E0B' : accentColor}
        stroke="#FFFFFF"
        strokeWidth="1.2"
      />
      <text
        x={lx}
        y={ly}
        textAnchor={anchor}
        fontSize="8.5"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Animated ink stroke wrapper for hand-drawn reveal feel.
 */
export function InkPath({
  d,
  stroke = 'currentColor',
  strokeWidth = 2,
  dash,
  fill = 'none',
  fillOpacity = 0.12,
  shouldAnimate,
  delay = 0,
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number | string;
  dash?: string;
  fill?: string;
  fillOpacity?: number | string;
  shouldAnimate: boolean;
  delay?: number | string;
}) {
  return (
    <motion.path
      d={d}
      fill={fill}
      fillOpacity={fill === 'none' ? undefined : Number(fillOpacity)}
      stroke={stroke}
      strokeWidth={Number(strokeWidth)}
      strokeDasharray={dash}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={shouldAnimate && !dash ? { pathLength: 0.15, opacity: 0.5 } : false}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.85, delay: Number(delay), ease: 'easeOut' }}
    />
  );
}
