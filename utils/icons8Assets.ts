/**
 * Compatibility shim. The asset map now lives in ./fluentAssets.
 * W8 updated the imports it owns. Remaining callers should switch to
 * `@/utils/fluentAssets`, then this file can be deleted:
 * - app/global-error.tsx
 * - components/cikartma/LeagueBadge.tsx
 * - components/CategoryMotionArt.tsx
 * - components/DiplomaProfileModal.tsx
 * - components/DuelModal.tsx
 * - components/LeaderboardModal.tsx
 * - components/MemoryQuizCard.tsx
 * - components/PwaInstallGuideModal.tsx
 * - components/QuizCtaSlide.tsx
 * - components/QuizHubModal.tsx
 * - components/ShareResultModal.tsx
 * - components/StoryShareModal.tsx
 * - components/TopicRadarChart.tsx
 * - utils/diplomaCanvasGenerator.ts
 * - utils/storyCanvasGenerator.ts
 * - utils/supabaseLeaderboard.ts
 * - utils/userMemory.ts
 */
export {
  CATEGORY_ILLUSTRATION_MAP,
  CATEGORY_SUB_ICON_MAP,
  DOCK_ICON_MAP,
  LEAGUE_SHIELD_MAP,
  STATE_ILLUSTRATION_PATHS,
  UI_ICON_PATHS,
  loadImageElement,
} from './fluentAssets';
export type { DockTabId, LeagueTierId } from './fluentAssets';
