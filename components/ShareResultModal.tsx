'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Award,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Film,
  Mail,
  MessageCircle,
  Share2,
  Swords,
} from 'lucide-react';
import { Button, Toast } from '@/components/cikartma';
import { motionSpring } from '@/lib/motion';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import GiphyReactionPicker, {
  type GiphyReactionItemDisplay,
  type ReactionGifSelection,
} from '@/components/GiphyReactionPicker';
import {
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';
import { isShortRoomCode, type ScrollaRoom } from '@/lib/duelStore';
import type { ChallengeQuestionSnapshot } from '@/types/challenge';
import { copyTextToClipboard } from '@/utils/clipboard';
import { buildDailyResultShareText, duelInviteUrl } from '@/utils/viralShare';
import {
  createScrollaRoom,
  fetchScrollaRoom,
  getOrCreateScrollaPlayerId,
  sendScrollaReaction,
} from '@/utils/duelLobby';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';
import { useEscapeClose } from '@/utils/useEscapeClose';

interface ShareResultModalProps {
  lang: Language;
  results: boolean[];
  badgeCategory: CategoryId;
  earnedXp: number;
  elapsedSec?: number;
  quizMode?: 'memory' | 'daily' | 'weekly' | 'duel' | 'vocabulary';
  quizDate?: string;
  challengerNickname?: string;
  playerId?: string;
  questionIds?: string[];
  questionSnapshots?: ChallengeQuestionSnapshot[];
  duelConfig?: DuelChallengeConfig | null;
  onButtonPop: () => void;
  onClose: () => void;
}

export default function ShareResultModal({
  lang,
  results,
  badgeCategory,
  earnedXp,
  elapsedSec = 24,
  quizMode,
  quizDate,
  challengerNickname = 'Merak Avcısı',
  playerId: propPlayerId,
  questionIds = [],
  questionSnapshots = [],
  duelConfig,
  onButtonPop,
  onClose,
}: ShareResultModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [duelCopied, setDuelCopied] = useState(false);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeInfo, setChallengeInfo] = useState<string | null>(null);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(() =>
    duelConfig?.duelId && isShortRoomCode(duelConfig.duelId) ? duelConfig.duelId : null
  );
  const [polledRoom, setPolledRoom] = useState<ScrollaRoom | null>(null);
  const [showReactionDrawer, setShowReactionDrawer] = useState(false);
  const [sendingReaction, setSendingReaction] = useState(false);
  const [localReactions, setLocalReactions] = useState<GiphyReactionItemDisplay[]>([]);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const pendingRoomRef = useRef<Promise<string | null> | null>(null);
  const t = translations[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readAuthEmail = () => {
      try {
        const stored = window.localStorage.getItem('scrolly_auth_user_email');
        setAuthEmail(stored && stored.trim() ? stored.trim() : null);
      } catch {
        setAuthEmail(null);
      }
    };
    readAuthEmail();
    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: { email?: string } | null }>).detail;
      if (detail && 'user' in detail) {
        setAuthEmail(detail.user?.email?.trim() || null);
      } else {
        readAuthEmail();
      }
    };
    window.addEventListener('scrolly-auth-changed', onAuthChanged as EventListener);
    window.addEventListener('storage', readAuthEmail);
    return () => {
      window.removeEventListener('scrolly-auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('storage', readAuthEmail);
    };
  }, []);

  const activePlayerId = useMemo(
    () => duelConfig?.myPlayerId || propPlayerId || getOrCreateScrollaPlayerId(),
    [duelConfig?.myPlayerId, propPlayerId]
  );

  const isRealServerDuel = Boolean(
    duelConfig?.duelId && isShortRoomCode(duelConfig.duelId) && !duelConfig.isBotPractice
  );

  useEscapeClose(true, onClose);

  const correctCount = results.filter(Boolean).length;
  const totalCount = results.length;
  const effectiveQuestionIds = useMemo(
    () =>
      questionIds.length > 0
        ? questionIds
        : questionSnapshots.map((snapshot) => snapshot.id).filter(Boolean),
    [questionIds, questionSnapshots]
  );
  const wordleGrid = results.map((ok) => (ok ? '🟩' : '🟥')).join('');
  const catMeta = getCategoryMeta(badgeCategory);
  const badgeLabel =
    lang === 'tr' ? `${catMeta.badge.tr} Rozeti` : `${catMeta.badge.en} Badge`;

  const selfPlayer = useMemo(() => {
    if (!isRealServerDuel || !polledRoom) return null;
    return polledRoom.players.find((p) => p.id === activePlayerId) ?? null;
  }, [activePlayerId, isRealServerDuel, polledRoom]);

  const opponentPlayer = useMemo(() => {
    if (!isRealServerDuel || !polledRoom) return null;
    return polledRoom.players.find((p) => p.id !== activePlayerId) ?? null;
  }, [activePlayerId, isRealServerDuel, polledRoom]);

  const opponentScore = opponentPlayer?.score ?? null;
  const opponentElapsed = opponentPlayer?.elapsedSec ?? null;
  const opponentFinished = isRealServerDuel ? opponentScore !== null : true;
  const duelPending = Boolean(duelConfig && isRealServerDuel && !opponentFinished);

  let duelWon = false;
  let duelTie = false;
  if (duelConfig && !duelPending) {
    if (isRealServerDuel && opponentScore !== null) {
      if (earnedXp > opponentScore) {
        duelWon = true;
      } else if (earnedXp < opponentScore) {
        duelWon = false;
      } else if (typeof opponentElapsed === 'number') {
        if (elapsedSec < opponentElapsed) {
          duelWon = true;
        } else if (elapsedSec === opponentElapsed) {
          duelTie = true;
        }
      } else {
        duelTie = true;
      }
    } else {
      duelWon = earnedXp > duelConfig.targetScore;
      duelTie = earnedXp === duelConfig.targetScore;
    }
  }

  const recentReactions = useMemo<GiphyReactionItemDisplay[]>(() => {
    if (isRealServerDuel && polledRoom) {
      const serverItems = polledRoom.players
        .filter((player) => Boolean(player.reactionGif?.url))
        .map((player) => ({
          senderName: player.name,
          url: player.reactionGif!.url,
          title: player.reactionGif?.title,
          isSelf: player.id === activePlayerId,
        }));
      if (serverItems.length > 0) return serverItems;
    }
    return localReactions;
  }, [activePlayerId, isRealServerDuel, localReactions, polledRoom]);

  const scoreWord = lang === 'tr' ? 'Puan' : 'Pts';
  const shareSummaryLine = `🧠 ${t.brandName}: ${earnedXp} ${scoreWord} • ${wordleGrid} • ${catMeta.emoji} ${badgeLabel}`;
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';

  const shareLang = lang === 'en' ? 'en' : 'tr';
  const isDailyResult = quizMode === 'daily' && Boolean(quizDate);

  const duelShareUrl = useMemo(() => {
    if (createdRoomCode) {
      return duelInviteUrl(createdRoomCode, shareLang, siteUrl);
    }
    return siteUrl;
  }, [createdRoomCode, shareLang, siteUrl]);

  const fullShareText = useMemo(() => {
    if (isDailyResult && quizDate) {
      return buildDailyResultShareText({
        lang: shareLang,
        isoDate: quizDate,
        results,
        elapsedSec,
      });
    }
    if (createdRoomCode) {
      const codeLine =
        lang === 'tr'
          ? `🎮 Scrolla 1v1 Oda Kodu: ${createdRoomCode}`
          : `🎮 Scrolla 1v1 Room Code: ${createdRoomCode}`;
      return `${shareSummaryLine}\n${t.shareChallengeText}\n${codeLine}\n${duelShareUrl}`;
    }
    return `${shareSummaryLine}\n${t.shareChallengeText}\n${siteUrl}`;
  }, [
    createdRoomCode,
    duelShareUrl,
    elapsedSec,
    isDailyResult,
    lang,
    quizDate,
    results,
    shareLang,
    shareSummaryLine,
    siteUrl,
    t.shareChallengeText,
  ]);

  const ensureScrollaRoomCode = useMemo(() => {
    return async (): Promise<string | null> => {
      if (createdRoomCode) return createdRoomCode;
      if (questionIds.length === 0) return null;
      if (pendingRoomRef.current) return pendingRoomRef.current;

      const hostId = getOrCreateScrollaPlayerId();
      const promise = createScrollaRoom({
        hostId,
        hostName: challengerNickname,
        category: badgeCategory,
        questionCount: [3, 5, 7, 10].includes(questionIds.length) ? questionIds.length : 5,
        cardIds: questionIds.slice(0, 10),
      })
        .then((res) => {
          if (res.ok && res.room?.code) {
            setCreatedRoomCode(res.room.code);
            return res.room.code;
          }
          return null;
        })
        .catch(() => null)
        .finally(() => {
          pendingRoomRef.current = null;
        });

      pendingRoomRef.current = promise;
      return promise;
    };
  }, [badgeCategory, challengerNickname, createdRoomCode, questionIds]);

  // Pre-provision 6-char Scrolla room code on open so Copy & WhatsApp share include ?duel=XXXXXX immediately
  useEffect(() => {
    if (createdRoomCode || questionIds.length === 0) return;
    void ensureScrollaRoomCode();
  }, [createdRoomCode, ensureScrollaRoomCode, questionIds.length]);

  // Poll live 1v1 Scrolla room for opponent completion and reaction GIFs
  useEffect(() => {
    if (!isRealServerDuel || !duelConfig?.duelId) return;
    const roomCode = duelConfig.duelId;
    let cancelled = false;

    const pullRoom = async () => {
      const res = await fetchScrollaRoom(roomCode, activePlayerId);
      if (!cancelled && res.ok && res.room) {
        setPolledRoom(res.room);
      }
    };

    void pullRoom();
    const timer = setInterval(() => {
      void pullRoom();
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePlayerId, duelConfig?.duelId, isRealServerDuel]);

  const handleSendReaction = async (gif: ReactionGifSelection) => {
    if (sendingReaction) return;
    onButtonPop();
    const optimisticItem: GiphyReactionItemDisplay = {
      senderName: challengerNickname,
      url: gif.url,
      title: gif.title,
      isSelf: true,
    };
    setLocalReactions((prev) => [optimisticItem, ...prev.filter((item) => !item.isSelf)]);

    if (isRealServerDuel && duelConfig?.duelId) {
      setSendingReaction(true);
      const res = await sendScrollaReaction(duelConfig.duelId, activePlayerId, {
        url: gif.url,
        title: gif.title,
      });
      setSendingReaction(false);
      if (res.ok && res.room) {
        setPolledRoom(res.room);
      }
    }
  };

  useEffect(() => {
    try {
      const style = getComputedStyle(document.documentElement);
      const token = (name: string) => style.getPropertyValue(name).trim();
      confetti({
        particleCount: 24,
        spread: 75,
        origin: { y: 0.55 },
        colors: [token('--cik-berry'), token('--cik-mint'), token('--cik-butter'), token('--cik-cta'), token('--cik-pink')].filter(Boolean),
      });
    } catch {
      // Ignore confetti errors in headless environments
    }
  }, []);

  const handleCopy = async () => {
    onButtonPop();
    await copyTextToClipboard(fullShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyDuelFromResult = async () => {
    onButtonPop();
    let shareUrl = duelShareUrl;
    if (!createdRoomCode && effectiveQuestionIds.length > 0) {
      const code = await ensureScrollaRoomCode();
      if (code) {
        shareUrl = duelInviteUrl(code, shareLang, siteUrl);
      }
    }
    await copyTextToClipboard(shareUrl);
    setDuelCopied(true);
    setTimeout(() => setDuelCopied(false), 2500);
  };

  const resolveChallengeErrorMessage = (status: number, errorCode?: string): string => {
    if (status === 429 || errorCode === 'rate_limited') {
      return lang === 'tr'
        ? 'Çok hızlı deneme yaptın. Biraz bekleyip tekrar dene.'
        : 'Too many requests. Please wait a moment and try again.';
    }
    if (status === 403 || errorCode === 'forbidden_origin') {
      return lang === 'tr'
        ? 'Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene.'
        : 'Origin verification failed. Please refresh and try again.';
    }
    if (errorCode === 'missing_questions') {
      return lang === 'tr'
        ? 'Bu oturumun soru listesi bulunamadı.'
        : 'Questions for this session could not be found.';
    }
    if (status === 413 || errorCode === 'payload_too_large') {
      return lang === 'tr'
        ? 'Soru paketi boyutu sınırı aştı.'
        : 'Question pack exceeded the allowed payload limit.';
    }
    return lang === 'tr'
      ? `Meydan okuma linki oluşturulamadı (${errorCode || status || 'hata'}).`
      : `Could not create challenge link (${errorCode || status || 'error'}).`;
  };

  const handleCreateAsyncChallenge = async () => {
    onButtonPop();
    if (challengeLoading || effectiveQuestionIds.length === 0) return;

    setChallengeError(null);
    setChallengeInfo(null);

    let url = challengeUrl;
    if (!url) {
      setChallengeLoading(true);
      try {
        const res = await fetch('/api/challenges', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorNickname: challengerNickname,
            creatorScore: earnedXp,
            creatorCorrect: correctCount,
            totalQuestions: totalCount,
            questionIds: effectiveQuestionIds,
            questionsSnapshot: questionSnapshots,
            category: quizMode === 'vocabulary' ? 'vocabulary' : badgeCategory,
            lang: shareLang,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          url?: string;
          error?: string;
        } | null;
        if (!res.ok || !data?.ok || !data.url) {
          setChallengeError(resolveChallengeErrorMessage(res.status, data?.error));
          return;
        }
        url = data.url;
        setChallengeUrl(url);
      } catch {
        setChallengeError(
          lang === 'tr'
            ? 'Bağlantı hatası. Lütfen tekrar dene.'
            : 'Connection error. Please try again.'
        );
        return;
      } finally {
        setChallengeLoading(false);
      }
    }

    if (!url) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title:
            shareLang === 'en'
              ? `${challengerNickname} scored ${earnedXp} XP — Can you beat it?`
              : `${challengerNickname} ${earnedXp} XP yaptı — Geçebilir misin?`,
          text:
            shareLang === 'en'
              ? `I scored ${earnedXp} XP (${correctCount}/${totalCount}) on Scrolly. Can you beat my score?`
              : `Scrolly'de ${earnedXp} XP (${correctCount}/${totalCount}) yaptım. Beni geçebilir misin?`,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    const didCopy = await copyTextToClipboard(url);
    if (didCopy) {
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2500);
    } else {
      setChallengeInfo(
        lang === 'tr'
          ? 'Link oluşturuldu! Panoya kopyalamak için aşağıdaki Kopyala butonuna bas.'
          : 'Link created! Tap the Copy button below to copy it.'
      );
    }
  };

  const handleWebShare = async () => {
    onButtonPop();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: fullShareText });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await copyTextToClipboard(fullShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(fullShareText)}`;
  const reduced = useReducedMotion() === true;
  const [shownXp, setShownXp] = useState(reduced ? earnedXp : 0);

  useEffect(() => {
    if (reduced) {
      setShownXp(earnedXp);
      return;
    }
    const controls = animate(0, earnedXp, {
      type: 'spring',
      stiffness: 90,
      damping: 18,
      onUpdate: (value) => setShownXp(Math.round(value)),
    });
    return () => controls.stop();
  }, [earnedXp, reduced]);

  const finishedTitle = duelConfig
    ? duelPending
      ? t.duelPendingTitle
      : duelWon
        ? t.duelWonTitle
        : duelTie
          ? t.duelTieTitle
          : t.duelLostTitle
    : quizMode === 'daily'
      ? t.quizResultDaily
      : quizMode === 'weekly'
        ? t.quizResultWeekly
        : quizMode === 'vocabulary'
          ? t.quizResultWordLab
          : t.quizResultMemory;

  return (
    <div
      aria-labelledby="share-modal-title"
      data-testid="share-result-modal"
      data-presentation="page"
      className="absolute inset-0 z-content flex h-full w-full flex-col overflow-hidden bg-cik-bg text-cik-text"
    >
      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.15 } : motionSpring.sheetOpen}
        className="flex h-full w-full flex-col overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-6 lg:px-8 lg:pb-8 lg:pt-8"
      >
        <div className="mb-4">
          <Button
            tone="ghost"
            aria-label={t.sheetClose}
            onClick={() => {
              onButtonPop();
              onClose();
            }}
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
            <span>{t.quizBackToFeed}</span>
          </Button>
        </div>

        <div className="text-center">
          <img
            src={
              duelConfig ? STATE_ILLUSTRATION_PATHS.duelArena : STATE_ILLUSTRATION_PATHS.quizCelebration
            }
            alt=""
            aria-hidden="true"
            width={72}
            height={72}
            className="mx-auto mb-3 h-16 w-16 object-contain"
          />
          <h2 id="share-modal-title" className="cik-title-1 text-cik-text">
            {finishedTitle}
          </h2>
          <p className="cik-subhead mt-2 text-cik-text-2">
            {t.shareModalScoreLabel}:{' '}
            <strong className="cik-tabular text-cik-text">
              {correctCount}/{totalCount}
            </strong>
          </p>
          <p className="cik-title-2 cik-tabular mt-2 text-cik-text" data-testid="share-xp-count">
            {shownXp}
          </p>
          <span className="cik-footnote mt-2 inline-flex rounded-pill bg-cik-butter px-3 py-1 text-cik-butter-text">
            +{shownXp} XP
          </span>
        </div>

        {duelConfig && (
          <div className="mt-4 flex flex-col gap-3">
            <div data-testid="duel-vs-card" className="rounded-cik-lg bg-cik-surface p-4 shadow-e1">
              <p className="cik-footnote mb-3 flex items-center justify-center gap-2 text-cik-text-2">
                <Swords size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t.vsComparisonTitle}</span>
              </p>
              <div className="grid grid-cols-3 items-center gap-2 text-center">
                <div className="rounded-cik-md bg-cik-surface-2 p-3">
                  <p className="cik-caption-2 truncate text-cik-text-2">{t.yourResult}</p>
                  <p className="cik-title-3 cik-tabular mt-1 text-cik-mint-text">{earnedXp}</p>
                  <p className="cik-caption-2 inline-flex items-center gap-1 text-cik-text-2">
                    <Clock size={16} strokeWidth={2} aria-hidden="true" /> {elapsedSec}s
                  </p>
                  {(selfPlayer?.reactionGif?.url || localReactions.find((r) => r.isSelf)?.url) && (
                    <div data-testid="share-self-reaction-badge" className="mt-2 flex justify-center">
                      <img
                        src={selfPlayer?.reactionGif?.url || localReactions.find((r) => r.isSelf)?.url || ''}
                        alt={challengerNickname}
                        width={48}
                        height={36}
                        className="h-8 w-12 rounded-cik-sm bg-cik-surface object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="cik-headline text-cik-cta">VS</div>
                <div className="rounded-cik-md bg-cik-surface-2 p-3">
                  <p className="cik-caption-2 truncate text-cik-text-2">
                    {opponentPlayer?.name || duelConfig.challengerName}
                  </p>
                  {duelPending ? (
                    <p
                      data-testid="duel-opponent-waiting"
                      className="cik-caption-2 mt-2 inline-flex items-center justify-center gap-1 rounded-cik-sm bg-cik-butter px-2 py-1 text-cik-butter-text"
                    >
                      <Clock size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{t.duelWaitingOpponentScore}</span>
                    </p>
                  ) : (
                    <>
                      <p className="cik-title-3 cik-tabular mt-1 text-cik-text">
                        {isRealServerDuel ? opponentScore : duelConfig.targetScore}
                      </p>
                      <p className="cik-caption-2 cik-tabular inline-flex items-center gap-1 text-cik-text-2">
                        <Clock size={16} strokeWidth={2} aria-hidden="true" />{' '}
                        {isRealServerDuel
                          ? typeof opponentElapsed === 'number'
                            ? `${opponentElapsed}s`
                            : '--'
                          : `${duelConfig.targetTimeSec ?? 28}s`}
                      </p>
                    </>
                  )}
                  {opponentPlayer?.reactionGif?.url && (
                    <div data-testid="share-opponent-reaction-badge" className="mt-2 flex justify-center">
                      <img
                        src={opponentPlayer.reactionGif.url}
                        alt={opponentPlayer.reactionGif.title || opponentPlayer.name}
                        width={48}
                        height={36}
                        className="h-8 w-12 rounded-cik-sm bg-cik-surface object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="share-reaction-drawer-toggle"
              onClick={() => {
                onButtonPop();
                setShowReactionDrawer((prev) => !prev);
              }}
              className="cik-footnote flex min-h-11 w-full items-center justify-between gap-2 rounded-cik-md bg-cik-surface px-4 text-cik-text shadow-e1 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
            >
              <span className="inline-flex items-center gap-2">
                <Film size={16} strokeWidth={2} aria-hidden="true" />
                <span>{lang === 'tr' ? 'GIF ile tepki' : 'Reaction GIF'}</span>
              </span>
              <span>{showReactionDrawer ? (lang === 'tr' ? 'Gizle' : 'Hide') : lang === 'tr' ? 'Aç' : 'Open'}</span>
            </button>

            {showReactionDrawer && (
              <GiphyReactionPicker
                compact
                lang={lang}
                onSelectGif={handleSendReaction}
                recentReactions={recentReactions}
                sending={sendingReaction}
              />
            )}
          </div>
        )}

        <div data-testid="wordle-share-card" className="mt-4 rounded-cik-lg bg-cik-surface p-5 text-center shadow-e1">
          <p className="cik-footnote text-cik-text-2">{t.shareCardHeader}</p>
          <div className="my-4 flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
            {results.map((ok, idx) => (
              <motion.span
                key={idx}
                initial={reduced ? { opacity: 1 } : { scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0.15 } : { ...motionSpring.reveal, delay: idx * 0.04 }}
                className={`h-8 w-8 rounded-cik-sm ${ok ? 'bg-cik-mint' : 'bg-cik-rose'}`}
              />
            ))}
          </div>
          <div className="cik-footnote inline-flex items-center gap-2 rounded-pill bg-cik-butter px-3 py-1 text-cik-butter-text">
            <Award size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {catMeta.emoji} {badgeLabel}
            </span>
          </div>
          <p
            data-testid="share-summary-text"
            className="cik-caption-2 mt-3 select-all rounded-cik-md bg-cik-surface-2 px-3 py-2 font-mono text-cik-text-2"
          >
            {shareSummaryLine}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button data-testid="copy-result-btn" className="w-full" onClick={handleCopy}>
            {copied ? <Check size={20} strokeWidth={2} aria-hidden="true" /> : <Copy size={20} strokeWidth={2} aria-hidden="true" />}
            <span>{copied ? t.shareCopiedBtn : t.shareCopyBtn}</span>
          </Button>

          {isDailyResult && (
            <Button tone="ghost" data-testid="daily-web-share-btn" className="w-full" onClick={() => void handleWebShare()}>
              <Share2 size={20} strokeWidth={2} aria-hidden="true" />
              <span>{shared ? (lang === 'tr' ? 'Paylaşıldı' : 'Shared') : lang === 'tr' ? 'Paylaş' : 'Share'}</span>
            </Button>
          )}

          {effectiveQuestionIds.length > 0 && (
            <>
              <Button
                data-testid="create-async-challenge-btn"
                disabled={challengeLoading}
                className="w-full"
                onClick={() => void handleCreateAsyncChallenge()}
              >
                {challengeCopied ? (
                  <Check size={20} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Share2 size={20} strokeWidth={2} aria-hidden="true" />
                )}
                <span>
                  {challengeLoading
                    ? lang === 'tr'
                      ? 'Meydan okuma hazırlanıyor...'
                      : 'Creating challenge...'
                    : challengeCopied
                      ? lang === 'tr'
                        ? 'Link kopyalandı!'
                        : 'Link copied!'
                      : lang === 'tr'
                        ? 'Meydan Oku / Link Paylaş'
                        : 'Challenge a Friend / Share Link'}
                </span>
              </Button>

              {challengeError && (
                <p
                  role="alert"
                  data-testid="async-challenge-error"
                  className="cik-footnote rounded-cik-md bg-cik-rose px-3 py-2 text-center text-cik-rose-text"
                >
                  {challengeError}
                </p>
              )}

              {challengeInfo && !challengeError && (
                <p className="cik-caption-1 text-center text-cik-text-2">{challengeInfo}</p>
              )}

              {challengeUrl && (
                <div
                  data-testid="async-challenge-url-box"
                  className="flex items-center justify-between gap-2 rounded-cik-md bg-cik-surface-2 px-3 py-2"
                >
                  <span className="cik-caption-2 truncate font-mono text-cik-text-2">
                    {challengeUrl}
                  </span>
                  <button
                    type="button"
                    data-testid="async-challenge-copy-btn"
                    onClick={async () => {
                      onButtonPop();
                      const didCopy = await copyTextToClipboard(challengeUrl);
                      if (didCopy) {
                        setChallengeInfo(null);
                        setChallengeCopied(true);
                        setTimeout(() => setChallengeCopied(false), 2500);
                      }
                    }}
                    className="cik-caption-1 inline-flex h-11 shrink-0 items-center gap-1 rounded-pill bg-cik-pink px-3 text-cik-cta"
                  >
                    {challengeCopied ? (
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Copy size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                    <span>
                      {challengeCopied
                        ? lang === 'tr'
                          ? 'Kopyalandı'
                          : 'Copied'
                        : lang === 'tr'
                          ? 'Kopyala'
                          : 'Copy'}
                    </span>
                  </button>
                </div>
              )}

              <Button tone="ghost" data-testid="copy-duel-from-result-btn" className="w-full" onClick={handleCopyDuelFromResult}>
                <Swords size={20} strokeWidth={2} aria-hidden="true" />
                <span>{duelCopied ? t.duelLinkCopied : t.duelCopyLinkBtn}</span>
              </Button>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onButtonPop}
              data-testid="share-whatsapp-btn"
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
            >
              <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t.shareWhatsAppBtn}</span>
            </a>
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onButtonPop}
              data-testid="share-x-btn"
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-cik-text px-4 text-cik-bg focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
            >
              <Share2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>{t.shareXBtn}</span>
            </a>
          </div>
        </div>

        {!authEmail && (
          <div
            data-testid="share-auth-cta"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-cik-lg bg-cik-surface p-4 shadow-e1"
          >
            <span className="cik-subhead text-cik-text">
              {lang === 'tr' ? 'Kazandığın XP’yi sakla' : 'Keep your earned XP'}
            </span>
            <Button
              onClick={() => {
                onButtonPop();
                window.dispatchEvent(new CustomEvent('scrolly-open-auth', { detail: { trigger: 'quiz' } }));
              }}
            >
              <Mail size={16} strokeWidth={2} aria-hidden="true" />
              <span>{lang === 'tr' ? 'Hesabı bağla' : 'Connect account'}</span>
            </Button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            tone="ghost"
            data-testid="quiz-play-again-btn"
            className="w-full"
            onClick={() => {
              onButtonPop();
              window.dispatchEvent(
                new CustomEvent('scrolly-quiz-replay', { detail: { quizMode: quizMode ?? 'memory' } })
              );
            }}
          >
            {t.quizPlayAgain}
          </Button>
          <Button
            data-testid="share-continue-btn"
            className="w-full"
            onClick={() => {
              onButtonPop();
              onClose();
            }}
          >
            <span>{t.quizBackToFeed}</span>
            <ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
      </motion.div>
      <Toast
        message={
          challengeCopied
            ? lang === 'tr'
              ? 'Link kopyalandı!'
              : 'Link copied!'
            : duelCopied
              ? t.duelLinkCopied
              : copied
                ? t.shareCopiedBtn
                : null
        }
      />
    </div>
  );
}
