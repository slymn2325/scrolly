'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { motionSpring, motionTiming } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/components/onboarding/usePrefersReducedMotion';

interface StickerSlapProps {
  label: string;
  onDone: () => void;
}

/** Small sticker slap for correct guesses after the one-time first celebration. */
export default function StickerSlap({ label, onDone }: StickerSlapProps) {
  const reduced = usePrefersReducedMotion();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), reduced ? 150 : 700);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-testid="sticker-slap"
      initial={reduced ? { opacity: 0, x: '-50%' } : { opacity: 0, scale: 1.25, rotate: -6, x: '-50%' }}
      animate={
        reduced
          ? { opacity: 1, x: '-50%' }
          : { opacity: 1, scale: [1.25, 0.92, 1], rotate: [-6, -2, -2], x: '-50%' }
      }
      transition={reduced ? motionTiming.reducedFade : motionSpring.stickerSlap}
      className="pointer-events-none fixed left-1/2 z-toast flex flex-col items-center gap-2 rounded-pill bg-cik-surface px-4 py-2 shadow-e1"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}
    >
      <img src="/assets/fluent/glowing-star.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" />
      <span className="cik-footnote text-cik-text">{label}</span>
    </motion.div>
  );
}
