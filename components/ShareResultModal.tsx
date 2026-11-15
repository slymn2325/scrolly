'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Clock,
  Copy,
  Film,
  MessageCircle,
  Share2,
  Swords,
} from 'lucide-react';
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
  challengerNickname?: string;
  playerId?: string;
  questionIds?: string[];
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
  challengerNickname = 'Merak Avcısı',
  playerId: propPlayerId,
  questionIds = [],
  duelConfig,
  onButtonPop,
  onClose,
}: ShareResultModalProps) {
  const [copied, setCopied] = useState(false);
  const [duelCopied, setDuelCopied] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(() =>
    duelConfig?.duelId && isShortRoomCode(duelConfig.duelId) ? duelConfig.duelId : null
  );
  const [polledRoom, setPolledRoom] = useState<ScrollaRoom | null>(null);
  const [showReactionDrawer, setShowReactionDrawer] = useState(false);
  const [sendingReaction, setSendingReaction] = useState(false);
  const [localReactions, setLocalReactions] = useState<GiphyReactionItemDisplay[]>([]);
  const pendingRoomRef = useRef<Promise<string | null> | null>(null);
  const t = translations[lang];

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

  const duelShareUrl = useMemo(() => {
    if (createdRoomCode) {
      return `${siteUrl}/?duel=${createdRoomCode}`;
    }
    return siteUrl;
  }, [createdRoomCode, siteUrl]);

  const fullShareText = useMemo(() => {
    if (createdRoomCode) {
      const codeLine =
        lang === 'tr'
          ? `🎮 Scrolla 1v1 Oda Kodu: ${createdRoomCode}`
          : `🎮 Scrolla 1v1 Room Code: ${createdRoomCode}`;
      return `${shareSummaryLine}\n${t.shareChallengeText}\n${codeLine}\n${duelShareUrl}`;
    }
    return `${shareSummaryLine}\n${t.shareChallengeText}\n${siteUrl}`;
  }, [createdRoomCode, duelShareUrl, lang, shareSummaryLine, siteUrl, t.shareChallengeText]);

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
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#A78BFA', '#34D399', '#FBBF24', '#FB7185', '#38BDF8'],
      });
    } catch {
      // Ignore confetti errors in headless environments
    }
  }, []);

  const handleCopy = async () => {
    onButtonPop();
    try {
      await navigator.clipboard.writeText(fullShareText);
    } catch {
      // Ignore clipboard error
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyDuelFromResult = async () => {
    onButtonPop();
    let shareUrl = duelShareUrl;
    if (!createdRoomCode && questionIds.length > 0) {
      const code = await ensureScrollaRoomCode();
      if (code) {
        shareUrl = `${siteUrl}/?duel=${code}`;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore clipboard error
    }
    setDuelCopied(true);
    setTimeout(() => setDuelCopied(false), 2500);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(fullShareText)}`;

  return (
    <div
      aria-labelledby="share-modal-title"
      data-testid="share-result-modal"
      data-presentation="page"
      className="absolute inset-0 z-30 flex h-full w-full flex-col overflow-hidden bg-[#FFFDF9] text-[#1E1B2E] dark:bg-[#1A162B] dark:text-white"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="no-scrollbar flex h-full w-full flex-col overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top,14px)+14px)] pb-[calc(env(safe-area-inset-bottom,16px)+24px)] sm:px-5 lg:pt-5"
      >
        <div className="mb-3 flex items-center justify-between border-b border-ink/10 pb-3 dark:border-white/10">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              onButtonPop();
              onClose();
            }}
            aria-label="Close modal"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-xs font-extrabold text-ink transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{lang === 'tr' ? 'Keşfe Dön' : 'Back to Feed'}</span>
          </motion.button>
        </div>

        {/* Celebration Header */}
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/80 via-rose-200/80 to-violet-200/80 p-1.5 shadow-sm dark:from-amber-500/20 dark:via-rose-500/20 dark:to-violet-500/20">
            <img
              src={
                duelConfig
                  ? STATE_ILLUSTRATION_PATHS.duelArena
                  : STATE_ILLUSTRATION_PATHS.quizCelebration
              }
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-9 w-9 object-contain drop-shadow-md"
            />
          </div>
          <h2
            id="share-modal-title"
            className="font-display text-xl font-bold text-ink dark:text-white sm:text-2xl"
          >
            {duelConfig
              ? duelPending
                ? t.duelPendingTitle
                : duelWon
                ? t.duelWonTitle
                : duelTie
                ? t.duelTieTitle
                : t.duelLostTitle
              : t.shareModalTitle}
          </h2>
          <p className="mt-1 text-xs font-medium text-ink/60 dark:text-violet-200/80 sm:text-sm">
            {t.shareModalScoreLabel}:{' '}
            <strong className="text-violet-700 dark:text-violet-300">
              {correctCount}/{totalCount}
            </strong>{' '}
            •{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              +{earnedXp} XP
            </strong>
          </p>
        </div>

        {/* VS Side-by-Side Comparison Card + Reaction GIF Drawer when playing a 1v1 Duel */}
        {duelConfig && (
          <div className="mt-3 space-y-2.5">
            <div
              data-testid="duel-vs-card"
              className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-white to-rose-50 p-3 shadow-sm dark:border-amber-600/60 dark:from-amber-950/40 dark:via-[#231D3A] dark:to-rose-950/40"
            >
              <p className="mb-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t.vsComparisonTitle}</span>
              </p>
              <div className="grid grid-cols-3 items-center gap-2 text-center">
                <div className="rounded-xl bg-white/90 p-2 shadow-sm dark:bg-white/10">
                  <p className="truncate text-[10px] font-bold text-ink/60 dark:text-violet-200">
                    {t.yourResult}
                  </p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    {earnedXp}
                  </p>
                  <p className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ink/60 dark:text-violet-200/80">
                    <Clock className="h-3 w-3" /> {elapsedSec}s
                  </p>
                  {(selfPlayer?.reactionGif?.url ||
                    localReactions.find((r) => r.isSelf)?.url) && (
                    <div
                      data-testid="share-self-reaction-badge"
                      className="mt-1.5 flex justify-center"
                    >
                      <img
                        src={
                          selfPlayer?.reactionGif?.url ||
                          localReactions.find((r) => r.isSelf)?.url ||
                          ''
                        }
                        alt={challengerNickname}
                        className="h-9 w-12 rounded-lg border border-violet-300/70 object-cover bg-[#0A0A0E]"
                      />
                    </div>
                  )}
                </div>

                <div className="font-display text-lg font-black text-rose-500">VS</div>

                <div className="rounded-xl bg-white/90 p-2 shadow-sm dark:bg-white/10">
                  <p className="truncate text-[10px] font-bold text-ink/60 dark:text-violet-200">
                    {opponentPlayer?.name || duelConfig.challengerName}
                  </p>
                  {duelPending ? (
                    <p
                      data-testid="duel-opponent-waiting"
                      className="mt-1 inline-flex items-center justify-center gap-1 rounded-lg bg-amber-100/90 px-1.5 py-1 text-[10px] font-bold leading-tight text-amber-900 animate-pulse dark:bg-amber-900/40 dark:text-amber-200"
                    >
                      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>{t.duelWaitingOpponentScore}</span>
                    </p>
                  ) : (
                    <>
                      <p className="mt-0.5 text-lg font-black tabular-nums text-violet-700 dark:text-violet-300">
                        {isRealServerDuel ? opponentScore : duelConfig.targetScore}
                      </p>
                      <p className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums text-ink/65 dark:text-violet-200/80">
                        <Clock className="h-3 w-3" />{' '}
                        {isRealServerDuel
                          ? typeof opponentElapsed === 'number'
                            ? `${opponentElapsed}s`
                            : '--'
                          : `${duelConfig.targetTimeSec ?? 28}s`}
                      </p>
                    </>
                  )}
                  {opponentPlayer?.reactionGif?.url && (
                    <div
                      data-testid="share-opponent-reaction-badge"
                      className="mt-1.5 flex justify-center"
                    >
                      <img
                        src={opponentPlayer.reactionGif.url}
                        alt={opponentPlayer.reactionGif.title || opponentPlayer.name}
                        className="h-9 w-12 rounded-lg border border-amber-300/70 object-cover bg-[#0A0A0E]"
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
              className="flex w-full items-center justify-between gap-2 rounded-2xl border border-violet-300/70 bg-violet-50/80 px-3.5 py-2 text-xs font-extrabold text-violet-900 transition hover:bg-violet-100/80 dark:border-violet-600/50 dark:bg-violet-950/45 dark:text-violet-100"
            >
              <span className="inline-flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                <span>{lang === 'tr' ? 'GIF ile Tepki Gönder' : 'Send Reaction GIF'}</span>
              </span>
              <span className="text-[11px] font-black text-violet-600 dark:text-violet-300">
                {showReactionDrawer
                  ? lang === 'tr'
                    ? 'Gizle'
                    : 'Hide'
                  : lang === 'tr'
                    ? 'Aç'
                    : 'Open'}
              </span>
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

        {/* Wordle-Style Shareable Result Box */}
        <div
          data-testid="wordle-share-card"
          className="mt-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-pastel-lavender/60 via-white to-pastel-mint/60 p-3 text-center shadow-sm dark:border-violet-700/60 dark:from-violet-950/60 dark:via-[#221C38] dark:to-teal-950/50"
        >
          <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            {t.shareCardHeader}
          </p>

          <div className="my-2 flex flex-wrap items-center justify-center gap-1.5 text-xl tracking-widest sm:text-2xl">
            {results.map((ok, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.06 + idx * 0.07, type: 'spring', stiffness: 360 }}
              >
                {ok ? '🟩' : '🟥'}
              </motion.span>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-pastel-sun px-3 py-1 text-xs font-extrabold text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/50 dark:text-amber-200">
            <Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            <span>
              {catMeta.emoji} {badgeLabel}
            </span>
          </div>

          <p
            data-testid="share-summary-text"
            className="mt-2 select-all rounded-xl bg-white/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-ink/80 dark:bg-black/30 dark:text-violet-100"
          >
            {shareSummaryLine}
          </p>
        </div>

        {/* One-Click Sharing + 1v1 Duel Challenge Generator */}
        <div className="mt-3 flex flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleCopy}
            data-testid="copy-result-btn"
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold shadow-pill transition-colors sm:text-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'border-2 border-ink bg-white text-ink hover:bg-slate-50 dark:border-violet-400 dark:bg-white/10 dark:text-white'
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? t.shareCopiedBtn : t.shareCopyBtn}</span>
          </motion.button>

          {questionIds.length > 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleCopyDuelFromResult}
              data-testid="copy-duel-from-result-btn"
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold transition-colors ${
                duelCopied
                  ? 'bg-emerald-600 text-white'
                  : 'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              <Swords className="h-4 w-4" />
              <span>{duelCopied ? t.duelLinkCopied : t.duelCopyLinkBtn}</span>
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.94 }}
              onClick={onButtonPop}
              data-testid="share-whatsapp-btn"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white shadow-pill hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.shareWhatsAppBtn}</span>
            </motion.a>

            <motion.a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.94 }}
              onClick={onButtonPop}
              data-testid="share-x-btn"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#111827] px-3 py-2 text-xs font-extrabold text-white shadow-pill hover:bg-black"
            >
              <Share2 className="h-4 w-4" />
              <span>{t.shareXBtn}</span>
            </motion.a>
          </div>
        </div>

        {/* Continue Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onClose();
          }}
          data-testid="share-continue-btn"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 py-2.5 text-sm font-extrabold text-white shadow-cozy hover:bg-violet-700"
        >
          <span>{t.shareContinueBtn}</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}
