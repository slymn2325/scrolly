'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import DiplomaProfileModal from '@/components/DiplomaProfileModal';
import { applyGoogleConsentChoice } from '@/utils/consent';
import DuelModal, { type DuelChallengeConfig } from '@/components/DuelModal';
import DesktopFeedSideRail from '@/components/DesktopFeedSideRail';
import DesktopLeftNav from '@/components/DesktopLeftNav';
import IosFloatingIslandDock, { type DockTabId } from '@/components/IosFloatingIslandDock';
import LeaderboardModal from '@/components/LeaderboardModal';
import WelcomeExploreModal, {
  persistWelcomeDismissed,
  readWelcomeDismissed,
} from '@/components/WelcomeExploreModal';
import MemoryQuizCard, { type ActiveQuizMode } from '@/components/MemoryQuizCard';
import OfflineManager from '@/components/OfflineManager';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import QuizHubModal, { type QuizModeChoice } from '@/components/QuizHubModal';
import ShareResultModal from '@/components/ShareResultModal';
import StoryShareModal from '@/components/StoryShareModal';
import TikTokFeed, { type TikTokFeedHandle } from '@/components/TikTokFeed';
import {
  type CategoryFilter,
  type CategoryId,
  type Language,
} from '@/i18n/translations';
import {
  fetchFactsFromApiWithCache,
  fetchPaginatedFactsFromApi,
  initTelemetrySync,
  trackEvent,
} from '@/lib/telemetry';
import {
  type FactCard as FactCardType,
  interleaveFactsByCategory,
} from '@/utils/factsData';
import { decodeDuelPayload, type DuelPayload } from '@/utils/duelCodec';
import { resolveFactsByIds } from '@/utils/duelLobby';
import { cryptoRandomFloat } from '@/utils/cryptoRandom';
import {
  vibrateDoubleTap,
  vibrateFlip,
  vibrateSheet,
  vibrateSuccess,
  vibrateTap,
} from '@/utils/haptics';
import {
  generateMemoryQuizFromRecent,
  type QuizQuestionItem,
} from '@/utils/recommendation';
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

  const unseen = pool.filter((f) => !seenIds.includes(f.id));
  const seen = pool.filter((f) => seenIds.includes(f.id));

  const sortedCategories = (Object.keys(categoryWeights) as CategoryId[])
    .filter((cat) => categoryWeights[cat] > 0)
    .sort((a, b) => categoryWeights[b] - categoryWeights[a]);
  const topCats = new Set(sortedCategories.slice(0, 2));

  const scoreRank = (fact: FactCardType) => {
    const base = shuffle ? cryptoRandomFloat() : 0.5;
    const priorityBoost = isAllPool && topCats.has(fact.category) ? 0.4 : 0;
    return base + priorityBoost;
  };

  const orderedUnseen = shuffle
    ? [...unseen].sort((a, b) => scoreRank(b) - scoreRank(a))
    : unseen;
  const orderedSeen = shuffle
    ? [...seen].sort((a, b) => scoreRank(b) - scoreRank(a))
    : seen;

  const combined = [...orderedUnseen, ...orderedSeen];
  if (combined.length === 0) return allFacts;

  if (isAllPool) {
    const openingInterleaved = interleaveFactsByCategory(combined).slice(0, 12);
    const openingIds = new Set(openingInterleaved.map((f) => f.id));
    return [...openingInterleaved, ...combined.filter((f) => !openingIds.has(f.id))];
  }

  return combined;
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

export default function HomeClient({ initialFacts }: HomeClientProps) {
  const allFactsRef = useRef<FactCardType[]>(initialFacts);
  const [allFacts, setAllFacts] = useState<FactCardType[]>(initialFacts);
  const feedRef = useRef<TikTokFeedHandle>(null);
  const activeCategoryRef = useRef<CategoryFilter>('all');
  const requestedFactSlugRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);

  const [memory, setMemory] = useState<UserMemoryState>(() => getDefaultUserState('tr'));
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [deckFacts, setDeckFacts] = useState<FactCardType[]>(() => initialFacts);
  const [seedFact, setSeedFact] = useState<FactCardType>(initialFacts[0]);

  const [activeTab, setActiveTab] = useState<DockTabId>('explore');
  const [chromeBlocked, setChromeBlocked] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [incomingDuel, setIncomingDuel] = useState<DuelPayload | null>(null);
  const [storyShareFact, setStoryShareFact] = useState<FactCardType | null>(null);
  const [maxSwipedCards, setMaxSwipedCards] = useState(0);
  const [manualPwaOpen, setManualPwaOpen] = useState(false);

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

  useEffect(() => {
    const loaded = loadUserMemory();
    setMemory(loaded);
    hasHydratedRef.current = true;
    document.documentElement.classList.toggle('dark', loaded.darkMode);
    document.documentElement.lang = loaded.lang === 'en' ? 'en' : 'tr';

    initTelemetrySync();

    let requestedFactSlug: string | null = null;
    let duelParam: string | null = null;
    let openQuizParam: string | null = null;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      requestedFactSlug = searchParams.get('fact');
      duelParam = searchParams.get('duel');
      openQuizParam = searchParams.get('openQuiz');
      requestedFactSlugRef.current = requestedFactSlug;
      // Welcome once — skip when deep-linking into a ready duel / quiz
      if (!readWelcomeDismissed() && !duelParam && openQuizParam !== 'daily') {
        setShowWelcome(true);
      }
    }

    const baseDeck = buildPersonalizedDeck(
      initialFacts,
      'all',
      loaded.seenIds,
      loaded.categoryWeights,
      false
    );
    const initialDeck = promoteFactToFront(baseDeck, initialFacts, requestedFactSlug);
    setDeckFacts(initialDeck);
    if (initialDeck[0]) setSeedFact(initialDeck[0]);

    let cancelled = false;

    const applyFactBatch = (incoming: FactCardType[]) => {
      if (cancelled || incoming.length === 0) return;
      const merged = mergeFactsById(allFactsRef.current, incoming);
      allFactsRef.current = merged;
      setAllFacts(merged);

      const currentMem = loadUserMemory();
      const baseLiveDeck = buildPersonalizedDeck(
        merged,
        activeCategoryRef.current,
        currentMem.seenIds,
        currentMem.categoryWeights,
        false
      );
      const targetSlug =
        activeCategoryRef.current === 'all' ? requestedFactSlugRef.current : null;
      const updatedDeck = promoteFactToFront(baseLiveDeck, merged, targetSlug);
      setDeckFacts(updatedDeck);
      if (updatedDeck[0]) setSeedFact(updatedDeck[0]);
      if (targetSlug) {
        requestAnimationFrame(() => feedRef.current?.scrollToTop());
      }
      return merged;
    };

    const hydratePaginatedFeed = async () => {
      const page1 = await fetchPaginatedFactsFromApi({ offset: 0, limit: 25 });
      let workingPool: FactCardType[] | undefined;

      if (page1 && page1.facts.length > 0) {
        workingPool = applyFactBatch(page1.facts);
        if (page1.hasMore && !cancelled) {
          const page2 = await fetchPaginatedFactsFromApi({ offset: 25, limit: 120 });
          if (page2 && page2.facts.length > 0) {
            workingPool = applyFactBatch(page2.facts) ?? workingPool;
          }
        }
      } else {
        const offlineOrCached = await fetchFactsFromApiWithCache();
        if (offlineOrCached && offlineOrCached.length > 0) {
          workingPool = applyFactBatch(offlineOrCached);
        }
      }

      if (cancelled) return;
      const activePool = workingPool ?? allFactsRef.current;

      if (duelParam) {
        const decoded = decodeDuelPayload(duelParam);
        if (decoded && decoded.cardIds.length > 0) {
          // Open duel lobby page with shared pack — do not auto-start until all ready
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
        const dailyFacts = pickSeededFacts(activePool, 5, getDailySeedKey());
        setActiveQuiz({
          key: `daily-url-${Date.now()}`,
          mode: 'daily',
          questions: dailyFacts.map((fact) => ({ fact })),
        });
        setActiveTab('quiz');
      }
    };

    void hydratePaginatedFeed();

    return () => {
      cancelled = true;
    };
  }, [initialFacts]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (memory.xp === 0 && memory.streakDays === 0) return;

    const activeSlug = seedFact?.slug || seedFact?.en.slug || seedFact?.tr.slug || seedFact?.id || 'profile';
    const syncTimer = setTimeout(() => {
      void trackEvent(
        activeSlug,
        seedFact?.category || 'general',
        'profile_sync',
        { xp: memory.xp, streak: memory.streakDays },
        { xp: memory.xp, streak: memory.streakDays, username: memory.nickname }
      );
    }, 150);

    return () => clearTimeout(syncTimer);
  }, [memory.xp, memory.streakDays, memory.nickname, seedFact]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', memory.darkMode);
      document.documentElement.lang = memory.lang === 'en' ? 'en' : 'tr';
    }
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
      const updated = { ...prev, darkMode: !prev.darkMode };
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
    activeCategoryRef.current = cat;
    setActiveCategory(cat);

    setMemory((prev) => {
      const next =
        cat !== 'all' && cat !== 'vocabulary'
          ? boostCategoryWeight(prev, cat, 1)
          : prev;
      const newDeck = buildPersonalizedDeck(
        allFactsRef.current,
        cat,
        next.seenIds,
        next.categoryWeights,
        false
      );
      setDeckFacts(newDeck);
      if (newDeck[0]) setSeedFact(newDeck[0]);
      return next;
    });

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
              false
            );
            setDeckFacts(refreshed);
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
      setMemory((prev) => toggleFavoriteFact(prev, fact.id, fact.category));
    },
    [soundEnabled]
  );

  const handleOpenDuelFromCard = useCallback(
    (fact: FactCardType) => {
      setSeedFact(fact);
      vibrateSheet(12);
      playPop(soundEnabled);
      setIncomingDuel(null);
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
    const duelConfig = finishedSession?.duelConfig ?? null;
    const isDuelWin = duelConfig && earnedXp > duelConfig.targetScore;

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
      quizMode,
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
      quizMode,
      score: totalBonusXp,
      durationSec: elapsedSec,
      correctCount: results.filter(Boolean).length,
      questionCount: results.length,
    });

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

  const handleDockSelectTab = (tab: DockTabId) => {
    vibrateTap(12);
    playPop(soundEnabled);

    if (tab === 'explore') {
      const alreadyExploring = activeTab === 'explore' && !activeQuiz;
      setActiveQuiz(null);
      setIncomingDuel(null);
      setActiveTab('explore');

      if (alreadyExploring) {
        const refreshed = buildPersonalizedDeck(
          allFactsRef.current,
          activeCategory,
          memory.seenIds,
          memory.categoryWeights,
          true
        );
        setDeckFacts(refreshed);
        if (refreshed[0]) setSeedFact(refreshed[0]);
      }
      feedRef.current?.scrollToTop();
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
    setIncomingDuel(null);
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
    const fresh = resetUserMemory();
    setMemory(fresh);
    activeCategoryRef.current = 'all';
    setActiveCategory('all');
    const cleanDeck = buildPersonalizedDeck(allFactsRef.current, 'all', [], fresh.categoryWeights, false);
    setDeckFacts(cleanDeck);
    if (cleanDeck[0]) setSeedFact(cleanDeck[0]);
    feedRef.current?.scrollToTop();
  };

  const cookieBannerVisible =
    !memory.cookieAccepted && activeTab === 'explore' && !activeQuiz && !showWelcome;
  const showExploreFeed = activeTab === 'explore' && !activeQuiz;

  useEffect(() => {
    const onAmbient = (event: Event) => {
      const accent = (event as CustomEvent<{ accent?: string }>).detail?.accent;
      if (typeof accent === 'string' && accent.length > 0) setAmbientAccent(accent);
    };
    window.addEventListener('scrolly-ambient-accent', onAmbient as EventListener);
    return () => window.removeEventListener('scrolly-ambient-accent', onAmbient as EventListener);
  }, []);

  const isDark = memory.darkMode;

  return (
    <div
      data-testid="reels-desktop-shell"
      data-theme={isDark ? 'dark' : 'light'}
      className={`relative flex h-[100dvh] w-screen overflow-hidden select-none ${
        isDark ? 'bg-black text-white' : 'bg-[#E8E6F0] text-[#1E1B2E]'
      }`}
    >
      <WelcomeExploreModal
        open={showWelcome}
        lang={lang}
        onStart={() => {
          persistWelcomeDismissed();
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
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background: isDark
              ? `radial-gradient(ellipse 70% 95% at 48% 50%, ${ambientAccent}66 0%, ${ambientAccent}22 38%, #000 72%)`
              : `radial-gradient(ellipse 70% 95% at 48% 50%, ${ambientAccent}55 0%, ${ambientAccent}28 42%, #E8E6F0 78%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden lg:block opacity-50 blur-3xl"
          style={{
            background: `linear-gradient(180deg, ${ambientAccent}40 0%, transparent 45%, ${ambientAccent}28 100%)`,
          }}
        />

        {/* Stage + attached desktop up/down rail (TikTok pattern) */}
        <div
          data-testid="reels-stage-row"
          className="relative z-10 flex h-full w-full max-w-none items-stretch justify-center lg:w-auto lg:max-w-[min(720px,58vw)] lg:gap-2"
        >
        {/* Immersive vertical stage: full-bleed on mobile/tablet; tall center column on desktop */}
        <div
          data-testid="reels-phone-frame"
          className={`relative z-10 mx-auto flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden lg:mx-0 lg:w-[min(620px,50vw)] lg:max-w-[min(620px,50vw)] lg:flex-none lg:shadow-[0_0_100px_-18px_rgba(0,0,0,0.55)] ${
            isDark ? 'bg-[#09090B] text-white' : 'bg-[#F7F5FB] text-[#1E1B2E]'
          }`}
        >
        <OfflineManager lang={lang} />

        {showExploreFeed && !storyShareFact && !shareModalData && (
          <PwaInstallPrompt
            lang={lang}
            swipedCount={maxSwipedCards}
            forceOpen={manualPwaOpen}
            onCloseForceOpen={() => setManualPwaOpen(false)}
            onButtonPop={() => playPop(soundEnabled)}
          />
        )}

        {showExploreFeed && (
          <TikTokFeed
            ref={feedRef}
            deckFacts={deckFacts}
            lang={lang}
            darkMode={memory.darkMode}
            soundEnabled={soundEnabled}
            activeCategory={activeCategory}
            favoriteIds={memory.favoriteIds}
            streakDays={memory.streakDays}
            xp={memory.xp}
            cardsSinceLastQuiz={memory.cardsSinceLastQuiz}
            totalCardsViewed={Math.max(memory.totalSwipes, getTotalCardsViewed())}
            cookieBannerVisible={cookieBannerVisible}
            onSelectCategory={handleSelectCategory}
            onChangeLang={handleChangeLang}
            onToggleDarkMode={handleToggleDarkMode}
            onToggleSound={handleToggleSound}
            onFlipCard={handleFlipCard}
            onDoubleTapLike={handleDoubleTapLike}
            onDwellRead={handleDwellRead}
            onOpenDuelFromCard={handleOpenDuelFromCard}
            onOpenStoryShare={handleOpenStoryShare}
            onGuessReward={handleGuessReward}
            onToggleFavorite={handleToggleFavorite}
            onOpenQuizHub={handleOpenQuizHub}
            onButtonPop={() => playPop(soundEnabled)}
            onSlideIndexChange={(idx) => setMaxSwipedCards((prev) => Math.max(prev, idx))}
            onEarnXp={(xpAmount) => {
              setMemory((prev) => addUserXp(prev, xpAmount));
            }}
            onSuccessSound={() => playDing(soundEnabled)}
            onWrongSound={() => playWrong(soundEnabled)}
          />
        )}

        <AnimatePresence>
          {activeQuiz && (
            <div
              data-testid="active-quiz-page"
              className="absolute inset-0 z-30 flex h-full w-full flex-col overflow-y-auto bg-[#FFFDF9] px-3 pb-[108px] pt-4 dark:bg-[#171228] lg:pb-6"
            >
              <MemoryQuizCard
                key={activeQuiz.key}
                questions={activeQuiz.questions}
                lang={lang}
                quizMode={activeQuiz.mode}
                duelConfig={activeQuiz.duelConfig}
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
        />

        <DuelModal
          open={activeTab === 'duel' && !activeQuiz}
          presentation="page"
          lang={lang}
          defaultNickname={memory.nickname}
          seedFact={seedFact}
          allFacts={allFacts}
          incomingDuel={incomingDuel}
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
          onResetMemory={handleResetMemory}
          onRequestPwaInstall={() => setManualPwaOpen(true)}
          onClose={closeOverlayToExplore}
          onButtonPop={() => playPop(soundEnabled)}
          onCelebrateLeague={() => playLeagueCelebration(soundEnabled)}
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
            questionIds={shareModalData.questionIds}
            duelConfig={shareModalData.duelConfig}
            onButtonPop={() => playPop(soundEnabled)}
            onClose={() => {
              setShareModalData(null);
              setActiveTab('explore');
            }}
          />
        )}

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
        />

        {/* Bottom dock: mobile + tablet only (desktop uses left nav) */}
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
      </div>

        {showExploreFeed && (
          <DesktopFeedSideRail
            lang={lang}
            darkMode={isDark}
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
    </div>
  );
}
