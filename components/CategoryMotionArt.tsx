'use client';

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import InteractiveSketchArt from '@/components/InteractiveSketchArt';
import type { CategoryId } from '@/types/fact';
import { CATEGORY_ILLUSTRATION_MAP, CATEGORY_SUB_ICON_MAP } from '@/utils/icons8Assets';

interface CategoryMotionArtProps {
  factId?: string;
  sketchType?: string;
  category: CategoryId;
  accentColor: string;
  iconName: string;
  emoji?: string;
  lang?: 'tr' | 'en';
  variant?: 'hero' | 'compact';
  isFirstCard?: boolean;
  isActive?: boolean;
  onButtonPop?: () => void;
}

export default function CategoryMotionArt({
  factId,
  sketchType,
  category,
  accentColor,
  lang = 'tr',
  variant = 'hero',
  isFirstCard = false,
  isActive = true,
  onButtonPop,
}: CategoryMotionArtProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.25 });
  const shouldAnimate = isActive && !reduceMotion && isInView;
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
              boxShadow: `0 6px 18px -4px ${accentColor}40`,
            }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 p-1.5 dark:bg-slate-900/95"
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
    <div
      data-testid="category-motion-art"
      data-category={category}
      className="relative mx-auto flex h-[clamp(135px,23vh,210px)] lg:h-[340px] w-full max-w-[320px] lg:max-w-[460px] items-center justify-center"
    >
      <InteractiveSketchArt
        factId={factId}
        sketchType={sketchType}
        category={category}
        accentColor={accentColor}
        lang={lang}
        isFirstCard={isFirstCard}
        isActive={isActive}
        onButtonPop={onButtonPop}
      />
    </div>
  );
}
