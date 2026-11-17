'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pressTransition } from '@/lib/motion';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export default function Chip({ label, selected = false, onClick, icon }: ChipProps) {
  const reduced = useReducedMotion() === true;
  const look = selected
    ? 'bg-cik-berry text-cik-on-berry shadow-sticker'
    : 'bg-cik-surface text-cik-text-2 shadow-e1';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={pressTransition(reduced)}
      className={`cik-footnote inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-pill px-4 ${look}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </motion.button>
  );
}
