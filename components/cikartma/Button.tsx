'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pressTransition } from '@/lib/motion';

type ButtonTone = 'primary' | 'ghost';

type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
  tone?: ButtonTone;
  children: React.ReactNode;
};

export default function Button({
  tone = 'primary',
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const reduced = useReducedMotion() === true;
  const look =
    tone === 'primary'
      ? 'bg-cik-cta text-cik-on-cta shadow-sticker active:shadow-sticker-press'
      : 'bg-transparent text-cik-text shadow-none';
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={reduced || disabled ? undefined : { scale: 0.96 }}
      transition={pressTransition(reduced)}
      className={`cik-headline inline-flex h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill px-4 disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
