'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Check, Crown, Radio, Swords, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import {
  fetchLeaderboardEntries,
  type LeaderboardEntry,
  type LeaderboardTab,
  subscribeLeaderboardRealtime,
  WEEKLY_LEAGUE_TIERS,
} from '@/utils/supabaseLeaderboard';
import { getLeagueInfo } from '@/utils/userMemory';

interface LeaderboardModalProps {
  open: boolean;
  lang: Language;
  nickname: string;
  userXp: number;
  weeklyXp: number;
  dailyBestScore: number;
  streakDays: number;
  onInviteDuel?: () => void;
  onClose: () => void;
}

export default function LeaderboardModal({
  open,
  lang,
  nickname,
  userXp,
  weeklyXp,
  dailyBestScore,
  streakDays,
  onInviteDuel,
  onClose,
}: LeaderboardModalProps) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLiveSupabase, setIsLiveSupabase] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleInviteClick = async () => {
    if (onInviteDuel) {
      onInviteDuel();
      return;
    }
    try {
      const url = typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2400);
    } catch {
      // Ignore clipboard failure
    }
  };

  const league = getLeagueInfo(userXp, lang);

  const loadLeaderboard = useCallback(async () => {
    const result = await fetchLeaderboardEntries(
      activeTab,
      nickname,
      userXp,
      weeklyXp,
      dailyBestScore,
      streakDays
    );
    setEntries(result.entries);
    setIsLiveSupabase(result.isLiveSupabase);
  }, [activeTab, nickname, userXp, weeklyXp, dailyBestScore, streakDays]);

  useEffect(() => {
    if (!open) return;
    loadLeaderboard();
    const unsub = subscribeLeaderboardRealtime(loadLeaderboard);
    return () => unsub();
  }, [open, loadLeaderboard]);

  const progressPct = useMemo(() => {
    if (!league.nextMinXp) return 100;
    const span = league.nextMinXp - league.minXp;
    const current = userXp - league.minXp;
    return Math.min(100, Math.max(4, Math.round((current / span) * 100)));
  }, [league, userXp]);

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.leaderboardTitle}
          data-testid="leaderboard-modal"
          className="fixed inset-0 z-50 flex w-full items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative mb-[92px] flex max-h-[82dvh] w-full max-w-[430px] md:max-w-2xl flex-col rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#1A162B] sm:p-6"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              aria-label="Close"
              data-testid="leaderboard-close-btn"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/60 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-200"
            >
              <X className="h-4 w-4" />
            </motion.button>

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100/80 p-1.5 dark:bg-amber-900/40">
                <img
                  src={DOCK_ICON_MAP.leaderboard}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink dark:text-white">
                  {t.leaderboardTitle}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink/60 dark:text-violet-200/75">
                  <Radio className={`h-3 w-3 ${isLiveSupabase ? 'text-emerald-500 animate-pulse' : 'text-violet-500'}`} />
                  <span>{isLiveSupabase ? t.lbLiveSupabase : t.lbLocalDynamic}</span>
                </div>
              </div>
            </div>

            {/* 3 Tabs: Daily Sprint / Weekly League / All-Time */}
            <div className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
              {(
                [
                  { id: 'daily', label: t.lbTabDaily },
                  { id: 'weekly', label: t.lbTabWeekly },
                  { id: 'alltime', label: t.lbTabAllTime },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    data-testid={`lb-tab-${tab.id}`}
                    className={`rounded-xl py-1.5 text-[11px] font-extrabold transition-all ${
                      isActive
                        ? 'bg-white text-ink shadow-sm dark:bg-violet-600 dark:text-white'
                        : 'text-ink/60 hover:text-ink dark:text-violet-200/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 5-Tier Weekly League Overview Strip */}
            <div className="mt-3 rounded-2xl border border-amber-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {WEEKLY_LEAGUE_TIERS.map((tier) => {
                    const active = tier.id === league.id;
                    return (
                      <span
                        key={tier.id}
                        title={tier.label[lang]}
                        className={`flex h-8 w-8 items-center justify-center rounded-full p-1 transition-transform ${
                          active
                            ? 'scale-110 bg-amber-100 ring-2 ring-amber-400 dark:bg-violet-800 dark:ring-violet-400'
                            : 'opacity-50 grayscale-[20%]'
                        }`}
                      >
                        <img
                          src={tier.shieldIcon}
                          alt={tier.label[lang]}
                          className="h-6 w-6 object-contain"
                        />
                      </span>
                    );
                  })}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${league.colorClass}`}
                >
                  <img
                    src={league.shieldIcon}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 object-contain"
                  />
                  <span>{league.label}</span>
                </span>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500"
                />
              </div>

              <p className="mt-1.5 text-[10px] font-semibold text-ink/60 dark:text-violet-200/70">
                {league.nextMinXp
                  ? `${t.nextLeagueLabel}: ${league.nextMinXp} XP (${Math.max(0, league.nextMinXp - userXp)} XP)`
                  : t.maxLeagueReached}
              </p>
            </div>

            {/* Zone Legend (Green Top 10 Promotion / Coral Bottom 5 Relegation) */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-extrabold">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="h-3 w-3" />
                {t.promotionZone}
              </span>
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="h-3 w-3" />
                {t.relegationZone}
              </span>
            </div>

            {/* Ranked List */}
            <div
              data-testid="leaderboard-list"
              className="no-scrollbar mt-2 flex-1 space-y-1.5 overflow-y-auto pb-5 pr-0.5"
            >
              {entries.map((row) => {
                const zoneClass = row.isUser
                  ? 'border-violet-500 bg-pastel-lavender/75 font-extrabold text-violet-950 dark:border-violet-400 dark:bg-violet-900/55 dark:text-white'
                  : row.zone === 'promotion'
                  ? 'border-emerald-200 bg-emerald-50/55 text-ink dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-violet-100'
                  : row.zone === 'relegation'
                  ? 'border-rose-200 bg-rose-50/55 text-ink dark:border-rose-800/50 dark:bg-rose-950/25 dark:text-violet-100'
                  : 'border-slate-100 bg-white text-ink dark:border-white/10 dark:bg-white/5 dark:text-violet-100';

                return (
                  <div
                    key={row.id}
                    data-zone={row.zone}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-xs ${zoneClass}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-5 text-center font-black text-ink/60 dark:text-violet-300">
                        {row.rank === 1 ? (
                          <Crown className="mx-auto h-4 w-4 text-amber-500" />
                        ) : (
                          `#${row.rank}`
                        )}
                      </span>
                      <span className="text-base">{row.avatar}</span>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="font-bold whitespace-normal break-words">{row.name}</span>
                        {row.isUser && (
                          <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                            {t.youTag}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 font-bold">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                        <img
                          src={UI_ICON_PATHS.streakFire}
                          alt=""
                          aria-hidden="true"
                          className="h-3.5 w-3.5 object-contain"
                        />
                        {row.streak}
                      </span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-ink dark:bg-black/30 dark:text-white">
                        {row.score} XP
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Invite a Friend / Challenge Card */}
              <div
                data-testid="leaderboard-invite-card"
                className="mt-3 rounded-2xl border-2 border-dashed border-violet-300/80 bg-gradient-to-br from-pastel-lavender/45 via-white to-amber-50/70 p-4 text-center dark:border-violet-600/50 dark:from-violet-950/40 dark:via-[#1E1933] dark:to-amber-950/30"
              >
                <p className="font-display text-sm sm:text-base font-bold text-ink dark:text-white whitespace-normal break-words">
                  {t.lbInviteTitle}
                </p>
                <p className="mt-1 text-xs font-medium text-ink/70 dark:text-violet-200/80 whitespace-normal break-words leading-snug">
                  {t.lbInviteSubtitle}
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInviteClick}
                  data-testid="leaderboard-invite-btn"
                  className="mt-3 inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-md whitespace-normal break-words leading-snug"
                >
                  {inviteCopied ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <Swords className="h-4 w-4 shrink-0" />
                  )}
                  <span>{inviteCopied ? t.copiedLink : t.lbInviteBtn}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
