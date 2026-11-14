'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  Crown,
  LogIn,
  MessageCircle,
  Play,
  Share2,
  ShieldAlert,
  Sparkles,
  Swords,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { CATEGORIES, type CategoryFilter, type Language, translations } from '@/i18n/translations';
import { isShortRoomCode, normalizeRoomCode, type ScrollaRoom } from '@/lib/duelStore';
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

export { completeScrollaRoom };

export default function DuelModal({
  open,
  lang,
  defaultNickname,
  playerId: propPlayerId,
  seedFact,
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
  const [copied, setCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);

  const serverOffsetMsRef = useRef<number>(0);
  const matchLaunchedRef = useRef<string | null>(null);
  const autoJoinedCodeRef = useRef<string | null>(null);

  const cleanName = (nickname || defaultNickname || t.duelDefaultName).trim().slice(0, 24);
  const cleanNameRef = useRef(cleanName);
  cleanNameRef.current = cleanName;
  const wasOpenRef = useRef(false);

  useEscapeClose(open && !isPage, onClose);

  const applyRoomSync = useCallback((nextRoom: ScrollaRoom, serverNowMs?: number) => {
    if (typeof serverNowMs === 'number' && Number.isFinite(serverNowMs)) {
      serverOffsetMsRef.current = serverNowMs - Date.now();
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
    }
  }, [open, defaultNickname, t.duelDefaultName]);

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

  // Real-time room polling every 850ms while inside lobby/countdown
  useEffect(() => {
    if (!open || phase !== 'lobby' || !room?.code) return;
    let active = true;

    const poll = async () => {
      const res = await fetchScrollaRoom(room.code, myPlayerId);
      if (!active) return;

      if (res.kicked) {
        setRoom(null);
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
  }, [open, phase, room?.code, myPlayerId, applyRoomSync, lang, onClearRoomCode]);

  // Synchronized 5-second server-timestamp countdown (`startsAt = serverNow + 5000`)
  useEffect(() => {
    if (!open || phase !== 'lobby' || !room) {
      setCountdownSec(null);
      return;
    }

    const launchMatch = () => {
      if (matchLaunchedRef.current === room.code) return;
      matchLaunchedRef.current = room.code;
      const opponent = room.players.find((p) => p.id !== myPlayerId);
      onStartDuel({
        factIds: room.cardIds,
        challengerName: opponent?.name || room.players[0]?.name || cleanName,
        targetScore: estimateTargetScore(room.questionCount),
        targetTimeSec: estimateTargetTime(room.questionCount),
        kind: '1v1',
        duelId: room.code,
        category: room.category,
        questionCount: room.questionCount,
      });
    };

    if (room.status === 'started') {
      setCountdownSec(0);
      launchMatch();
      return;
    }

    if (room.status !== 'countdown' || !room.startsAt) {
      setCountdownSec(null);
      return;
    }

    const targetMs = Date.parse(room.startsAt);
    if (!Number.isFinite(targetMs)) {
      setCountdownSec(null);
      return;
    }

    const tick = () => {
      const estimatedServerNow = Date.now() + serverOffsetMsRef.current;
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
  }, [open, phase, room, myPlayerId, cleanName, onStartDuel]);

  const handleCreateRoom = async () => {
    onButtonPop();
    setBusyAction('create');
    setErrorMsg(null);
    const res = await createScrollaRoom({
      hostId: myPlayerId,
      hostName: cleanName,
      category,
      questionCount,
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
    applyRoomSync(res.room, res.serverNowMs);
    setPhase('lobby');
  };

  const handleToggleSelfReady = async () => {
    if (!room) return;
    onButtonPop();
    const self = room.players.find((p) => p.id === myPlayerId);
    if (!self) return;
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
    if (!room || room.hostId !== myPlayerId) return;
    onButtonPop();
    setBusyAction(`kick-${targetId}`);
    const res = await kickScrollaPlayer(room.code, myPlayerId, targetId);
    setBusyAction(null);
    if (res.ok && res.room) {
      applyRoomSync(res.room, res.serverNowMs);
    }
  };

  const handleHostStart = async () => {
    if (!room || room.hostId !== myPlayerId) return;
    onButtonPop();
    setBusyAction('start');
    setErrorMsg(null);
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

  const handleLeaveLobby = async () => {
    onButtonPop();
    const code = room?.code;
    setPhase('setup');
    setRoom(null);
    setCountdownSec(null);
    autoJoinedCodeRef.current = null;
    onClearRoomCode?.();
    if (code) {
      void leaveScrollaRoom(code, myPlayerId);
    }
  };

  const duelUrl = useMemo(() => {
    if (!room) return '';
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    return `${origin}/?duel=${room.code}`;
  }, [room]);

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

  const isHost = Boolean(room && room.hostId === myPlayerId);
  const bothSeated = Boolean(room && room.players.length === 2);
  const allReady = Boolean(room && bothSeated && room.players.every((p) => p.ready));
  const readyCount = room ? room.players.filter((p) => p.ready).length : 0;

  const challengeText = room
    ? lang === 'tr'
      ? `⚔️ ${cleanName} seni Scrolla 1v1 arenasına çağırıyor! Oda Kodu: ${room.code} (${room.questionCount} soru)\n${duelUrl}`
      : `⚔️ ${cleanName} challenged you to Scrolla 1v1 Arena! Room Code: ${room.code} (${room.questionCount} qs)\n${duelUrl}`
    : '';

  const shellClass = isPage
    ? 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] dark:bg-[#141024]'
    : 'fixed inset-0 z-50 flex w-full items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md';

  const panelClass = isPage
    ? 'relative flex h-full w-full flex-col overflow-y-auto no-scrollbar px-4 pb-[108px] pt-4 lg:pb-6'
    : 'relative mb-[92px] max-h-[84dvh] w-full max-w-[440px] overflow-y-auto no-scrollbar rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#171228] sm:p-6 md:max-w-2xl';

  return (
    <AnimatePresence>
      {open && (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={t.duelTitle}
          data-testid="duel-modal"
          data-presentation={presentation}
          className={shellClass}
        >
          <motion.div
            initial={isPage ? { opacity: 0, x: 12 } : { opacity: 0, scale: 0.9, y: 18 }}
            animate={isPage ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isPage ? { opacity: 0, x: 8 } : { opacity: 0, scale: 0.9, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={panelClass}
          >
            {!isPage && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close"
                data-testid="duel-close-btn"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink/75 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-100"
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
                    className="h-9 w-9 object-contain drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-black tracking-tight text-ink dark:text-white">
                      {t.duelTitle}
                    </h2>
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      LIVE 1v1
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ink/70 dark:text-violet-200/80">
                    {t.duelSubtitle}
                  </p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                data-testid="duel-error-banner"
                className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-200"
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {phase === 'setup' && (
              <div className="mt-4 space-y-4">
                {/* Nickname */}
                <div>
                  <label
                    htmlFor="duel-nickname-input"
                    className="block text-xs font-extrabold text-ink/75 dark:text-violet-200"
                  >
                    {t.duelNameLabel}
                  </label>
                  <input
                    id="duel-nickname-input"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={24}
                    className="mt-1.5 w-full rounded-2xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-bold text-ink outline-none focus:border-violet-500 dark:border-white/15 dark:bg-white/10 dark:text-white"
                  />
                </div>

                {/* Join existing room by 6-char code */}
                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 dark:border-violet-700/50 dark:bg-violet-950/35">
                  <p className="text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                    {lang === 'tr' ? 'Kısa Oda Kodu ile Katıl' : 'Join with 6-Char Room Code'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(normalizeRoomCode(e.target.value))}
                      placeholder="K8M2P9"
                      maxLength={6}
                      data-testid="duel-join-code-input"
                      className="min-w-0 flex-1 rounded-xl border border-violet-300 bg-white px-3 py-2 font-mono text-sm font-black tracking-widest text-ink uppercase outline-none focus:border-violet-600 dark:border-white/20 dark:bg-black/35 dark:text-white"
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      disabled={busyAction === 'join' || normalizeRoomCode(joinCodeInput).length !== 6}
                      onClick={() => void joinRoomByCode(joinCodeInput)}
                      data-testid="duel-join-code-btn"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm disabled:opacity-45"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>{lang === 'tr' ? 'Katıl' : 'Join'}</span>
                    </motion.button>
                  </div>
                </div>

                {/* Category + Count + Create */}
                <div>
                  <p className="text-xs font-extrabold text-ink/75 dark:text-violet-200">
                    {lang === 'tr' ? 'Arena Kategorisi' : 'Arena Topic'}
                  </p>
                  <div data-testid="duel-category-picker" className="mt-2 flex flex-wrap gap-1.5">
                    {CATEGORIES.filter((c) => c.id !== 'vocabulary').map((cat) => {
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
                          className={`rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                            active
                              ? 'border-ink bg-ink text-white dark:border-violet-300 dark:bg-violet-600'
                              : 'border-amber-200 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white'
                          }`}
                        >
                          {cat.emoji} {cat.label[lang]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-extrabold text-ink/75 dark:text-violet-200">
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
                              ? 'border-ink bg-ink text-white dark:border-violet-300 dark:bg-violet-600'
                              : 'border-amber-200 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white'
                          }`}
                        >
                          {count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={busyAction === 'create'}
                  onClick={() => void handleCreateRoom()}
                  data-testid="duel-create-lobby-btn"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-4 py-3 text-sm font-black text-white shadow-cozy disabled:opacity-60"
                >
                  <Swords className="h-4 w-4 shrink-0" />
                  <span>
                    {busyAction === 'create'
                      ? lang === 'tr'
                        ? 'Oda kuruluyor...'
                        : 'Creating room...'
                      : lang === 'tr'
                        ? 'Scrolla Odası Kur'
                        : 'Create Scrolla Room'}
                  </span>
                </motion.button>
              </div>
            )}

            {phase === 'lobby' && room && (
              <div className="mt-4 space-y-3.5">
                {/* Room code badge */}
                <div
                  data-testid="duel-lobby-meta"
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-300/80 bg-gradient-to-r from-violet-100/80 via-white to-amber-100/70 p-3.5 dark:border-violet-600/60 dark:from-violet-950/60 dark:via-[#1E1935] dark:to-amber-950/35"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                      {lang === 'tr' ? 'Scrolla Oda Kodu' : 'Scrolla Room Code'}
                    </p>
                    <p
                      data-testid="duel-room-code"
                      className="mt-0.5 font-mono text-2xl font-black tracking-[0.2em] text-ink dark:text-white"
                    >
                      {room.code}
                    </p>
                  </div>
                  <div className="text-right text-xs font-bold text-ink/75 dark:text-violet-200/85">
                    <p>{room.questionCount} {lang === 'tr' ? 'soru' : 'qs'}</p>
                    <p className="text-[11px] uppercase">
                      {room.category === 'all'
                        ? lang === 'tr'
                          ? 'Karma'
                          : 'Mixed'
                        : CATEGORIES.find((c) => c.id === room.category)?.label[lang] || room.category}
                    </p>
                  </div>
                </div>

                {/* Synchronized 5-second countdown spotlight */}
                {countdownSec !== null && countdownSec > 0 && (
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    data-testid="duel-countdown-banner"
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 px-4 py-4 text-center text-white shadow-lg"
                  >
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-amber-100">
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
                  {room.players.map((player) => {
                    const isMe = player.id === myPlayerId;
                    const playerIsHost = player.id === room.hostId;
                    return (
                      <div
                        key={player.id}
                        data-testid={`duel-player-${player.id}`}
                        className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 ${
                          isMe
                            ? 'border-violet-400 bg-violet-50/70 dark:border-violet-500/60 dark:bg-violet-950/45'
                            : 'border-amber-200 bg-white dark:border-white/15 dark:bg-white/10'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-black/30">
                            {player.emoji || '⚡'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-black text-ink dark:text-white">
                                {player.name}
                              </p>
                              {isMe && (
                                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                                  {t.youTag}
                                </span>
                              )}
                              {playerIsHost && (
                                <span
                                  data-testid="duel-host-badge"
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-300"
                                >
                                  <Crown className="h-3 w-3" />
                                  <span>{lang === 'tr' ? 'Lobi Lideri' : 'Room Leader'}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-ink/60 dark:text-violet-200/75">
                              {player.ready
                                ? lang === 'tr'
                                  ? '✅ Hazır'
                                  : '✅ Ready'
                                : lang === 'tr'
                                  ? '⏳ Hazırlanıyor'
                                  : '⏳ Getting ready'}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {isMe ? (
                            <button
                              type="button"
                              disabled={busyAction === 'ready' || room.status === 'countdown'}
                              data-testid="duel-ready-toggle"
                              onClick={() => void handleToggleSelfReady()}
                              className={`min-h-[40px] rounded-full px-3.5 text-xs font-black transition ${
                                player.ready
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-ink text-white hover:bg-violet-700 dark:bg-violet-600'
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
                                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                  player.ready
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-violet-200'
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
                              {isHost && room.status === 'lobby' && (
                                <button
                                  type="button"
                                  disabled={busyAction === `kick-${player.id}`}
                                  data-testid="duel-kick-btn"
                                  onClick={() => void handleKickOpponent(player.id)}
                                  title={lang === 'tr' ? 'Odadan At' : 'Kick from room'}
                                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 text-[11px] font-extrabold text-rose-700 hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-950/50 dark:text-rose-200"
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

                  {room.players.length < 2 && (
                    <div
                      data-testid="duel-waiting-slot"
                      className="flex items-center justify-between rounded-2xl border border-dashed border-violet-300 bg-white/60 px-3.5 py-3 text-xs font-bold text-ink/60 dark:border-white/20 dark:bg-white/5 dark:text-violet-200/75"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-500" />
                        <span>
                          {lang === 'tr'
                            ? '2. oyuncu bekleniyor — davet linkini veya oda kodunu paylaş'
                            : 'Waiting for opponent — share invite link or room code'}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] font-black text-violet-700 dark:text-violet-300">
                        1/2
                      </span>
                    </div>
                  )}
                </div>

                <p
                  data-testid="duel-ready-status"
                  className="text-center text-xs font-extrabold text-ink/70 dark:text-violet-200/80"
                >
                  {lang === 'tr'
                    ? `Hazır oyuncular: ${readyCount}/2`
                    : `Players ready: ${readyCount}/2`}
                </p>

                {/* Host-only Start Button (requires 2 seated & both ready) */}
                {isHost ? (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={!allReady || room.status === 'countdown' || busyAction === 'start'}
                    onClick={() => void handleHostStart()}
                    data-testid="start-duel-btn"
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 px-4 py-3 text-sm font-black text-white shadow-cozy disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Play className="h-4 w-4 shrink-0 fill-current" />
                    <span>
                      {room.status === 'countdown'
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
                    className="rounded-full border border-violet-300/70 bg-violet-50 px-4 py-3 text-center text-xs font-extrabold text-violet-900 dark:border-violet-700/60 dark:bg-violet-950/50 dark:text-violet-200"
                  >
                    {room.status === 'countdown'
                      ? lang === 'tr'
                        ? `🚀 Lobi Lideri maçı başlattı! (${countdownSec ?? 5})`
                        : `🚀 Room Leader started the match! (${countdownSec ?? 5})`
                      : allReady
                        ? lang === 'tr'
                          ? '👑 Lobi Liderinin oyunu başlatması bekleniyor...'
                          : '👑 Waiting for Room Leader to start...'
                        : lang === 'tr'
                          ? 'Başlamak için "Hazır Ol" butonuna bas'
                          : 'Tap "Ready Up" to signal readiness'}
                  </div>
                )}

                {/* Share link + Social */}
                <div className="space-y-2.5 pt-1">
                  <div className="rounded-2xl border border-violet-200 bg-pastel-lavender/40 p-3 dark:border-violet-700/50 dark:bg-violet-950/40">
                    <p
                      data-testid="duel-link-preview"
                      className="truncate font-mono text-xs font-bold text-violet-900 dark:text-violet-200"
                    >
                      {duelUrl}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => void handleCopyDuel()}
                    data-testid="copy-duel-link-btn"
                    className={`flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-ink bg-white text-ink hover:bg-slate-50 dark:border-violet-400 dark:bg-white/10 dark:text-white'
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
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-2.5 text-center text-xs font-extrabold text-white"
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
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-[#111827] px-3 py-2.5 text-center text-xs font-extrabold text-white"
                    >
                      <Share2 className="h-4 w-4 shrink-0" />
                      <span>{t.duelShareX}</span>
                    </motion.a>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="duel-back-setup-btn"
                  onClick={() => void handleLeaveLobby()}
                  className="w-full text-center text-[11px] font-extrabold text-ink/60 underline-offset-2 hover:underline dark:text-violet-200/80"
                >
                  {lang === 'tr' ? 'Odadan ayrıl ve ayarlara dön' : 'Leave room & back to setup'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
