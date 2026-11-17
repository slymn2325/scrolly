'use client';

import QuizSectionSwitch from '@/components/QuizSectionSwitch';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Crown,
  Mail,
  Medal,
  Radio,
  RefreshCw,
  Swords,
  Users,
  X,
} from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import {
  fetchLeaderboardEntries,
  type LeaderboardEntry,
  type LeaderboardTab,
  subscribeLeaderboardRealtime,
  WEEKLY_LEAGUE_TIERS,
} from '@/utils/supabaseLeaderboard';
import { useEscapeClose } from '@/utils/useEscapeClose';
import { getLeagueInfo } from '@/utils/userMemory';

interface LeaderboardModalProps {
  open: boolean;
  lang: Language;
  nickname: string;
  userXp: number;
  weeklyXp: number;
  dailyBestScore: number;
  streakDays: number;
  presentation?: 'modal' | 'page';
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
  presentation = 'modal',
  onInviteDuel,
  onClose,
}: LeaderboardModalProps) {
  const isPage = presentation === 'page';
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const userRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadImg = new window.Image();
    preloadImg.decoding = 'sync';
    preloadImg.src = DOCK_ICON_MAP.leaderboard;

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
        const nextEmail = detail.user?.email?.trim() || null;
        setAuthEmail(nextEmail);
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
  }, [open]);

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

  const loadLeaderboard = useCallback(
    async (background = false) => {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setHasError(false);

      try {
        const result = await fetchLeaderboardEntries(
          activeTab,
          nickname,
          userXp,
          weeklyXp,
          dailyBestScore,
          streakDays
        );
        setEntries(result.entries);
        setIsLiveBackend(Boolean(result.isLiveBackend ?? result.isLiveSupabase));
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, nickname, userXp, weeklyXp, dailyBestScore, streakDays]
  );

  useEffect(() => {
    if (!open) return;
    void loadLeaderboard(false);
    const unsub = subscribeLeaderboardRealtime(() => {
      void loadLeaderboard(true);
    });
    return () => unsub();
  }, [open, loadLeaderboard]);

  useEscapeClose(open && !isPage, onClose);

  const progressPct = useMemo(() => {
    if (!league.nextMinXp) return 100;
    const span = league.nextMinXp - league.minXp;
    const current = userXp - league.minXp;
    return Math.min(100, Math.max(4, Math.round((current / span) * 100)));
  }, [league, userXp]);

  const myEntry = useMemo(() => entries.find((e) => e.isUser) ?? null, [entries]);
  const myRank = myEntry?.rank ?? 1;
  const activeTabScore =
    myEntry?.score ??
    (activeTab === 'daily'
      ? dailyBestScore
      : activeTab === 'weekly'
        ? Math.max(weeklyXp, userXp)
        : userXp);

  const tabMetricLabel =
    activeTab === 'daily'
      ? lang === 'tr'
        ? 'Bugünün En İyisi'
        : "Today's Best"
      : activeTab === 'weekly'
        ? lang === 'tr'
          ? 'Haftalık XP'
          : 'Weekly XP'
        : lang === 'tr'
          ? 'Toplam XP'
          : 'Total XP';

  const myZoneBadge = myEntry
    ? myEntry.zone === 'promotion'
      ? {
          label: lang === 'tr' ? '▲ Yükselme Hattı' : '▲ Promotion Zone',
          cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        }
      : myEntry.zone === 'relegation'
        ? {
            label: lang === 'tr' ? '▼ Düşme Riski' : '▼ Relegation Risk',
            cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
          }
        : {
            label: lang === 'tr' ? '● Güvenli Bölge' : '● Safe Zone',
            cls: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
          }
    : null;

  const scrollToMyRank = () => {
    userRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!open) return null;

  return (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={t.leaderboardTitle}
          data-testid="leaderboard-modal"
          data-presentation={presentation}
          className={
            isPage
              ? 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] dark:bg-[#0B0B11]'
              : 'absolute inset-0 z-20 flex h-full w-full items-center justify-center bg-[#0B0B11]/85 p-3 backdrop-blur-sm'
          }
        >
          <motion.div
            initial={isPage ? { opacity: 0.94, y: 8 } : { opacity: 0.94, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className={
              isPage
                ? 'relative flex h-full w-full flex-col overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom,16px)+100px)] pt-[calc(env(safe-area-inset-top,20px)+16px)] lg:pb-6 lg:pt-6'
                : 'relative mb-[92px] mt-[env(safe-area-inset-top)] flex max-h-[82dvh] w-full max-w-[430px] md:max-w-2xl flex-col rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#0B0B11] sm:p-6'
            }
          >
            {!isPage && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close"
                data-testid="leaderboard-close-btn"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink/75 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-2 pr-10 sm:pr-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100/80 p-1.5 dark:bg-violet-900/40">
                  <img
                    src={UI_ICON_PATHS.trophy}
                    alt=""
                    aria-hidden="true"
                    width={32}
                    height={32}
                    loading="eager"
                    decoding="sync"
                    className="h-8 w-8 object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <QuizSectionSwitch section="leaderboard" lang={lang} />
                  <h2 className="font-display text-lg font-bold text-ink dark:text-white">
                    {t.leaderboardTitle}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-ink/75 dark:text-violet-100/85">
                    <Radio
                      className={`h-3 w-3 ${
                        isLiveBackend ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                      }`}
                    />
                    <span>
                      {isLiveBackend
                        ? t.lbLiveSupabase
                        : lang === 'tr'
                          ? 'Haftalık Lig Sıralaması'
                          : 'Weekly League Ranking'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-ink/70 dark:bg-white/10 dark:text-violet-200">
                      <Users className="h-2.5 w-2.5" />
                      {entries.length}
                    </span>
                  </div>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => void loadLeaderboard(true)}
                disabled={isLoading || isRefreshing}
                aria-label={lang === 'tr' ? 'Sıralamayı yenile' : 'Refresh leaderboard'}
                data-testid="leaderboard-refresh-btn"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-ink/70 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-violet-100"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
                />
              </motion.button>
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
                    className={`rounded-xl py-1.5 text-[11px] font-extrabold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
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

            {/* 5-Tier Weekly League + User Rank Overview Strip */}
            <div className="mt-3 rounded-2xl border border-amber-200/80 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                            : 'opacity-75'
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

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-ink/65 dark:text-violet-200/75">
                <span>
                  {league.nextMinXp
                    ? `${t.nextLeagueLabel}: ${league.nextMinXp} XP (${Math.max(0, league.nextMinXp - userXp)} XP)`
                    : t.maxLeagueReached}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {myZoneBadge && (
                    <span className={`rounded-full px-2 py-0.5 font-extrabold ${myZoneBadge.cls}`}>
                      {myZoneBadge.label}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={scrollToMyRank}
                    className="rounded-full bg-violet-50 px-2 py-0.5 font-extrabold text-violet-800 transition hover:bg-violet-100 dark:bg-violet-900/50 dark:text-violet-200 dark:hover:bg-violet-800/70"
                  >
                    #{myRank} · {tabMetricLabel}: {activeTabScore} XP
                  </button>
                </div>
              </div>
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

            {/* Error State Banner */}
            {hasError && (
              <div
                data-testid="leaderboard-error-state"
                className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/50 dark:text-rose-200"
              >
                <span className="inline-flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {lang === 'tr'
                      ? 'Sıralama sunucusuna ulaşılamadı.'
                      : 'Could not reach leaderboard server.'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void loadLeaderboard(false)}
                  className="shrink-0 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-extrabold text-white"
                >
                  {lang === 'tr' ? 'Tekrar Dene' : 'Retry'}
                </button>
              </div>
            )}

            {/* Ranked List */}
            <div
              data-testid="leaderboard-list"
              className="no-scrollbar mt-2 flex-1 space-y-1.5 overflow-y-auto pb-5 pr-0.5"
            >
              {isLoading && entries.length === 0 ? (
                <div data-testid="leaderboard-loading" className="space-y-2 py-1">
                  {[0, 1, 2, 3, 4].map((skeletonIdx) => (
                    <div
                      key={skeletonIdx}
                      className="flex h-11 animate-pulse items-center justify-between rounded-2xl border border-slate-100 bg-slate-100/80 px-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-4 w-6 rounded bg-slate-200 dark:bg-white/10" />
                        <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-white/10" />
                        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-white/10" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div
                  data-testid="leaderboard-empty-state"
                  className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center dark:border-white/15 dark:bg-white/5"
                >
                  <img
                    src={UI_ICON_PATHS.explorer}
                    alt=""
                    aria-hidden="true"
                    width={44}
                    height={44}
                    decoding="async"
                    className="mx-auto mb-2.5 h-11 w-11 object-contain"
                  />
                  <p className="font-display text-sm font-bold text-ink dark:text-white">
                    {lang === 'tr'
                      ? 'Bu kategoride henüz skor yok!'
                      : 'No scores recorded in this tab yet!'}
                  </p>
                  <p className="mt-1 text-xs text-ink/65 dark:text-violet-200/75">
                    {lang === 'tr'
                      ? 'İlk puanı yazmak için bir quiz veya Scrolla 1v1 maçı oyna.'
                      : 'Play a quiz or a Scrolla 1v1 match to claim the #1 spot.'}
                  </p>
                </div>
              ) : (
                <>
                  {entries.map((row, idx) => {
                    const prevRow = idx > 0 ? entries[idx - 1] : null;
                    const showPromotionCutoff =
                      prevRow?.zone === 'promotion' && row.zone !== 'promotion';
                    const showRelegationCutoff =
                      row.zone === 'relegation' && prevRow?.zone !== 'relegation';

                    const zoneClass = row.isUser
                      ? 'border-violet-500 bg-pastel-lavender/75 font-extrabold text-violet-950 dark:border-violet-400 dark:bg-violet-900/55 dark:text-white'
                      : row.zone === 'promotion'
                        ? 'border-emerald-200 bg-emerald-50/55 text-ink dark:border-emerald-800/50 dark:bg-emerald-950/25 dark:text-violet-100'
                        : row.zone === 'relegation'
                          ? 'border-rose-200 bg-rose-50/55 text-ink dark:border-rose-800/50 dark:bg-rose-950/25 dark:text-violet-100'
                          : 'border-slate-100 bg-white text-ink dark:border-white/10 dark:bg-white/5 dark:text-violet-100';

                    return (
                      <React.Fragment key={row.id}>
                        {showPromotionCutoff && (
                          <div className="my-1.5 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            <span className="h-px flex-1 bg-emerald-300/80 dark:bg-emerald-700/60" />
                            <span>
                              {lang === 'tr'
                                ? '▲ İlk 10 · Üst Lige Yükselme Hattı'
                                : '▲ Top 10 · Promotion Cutoff'}
                            </span>
                            <span className="h-px flex-1 bg-emerald-300/80 dark:bg-emerald-700/60" />
                          </div>
                        )}

                        {showRelegationCutoff && (
                          <div className="my-1.5 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            <span className="h-px flex-1 bg-rose-300/80 dark:bg-rose-700/60" />
                            <span>
                              {lang === 'tr'
                                ? '▼ Son 5 · Küme Düşme Bölgesi'
                                : '▼ Bottom 5 · Relegation Zone'}
                            </span>
                            <span className="h-px flex-1 bg-rose-300/80 dark:bg-rose-700/60" />
                          </div>
                        )}

                        <div
                          ref={row.isUser ? userRowRef : undefined}
                          data-zone={row.zone}
                          className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-xs ${zoneClass}`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="w-6 text-center font-black tabular-nums text-ink/65 dark:text-violet-200">
                              {row.rank === 1 ? (
                                <>
                                  <Crown className="mx-auto h-4 w-4 text-amber-500" aria-hidden="true" />
                                  <span className="sr-only">#1</span>
                                </>
                              ) : row.rank === 2 ? (
                                <>
                                  <Medal className="mx-auto h-4 w-4 text-slate-400 dark:text-slate-300" aria-hidden="true" />
                                  <span className="sr-only">#2</span>
                                </>
                              ) : row.rank === 3 ? (
                                <>
                                  <Medal className="mx-auto h-4 w-4 text-amber-700 dark:text-amber-500" aria-hidden="true" />
                                  <span className="sr-only">#3</span>
                                </>
                              ) : (
                                `#${row.rank}`
                              )}
                            </span>
                            <span className="text-base">{row.avatar}</span>
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="font-bold whitespace-normal break-words">
                                {row.name}
                              </span>
                              {row.isUser && (
                                <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                                  {t.youTag}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 font-bold tabular-nums">
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
                              {row.score.toLocaleString()} XP
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {entries.length === 1 && !isLoading && (
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-2.5 text-center text-[11px] font-semibold text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/30 dark:text-amber-200">
                      {lang === 'tr'
                        ? 'Diğer cihazlardan katılan kaşifler puan kazandıkça burada canlı görünecek!'
                        : 'Explorers joining from other devices appear live right here as they score!'}
                    </div>
                  )}
                </>
              )}

              {/* Invite a Friend / Scrolla 1v1 Challenge Card */}
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

              {!authEmail && (
                <div
                  data-testid="leaderboard-auth-cta"
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-200/80 bg-violet-50/70 px-3.5 py-2.5 text-xs dark:border-violet-600/35 dark:bg-violet-950/35"
                >
                  <span className="font-bold text-ink/80 dark:text-violet-100">
                    {lang === 'tr'
                      ? 'Skorunu ve ligini cihazlar arasında sakla'
                      : 'Save your rank & XP across devices'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('scrolly-open-auth', { detail: { trigger: 'leaderboard' } })
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[11px] font-extrabold text-white transition-colors hover:bg-violet-700"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {lang === 'tr'
                        ? 'E-posta ile Hesabını Bağla / Giriş Yap'
                        : 'Connect Email / Sign In'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
  );
}
