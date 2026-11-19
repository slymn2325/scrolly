'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, EmptyState, IconButton, LeagueBadge, Skeleton } from '@/components/cikartma';
import { motionSpring } from '@/lib/motion';
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
          cls: 'bg-cik-mint text-cik-mint-text',
        }
      : myEntry.zone === 'relegation'
        ? {
            label: lang === 'tr' ? '▼ Düşme Riski' : '▼ Relegation Risk',
            cls: 'bg-cik-rose text-cik-rose-text',
          }
        : {
            label: lang === 'tr' ? '● Güvenli Bölge' : '● Safe Zone',
            cls: 'bg-cik-surface-2 text-cik-text',
          }
    : null;

  const scrollToMyRank = () => {
    userRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const reduced = useReducedMotion() === true;

  if (!open) return null;

  const shell = isPage
    ? 'relative z-20 flex h-full min-h-0 w-full flex-1 flex-col bg-cik-bg text-cik-text outline-none ring-0 focus:outline-none focus:ring-0'
    : 'absolute inset-0 z-modal flex h-full w-full items-center justify-center bg-cik-text/30 p-4 outline-none ring-0 focus:outline-none focus:ring-0';
  const panel = isPage
    ? 'relative flex h-full w-full flex-col overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] outline-none ring-0 focus:outline-none focus:ring-0 md:px-6 lg:px-8 lg:pb-8 lg:pt-8'
    : 'relative flex max-h-[84dvh] w-full max-w-xl flex-col overflow-hidden rounded-sheet bg-cik-bg-elevated p-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-cik-text shadow-e3 outline-none ring-0 focus:outline-none focus:ring-0';

  return (
    <div
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t.leaderboardTitle}
      data-testid="leaderboard-modal"
      data-presentation={presentation}
      className={shell}
    >
      <motion.div
        initial={reduced || isPage ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.15 } : motionSpring.sheetOpen}
        className={panel}
      >
        {!isPage && (
          <div className="absolute right-3 top-3">
            <IconButton label={t.sheetClose} data-testid="leaderboard-close-btn" onClick={onClose}>
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="cik-title-3 text-cik-text">{t.leaderboardTitle}</h2>
            <p className="cik-footnote mt-1 inline-flex items-center gap-2 text-cik-text-2">
              <Radio
                size={16}
                strokeWidth={2}
                className={isLiveBackend ? 'text-cik-mint-text' : 'text-cik-butter-text'}
                aria-hidden="true"
              />
              <span>{isLiveBackend ? t.lbLiveSupabase : t.leaderboardTitle}</span>
              <span className="cik-tabular inline-flex items-center gap-1 rounded-pill bg-cik-surface px-2 py-1">
                <Users size={16} strokeWidth={2} aria-hidden="true" />
                {entries.length}
              </span>
            </p>
          </div>
          <IconButton
            label={lang === 'tr' ? 'Sıralamayı yenile' : 'Refresh ranking'}
            data-testid="leaderboard-refresh-btn"
            disabled={isLoading || isRefreshing}
            onClick={() => void loadLeaderboard(true)}
          >
            <RefreshCw
              size={20}
              strokeWidth={2}
              className={isLoading || isRefreshing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </IconButton>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-pill bg-cik-pink p-1">
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
                onClick={() => {
                  if (tab.id === activeTab) return;
                  setEntries([]);
                  setIsLoading(true);
                  setHasError(false);
                  setActiveTab(tab.id);
                }}
                data-testid={`lb-tab-${tab.id}`}
                className={`cik-footnote min-h-11 rounded-pill px-2 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus ${
                  isActive ? 'bg-cik-berry text-cik-on-berry shadow-e1' : 'text-cik-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-cik-lg bg-cik-surface p-5 shadow-e1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LeagueBadge tier={league.id} size={40} lang={lang} />
              <div>
                <p className="cik-headline text-cik-text">{league.label}</p>
                <p className="cik-footnote text-cik-text-2">{tabMetricLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToMyRank}
              className="cik-footnote cik-tabular rounded-pill bg-cik-pink px-3 py-2 text-cik-text focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cik-focus"
            >
              #{myRank} · {activeTabScore} XP
            </button>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-pill bg-cik-pink">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progressPct / 100 }}
              transition={reduced ? { duration: 0.15 } : motionSpring.reveal}
              style={{ originX: 0 }}
              className="h-full w-full rounded-pill bg-cik-cta"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="cik-footnote text-cik-text-2">
              {league.nextMinXp
                ? `${t.nextLeagueLabel}: ${league.nextMinXp} XP (${Math.max(0, league.nextMinXp - userXp)} XP)`
                : t.maxLeagueReached}
            </p>
            {myZoneBadge ? (
              <span className={`cik-caption-2 rounded-pill px-2 py-1 ${myZoneBadge.cls}`}>
                {myZoneBadge.label}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <p className="cik-footnote flex items-center gap-2 rounded-pill bg-cik-mint px-3 py-2 text-cik-mint-text">
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            {t.promotionZone}
          </p>
          <p className="cik-footnote flex items-center justify-end gap-2 rounded-pill bg-cik-rose px-3 py-2 text-cik-rose-text">
            <ArrowDownRight size={16} strokeWidth={2} aria-hidden="true" />
            {t.relegationZone}
          </p>
        </div>

        {hasError && (
          <div
            data-testid="leaderboard-error-state"
            className="mt-3 flex items-center justify-between gap-3 rounded-cik-md bg-cik-rose px-4 py-3 text-cik-rose-text"
          >
            <span className="cik-footnote inline-flex items-center gap-2">
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
              <span>{lang === 'tr' ? 'Bir şeyler ters gitti. Tekrar dene.' : 'Something went wrong. Try again.'}</span>
            </span>
            <Button onClick={() => void loadLeaderboard(false)}>
              {lang === 'tr' ? 'Tekrar dene' : 'Try again'}
            </Button>
          </div>
        )}

        <div data-testid="leaderboard-list" className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pb-4">
          {isLoading ? (
            <div data-testid="leaderboard-loading" className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map((skeletonIdx) => (
                <Skeleton key={skeletonIdx} className="h-14 w-full rounded-cik-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div data-testid="leaderboard-empty-state">
              <EmptyState
                title={lang === 'tr' ? 'Bu listede henüz skor yok.' : 'No scores on this list yet.'}
                body={
                  lang === 'tr'
                    ? 'Bir quiz ya da Scrolla maçı oyna, ilk satır senin olsun.'
                    : 'Play a quiz or a Scrolla match to take the first row.'
                }
                imageSrc={UI_ICON_PATHS.explorer}
              />
            </div>
          ) : (
            <>
              {entries.map((row, idx) => {
                const prevRow = idx > 0 ? entries[idx - 1] : null;
                const showPromotionCutoff = prevRow?.zone === 'promotion' && row.zone !== 'promotion';
                const showRelegationCutoff = row.zone === 'relegation' && prevRow?.zone !== 'relegation';
                const zoneClass = row.isUser
                  ? 'mx-0 w-full border-cik-cta bg-cik-pink text-cik-text shadow-e1'
                  : row.zone === 'promotion'
                    ? 'mx-0 w-full border-cik-mint bg-cik-surface text-cik-text'
                    : row.zone === 'relegation'
                      ? 'mx-0 w-full border-cik-rose bg-cik-surface text-cik-text'
                      : 'mx-0 w-full border-cik-line bg-cik-surface text-cik-text';
                return (
                  <React.Fragment key={row.id}>
                    {showPromotionCutoff && (
                      <div className="cik-caption-2 flex items-center gap-2 rounded-pill bg-cik-mint px-3 py-2 text-cik-mint-text">
                        <span className="h-1 flex-1 rounded-pill bg-cik-mint-text/30" />
                        <span>{t.promotionZone}</span>
                        <span className="h-1 flex-1 rounded-pill bg-cik-mint-text/30" />
                      </div>
                    )}
                    {showRelegationCutoff && (
                      <div className="cik-caption-2 flex items-center gap-2 rounded-pill bg-cik-rose px-3 py-2 text-cik-rose-text">
                        <span className="h-1 flex-1 rounded-pill bg-cik-rose-text/30" />
                        <span>{t.relegationZone}</span>
                        <span className="h-1 flex-1 rounded-pill bg-cik-rose-text/30" />
                      </div>
                    )}
                    <div
                      ref={row.isUser ? userRowRef : undefined}
                      data-zone={row.zone}
                      className={`flex min-h-[52px] items-center justify-between gap-2.5 rounded-cik-lg border px-3.5 py-2 ${zoneClass}`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span
                          className={`h-8 w-1 shrink-0 rounded-pill ${
                            row.zone === 'promotion'
                              ? 'bg-cik-mint-text'
                              : row.zone === 'relegation'
                                ? 'bg-cik-rose-text'
                                : 'bg-cik-line'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="cik-footnote cik-tabular w-7 shrink-0 text-center text-cik-text-2">
                          {row.rank === 1 ? (
                            <>
                              <Crown size={16} strokeWidth={2} className="mx-auto text-cik-butter-text" aria-hidden="true" />
                              <span className="sr-only">#1</span>
                            </>
                          ) : row.rank === 2 || row.rank === 3 ? (
                            <>
                              <Medal size={16} strokeWidth={2} className="mx-auto text-cik-text-2" aria-hidden="true" />
                              <span className="sr-only">#{row.rank}</span>
                            </>
                          ) : (
                            `#${row.rank}`
                          )}
                        </span>
                        <span className="shrink-0 text-base" aria-hidden="true">
                          {row.avatar}
                        </span>
                        <span className="cik-headline min-w-0 flex-1 truncate" title={row.name}>
                          {row.name}
                        </span>
                        {row.isUser ? (
                          <span className="cik-caption-2 shrink-0 rounded-pill bg-cik-cta px-2 py-0.5 text-cik-on-cta">
                            {t.youTag}
                          </span>
                        ) : null}
                      </div>
                      <div className="cik-footnote cik-tabular flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-cik-butter-text">
                          <img src={UI_ICON_PATHS.streakFire} alt="" aria-hidden="true" width={16} height={16} className="h-4 w-4 object-contain" />
                          {row.streak}
                        </span>
                        <span className="rounded-pill bg-cik-surface-2 px-2 py-1 text-cik-text">
                          {row.score.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )}

          <div data-testid="leaderboard-invite-card" className="rounded-cik-lg bg-cik-surface-2 p-5 text-center">
            <p className="cik-headline text-cik-text">{t.lbInviteTitle}</p>
            <p className="cik-subhead mt-1 text-cik-text-2">{t.lbInviteSubtitle}</p>
            <Button data-testid="leaderboard-invite-btn" className="mt-4 w-full" onClick={() => void handleInviteClick()}>
              {inviteCopied ? (
                <Check size={20} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Swords size={20} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{inviteCopied ? t.copiedLink : t.lbInviteBtn}</span>
            </Button>
          </div>

          {!authEmail && (
            <div
              data-testid="leaderboard-auth-cta"
              className="flex flex-wrap items-center justify-between gap-3 rounded-cik-lg bg-cik-surface p-4 shadow-e1"
            >
              <span className="cik-subhead text-cik-text">
                {lang === 'tr' ? 'Skorunu cihazlar arasında sakla' : 'Save your rank across devices'}
              </span>
              <Button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('scrolly-open-auth', { detail: { trigger: 'leaderboard' } }))
                }
              >
                <Mail size={16} strokeWidth={2} aria-hidden="true" />
                <span>{lang === 'tr' ? 'Hesabı bağla' : 'Connect account'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Dedicated pinned user footer outside the scrolling list so it never overlaps rows */}
        <div
          data-testid="leaderboard-pinned-user-footer"
          onClick={scrollToMyRank}
          className="mt-2 flex min-h-[54px] shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-cik-lg border-2 border-cik-cta bg-cik-pink px-3.5 py-2 text-cik-text shadow-e1"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="cik-footnote cik-tabular w-7 shrink-0 text-center font-extrabold text-cik-cta">
              #{myRank}
            </span>
            <span className="shrink-0 text-base" aria-hidden="true">
              {myEntry?.avatar || '🧭'}
            </span>
            <span className="cik-headline min-w-0 flex-1 truncate" title={myEntry?.name || nickname}>
              {myEntry?.name || nickname}
            </span>
            <span className="cik-caption-2 shrink-0 rounded-pill bg-cik-cta px-2 py-0.5 text-cik-on-cta">
              {t.youTag}
            </span>
          </div>
          <div className="cik-footnote cik-tabular flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 text-cik-butter-text">
              <img
                src={UI_ICON_PATHS.streakFire}
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
              {myEntry?.streak ?? streakDays}
            </span>
            <span className="rounded-pill bg-cik-surface px-2.5 py-1 font-extrabold text-cik-text">
              {activeTabScore.toLocaleString()} XP
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
