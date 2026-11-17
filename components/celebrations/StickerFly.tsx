'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { motionSpring, motionTiming } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/components/onboarding/usePrefersReducedMotion';

const ALBUM_TARGET = '[data-testid="dock-tab-diploma"], [data-testid="desktop-nav-diploma"]';

interface StickerFlyProps {
  title: string;
  imageSrc: string;
  onDone: () => void;
}

export default function StickerFly({ title, imageSrc, onDone }: StickerFlyProps) {
  const reduced = usePrefersReducedMotion();
  const controls = useAnimation();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let cancelled = false;
    const node = document.querySelector(ALBUM_TARGET);
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * 0.42;
    let flyX = 0;
    let flyY = -120;
    if (node) {
      const rect = node.getBoundingClientRect();
      flyX = rect.left + rect.width / 2 - originX;
      flyY = rect.top + rect.height / 2 - originY;
    }

    const run = async () => {
      if (reduced) {
        await controls.start({ opacity: 1, x: '-50%', y: '-50%', transition: motionTiming.reducedFade });
        if (cancelled) return;
        await controls.start({ opacity: 0, x: '-50%', y: '-50%', transition: motionTiming.reducedFade });
        if (!cancelled) onDoneRef.current();
        return;
      }
      await controls.start({
        opacity: 1,
        x: '-50%',
        y: '-50%',
        scale: [1.25, 0.92, 1],
        rotate: [-6, -2, -2],
        transition: motionSpring.stickerSlap,
      });
      if (cancelled) return;
      await controls.start({
        x: `calc(-50% + ${flyX}px)`,
        y: `calc(-50% + ${flyY}px)`,
        scale: 0.28,
        rotate: -2,
        opacity: 1,
        transition: motionSpring.cardSnap,
      });
      if (!cancelled) onDoneRef.current();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [controls, reduced]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-testid="sticker-fly"
      animate={controls}
      initial={
        reduced
          ? { opacity: 0, x: '-50%', y: '-50%' }
          : { opacity: 0, scale: 1.25, rotate: -6, x: '-50%', y: '-50%' }
      }
      className="pointer-events-none fixed left-1/2 top-[42%] z-modal flex flex-col items-center gap-2 rounded-cik-lg bg-cik-surface px-5 py-4 shadow-sticker"
    >
      <img src={imageSrc} alt="" width={72} height={72} className="h-[72px] w-[72px] object-contain" />
      <span className="cik-headline text-center text-cik-text">{title}</span>
    </motion.div>
  );
}
