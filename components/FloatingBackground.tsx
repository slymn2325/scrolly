'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface BubbleSpec {
  id: number;
  size: string;
  position: string;
  color: string;
  shapeClass: string;
  parallaxFactor: number;
  floatDuration: number;
  floatDelay: number;
  rotate?: number;
}

const BUBBLES: BubbleSpec[] = [
  {
    id: 1,
    size: 'w-56 h-56 sm:w-72 sm:h-72',
    position: '-top-12 -left-12',
    color: 'bg-[#FFEAE5]/75 dark:bg-rose-900/20',
    shapeClass: 'rounded-full',
    parallaxFactor: 22,
    floatDuration: 9,
    floatDelay: 0,
  },
  {
    id: 2,
    size: 'w-44 h-44 sm:w-64 sm:h-64',
    position: 'top-20 -right-10',
    color: 'bg-[#EFEAFF]/80 dark:bg-violet-900/25',
    shapeClass: 'rounded-[3rem]',
    parallaxFactor: -28,
    floatDuration: 11,
    floatDelay: 1.2,
    rotate: 14,
  },
  {
    id: 3,
    size: 'w-48 h-48 sm:w-60 sm:h-60',
    position: 'top-[42%] -left-16',
    color: 'bg-[#E6FAF5]/80 dark:bg-teal-900/20',
    shapeClass: 'rounded-[2.5rem]',
    parallaxFactor: 18,
    floatDuration: 10,
    floatDelay: 0.5,
    rotate: -18,
  },
  {
    id: 4,
    size: 'w-52 h-52 sm:w-72 sm:h-72',
    position: 'bottom-16 -right-16',
    color: 'bg-[#FEF6D8]/85 dark:bg-amber-900/20',
    shapeClass: 'rounded-full',
    parallaxFactor: -20,
    floatDuration: 12,
    floatDelay: 0.8,
  },
  {
    id: 5,
    size: 'w-28 h-28 sm:w-36 sm:h-36',
    position: 'top-[24%] left-[18%]',
    color: 'bg-[#E5F6FF]/75 dark:bg-sky-900/20',
    shapeClass: 'rounded-3xl',
    parallaxFactor: 32,
    floatDuration: 8.5,
    floatDelay: 2.1,
    rotate: 28,
  },
  {
    id: 6,
    size: 'w-24 h-24 sm:w-32 sm:h-32',
    position: 'bottom-[26%] right-[16%]',
    color: 'bg-[#FCE8F3]/75 dark:bg-pink-900/20',
    shapeClass: 'rounded-full',
    parallaxFactor: -34,
    floatDuration: 9.5,
    floatDelay: 1.7,
  },
  {
    id: 7,
    size: 'w-20 h-20 sm:w-28 sm:h-28',
    position: 'bottom-10 left-[22%]',
    color: 'bg-[#EFEAFF]/70 dark:bg-indigo-900/20',
    shapeClass: 'rounded-2xl',
    parallaxFactor: 26,
    floatDuration: 10.5,
    floatDelay: 0.3,
    rotate: -12,
  },
];

function FloatingBubble({
  spec,
  smoothX,
  smoothY,
}: {
  spec: BubbleSpec;
  smoothX: ReturnType<typeof useSpring>;
  smoothY: ReturnType<typeof useSpring>;
}) {
  const x = useTransform(smoothX, [-0.5, 0.5], [-spec.parallaxFactor, spec.parallaxFactor]);
  const y = useTransform(smoothY, [-0.5, 0.5], [-spec.parallaxFactor, spec.parallaxFactor]);

  return (
    <motion.div
      style={{ x, y }}
      className={`pointer-events-none absolute ${spec.position} ${spec.size} ${spec.color} ${spec.shapeClass} blur-[1px]`}
      initial={{ rotate: spec.rotate ?? 0 }}
      animate={{
        y: [0, -14, 0, 12, 0],
        scale: [1, 1.04, 1, 0.97, 1],
        rotate: [(spec.rotate ?? 0) - 4, (spec.rotate ?? 0) + 5, (spec.rotate ?? 0) - 4],
      }}
      transition={{
        duration: spec.floatDuration,
        delay: spec.floatDelay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export default function FloatingBackground() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const smoothX = useSpring(rawX, { stiffness: 45, damping: 18 });
  const smoothY = useSpring(rawY, { stiffness: 45, damping: 18 });

  useEffect(() => {
    const handlePointer = (clientX: number, clientY: number) => {
      const nx = clientX / Math.max(1, window.innerWidth) - 0.5;
      const ny = clientY / Math.max(1, window.innerHeight) - 0.5;
      rawX.set(nx);
      rawY.set(ny);
    };

    const onMouseMove = (e: MouseEvent) => handlePointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [rawX, rawY]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FFFDF9] transition-colors duration-300 dark:bg-[#0F0D1A]"
    >
      {BUBBLES.map((bubble) => (
        <FloatingBubble key={bubble.id} spec={bubble} smoothX={smoothX} smoothY={smoothY} />
      ))}
    </div>
  );
}
