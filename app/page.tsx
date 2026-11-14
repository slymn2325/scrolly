'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import DiplomaProfileModal from '@/components/DiplomaProfileModal';
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
  initTelemetrySync,
  trackEvent,
} from '@/lib/telemetry';
import {
  type FactCard as FactCardType,
  getAllFacts,
  getFactById,
} from '@/utils/factsData';
import { decodeDuelPayload } from '@/utils/duelCodec';
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
  loadUserMemory,
  recordCardRead,
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

function buildPersonalizedDeck(
  allFacts: FactCardType[],
  category: CategoryFilter,
  seenIds: string[],
  categoryWeights: Record<CategoryId, number>,
  shuffle: boolean
): FactCardType[] {
  const pool =
    category === 'all'
      ? [...allFacts]
      : allFacts.filter((fact) => fact.category === category);

  const unseen = pool.filter((f) => !seenIds.includes(f.id));
  const seen = pool.filter((f) => seenIds.includes(f.id));

  const sortedCategories = (Object.keys(categoryWeights) as CategoryId[])
    .filter((cat) => categoryWeights[cat] > 0)
    .sort((a, b) => categoryWeights[b] - categoryWeights[a]);
  const topCats = new Set(sortedCategories.slice(0, 2));

  const scoreRank = (fact: FactCardType) => {
    const base = shuffle ? Math.random() : 0.5;
    const priorityBoost = category === 'all' && topCats.has(fact.category) ? 0.4 : 0;
    return base + priorityBoost;
  };

  const orderedUnseen = shuffle
    ? [...unseen].sort((a, b) => scoreRank(b) - scoreRank(a))
    : unseen;
  const orderedSeen = shuffle
    ? [...seen].sort((a, b) => scoreRank(b) - scoreRank(a))
    : seen;

  const combined = [...orderedUnseen, ...orderedSeen];
  return combined.length > 0 ? combined : allFacts;
}

export default function HomePage() {
  const staticAllFacts = useMemo(() => getAllFacts(), []);
  const [allFacts, setAllFacts] = useState<FactCardType[]>(staticAllFacts);
  const feedRef = useRef<TikTokFeedHandle>(null);
  const activeCategoryRef = useRef<CategoryFilter>('all');
  const hasHydratedRef = useRef(false);

  const [memory, setMemory] = useState<UserMemoryState>(() => getDefaultUserState());
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [deckFacts, setDeckFacts] = useState<FactCardType[]>(() => staticAllFacts);
  const [seedFact, setSeedFact] = useState<FactCardType>(staticAllFacts[0]);

  const [activeTab, setActiveTab] = useState<DockTabId>('explore');
  const [activeModal, setActiveModal] = useState<ActiveOverlayModal>('none');
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [storyShareFact, setStoryShareFact] = useState<FactCardType | null>(null);
  const [maxSwipedCards, setMaxSwipedCards] = useState(0);

  const [shareModalData, setShareModalData] = useState<{
    results: boolean[];
    badgeCategory: CategoryId;
    earnedXp: number;
    elapsedSec: number;
    questionIds: string[];
    duelConfig?: DuelChallengeConfig | null;
  } | null>(null);

  // Hydrate memory, Night Mode, personalized deck, offline telemetry queue, live API facts, and URL params
  useEffect(() => {
    const loaded = loadUserMemory();
    setMemory(loaded);
    hasHydratedRef.current = true;
    document.documentElement.classList.toggle('dark', loaded.darkMode);

    initTelemetrySync();

    const initialDeck = buildPersonalizedDeck(
      staticAllFacts,
      'all',
      loaded.seenIds,
      loaded.categoryWeights,
      false
    );
    setDeckFacts(initialDeck);
    if (initialDeck[0]) setSeedFact(initialDeck[0]);

    let cancelled = false;
    void fetchFactsFromApiWithCache().then((liveFacts) => {
      if (cancelled || !liveFacts || liveFacts.length === 0) return;
      setAllFacts(liveFacts);
      const currentMem = loadUserMemory();
      const updatedDeck = buildPersonalizedDeck(
        liveFacts,
        activeCategoryRef.current,
        currentMem.seenIds,
        currentMem.categoryWeights,
        false
      );
      setDeckFacts(updatedDeck);
      if (updatedDeck[0]) setSeedFact(updatedDeck[0]);
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const duelParam = params.get('duel');
      const openQuizParam = params.get('openQuiz');

      if (duelParam) {
        const decoded = decodeDuelPayload(duelParam);
        if (decoded && decoded.cardIds.length > 0) {
          const matched = decoded.cardIds
            .map((id) => getFactById(id))
            .filter((f): f is FactCardType => Boolean(f));
          const pool = [...matched];
          for (const candidate of staticAllFacts) {
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
        const dailyFacts = pickSeededFacts(staticAllFacts, 5, getDailySeedKey());
        setActiveQuiz({
          key: `daily-url-${Date.now()}`,
          mode: 'daily',
          questions: dailyFacts.map((fact) => ({ fact })),
        });
        setActiveTab('quiz');
      }
    }

    return () => {
      cancelled = true;
    };
  }, [staticAllFacts]);

  // Synchronize user profile XP, streak, and nickname to Postgres when updated
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (memory.xp === 0 && memory.streakDays === 0) return;

    const activeSlug = seedFact?.slug || seedFact?.en.slug || seedFact?.tr.slug || seedFact?.id || 'profile';
    void trackEvent(
      activeSlug,
      seedFact?.category || 'general',
      'profile_sync',
      { xp: memory.xp, streak: memory.streakDays },
      { xp: memory.xp, streak: memory.streakDays, username: memory.nickname }
    );
  }, [memory.xp, memory.streakDays, memory.nickname, seedFact]);

  // Keep <html> .dark class synchronized
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', memory.darkMode);
    }
  }, [memory.darkMode]);

  const lang: Language = memory.lang;
  const soundEnabled = memory.soundEnabled;
  const topCategory = getTopCategory(memory.categoryWeights);
  const todayStr = getTodayDateString();
  const dailyCompleted = memory.lastDailyQuizDate === todayStr;
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
      const next = cat !== 'all' ? boostCategoryWeight(prev, cat, 1) : prev;
      const newDeck = buildPersonalizedDeck(
        allFacts,
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
  };

  const handleDwellRead = useCallback(
    (fact: FactCardType) => {
      setSeedFact(fact);
      setMemory((prev) => {
        const updated = recordCardRead(prev, fact.id, fact.category);
        if (
          updated.cardsSinceLastQuiz >= 5 &&
          !activeQuiz &&
          activeModal === 'none' &&
          !shareModalData
        ) {
          const questions = generateMemoryQuizFromRecent(
            updated.recentFiveIds,
            allFacts,
            fact
          );
          setActiveQuiz({
            key: `auto-mem-${Date.now()}`,
            mode: 'memory',
            questions,
          });
          setActiveTab('quiz');
        }
        return updated;
      });
    },
    [activeModal, activeQuiz, allFacts, shareModalData]
  );

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
    (xpAmount: number, accurate: boolean) => {
      vibrateTap(12);
      if (accurate) {
        playDing(soundEnabled);
      } else {
        playPop(soundEnabled);
      }
      setMemory((prev) => addUserXp(prev, xpAmount));
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
      setSeedFact(fact);
      vibrateDoubleTap(12);
      playPopDing(soundEnabled);
      setMemory((prev) => toggleFavoriteFact(prev, fact.id, fact.category, true));
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

    if (choice === 'daily') {
      const dailyFacts = pickSeededFacts(allFacts, 5, getDailySeedKey());
      setActiveQuiz({
        key: `daily-${Date.now()}`,
        mode: 'daily',
        questions: dailyFacts.map((fact) => ({ fact })),
      });
      return;
    }

    if (choice === 'weekly') {
      const weeklyFacts = pickSeededFacts(allFacts, 10, getWeeklySeedKey());
      setActiveQuiz({
        key: `weekly-${Date.now()}`,
        mode: 'weekly',
        questions: weeklyFacts.map((fact) => ({ fact })),
      });
      return;
    }

    const memQuestions = generateMemoryQuizFromRecent(
      memory.recentFiveIds,
      allFacts,
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
    const duelFacts = config.factIds
      .map(
        (id) =>
          allFacts.find((f) => f.id === id || f.slug === id || f.en.slug === id) ??
          getFactById(id)
      )
      .filter((f): f is FactCardType => Boolean(f));
    const pool = [...duelFacts];
    for (const candidate of allFacts) {
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
    const updated = completeMemoryQuiz(memory, bestQuizCategory, totalBonusXp, quizMode);
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
          allFacts,
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
    const cleanDeck = buildPersonalizedDeck(allFacts, 'all', [], fresh.categoryWeights, false);
    setDeckFacts(cleanDeck);
    if (cleanDeck[0]) setSeedFact(cleanDeck[0]);
    feedRef.current?.scrollToTop();
  };

  const cookieBannerVisible = !memory.cookieAccepted && activeModal === 'none' && !activeQuiz;

  return (
    <div className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black md:bg-[#0B0915]">
      {/* Mobile-First Full-Bleed Frame (locked 430px column on mobile & desktop) */}
      <div className="relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden md:h-[96dvh] md:rounded-[2.5rem] md:border-[5px] md:border-neutral-900/90 md:shadow-2xl">
        <OfflineManager lang={lang} />

        {activeModal === 'none' && !activeQuiz && !storyShareFact && !shareModalData && (
          <PwaInstallPrompt
            lang={lang}
            swipedCount={maxSwipedCards}
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
          onButtonPop={() => playPop(soundEnabled)}
          onSlideIndexChange={(idx) => setMaxSwipedCards((prev) => Math.max(prev, idx))}
        />

        {/* Active Quiz Overlay (Daily Sprint / Weekly Marathon / Memory Quiz / 1v1 Duel) */}
        <AnimatePresence>
          {activeQuiz && (
            <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-[430px] items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md">
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

        {/* Modals Connected to the 5 Dock Tabs */}
        <LeaderboardModal
          open={activeModal === 'leaderboard'}
          lang={lang}
          nickname={memory.nickname}
          userXp={memory.xp}
          weeklyXp={memory.weeklyXp}
          dailyBestScore={memory.dailyBestScore}
          streakDays={memory.streakDays}
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

        {/* Non-Intrusive Cookie Notice Above Dock */}
        <CookieBanner
          lang={lang}
          visible={cookieBannerVisible}
          onAccept={() => {
            vibrateTap(12);
            playPop(soundEnabled);
            setMemory((prev) => {
              const updated = { ...prev, cookieAccepted: true };
              saveUserMemory(updated);
              return updated;
            });
          }}
        />
      </div>

      {/* iOS Liquid Glass Floating Island 5-Tab Navigation Dock */}
      <IosFloatingIslandDock
        activeTab={activeTab}
        lang={lang}
        showQuizDot={showQuizDot}
        onSelectTab={handleDockSelectTab}
      />
    </div>
  );
}
