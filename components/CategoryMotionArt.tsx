'use client';

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { CategoryId } from '@/types/fact';
import { CATEGORY_ILLUSTRATION_MAP, CATEGORY_SUB_ICON_MAP } from '@/utils/icons8Assets';

interface CategoryMotionArtProps {
  category: CategoryId;
  accentColor: string;
  iconName: string;
  emoji?: string;
  variant?: 'hero' | 'compact';
}

export default function CategoryMotionArt({
  category,
  accentColor,
  variant = 'hero',
}: CategoryMotionArtProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.25 });
  const shouldAnimate = !reduceMotion && isInView;
  const heroIllustration = CATEGORY_ILLUSTRATION_MAP[category];
  const subIllustration = CATEGORY_SUB_ICON_MAP[category];

  if (variant === 'compact') {
    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.35 }}
        data-testid="category-motion-art"
        data-category={category}
        style={{
          background: `linear-gradient(135deg, ${accentColor}16 0%, ${accentColor}08 100%)`,
          borderColor: `${accentColor}30`,
        }}
        className="relative flex h-24 w-full items-center justify-between overflow-hidden rounded-2xl border px-4"
      >
        <div className="relative z-10 flex items-center gap-3">
          <motion.div
            animate={
              shouldAnimate
                ? {
                    y: [0, -3, 0],
                    rotate: [-3, 3, -3],
                  }
                : undefined
            }
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              boxShadow: `0 6px 18px -4px ${accentColor}40`,
            }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl p-1.5 backdrop-blur-md dark:bg-[#241E3D]/90"
          >
            <img
              src={heroIllustration}
              alt=""
              aria-hidden="true"
              className="h-11 w-11 object-contain drop-shadow-sm"
            />
          </motion.div>
          <img
            src={subIllustration}
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain opacity-85 drop-shadow-sm"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      data-testid="category-motion-art"
      data-category={category}
      className="relative flex h-60 w-60 items-center justify-center select-none sm:h-72 sm:w-72"
    >
      {/* Breathing Glow Halo */}
      <motion.div
        animate={shouldAnimate ? { scale: [1, 1.14, 1], opacity: [0.35, 0.65, 0.35] } : undefined}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: `radial-gradient(circle, ${accentColor}55 0%, ${accentColor}14 55%, transparent 72%)`,
        }}
        className="absolute inset-0 rounded-full blur-xl"
      />

      {/* Category-Specific Animated SVG Scene */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {category === 'space' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          <motion.g
            style={{ originX: '120px', originY: '120px' }}
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="120"
              cy="120"
              r="96"
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.32"
              strokeWidth="1.75"
              strokeDasharray="6 8"
            />
            <circle cx="120" cy="24" r="7" fill={accentColor} />
            <circle cx="204" cy="166" r="4.5" fill="#FBBF24" />
          </motion.g>

          <motion.g
            style={{ originX: '120px', originY: '120px' }}
            animate={shouldAnimate ? { rotate: -360 } : undefined}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          >
            <ellipse
              cx="120"
              cy="120"
              rx="82"
              ry="34"
              transform="rotate(-22 120 120)"
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.55"
              strokeWidth="2.5"
            />
            <circle cx="46" cy="96" r="5" fill="#38BDF8" />
          </motion.g>

          {[
            { cx: 34, cy: 52, d: 2.1 },
            { cx: 196, cy: 48, d: 2.8 },
            { cx: 48, cy: 192, d: 2.4 },
            { cx: 192, cy: 198, d: 3.1 },
          ].map((s, idx) => (
            <motion.circle
              key={idx}
              cx={s.cx}
              cy={s.cy}
              r="3"
              fill={accentColor}
              animate={shouldAnimate ? { opacity: [0.25, 1, 0.25], scale: [0.8, 1.4, 0.8] } : undefined}
              transition={{ duration: s.d, repeat: Infinity, delay: idx * 0.4 }}
            />
          ))}
        </svg>
      )}

      {category === 'nature' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          {[0, 60, 120, 180, 240, 300].map((deg, idx) => (
            <motion.ellipse
              key={deg}
              cx="120"
              cy="64"
              rx="22"
              ry="42"
              transform={`rotate(${deg} 120 120)`}
              fill={accentColor}
              fillOpacity="0.16"
              stroke={accentColor}
              strokeOpacity="0.45"
              strokeWidth="1.5"
              animate={
                shouldAnimate
                  ? { scale: [1, 1.07, 1], opacity: [0.55, 0.9, 0.55] }
                  : undefined
              }
              transition={{ duration: 3.6, repeat: Infinity, delay: idx * 0.25 }}
            />
          ))}
          {[
            { cx: 52, cy: 170, dx: 8, dy: -16 },
            { cx: 185, cy: 162, dx: -10, dy: -18 },
            { cx: 70, cy: 58, dx: 6, dy: -12 },
            { cx: 174, cy: 66, dx: -6, dy: -14 },
          ].map((orb, idx) => (
            <motion.circle
              key={idx}
              cx={orb.cx}
              cy={orb.cy}
              r="4.5"
              fill={accentColor}
              animate={
                shouldAnimate
                  ? {
                      x: [0, orb.dx, 0],
                      y: [0, orb.dy, 0],
                      opacity: [0.35, 1, 0.35],
                    }
                  : undefined
              }
              transition={{ duration: 3.2 + idx * 0.4, repeat: Infinity }}
            />
          ))}
        </svg>
      )}

      {category === 'human_body' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          <motion.circle
            cx="120"
            cy="120"
            r="84"
            fill="none"
            stroke={accentColor}
            strokeOpacity="0.28"
            strokeWidth="2"
            animate={shouldAnimate ? { scale: [0.95, 1.08, 0.95] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '120px', originY: '120px' }}
          />
          <motion.circle
            cx="120"
            cy="120"
            r="64"
            fill="none"
            stroke={accentColor}
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeDasharray="10 6"
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '120px', originY: '120px' }}
          />
          <motion.path
            d="M 20 120 L 66 120 L 82 88 L 98 158 L 116 74 L 132 146 L 146 106 L 160 120 L 220 120"
            fill="none"
            stroke={accentColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={
              shouldAnimate
                ? { pathLength: [0.15, 1, 0.15], opacity: [0.45, 1, 0.45] }
                : undefined
            }
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      )}

      {category === 'history' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          <motion.g
            style={{ originX: '120px', originY: '120px' }}
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="120"
              cy="120"
              r="90"
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.45"
              strokeWidth="2.5"
              strokeDasharray="4 10"
            />
            <polygon
              points="120,24 128,42 112,42"
              fill={accentColor}
            />
          </motion.g>
          <motion.g
            style={{ originX: '120px', originY: '120px' }}
            animate={shouldAnimate ? { rotate: -360 } : undefined}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          >
            <rect
              x="64"
              y="64"
              width="112"
              height="112"
              rx="18"
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.4"
              strokeWidth="2"
            />
            <rect
              x="64"
              y="64"
              width="112"
              height="112"
              rx="18"
              transform="rotate(45 120 120)"
              fill="none"
              stroke={accentColor}
              strokeOpacity="0.3"
              strokeWidth="2"
            />
          </motion.g>
        </svg>
      )}

      {category === 'science' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          {[0, 60, 120].map((deg, idx) => (
            <motion.g
              key={deg}
              style={{ originX: '120px', originY: '120px' }}
              animate={shouldAnimate ? { rotate: [deg, deg + 360] } : undefined}
              transition={{ duration: 9 + idx * 2, repeat: Infinity, ease: 'linear' }}
            >
              <ellipse
                cx="120"
                cy="120"
                rx="94"
                ry="34"
                fill="none"
                stroke={accentColor}
                strokeOpacity="0.52"
                strokeWidth="2.2"
              />
              <circle cx="214" cy="120" r="5" fill={accentColor} />
            </motion.g>
          ))}
        </svg>
      )}

      {category === 'records' && (
        <svg viewBox="0 0 240 240" className="h-full w-full overflow-visible">
          <motion.g
            style={{ originX: '120px', originY: '120px' }}
            animate={shouldAnimate ? { rotate: 360 } : undefined}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="120"
                y1="26"
                x2="120"
                y2="46"
                stroke={accentColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeOpacity="0.65"
                transform={`rotate(${deg} 120 120)`}
              />
            ))}
          </motion.g>
          <motion.circle
            cx="120"
            cy="120"
            r="74"
            fill="none"
            stroke={accentColor}
            strokeOpacity="0.4"
            strokeWidth="2.5"
            strokeDasharray="14 8"
            animate={shouldAnimate ? { rotate: -360 } : undefined}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '120px', originY: '120px' }}
          />
          {[
            { cx: 52, cy: 76 },
            { cx: 188, cy: 76 },
            { cx: 64, cy: 184 },
            { cx: 176, cy: 184 },
          ].map((p, idx) => (
            <motion.circle
              key={idx}
              cx={p.cx}
              cy={p.cy}
              r="5"
              fill={accentColor}
              animate={shouldAnimate ? { y: [0, -10, 0], scale: [0.9, 1.35, 0.9] } : undefined}
              transition={{ duration: 2.4, repeat: Infinity, delay: idx * 0.3 }}
            />
          ))}
        </svg>
      )}
      </div>

      {/* Center 3D Fluency Hero Scene + Orbiting Sub-Asset */}
      <motion.div
        animate={
          shouldAnimate
            ? {
                y: [0, -10, 0],
                rotate: [-3, 3, -3],
                scale: [1, 1.05, 1],
              }
            : undefined
        }
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          borderColor: `${accentColor}45`,
          boxShadow: `0 22px 48px -12px ${accentColor}65, inset 0 1px 1px rgba(255,255,255,0.5)`,
        }}
        className="relative z-10 flex h-36 w-36 shrink-0 items-center justify-center rounded-full border-2 bg-white/45 p-3 backdrop-blur-xl dark:bg-[#1B162E]/55 sm:h-40 sm:w-40"
      >
        <img
          src={heroIllustration}
          alt={category}
          className="h-28 w-28 object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.22)] sm:h-32 sm:w-32"
        />

        {/* Independent Floating Secondary 3D Sub-Illustration */}
        <motion.div
          animate={
            shouldAnimate
              ? {
                  y: [0, -6, 0],
                  rotate: [4, -5, 4],
                }
              : undefined
          }
          transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          style={{
            borderColor: `${accentColor}45`,
          }}
          className="absolute -right-3 -top-2 flex h-12 w-12 items-center justify-center rounded-2xl border bg-white/75 p-1.5 shadow-lg backdrop-blur-md dark:bg-[#221A3B]/85 sm:h-14 sm:w-14"
        >
          <img
            src={subIllustration}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain drop-shadow-sm"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
