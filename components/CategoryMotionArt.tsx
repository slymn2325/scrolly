'use client';

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import FullBleedReelsCanvas from '@/components/FullBleedReelsCanvas';
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
  topicText?: string;
  tag?: string;
  gifUrl?: string | null;
}

/** Instant SSR/frame-0 vector backdrop so the upper hero stage renders crisp geometry before canvas rAF starts. */
function CategoryBackdropSvg({ category, accentColor }: { category: CategoryId; accentColor: string }) {
  return (
    <svg
      viewBox="0 0 400 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
    >
      <defs>
        <radialGradient id={`cat-glow-${category}`} cx="50%" cy="28%" r="48%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.45" />
          <stop offset="65%" stopColor={accentColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="195" r="185" fill={`url(#cat-glow-${category})`} />
      <circle cx="200" cy="195" r="132" fill="none" stroke={accentColor} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="4 6" />
      {category === 'space' && (
        <g stroke={accentColor} fill="none">
          <ellipse cx="200" cy="190" rx="146" ry="52" transform="rotate(-18 200 190)" strokeOpacity="0.45" strokeWidth="1.4" />
          <ellipse cx="200" cy="190" rx="112" ry="38" transform="rotate(24 200 190)" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="5 5" />
          <circle cx="200" cy="190" r="26" fill={accentColor} fillOpacity="0.18" strokeOpacity="0.55" strokeWidth="1.4" />
          <circle cx="96" cy="118" r="3.5" fill={accentColor} fillOpacity="0.7" stroke="none" />
          <circle cx="308" cy="138" r="4" fill="#ffffff" fillOpacity="0.65" stroke="none" />
          <circle cx="286" cy="242" r="2.5" fill={accentColor} fillOpacity="0.65" stroke="none" />
        </g>
      )}
      {category === 'nature' && (
        <g stroke={accentColor} fill="none">
          <path d="M24 245 Q110 170 200 205 T376 175" strokeOpacity="0.45" strokeWidth="1.6" />
          <path d="M24 275 Q125 205 215 235 T376 205" strokeOpacity="0.3" strokeWidth="1.3" />
          <path d="M200 112 C238 148 238 214 200 250 C162 214 162 148 200 112 Z" fill={accentColor} fillOpacity="0.14" strokeOpacity="0.55" strokeWidth="1.4" />
          <line x1="200" y1="118" x2="200" y2="255" strokeOpacity="0.4" strokeWidth="1.2" />
        </g>
      )}
      {category === 'human_body' && (
        <g stroke={accentColor} fill="none">
          <path d="M95 145 C145 100 255 240 305 195" strokeOpacity="0.5" strokeWidth="1.6" />
          <path d="M95 195 C145 240 255 100 305 145" strokeOpacity="0.38" strokeWidth="1.6" />
          <polyline points="48,225 135,225 156,192 178,248 202,162 224,236 244,210 266,225 352,225" strokeOpacity="0.5" strokeWidth="1.6" />
        </g>
      )}
      {category === 'history' && (
        <g stroke={accentColor} fill="none">
          <circle cx="200" cy="185" r="78" strokeOpacity="0.45" strokeWidth="1.4" />
          <circle cx="200" cy="185" r="52" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 5" />
          <polygon points="200,96 276,142 124,142" fill={accentColor} fillOpacity="0.12" strokeOpacity="0.45" strokeWidth="1.4" />
          <line x1="142" y1="142" x2="142" y2="246" strokeOpacity="0.38" strokeWidth="2" />
          <line x1="200" y1="142" x2="200" y2="246" strokeOpacity="0.38" strokeWidth="2" />
          <line x1="258" y1="142" x2="258" y2="246" strokeOpacity="0.38" strokeWidth="2" />
        </g>
      )}
      {category === 'science' && (
        <g stroke={accentColor} fill="none">
          <ellipse cx="200" cy="188" rx="108" ry="38" transform="rotate(30 200 188)" strokeOpacity="0.48" strokeWidth="1.4" />
          <ellipse cx="200" cy="188" rx="108" ry="38" transform="rotate(-30 200 188)" strokeOpacity="0.48" strokeWidth="1.4" />
          <ellipse cx="200" cy="188" rx="38" ry="108" strokeOpacity="0.35" strokeWidth="1.2" />
          <circle cx="200" cy="188" r="14" fill={accentColor} fillOpacity="0.26" strokeOpacity="0.65" strokeWidth="1.4" />
        </g>
      )}
      {category === 'records' && (
        <g stroke={accentColor} fill="none">
          <path d="M78 242 A122 122 0 0 1 322 242" strokeOpacity="0.52" strokeWidth="2" />
          <path d="M108 242 A92 92 0 0 1 292 242" strokeOpacity="0.35" strokeWidth="1.4" strokeDasharray="4 5" />
          <line x1="200" y1="242" x2="274" y2="148" strokeOpacity="0.6" strokeWidth="2" />
          <polygon points="200,118 228,176 172,176" fill={accentColor} fillOpacity="0.16" strokeOpacity="0.5" strokeWidth="1.3" />
        </g>
      )}
      {category === 'statistics' && (
        <g stroke={accentColor} fill="none">
          <path d="M44 252 C104 252 142 122 200 122 C258 122 296 252 356 252" fill={accentColor} fillOpacity="0.14" strokeOpacity="0.58" strokeWidth="1.8" />
          <rect x="108" y="218" width="22" height="34" rx="3" fill={accentColor} fillOpacity="0.18" strokeOpacity="0.4" />
          <rect x="148" y="180" width="22" height="72" rx="3" fill={accentColor} fillOpacity="0.22" strokeOpacity="0.45" />
          <rect x="189" y="142" width="22" height="110" rx="3" fill={accentColor} fillOpacity="0.26" strokeOpacity="0.5" />
          <rect x="230" y="180" width="22" height="72" rx="3" fill={accentColor} fillOpacity="0.22" strokeOpacity="0.45" />
          <rect x="270" y="218" width="22" height="34" rx="3" fill={accentColor} fillOpacity="0.18" strokeOpacity="0.4" />
        </g>
      )}
    </svg>
  );
}

export default function CategoryMotionArt({
  category,
  accentColor,
  lang = 'tr',
  variant = 'hero',
  isActive = true,
  onButtonPop,
  sketchType,
  topicText,
  tag,
  gifUrl,
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
              loading="lazy"
              className="h-11 w-11 object-contain drop-shadow-sm"
            />
          </motion.div>
          <img
            src={subIllustration}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-9 w-9 object-contain opacity-85 drop-shadow-sm"
          />
        </div>
      </motion.div>
    );
  }

  // Hero = full-bleed cinematic canvas with instant CSS + vector category backdrop
  return (
    <div
      ref={containerRef}
      data-testid="category-motion-art"
      data-category={category}
      style={{
        background: `radial-gradient(circle at 50% 34%, ${accentColor}38 0%, #0D0D14 58%, #07070A 100%)`,
      }}
      className="absolute inset-0 z-0 overflow-hidden"
    >
      <CategoryBackdropSvg category={category} accentColor={accentColor} />
      {category === 'statistics' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(129,140,248,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.18) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      )}
      {gifUrl && (
        <img
          src={gifUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
        />
      )}
      <FullBleedReelsCanvas
        category={category}
        accentColor={accentColor}
        isActive={isActive}
        lang={lang}
        onInteract={onButtonPop}
        topicText={topicText}
        sketchType={sketchType}
        tag={tag}
      />
    </div>
  );
}
