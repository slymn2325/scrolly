'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import CookieBanner from '@/components/CookieBanner';
import Skeleton from '@/components/cikartma/Skeleton';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { vocabCardToFactCard } from '@/utils/duelLobby';
import DeferredAdSense from '@/components/DeferredAdSense';
import ErrorBoundary from '@/components/ErrorBoundary';
import { applyGoogleConsentChoice } from '@/utils/consent';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import DesktopLeftNav from '@/components/DesktopLeftNav';
import IosFloatingIslandDock, { type DockTabId } from '@/components/IosFloatingIslandDock';
import type { AuthTriggerSource } from '@/components/LazyAuthPrompt';
import { GUESS_CORRECT_EVENT } from '@/components/celebrations/events';
import { clearCelebrationFlags } from '@/components/celebrations/storage';
import type { ActiveQuizMode } from '@/components/MemoryQuizCard';
import OfflineManager from '@/components/OfflineManager';
import PwaInstallPrompt, {
  checkIsStandalone,
  clearPwaDismissed,
  type BeforeInstallPromptEvent,
} from '@/components/PwaInstallPrompt';
import type { QuizModeChoice } from '@/components/QuizHubModal';
import TikTokFeed, { type FeedSlideItem, type TikTokFeedHandle } from '@/components/TikTokFeed';
import {
  translations,
  type CategoryFilter,
  type CategoryId,
  type Language,
} from '@/i18n/translations';
import type { AuthUserDto } from '@/types/auth';
import type { ChallengeQuestionSnapshot } from '@/types/challenge';
import type { VocabularyCard } from '@/types/vocabulary';
import {
  AUTH_CHANGED_EVENT,
  OPEN_AUTH_EVENT,
  fetchSession,
  getCachedAuthUserEmail,
  hydrateLocalMemoryFromAuthUser,
  type AuthChangedEventDetail,
} from '@/lib/authClient';
import { getDailyGuessDateIso, pickDailyGuessFact } from '@/lib/dailyGuess';
import { isShortRoomCode, normalizeRoomCode } from '@/lib/duelStore';
import { readLanguageCookie, writeLanguageCookie } from '@/lib/locale';
import { applyAppearance, resolveDocumentDark, type AppearanceMode } from '@/lib/theme';
import {
  fetchFactsFromApiWithCache,
  fetchPaginatedFactsFromApi,
  fetchProfileFromApi,
  initTelemetrySync,
  resetTelemetryClientState,
  syncProfileToApi,
  trackEvent,
} from '@/lib/telemetry';
import {
  type FactCard as FactCardType,
  interleaveFactsByCategory,
} from '@/utils/factsData';
import type { DuelPayload } from '@/utils/duelCodec';
import { clearLikedFacts, isFactLiked, loadLikedFactIds } from '@/utils/likedFacts';
import {
  clearSavedFacts,
  isFactSaved,
  loadSavedFactIds,
  removeSavedFact,
  SAVED_FACTS_UPDATED_EVENT,
  seedSavedFactsIfUnset,
  toggleSavedFact,
} from '@/utils/savedFacts';
import {
  clearVocabNotebook,
  isVocabWordSaved,
  loadSavedVocabNotebook,
  toggleSaveVocabularyCard,
} from '@/utils/vocabNotebook';
import {
  vibrateDoubleTap,
  vibrateFlip,
  vibrateSheet,
  vibrateSuccess,
  vibrateTap,
} from '@/utils/haptics';
import { fisherYatesShuffle, type QuizQuestionItem } from '@/utils/recommendation';
import {
  buildSeenLookup,
  clearSeenSlugsStorage,
  getFactSeenTimestamp,
  isFactSeen,
} from '@/utils/seenFacts';
import {
  playCelebration,
  playDing,
  playLeagueCelebration,
  playPop,
  playPopDing,
  playTick,
  playWhoosh,
  playWrong,
} from '@/utils/soundEngine';
import { parseIsoDate } from '@/utils/viralShare';
import {
  addUserXp,
  boostCategoryWeight,
  completeMemoryQuiz,
  getDefaultUserState,
  getLeagueInfo,
  getTodayDateString,
  getTopCategory,
  getTotalCardsViewed,
  isGenericDefaultNickname,
  loadUserMemory,
  localizeDisplayNickname,
  markFactIdSeen,
  mergeRemoteProfileIntoMemory,
  recordCardRead,
  recordCategoryGuessAccuracy,
  resetUserMemory,
  saveUserMemory,
  toggleFavoriteFact,
  toggleUserNotifications,
  updateUserNickname,
  type UserMemoryState,
} from '@/utils/userMemory';

function StageLoadingSkeleton() {
  return (
    <div
      data-testid="stage-loading-skeleton"
      className="flex h-full w-full flex-col gap-4 bg-cik-bg p-4 text-cik-text lg:p-6"
    >
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 rounded-sticker bg-cik-surface p-5 shadow-sticker">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-40 rounded-pill" />
          <Loader2
            size={18}
            strokeWidth={2}
            className="animate-spin text-cik-accent"
            aria-hidden="true"
          />
        </div>
        <Skeleton className="h-3 w-full rounded-pill" />
        <Skeleton className="h-28 w-full rounded-cik-md" />
        <div className="mt-2 flex flex-col gap-2.5">
          <Skeleton className="h-12 w-full rounded-cik-md" />
          <Skeleton className="h-12 w-full rounded-cik-md" />
          <Skeleton className="h-12 w-full rounded-cik-md" />
        </div>
      </div>
    </div>
  );
}

const MemoryQuizCard = dynamic(() => import('@/components/MemoryQuizCard'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});
const LeaderboardModal = dynamic(() => import('@/components/LeaderboardModal'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});
const QuizHubModal = dynamic(() => import('@/components/QuizHubModal'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});
const DuelModal = dynamic(() => import('@/components/DuelModal'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});
const DiplomaProfileModal = dynamic(() => import('@/components/DiplomaProfileModal'), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});
const StoryShareModal = dynamic(() => import('@/components/StoryShareModal'), { ssr: false });
const ShareResultModal = dynamic(() => import('@/components/ShareResultModal'), { ssr: false });
const WelcomeExploreModal = dynamic(() => import('@/components/WelcomeExploreModal'), { ssr: false });
const MiniOnboardingHint = dynamic(() => import('@/components/MiniOnboardingHint'), { ssr: false });
const FactDetailPage = dynamic(() => import('@/components/FactDetailPage'), { ssr: false });
const PwaInstallGuideModal = dynamic(() => import('@/components/PwaInstallGuideModal'), { ssr: false });
const DesktopFeedSideRail = dynamic(() => import('@/components/DesktopFeedSideRail'), { ssr: false });
const LazyAuthPrompt = dynamic(() => import('@/components/LazyAuthPrompt'), { ssr: false });

const WELCOME_DISMISS_KEY = 'scrolly_welcome_dismissed_v1';
const NICKNAME_ASKED_KEY = 'scrolly_nickname_asked_v1';
const VALUE_PROP_DISMISSED_KEY = 'scrolly_value_prop_dismissed_v1';
const MINI_ONBOARDING_DISMISSED_KEY = 'scrolly_mini_onboarding_dismissed_v1';
const DIAGRAM_INTERACTED_STORAGE_KEY = 'scrolly_diagram_interacted';
const AUTH_NUDGE_DISMISS_KEY = 'scrolly_auth_nudge_dismissed_until';
const AUTH_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function readStorageFlag(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeStorageFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Ignore private-mode storage failures
  }
}

function removeStorageFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore private-mode storage failures
  }
}

function readMiniOnboardingDismissed(): boolean {
  return readStorageFlag(MINI_ONBOARDING_DISMISSED_KEY);
}

function persistMiniOnboardingDismissed(): void {
  writeStorageFlag(MINI_ONBOARDING_DISMISSED_KEY);
}

function clearMiniOnboardingDismissed(): void {
  removeStorageFlag(MINI_ONBOARDING_DISMISSED_KEY);
}

function readValuePropDismissed(): boolean {
  return readStorageFlag(VALUE_PROP_DISMISSED_KEY);
}

function persistWelcomeDismissed(): void {
  writeStorageFlag(WELCOME_DISMISS_KEY);
}

function clearWelcomeDismissed(): void {
  removeStorageFlag(WELCOME_DISMISS_KEY);
}

function clearNicknameAsked(): void {
  removeStorageFlag(NICKNAME_ASKED_KEY);
}

function clearValuePropDismissed(): void {
  removeStorageFlag(VALUE_PROP_DISMISSED_KEY);
}

function consumeNicknamePrompt(isGeneric: boolean): boolean {
  if (readStorageFlag(NICKNAME_ASKED_KEY)) return false;
  writeStorageFlag(NICKNAME_ASKED_KEY);
  return isGeneric;
}

function isAuthNudgeCoolingDown(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(AUTH_NUDGE_DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function persistAuthNudgeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_NUDGE_DISMISS_KEY, String(Date.now() + AUTH_NUDGE_COOLDOWN_MS));
  } catch {
    // Ignore private-mode storage failures
  }
}

function clearAuthNudgeDismissed(): void {
  removeStorageFlag(AUTH_NUDGE_DISMISS_KEY);
}

interface ActiveQuizSession {
  key: string;
  mode: ActiveQuizMode;
  questions: QuizQuestionItem[];
  duelConfig?: DuelChallengeConfig | null;
  quizDate?: string;
}

interface HomeClientProps {
  initialFacts: FactCardType[];
  initialVocabulary?: VocabularyCard[];
  initialLang?: 'tr' | 'en';
}

function mergeFactsById(base: FactCardType[], incoming: FactCardType[]): FactCardType[] {
  const seen = new Set<string>();
  const merged: FactCardType[] = [];

  for (const item of [...incoming, ...base]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

const FEED_SESSION_STORAGE_KEY = 'scrolly_feed_session_v1';

interface StoredFeedSession {
  category: CategoryFilter;
  deckIds: string[];
  slideIndex: number;
}

function readFeedSession(): StoredFeedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const navEntry = performance.getEntriesByType?.('navigation')?.[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navEntry?.type !== 'back_forward') {
      return null;
    }
    const raw = window.sessionStorage.getItem(FEED_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFeedSession>;
    if (!Array.isArray(parsed.deckIds) || parsed.deckIds.length === 0) return null;
    return {
      category: (parsed.category as CategoryFilter) ?? 'all',
      deckIds: parsed.deckIds.filter((id): id is string => typeof id === 'string'),
      slideIndex:
        typeof parsed.slideIndex === 'number' && parsed.slideIndex >= 0
          ? Math.floor(parsed.slideIndex)
          : 0,
    };
  } catch {
    return null;
  }
}

function persistFeedSession(
  category: CategoryFilter,
  deck: FactCardType[],
  slideIndex: number
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredFeedSession = {
      category,
      deckIds: deck.map((item) => item.id),
      slideIndex: Math.max(0, Math.floor(slideIndex)),
    };
    window.sessionStorage.setItem(FEED_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in private mode
  }
}

function clearFeedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FEED_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

function blendPreferredUnseenFacts(
  unseen: FactCardType[],
  topCats: Set<CategoryId>,
  shuffle: boolean
): FactCardType[] {
  const shuffledUnseen = shuffle ? fisherYatesShuffle(unseen) : [...unseen];
  if (!shuffle || topCats.size === 0) {
    return shuffledUnseen;
  }

  const preferred = shuffledUnseen.filter((fact) => topCats.has(fact.category));
  const rest = shuffledUnseen.filter((fact) => !topCats.has(fact.category));
  if (preferred.length === 0 || rest.length === 0) {
    return shuffledUnseen;
  }

  // Blend in 2 preferred + 1 general cadence so preferred categories rise gently
  // without producing a deterministic opening card across sessions.
  const blended: FactCardType[] = [];
  let p = 0;
  let r = 0;
  const startWithRest = (preferred.length + rest.length) % 5 === 0 || fisherYatesShuffle([0, 1, 2])[0] === 0;
  if (startWithRest && r < rest.length) {
    blended.push(rest[r++]);
  }
  while (p < preferred.length || r < rest.length) {
    if (p < preferred.length) blended.push(preferred[p++]);
    if (p < preferred.length) blended.push(preferred[p++]);
    if (r < rest.length) blended.push(rest[r++]);
  }
  return blended;
}

function buildRecycledSeenDeck(
  seen: FactCardType[],
  timestampByToken: Map<string, number>,
  shuffle: boolean
): FactCardType[] {
  if (seen.length === 0) return [];
  const oldestFirst = [...seen].sort(
    (a, b) => getFactSeenTimestamp(a, timestampByToken) - getFactSeenTimestamp(b, timestampByToken)
  );
  if (!shuffle) return oldestFirst;

  const cohortSize = 10;
  const result: FactCardType[] = [];
  for (let i = 0; i < oldestFirst.length; i += cohortSize) {
    result.push(...fisherYatesShuffle(oldestFirst.slice(i, i + cohortSize)));
  }
  return result;
}

function buildPersonalizedDeck(
  allFacts: FactCardType[],
  category: CategoryFilter,
  seenIds: string[],
  categoryWeights: Record<CategoryId, number>,
  shuffle: boolean
): FactCardType[] {
  if (category === 'vocabulary') {
    // Vocabulary Reels are mixed/filtered inside TikTokFeed from VOCABULARY_FACTS.
    return [];
  }
  const isAllPool = category === 'all';
  const pool = isAllPool
    ? [...allFacts]
    : allFacts.filter((fact) => fact.category === category);

  const { tokenSet, timestampByToken } = buildSeenLookup(seenIds);
  const unseen = pool.filter((f) => !isFactSeen(f, tokenSet));
  const seen = pool.filter((f) => isFactSeen(f, tokenSet));

  const sortedCategories = (Object.keys(categoryWeights) as CategoryId[])
    .filter((cat) => categoryWeights[cat] > 0)
    .sort((a, b) => categoryWeights[b] - categoryWeights[a]);
  const topCats = new Set(sortedCategories.slice(0, 2));

  // Strict Zero-Repeat rule: while ANY unseen card exists, never deal already-seen cards.
  if (unseen.length > 0) {
    const orderedUnseen = blendPreferredUnseenFacts(unseen, isAllPool ? topCats : new Set(), shuffle);
    return isAllPool ? interleaveFactsByCategory(orderedUnseen) : orderedUnseen;
  }

  // Only once every card in the active pool is exhausted, recycle oldest-seen cohorts shuffled.
  const recycledSeen = buildRecycledSeenDeck(seen, timestampByToken, shuffle);
  if (recycledSeen.length === 0) return allFacts;
  return isAllPool ? interleaveFactsByCategory(recycledSeen) : recycledSeen;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function syncDocumentTheme(
  theme: Pick<UserMemoryState, 'darkMode' | 'themeCustomized' | 'appearance'>,
  lang: Language,
) {
  if (typeof document === 'undefined') return;
  const prefersDark =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', resolveDocumentDark(theme, prefersDark));
  document.documentElement.lang = lang === 'en' ? 'en' : 'tr';
}

function normalizeCategoryParam(raw: string | null): CategoryFilter | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean === 'human-body') return 'human_body';
  if (clean === 'weird_records' || clean === 'weird-records') return 'records';
  if (clean === 'istatistik') return 'statistics';
  if (
    clean === 'all' ||
    clean === 'vocabulary' ||
    clean === 'space' ||
    clean === 'nature' ||
    clean === 'human_body' ||
    clean === 'history' ||
    clean === 'science' ||
    clean === 'records' ||
    clean === 'statistics'
  ) {
    return clean;
  }
  return null;
}

function hasFactSlugMatch(pool: FactCardType[], targetSlug: string | null): boolean {
  if (!targetSlug) return false;
  return pool.some(
    (f) => f.slug === targetSlug || f.tr.slug === targetSlug || f.en.slug === targetSlug || f.id === targetSlug
  );
}

function promoteFactToFront(
  deck: FactCardType[],
  pool: FactCardType[],
  targetSlug: string | null,
  category: CategoryFilter = 'all'
): FactCardType[] {
  if (!targetSlug || category === 'vocabulary') return deck;
  const match = pool.find(
    (f) =>
      (category === 'all' || f.category === category) &&
      (f.slug === targetSlug || f.tr.slug === targetSlug || f.en.slug === targetSlug || f.id === targetSlug)
  );
  if (!match) return deck;
  return [match, ...deck.filter((f) => f.id !== match.id)];
}

export default function HomeClient({ initialFacts, initialVocabulary, initialLang = 'tr' }: HomeClientProps) {
  const router = useRouter();
  const allFactsRef = useRef<FactCardType[]>(initialFacts);
  const [allFacts, setAllFacts] = useState<FactCardType[]>(initialFacts);
  const [dbVocabulary, setDbVocabulary] = useState<VocabularyCard[]>(() => initialVocabulary ?? []);
  const [lockedFactIds, setLockedFactIds] = useState<Record<string, boolean>>({});
  const feedRef = useRef<TikTokFeedHandle>(null);
  const activeCategoryRef = useRef<CategoryFilter>('all');
  const requestedFactSlugRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);
  const profileHydratedRef = useRef(false);
  const skipNextProfileSyncRef = useRef(false);

  const [memory, setMemory] = useState<UserMemoryState>(() => getDefaultUserState(initialLang));
  const memoryRef = useRef<UserMemoryState>(memory);
  memoryRef.current = memory;
  const activeSlideIndexRef = useRef(0);
  const [exploreSlideIndex, setExploreSlideIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [deckFacts, setDeckFacts] = useState<FactCardType[]>(() => initialFacts);
  const deckFactsRef = useRef<FactCardType[]>(deckFacts);
  deckFactsRef.current = deckFacts;
  const restoredFeedSessionRef = useRef<StoredFeedSession | null>(null);
  const deferredPwaPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [seedFact, setSeedFact] = useState<FactCardType>(initialFacts[0]);
  const [activeFact, setActiveFact] = useState<FactCardType | null>(initialFacts[0] ?? null);
  const [activeSlide, setActiveSlide] = useState<FeedSlideItem | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [likedRevision, setLikedRevision] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedVocabWords, setSavedVocabWords] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<DockTabId>('explore');
  const [notebookFocus, setNotebookFocus] = useState(0);
  const [chromeBlocked, setChromeBlocked] = useState(false);
  const [suppressInitialFactSync, setSuppressInitialFactSync] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [incomingDuel, setIncomingDuel] = useState<DuelPayload | null>(null);
  const [incomingRoomCode, setIncomingRoomCode] = useState<string | null>(null);
  const [incomingLeagueCode, setIncomingLeagueCode] = useState<string | null>(null);
  const [storyShareFact, setStoryShareFact] = useState<FactCardType | null>(null);
  const [activeDetailCard, setActiveDetailCard] = useState<{
    fact: FactCardType;
    resolvedGifUrl?: string | null;
  } | null>(null);
  const [maxSwipedCards, setMaxSwipedCards] = useState(0);
  const [manualPwaOpen, setManualPwaOpen] = useState(false);
  const [showPwaGuideModal, setShowPwaGuideModal] = useState(false);
  const [clientResetEpoch, setClientResetEpoch] = useState(0);

  const [shareModalData, setShareModalData] = useState<{
    results: boolean[];
    badgeCategory: CategoryId;
    earnedXp: number;
    elapsedSec: number;
    questionIds: string[];
    questionSnapshots?: ChallengeQuestionSnapshot[];
    duelConfig?: DuelChallengeConfig | null;
    quizMode?: ActiveQuizMode;
    quizDate?: string;
  } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [, setValuePropDismissed] = useState(true);
  const [ambientAccent, setAmbientAccent] = useState('#818CF8');
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const authUserRef = useRef<AuthUserDto | null>(null);
  authUserRef.current = authUser;
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authNudgeOpen, setAuthNudgeOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthTriggerSource | string>('manual');
  const [miniOnboardingDismissed, setMiniOnboardingDismissed] = useState(true);
  const guestSaveNudgeShownRef = useRef(false);

  const dismissCardOverlays = useCallback(() => {
    setActiveDetailCard(null);
    setStoryShareFact(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scrolly-close-card-overlays'));
    }
  }, []);

  const activeCardKey =
    activeSlide?.type === 'fact'
      ? `fact:${activeSlide.fact.id}`
      : activeSlide?.type === 'vocabulary'
        ? `vocab:${activeSlide.card.id}`
        : activeSlide
          ? activeSlide.key
          : activeFact
            ? `fact:${activeFact.id}`
            : null;
  const prevActiveCardRef = useRef<{ cardKey: string | null; category: CategoryFilter }>({
    cardKey: activeCardKey,
    category: activeCategory,
  });

  useEffect(() => {
    const prev = prevActiveCardRef.current;
    if (prev.cardKey !== activeCardKey || prev.category !== activeCategory) {
      prevActiveCardRef.current = { cardKey: activeCardKey, category: activeCategory };
      dismissCardOverlays();
    }
  }, [activeCardKey, activeCategory, dismissCardOverlays]);

  useEffect(() => {
    const onChromeBlock = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChromeBlocked(Boolean(detail?.open));
    };
    window.addEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
    return () => window.removeEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
  }, []);

  useEffect(() => {
    if (!activeDetailCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) ||
          target.closest('button, a, input, textarea, select, [role="button"]'))
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setActiveDetailCard(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activeDetailCard]);

  // Resolve local state + ?tab= / ?category= / ?vocab= / ?fact= / ?room= synchronously before first paint
  useIsomorphicLayoutEffect(() => {
    const loaded = loadUserMemory();
    if (typeof window !== 'undefined') {
      const queryLang = new URLSearchParams(window.location.search).get('lang');
      const cookieLang = readLanguageCookie();
      if (queryLang === 'en' || queryLang === 'tr') {
        loaded.lang = queryLang;
        saveUserMemory(loaded);
      } else if (initialLang === 'en') {
        loaded.lang = 'en';
        saveUserMemory(loaded);
      } else if (cookieLang) {
        loaded.lang = cookieLang;
        saveUserMemory(loaded);
      } else if (!window.localStorage.getItem('merak_user_state_v1')) {
        loaded.lang = initialLang;
      }
    }
    setMemory(loaded);
    const seededSaved = seedSavedFactsIfUnset(loaded.favoriteIds);
    setSavedIds(seededSaved.length > 0 ? seededSaved : loadSavedFactIds());
    setSavedVocabWords(loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase()));
    setMiniOnboardingDismissed(readMiniOnboardingDismissed());
    setValuePropDismissed(readValuePropDismissed());
    hasHydratedRef.current = true;
    syncDocumentTheme(loaded, loaded.lang);

    let requestedCategory: CategoryFilter | null = null;
    let requestedFactSlug: string | null = null;
    let requestedVocabId: string | null = null;
    let duelParam: string | null = null;
    let roomCodeCandidate: string | null = null;
    let openQuizParam: string | null = null;
    let resolvedTab: DockTabId | null = null;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      requestedCategory = normalizeCategoryParam(searchParams.get('category'));
      requestedFactSlug = searchParams.get('fact');
      requestedVocabId = searchParams.get('vocab');
      duelParam = searchParams.get('duel');
      const roomParam = searchParams.get('room');
      const leagueParam = searchParams.get('league')?.trim().toUpperCase() ?? null;
      openQuizParam = searchParams.get('openQuiz');
      const rawTab = searchParams.get('tab')?.toLowerCase() ?? null;
      if (rawTab === 'quiz') resolvedTab = 'quiz';
      else if (rawTab === 'leaderboard') resolvedTab = 'leaderboard';
      else if (rawTab === 'duel') resolvedTab = 'duel';
      else if (rawTab === 'profile' || rawTab === 'diploma') resolvedTab = 'diploma';
      else if (rawTab === 'language' || rawTab === 'dil') {
        resolvedTab = 'explore';
        if (!requestedCategory) requestedCategory = 'vocabulary';
      }

      if (leagueParam && /^[A-Z0-9]{6,8}$/.test(leagueParam)) {
        resolvedTab = 'leaderboard';
        setIncomingLeagueCode(leagueParam);
      }

      if (roomParam && isShortRoomCode(roomParam)) {
        roomCodeCandidate = normalizeRoomCode(roomParam);
      } else if (duelParam && isShortRoomCode(duelParam)) {
        roomCodeCandidate = normalizeRoomCode(duelParam);
      }
      if (roomCodeCandidate) {
        resolvedTab = 'duel';
        setIncomingRoomCode(roomCodeCandidate);
        setIncomingDuel(null);
        setActiveQuiz(null);
      }

      requestedFactSlugRef.current =
        requestedCategory === 'vocabulary' || requestedVocabId ? null : requestedFactSlug;

      if (resolvedTab) {
        setActiveTab(resolvedTab);
        setShowWelcome(false);
      }
    }

    const effectiveInitialCategory: CategoryFilter =
      requestedCategory ?? (requestedVocabId ? 'vocabulary' : 'all');

    const restoredSession =
      !duelParam &&
      !roomCodeCandidate &&
      openQuizParam !== 'daily' &&
      !requestedFactSlug &&
      !requestedVocabId &&
      !requestedCategory &&
      !resolvedTab
        ? readFeedSession()
        : null;

    if (effectiveInitialCategory === 'vocabulary') {
      restoredFeedSessionRef.current = null;
      activeCategoryRef.current = 'vocabulary';
      setActiveCategory('vocabulary');
      setDeckFacts([]);
      setActiveFact(null);
      const vocabBase =
        initialVocabulary && initialVocabulary.length > 0
          ? initialVocabulary
          : getVocabularyFacts();
      const targetIdx = requestedVocabId
        ? Math.max(
            0,
            vocabBase.findIndex(
              (c) =>
                c.id === requestedVocabId ||
                c.word.toLowerCase() === requestedVocabId.toLowerCase()
            )
          )
        : 0;
      activeSlideIndexRef.current = targetIdx;
      setExploreSlideIndex(targetIdx);
      setSuppressInitialFactSync(false);
      return;
    }

    if (restoredSession && restoredSession.category !== 'vocabulary') {
      restoredFeedSessionRef.current = restoredSession;
      activeCategoryRef.current = restoredSession.category;
      setActiveCategory(restoredSession.category);
      const byId = new Map(initialFacts.map((fact) => [fact.id, fact]));
      const restoredSubset = restoredSession.deckIds
        .map((id) => byId.get(id))
        .filter((fact): fact is FactCardType => Boolean(fact));
      const fallbackTail = buildPersonalizedDeck(
        initialFacts,
        restoredSession.category,
        loaded.seenIds,
        loaded.categoryWeights,
        true
      );
      const seenInRestored = new Set(restoredSubset.map((f) => f.id));
      const initialDeck =
        restoredSubset.length > 0
          ? [...restoredSubset, ...fallbackTail.filter((f) => !seenInRestored.has(f.id))]
          : fallbackTail;
      const clampedIdx = Math.max(
        0,
        Math.min(restoredSession.slideIndex, Math.max(0, initialDeck.length - 1))
      );
      activeSlideIndexRef.current = clampedIdx;
      setExploreSlideIndex(clampedIdx);
      setDeckFacts(initialDeck);
      if (initialDeck[clampedIdx]) {
        setSeedFact(initialDeck[clampedIdx]);
        setActiveFact(initialDeck[clampedIdx]);
      }
    } else {
      restoredFeedSessionRef.current = null;
      activeCategoryRef.current = effectiveInitialCategory;
      setActiveCategory(effectiveInitialCategory);
      const baseDeck = buildPersonalizedDeck(
        initialFacts,
        effectiveInitialCategory,
        loaded.seenIds,
        loaded.categoryWeights,
        !requestedFactSlug
      );
      const initialDeck = promoteFactToFront(
        baseDeck,
        initialFacts,
        requestedFactSlug,
        effectiveInitialCategory
      );
      activeSlideIndexRef.current = 0;
      setExploreSlideIndex(0);
      setDeckFacts(initialDeck);
      if (initialDeck[0]) {
        setSeedFact(initialDeck[0]);
        setActiveFact(initialDeck[0]);
      }
    }

    const matchedInInitial = hasFactSlugMatch(initialFacts, requestedFactSlugRef.current);
    if (
      requestedFactSlugRef.current &&
      !matchedInInitial &&
      !resolvedTab &&
      !duelParam &&
      !roomCodeCandidate &&
      openQuizParam !== 'daily'
    ) {
      setSuppressInitialFactSync(true);
    } else {
      setSuppressInitialFactSync(false);
    }
  }, [initialFacts, initialVocabulary, initialLang]);

  useEffect(() => {
    initTelemetrySync();

    let duelParam: string | null = null;
    let roomParam: string | null = null;
    let openQuizParam: string | null = null;
    let linkedQuizDate: string | null = null;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      duelParam = searchParams.get('duel');
      roomParam = searchParams.get('room');
      openQuizParam = searchParams.get('openQuiz');
      linkedQuizDate = parseIsoDate(searchParams.get('quizDate'));
    }

    let cancelled = false;

    const applyFactBatch = (incoming: FactCardType[]) => {
      if (cancelled || incoming.length === 0) return;
      const merged = mergeFactsById(allFactsRef.current, incoming);
      allFactsRef.current = merged;
      setAllFacts(merged);

      const currentMem = loadUserMemory();
      const targetSlug =
        activeCategoryRef.current !== 'vocabulary' ? requestedFactSlugRef.current : null;

      if (restoredFeedSessionRef.current && !targetSlug) {
        const session = restoredFeedSessionRef.current;
        const byId = new Map(merged.map((fact) => [fact.id, fact]));
        const restoredFacts = session.deckIds
          .map((id) => byId.get(id))
          .filter((fact): fact is FactCardType => Boolean(fact));
        const restoredIds = new Set(restoredFacts.map((fact) => fact.id));
        const unseenExtras = buildPersonalizedDeck(
          merged.filter((fact) => !restoredIds.has(fact.id)),
          session.category,
          currentMem.seenIds,
          currentMem.categoryWeights,
          true
        );
        const rebuiltDeck =
          restoredFacts.length > 0 ? [...restoredFacts, ...unseenExtras] : unseenExtras;
        const clampedIdx = Math.max(
          0,
          Math.min(session.slideIndex, Math.max(0, rebuiltDeck.length - 1))
        );
        setDeckFacts(rebuiltDeck);
        activeSlideIndexRef.current = clampedIdx;
        setExploreSlideIndex(clampedIdx);
        if (rebuiltDeck[clampedIdx]) {
          setSeedFact(rebuiltDeck[clampedIdx]);
          setActiveFact(rebuiltDeck[clampedIdx]);
        }
        return merged;
      }

      if (activeSlideIndexRef.current > 0 && !targetSlug) {
        // User has already swiped down: preserve cards up to activeSlideIndexRef and rebuild unseen tail
        setDeckFacts((prevDeck) => {
          const category = activeCategoryRef.current;
          const pinnedPrefix = prevDeck.slice(0, activeSlideIndexRef.current + 1);
          const pinnedIds = new Set(pinnedPrefix.map((f) => f.id));
          const { tokenSet } = buildSeenLookup(currentMem.seenIds);
          const remainingPool = merged.filter(
            (f) =>
              !pinnedIds.has(f.id) &&
              (category === 'all' || f.category === category)
          );
          const remainingUnseen = remainingPool.filter((f) => !isFactSeen(f, tokenSet));
          if (remainingUnseen.length === 0) {
            return prevDeck;
          }
          const orderedExtras = buildPersonalizedDeck(
            remainingUnseen,
            category,
            currentMem.seenIds,
            currentMem.categoryWeights,
            true
          );
          const nextDeck = [...pinnedPrefix, ...orderedExtras];
          persistFeedSession(category, nextDeck, activeSlideIndexRef.current);
          return nextDeck;
        });
        return merged;
      }

      const category = activeCategoryRef.current;
      const baseLiveDeck = buildPersonalizedDeck(
        merged,
        category,
        currentMem.seenIds,
        currentMem.categoryWeights,
        !targetSlug
      );

      if (!targetSlug && deckFactsRef.current.length > 0) {
        const currentHead = deckFactsRef.current[0];
        const { tokenSet } = buildSeenLookup(currentMem.seenIds);
        const headMatchesCategory =
          category === 'all' || currentHead.category === category;
        if (headMatchesCategory && !isFactSeen(currentHead, tokenSet)) {
          const stabilized = [
            currentHead,
            ...baseLiveDeck.filter((f) => f.id !== currentHead.id),
          ];
          setDeckFacts(stabilized);
          persistFeedSession(category, stabilized, activeSlideIndexRef.current);
          return merged;
        }
      }

      const updatedDeck = promoteFactToFront(baseLiveDeck, merged, targetSlug, category);
      setDeckFacts(updatedDeck);
      persistFeedSession(category, updatedDeck, 0);
      if (updatedDeck[0] && category !== 'vocabulary') {
        setSeedFact(updatedDeck[0]);
        setActiveFact(updatedDeck[0]);
      }
      if (targetSlug && hasFactSlugMatch(merged, targetSlug)) {
        requestedFactSlugRef.current = null;
        setSuppressInitialFactSync(false);
        requestAnimationFrame(() => feedRef.current?.scrollToTop());
      }
      return merged;
    };

    const hydratePaginatedFeed = async () => {
      // If a deep-linked ?fact= slug is missing from initial SSR slice, immediately resolve bundled local pool in parallel
      const deepLinkSlug = requestedFactSlugRef.current;
      if (deepLinkSlug && !hasFactSlugMatch(allFactsRef.current, deepLinkSlug)) {
        try {
          const { getAllFacts } = await import('@/utils/factsServerData');
          const localFacts = getAllFacts();
          if (!cancelled && localFacts.length > 0) {
            applyFactBatch(localFacts);
          }
        } catch {
          // Continue with paginated API resolution
        }
      }

      const FIRST_PAGE_LIMIT = 30;
      const PAGE_SIZE = 200;
      const MAX_PAGES = 20;
      let workingPool: FactCardType[] | undefined;
      let loadedAnyPage = false;
      let offset = 0;

      for (let page = 0; page < MAX_PAGES && !cancelled; page += 1) {
        const limit = page === 0 ? FIRST_PAGE_LIMIT : PAGE_SIZE;
        const pageRes = await fetchPaginatedFactsFromApi({ offset, limit });
        if (!pageRes || pageRes.facts.length === 0 || cancelled) {
          break;
        }
        if (!loadedAnyPage) {
          loadedAnyPage = true;
          setUsingLocalFallback(false);
          if (pageRes.vocabulary && pageRes.vocabulary.length > 0) {
            setDbVocabulary(pageRes.vocabulary);
          }
        }
        workingPool = applyFactBatch(pageRes.facts) ?? workingPool;
        offset += pageRes.facts.length;
        if (!pageRes.hasMore) {
          break;
        }
      }

      if (!loadedAnyPage) {
        const offlineOrCached = await fetchFactsFromApiWithCache();
        if (offlineOrCached && offlineOrCached.length > 0) {
          workingPool = applyFactBatch(offlineOrCached);
        } else {
          // Local bundled fallback pool on API outage or rate limit
          try {
            const { getAllFacts } = await import('@/utils/factsServerData');
            const localFacts = getAllFacts();
            if (!cancelled && localFacts.length > 0) {
              setUsingLocalFallback(true);
              workingPool = applyFactBatch(localFacts);
            }
          } catch {
            // Retain SSR initialFacts gracefully
          }
        }
      }

      if (cancelled) return;
      setSuppressInitialFactSync(false);
      const activePool = workingPool ?? allFactsRef.current;

      const directRoomCode =
        roomParam && isShortRoomCode(roomParam)
          ? normalizeRoomCode(roomParam)
          : duelParam && isShortRoomCode(duelParam)
            ? normalizeRoomCode(duelParam)
            : null;

      if (directRoomCode) {
        setIncomingRoomCode(directRoomCode);
        setIncomingDuel(null);
        setActiveQuiz(null);
        setActiveTab('duel');
        setShowWelcome(false);
      } else if (duelParam) {
        const [{ decodeDuelPayload }, { resolveFactsByIds }] = await Promise.all([
          import('@/utils/duelCodec'),
          import('@/utils/duelLobby'),
        ]);
        const decoded = decodeDuelPayload(duelParam);
        if (decoded && decoded.cardIds.length > 0) {
          // Legacy base64 duel URL fallback: opens lobby without auto-starting
          const resolved = resolveFactsByIds(activePool, decoded.cardIds);
          const cardIds =
            resolved.length > 0 ? resolved.map((f) => f.id) : decoded.cardIds;
          setIncomingDuel({
            ...decoded,
            cardIds,
          });
          setActiveQuiz(null);
          setActiveTab('duel');
          setShowWelcome(false);
        }
      } else if (openQuizParam === 'daily') {
        const { pickSeededFacts } = await import('@/utils/seededRandom');
        const quizDate = linkedQuizDate || getTodayDateString();
        const dailyFacts = pickSeededFacts(activePool, 5, `daily-${quizDate}`);
        setActiveQuiz({
          key: `daily-url-${quizDate}-${Date.now()}`,
          mode: 'daily',
          questions: dailyFacts.map((fact) => ({ fact })),
          quizDate,
        });
        setActiveTab('quiz');
      }
    };

    const hydrateRemoteProfile = async () => {
      try {
        const sessionRes = await fetchSession();
        if (cancelled) return;
        if (sessionRes.authenticated && sessionRes.user) {
          const user = sessionRes.user;
          setAuthUser(user);
          skipNextProfileSyncRef.current = true;
          setMemory((prev) => hydrateLocalMemoryFromAuthUser(prev, user, 'keep_existing'));
          setSavedIds(loadSavedFactIds());
          setSavedVocabWords(loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase()));
          setLikedRevision((prev) => prev + 1);
          return;
        }

        const remote = await fetchProfileFromApi();
        if (cancelled) return;
        if (remote) {
          const mergedRemoteFavs = Array.from(
            new Set([
              ...(Array.isArray(remote.favoriteIds) ? remote.favoriteIds : []),
              ...memoryRef.current.favoriteIds,
            ])
          );
          setMemory((prev) => mergeRemoteProfileIntoMemory(prev, remote));
          if (mergedRemoteFavs.length > 0) {
            const seededRemote = seedSavedFactsIfUnset(mergedRemoteFavs);
            setSavedIds(seededRemote.length > 0 ? seededRemote : loadSavedFactIds());
          }
        } else {
          const cur = loadUserMemory();
          void syncProfileToApi({
            username: cur.nickname,
            xp: cur.xp,
            weeklyXp: cur.weeklyXp,
            dailyBestScore: cur.dailyBestScore,
            lastDailyQuizDate: cur.lastDailyQuizDate,
            streak: cur.streakDays,
            lastVisitDate: cur.lastVisitDate,
            seenIds: cur.seenIds,
            favoriteIds: cur.favoriteIds,
            likedIds: loadLikedFactIds(),
            vocabNotebook: loadSavedVocabNotebook(),
            categoryWeights: cur.categoryWeights,
            categoryAccuracy: cur.categoryAccuracy,
            badges: cur.badges,
          });
        }
      } finally {
        if (!cancelled) {
          profileHydratedRef.current = true;
        }
      }
    };

    void hydratePaginatedFeed();
    void hydrateRemoteProfile();

    return () => {
      cancelled = true;
    };
  }, [initialFacts]);

  const showToast = useCallback((text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setToastMessage(cleanText);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const bumpLikes = () => setLikedRevision((prev) => prev + 1);
    const syncSaved = () => setSavedIds(loadSavedFactIds());
    const syncVocab = () =>
      setSavedVocabWords(loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase()));
    const onScrollyToast = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (typeof text === 'string' && text.trim()) {
        showToast(text);
      }
    };

    const onOpenAuth = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger || 'manual';
      setAuthTrigger(trigger);
      setAuthNudgeOpen(false);
      setAuthPromptOpen(true);
    };
    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<AuthChangedEventDetail>).detail;
      const nextUser = detail?.user ?? null;
      setAuthUser(nextUser);
      if (!nextUser) {
        setAuthNudgeOpen(false);
        if (detail?.loggedOut) {
          skipNextProfileSyncRef.current = true;
          setMemory(detail.freshMemory ?? loadUserMemory());
          setSavedIds([]);
          setSavedVocabWords([]);
          setLockedFactIds({});
          setLikedRevision((prev) => prev + 1);
        }
      }
    };

    window.addEventListener('scrolly-liked-facts-updated', bumpLikes);
    window.addEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
    window.addEventListener('scrolly-vocab-updated', syncVocab);
    window.addEventListener('scrolly-toast', onScrollyToast as EventListener);
    window.addEventListener(OPEN_AUTH_EVENT, onOpenAuth as EventListener);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
    return () => {
      window.removeEventListener('scrolly-liked-facts-updated', bumpLikes);
      window.removeEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
      window.removeEventListener('scrolly-vocab-updated', syncVocab);
      window.removeEventListener('scrolly-toast', onScrollyToast as EventListener);
      window.removeEventListener(OPEN_AUTH_EVENT, onOpenAuth as EventListener);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged as EventListener);
    };
  }, [showToast]);

  useEffect(() => {
    if (!hasHydratedRef.current || !profileHydratedRef.current) return;
    if (skipNextProfileSyncRef.current) {
      skipNextProfileSyncRef.current = false;
      return;
    }
    const hasActivity =
      memory.xp > 0 ||
      memory.seenIds.length > 0 ||
      memory.favoriteIds.length > 0 ||
      savedIds.length > 0 ||
      savedVocabWords.length > 0 ||
      likedRevision > 0 ||
      memory.streakDays > 0 ||
      Boolean(authUserRef.current);
    if (!hasActivity) return;

    const activeSlug = seedFact?.slug || seedFact?.en.slug || seedFact?.tr.slug || seedFact?.id || 'profile';
    const syncTimer = setTimeout(() => {
      void trackEvent(
        activeSlug,
        seedFact?.category || 'general',
        'profile_sync',
        { xp: memory.xp, streak: memory.streakDays },
        { xp: memory.xp, streak: memory.streakDays, username: memory.nickname }
      );
      void syncProfileToApi({
        username: memory.nickname,
        xp: memory.xp,
        weeklyXp: memory.weeklyXp,
        dailyBestScore: memory.dailyBestScore,
        lastDailyQuizDate: memory.lastDailyQuizDate,
        streak: memory.streakDays,
        lastVisitDate: memory.lastVisitDate,
        seenIds: memory.seenIds,
        favoriteIds: memory.favoriteIds,
        likedIds: loadLikedFactIds(),
        vocabNotebook: loadSavedVocabNotebook(),
        categoryWeights: memory.categoryWeights,
        categoryAccuracy: memory.categoryAccuracy,
        badges: memory.badges,
      });
    }, 450);

    return () => clearTimeout(syncTimer);
  }, [
    memory.xp,
    memory.weeklyXp,
    memory.dailyBestScore,
    memory.lastDailyQuizDate,
    memory.streakDays,
    memory.lastVisitDate,
    memory.nickname,
    memory.seenIds,
    memory.favoriteIds,
    memory.categoryWeights,
    memory.categoryAccuracy,
    memory.badges,
    savedIds,
    savedVocabWords,
    likedRevision,
    seedFact,
  ]);

  useEffect(() => {
    const theme = {
      darkMode: memory.darkMode,
      themeCustomized: memory.themeCustomized,
      appearance: memory.appearance,
    };
    syncDocumentTheme(theme, memory.lang);
    if (theme.appearance !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      syncDocumentTheme({ ...theme, darkMode: media.matches }, memory.lang);
      setMemory((prev) => {
        if (prev.appearance !== 'system' || prev.darkMode === media.matches) return prev;
        return { ...prev, darkMode: media.matches };
      });
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [memory.appearance, memory.darkMode, memory.lang, memory.themeCustomized]);

  const lang: Language = memory.lang;
  const soundEnabled = memory.soundEnabled;
  const topCategory = getTopCategory(memory.categoryWeights);
  const dailyGuessFact = useMemo(
    () => pickDailyGuessFact(allFacts, getDailyGuessDateIso()),
    [allFacts]
  );
  const dailyCompleted =
    Boolean(memory.lastDailyQuizDate) && memory.lastDailyQuizDate === getTodayDateString();
  const showQuizDot = memory.cardsSinceLastQuiz >= 5 || !dailyCompleted;

  const handleChangeLang = (nextLang: Language) => {
    vibrateTap(12);
    playPop(soundEnabled);
    writeLanguageCookie(nextLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLang === 'en' ? 'en' : 'tr';
    }
    setMemory((prev) => {
      const updated = {
        ...prev,
        lang: nextLang,
        nickname: localizeDisplayNickname(prev.nickname, nextLang),
      };
      saveUserMemory(updated);
      return updated;
    });
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const onEnHome = path === '/en' || path === '/en/';
    const onTrHome = path === '/';
    if (!onEnHome && !onTrHome) return;
    if ((nextLang === 'en' && onEnHome) || (nextLang === 'tr' && onTrHome)) return;
    const url = new URL(window.location.href);
    url.pathname = nextLang === 'en' ? '/en' : '/';
    url.searchParams.delete('fact');
    url.searchParams.delete('lang');
    if (activeCategoryRef.current === 'vocabulary' && activeSlide?.type === 'vocabulary') {
      url.searchParams.set('category', 'vocabulary');
      url.searchParams.set('vocab', activeSlide.card.id);
    }
    router.push(`${url.pathname}${url.search}${url.hash}`);
  };

  const handleToggleDarkMode = () => {
    vibrateTap(12);
    playPop(soundEnabled);
    setMemory((prev) => {
      const updated = { ...prev, darkMode: !prev.darkMode, themeCustomized: true };
      saveUserMemory(updated);
      return updated;
    });
  };

  const handleToggleSound = () => {
    vibrateTap(12);
    setMemory((prev) => {
      const nextSound = !prev.soundEnabled;
      const updated = { ...prev, soundEnabled: nextSound };
      saveUserMemory(updated);
      if (nextSound) playPop(true);
      return updated;
    });
  };

  useEffect(() => {
    const onTheme = () => handleToggleDarkMode();
    const onAppearance = (event: Event) => {
      const mode = (event as CustomEvent<AppearanceMode>).detail;
      if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
      const prefersDark =
        typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMemory((prev) => {
        const updated = applyAppearance(prev, mode, prefersDark);
        saveUserMemory(updated);
        return updated;
      });
    };
    const onCookie = (event: Event) => {
      const choice = (event as CustomEvent<'granted' | 'denied'>).detail;
      if (choice !== 'granted' && choice !== 'denied') return;
      applyGoogleConsentChoice(choice);
      setMemory((prev) => {
        const updated = { ...prev, cookieAccepted: true };
        saveUserMemory(updated);
        return updated;
      });
    };
    const onSound = () => handleToggleSound();
    const onDuel = () => {
      setActiveQuiz(null);
      setActiveTab('duel');
    };
    window.addEventListener('scrolly-toggle-theme', onTheme);
    window.addEventListener('scrolly-set-appearance', onAppearance as EventListener);
    window.addEventListener('scrolly-set-cookie', onCookie as EventListener);
    window.addEventListener('scrolly-toggle-sound', onSound);
    window.addEventListener('scrolly-open-duel', onDuel);
    return () => {
      window.removeEventListener('scrolly-toggle-theme', onTheme);
      window.removeEventListener('scrolly-set-appearance', onAppearance as EventListener);
      window.removeEventListener('scrolly-set-cookie', onCookie as EventListener);
      window.removeEventListener('scrolly-toggle-sound', onSound);
      window.removeEventListener('scrolly-open-duel', onDuel);
    };
  }, [handleToggleDarkMode, handleToggleSound]);

  const triggerGuestAuthNudge = useCallback((source: AuthTriggerSource) => {
    if (authUserRef.current || getCachedAuthUserEmail()) return;
    if (isAuthNudgeCoolingDown()) return;
    setAuthTrigger(source);
    setAuthNudgeOpen(true);
  }, []);

  const handleSelectCategory = (cat: CategoryFilter) => {
    vibrateTap(12);
    playPop(soundEnabled);
    setActiveDetailCard(null);
    setShowPwaGuideModal(false);
    restoredFeedSessionRef.current = null;
    requestedFactSlugRef.current = null;
    setSuppressInitialFactSync(false);
    activeCategoryRef.current = cat;
    activeSlideIndexRef.current = 0;
    setExploreSlideIndex(0);
    setActiveCategory(cat);
    setActiveTab((prev) => (prev === 'language' ? 'explore' : prev));

    if (typeof window !== 'undefined') {
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('fact');
        currentUrl.searchParams.delete('vocab');
        if (cat === 'all') {
          currentUrl.searchParams.delete('category');
        } else {
          currentUrl.searchParams.set('category', cat);
        }
        window.history.replaceState(
          window.history.state,
          '',
          `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
        );
      } catch {
        // Ignore history API errors in restricted webviews
      }
    }

    const prevMem = memoryRef.current;
    const nextMem =
      cat !== 'all' && cat !== 'vocabulary'
        ? boostCategoryWeight(prevMem, cat, 1)
        : prevMem;
    if (nextMem !== prevMem) {
      setMemory(nextMem);
    }

    const newDeck = buildPersonalizedDeck(
      allFactsRef.current,
      cat,
      nextMem.seenIds,
      nextMem.categoryWeights,
      true
    );
    setDeckFacts(newDeck);
    persistFeedSession(cat, newDeck, 0);
    if (cat === 'vocabulary') {
      setActiveFact(null);
    } else if (newDeck[0]) {
      setSeedFact(newDeck[0]);
      setActiveFact(newDeck[0]);
    }

    feedRef.current?.scrollToTop();

    if (cat !== 'all' && cat !== 'vocabulary') {
      const currentCount = allFactsRef.current.filter((f) => f.category === cat).length;
      if (currentCount < 10) {
        void fetchPaginatedFactsFromApi({ offset: 0, limit: 60, category: cat }).then((res) => {
          if (!res || res.facts.length === 0) return;
          const merged = mergeFactsById(allFactsRef.current, res.facts);
          allFactsRef.current = merged;
          setAllFacts(merged);
          if (activeCategoryRef.current === cat) {
            const mem = loadUserMemory();
            const refreshed = buildPersonalizedDeck(
              merged,
              cat,
              mem.seenIds,
              mem.categoryWeights,
              true
            );
            setDeckFacts(refreshed);
            persistFeedSession(cat, refreshed, 0);
            if (refreshed[0]) {
              setSeedFact(refreshed[0]);
              setActiveFact(refreshed[0]);
            }
          }
        });
      }
    }
  };

  const handleDwellRead = useCallback((fact: FactCardType) => {
    setSeedFact(fact);
    setMemory((prev) => recordCardRead(prev, fact.id, fact.category));
  }, []);

  const handleOpenQuizHub = useCallback(() => {
    vibrateTap(12);
    playPop(soundEnabled);
    setActiveQuiz(null);
    setActiveTab('quiz');
  }, [soundEnabled]);

  const handleFlipCard = useCallback(
    (fact: FactCardType) => {
      setSeedFact(fact);
      vibrateFlip(12);
      playWhoosh(soundEnabled);
      setMemory((prev) => boostCategoryWeight(prev, fact.category, 1));
    },
    [soundEnabled]
  );

  const handleGuessLocked = useCallback((factId: string) => {
    setLockedFactIds((prev) => (prev[factId] ? prev : { ...prev, [factId]: true }));
  }, []);

  const handleGuessReward = useCallback(
    (xpAmount: number, accurate: boolean, category?: CategoryId, accuracyPct?: number) => {
      vibrateTap(12);
      if (accurate) {
        playDing(soundEnabled);
        if (xpAmount >= 20 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(GUESS_CORRECT_EVENT, { detail: { xp: xpAmount } }));
        }
      } else {
        playPop(soundEnabled);
      }
      setMemory((prev) =>
        category
          ? recordCategoryGuessAccuracy(
              prev,
              category,
              accuracyPct ?? (accurate ? 100 : 0),
              xpAmount
            )
          : addUserXp(prev, xpAmount)
      );
    },
    [soundEnabled]
  );

  const handleOpenStoryShare = useCallback(
    (fact: FactCardType) => {
      vibrateSheet(12);
      playPop(soundEnabled);
      setStoryShareFact(fact);
    },
    [soundEnabled]
  );

  const handleDoubleTapLike = useCallback(
    (fact: FactCardType) => {
      // Like feedback only: never auto-save / favorite. Liked IDs live in likedFacts localStorage.
      setSeedFact(fact);
      vibrateDoubleTap(12);
      playPopDing(soundEnabled);
    },
    [soundEnabled]
  );

  const handleToggleFavorite = useCallback(
    (fact: FactCardType) => {
      setSeedFact(fact);
      vibrateDoubleTap(12);
      playPopDing(soundEnabled);

      const wasSaved =
        isFactSaved(fact.id) || memoryRef.current.favoriteIds.includes(fact.id);
      let nextSaved: boolean;
      if (wasSaved && !isFactSaved(fact.id)) {
        removeSavedFact(fact.id);
        nextSaved = false;
      } else {
        nextSaved = toggleSavedFact(fact.id);
      }
      setSavedIds(loadSavedFactIds());

      const factSlug = fact.slug || fact.en.slug || fact.tr.slug || fact.id;
      void trackEvent(factSlug, fact.category, nextSaved ? 'save' : 'unsave', {
        item_type: 'fact',
      });

      setMemory((prev) => {
        const inMemoryFavs = prev.favoriteIds.includes(fact.id);
        if (inMemoryFavs === nextSaved) return prev;
        return toggleFavoriteFact(prev, fact.id, fact.category);
      });

      showToast(
        nextSaved
          ? lang === 'tr'
            ? 'Kaydedilenlere eklendi'
            : 'Added to Saved Facts'
          : lang === 'tr'
            ? 'Kaydedilenlerden çıkarıldı'
            : 'Removed from Saved Facts'
      );

      if (nextSaved && !guestSaveNudgeShownRef.current) {
        guestSaveNudgeShownRef.current = true;
        triggerGuestAuthNudge('save');
      }
    },
    [soundEnabled, lang, showToast, triggerGuestAuthNudge]
  );

  const handleOpenDuelFromCard = useCallback(
    (fact: FactCardType) => {
      setSeedFact(fact);
      vibrateSheet(12);
      playPop(soundEnabled);
      setIncomingDuel(null);
      setIncomingRoomCode(null);
      setActiveTab('duel');
    },
    [soundEnabled]
  );

  const handleStartQuizMode = (choice: QuizModeChoice) => {
    vibrateTap(12);
    setActiveTab('quiz');
    setQuizLoading(true);
    const pool = allFactsRef.current;
    const recentIds = memory.recentFiveIds;
    const seed = seedFact;
    const vocabAlreadyLoaded = mergedVocabulary;
    void (async () => {
      try {
        const seeded = await import('@/utils/seededRandom');
        if (choice === 'daily') {
          const quizDate = getTodayDateString();
          const dailyFacts = seeded.pickSeededFacts(pool, 5, `daily-${quizDate}`);
          setActiveQuiz({
            key: `daily-${quizDate}-${Date.now()}`,
            mode: 'daily',
            questions: dailyFacts.map((fact) => ({ fact })),
            quizDate,
          });
          return;
        }
        if (choice === 'weekly') {
          const weeklyFacts = seeded.pickSeededFacts(pool, 10, seeded.getWeeklySeedKey());
          setActiveQuiz({
            key: `weekly-${Date.now()}`,
            mode: 'weekly',
            questions: weeklyFacts.map((fact) => ({ fact })),
          });
          return;
        }
        if (choice === 'vocabulary') {
          const vocabPool =
            vocabAlreadyLoaded.length > 0 ? vocabAlreadyLoaded : getVocabularyFacts();
          const pickedVocab = seeded.pickSeededFacts(
            vocabPool,
            5,
            `${seeded.getDailySeedKey()}-vocab-${Date.now()}`
          );
          setActiveQuiz({
            key: `vocabulary-${Date.now()}`,
            mode: 'vocabulary',
            questions: pickedVocab.map((card) => ({
              fact: vocabCardToFactCard(card, vocabPool),
            })),
          });
          return;
        }
        const { generateMemoryQuizFromRecent } = await import('@/utils/recommendation');
        const memQuestions = generateMemoryQuizFromRecent(recentIds, pool, seed);
        setActiveQuiz({
          key: `memory-${Date.now()}`,
          mode: 'memory',
          questions: memQuestions,
        });
      } finally {
        setQuizLoading(false);
      }
    })();
  };
  const startQuizModeRef = useRef(handleStartQuizMode);
  startQuizModeRef.current = handleStartQuizMode;

  useEffect(() => {
    const onReplay = (event: Event) => {
      const mode = (event as CustomEvent<{ quizMode?: string }>).detail?.quizMode;
      setShareModalData(null);
      if (mode === 'duel') {
        setActiveQuiz(null);
        setActiveTab('duel');
        return;
      }
      const choice: QuizModeChoice =
        mode === 'daily' || mode === 'weekly' || mode === 'vocabulary' || mode === 'memory'
          ? mode
          : 'memory';
      startQuizModeRef.current(choice);
    };
    const onOpenTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string; section?: string }>).detail;
      if (detail?.tab !== 'diploma') return;
      if (detail.section === 'vocab') setNotebookFocus((current) => current + 1);
      setActiveQuiz(null);
      setActiveDetailCard(null);
      setStoryShareFact(null);
      setShareModalData(null);
      setActiveTab('diploma');
    };
    window.addEventListener('scrolly-quiz-replay', onReplay);
    window.addEventListener('scrolly-open-tab', onOpenTab);
    return () => {
      window.removeEventListener('scrolly-quiz-replay', onReplay);
      window.removeEventListener('scrolly-open-tab', onOpenTab);
    };
  }, []);

  const handleStartDuel = (config: DuelChallengeConfig) => {
    vibrateTap(12);
    setIncomingDuel(null);
    setActiveTab('duel');
    setQuizLoading(true);
    const activePool = allFactsRef.current;
    const questionCount = Math.max(1, config.questionCount || config.factIds.length || 5);
    void (async () => {
      try {
        const { resolveFactsByIds } = await import('@/utils/duelLobby');
        let duelFacts = resolveFactsByIds(activePool, config.factIds);
        if (duelFacts.length < questionCount) {
          for (const candidate of activePool) {
            if (!duelFacts.some((f) => f.id === candidate.id)) duelFacts.push(candidate);
            if (duelFacts.length >= questionCount) break;
          }
        }
        duelFacts = duelFacts.slice(0, questionCount);

        setActiveQuiz({
          key: `duel-${config.duelId || Date.now()}`,
          mode: 'duel',
          questions: duelFacts.map((fact) => ({ fact })),
          duelConfig: config,
        });
      } finally {
        setQuizLoading(false);
      }
    })();
  };

  const handleQuizComplete = (
    results: boolean[],
    sourceCategories: string[],
    earnedXp: number,
    elapsedSec: number,
    usedQuestionIds: string[],
    usedSnapshots?: ChallengeQuestionSnapshot[]
  ) => {
    vibrateSuccess();

    const finishedSession = activeQuiz;
    const quizMode = finishedSession?.mode ?? 'memory';
    const storageQuizMode: 'memory' | 'daily' | 'weekly' | 'duel' =
      quizMode === 'vocabulary' ? 'memory' : quizMode;
    const duelConfig = finishedSession?.duelConfig ?? null;
    const isRealServerDuel = Boolean(
      duelConfig?.duelId && isShortRoomCode(duelConfig.duelId) && !duelConfig.isBotPractice
    );
    const isDuelWin =
      duelConfig && !isRealServerDuel ? earnedXp > duelConfig.targetScore : false;

    const categoryCounts: Record<string, number> = {};
    sourceCategories.forEach((c) => {
      categoryCounts[c] = (categoryCounts[c] ?? 0) + 1;
    });
    const bestQuizCategory =
      (Object.keys(categoryCounts).sort(
        (a, b) => categoryCounts[b] - categoryCounts[a]
      )[0] as CategoryId | undefined) ??
      topCategory ??
      seedFact.category;

    const currentMem = memoryRef.current;
    const oldTier = getLeagueInfo(currentMem.xp, lang).id;
    const totalBonusXp = earnedXp + (isDuelWin ? 150 : 0);
    const updated = completeMemoryQuiz(
      currentMem,
      bestQuizCategory,
      totalBonusXp,
      storageQuizMode,
      results,
      sourceCategories
    );
    const newTier = getLeagueInfo(updated.xp, lang).id;

    if (isDuelWin || newTier !== oldTier) {
      playLeagueCelebration(soundEnabled);
    } else {
      playCelebration(soundEnabled);
    }

    setMemory(updated);

    const scorePayload = {
      playerId: updated.playerId,
      nickname: updated.nickname,
      quizMode: storageQuizMode,
      score: totalBonusXp,
      durationSec: elapsedSec,
      correctCount: results.filter(Boolean).length,
      questionCount: results.length,
      answers: results,
    };
    void import('@/utils/supabaseLeaderboard').then(({ submitQuizScoreToLeaderboard }) => {
      submitQuizScoreToLeaderboard(scorePayload);
    });

    const duelPlayerId = duelConfig?.myPlayerId || updated.playerId;
    const duelRoomId = duelConfig?.duelId;
    if (isRealServerDuel && duelRoomId) {
      void import('@/utils/duelLobby').then(({ completeScrollaRoom }) => {
        void completeScrollaRoom(duelRoomId, duelPlayerId, totalBonusXp, {
          elapsedSec,
          answers: results,
        });
      });
    }

    const fallbackSnapshots: ChallengeQuestionSnapshot[] =
      usedSnapshots && usedSnapshots.length > 0
        ? usedSnapshots
        : (finishedSession?.questions ?? []).map((item) => ({
            id: item.fact.id,
            category: item.fact.category,
            emoji: item.fact.emoji,
            ...(item.fact.sourceName ? { sourceName: item.fact.sourceName } : {}),
            tr: {
              title: item.fact.tr.title,
              ...(item.fact.tr.tag ? { tag: item.fact.tr.tag } : {}),
              factText: item.fact.tr.factText,
              ...(item.fact.tr.deepDiveDetail ? { deepDiveDetail: item.fact.tr.deepDiveDetail } : {}),
              ...(item.fact.tr.sourceHint ? { sourceHint: item.fact.tr.sourceHint } : {}),
              ...(item.fact.tr.sourceName ? { sourceName: item.fact.tr.sourceName } : {}),
              quiz: item.fact.tr.quiz,
            },
            en: {
              title: item.fact.en.title,
              ...(item.fact.en.tag ? { tag: item.fact.en.tag } : {}),
              factText: item.fact.en.factText,
              ...(item.fact.en.deepDiveDetail ? { deepDiveDetail: item.fact.en.deepDiveDetail } : {}),
              ...(item.fact.en.sourceHint ? { sourceHint: item.fact.en.sourceHint } : {}),
              ...(item.fact.en.sourceName ? { sourceName: item.fact.en.sourceName } : {}),
              quiz: item.fact.en.quiz,
            },
          }));

    setActiveQuiz(null);
    setShareModalData({
      results,
      badgeCategory: bestQuizCategory,
      earnedXp: totalBonusXp,
      elapsedSec,
      questionIds: usedQuestionIds,
      questionSnapshots: fallbackSnapshots,
      duelConfig,
      quizMode: finishedSession?.mode,
      quizDate: finishedSession?.quizDate,
    });

    if (consumeNicknamePrompt(isGenericDefaultNickname(updated.nickname))) {
      setShowWelcome(true);
    }

    triggerGuestAuthNudge('quiz');
  };

  const refreshExploreDeck = useCallback((shuffle = true) => {
    restoredFeedSessionRef.current = null;
    const refreshed = buildPersonalizedDeck(
      allFactsRef.current,
      activeCategoryRef.current,
      memoryRef.current.seenIds,
      memoryRef.current.categoryWeights,
      shuffle
    );
    setDeckFacts(refreshed);
    if (refreshed[0]) setSeedFact(refreshed[0]);
    activeSlideIndexRef.current = 0;
    setExploreSlideIndex(0);
    persistFeedSession(activeCategoryRef.current, refreshed, 0);
    requestAnimationFrame(() => feedRef.current?.scrollToTop());
  }, []);

  const handleDockSelectTab = (tab: DockTabId) => {
    vibrateTap(12);
    playPop(soundEnabled);
    const hadSubPage = Boolean(
      activeDetailCard || storyShareFact || shareModalData || showPwaGuideModal
    );
    dismissCardOverlays();
    setShowPwaGuideModal(false);
    setShareModalData(null);

    if (tab === 'explore' || tab === 'language') {
      const nextCategory = tab === 'language' ? 'vocabulary' : 'all';
      const alreadyExploring =
        activeTab === tab &&
        activeCategoryRef.current === nextCategory &&
        !activeQuiz &&
        !hadSubPage;
      setActiveQuiz(null);
      setIncomingDuel(null);
      setActiveTab(tab);
      if (activeCategoryRef.current !== nextCategory) {
        handleSelectCategory(nextCategory);
      } else if (alreadyExploring && tab === 'explore') {
        refreshExploreDeck(true);
      }
      return;
    }

    if (tab === 'diploma') setNotebookFocus(0);
    if (tab === 'duel') {
      setShowWelcome(false);
    }
    if (tab !== 'duel') setIncomingDuel(null);
    if (tab !== 'quiz' && tab !== 'duel') setActiveQuiz(null);
    if (tab === 'quiz') setActiveQuiz(null);
    setActiveTab(tab);

    // Floating auth card only on Profile / Leaderboard tops (never covers duel chrome)
    if ((tab === 'leaderboard' || tab === 'diploma') && memoryRef.current.xp > 0) {
      triggerGuestAuthNudge(tab === 'diploma' ? 'profile' : 'leaderboard');
    } else {
      setAuthNudgeOpen(false);
    }
  };

  const closeOverlayToExplore = () => {
    vibrateTap(12);
    playPop(soundEnabled);
    dismissCardOverlays();
    setShowPwaGuideModal(false);
    setShareModalData(null);
    setIncomingDuel(null);
    setIncomingRoomCode(null);
    setActiveQuiz(null);
    setActiveTab('explore');
  };

  const handleToggleNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && !memory.notificationsEnabled) {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore browser notification permission rejection
      }
    }
    setMemory((prev) => toggleUserNotifications(prev));
  };

  const handleResetMemory = () => {
    skipNextProfileSyncRef.current = true;

    // Wipe every client-side progress bucket Reset Memory is documented to clear.
    clearSeenSlugsStorage();
    clearFeedSession();
    clearSavedFacts();
    clearLikedFacts();
    clearVocabNotebook();
    clearPwaDismissed();
    clearWelcomeDismissed();
    clearNicknameAsked();
    clearValuePropDismissed();
    clearAuthNudgeDismissed();
    clearMiniOnboardingDismissed();
    clearCelebrationFlags();
    try {
      window.localStorage.removeItem(DIAGRAM_INTERACTED_STORAGE_KEY);
      window.sessionStorage.removeItem('scrolly_vocab_quiz_state_v1');
    } catch {
      // Ignore private-mode storage failures
    }
    const { previousDeviceId } = resetTelemetryClientState();

    const fresh = resetUserMemory();
    void import('@/utils/duelLobby').then(({ clearScrollaPlayerId, getOrCreateScrollaPlayerId }) => {
      clearScrollaPlayerId();
      getOrCreateScrollaPlayerId(fresh.playerId);
    });

    setMemory(fresh);
    setMiniOnboardingDismissed(false);
    setValuePropDismissed(false);
    setAuthNudgeOpen(false);
    setSavedIds([]);
    setSavedVocabWords([]);
    setLikedRevision((prev) => prev + 1);
    setClientResetEpoch((prev) => prev + 1);
    setLockedFactIds({});
    setMaxSwipedCards(0);
    setIncomingDuel(null);
    setIncomingRoomCode(null);
    setActiveQuiz(null);
    setShareModalData(null);
    setStoryShareFact(null);
    setActiveDetailCard(null);
    setManualPwaOpen(false);
    setShowPwaGuideModal(false);
    setShowWelcome(false);
    restoredFeedSessionRef.current = null;
    activeCategoryRef.current = 'all';
    activeSlideIndexRef.current = 0;
    setExploreSlideIndex(0);
    setActiveCategory('all');
    setActiveTab('explore');
    const cleanDeck = buildPersonalizedDeck(allFactsRef.current, 'all', [], fresh.categoryWeights, true);
    setDeckFacts(cleanDeck);
    persistFeedSession('all', cleanDeck, 0);
    if (cleanDeck[0]) {
      setSeedFact(cleanDeck[0]);
      setActiveFact(cleanDeck[0]);
    }
    feedRef.current?.scrollToTop();

    const zeroedProfile = {
      reset: true as const,
      username: fresh.nickname,
      xp: 0,
      weeklyXp: 0,
      dailyBestScore: 0,
      lastDailyQuizDate: '',
      streak: 0,
      lastVisitDate: fresh.lastVisitDate,
      seenIds: [] as string[],
      favoriteIds: [] as string[],
      likedIds: [] as string[],
      vocabNotebook: [],
      categoryWeights: fresh.categoryWeights,
      categoryAccuracy: fresh.categoryAccuracy,
      badges: [] as string[],
    };

    // Zero the previous device profile (if any), then persist the fresh anonymous id.
    if (previousDeviceId && previousDeviceId !== 'server') {
      void fetch('/api/profile', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: previousDeviceId, ...zeroedProfile }),
        keepalive: true,
      }).catch(() => {
        // Best-effort remote wipe; local clear already succeeded.
      });
    }
    void syncProfileToApi(zeroedProfile);
  };

  const handleDeferredPromptChange = useCallback(
    (promptEvt: BeforeInstallPromptEvent | null) => {
      deferredPwaPromptRef.current = promptEvt;
    },
    []
  );

  const handleRequestPwaInstall = useCallback(() => {
    const activeLang = memoryRef.current.lang === 'en' ? 'en' : 'tr';
    if (checkIsStandalone()) {
      showToast(translations[activeLang].pwaAlreadyInstalledToast);
      return;
    }
    const promptEvt = deferredPwaPromptRef.current;
    if (promptEvt) {
      deferredPwaPromptRef.current = null;
      void promptEvt
        .prompt()
        .then(() => promptEvt.userChoice)
        .then((choice) => {
          if (choice.outcome !== 'accepted') {
            setShowPwaGuideModal(true);
          }
        })
        .catch(() => {
          setShowPwaGuideModal(true);
        });
      return;
    }
    setShowPwaGuideModal(true);
  }, [showToast]);

  const isExploreSubPageOpen = Boolean(shareModalData || showPwaGuideModal);
  const cookieBannerVisible =
    !memory.cookieAccepted &&
    activeTab === 'explore' &&
    !activeQuiz &&
    !showWelcome &&
    !isExploreSubPageOpen &&
    !chromeBlocked;
  const showExploreFeed = (activeTab === 'explore' || activeTab === 'language') && !activeQuiz && !isExploreSubPageOpen;

  // Keep URL query params cleanly synchronized with active tab & category state
  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') return;
    try {
      const currentUrl = new URL(window.location.href);
      const before = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

      if ((activeTab !== 'explore' && activeTab !== 'language') || activeQuiz) {
        const targetTabParam =
          activeTab === 'diploma'
            ? 'profile'
            : activeTab === 'explore' && activeQuiz
              ? 'quiz'
              : activeTab;
        currentUrl.searchParams.delete('fact');
        currentUrl.searchParams.delete('vocab');
        currentUrl.searchParams.delete('category');
        currentUrl.searchParams.set('tab', targetTabParam);
        if (targetTabParam === 'language') {
          currentUrl.searchParams.set('category', 'vocabulary');
          currentUrl.searchParams.delete('vocab');
        }
        if (targetTabParam !== 'duel') {
          currentUrl.searchParams.delete('room');
          currentUrl.searchParams.delete('duel');
        }
      } else {
        currentUrl.searchParams.delete('tab');
        currentUrl.searchParams.delete('room');
        currentUrl.searchParams.delete('duel');
        if (activeCategory === 'all') {
          currentUrl.searchParams.delete('category');
        } else {
          currentUrl.searchParams.set('category', activeCategory);
          if (activeCategory === 'vocabulary') {
            currentUrl.searchParams.delete('fact');
          }
        }
      }

      const after = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (after !== before) {
        window.history.replaceState(window.history.state, '', after);
      }
    } catch {
      // Ignore history API errors in restricted webviews
    }
  }, [activeTab, activeQuiz, activeCategory]);

  useEffect(() => {
    const onAmbient = (event: Event) => {
      const accent = (event as CustomEvent<{ accent?: string }>).detail?.accent;
      if (typeof accent === 'string' && accent.length > 0) setAmbientAccent(accent);
    };
    window.addEventListener('scrolly-ambient-accent', onAmbient as EventListener);
    return () => window.removeEventListener('scrolly-ambient-accent', onAmbient as EventListener);
  }, []);

  const isDark = memory.darkMode;
  const mergedVocabulary = useMemo(() => {
    const staticVocab = initialVocabulary ?? [];
    if (dbVocabulary.length === 0) return staticVocab;
    const seenWords = new Set<string>();
    const seenIds = new Set<string>();
    const merged: VocabularyCard[] = [];
    for (const card of [...dbVocabulary, ...staticVocab]) {
      const wordKey = card.word.trim().toLowerCase();
      if (!wordKey || seenWords.has(wordKey) || seenIds.has(card.id)) continue;
      seenWords.add(wordKey);
      seenIds.add(card.id);
      merged.push(card);
    }
    return merged;
  }, [dbVocabulary, initialVocabulary]);
  const mergedSavedFactIds = useMemo(
    () => Array.from(new Set([...savedIds, ...memory.favoriteIds])),
    [savedIds, memory.favoriteIds]
  );
  const isCurrentSlideSaved = activeFact
    ? mergedSavedFactIds.includes(activeFact.id)
    : activeSlide?.type === 'vocabulary'
      ? savedVocabWords.includes(activeSlide.card.word.toLowerCase()) ||
        isVocabWordSaved(activeSlide.card.word)
      : false;
  const activeSlideId =
    activeFact?.id ?? (activeSlide?.type === 'vocabulary' ? activeSlide.card.id : null);
  const activeSlideLiked = activeSlideId
    ? likedRevision >= 0 && isFactLiked(activeSlideId)
    : false;
  const activeSlideLikesCount = activeFact
    ? typeof activeFact.likesCount === 'number'
      ? Math.max(0, activeFact.likesCount) + (activeSlideLiked ? 1 : 0)
      : (() => {
          let sum = 120;
          for (let i = 0; i < activeFact.id.length; i += 1) {
            sum += activeFact.id.charCodeAt(i) * 19;
          }
          return 400 + (sum % 890) + (activeSlideLiked ? 1 : 0);
        })()
    : activeSlide?.type === 'vocabulary'
      ? (() => {
          let sum = 140;
          for (let i = 0; i < activeSlide.card.id.length; i += 1) {
            sum += activeSlide.card.id.charCodeAt(i) * 17;
          }
          return 240 + (sum % 520) + (activeSlideLiked ? 1 : 0);
        })()
      : 0;

  return (
    <ErrorBoundary
      fallbackTitle={
        lang === 'tr' ? 'Keşif akışı geçici olarak yenilendi' : 'Discovery feed temporarily reset'
      }
      onReset={() => refreshExploreDeck(false)}
    >
      <div
        data-testid="reels-desktop-shell"
        data-theme={isDark ? 'dark' : 'light'}
        className="relative flex h-[100dvh] w-screen overflow-hidden select-none bg-cik-bg text-cik-text"
      >
        {showWelcome ? (
        <WelcomeExploreModal
          open
          lang={lang}
          initialNickname={memory.nickname}
          onStart={(chosenNickname) => {
            persistWelcomeDismissed();
            if (chosenNickname && chosenNickname.trim()) {
              const cleanNick = chosenNickname.trim().slice(0, 24);
              setMemory((prev) => updateUserNickname(prev, cleanNick));
              const cur = memoryRef.current;
              void syncProfileToApi({
                username: cleanNick,
                xp: cur.xp,
                weeklyXp: cur.weeklyXp,
                dailyBestScore: cur.dailyBestScore,
                lastDailyQuizDate: cur.lastDailyQuizDate,
                streak: cur.streakDays,
                lastVisitDate: cur.lastVisitDate,
                seenIds: cur.seenIds,
                favoriteIds: cur.favoriteIds,
                likedIds: loadLikedFactIds(),
                vocabNotebook: loadSavedVocabNotebook(),
                categoryWeights: cur.categoryWeights,
                categoryAccuracy: cur.categoryAccuracy,
                badges: cur.badges,
              });
            }
            setShowWelcome(false);
            vibrateTap(12);
            playPop(soundEnabled);
          }}
        />
        ) : null}

      <div
        data-testid="reels-desktop-grid"
        className="relative mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1520px] lg:grid lg:grid-cols-[232px_minmax(0,1fr)]"
      >
      {/* Left rail: icons-only 768–1279, full labels ≥1280 */}
      <DesktopLeftNav
        activeTab={activeTab}
        lang={lang}
        darkMode={isDark}
        showQuizDot={showQuizDot}
        xp={memory.xp}
        streakDays={memory.streakDays}
        accountLabel={authUser?.nickname || memory.nickname || null}
        accountEmail={authUser?.email || null}
        onSelectTab={handleDockSelectTab}
        onBindEmail={
          authUser
            ? undefined
            : () => {
                setAuthTrigger('manual');
                setAuthNudgeOpen(false);
                setAuthPromptOpen(true);
              }
        }
      />

      <a
        href="#feed-stage"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-toast focus:rounded-pill focus:bg-cik-cta focus:px-4 focus:py-2 focus:text-cik-on-cta"
      >
        {lang === 'tr' ? 'İçeriğe geç' : 'Skip to content'}
      </a>
      <main
        id="feed-stage"
        data-testid="reels-main-region"
        data-accent-ready={ambientAccent ? 'true' : 'false'}
        className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch justify-center bg-cik-bg lg:items-center xl:col-start-2"
      >
        <div
          data-testid="reels-stage-row"
          className="relative z-10 my-0 flex h-full w-full items-stretch justify-center md:items-center lg:h-[min(86vh,760px)] lg:max-h-[min(86vh,760px)] lg:flex-row lg:items-stretch lg:justify-center lg:gap-6 xl:gap-8"
        >
        <style>{`
          @media (min-width: 1024px) {
            [data-testid="reels-phone-frame"].stage-card {
              width: clamp(420px, 36vw, 560px) !important;
              min-width: 0 !important;
              max-width: 560px !important;
              height: min(86vh, 760px) !important;
              max-height: min(86vh, 760px) !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              border-radius: 28px !important;
            }
            [data-testid="desktop-insight-column"],
            [data-testid="desktop-info-shortcut-panel"] {
              height: min(86vh, 760px) !important;
              max-height: min(86vh, 760px) !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              border-radius: 28px !important;
            }
          }
        `}</style>
        <div
          data-testid="reels-phone-frame"
          className="stage-card relative z-10 m-0 my-0 mt-0 mb-0 flex h-[100dvh] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-none border-0 bg-cik-bg p-0 text-cik-text shadow-none lg:h-[min(86vh,760px)] lg:max-h-[min(86vh,760px)] lg:self-stretch lg:rounded-[28px] lg:border lg:border-black/10 lg:p-0 lg:shadow-sticker dark:lg:border-white/10"
        >
        <DeferredAdSense />
        <OfflineManager lang={lang} />

        <MiniOnboardingHint
          visible={showExploreFeed && !showWelcome && !chromeBlocked && !miniOnboardingDismissed}
          xp={memory.xp}
          lang={lang}
          darkMode={isDark}
          cookieAccepted={memory.cookieAccepted}
          onSelectCategory={handleSelectCategory}
          onConsent={() => {
            vibrateTap(12);
            playPop(soundEnabled);
            setMemory((prev) => {
              const updated = { ...prev, cookieAccepted: true };
              saveUserMemory(updated);
              return updated;
            });
          }}
          onDismiss={() => {
            persistMiniOnboardingDismissed();
            setMiniOnboardingDismissed(true);
          }}
        />

        <PwaInstallPrompt
          key={`pwa-${clientResetEpoch}`}
          lang={lang}
          swipedCount={maxSwipedCards}
          forceOpen={manualPwaOpen}
          autoPromptEnabled={showExploreFeed && !storyShareFact && !shareModalData && !showWelcome}
          onCloseForceOpen={() => setManualPwaOpen(false)}
          onOpenInstallGuide={() => setShowPwaGuideModal(true)}
          onDeferredPromptChange={handleDeferredPromptChange}
          onButtonPop={() => playPop(soundEnabled)}
        />

        <div
          className={
            showExploreFeed
              ? 'relative h-full min-h-0 w-full flex-1'
              : 'hidden'
          }
          aria-hidden={!showExploreFeed}
        >
          <TikTokFeed
            ref={feedRef}
            deckFacts={deckFacts}
            lang={lang}
            darkMode={memory.darkMode}
            soundEnabled={soundEnabled}
            activeCategory={activeCategory}
            favoriteIds={mergedSavedFactIds}
            streakDays={memory.streakDays}
            xp={memory.xp}
            cardsSinceLastQuiz={memory.cardsSinceLastQuiz}
            totalCardsViewed={Math.max(memory.totalSwipes, getTotalCardsViewed())}
            cookieBannerVisible={cookieBannerVisible}
            isExploreVisible={showExploreFeed}
            suppressUrlSync={suppressInitialFactSync}
            initialSlideIndex={exploreSlideIndex}
            onSelectCategory={handleSelectCategory}
            onChangeLang={handleChangeLang}
            onToggleDarkMode={handleToggleDarkMode}
            onToggleSound={handleToggleSound}
            onFlipCard={handleFlipCard}
            onBeforeSlideNavigate={dismissCardOverlays}
            onOpenDetail={(fact, resolvedGifUrl) => setActiveDetailCard({ fact, resolvedGifUrl })}
            onDoubleTapLike={handleDoubleTapLike}
            onDwellRead={handleDwellRead}
            onMarkFactSeen={(fact) => {
              setMemory((prev) => markFactIdSeen(prev, fact.id));
            }}
            onOpenDuelFromCard={handleOpenDuelFromCard}
            onOpenStoryShare={handleOpenStoryShare}
            onOpenShareVocab={(card) =>
              handleOpenStoryShare(
                vocabCardToFactCard(
                  card,
                  mergedVocabulary.length > 0 ? mergedVocabulary : getVocabularyFacts()
                )
              )
            }
            onGuessReward={handleGuessReward}
            onGuessLocked={handleGuessLocked}
            lockedFactIds={lockedFactIds}
            vocabularyCards={mergedVocabulary}
            onToggleFavorite={handleToggleFavorite}
            onOpenQuizHub={handleOpenQuizHub}
            onButtonPop={() => playPop(soundEnabled)}
            onSlideIndexChange={(idx) => {
              activeSlideIndexRef.current = idx;
              setExploreSlideIndex(idx);
              setMaxSwipedCards((prev) => Math.max(prev, idx));
              persistFeedSession(activeCategoryRef.current, deckFactsRef.current, idx);
            }}
            onActiveFactChange={setActiveFact}
            onActiveSlideChange={setActiveSlide}
            onEarnXp={(xpAmount) => {
              setMemory((prev) => addUserXp(prev, xpAmount, 'vocab'));
            }}
            onSuccessSound={() => playDing(soundEnabled)}
            onWrongSound={() => playWrong(soundEnabled)}
          />
        </div>

        {activeDetailCard && (
          <div
            data-testid="detail-modal-backdrop"
            className="absolute inset-0 z-50 flex h-full w-full flex-col bg-cik-bg outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
          >
            <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-cik-bg text-cik-text outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none">
              <FactDetailPage
                key={`fact-detail-${activeDetailCard.fact.id}`}
                fact={activeDetailCard.fact}
                lang={lang}
                darkMode={isDark}
                resolvedGifUrl={activeDetailCard.resolvedGifUrl}
                onClose={() => setActiveDetailCard(null)}
                onNextCard={() => {
                  setActiveDetailCard(null);
                  requestAnimationFrame(() => {
                    feedRef.current?.scrollToNext();
                  });
                }}
                onOpenDuel={(fact) => {
                  setActiveDetailCard(null);
                  handleOpenDuelFromCard(fact);
                }}
                onButtonPop={() => playPop(soundEnabled)}
                onEarnXp={(xpAmount) => {
                  setMemory((prev) => addUserXp(prev, xpAmount, 'detail'));
                }}
                onSuccessSound={() => playDing(soundEnabled)}
                onWrongSound={() => playWrong(soundEnabled)}
              />
            </div>
          </div>
        )}

        {(activeQuiz || quizLoading) && (
          <div
            data-testid="active-quiz-page"
            className="absolute inset-0 z-30 flex h-full w-full flex-col overflow-hidden bg-cik-bg text-cik-text px-3 pt-[calc(env(safe-area-inset-top,20px)+16px)] pb-[calc(env(safe-area-inset-bottom,16px)+92px)] lg:pt-6 lg:pb-6"
          >
            {activeQuiz ? (
              <MemoryQuizCard
                key={activeQuiz.key}
                questions={activeQuiz.questions}
                lang={lang}
                quizMode={activeQuiz.mode}
                duelConfig={activeQuiz.duelConfig}
                vocabularyPool={mergedVocabulary}
                onAnswerSound={(isCorrect) =>
                  isCorrect ? playDing(soundEnabled) : playWrong(soundEnabled)
                }
                onTickSound={(urgent) => playTick(soundEnabled, urgent)}
                onButtonPop={() => playPop(soundEnabled)}
                onComplete={handleQuizComplete}
                onSkip={() => {
                  vibrateTap(12);
                  playPop(soundEnabled);
                  setActiveQuiz(null);
                  setActiveTab(activeQuiz.mode === 'duel' ? 'duel' : 'quiz');
                  setMemory((prev) => {
                    const updated = { ...prev, cardsSinceLastQuiz: 0 };
                    saveUserMemory(updated);
                    return updated;
                  });
                }}
              />
            ) : (
              <StageLoadingSkeleton />
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && !activeQuiz && !quizLoading && (
          <LeaderboardModal
            open
            presentation="page"
            lang={lang}
            nickname={memory.nickname}
            userXp={memory.xp}
            weeklyXp={memory.weeklyXp}
            dailyBestScore={memory.dailyBestScore}
            streakDays={memory.streakDays}
            initialLeagueCode={incomingLeagueCode}
            onClearInitialLeagueCode={() => setIncomingLeagueCode(null)}
            onInviteDuel={() => {
              vibrateTap(12);
              playPop(soundEnabled);
              setIncomingDuel(null);
              setActiveTab('duel');
            }}
            onClose={closeOverlayToExplore}
          />
        )}

        {activeTab === 'quiz' && !activeQuiz && !quizLoading && (
          <QuizHubModal
            open
            presentation="page"
            lang={lang}
            dailyCompleted={dailyCompleted}
            dailyBestScore={memory.dailyBestScore}
            recentCount={memory.recentFiveIds.length}
            dailyGuessFact={dailyGuessFact}
            onDailyGuessReward={handleGuessReward}
            onSelectMode={handleStartQuizMode}
            onClose={closeOverlayToExplore}
            onButtonPop={() => playPop(soundEnabled)}
          />
        )}

        {activeTab === 'duel' && !activeQuiz && !quizLoading && (
          <DuelModal
            open
            presentation="page"
            lang={lang}
            defaultNickname={memory.nickname}
            playerId={memory.playerId}
            seedFact={seedFact}
            allFacts={allFacts}
            incomingDuel={incomingDuel}
            initialRoomCode={incomingRoomCode}
            onClearRoomCode={() => setIncomingRoomCode(null)}
            onStartDuel={handleStartDuel}
            onClose={closeOverlayToExplore}
            onButtonPop={() => playPop(soundEnabled)}
          />
        )}

        {activeTab === 'diploma' && !activeQuiz && !quizLoading && (
          <DiplomaProfileModal
            open
            presentation="page"
            notebookFocus={notebookFocus}
            lang={lang}
            memory={memory}
            allFacts={allFacts}
            onUpdateNickname={(nick) => setMemory((prev) => updateUserNickname(prev, nick))}
            onToggleNotifications={handleToggleNotifications}
            onSelectCategoryFromConstellation={(cat) => {
              handleSelectCategory(cat);
              setActiveTab('explore');
            }}
            onRemoveFavorite={(factId) => {
              const fact = allFacts.find((f) => f.id === factId);
              if (!fact) {
                setMemory((prev) => {
                  if (!prev.favoriteIds.includes(factId)) return prev;
                  const next = {
                    ...prev,
                    favoriteIds: prev.favoriteIds.filter((id) => id !== factId),
                  };
                  saveUserMemory(next);
                  return next;
                });
                return;
              }
              setMemory((prev) => {
                if (!prev.favoriteIds.includes(fact.id)) return prev;
                return toggleFavoriteFact(prev, fact.id, fact.category);
              });
            }}
            onResetMemory={handleResetMemory}
            onRequestPwaInstall={handleRequestPwaInstall}
            onClose={closeOverlayToExplore}
            onButtonPop={() => playPop(soundEnabled)}
            onCelebrateLeague={() => playLeagueCelebration(soundEnabled)}
          />
        )}

        {showPwaGuideModal ? (
        <PwaInstallGuideModal
          open
          lang={lang}
          darkMode={isDark}
          onClose={() => setShowPwaGuideModal(false)}
          onButtonPop={() => playPop(soundEnabled)}
        />
        ) : null}

        {storyShareFact && (
          <StoryShareModal
            open
            fact={storyShareFact}
            lang={lang}
            onClose={() => setStoryShareFact(null)}
            onButtonPop={() => playPop(soundEnabled)}
          />
        )}

        {shareModalData && (
          <ShareResultModal
            lang={lang}
            results={shareModalData.results}
            badgeCategory={shareModalData.badgeCategory}
            earnedXp={shareModalData.earnedXp}
            elapsedSec={shareModalData.elapsedSec}
            challengerNickname={memory.nickname}
            playerId={shareModalData.duelConfig?.myPlayerId || memory.playerId}
            questionIds={shareModalData.questionIds}
            questionSnapshots={shareModalData.questionSnapshots}
            duelConfig={shareModalData.duelConfig}
            quizMode={shareModalData.quizMode}
            quizDate={shareModalData.quizDate}
            onButtonPop={() => playPop(soundEnabled)}
            onClose={() => {
              setShareModalData(null);
              setActiveTab('explore');
            }}
          />
        )}

        {showExploreFeed && usingLocalFallback && (
          <div
            data-testid="local-fallback-notice"
            className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+96px)] z-20 flex justify-center px-4"
          >
            <span className="rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-bold text-white/85 backdrop-blur-md">
              {lang === 'tr'
                ? 'Çevrimdışı kart havuzu devrede'
                : 'Offline card pool active'}
            </span>
          </div>
        )}

        {/* Bottom dock: phone only (<768). md+ uses left rail. */}
        {!isExploreSubPageOpen && !showWelcome && (
          <div className="lg:hidden">
            <IosFloatingIslandDock
              activeTab={activeTab}
              lang={lang}
              darkMode={isDark}
              showQuizDot={showQuizDot}
              onSelectTab={handleDockSelectTab}
              chromeBlocked={chromeBlocked}
            />
          </div>
        )}
      </div>

        {showExploreFeed && (
          <>
            <DesktopFeedSideRail
              mode="actions"
              lang={lang}
              darkMode={isDark}
              activeFact={activeFact}
              activeSlide={activeSlide}
              isGuessLocked={activeFact ? Boolean(lockedFactIds[activeFact.id]) : false}
              isLiked={activeSlideLiked}
              isSaved={isCurrentSlideSaved}
              likesCount={activeSlideLikesCount}
              onLike={() => {
                if (activeFact) {
                  window.dispatchEvent(
                    new CustomEvent('scrolly-card-action', {
                      detail: { factId: activeFact.id, action: 'like' },
                    })
                  );
                  return;
                }
                if (activeSlide?.type === 'vocabulary') {
                  window.dispatchEvent(
                    new CustomEvent('scrolly-card-action', {
                      detail: { vocabId: activeSlide.card.id, action: 'like' },
                    })
                  );
                }
              }}
              onSave={() => {
                if (activeFact) {
                  window.dispatchEvent(
                    new CustomEvent('scrolly-card-action', {
                      detail: { factId: activeFact.id, action: 'save' },
                    })
                  );
                  return;
                }
                if (activeSlide?.type === 'vocabulary') {
                  vibrateDoubleTap(12);
                  playPopDing(soundEnabled);
                  const { saved } = toggleSaveVocabularyCard(activeSlide.card);
                  void trackEvent(
                    activeSlide.card.id,
                    'vocabulary',
                    saved ? 'save' : 'unsave',
                    {
                      item_type: 'vocabulary',
                      word: activeSlide.card.word,
                    }
                  );
                  setSavedVocabWords(
                    loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase())
                  );
                  showToast(
                    saved
                      ? lang === 'tr'
                        ? 'Kelime defterine eklendi'
                        : 'Saved to Word Notebook'
                      : lang === 'tr'
                        ? 'Kelime defterinden çıkarıldı'
                        : 'Removed from Word Notebook'
                  );
                  if (saved && !guestSaveNudgeShownRef.current) {
                    guestSaveNudgeShownRef.current = true;
                    triggerGuestAuthNudge('save');
                  }
                }
              }}
              onDetail={() => {
                if (activeFact) {
                  setActiveDetailCard({ fact: activeFact, resolvedGifUrl: activeFact.gifUrl ?? null });
                  return;
                }
                if (activeSlide?.type === 'vocabulary') {
                  window.dispatchEvent(
                    new CustomEvent('scrolly-card-action', {
                      detail: { vocabId: activeSlide.card.id, action: 'detail' },
                    })
                  );
                }
              }}
              onShare={() => {
                if (activeFact) {
                  setStoryShareFact(activeFact);
                  return;
                }
                if (activeSlide?.type === 'vocabulary') {
                  window.dispatchEvent(
                    new CustomEvent('scrolly-card-action', {
                      detail: { vocabId: activeSlide.card.id, action: 'share' },
                    })
                  );
                }
              }}
              onPrev={() => {
                vibrateTap(10);
                dismissCardOverlays();
                feedRef.current?.scrollToPrev();
              }}
              onNext={() => {
                vibrateTap(10);
                dismissCardOverlays();
                feedRef.current?.scrollToNext();
              }}
            />
            <div
              data-testid="desktop-insight-column"
              className="my-0 mt-0 mb-0 hidden h-[min(86vh,760px)] max-h-[min(86vh,760px)] min-h-0 w-[300px] shrink-0 items-stretch self-stretch lg:flex lg:h-[min(86vh,760px)] lg:max-h-[min(86vh,760px)] lg:rounded-[28px] xl:w-[320px]"
            >
              <DesktopFeedSideRail
                mode="insight"
                lang={lang}
                darkMode={isDark}
                activeFact={activeFact}
                activeSlide={activeSlide}
                isGuessLocked={activeFact ? Boolean(lockedFactIds[activeFact.id]) : false}
                isLiked={activeSlideLiked}
                isSaved={isCurrentSlideSaved}
                likesCount={activeSlideLikesCount}
                onPrev={() => {
                  vibrateTap(10);
                  dismissCardOverlays();
                  feedRef.current?.scrollToPrev();
                }}
                onNext={() => {
                  vibrateTap(10);
                  dismissCardOverlays();
                  feedRef.current?.scrollToNext();
                }}
              />
            </div>
          </>
        )}
        </div>
      </main>
      </div>

      {/* Rendered directly under desktop shell so lg:right-6 lg:bottom-6 docks outside the centered stage */}
      <CookieBanner
        lang={lang}
        visible={cookieBannerVisible}
        onAccept={() => {
          vibrateTap(12);
          playPop(soundEnabled);
          applyGoogleConsentChoice('granted');
          setMemory((prev) => {
            const updated = { ...prev, cookieAccepted: true };
            saveUserMemory(updated);
            return updated;
          });
        }}
        onDecline={() => {
          vibrateTap(12);
          playPop(soundEnabled);
          applyGoogleConsentChoice('denied');
          setMemory((prev) => {
            const updated = { ...prev, cookieAccepted: true };
            saveUserMemory(updated);
            return updated;
          });
        }}
        onDismiss={() => {
          vibrateTap(10);
          playPop(soundEnabled);
          setMemory((prev) => {
            const updated = { ...prev, cookieAccepted: true };
            saveUserMemory(updated);
            return updated;
          });
        }}
      />
      {(authPromptOpen || authNudgeOpen) ? (
      <LazyAuthPrompt
        open={authPromptOpen}
        nudgeOpen={
          authNudgeOpen &&
          !authUser &&
          !showWelcome &&
          !activeQuiz &&
          (activeTab === 'leaderboard' || activeTab === 'diploma')
        }
        nudgePlacement={activeTab === 'diploma' || activeTab === 'leaderboard' ? 'page-top' : 'hidden'}
        trigger={authTrigger}
        lang={lang}
        darkMode={isDark}
        currentXp={memory.xp}
        onCloseModal={() => setAuthPromptOpen(false)}
        onDismissNudge={() => {
          persistAuthNudgeDismissed();
          setAuthNudgeOpen(false);
        }}
        onOpenModalFromNudge={() => {
          setAuthNudgeOpen(false);
          setAuthPromptOpen(true);
        }}
        onAuthenticated={(user, mode, options) => {
          let freshDeviceId: string | undefined;
          if (options?.resetDeviceId) {
            const reset = resetTelemetryClientState();
            freshDeviceId = reset.deviceId;
            void import('@/utils/duelLobby').then(({ clearScrollaPlayerId, getOrCreateScrollaPlayerId }) => {
              clearScrollaPlayerId();
              getOrCreateScrollaPlayerId(reset.deviceId);
            });
          }
          skipNextProfileSyncRef.current = true;
          setAuthUser(user);
          setMemory((prev) =>
            hydrateLocalMemoryFromAuthUser(prev, user, mode ?? 'keep_existing', {
              ...(freshDeviceId ? { freshDeviceId } : {}),
            })
          );
          setSavedIds(loadSavedFactIds());
          setSavedVocabWords(loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase()));
          setLockedFactIds({});
          setLikedRevision((prev) => prev + 1);
          setAuthPromptOpen(false);
          setAuthNudgeOpen(false);
          showToast(
            lang === 'tr'
              ? `Hesap bağlandı · ${user.xp.toLocaleString()} XP senkronize edildi`
              : `Account linked · ${user.xp.toLocaleString()} XP synced`
          );
        }}
      />
      ) : null}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            data-testid="feed-action-toast"
            className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,16px)+92px)] lg:bottom-8 lg:top-auto left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-cik-line bg-cik-bg-elevated/95 px-4 py-2 text-xs font-extrabold text-cik-text shadow-e3 backdrop-blur-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
