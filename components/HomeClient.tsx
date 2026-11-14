'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import DiplomaProfileModal from '@/components/DiplomaProfileModal';
import { applyGoogleConsentChoice } from '@/utils/consent';
import DuelModal, { type DuelChallengeConfig } from '@/components/DuelModal';
import IosFloatingIslandDock, { type DockTabId } from '@/components/IosFloatingIslandDock';
import LeaderboardModal from '@/components/LeaderboardModal';
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
import { decodeDuelPayload } from '@/utils/duelCodec';
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

type ActiveOverlayModal = 'none' | 'leaderboard' | 'quizHub' | 'duel' | 'diploma';

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
  const [activeModal, setActiveModal] = useState<ActiveOverlayModal>('none');
  const [chromeBlocked, setChromeBlocked] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
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
          const matched = decoded.cardIds
            .map((id) =>
              activePool.find(
                (f) => f.id === id || f.slug === id || f.en.slug === id || f.tr.slug === id
              )
            )
            .filter((f): f is FactCardType => Boolean(f));
          const pool = [...matched];
          for (const candidate of activePool) {
            if (!pool.some((f) => f.id === candidate.id)) pool.push(candidate);
            if (pool.length >= 5) break;
          }
          setActiveQuiz({
            key: `duel-url-${Date.now()}`,
            mode: 'duel',
            questions: pool.slice(0, 5).map((fact) => ({ fact })),
            duelConfig: {
              factIds: pool.slice(0, 5).map((f) => f.id),
              challengerName: decoded.name,
              targetScore: decoded.score,
              targetTimeSec: decoded.timeSec,
            },
          });
          setActiveTab('quiz');
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
    setActiveModal('quizHub');
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
      setActiveModal('duel');
      setActiveTab('duel');
    },
    [soundEnabled]
  );

  const handleStartQuizMode = (choice: QuizModeChoice) => {
    vibrateTap(12);
    setActiveModal('none');
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
    const duelFacts = config.factIds
      .map((id) =>
        activePool.find(
          (f) => f.id === id || f.slug === id || f.en.slug === id || f.tr.slug === id
        )
      )
      .filter((f): f is FactCardType => Boolean(f));
    const pool = [...duelFacts];
    for (const candidate of activePool) {
      if (!pool.some((f) => f.id === candidate.id)) pool.push(candidate);
      if (pool.length >= 5) break;
    }

    setActiveModal('none');
    setActiveTab('quiz');
    setActiveQuiz({
      key: `duel-${Date.now()}`,
      mode: 'duel',
      questions: pool.slice(0, 5).map((fact) => ({ fact })),
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
      const alreadyExploring = activeTab === 'explore' && activeModal === 'none' && !activeQuiz;
      setActiveModal('none');
      setActiveQuiz(null);
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

    setActiveQuiz(null);
    setActiveTab(tab);

    if (tab === 'leaderboard') setActiveModal('leaderboard');
    if (tab === 'quiz') setActiveModal('quizHub');
    if (tab === 'duel') setActiveModal('duel');
    if (tab === 'diploma') setActiveModal('diploma');
  };

  const closeOverlayToExplore = () => {
    vibrateTap(12);
    playPop(soundEnabled);
    setActiveModal('none');
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

  const cookieBannerVisible = !memory.cookieAccepted && activeModal === 'none' && !activeQuiz;
  const [ambientAccent, setAmbientAccent] = useState<string>(
    () => seedFact?.accentColor || '#818CF8'
  );

  useEffect(() => {
    const onAmbient = (event: Event) => {
      const accent = (event as CustomEvent<{ accent?: string }>).detail?.accent;
      if (typeof accent === 'string' && accent.length > 0) setAmbientAccent(accent);
    };
    window.addEventListener('scrolly-ambient-accent', onAmbient as EventListener);
    return () => window.removeEventListener('scrolly-ambient-accent', onAmbient as EventListener);
  }, []);

  return (
    <div
      data-testid="reels-desktop-shell"
      className="relative flex h-[100dvh] w-screen items-stretch justify-center overflow-hidden bg-[#07070C] select-none md:items-center md:gap-8 md:px-6 lg:gap-12 lg:px-10"
    >
      {/* Full-bleed ambient: designed stage wash, not empty void */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        <div
          className="absolute inset-0 opacity-90 transition-[background] duration-700"
          style={{
            background: `radial-gradient(ellipse 55% 70% at 50% 45%, ${ambientAccent}55 0%, ${ambientAccent}22 42%, #07070C 72%)`,
          }}
        />
        <div
          className="absolute inset-y-[8%] left-[4%] w-[18%] rounded-[32px] opacity-70 blur-2xl"
          style={{ background: `linear-gradient(180deg, ${ambientAccent}40, transparent)` }}
        />
        <div
          className="absolute inset-y-[8%] right-[4%] w-[18%] rounded-[32px] opacity-70 blur-2xl"
          style={{ background: `linear-gradient(180deg, ${ambientAccent}40, transparent)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#07070C_88%)]" />
      </div>

      {/* Left brand rail — fills desktop margin intentionally */}
      <aside
        data-testid="desktop-left-rail"
        className="relative z-10 hidden w-[160px] shrink-0 flex-col justify-center gap-4 text-white/80 lg:flex xl:w-[200px]"
      >
        <div className="space-y-2">
          <p className="font-display text-3xl font-black tracking-tight text-white">Scrolly</p>
          <p className="text-sm font-semibold leading-snug text-white/70">
            {lang === 'tr' ? 'Kaydır. Öğren. Şaşır.' : 'Scroll. Learn. Wonder.'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-[11px] font-bold leading-relaxed text-white/75 backdrop-blur-md">
          {lang === 'tr'
            ? '↑↓ ile kartlar arasında kaydır. Detay için basılı tut veya Detay’a dokun.'
            : '↑↓ to move between cards. Hold or tap Detail for the deep dive.'}
        </div>
      </aside>

      {/* Centered cinematic stage — larger on desktop, still 9:16 feel */}
      <div
        data-testid="reels-phone-frame"
        className="dark relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#09090B] text-white md:h-[min(100dvh-1.25rem,960px)] md:max-w-[min(520px,46vw)] md:rounded-[28px] md:border md:border-white/15 md:shadow-[0_30px_100px_-16px_rgba(0,0,0,0.95),0_0_60px_-12px_rgba(255,255,255,0.08)]"
      >
        <OfflineManager lang={lang} />

        {activeModal === 'none' && !activeQuiz && !storyShareFact && !shareModalData && (
          <PwaInstallPrompt
            lang={lang}
            swipedCount={maxSwipedCards}
            forceOpen={manualPwaOpen}
            onCloseForceOpen={() => setManualPwaOpen(false)}
            onButtonPop={() => playPop(soundEnabled)}
          />
        )}

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

        <AnimatePresence>
          {activeQuiz && (
            <div className="fixed inset-0 z-40 flex w-full items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md">
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
                  setActiveTab('explore');
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
          open={activeModal === 'leaderboard'}
          lang={lang}
          nickname={memory.nickname}
          userXp={memory.xp}
          weeklyXp={memory.weeklyXp}
          dailyBestScore={memory.dailyBestScore}
          streakDays={memory.streakDays}
          onInviteDuel={() => {
            vibrateTap(12);
            playPop(soundEnabled);
            setActiveModal('duel');
            setActiveTab('duel');
          }}
          onClose={closeOverlayToExplore}
        />

        <QuizHubModal
          open={activeModal === 'quizHub'}
          lang={lang}
          dailyCompleted={dailyCompleted}
          dailyBestScore={memory.dailyBestScore}
          recentCount={memory.recentFiveIds.length}
          onSelectMode={handleStartQuizMode}
          onClose={closeOverlayToExplore}
          onButtonPop={() => playPop(soundEnabled)}
        />

        <DuelModal
          open={activeModal === 'duel'}
          lang={lang}
          defaultNickname={memory.nickname}
          seedFact={seedFact}
          allFacts={allFacts}
          onStartDuel={handleStartDuel}
          onClose={closeOverlayToExplore}
          onButtonPop={() => playPop(soundEnabled)}
        />

        <DiplomaProfileModal
          open={activeModal === 'diploma'}
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

        <IosFloatingIslandDock
          activeTab={activeTab}
          lang={lang}
          showQuizDot={showQuizDot}
          onSelectTab={handleDockSelectTab}
          chromeBlocked={chromeBlocked}
        />
      </div>

      {/* Right session rail */}
      <aside
        data-testid="desktop-right-rail"
        className="relative z-10 hidden w-[160px] shrink-0 flex-col justify-center gap-3 text-white/80 lg:flex xl:w-[200px]"
      >
        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/50">
            {lang === 'tr' ? 'Oturum' : 'Session'}
          </p>
          <p className="mt-1 text-2xl font-black text-white">{memory.xp} XP</p>
          <p className="mt-1 text-[11px] font-semibold text-white/65">
            {lang === 'tr' ? `${memory.streakDays} gün seri` : `${memory.streakDays} day streak`}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-[11px] font-bold leading-relaxed text-white/70 backdrop-blur-md">
          {lang === 'tr'
            ? 'Her kartın arka planı konuya özel ipucu verir — rastgele GIF değil.'
            : 'Each card’s backdrop is a topic hint — not a random GIF.'}
        </div>
      </aside>
    </div>
  );
}
