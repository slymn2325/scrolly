import type { CategoryId } from '@/types/fact';

export type LeagueTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type DockTabId = 'leaderboard' | 'quiz' | 'explore' | 'duel' | 'diploma';

export const CATEGORY_ILLUSTRATION_MAP: Record<CategoryId, string> = {
  space: '/assets/icons8/illustrations/space.png',
  nature: '/assets/icons8/illustrations/nature.png',
  human_body: '/assets/icons8/illustrations/human_body.png',
  history: '/assets/icons8/illustrations/history.png',
  science: '/assets/icons8/illustrations/science.png',
  records: '/assets/icons8/illustrations/records.png',
};

export const CATEGORY_SUB_ICON_MAP: Record<CategoryId, string> = {
  space: '/assets/icons8/illustrations/space-sub.png',
  nature: '/assets/icons8/illustrations/nature-sub.png',
  human_body: '/assets/icons8/illustrations/human_body-sub.png',
  history: '/assets/icons8/illustrations/history-sub.png',
  science: '/assets/icons8/illustrations/science-sub.png',
  records: '/assets/icons8/illustrations/records-sub.png',
};

export const DOCK_ICON_MAP: Record<DockTabId, string> = {
  leaderboard: '/assets/icons8/icons/dock-leaderboard.png',
  quiz: '/assets/icons8/icons/dock-quiz.png',
  explore: '/assets/icons8/icons/dock-explore.png',
  duel: '/assets/icons8/icons/dock-duel.png',
  diploma: '/assets/icons8/icons/dock-diploma.png',
};

export const UI_ICON_PATHS = {
  streakFire: '/assets/icons8/icons/streak-fire.png',
  xpSparkles: '/assets/icons8/icons/xp-sparkles.png',
  soundOn: '/assets/icons8/icons/sound-on.png',
  soundOff: '/assets/icons8/icons/sound-off.png',
  langGlobe: '/assets/icons8/icons/lang-globe.png',
  themeSun: '/assets/icons8/icons/theme-sun.png',
  themeMoon: '/assets/icons8/icons/theme-moon.png',
  verifiedSeal: '/assets/icons8/icons/verified-seal.png',
  badgeStar: '/assets/icons8/icons/badge-star.png',
} as const;

export const LEAGUE_SHIELD_MAP: Record<LeagueTierId, string> = {
  bronze: '/assets/icons8/icons/league-bronze.png',
  silver: '/assets/icons8/icons/league-silver.png',
  gold: '/assets/icons8/icons/league-gold.png',
  platinum: '/assets/icons8/icons/league-platinum.png',
  diamond: '/assets/icons8/icons/league-diamond.png',
};

export const STATE_ILLUSTRATION_PATHS = {
  quizCelebration: '/assets/icons8/illustrations/quiz-celebration.png',
  duelArena: '/assets/icons8/illustrations/duel-arena.png',
  offlineState: '/assets/icons8/illustrations/offline-state.png',
} as const;

/**
 * Loads a same-origin local PNG/SVG asset as an HTMLImageElement for clean
 * HTML5 <canvas> drawing (`ctx.drawImage`) without CORS canvas tainting.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined' || !src) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
