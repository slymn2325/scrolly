import type { Transition } from 'framer-motion';

/** Spring table from the Çıkartma motion spec. Interruptible; retarget instead of restarting. */
export const motionSpring = {
  cardSnap: { type: 'spring', stiffness: 320, damping: 34, mass: 1 },
  reveal: { type: 'spring', stiffness: 420, damping: 22 },
  stickerSlap: { type: 'spring', stiffness: 600, damping: 18 },
  sheetOpen: { type: 'spring', stiffness: 380, damping: 38 },
  dockTab: { type: 'spring', stiffness: 500, damping: 30 },
  buttonRelease: { type: 'spring', stiffness: 500, damping: 30 },
} as const satisfies Record<string, Transition>;

export const motionTiming = {
  /** Sheet dismiss ease-in, 220 ms. */
  sheetClose: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  /** Button press-in, 90 ms. Release uses motionSpring.buttonRelease. */
  buttonPressIn: { duration: 0.09, ease: [0.4, 0, 1, 1] },
  /** prefers-reduced-motion: opacity crossfade. */
  reducedFade: { duration: 0.15, ease: 'linear' },
  /** Reduced-motion card change: instant plus a short fade. */
  cardFade: { duration: 0.12, ease: 'linear' },
} as const satisfies Record<string, Transition>;

export const motionDurationMs = {
  buttonPressIn: 90,
  sheetClose: 220,
  reducedFade: 150,
  cardFade: 120,
  skeletonShimmer: 1400,
  confetti: 1100,
} as const;

/** Drag the sheet this far, or faster than this, and it closes. */
export const sheetDismiss = {
  distanceRatio: 0.3,
  velocityPxPerSec: 600,
} as const;

export function sheetTransition(reducedMotion: boolean, phase: 'open' | 'close'): Transition {
  if (reducedMotion) return motionTiming.reducedFade;
  switch (phase) {
    case 'open':
      return motionSpring.sheetOpen;
    case 'close':
      return motionTiming.sheetClose;
    default: {
      const neverPhase: never = phase;
      return neverPhase;
    }
  }
}

export function pressTransition(reducedMotion: boolean): Transition {
  if (reducedMotion) return motionTiming.reducedFade;
  return motionSpring.buttonRelease;
}
