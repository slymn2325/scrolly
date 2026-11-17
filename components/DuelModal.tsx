'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Toast } from '@/components/cikartma';
import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Film,
  LogIn,
  MessageCircle,
  Play,
  Rocket,
  Share2,
  ShieldAlert,
  Sparkles,
  Swords,
  UserMinus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import GiphyReactionPicker, {
  type GiphyReactionItemDisplay,
  type ReactionGifSelection,
} from '@/components/GiphyReactionPicker';
import {
  CATEGORIES,
  CATEGORY_SELECTOR_OPTIONS,
  type CategoryFilter,
  type Language,
  translations,
} from '@/i18n/translations';
import {
  isShortRoomCode,
  normalizeRoomCode,
  type ScrollaPlayer,
  type ScrollaRoom,
} from '@/lib/duelStore';
import { isGenericDefaultNickname } from '@/utils/userMemory';
import { duelInviteUrl } from '@/utils/viralShare';
import type { FactCard } from '@/types/fact';
import type { DuelKind, DuelPayload } from '@/utils/duelCodec';
import {
  completeScrollaRoom,
  createScrollaRoom,
  DUEL_QUESTION_COUNTS,
  fetchScrollaRoom,
  getOrCreateScrollaPlayerId,
  kickScrollaPlayer,
  leaveScrollaRoom,
  pickDuelQuestionIds,
  resolveDuelPackItems,
  sendScrollaReaction,
  setSelfScrollaReady,
  startScrollaRoom,
  joinScrollaRoom,
} from '@/utils/duelLobby';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';
import { useEscapeClose } from '@/utils/useEscapeClose';

export interface DuelChallengeConfig {
  factIds: string[];
  challengerName: string;
  targetScore: number;
  targetTimeSec?: number;
  kind?: DuelKind;
  duelId?: string;
  category?: CategoryFilter;
  questionCount?: number;
  isBotPractice?: boolean;
  myPlayerId?: string;
}

interface DuelModalProps {
  open: boolean;
  lang: Language;
  defaultNickname?: string;
  playerId?: string;
  seedFact: FactCard;
  allFacts: FactCard[];
  incomingDuel?: DuelPayload | null;
  initialRoomCode?: string | null;
  onClearRoomCode?: () => void;
  presentation?: 'modal' | 'page';
  onStartDuel: (config: DuelChallengeConfig) => void;
  onClose: () => void;
  onButtonPop: () => void;
}

type DuelPhase = 'setup' | 'lobby';

function estimateTargetScore(questionCount: number): number {
  return Math.max(200, questionCount * 92);
}

function estimateTargetTime(questionCount: number): number {
  return Math.max(18, questionCount * 6);
}

const BOT_PLAYER_ID = 'scrolla-local-bot';

function createSimulatedBotPlayer(lang: Language): ScrollaPlayer {
  return {
    id: BOT_PLAYER_ID,
    name: lang === 'tr' ? 'Scrolla Bot (Test)' : 'Scrolla Bot (Test)',
    emoji: '🤖',
    ready: true,
    score: null,
    finishedAt: null,
    joinedAt: new Date().toISOString(),
  };
}

export { completeScrollaRoom };

export default function DuelModal({
  open,
  lang,
  defaultNickname,
  playerId: propPlayerId,
  seedFact,
  allFacts,
  incomingDuel = null,
  initialRoomCode = null,
  onClearRoomCode,
  presentation = 'modal',
  onStartDuel,
  onClose,
  onButtonPop,
}: DuelModalProps) {
  const t = translations[lang];
  const isPage = presentation === 'page';
  const myPlayerId = useMemo(() => getOrCreateScrollaPlayerId(propPlayerId), [propPlayerId]);

  const [nickname, setNickname] = useState<string>(defaultNickname || t.duelDefaultName);
  const [category, setCategory] = useState<CategoryFilter>(
    (seedFact.category as CategoryFilter) || 'all'
  );
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [phase, setPhase] = useState<DuelPhase>('setup');
  const [room, setRoom] = useState<ScrollaRoom | null>(null);
  const [isBotPractice, setIsBotPractice] = useState(false);
  const [botLocalRoom, setBotLocalRoom] = useState<ScrollaRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [showReactionDrawer, setShowReactionDrawer] = useState(false);
  const [sendingReaction, setSendingReaction] = useState(false);

  const serverOffsetMsRef = useRef<number>(0);
  const matchLaunchedRef = useRef<string | null>(null);
  const autoJoinedCodeRef = useRef<string | null>(null);

  const cleanName = (nickname || defaultNickname || t.duelDefaultName).trim().slice(0, 24);
  const cleanNameRef = useRef(cleanName);
  cleanNameRef.current = cleanName;
  const wasOpenRef = useRef(false);

  useEscapeClose(open && !isPage, onClose);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadImg = new window.Image();
    preloadImg.decoding = 'sync';
    preloadImg.src = STATE_ILLUSTRATION_PATHS.duelArena;
  }, []);

  const activeRoom = useMemo<ScrollaRoom | null>(() => {
    if (botLocalRoom) return botLocalRoom;
    if (!room) return null;
    if (isBotPractice && room.players.length < 2) {
      return {
        ...room,
        players: [...room.players, createSimulatedBotPlayer(lang)],
      };
    }
    return room;
  }, [botLocalRoom, isBotPractice, lang, room]);

  const applyRoomSync = useCallback((nextRoom: ScrollaRoom, serverNowMs?: number) => {
    if (typeof serverNowMs === 'number' && Number.isFinite(serverNowMs)) {
      serverOffsetMsRef.current = serverNowMs - Date.now();
    }
    if (nextRoom.players.length >= 2) {
      setIsBotPractice(false);
      setBotLocalRoom(null);
    }
    setRoom(nextRoom);
  }, []);

  const joinRoomByCode = useCallback(
    async (rawCode: string) => {
      const code = normalizeRoomCode(rawCode);
      if (!isShortRoomCode(code)) {
        setErrorMsg(
          lang === 'tr'
            ? 'Geçerli 6 haneli bir oda kodu gir (ör. K8M2P9).'
            : 'Enter a valid 6-character room code (e.g. K8M2P9).'
        );
        return;
      }

      setBusyAction('join');
      setErrorMsg(null);
      const res = await joinScrollaRoom(code, {
        playerId: myPlayerId,
        name: cleanName,
      });
      setBusyAction(null);

      if (!res.ok || !res.room) {
        if (res.error === 'kicked_by_host') {
          setErrorMsg(
            lang === 'tr'
              ? 'Lobi lideri seni bu odadan çıkardı.'
              : 'The room leader removed you from this room.'
          );
        } else if (res.error === 'room_full') {
          setErrorMsg(
            lang === 'tr' ? 'Bu Scrolla odası dolu (2/2).' : 'This Scrolla room is already full (2/2).'
          );
        } else if (res.error === 'match_already_started') {
          setErrorMsg(
            lang === 'tr' ? 'Bu maç çoktan başladı.' : 'This match has already started.'
          );
        } else {
          setErrorMsg(
            lang === 'tr'
              ? 'Oda bulunamadı veya süresi doldu.'
              : 'Room not found or expired.'
          );
        }
        return;
      }

      matchLaunchedRef.current = null;
      setIsBotPractice(false);
      setBotLocalRoom(null);
      applyRoomSync(res.room, res.serverNowMs);
      setPhase('lobby');
    },
    [applyRoomSync, cleanName, lang, myPlayerId]
  );

  // Initialize modal fields strictly when opening (never reset nickname while user types or polling ticks)
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      autoJoinedCodeRef.current = null;
      return;
    }
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setNickname(defaultNickname || t.duelDefaultName);
      setCopied(false);
      setErrorMsg(null);
      setIsBotPractice(false);
      setBotLocalRoom(null);
      setShowReactionDrawer(false);
      setSendingReaction(false);
    }
  }, [open, defaultNickname, t.duelDefaultName]);

  useEffect(() => {
    if (!open || !defaultNickname) return;
    setNickname((current) =>
      isGenericDefaultNickname(current) ? defaultNickname : current
    );
  }, [defaultNickname, open]);

  // Sync incoming room code (?duel=K8M2P9) or legacy base64 payload once per open/code
  useEffect(() => {
    if (!open) return;

    const normalizedInitial = initialRoomCode ? normalizeRoomCode(initialRoomCode) : '';
    if (normalizedInitial && isShortRoomCode(normalizedInitial)) {
      if (autoJoinedCodeRef.current !== normalizedInitial) {
        autoJoinedCodeRef.current = normalizedInitial;
        setJoinCodeInput(normalizedInitial);
        void joinRoomByCode(normalizedInitial);
      }
      return;
    }

    if (incomingDuel && incomingDuel.cardIds.length > 0 && !room && autoJoinedCodeRef.current !== '__legacy__') {
      autoJoinedCodeRef.current = '__legacy__';
      // Legacy base64 share URL compatibility -> convert smoothly to a Scrolla server room
      void createScrollaRoom({
        hostId: myPlayerId,
        hostName: cleanNameRef.current,
        category: (incomingDuel.category as CategoryFilter) || 'all',
        questionCount: incomingDuel.questionCount || incomingDuel.cardIds.length || 5,
        cardIds: incomingDuel.cardIds,
      }).then((res) => {
        if (res.ok && res.room) {
          applyRoomSync(res.room, res.serverNowMs);
          setPhase('lobby');
        }
      });
    }
  }, [
    open,
    initialRoomCode,
    incomingDuel,
    room,
    myPlayerId,
    joinRoomByCode,
    applyRoomSync,
  ]);

  // Real-time room polling every 850ms while inside server lobby/countdown
  useEffect(() => {
    if (!open || phase !== 'lobby' || !room?.code || botLocalRoom) return;
    let active = true;

    const poll = async () => {
      const res = await fetchScrollaRoom(room.code, myPlayerId);
      if (!active) return;

      if (res.kicked) {
        setRoom(null);
        setIsBotPractice(false);
        setBotLocalRoom(null);
        setPhase('setup');
        setCountdownSec(null);
        autoJoinedCodeRef.current = null;
        onClearRoomCode?.();
        setErrorMsg(
          lang === 'tr'
            ? 'Lobi lideri seni odadan çıkardı.'
            : 'You were removed by the room leader.'
        );
        return;
      }

      if (res.ok && res.room) {
        applyRoomSync(res.room, res.serverNowMs);
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 850);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [open, phase, room?.code, botLocalRoom, myPlayerId, applyRoomSync, lang, onClearRoomCode]);

  // Synchronized 5-second server-timestamp countdown (`startsAt = serverNow + 5000`)
  useEffect(() => {
    if (!open || phase !== 'lobby' || !activeRoom) {
      setCountdownSec(null);
      return;
    }

    const launchMatch = () => {
      if (matchLaunchedRef.current === activeRoom.code) return;
      matchLaunchedRef.current = activeRoom.code;
      const opponent = activeRoom.players.find((p) => p.id !== myPlayerId);
      const isBotMatch = Boolean(
        botLocalRoom ||
          isBotPractice ||
          activeRoom.players.some((p) => p.id === BOT_PLAYER_ID)
      );
      const hasServerRoom = Boolean(
        room &&
          room.code === activeRoom.code &&
          isShortRoomCode(room.code) &&
          !isBotMatch
      );
      onStartDuel({
        factIds: activeRoom.cardIds,
        challengerName: opponent?.name || activeRoom.players[0]?.name || cleanName,
        targetScore: isBotMatch ? estimateTargetScore(activeRoom.questionCount) : 0,
        targetTimeSec: isBotMatch ? estimateTargetTime(activeRoom.questionCount) : undefined,
        kind: '1v1',
        duelId: hasServerRoom ? activeRoom.code : undefined,
        category: activeRoom.category,
        questionCount: activeRoom.questionCount,
        isBotPractice: isBotMatch,
        myPlayerId,
      });
    };

    if (activeRoom.status === 'started') {
      setCountdownSec(0);
      launchMatch();
      return;
    }

    if (activeRoom.status !== 'countdown' || !activeRoom.startsAt) {
      setCountdownSec(null);
      return;
    }

    const targetMs = Date.parse(activeRoom.startsAt);
    if (!Number.isFinite(targetMs)) {
      setCountdownSec(null);
      return;
    }

    const tick = () => {
      const estimatedServerNow = botLocalRoom
        ? Date.now()
        : Date.now() + serverOffsetMsRef.current;
      const remainingMs = targetMs - estimatedServerNow;
      if (remainingMs <= 0) {
        setCountdownSec(0);
        launchMatch();
        return;
      }
      const nextSec = Math.min(5, Math.max(1, Math.ceil(remainingMs / 1000)));
      setCountdownSec(nextSec);
    };

    tick();
    const timer = window.setInterval(tick, 120);
    return () => window.clearInterval(timer);
  }, [open, phase, activeRoom, botLocalRoom, myPlayerId, cleanName, onStartDuel]);

  const handleCreateRoom = async () => {
    onButtonPop();
    setErrorMsg(null);
    const chosenCardIds = pickDuelQuestionIds(
      allFacts,
      category,
      questionCount,
      `${myPlayerId}-${Date.now()}`
    );

    if (isBotPractice) {
      const nowIso = new Date().toISOString();
      const localRoom: ScrollaRoom = {
        code: 'LOCAL-BOT',
        mode: 'duel',
        category,
        questionCount: chosenCardIds.length || questionCount,
        cardIds: chosenCardIds,
        hostId: myPlayerId,
        players: [
          {
            id: myPlayerId,
            name: cleanName,
            emoji: '⚡',
            ready: false,
            score: null,
            finishedAt: null,
            joinedAt: nowIso,
          },
          createSimulatedBotPlayer(lang),
        ],
        kickedIds: [],
        status: 'lobby',
        startsAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      matchLaunchedRef.current = null;
      setRoom(null);
      setBotLocalRoom(localRoom);
      setPhase('lobby');
      return;
    }

    setBusyAction('create');
    const res = await createScrollaRoom({
      hostId: myPlayerId,
      hostName: cleanName,
      category,
      questionCount,
      cardIds: chosenCardIds.length >= 2 ? chosenCardIds : undefined,
    });
    setBusyAction(null);

    if (!res.ok || !res.room) {
      setErrorMsg(
        lang === 'tr'
          ? 'Oda kurulamadı, lütfen tekrar dene.'
          : 'Could not create room, please retry.'
      );
      return;
    }

    matchLaunchedRef.current = null;
    autoJoinedCodeRef.current = res.room.code;
    setBotLocalRoom(null);
    applyRoomSync(res.room, res.serverNowMs);
    setPhase('lobby');
  };

  const handleToggleSelfReady = async () => {
    if (!activeRoom) return;
    onButtonPop();
    const self = activeRoom.players.find((p) => p.id === myPlayerId);
    if (!self) return;

    if (botLocalRoom) {
      setBotLocalRoom((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((p) =>
                p.id === myPlayerId ? { ...p, ready: !p.ready } : p
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
      return;
    }

    if (!room) return;
    setBusyAction('ready');
    const res = await setSelfScrollaReady(room.code, myPlayerId, !self.ready);
    setBusyAction(null);
    if (res.ok && res.room) {
      applyRoomSync(res.room, res.serverNowMs);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleKickOpponent = async (targetId: string) => {
    if (!activeRoom || activeRoom.hostId !== myPlayerId) return;
    onButtonPop();

    if (targetId === BOT_PLAYER_ID) {
      setIsBotPractice(false);
      if (botLocalRoom) {
        setBotLocalRoom((prev) =>
          prev
            ? {
                ...prev,
                players: prev.players.filter((p) => p.id !== BOT_PLAYER_ID),
                updatedAt: new Date().toISOString(),
              }
            : prev
        );
      }
      return;
    }

    if (!room) return;
    setBusyAction(`kick-${targetId}`);
    const res = await kickScrollaPlayer(room.code, myPlayerId, targetId);
    setBusyAction(null);
    if (res.ok && res.room) {
      applyRoomSync(res.room, res.serverNowMs);
    }
  };

  const handleEnableBotInLobby = () => {
    onButtonPop();
    setIsBotPractice(true);
    if (botLocalRoom && !botLocalRoom.players.some((p) => p.id === BOT_PLAYER_ID)) {
      setBotLocalRoom((prev) =>
        prev
          ? {
              ...prev,
              players: [...prev.players, createSimulatedBotPlayer(lang)],
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
    }
  };

  const handleHostStart = async () => {
    if (!activeRoom || activeRoom.hostId !== myPlayerId) return;
    onButtonPop();
    setErrorMsg(null);

    if (botLocalRoom || isBotPractice) {
      const everyoneReady =
        activeRoom.players.length === 2 && activeRoom.players.every((p) => p.ready);
      if (!everyoneReady) {
        setErrorMsg(
          lang === 'tr'
            ? 'Başlamak için önce "Hazır Ol" butonuna bas.'
            : 'Press "Ready Up" first to start.'
        );
        return;
      }
      const startsAt = new Date(Date.now() + 5000).toISOString();
      serverOffsetMsRef.current = 0;
      setBotLocalRoom({
        ...activeRoom,
        status: 'countdown',
        startsAt,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!room) return;
    setBusyAction('start');
    const res = await startScrollaRoom(room.code, myPlayerId);
    setBusyAction(null);
    if (res.ok && res.room) {
      applyRoomSync(res.room, res.serverNowMs);
    } else if (res.error) {
      setErrorMsg(
        res.error === 'players_not_ready'
          ? lang === 'tr'
            ? 'İki oyuncu da Hazır Ol basmalı.'
            : 'Both players must press Ready Up.'
          : res.error
      );
    }
  };

  const lobbyReactions = useMemo<GiphyReactionItemDisplay[]>(() => {
    if (!activeRoom) return [];
    return activeRoom.players
      .filter((player) => Boolean(player.reactionGif?.url))
      .map((player) => ({
        senderName: player.name,
        url: player.reactionGif!.url,
        title: player.reactionGif?.title,
        isSelf: player.id === myPlayerId,
      }));
  }, [activeRoom, myPlayerId]);

  const handleSendReaction = async (gif: ReactionGifSelection) => {
    if (!activeRoom || sendingReaction) return;
    onButtonPop();
    const sentAt = new Date().toISOString();

    if (botLocalRoom || !room || !isShortRoomCode(activeRoom.code)) {
      setBotLocalRoom((prev) =>
        prev
          ? {
              ...prev,
              players: prev.players.map((player) =>
                player.id === myPlayerId
                  ? {
                      ...player,
                      reactionGif: {
                        url: gif.url,
                        title: gif.title,
                        sentAt,
                      },
                    }
                  : player
              ),
              updatedAt: sentAt,
            }
          : prev
      );
      return;
    }

    setSendingReaction(true);
    const res = await sendScrollaReaction(activeRoom.code, myPlayerId, {
      url: gif.url,
      title: gif.title,
    });
    setSendingReaction(false);
    if (res.ok && res.room) {
      applyRoomSync(res.room, res.serverNowMs);
    }
  };

  const handleLeaveLobby = async () => {
    onButtonPop();
    const code = room?.code;
    setPhase('setup');
    setRoom(null);
    setBotLocalRoom(null);
    setIsBotPractice(false);
    setCountdownSec(null);
    setShowReactionDrawer(false);
    setSendingReaction(false);
    autoJoinedCodeRef.current = null;
    onClearRoomCode?.();
    if (code) {
      void leaveScrollaRoom(code, myPlayerId);
    }
  };

  const duelUrl = useMemo(() => {
    if (!room || botLocalRoom) return '';
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    return duelInviteUrl(room.code, lang === 'en' ? 'en' : 'tr', origin);
  }, [botLocalRoom, room]);

  const handleCopyDuel = async () => {
    if (!duelUrl) return;
    onButtonPop();
    try {
      await navigator.clipboard.writeText(duelUrl);
    } catch {
      // Ignore clipboard failure
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyRoomCode = async () => {
    if (!activeRoom) return;
    const code = botLocalRoom && !room ? 'BOT-TEST' : activeRoom.code;
    onButtonPop();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Ignore clipboard failure
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1600);
  };

  const isHost = Boolean(activeRoom && activeRoom.hostId === myPlayerId);
  const bothSeated = Boolean(activeRoom && activeRoom.players.length === 2);
  const allReady = Boolean(
    activeRoom && bothSeated && activeRoom.players.every((p) => p.ready)
  );
  const readyCount = activeRoom ? activeRoom.players.filter((p) => p.ready).length : 0;
  const packPreviewItems = useMemo(
    () => (activeRoom ? resolveDuelPackItems(allFacts, activeRoom.cardIds, lang) : []),
    [activeRoom, allFacts, lang]
  );

  const challengeText = activeRoom
    ? lang === 'tr'
      ? `⚔️ ${cleanName} seni Scrolla 1v1 arenasına çağırıyor! Oda Kodu: ${activeRoom.code} (${activeRoom.questionCount} soru)\n${duelUrl}`
      : `⚔️ ${cleanName} challenged you to Scrolla 1v1 Arena! Room Code: ${activeRoom.code} (${activeRoom.questionCount} qs)\n${duelUrl}`
    : '';

  const reduced = useReducedMotion() === true;
  const shellClass = isPage
    ? 'absolute inset-0 z-content flex h-full w-full flex-col bg-cik-bg text-cik-text'
    : 'absolute inset-0 z-modal flex h-full w-full items-center justify-center bg-cik-text/30 p-4';

  const panelClass = isPage
    ? 'relative flex h-full w-full flex-col overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:px-6 lg:px-8 lg:pb-8 lg:pt-8'
    : 'relative max-h-[84dvh] w-full max-w-xl overflow-y-auto rounded-sheet bg-cik-bg-elevated p-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-cik-text shadow-e3';

  if (!open) return null;

  return (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={t.duelTitle}
          data-testid="duel-modal"
          data-presentation={presentation}
          className={shellClass}
        >
          <motion.div
            initial={reduced || isPage ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 38 }}
            className={panelClass}
          >
            {!isPage && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close"
                data-testid="duel-close-btn"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-cik-surface-2 text-cik-text-2 hover:bg-cik-surface-2"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {/* Gamified Scrolla Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-amber-500/25 p-1.5 shadow-sm ring-1 ring-amber-400/35">
                  <img
                    src={STATE_ILLUSTRATION_PATHS.duelArena}
                    alt=""
                    aria-hidden="true"
                    width={36}
                    height={36}
                    loading="eager"
                    decoding="sync"
                    className="h-9 w-9 object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-black tracking-tight text-cik-text">
                      {t.duelTitle}
                    </h2>
                    <span className="cik-caption-2 rounded-pill bg-cik-cta px-2 py-1 text-cik-on-cta">
                      {lang === 'tr' ? 'Canlı' : 'Live'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-cik-text-2">
                    {t.duelSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                data-testid="duel-error-banner"
                className="mt-3 flex items-center gap-2 rounded-2xl border border-cik-line bg-cik-rose px-3 py-2 text-xs font-bold text-cik-rose-text"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {phase === 'setup' && (
              <div className="mt-4 flex flex-col gap-4">
                <section className="rounded-cik-lg bg-cik-surface p-5 shadow-e1">
                <h3 className="cik-title-3 mb-4 text-cik-text">{t.duelCreateTitle}</h3>
                {/* Nickname */}
                <div>
                  <label
                    htmlFor="duel-nickname-input"
                    className="block text-xs font-extrabold text-cik-text-2"
                  >
                    {t.duelNameLabel}
                  </label>
                  <input
                    id="duel-nickname-input"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={24}
                    className="mt-1.5 w-full rounded-2xl border border-cik-line bg-cik-bg-elevated px-3.5 py-2.5 text-sm font-bold text-cik-text focus:border-violet-500 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
                  />
                </div>

                {/* Category + Count + Create */}
                <div>
                  <p className="text-xs font-extrabold text-cik-text-2">
                    {lang === 'tr' ? 'Arena Kategorisi' : 'Arena Topic'}
                  </p>
                  <div data-testid="duel-category-picker" className="mt-2 flex flex-wrap gap-1.5">
                    {CATEGORY_SELECTOR_OPTIONS.map((cat) => {
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          data-testid={`duel-category-${cat.id}`}
                          onClick={() => {
                            onButtonPop();
                            setCategory(cat.id);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 cik-caption-2 font-extrabold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                            active
                              ? 'border-cik-line bg-ink text-cik-on-cta'
                              : 'border-cik-line bg-cik-bg-elevated text-cik-text'
                          }`}
                        >
                          <img
                            src={cat.iconPath}
                            alt=""
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 object-contain"
                          />
                          <span>{cat.label[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-extrabold text-cik-text-2">
                    {lang === 'tr' ? 'Soru Sayısı' : 'Question Count'}
                  </p>
                  <div data-testid="duel-count-picker" className="mt-2 grid grid-cols-4 gap-2">
                    {DUEL_QUESTION_COUNTS.map((count) => {
                      const active = questionCount === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          data-testid={`duel-count-${count}`}
                          onClick={() => {
                            onButtonPop();
                            setQuestionCount(count);
                          }}
                          className={`min-h-[44px] rounded-2xl border-2 text-sm font-black transition ${
                            active
                              ? 'border-cik-line bg-ink text-cik-on-cta'
                              : 'border-cik-line bg-cik-bg-elevated text-cik-text'
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Explicit solo practice toggle (real P2P online lobby stays default) */}
                <div className="rounded-2xl border border-cik-line bg-cik-bg-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cik-text">
                        <Bot className="h-3.5 w-3.5 text-cik-cta" />
                        <span>
                          {lang === 'tr'
                            ? 'Yerel Test / Bot Rakip ile Dene'
                            : 'Practice with Local Bot Opponent'}
                        </span>
                      </p>
                      <p className="mt-0.5 cik-caption-2 font-medium text-cik-text-3">
                        {lang === 'tr'
                          ? 'Varsayılan mod gerçek 2 oyunculu odadır; solo test için açabilirsin.'
                          : 'Default creates a live 2-player room; enable this for instant solo practice.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isBotPractice}
                      data-testid="duel-bot-toggle-setup"
                      onClick={() => {
                        onButtonPop();
                        setIsBotPractice((prev) => !prev);
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors ${
                        isBotPractice
                          ? 'border-violet-600 bg-cik-cta'
                          : 'border-cik-line bg-cik-pink'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-cik-bg-elevated shadow transition-transform ${
                          isBotPractice ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={busyAction === 'create'}
                  onClick={() => void handleCreateRoom()}
                  data-testid="duel-create-lobby-btn"
                  className="cik-headline flex w-full min-h-14 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta shadow-sticker disabled:opacity-40"
                >
                  <Swords className="h-4 w-4 shrink-0" />
                  <span>
                    {busyAction === 'create'
                      ? lang === 'tr'
                        ? 'Oda kuruluyor...'
                        : 'Creating room...'
                      : isBotPractice
                        ? lang === 'tr'
                          ? 'Bot Rakip ile Odayı Aç'
                          : 'Open Solo Bot Lobby'
                        : lang === 'tr'
                          ? 'Scrolla Odası Kur'
                          : 'Create Scrolla Room'}
                  </span>
                </motion.button>
                </section>

                {/* Join existing room by 6-char code */}
                <section className="rounded-cik-lg bg-cik-surface p-5 shadow-e1">
                  <p className="cik-title-3 text-cik-text">{t.duelJoinTitle}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(normalizeRoomCode(e.target.value))}
                      placeholder="K8M2P9"
                      maxLength={6}
                      data-testid="duel-join-code-input"
                      aria-label={t.duelJoinTitle}
                      className="cik-title-3 min-h-14 min-w-0 flex-1 rounded-cik-md border border-cik-line bg-cik-bg-elevated px-4 font-mono tracking-widest text-cik-text uppercase focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
                    />
                    <Button
                      data-testid="duel-join-code-btn"
                      disabled={busyAction === 'join' || normalizeRoomCode(joinCodeInput).length !== 6}
                      onClick={() => void joinRoomByCode(joinCodeInput)}
                    >
                      <LogIn size={20} strokeWidth={2} aria-hidden="true" />
                      <span>{lang === 'tr' ? 'Katıl' : 'Join'}</span>
                    </Button>
                  </div>
                </section>
              </div>
            )}

            {phase === 'lobby' && activeRoom && (
              <div className="mt-4 space-y-3.5">
                {/* Room code badge */}
                <div
                  data-testid="duel-lobby-meta"
                  className="flex items-center justify-between gap-4 rounded-cik-lg bg-cik-surface p-5 shadow-e1"
                >
                  <div>
                    <p className="cik-footnote text-cik-text-2">
                      {botLocalRoom && !room
                        ? lang === 'tr'
                          ? 'Yerel Antrenman Modu'
                          : 'Local Practice Mode'
                        : lang === 'tr'
                          ? 'Scrolla Oda Kodu'
                          : 'Scrolla Room Code'}
                    </p>
                    <button
                      type="button"
                      data-testid="duel-room-code"
                      onClick={() => void handleCopyRoomCode()}
                      className="mt-1 block bg-transparent text-left font-mono text-[28px] leading-[34px] tracking-[0.16em] text-cik-text focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
                    >
                      {botLocalRoom && !room ? 'BOT-TEST' : activeRoom.code}
                    </button>
                  </div>
                  <div className="text-right text-xs font-bold text-cik-text-2">
                    <p>{activeRoom.questionCount} {lang === 'tr' ? 'soru' : 'qs'}</p>
                    <p className="cik-caption-2 uppercase">
                      {activeRoom.category === 'all'
                        ? lang === 'tr'
                          ? 'Karma'
                          : 'Mixed'
                        : CATEGORY_SELECTOR_OPTIONS.find((c) => c.id === activeRoom.category)?.label[lang] ||
                          CATEGORIES.find((c) => c.id === activeRoom.category)?.label[lang] ||
                          activeRoom.category}
                    </p>
                  </div>
                </div>

                {/* Human-readable Shared Pack ("Ortak paket") preview — never raw IDs */}
                <div
                  data-testid="duel-shared-pack"
                  className="rounded-2xl border border-cik-line bg-cik-surface px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 cik-caption-2 font-black uppercase tracking-wider text-cik-text-3">
                    <span>{lang === 'tr' ? 'Ortak paket' : 'Shared pack'}</span>
                    <span>
                      {activeRoom.questionCount} {lang === 'tr' ? 'kart' : 'cards'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-cik-text">
                    {packPreviewItems.join(' · ')}
                  </p>
                </div>

                {/* Synchronized 5-second countdown spotlight */}
                {countdownSec !== null && countdownSec > 0 && (
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    data-testid="duel-countdown-banner"
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-cik-berry bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-4 py-4 text-center text-cik-on-cta shadow-lg"
                  >
                    <p className="inline-flex items-center gap-1.5 cik-caption-2 font-black uppercase tracking-widest text-amber-100">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{lang === 'tr' ? 'Arena Başlıyor' : 'Arena Starting'}</span>
                    </p>
                    <p
                      data-testid="duel-countdown-number"
                      className="mt-1 font-display text-4xl font-black tabular-nums drop-shadow"
                    >
                      {countdownSec}
                    </p>
                  </motion.div>
                )}

                {/* Players list (2 slots max, ONLY own Ready button, Host kick on opponent) */}
                <div data-testid="duel-lobby-players" className="space-y-2">
                  {activeRoom.players.map((player) => {
                    const isMe = player.id === myPlayerId;
                    const playerIsHost = player.id === activeRoom.hostId;
                    return (
                      <div
                        key={player.id}
                        data-testid={`duel-player-${player.id}`}
                        className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 ${
                          isMe
                            ? 'border-cik-berry bg-cik-pink'
                            : 'border-cik-line bg-cik-bg-elevated'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cik-surface-2 text-lg">
                            {player.id === BOT_PLAYER_ID || player.emoji === '🤖' ? (
                              <Bot className="h-5 w-5 text-cik-cta" aria-hidden="true" />
                            ) : player.emoji && player.emoji !== '⚡' ? (
                              player.emoji
                            ) : (
                              <Zap className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="cik-headline text-cik-text">
                                {player.name}
                              </p>
                              {isMe && (
                                <span className="rounded-full bg-cik-cta px-1.5 py-0.5 cik-caption-2 font-black text-cik-on-cta">
                                  {t.youTag}
                                </span>
                              )}
                              {playerIsHost && (
                                <span
                                  data-testid="duel-host-badge"
                                  className="inline-flex items-center gap-1 rounded-full bg-cik-butter px-2 py-0.5 cik-caption-2 font-black text-cik-butter-text"
                                >
                                  <Crown className="h-3 w-3" />
                                  <span>{lang === 'tr' ? 'Lobi Lideri' : 'Room Leader'}</span>
                                </span>
                              )}
                            </div>
                            <p className="inline-flex items-center gap-1 cik-caption-2 font-bold text-cik-text-2">
                              {player.ready ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-cik-mint-text" aria-hidden="true" />
                                  <span>{lang === 'tr' ? 'Hazır' : 'Ready'}</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3.5 w-3.5 shrink-0 text-cik-butter-text" aria-hidden="true" />
                                  <span>{lang === 'tr' ? 'Hazırlanıyor' : 'Getting ready'}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {player.reactionGif?.url && (
                            <div
                              data-testid={`duel-player-reaction-${player.id}`}
                              title={player.reactionGif.title || player.name}
                              className="flex shrink-0 items-center overflow-hidden rounded-xl border border-cik-line bg-cik-bg-elevated p-0.5 shadow-sm"
                            >
                              <img
                                src={player.reactionGif.url}
                                alt={player.reactionGif.title || player.name}
                                className="h-8 w-11 rounded-lg object-cover bg-cik-surface-2"
                              />
                            </div>
                          )}
                          {isMe ? (
                            <button
                              type="button"
                              disabled={busyAction === 'ready' || activeRoom.status === 'countdown'}
                              data-testid="duel-ready-toggle"
                              onClick={() => void handleToggleSelfReady()}
                              className={`min-h-11 rounded-full px-3.5 text-xs font-black transition ${
                                player.ready
                                  ? 'bg-cik-mint text-cik-on-cta shadow-sm'
                                  : 'bg-ink text-cik-on-cta hover:bg-cik-cta'
                              }`}
                            >
                              {player.ready
                                ? lang === 'tr'
                                  ? 'Hazırım ✓'
                                  : 'Ready ✓'
                                : lang === 'tr'
                                  ? 'Hazır Ol'
                                  : 'Ready Up'}
                            </button>
                          ) : (
                            <>
                              <span
                                data-testid={`duel-opponent-status-${player.id}`}
                                className={`rounded-full px-2.5 py-1 cik-caption-2 font-extrabold ${
                                  player.ready
                                    ? 'bg-cik-mint text-cik-mint-text'
                                    : 'bg-cik-surface-2 text-cik-text-2'
                                }`}
                              >
                                {player.ready
                                  ? lang === 'tr'
                                    ? 'Hazır ✓'
                                    : 'Ready ✓'
                                  : lang === 'tr'
                                    ? 'Bekliyor'
                                    : 'Waiting'}
                              </span>
                              {isHost && activeRoom.status === 'lobby' && (
                                <button
                                  type="button"
                                  disabled={busyAction === `kick-${player.id}`}
                                  data-testid="duel-kick-btn"
                                  onClick={() => void handleKickOpponent(player.id)}
                                  title={lang === 'tr' ? 'Odadan At' : 'Kick from room'}
                                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-cik-line bg-cik-rose px-2.5 cik-caption-2 font-extrabold text-cik-rose-text hover:bg-cik-rose"
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                  <span>{lang === 'tr' ? 'Odadan At' : 'Kick'}</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {activeRoom.players.length < 2 && (
                    <div
                      data-testid="duel-waiting-slot"
                      className="space-y-2 rounded-2xl border border-dashed border-cik-line bg-cik-surface px-3.5 py-3 text-xs font-bold text-cik-text-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2">
                          <Users className="h-4 w-4 text-violet-500 shrink-0" />
                          <span>
                            {lang === 'tr'
                              ? 'Rakip bekleniyor... Davet linkini veya oda kodunu paylaş'
                              : 'Waiting for opponent... Share invite link or room code'}
                          </span>
                        </span>
                        <span className="font-mono cik-caption-2 font-black text-cik-text-2">
                          1/2
                        </span>
                      </div>
                      {isHost && activeRoom.status === 'lobby' && (
                        <button
                          type="button"
                          data-testid="duel-bot-toggle-lobby"
                          onClick={handleEnableBotInLobby}
                          className="inline-flex items-center gap-1.5 rounded-full border border-cik-line bg-cik-pink px-3 py-1.5 cik-caption-2 font-extrabold text-cik-text transition hover:bg-cik-surface"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          <span>
                            {lang === 'tr'
                              ? 'Yerel Test / Bot Rakip ile Dene'
                              : 'Practice vs Local Bot'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p
                  data-testid="duel-ready-status"
                  className="text-center text-xs font-extrabold text-cik-text-2"
                >
                  {lang === 'tr'
                    ? `Hazır oyuncular: ${readyCount}/2`
                    : `Players ready: ${readyCount}/2`}
                </p>

                {/* Collapsible GIPHY Reaction Drawer */}
                <div className="space-y-2">
                  <button
                    type="button"
                    data-testid="duel-reaction-drawer-toggle"
                    onClick={() => {
                      onButtonPop();
                      setShowReactionDrawer((prev) => !prev);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-2xl border border-cik-line bg-cik-pink px-3.5 py-2 text-xs font-extrabold text-cik-text transition hover:bg-cik-surface"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 shrink-0 text-cik-cta" aria-hidden="true" />
                      <span>{lang === 'tr' ? 'GIF ile Tepki Gönder' : 'Send Reaction GIF'}</span>
                    </span>
                    <span className="cik-caption-2 font-black text-cik-cta">
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
                      recentReactions={lobbyReactions}
                      sending={sendingReaction}
                    />
                  )}
                </div>

                {/* Host-only Start Button (requires 2 seated & both ready) */}
                {isHost ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={!allReady || activeRoom.status === 'countdown' || busyAction === 'start'}
                    onClick={() => void handleHostStart()}
                    data-testid="start-duel-btn"
                    className="cik-headline flex w-full min-h-14 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta shadow-sticker disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-4 w-4 shrink-0 fill-current" />
                    <span>
                      {activeRoom.status === 'countdown'
                        ? lang === 'tr'
                          ? `Başlıyor (${countdownSec ?? 5})...`
                          : `Starting (${countdownSec ?? 5})...`
                        : allReady
                          ? lang === 'tr'
                            ? 'Oyunu Başlat'
                            : 'Start Game'
                          : !bothSeated
                            ? lang === 'tr'
                              ? 'Rakip Katılması Bekleniyor'
                              : 'Waiting for Opponent'
                            : lang === 'tr'
                              ? 'İki Oyuncu da Hazır Olmalı'
                              : 'Both Players Must Be Ready'}
                    </span>
                  </motion.button>
                ) : (
                  <div
                    data-testid="duel-guest-wait-banner"
                    className="rounded-full border border-cik-line bg-cik-pink px-4 py-3 text-center text-xs font-extrabold text-cik-text"
                  >
                    {activeRoom.status === 'countdown' ? (
                      <span className="inline-flex items-center justify-center gap-1.5 tabular-nums">
                        <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'tr'
                            ? `Lobi Lideri maçı başlattı! (${countdownSec ?? 5})`
                            : `Room Leader started the match! (${countdownSec ?? 5})`}
                        </span>
                      </span>
                    ) : allReady ? (
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {lang === 'tr'
                            ? 'Lobi Liderinin oyunu başlatması bekleniyor...'
                            : 'Waiting for Room Leader to start...'}
                        </span>
                      </span>
                    ) : lang === 'tr' ? (
                      'Başlamak için "Hazır Ol" butonuna bas'
                    ) : (
                      'Tap "Ready Up" to signal readiness'
                    )}
                  </div>
                )}

                {/* Share link + Social (real P2P server rooms only) */}
                {!botLocalRoom ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="rounded-2xl border border-cik-line bg-cik-surface-2 p-3">
                      <p
                        data-testid="duel-link-preview"
                        className="truncate font-mono text-xs font-bold text-cik-text"
                      >
                        {duelUrl}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => void handleCopyDuel()}
                      data-testid="copy-duel-link-btn"
                      className={`flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                        copied
                          ? 'bg-cik-mint text-cik-on-cta'
                          : 'border-2 border-cik-line bg-cik-bg-elevated text-cik-text hover:bg-cik-surface'
                      }`}
                    >
                      {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                      <span>{copied ? t.duelLinkCopied : t.duelCopyLinkBtn}</span>
                    </motion.button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.a
                        href={`https://wa.me/?text=${encodeURIComponent(challengeText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.94 }}
                        onClick={onButtonPop}
                        className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-cik-cta px-3 py-2.5 text-center text-xs font-extrabold text-cik-on-cta"
                      >
                        <MessageCircle className="h-4 w-4 shrink-0" />
                        <span>{t.duelShareWhatsapp}</span>
                      </motion.a>
                      <motion.a
                        href={`https://x.com/intent/post?text=${encodeURIComponent(challengeText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.94 }}
                        onClick={onButtonPop}
                        className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-cik-text px-3 py-2.5 text-center text-xs font-extrabold text-cik-on-cta"
                      >
                        <Share2 className="h-4 w-4 shrink-0" />
                        <span>{t.duelShareX}</span>
                      </motion.a>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="duel-bot-mode-note"
                    className="rounded-2xl border border-cik-line bg-cik-pink px-3.5 py-2.5 text-center cik-caption-2 font-bold text-cik-text"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 shrink-0 text-cik-cta" aria-hidden="true" />
                      <span>
                        {lang === 'tr'
                          ? 'Yerel Test / Bot modu aktif: arkadaş davet linki için normal oda kurabilirsin.'
                          : 'Local Bot Practice active: switch off Bot mode to invite a friend online.'}
                      </span>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="duel-back-setup-btn"
                  onClick={() => void handleLeaveLobby()}
                  className="w-full text-center cik-caption-2 font-extrabold text-cik-text-3 underline-offset-2 hover:underline"
                >
                  {lang === 'tr' ? 'Odadan ayrıl ve ayarlara dön' : 'Leave room & back to setup'}
                </button>
              </div>
            )}
          </motion.div>
          <Toast message={codeCopied ? t.duelCodeCopied : copied ? t.duelLinkCopied : null} />
        </div>
  );
}
