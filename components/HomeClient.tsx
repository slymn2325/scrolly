'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import DiplomaProfileModal from '@/components/DiplomaProfileModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import FactDetailPage from '@/components/FactDetailPage';
import { applyGoogleConsentChoice } from '@/utils/consent';
import DuelModal, { type DuelChallengeConfig } from '@/components/DuelModal';
import DesktopFeedSideRail from '@/components/DesktopFeedSideRail';
import DesktopLeftNav from '@/components/DesktopLeftNav';
import IosFloatingIslandDock, { type DockTabId } from '@/components/IosFloatingIslandDock';
import LeaderboardModal from '@/components/LeaderboardModal';
import WelcomeExploreModal, {
  clearWelcomeDismissed,
  persistWelcomeDismissed,
  readWelcomeDismissed,
} from '@/components/WelcomeExploreModal';
import MemoryQuizCard, { type ActiveQuizMode } from '@/components/MemoryQuizCard';
import OfflineManager from '@/components/OfflineManager';
import PwaInstallGuideModal from '@/components/PwaInstallGuideModal';
import PwaInstallPrompt, {
  checkIsStandalone,
  clearPwaDismissed,
  type BeforeInstallPromptEvent,
} from '@/components/PwaInstallPrompt';
import QuizHubModal, { type QuizModeChoice } from '@/components/QuizHubModal';
import ShareResultModal from '@/components/ShareResultModal';
import StoryShareModal from '@/components/StoryShareModal';
import TikTokFeed, { type FeedSlideItem, type TikTokFeedHandle } from '@/components/TikTokFeed';
import { DIAGRAM_INTERACTED_STORAGE_KEY } from '@/components/InteractiveSketchArt';
import {
  translations,
  type CategoryFilter,
  type CategoryId,
  type Language,
} from '@/i18n/translations';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import type { VocabularyCard } from '@/types/vocabulary';
import { isShortRoomCode, normalizeRoomCode } from '@/lib/duelStore';
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
import { decodeDuelPayload, type DuelPayload } from '@/utils/duelCodec';
import {
  clearScrollaPlayerId,
  completeScrollaRoom,
  getOrCreateScrollaPlayerId,
  resolveFactsByIds,
  vocabCardToFactCard,
} from '@/utils/duelLobby';
import { clearLikedFacts, isFactLiked } from '@/utils/likedFacts';
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
import {
  fisherYatesShuffle,
  generateMemoryQuizFromRecent,
  type QuizQuestionItem,
} from '@/utils/recommendation';
import {
  buildSeenLookup,
  clearSeenSlugsStorage,
  getFactSeenTimestamp,
  isFactSeen,
} from '@/utils/seenFacts';
import {
  getDailySeedKey,
  getWeeklySeedKey,
  pickSeededFacts,
} from '@/utils/seededRandom';
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
import { submitQuizScoreToLeaderboard } from '@/utils/supabaseLeaderboard';
import {
  addUserXp,
  boostCategoryWeight,
  completeMemoryQuiz,
  getDefaultUserState,
  getLeagueInfo,
  getTodayDateString,
  getTopCategory,
  getTotalCardsViewed,
  loadUserMemory,
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

interface ActiveQuizSession {
  key: string;
  mode: ActiveQuizMode;
  questions: QuizQuestionItem[];
  duelConfig?: DuelChallengeConfig | null;
}

interface HomeClientProps {
  initialFacts: FactCardType[];
  initialVocabulary?: VocabularyCard[];
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

function syncDocumentTheme(darkMode: boolean, lang: Language) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', darkMode);
  document.documentElement.lang = lang === 'en' ? 'en' : 'tr';
  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = darkMode || checkIsStandalone() ? '#0A0A0E' : '#FAF9F5';
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
  targetSlug: string | null
): FactCardType[] {
  if (!targetSlug) return deck;
  const match = pool.find(
    (f) => f.slug === targetSlug || f.tr.slug === targetSlug || f.en.slug === targetSlug || f.id === targetSlug
  );
  if (!match) return deck;
  return [match, ...deck.filter((f) => f.id !== match.id)];
}

export default function HomeClient({ initialFacts, initialVocabulary }: HomeClientProps) {
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

  const [memory, setMemory] = useState<UserMemoryState>(() => getDefaultUserState('tr'));
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
  const [chromeBlocked, setChromeBlocked] = useState(false);
  const [suppressInitialFactSync, setSuppressInitialFactSync] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [incomingDuel, setIncomingDuel] = useState<DuelPayload | null>(null);
  const [incomingRoomCode, setIncomingRoomCode] = useState<string | null>(null);
  const [storyShareFact, setStoryShareFact] = useState<FactCardType | null>(null);
  const [detailState, setDetailState] = useState<{
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
    duelConfig?: DuelChallengeConfig | null;
  } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [ambientAccent, setAmbientAccent] = useState('#818CF8');

  useEffect(() => {
    const onChromeBlock = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChromeBlocked(Boolean(detail?.open));
    };
    window.addEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
    return () => window.removeEventListener('scrolly-chrome-block', onChromeBlock as EventListener);
  }, []);

  // Resolve local state + ?tab= / ?fact= synchronously before first paint to prevent initial card/tab flash and stray dwell XP
  useIsomorphicLayoutEffect(() => {
    const loaded = loadUserMemory();
    setMemory(loaded);
    const seededSaved = seedSavedFactsIfUnset(loaded.favoriteIds);
    setSavedIds(seededSaved.length > 0 ? seededSaved : loadSavedFactIds());
    setSavedVocabWords(loadSavedVocabNotebook().map((entry) => entry.word.toLowerCase()));
    hasHydratedRef.current = true;
    syncDocumentTheme(loaded.darkMode, loaded.lang);

    let requestedFactSlug: string | null = null;
    let duelParam: string | null = null;
    let openQuizParam: string | null = null;
    let resolvedTab: DockTabId | null = null;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      requestedFactSlug = searchParams.get('fact');
      duelParam = searchParams.get('duel');
      openQuizParam = searchParams.get('openQuiz');
      const rawTab = searchParams.get('tab')?.toLowerCase() ?? null;
      if (rawTab === 'quiz') resolvedTab = 'quiz';
      else if (rawTab === 'leaderboard') resolvedTab = 'leaderboard';
      else if (rawTab === 'duel') resolvedTab = 'duel';
      else if (rawTab === 'profile' || rawTab === 'diploma') resolvedTab = 'diploma';

      requestedFactSlugRef.current = requestedFactSlug;

      if (resolvedTab) {
        setActiveTab(resolvedTab);
        setShowWelcome(false);
      } else if (!readWelcomeDismissed() && !duelParam && openQuizParam !== 'daily') {
        setShowWelcome(true);
      }
    }

    const restoredSession =
      !duelParam && openQuizParam !== 'daily' && !requestedFactSlug && !resolvedTab
        ? readFeedSession()
        : null;

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
      const baseDeck = buildPersonalizedDeck(
        initialFacts,
        'all',
        loaded.seenIds,
        loaded.categoryWeights,
        !requestedFactSlug
      );
      const initialDeck = promoteFactToFront(baseDeck, initialFacts, requestedFactSlug);
      activeSlideIndexRef.current = 0;
      setExploreSlideIndex(0);
      setDeckFacts(initialDeck);
      if (initialDeck[0]) {
        setSeedFact(initialDeck[0]);
        setActiveFact(initialDeck[0]);
      }
    }

    const matchedInInitial = hasFactSlugMatch(initialFacts, requestedFactSlug);
    if (requestedFactSlug && !matchedInInitial && !resolvedTab && !duelParam && openQuizParam !== 'daily') {
      setSuppressInitialFactSync(true);
    } else {
      setSuppressInitialFactSync(false);
    }
  }, [initialFacts]);

  useEffect(() => {
    initTelemetrySync();

    let duelParam: string | null = null;
    let openQuizParam: string | null = null;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      duelParam = searchParams.get('duel');
      openQuizParam = searchParams.get('openQuiz');
    }

    let cancelled = false;

    const applyFactBatch = (incoming: FactCardType[]) => {
      if (cancelled || incoming.length === 0) return;
      const merged = mergeFactsById(allFactsRef.current, incoming);
      allFactsRef.current = merged;
      setAllFacts(merged);

      const currentMem = loadUserMemory();
      const targetSlug =
        activeCategoryRef.current === 'all' ? requestedFactSlugRef.current : null;

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
        // User has already swiped down — preserve cards up to activeSlideIndexRef and rebuild unseen tail
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

      const updatedDeck = promoteFactToFront(baseLiveDeck, merged, targetSlug);
      setDeckFacts(updatedDeck);
      persistFeedSession(category, updatedDeck, 0);
      if (updatedDeck[0]) {
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

      const PAGE_SIZE = 200;
      const MAX_PAGES = 20;
      let workingPool: FactCardType[] | undefined;
      let loadedAnyPage = false;

      for (let page = 0; page < MAX_PAGES && !cancelled; page += 1) {
        const offset = page * PAGE_SIZE;
        const pageRes = await fetchPaginatedFactsFromApi({ offset, limit: PAGE_SIZE });
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

      if (duelParam) {
        if (isShortRoomCode(duelParam)) {
          setIncomingRoomCode(normalizeRoomCode(duelParam));
          setIncomingDuel(null);
          setActiveQuiz(null);
          setActiveTab('duel');
          setShowWelcome(false);
        } else {
          const decoded = decodeDuelPayload(duelParam);
          if (decoded && decoded.cardIds.length > 0) {
            // Legacy base64 duel URL fallback — still opens lobby without auto-starting
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
        }
      } else if (openQuizParam === 'daily') {
        const dailyFacts = pickSeededFacts(activePool, 5, getDailySeedKey());
        setActiveQuiz({
          key: `daily-url-${Date.now()}`,
          mode: 'daily',
          questions: dailyFacts.map((fact) => ({ fact })),
        });
        setActiveTab('quiz');
      }
    };

    const hydrateRemoteProfile = async () => {
      try {
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

    window.addEventListener('scrolly-liked-facts-updated', bumpLikes);
    window.addEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
    window.addEventListener('scrolly-vocab-updated', syncVocab);
    window.addEventListener('scrolly-toast', onScrollyToast as EventListener);
    return () => {
      window.removeEventListener('scrolly-liked-facts-updated', bumpLikes);
      window.removeEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
      window.removeEventListener('scrolly-vocab-updated', syncVocab);
      window.removeEventListener('scrolly-toast', onScrollyToast as EventListener);
    };
  }, [showToast]);

  useEffect(() => {
    if (!hasHydratedRef.current || !profileHydratedRef.current) return;
    if (skipNextProfileSyncRef.current) {
      skipNextProfileSyncRef.current = false;
      return;
    }

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
    seedFact,
  ]);

  useEffect(() => {
    syncDocumentTheme(memory.darkMode, memory.lang);
  }, [memory.darkMode, memory.lang]);

  const lang: Language = memory.lang;
  const soundEnabled = memory.soundEnabled;
  const topCategory = getTopCategory(memory.categoryWeights);
  const dailyCompleted =
    Boolean(memory.lastDailyQuizDate) && memory.lastDailyQuizDate === getTodayDateString();
  const showQuizDot = memory.cardsSinceLastQuiz >= 5 || !dailyCompleted;

  const handleChangeLang = (nextLang: Language) => {
    vibrateTap(12);
    playPop(soundEnabled);
    setMemory((prev) => {
      const updated = { ...prev, lang: nextLang };
      saveUserMemory(updated);
      return updated;
    });
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

  const handleSelectCategory = (cat: CategoryFilter) => {
    vibrateTap(12);
    playPop(soundEnabled);
    setDetailState(null);
    setShowPwaGuideModal(false);
    restoredFeedSessionRef.current = null;
    activeCategoryRef.current = cat;
    activeSlideIndexRef.current = 0;
    setExploreSlideIndex(0);
    setActiveCategory(cat);

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
    if (newDeck[0]) setSeedFact(newDeck[0]);

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
            if (refreshed[0]) setSeedFact(refreshed[0]);
          }
        });
      }
    }

    feedRef.current?.scrollToTop();
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
      // Like feedback only — never auto-save / favorite. Liked IDs live in likedFacts localStorage.
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
    },
    [soundEnabled, lang, showToast]
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

    const pool = allFactsRef.current;
    if (choice === 'daily') {
      const dailyFacts = pickSeededFacts(pool, 5, getDailySeedKey());
      setActiveQuiz({
        key: `daily-${Date.now()}`,
        mode: 'daily',
        questions: dailyFacts.map((fact) => ({ fact })),
      });
      return;
    }

    if (choice === 'weekly') {
      const weeklyFacts = pickSeededFacts(pool, 10, getWeeklySeedKey());
      setActiveQuiz({
        key: `weekly-${Date.now()}`,
        mode: 'weekly',
        questions: weeklyFacts.map((fact) => ({ fact })),
      });
      return;
    }

    if (choice === 'vocabulary') {
      const vocabPool = mergedVocabulary.length > 0 ? mergedVocabulary : getVocabularyFacts();
      const pickedVocab = pickSeededFacts(
        vocabPool,
        5,
        `${getDailySeedKey()}-vocab-${Date.now()}`
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

    const memQuestions = generateMemoryQuizFromRecent(
      memory.recentFiveIds,
      pool,
      seedFact
    );
    setActiveQuiz({
      key: `memory-${Date.now()}`,
      mode: 'memory',
      questions: memQuestions,
    });
  };

  const handleStartDuel = (config: DuelChallengeConfig) => {
    vibrateTap(12);
    const activePool = allFactsRef.current;
    const questionCount = Math.max(1, config.questionCount || config.factIds.length || 5);
    let duelFacts = resolveFactsByIds(activePool, config.factIds);
    if (duelFacts.length < questionCount) {
      for (const candidate of activePool) {
        if (!duelFacts.some((f) => f.id === candidate.id)) duelFacts.push(candidate);
        if (duelFacts.length >= questionCount) break;
      }
    }
    duelFacts = duelFacts.slice(0, questionCount);

    setIncomingDuel(null);
    setActiveTab('duel');
    setActiveQuiz({
      key: `duel-${config.duelId || Date.now()}`,
      mode: 'duel',
      questions: duelFacts.map((fact) => ({ fact })),
      duelConfig: config,
    });
  };

  const handleQuizComplete = (
    results: boolean[],
    sourceCategories: string[],
    earnedXp: number,
    elapsedSec: number,
    usedQuestionIds: string[]
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

    const oldTier = getLeagueInfo(memory.xp, lang).id;
    const totalBonusXp = earnedXp + (isDuelWin ? 150 : 0);
    const updated = completeMemoryQuiz(
      memory,
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

    submitQuizScoreToLeaderboard({
      playerId: updated.playerId,
      nickname: updated.nickname,
      quizMode: storageQuizMode,
      score: totalBonusXp,
      durationSec: elapsedSec,
      correctCount: results.filter(Boolean).length,
      questionCount: results.length,
    });

    const duelPlayerId = duelConfig?.myPlayerId || updated.playerId;
    if (isRealServerDuel && duelConfig?.duelId) {
      void completeScrollaRoom(duelConfig.duelId, duelPlayerId, totalBonusXp, {
        elapsedSec,
        answers: results,
      });
    }

    setActiveQuiz(null);
    setShareModalData({
      results,
      badgeCategory: bestQuizCategory,
      earnedXp: totalBonusXp,
      elapsedSec,
      questionIds: usedQuestionIds,
      duelConfig,
    });
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
      detailState || storyShareFact || shareModalData || showPwaGuideModal
    );
    setDetailState(null);
    setShowPwaGuideModal(false);
    setStoryShareFact(null);
    setShareModalData(null);

    if (tab === 'explore') {
      const alreadyExploring = activeTab === 'explore' && !activeQuiz && !hadSubPage;
      setActiveQuiz(null);
      setIncomingDuel(null);
      setActiveTab('explore');
      if (alreadyExploring) {
        refreshExploreDeck(true);
      }
      return;
    }

    if (tab !== 'duel') setIncomingDuel(null);
    if (tab !== 'quiz' && tab !== 'duel') setActiveQuiz(null);
    if (tab === 'quiz') setActiveQuiz(null);
    setActiveTab(tab);
  };

  const closeOverlayToExplore = () => {
    vibrateTap(12);
    playPop(soundEnabled);
    setDetailState(null);
    setShowPwaGuideModal(false);
    setStoryShareFact(null);
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
    clearScrollaPlayerId();
    try {
      window.localStorage.removeItem(DIAGRAM_INTERACTED_STORAGE_KEY);
    } catch {
      // Ignore private-mode storage failures
    }
    const { previousDeviceId } = resetTelemetryClientState();

    const fresh = resetUserMemory();
    // Keep Scrolla / duel identity aligned with the fresh player id.
    getOrCreateScrollaPlayerId(fresh.playerId);

    setMemory(fresh);
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
    setDetailState(null);
    setManualPwaOpen(false);
    setShowPwaGuideModal(false);
    setShowWelcome(true);
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
      streak: 1,
      lastVisitDate: fresh.lastVisitDate,
      seenIds: [] as string[],
      favoriteIds: [] as string[],
      categoryWeights: fresh.categoryWeights,
      categoryAccuracy: fresh.categoryAccuracy,
      badges: [] as string[],
    };

    // Zero the previous device profile (if any), then persist the fresh anonymous id.
    if (previousDeviceId && previousDeviceId !== 'server') {
      void fetch('/api/profile', {
        method: 'POST',
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

  const isExploreSubPageOpen = Boolean(
    detailState || storyShareFact || shareModalData || showPwaGuideModal
  );
  const cookieBannerVisible =
    !memory.cookieAccepted &&
    activeTab === 'explore' &&
    !activeQuiz &&
    !showWelcome &&
    !isExploreSubPageOpen &&
    !chromeBlocked;
  const showExploreFeed = activeTab === 'explore' && !activeQuiz && !isExploreSubPageOpen;

  // Keep URL query params cleanly synchronized with active tab state
  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') return;
    try {
      const currentUrl = new URL(window.location.href);
      let changed = false;

      if (activeTab !== 'explore' || activeQuiz) {
        const targetTabParam =
          activeTab === 'diploma'
            ? 'profile'
            : activeTab === 'explore' && activeQuiz
              ? 'quiz'
              : activeTab;
        if (currentUrl.searchParams.has('fact')) {
          currentUrl.searchParams.delete('fact');
          changed = true;
        }
        if (currentUrl.searchParams.get('tab') !== targetTabParam) {
          currentUrl.searchParams.set('tab', targetTabParam);
          changed = true;
        }
      } else if (currentUrl.searchParams.has('tab')) {
        currentUrl.searchParams.delete('tab');
        changed = true;
      }

      if (changed) {
        window.history.replaceState(
          window.history.state,
          '',
          `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
        );
      }
    } catch {
      // Ignore history API errors in restricted webviews
    }
  }, [activeTab, activeQuiz]);

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
    const staticVocab = getVocabularyFacts();
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
  }, [dbVocabulary]);
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
  const activeFactLiked = activeFact ? (likedRevision >= 0 && isFactLiked(activeFact.id)) : false;
  const activeFactLikesCount = activeFact
    ? typeof activeFact.likesCount === 'number'
      ? Math.max(0, activeFact.likesCount) + (activeFactLiked ? 1 : 0)
      : (() => {
          let sum = 120;
          for (let i = 0; i < activeFact.id.length; i += 1) {
            sum += activeFact.id.charCodeAt(i) * 19;
          }
          return 400 + (sum % 890) + (activeFactLiked ? 1 : 0);
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
        className={`relative flex h-[100dvh] w-screen overflow-hidden select-none ${
          isDark ? 'bg-[#0A0A0E] text-white' : 'bg-[#E8E6F0] text-[#1E1B2E]'
        }`}
      >
        <WelcomeExploreModal
          open={showWelcome}
          lang={lang}
          initialNickname={memory.nickname}
          onStart={(chosenNickname) => {
            persistWelcomeDismissed();
            if (chosenNickname && chosenNickname.trim()) {
              setMemory((prev) => updateUserNickname(prev, chosenNickname));
            }
            setShowWelcome(false);
            vibrateTap(12);
            playPop(soundEnabled);
          }}
        />

      {/* TikTok-style left rail (desktop only) */}
      <DesktopLeftNav
        activeTab={activeTab}
        lang={lang}
        darkMode={isDark}
        showQuizDot={showQuizDot}
        xp={memory.xp}
        streakDays={memory.streakDays}
        onSelectTab={handleDockSelectTab}
      />

      {/* Main feed region — ambient fills gutters behind the stage */}
      <div
        data-testid="reels-main-region"
        className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch justify-center"
      >
        {/* Blurred ambient card-color fill (letterbox feel, not empty void) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden transition-[background] duration-500 lg:block"
          style={{
            background: isDark
              ? `radial-gradient(ellipse 70% 95% at 48% 50%, ${ambientAccent}66 0%, ${ambientAccent}22 38%, #0A0A0E 72%)`
              : `radial-gradient(ellipse 70% 95% at 48% 50%, ${ambientAccent}55 0%, ${ambientAccent}28 42%, #E8E6F0 78%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-50 transition-[background] duration-500 lg:block"
          style={{
            background: `linear-gradient(180deg, ${ambientAccent}40 0%, transparent 45%, ${ambientAccent}28 100%)`,
          }}
        />

        {/* Stage + attached desktop vertical actions + up/down rail + xl info panel */}
        <div
          data-testid="reels-stage-row"
          className="relative z-10 flex h-full w-full max-w-none items-stretch justify-center lg:h-[100dvh] lg:w-auto lg:max-w-none lg:items-center lg:gap-5"
        >
        {/* Immersive vertical stage: full-bleed on mobile/tablet; proportional 88dvh showcase on desktop */}
        <div
          data-testid="reels-phone-frame"
          className={`relative z-10 mx-auto flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden lg:mx-0 lg:my-auto lg:h-[88dvh] lg:flex-none lg:rounded-[28px] lg:border lg:border-white/15 lg:shadow-[0_24px_90px_-12px_rgba(0,0,0,0.72)] ${
            showExploreFeed
              ? 'lg:w-[min(480px,46vw)] lg:max-w-[500px] xl:w-[min(500px,38vw)] xl:max-w-[520px]'
              : 'lg:w-[min(600px,54vw)] lg:max-w-[620px]'
          } ${
            isDark ? 'bg-[#0A0A0E] text-white' : 'bg-[#F7F5FB] text-[#1E1B2E]'
          }`}
        >
        <OfflineManager lang={lang} />

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
              ? 'relative h-full w-full'
              : 'pointer-events-none invisible absolute inset-0 h-full w-full'
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
            onOpenDetail={(fact, resolvedGifUrl) => setDetailState({ fact, resolvedGifUrl })}
            onDoubleTapLike={handleDoubleTapLike}
            onDwellRead={handleDwellRead}
            onMarkFactSeen={(fact) => {
              setMemory((prev) => markFactIdSeen(prev, fact.id));
            }}
            onOpenDuelFromCard={handleOpenDuelFromCard}
            onOpenStoryShare={handleOpenStoryShare}
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
              setMemory((prev) => addUserXp(prev, xpAmount));
            }}
            onSuccessSound={() => playDing(soundEnabled)}
            onWrongSound={() => playWrong(soundEnabled)}
          />
        </div>

        <AnimatePresence>
          {detailState && (
            <FactDetailPage
              key={`fact-detail-${detailState.fact.id}`}
              fact={detailState.fact}
              lang={lang}
              darkMode={isDark}
              resolvedGifUrl={detailState.resolvedGifUrl}
              onClose={() => setDetailState(null)}
              onNextCard={() => {
                setDetailState(null);
                requestAnimationFrame(() => {
                  feedRef.current?.scrollToNext();
                });
              }}
              onOpenDuel={(fact) => {
                setDetailState(null);
                handleOpenDuelFromCard(fact);
              }}
              onButtonPop={() => playPop(soundEnabled)}
              onEarnXp={(xpAmount) => {
                setMemory((prev) => addUserXp(prev, xpAmount));
              }}
              onSuccessSound={() => playDing(soundEnabled)}
              onWrongSound={() => playWrong(soundEnabled)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeQuiz && (
            <div
              data-testid="active-quiz-page"
              className="absolute inset-0 z-30 flex h-full w-full flex-col overflow-y-auto bg-[#FFFDF9] px-3 pt-[calc(env(safe-area-inset-top,20px)+16px)] pb-[calc(env(safe-area-inset-bottom,16px)+100px)] dark:bg-[#171228] lg:pt-6 lg:pb-6"
            >
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
            </div>
          )}
        </AnimatePresence>

        <LeaderboardModal
          open={activeTab === 'leaderboard' && !activeQuiz}
          presentation="page"
          lang={lang}
          nickname={memory.nickname}
          userXp={memory.xp}
          weeklyXp={memory.weeklyXp}
          dailyBestScore={memory.dailyBestScore}
          streakDays={memory.streakDays}
          onInviteDuel={() => {
            vibrateTap(12);
            playPop(soundEnabled);
            setIncomingDuel(null);
            setActiveTab('duel');
          }}
          onClose={closeOverlayToExplore}
        />

        <QuizHubModal
          open={activeTab === 'quiz' && !activeQuiz}
          presentation="page"
          lang={lang}
          dailyCompleted={dailyCompleted}
          dailyBestScore={memory.dailyBestScore}
          recentCount={memory.recentFiveIds.length}
          onSelectMode={handleStartQuizMode}
          onClose={closeOverlayToExplore}
          onButtonPop={() => playPop(soundEnabled)}
          onOpenScrolla={() => {
            vibrateTap(12);
            playPop(soundEnabled);
            setActiveQuiz(null);
            setIncomingDuel(null);
            setIncomingRoomCode(null);
            setActiveTab('duel');
          }}
        />

        <DuelModal
          open={activeTab === 'duel' && !activeQuiz}
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

        <DiplomaProfileModal
          open={activeTab === 'diploma' && !activeQuiz}
          presentation="page"
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

        <PwaInstallGuideModal
          open={showPwaGuideModal}
          lang={lang}
          darkMode={isDark}
          onClose={() => setShowPwaGuideModal(false)}
          onButtonPop={() => playPop(soundEnabled)}
        />

        <StoryShareModal
          open={Boolean(storyShareFact)}
          fact={storyShareFact}
          lang={lang}
          onClose={() => setStoryShareFact(null)}
          onButtonPop={() => playPop(soundEnabled)}
        />

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
            duelConfig={shareModalData.duelConfig}
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

        {/* Bottom dock: mobile + tablet only (desktop uses left nav). Hide on full-page sub-views */}
        {!isExploreSubPageOpen && !showWelcome && !chromeBlocked && (
          <div className="lg:hidden">
            <IosFloatingIslandDock
              activeTab={activeTab}
              lang={lang}
              darkMode={isDark}
              showQuizDot={showQuizDot}
              onSelectTab={handleDockSelectTab}
              chromeBlocked={chromeBlocked || showWelcome}
            />
          </div>
        )}
      </div>

        {showExploreFeed && (
          <DesktopFeedSideRail
            lang={lang}
            darkMode={isDark}
            activeFact={activeFact}
            activeSlide={activeSlide}
            isGuessLocked={activeFact ? Boolean(lockedFactIds[activeFact.id]) : false}
            isLiked={activeFactLiked}
            isSaved={isCurrentSlideSaved}
            likesCount={activeFactLikesCount}
            onLike={() => {
              if (!activeFact) return;
              window.dispatchEvent(
                new CustomEvent('scrolly-card-action', {
                  detail: { factId: activeFact.id, action: 'like' },
                })
              );
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
              }
            }}
            onDetail={() => {
              if (activeFact) {
                window.dispatchEvent(
                  new CustomEvent('scrolly-card-action', {
                    detail: { factId: activeFact.id, action: 'detail' },
                  })
                );
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
            onDuel={() => {
              if (activeFact) {
                window.dispatchEvent(
                  new CustomEvent('scrolly-card-action', {
                    detail: { factId: activeFact.id, action: 'duel' },
                  })
                );
                return;
              }
              if (seedFact) {
                handleOpenDuelFromCard(seedFact);
              }
            }}
            onShare={() => {
              if (!activeFact) return;
              window.dispatchEvent(
                new CustomEvent('scrolly-card-action', {
                  detail: { factId: activeFact.id, action: 'share' },
                })
              );
            }}
            onPrev={() => {
              vibrateTap(10);
              feedRef.current?.scrollToPrev();
            }}
            onNext={() => {
              vibrateTap(10);
              feedRef.current?.scrollToNext();
            }}
          />
        )}
        </div>
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
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            data-testid="feed-action-toast"
            className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top,14px)+56px)] z-[95] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-[#0A0A0E]/90 px-4 py-2 text-xs font-extrabold text-white shadow-xl backdrop-blur-md dark:border-amber-300/30 dark:bg-[#171326]/95"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
