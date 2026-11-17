/**
 * Fluent 3D emoji paths (MIT). Renamed from icons8Assets.
 * Callers that W8 does not own still import the compatibility shim at ./icons8Assets.
 */
import type { CategoryId } from '@/types/fact';

export type LeagueTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type DockTabId = 'leaderboard' | 'quiz' | 'explore' | 'language' | 'duel' | 'diploma';

export const CATEGORY_ILLUSTRATION_MAP: Record<CategoryId, string> = {
  space: '/assets/fluent/ringed-planet.png',
  nature: '/assets/fluent/herb.png',
  human_body: '/assets/fluent/dna.png',
  history: '/assets/fluent/classical-building.png',
  science: '/assets/fluent/atom-symbol.png',
  records: '/assets/fluent/trophy.png',
  statistics: '/assets/fluent/bar-chart.png',
};

export const CATEGORY_SUB_ICON_MAP: Record<CategoryId, string> = {
  space: '/assets/fluent/satellite.png',
  nature: '/assets/fluent/seedling.png',
  human_body: '/assets/fluent/anatomical-heart.png',
  history: '/assets/fluent/scroll.png',
  science: '/assets/fluent/test-tube.png',
  records: '/assets/fluent/1st-place-medal.png',
  statistics: '/assets/fluent/chart-increasing.png',
};

export const DOCK_ICON_MAP: Record<DockTabId, string> = {
  leaderboard: '/assets/fluent/trophy.png',
  quiz: '/assets/fluent/direct-hit.png',
  explore: '/assets/fluent/sparkles.png',
  language: '/assets/fluent/books.png',
  duel: '/assets/fluent/crossed-swords.png',
  diploma: '/assets/fluent/graduation-cap.png',
};

export const UI_ICON_PATHS = {
  streakFire: '/assets/fluent/fire.png',
  xpSparkles: '/assets/fluent/high-voltage.png',
  soundOn: '/assets/fluent/megaphone.png',
  soundOff: '/assets/fluent/sleeping-face.png',
  langGlobe: '/assets/fluent/globe-meridians.png',
  themeSun: '/assets/fluent/sparkles.png',
  themeMoon: '/assets/fluent/milky-way.png',
  verifiedSeal: '/assets/fluent/shield.png',
  badgeStar: '/assets/fluent/glowing-star.png',
  bookmark: '/assets/fluent/bookmark.png',
  target: '/assets/fluent/direct-hit.png',
  microscope: '/assets/fluent/microbe.png',
  openBook: '/assets/fluent/open-book.png',
  lock: '/assets/fluent/prohibited.png',
  lightning: '/assets/fluent/high-voltage.png',
  tap: '/assets/fluent/mobile-phone.png',
  slowSpeed: '/assets/fluent/cloud-with-rain.png',
  trophy: '/assets/fluent/trophy.png',
  shield: '/assets/fluent/shield.png',
  sword: '/assets/fluent/crossed-swords.png',
  explorer: '/assets/fluent/compass.png',
  quizCenter: '/assets/fluent/direct-hit.png',
} as const;

export const LEAGUE_SHIELD_MAP: Record<LeagueTierId, string> = {
  bronze: '/brand/leagues/bronze.svg',
  silver: '/brand/leagues/silver.svg',
  gold: '/brand/leagues/gold.svg',
  platinum: '/brand/leagues/platinum.svg',
  diamond: '/brand/leagues/diamond.svg',
};

export const STATE_ILLUSTRATION_PATHS = {
  quizCelebration: '/assets/fluent/party-popper.png',
  duelArena: '/assets/fluent/crossed-swords.png',
  offlineState: '/assets/fluent/cloud-with-rain.png',
  notFound: '/assets/fluent/magnifying-glass.png',
  errorWarning: '/assets/fluent/warning.png',
  welcomeTelescope: '/assets/fluent/sparkles.png',
  emptyBookmark: '/assets/fluent/empty-nest.png',
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
