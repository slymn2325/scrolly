'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pressTransition } from '@/lib/motion';

type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
  label: string;
  children: React.ReactNode;
};

export default function IconButton({ label, children, className = '', disabled, type = 'button', ...rest }: IconButtonProps) {
  const reduced = useReducedMotion() === true;
  return (
    <motion.button
      type={type}
      aria-label={label}
      disabled={disabled}
      whileTap={reduced || disabled ? undefined : { scale: 0.96 }}
      transition={pressTransition(reduced)}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-pill bg-cik-surface text-cik-text shadow-e1 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
