'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  MessageCircle,
  Play,
  Share2,
  Users,
  Swords,
  X,
} from 'lucide-react';
import { CATEGORIES, type CategoryFilter, type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { encodeDuelPayload, type DuelKind, type DuelPayload } from '@/utils/duelCodec';
import {
  allRequiredReady,
  createDuelId,
  createPlayerId,
  DUEL_QUESTION_COUNTS,
  ensureSeatPlayers,
  loadDuelLobby,
  pickDuelQuestionIds,
  requiredReadyCount,
  saveDuelLobby,
  setPlayerReady,
  subscribeDuelLobby,
  upsertLobbyPlayer,
  type DuelLobbyState,
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
  seedFact: FactCard;
  allFacts: FactCard[];
  incomingDuel?: DuelPayload | null;
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

export default function DuelModal({
  open,
  lang,
  defaultNickname,
  seedFact,
  allFacts,
  incomingDuel = null,
  presentation = 'modal',
  onStartDuel,
  onClose,
  onButtonPop,
}: DuelModalProps) {
  const t = translations[lang];
  const isPage = presentation === 'page';
  const [nickname, setNickname] = useState<string>(defaultNickname || t.duelDefaultName);
  const [copied, setCopied] = useState(false);
  const [kind, setKind] = useState<DuelKind>('1v1');
  const [category, setCategory] = useState<CategoryFilter>(
    (seedFact.category as CategoryFilter) || 'all'
  );
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [phase, setPhase] = useState<DuelPhase>('setup');
  const [lobby, setLobby] = useState<DuelLobbyState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setNickname(defaultNickname || t.duelDefaultName);
    setCopied(false);
    setCountdown(null);

    if (incomingDuel && incomingDuel.cardIds.length > 0) {
      const duelId = incomingDuel.duelId || createDuelId();
      const playerId = createPlayerId();
      setLocalPlayerId(playerId);
      setKind(incomingDuel.kind ?? '1v1');
      setCategory((incomingDuel.category as CategoryFilter) || 'all');
      setQuestionCount(incomingDuel.questionCount || incomingDuel.cardIds.length || 5);

      const existing = loadDuelLobby(duelId);
      const hostName = incomingDuel.name || t.duelDefaultName;
      const joiner = {
        id: playerId,
        name: (defaultNickname || t.duelDefaultName).trim().slice(0, 24),
        ready: false,
        isHost: false,
      };
      const freshLobby: DuelLobbyState = {
        duelId,
        kind: incomingDuel.kind ?? '1v1',
        category: ((incomingDuel.category as CategoryFilter) || 'all') as CategoryFilter,
        questionCount: incomingDuel.questionCount || incomingDuel.cardIds.length || 5,
        cardIds: incomingDuel.cardIds,
        hostId: `host-${duelId}`,
        players: [
          {
            id: `host-${duelId}`,
            name: hostName,
            ready: false,
            isHost: true,
          },
        ],
        started: false,
        updatedAt: Date.now(),
      };
      const base = existing ?? freshLobby;
      const joined = ensureSeatPlayers(upsertLobbyPlayer(base, joiner), joiner);
      saveDuelLobby(joined);
      setLobby(joined);
      setPhase('lobby');
      return;
    }

    setPhase('setup');
    setLobby(null);
    setLocalPlayerId('');
    setKind('1v1');
    setCategory((seedFact.category as CategoryFilter) || 'all');
    setQuestionCount(5);
  }, [open, incomingDuel, defaultNickname, seedFact.category, t.duelDefaultName]);

  useEffect(() => {
    if (!open || !lobby?.duelId) return;
    return subscribeDuelLobby(lobby.duelId, (next) => {
      if (next) setLobby(next);
    });
  }, [open, lobby?.duelId]);

  useEffect(() => {
    if (!open || !lobby || lobby.started) return;
    if (!allRequiredReady(lobby)) {
      if (countdown !== null) setCountdown(null);
      return;
    }
    if (countdown === null) {
      setCountdown(3);
      return;
    }
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
      return () => window.clearTimeout(timer);
    }

    const me = lobby.players.find((p) => p.id === localPlayerId);
    const host = lobby.players.find((p) => p.isHost);
    const starterName = me?.name || host?.name || nickname;
    const startedLobby = { ...lobby, started: true };
    saveDuelLobby(startedLobby);
    setLobby(startedLobby);
    onStartDuel({
      factIds: lobby.cardIds,
      challengerName: starterName,
      targetScore: estimateTargetScore(lobby.questionCount),
      targetTimeSec: estimateTargetTime(lobby.questionCount),
      kind: lobby.kind,
      duelId: lobby.duelId,
      category: lobby.category,
      questionCount: lobby.questionCount,
    });
  }, [open, lobby, countdown, localPlayerId, nickname, onStartDuel]);

  useEscapeClose(open && !isPage, onClose);

  const cleanName = (nickname || t.duelDefaultName).trim().slice(0, 24);
  const activeKind = lobby?.kind ?? kind;
  const activeCount = lobby?.questionCount ?? questionCount;
  const activeCategory = lobby?.category ?? category;
  const activeCardIds = lobby?.cardIds ?? [];
  const needReady = requiredReadyCount(activeKind);
  const readyCount = lobby?.players.filter((p) => p.ready).length ?? 0;

  const duelUrl = useMemo(() => {
    if (!lobby) return '';
    const code = encodeDuelPayload({
      cardIds: lobby.cardIds,
      score: estimateTargetScore(lobby.questionCount),
      timeSec: estimateTargetTime(lobby.questionCount),
      name: cleanName,
      mode: 'duel',
      kind: lobby.kind,
      duelId: lobby.duelId,
      category: lobby.category,
      questionCount: lobby.questionCount,
    });
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    return `${origin}/?duel=${code}`;
  }, [lobby, cleanName]);

  const createLobby = () => {
    onButtonPop();
    const duelId = createDuelId();
    const playerId = createPlayerId();
    const cardIds = pickDuelQuestionIds(allFacts, category, questionCount, duelId);
    if (cardIds.length === 0) return;

    const hostPlayer = {
      id: playerId,
      name: cleanName,
      ready: false,
      isHost: true,
    };
    const state = ensureSeatPlayers(
      {
        duelId,
        kind,
        category,
        questionCount,
        cardIds,
        hostId: playerId,
        players: [hostPlayer],
        started: false,
        updatedAt: Date.now(),
      },
      hostPlayer
    );
    saveDuelLobby(state);
    setLocalPlayerId(playerId);
    setLobby(state);
    setPhase('lobby');
    setCountdown(null);
  };

  const toggleReady = () => {
    if (!lobby || !localPlayerId) return;
    onButtonPop();
    const me = lobby.players.find((p) => p.id === localPlayerId);
    const next = setPlayerReady(lobby, localPlayerId, !me?.ready);
    saveDuelLobby(next);
    setLobby(next);
  };

  const toggleSeatReady = (playerId: string) => {
    if (!lobby) return;
    onButtonPop();
    const seat = lobby.players.find((p) => p.id === playerId);
    if (!seat || seat.id === localPlayerId) return;
    const next = setPlayerReady(lobby, playerId, !seat.ready);
    saveDuelLobby(next);
    setLobby(next);
  };

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

  const challengeText =
    lang === 'tr'
      ? activeKind === 'group'
        ? `⚔️ ${cleanName} Scrolly grup düellosu açtı! ${activeCount} soruda hazır ol:\n${duelUrl}`
        : `⚔️ ${cleanName} sana Scrolly'de 1v1 Düello gönderdi! ${activeCount} ortak soru:\n${duelUrl}`
      : activeKind === 'group'
        ? `⚔️ ${cleanName} opened a Scrolly group duel! ${activeCount} shared questions:\n${duelUrl}`
        : `⚔️ ${cleanName} challenged you to a 1v1 Scrolly Duel! ${activeCount} shared questions:\n${duelUrl}`;

  const title =
    lang === 'tr'
      ? activeKind === 'group'
        ? 'Grup Düellosu'
        : '1v1 Düello'
      : activeKind === 'group'
        ? 'Group Duel'
        : '1v1 Duel';

  const shellClass = isPage
    ? 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] dark:bg-[#1A162B]'
    : 'fixed inset-0 z-50 flex w-full items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md';

  const panelClass = isPage
    ? 'relative flex h-full w-full flex-col overflow-y-auto no-scrollbar px-4 pb-[108px] pt-4 lg:pb-6'
    : 'relative mb-[92px] max-h-[84dvh] w-full max-w-[430px] overflow-y-auto no-scrollbar rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#1A162B] sm:p-6 md:max-w-2xl';

  return (
    <AnimatePresence>
      {open && (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={title}
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

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/80 to-rose-200/80 p-1.5 shadow-sm dark:from-amber-500/20 dark:to-rose-500/20">
                <img
                  src={STATE_ILLUSTRATION_PATHS.duelArena}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain drop-shadow-sm"
                />
              </div>
              <div className="min-w-0 pr-2">
                <h2 className="font-display text-xl font-bold text-ink dark:text-white">{title}</h2>
                <p className="text-xs font-semibold text-ink/75 dark:text-violet-100/85">
                  {lang === 'tr'
                    ? 'Önce ayar · herkes hazır · aynı sorular'
                    : 'Setup · everyone ready · shared questions'}
                </p>
              </div>
            </div>

            {phase === 'setup' && (
              <div className="mt-4 space-y-4">
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

                <div
                  role="group"
                  aria-label={lang === 'tr' ? 'Düello tipi' : 'Duel type'}
                  data-testid="duel-kind-toggle"
                  className="grid grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    data-testid="duel-kind-1v1"
                    onClick={() => {
                      onButtonPop();
                      setKind('1v1');
                    }}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border-2 px-3 text-xs font-extrabold transition ${
                      kind === '1v1'
                        ? 'border-ink bg-ink text-white dark:border-violet-300 dark:bg-violet-600'
                        : 'border-amber-200 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white'
                    }`}
                  >
                    <Swords className="h-4 w-4 shrink-0" />
                    <span>1v1</span>
                  </button>
                  <button
                    type="button"
                    data-testid="duel-kind-group"
                    onClick={() => {
                      onButtonPop();
                      setKind('group');
                    }}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border-2 px-3 text-xs font-extrabold transition ${
                      kind === 'group'
                        ? 'border-ink bg-ink text-white dark:border-violet-300 dark:bg-violet-600'
                        : 'border-amber-200 bg-white text-ink dark:border-white/15 dark:bg-white/10 dark:text-white'
                    }`}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{lang === 'tr' ? 'Grup' : 'Group'}</span>
                  </button>
                </div>

                <div>
                  <p className="text-xs font-extrabold text-ink/75 dark:text-violet-200">
                    {lang === 'tr' ? 'Konu / kategori' : 'Topic / category'}
                  </p>
                  <div
                    data-testid="duel-category-picker"
                    className="mt-2 flex flex-wrap gap-1.5"
                  >
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
                          className={`rounded-full border px-2.5 py-1.5 text-[11px] font-extrabold ${
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
                    {lang === 'tr' ? 'Soru sayısı' : 'Question count'}
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
                          className={`min-h-[44px] rounded-2xl border-2 text-sm font-black ${
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
                  onClick={createLobby}
                  data-testid="duel-create-lobby-btn"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 px-4 py-3 text-sm font-extrabold text-white shadow-cozy"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{lang === 'tr' ? 'Lobi oluştur' : 'Create lobby'}</span>
                </motion.button>
              </div>
            )}

            {phase === 'lobby' && lobby && (
              <div className="mt-4 space-y-3">
                <div
                  data-testid="duel-lobby-meta"
                  className="rounded-2xl border border-violet-200 bg-pastel-lavender/40 p-3 text-xs font-bold text-violet-950 dark:border-violet-700/50 dark:bg-violet-950/40 dark:text-violet-100"
                >
                  <p>
                    {lang === 'tr' ? 'Ortak paket' : 'Shared pack'}: {activeCount}{' '}
                    {lang === 'tr' ? 'soru' : 'qs'} · {activeCategory} · id {lobby.duelId}
                  </p>
                  <p className="mt-1 font-mono text-[10px] opacity-80">
                    {activeCardIds.slice(0, 4).join(' · ')}
                    {activeCardIds.length > 4 ? '…' : ''}
                  </p>
                </div>

                <div data-testid="duel-lobby-players" className="space-y-2">
                  {lobby.players.map((player) => {
                    const isMe = player.id === localPlayerId;
                    return (
                      <div
                        key={player.id}
                        data-testid={`duel-player-${player.id}`}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-white px-3 py-2.5 dark:border-white/15 dark:bg-white/10"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-ink dark:text-white">
                            {player.name}
                            {player.isHost ? (lang === 'tr' ? ' · ev sahibi' : ' · host') : ''}
                            {isMe ? (lang === 'tr' ? ' · sen' : ' · you') : ''}
                          </p>
                          <p className="text-[11px] font-bold text-ink/60 dark:text-violet-100/70">
                            {player.ready
                              ? lang === 'tr'
                                ? 'Hazır'
                                : 'Ready'
                              : lang === 'tr'
                                ? 'Bekliyor'
                                : 'Waiting'}
                          </p>
                        </div>
                        {isMe ? (
                          <button
                            type="button"
                            data-testid="duel-ready-toggle"
                            onClick={toggleReady}
                            className={`min-h-[40px] rounded-full px-3 text-xs font-extrabold ${
                              player.ready
                                ? 'bg-emerald-600 text-white'
                                : 'bg-ink text-white dark:bg-violet-600'
                            }`}
                          >
                            {player.ready
                              ? lang === 'tr'
                                ? 'Hazırım ✓'
                                : 'Ready ✓'
                              : lang === 'tr'
                                ? 'Hazır ol'
                                : 'Ready up'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-testid={`duel-seat-ready-${player.id}`}
                            onClick={() => toggleSeatReady(player.id)}
                            className={`min-h-[40px] rounded-full px-3 text-xs font-extrabold ${
                              player.ready
                                ? 'bg-emerald-600 text-white'
                                : 'border border-ink/20 bg-slate-100 text-ink dark:border-white/20 dark:bg-white/10 dark:text-white'
                            }`}
                          >
                            {player.ready ? <Check className="h-4 w-4" /> : lang === 'tr' ? 'Hazır işaretle' : 'Mark ready'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p
                  data-testid="duel-ready-status"
                  className="text-center text-xs font-extrabold text-ink/70 dark:text-violet-100/80"
                >
                  {lang === 'tr'
                    ? `Hazır ${readyCount}/${needReady}`
                    : `Ready ${readyCount}/${needReady}`}
                  {countdown !== null
                    ? lang === 'tr'
                      ? ` · başlıyor ${countdown}`
                      : ` · starting ${countdown}`
                    : ''}
                </p>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={!allRequiredReady(lobby)}
                  onClick={() => {
                    if (!allRequiredReady(lobby)) return;
                    onButtonPop();
                    setCountdown(0);
                  }}
                  data-testid="start-duel-btn"
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 px-4 py-3 text-sm font-extrabold text-white shadow-cozy disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4 shrink-0 fill-current" />
                  <span>
                    {allRequiredReady(lobby)
                      ? lang === 'tr'
                        ? 'Başlat'
                        : 'Start'
                      : lang === 'tr'
                        ? 'Herkes hazır olmalı'
                        : 'Waiting for all ready'}
                  </span>
                </motion.button>

                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-violet-200 bg-pastel-lavender/40 p-3 dark:border-violet-700/50 dark:bg-violet-950/40">
                    <p
                      data-testid="duel-link-preview"
                      className="truncate font-mono text-[11px] font-semibold text-violet-900 dark:text-violet-200"
                    >
                      {duelUrl}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={handleCopyDuel}
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
                  onClick={() => {
                    onButtonPop();
                    setPhase('setup');
                    setLobby(null);
                    setCountdown(null);
                  }}
                  className="w-full text-center text-[11px] font-extrabold text-ink/60 underline-offset-2 hover:underline dark:text-violet-200/80"
                >
                  {lang === 'tr' ? 'Ayarlara dön' : 'Back to setup'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
