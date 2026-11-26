'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Crown,
  LogOut,
  Medal,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/components/cikartma';
import type { Language } from '@/i18n/translations';
import type {
  FriendLeagueMemberEntry,
  FriendLeagueRecord,
  FriendLeagueSummary,
} from '@/lib/friendLeagues';
import { getOrCreateDeviceId } from '@/lib/telemetry';
import { copyTextToClipboard } from '@/utils/clipboard';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { extractInviteCode } from '@/utils/inviteCode';

interface FriendLeaguePanelProps {
  lang: Language;
  nickname: string;
  userWeeklyXp?: number;
  initialLeagueCode?: string | null;
  onClearInitialLeagueCode?: () => void;
}

const JOINED_LEAGUES_KEY = 'scrolly_joined_leagues_v1';

function readStoredLeagueCodes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(JOINED_LEAGUES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === 'string' && /^[A-Z0-9]{6,8}$/i.test(c))
      : [];
  } catch {
    return [];
  }
}

function saveStoredLeagueCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readStoredLeagueCodes().filter((c) => c !== code);
    window.localStorage.setItem(JOINED_LEAGUES_KEY, JSON.stringify([code, ...prev].slice(0, 12)));
  } catch {
    // Ignore storage quota failures
  }
}

function removeStoredLeagueCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = readStoredLeagueCodes().filter((c) => c !== code);
    window.localStorage.setItem(JOINED_LEAGUES_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures
  }
}

export default function FriendLeaguePanel({
  lang,
  nickname,
  userWeeklyXp = 0,
  initialLeagueCode,
  onClearInitialLeagueCode,
}: FriendLeaguePanelProps) {
  const isEn = lang === 'en';
  const [leagueName, setLeagueName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [myLeagues, setMyLeagues] = useState<FriendLeagueSummary[]>([]);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<FriendLeagueRecord | null>(null);
  const [entries, setEntries] = useState<FriendLeagueMemberEntry[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [boardLoadingCode, setBoardLoadingCode] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    code: string;
    name: string;
    mode: 'leave' | 'delete';
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadJoinedLeagues = useCallback(async () => {
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(
        `/api/friend-leagues?deviceId=${encodeURIComponent(deviceId)}`,
        { cache: 'no-store', credentials: 'same-origin' }
      );
      if (!res.ok) return [] as FriendLeagueSummary[];
      const data = (await res.json()) as { ok?: boolean; leagues?: FriendLeagueSummary[] };
      const list = Array.isArray(data.leagues) ? data.leagues : [];
      setMyLeagues(list);
      return list;
    } catch {
      return [] as FriendLeagueSummary[];
    }
  }, []);

  const loadBoard = useCallback(
    async (code: string) => {
      setBoardLoadingCode(code);
      setErrorMessage(null);
      setPendingConfirm(null);
      try {
        const deviceId = getOrCreateDeviceId();
        const res = await fetch(
          `/api/friend-leagues/${encodeURIComponent(code)}?deviceId=${encodeURIComponent(deviceId)}`,
          { cache: 'no-store', credentials: 'same-origin' }
        );
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          league?: FriendLeagueRecord;
          inviteUrl?: string;
          entries?: FriendLeagueMemberEntry[];
        } | null;
        if (!res.ok || !data?.ok || !data.league) {
          setErrorMessage(
            isEn ? 'Could not find that league.' : 'Bu lig kodu bulunamadı.'
          );
          return;
        }
        const loadedLeague = data.league;
        const loadedEntries = Array.isArray(data.entries) ? data.entries : [];
        const myRow = loadedEntries.find((e) => e.isUser);
        setActiveLeague(loadedLeague);
        setInviteUrl(
          data.inviteUrl ||
            `https://scrolly.live/?tab=leaderboard&league=${loadedLeague.code}`
        );
        setEntries(loadedEntries);
        saveStoredLeagueCode(loadedLeague.code);
        setMyLeagues((prev) =>
          prev.map((item) =>
            item.code === loadedLeague.code
              ? {
                  ...item,
                  name: loadedLeague.name,
                  memberCount: Math.max(1, loadedEntries.length),
                  myRank: myRow?.rank ?? item.myRank ?? 1,
                  myWeeklyXp: myRow?.weeklyXp ?? item.myWeeklyXp ?? userWeeklyXp,
                  isCreator: Boolean(loadedLeague.isCreator ?? item.isCreator),
                }
              : item
          )
        );
      } catch {
        setErrorMessage(
          isEn ? 'Failed to load league.' : 'Lig sıralaması yüklenemedi.'
        );
      } finally {
        setBoardLoadingCode((prev) => (prev === code ? null : prev));
      }
    },
    [isEn, userWeeklyXp]
  );

  const handleToggleLeagueCard = useCallback(
    (code: string) => {
      setPendingConfirm(null);
      if (expandedCode === code) {
        setExpandedCode(null);
        return;
      }
      setExpandedCode(code);
      void loadBoard(code);
    },
    [expandedCode, loadBoard]
  );

  const joinLeagueByCode = useCallback(
    async (rawCode: string, showJoinBanner = true) => {
      const cleanCode = extractInviteCode(rawCode, 'league');
      if (!/^[A-Z0-9]{6,8}$/.test(cleanCode)) {
        setErrorMessage(
          isEn
            ? 'Enter a valid 6–8 character invite code.'
            : 'Geçerli bir 6-8 haneli lig kodu gir.'
        );
        return;
      }
      setBusyAction(true);
      setErrorMessage(null);
      setPendingConfirm(null);
      try {
        const deviceId = getOrCreateDeviceId();
        const res = await fetch(
          `/api/friend-leagues/${encodeURIComponent(cleanCode)}`,
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, username: nickname }),
          }
        );
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          league?: FriendLeagueRecord;
          leagues?: FriendLeagueSummary[];
          inviteUrl?: string;
          entries?: FriendLeagueMemberEntry[];
        } | null;
        if (!res.ok || !data?.ok || !data.league) {
          if (data?.error === 'max_leagues_reached') {
            setErrorMessage(
              isEn
                ? 'You can join up to 10 active friend leagues at once. Leave one first.'
                : 'Aynı anda en fazla 10 aktif arkadaş ligine üye olabilirsin. Önce bir ligden ayrıl.'
            );
          } else {
            setErrorMessage(
              isEn ? 'League not found or invalid code.' : 'Lig bulunamadı veya kod geçersiz.'
            );
          }
          return;
        }
        setActiveLeague(data.league);
        setExpandedCode(data.league.code);
        setInviteUrl(
          data.inviteUrl ||
            `https://scrolly.live/?tab=leaderboard&league=${data.league.code}`
        );
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        saveStoredLeagueCode(data.league.code);
        setJoinCodeInput('');
        if (Array.isArray(data.leagues) && data.leagues.length > 0) {
          setMyLeagues(data.leagues);
        } else {
          await loadJoinedLeagues();
        }
        if (showJoinBanner) {
          setStatusMessage(
            isEn
              ? `Joined "${data.league.name}"!`
              : `"${data.league.name}" ligine katıldın!`
          );
        }
      } catch {
        setErrorMessage(
          isEn ? 'Could not join league.' : 'Lige katılınamadı.'
        );
      } finally {
        setBusyAction(false);
      }
    },
    [isEn, loadJoinedLeagues, nickname]
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      setInitialLoading(true);
      try {
        if (initialLeagueCode && /^[A-Z0-9]{6,8}$/i.test(initialLeagueCode.trim())) {
          await joinLeagueByCode(initialLeagueCode, true);
          onClearInitialLeagueCode?.();
          return;
        }
        await loadJoinedLeagues();
      } finally {
        if (active) setInitialLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [initialLeagueCode, joinLeagueByCode, loadJoinedLeagues, onClearInitialLeagueCode]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyAction) return;
    setBusyAction(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingConfirm(null);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/friend-leagues', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leagueName.trim() || (isEn ? 'Study Squad' : 'Arkadaş Ligi'),
          deviceId,
          username: nickname,
          lang,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        league?: FriendLeagueRecord;
        leagues?: FriendLeagueSummary[];
        inviteUrl?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.league) {
        if (data?.error === 'max_leagues_reached') {
          setErrorMessage(
            isEn
              ? 'You can have up to 10 active friend leagues at once. Leave or delete one first.'
              : 'Aynı anda en fazla 10 aktif arkadaş ligine üye olabilirsin. Önce bir ligden ayrıl veya sil.'
          );
        } else {
          setErrorMessage(
            isEn ? 'Could not create league.' : 'Lig kurulamadı, lütfen tekrar dene.'
          );
        }
        return;
      }
      const createdUrl =
        data.inviteUrl ||
        `https://scrolly.live/?tab=leaderboard&league=${data.league.code}`;
      setLeagueName('');
      setInviteUrl(createdUrl);
      setExpandedCode(data.league.code);
      saveStoredLeagueCode(data.league.code);
      if (Array.isArray(data.leagues) && data.leagues.length > 0) {
        setMyLeagues(data.leagues);
      } else {
        await loadJoinedLeagues();
      }
      const didCopy = await copyTextToClipboard(createdUrl);
      if (didCopy) {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2400);
        setStatusMessage(
          isEn
            ? `League created & invite link copied!`
            : `"${data.league.name}" kuruldu ve davet linki kopyalandı!`
        );
      } else {
        setStatusMessage(
          isEn ? `League "${data.league.name}" created!` : `"${data.league.name}" kuruldu!`
        );
      }
      await loadBoard(data.league.code);
    } catch {
      setErrorMessage(
        isEn ? 'Could not create league.' : 'Lig kurulamadı, bağlantını kontrol et.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const applyAfterLeaveOrDelete = useCallback(
    async (
      removedCode: string,
      serverLeagues: FriendLeagueSummary[] | undefined,
      bannerText: string
    ) => {
      removeStoredLeagueCode(removedCode);
      setPendingConfirm(null);
      setStatusMessage(bannerText);
      const updatedList = Array.isArray(serverLeagues)
        ? serverLeagues
        : await loadJoinedLeagues();
      const filtered = updatedList.filter((item) => item.code !== removedCode);
      setMyLeagues(filtered);
      setExpandedCode(null);
      if (activeLeague?.code === removedCode) {
        setActiveLeague(null);
        setEntries([]);
        setInviteUrl('');
      }
    },
    [activeLeague?.code, loadJoinedLeagues]
  );

  const handleConfirmLeave = async () => {
    const targetCode = pendingConfirm?.code || expandedCode || activeLeague?.code;
    if (!targetCode || busyAction) return;
    const targetName =
      pendingConfirm?.name ||
      myLeagues.find((l) => l.code === targetCode)?.name ||
      activeLeague?.name ||
      targetCode;
    setBusyAction(true);
    setErrorMessage(null);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/friend-leagues/leave', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode, deviceId }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        leagues?: FriendLeagueSummary[];
      } | null;
      if (!res.ok || !data?.ok) {
        setErrorMessage(
          isEn ? 'Could not leave league.' : 'Ligden ayrılırken bir hata oluştu.'
        );
        return;
      }
      await applyAfterLeaveOrDelete(
        targetCode,
        data.leagues,
        isEn ? `You left "${targetName}".` : `"${targetName}" liginden ayrıldın.`
      );
    } catch {
      setErrorMessage(
        isEn ? 'Could not leave league.' : 'Ligden ayrılırken bağlantı hatası oluştu.'
      );
    } finally {
      setPendingConfirm(null);
      setBusyAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    const targetCode = pendingConfirm?.code || expandedCode || activeLeague?.code;
    if (!targetCode || busyAction) return;
    const targetName =
      pendingConfirm?.name ||
      myLeagues.find((l) => l.code === targetCode)?.name ||
      activeLeague?.name ||
      targetCode;
    setBusyAction(true);
    setErrorMessage(null);
    try {
      const deviceId = getOrCreateDeviceId();
      let res = await fetch(
        `/api/friend-leagues/${encodeURIComponent(targetCode)}?deviceId=${encodeURIComponent(deviceId)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
        }
      );
      if (res.status === 405 || res.status === 400) {
        res = await fetch(
          `/api/friend-leagues/${encodeURIComponent(targetCode)}`,
          {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', deviceId }),
          }
        );
      }
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        leagues?: FriendLeagueSummary[];
      } | null;
      if (!res.ok || !data?.ok) {
        setErrorMessage(
          data?.error === 'forbidden_not_creator'
            ? isEn
              ? 'Only the league creator can delete this league.'
              : 'Bu ligi yalnızca lig kurucusu silebilir.'
            : isEn
              ? 'Could not delete league.'
              : 'Lig silinemedi, lütfen tekrar dene.'
        );
        return;
      }
      await applyAfterLeaveOrDelete(
        targetCode,
        data.leagues,
        isEn ? `Deleted "${targetName}".` : `"${targetName}" ligi silindi.`
      );
    } catch {
      setErrorMessage(
        isEn ? 'Could not delete league.' : 'Lig silinirken bağlantı hatası oluştu.'
      );
    } finally {
      setPendingConfirm(null);
      setBusyAction(false);
    }
  };

  const handleCopyInvite = async (codeForFallback?: string) => {
    const targetUrl =
      inviteUrl ||
      (codeForFallback
        ? `https://scrolly.live/?tab=leaderboard&league=${codeForFallback}`
        : '');
    if (!targetUrl) return;
    const ok = await copyTextToClipboard(targetUrl);
    if (ok) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2400);
    }
  };

  const handleWebShareInvite = async (leagueItem: { code: string; name: string }) => {
    const targetUrl =
      (activeLeague?.code === leagueItem.code ? inviteUrl : '') ||
      `https://scrolly.live/?tab=leaderboard&league=${leagueItem.code}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: leagueItem.name,
          text: isEn
            ? `Join my "${leagueItem.name}" mini league on Scrolly!`
            : `Scrolly'deki "${leagueItem.name}" arkadaş ligime katıl!`,
          url: targetUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await handleCopyInvite(leagueItem.code);
  };

  return (
    <div data-testid="friend-league-panel" className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-20 sm:pb-8">
      {/* Responsive Create & Join bar */}
      <div className="grid grid-cols-1 gap-2.5 rounded-cik-lg border border-cik-line bg-cik-surface p-3 shadow-e1 xl:grid-cols-2">
        <form
          onSubmit={handleCreateLeague}
          data-testid="friend-league-create-form"
          className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap"
        >
          <input
            type="text"
            maxLength={40}
            data-testid="friend-league-name-input"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder={isEn ? 'New league name (e.g. 11-A)' : 'Yeni lig adı (ör. Sınıf 11-A)'}
            className="min-w-0 flex-1 basis-[11rem] rounded-cik-md border border-cik-line bg-cik-surface-2 px-3 py-2 text-[16px] font-semibold text-cik-text placeholder:text-cik-text-3"
          />
          <Button
            type="submit"
            disabled={busyAction}
            data-testid="friend-league-create-btn"
            className="w-full shrink-0 justify-center sm:w-auto"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            <span>{isEn ? 'Create' : 'Lig Kur'}</span>
          </Button>
        </form>

        <div className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap">
          <input
            type="text"
            maxLength={240}
            data-testid="friend-league-join-input"
            value={joinCodeInput}
            onChange={(e) => {
              const val = e.target.value;
              if (/[/:?=.\s]/.test(val)) {
                const extracted = extractInviteCode(val, 'league');
                if (/^[A-Z0-9]{6,8}$/.test(extracted)) {
                  setJoinCodeInput(extracted);
                  return;
                }
                setJoinCodeInput(val.slice(0, 240));
                return;
              }
              setJoinCodeInput(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData('text');
              if (!pasted) return;
              const extracted = extractInviteCode(pasted, 'league');
              e.preventDefault();
              setJoinCodeInput(extracted || pasted.trim().slice(0, 240));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void joinLeagueByCode(joinCodeInput, true);
              }
            }}
            placeholder={
              isEn ? 'Code or invite link (K7M2P9)' : 'Kod veya davet linki (K7M2P9)'
            }
            className="min-w-0 flex-1 basis-[11rem] rounded-cik-md border border-cik-line bg-cik-surface-2 px-3 py-2 text-[16px] font-semibold tracking-wider text-cik-text placeholder:tracking-normal placeholder:text-cik-text-3"
          />
          <Button
            tone="ghost"
            disabled={busyAction}
            data-testid="friend-league-join-btn"
            onClick={() => void joinLeagueByCode(joinCodeInput, true)}
            className="w-full shrink-0 justify-center border border-cik-line sm:w-auto"
          >
            {isEn ? 'Join' : 'Katıl'}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          data-testid="friend-league-status"
          className="cik-footnote rounded-cik-md bg-cik-mint px-3.5 py-2.5 text-cik-mint-text"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          data-testid="friend-league-error"
          className="cik-footnote rounded-cik-md bg-cik-rose px-3.5 py-2.5 text-cik-rose-text"
        >
          {errorMessage}
        </div>
      )}

      {/* Joined Leagues Catalog + Accordion Cards */}
      {initialLoading && myLeagues.length === 0 ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} className="h-16 w-full rounded-cik-lg" />
          ))}
        </div>
      ) : myLeagues.length > 0 ? (
        <div className="flex flex-col gap-2.5" data-testid="friend-league-pills">
          {myLeagues.map((item) => {
            const isExpanded = expandedCode === item.code;
            const isLoadedBoard = activeLeague?.code === item.code;
            const isThisLoading = boardLoadingCode === item.code;
            const myLoadedRow = isLoadedBoard ? entries.find((e) => e.isUser) : undefined;
            const displayMemberCount =
              isLoadedBoard && entries.length > 0 ? entries.length : item.memberCount;
            const displayRank = myLoadedRow?.rank ?? item.myRank ?? 1;
            const displayXp =
              myLoadedRow?.weeklyXp ?? item.myWeeklyXp ?? userWeeklyXp ?? 0;
            const isCreator = Boolean(
              item.isCreator ||
                (isLoadedBoard &&
                  (activeLeague?.isCreator ||
                    (typeof window !== 'undefined' &&
                      activeLeague?.creatorDeviceId &&
                      activeLeague.creatorDeviceId === getOrCreateDeviceId())))
            );

            return (
              <div
                key={item.code}
                data-testid={`friend-league-card-${item.code}`}
                className={`overflow-hidden rounded-cik-lg border transition-all duration-200 ${
                  isExpanded
                    ? 'border-cik-cta bg-cik-surface shadow-e2'
                    : 'border-cik-line bg-cik-surface shadow-e1'
                }`}
              >
                <button
                  type="button"
                  data-testid={`friend-league-pill-${item.code}`}
                  aria-expanded={isExpanded}
                  onClick={() => handleToggleLeagueCard(item.code)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-all"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill ${
                        isExpanded
                          ? 'bg-cik-berry text-cik-on-berry'
                          : 'bg-cik-pink text-cik-cta'
                      }`}
                    >
                      {isCreator ? (
                        <Crown size={18} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <Users size={18} strokeWidth={2} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="cik-headline truncate text-cik-text">
                          {item.name}
                        </span>
                        {isCreator && (
                          <span className="cik-caption-2 shrink-0 rounded-pill bg-cik-butter px-2 py-0.5 text-cik-butter-text">
                            {isEn ? 'Creator' : 'Kurucu'}
                          </span>
                        )}
                      </div>
                      <p className="cik-caption-1 mt-0.5 truncate text-cik-text-2">
                        {isEn
                          ? `${displayMemberCount} member(s) · Weekly XP`
                          : `${displayMemberCount} üye · Haftalık XP`}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="cik-footnote cik-tabular rounded-pill bg-cik-pink px-2.5 py-1 text-cik-cta">
                      #{displayRank}
                    </span>
                    <span className="cik-footnote cik-tabular rounded-pill bg-cik-surface-2 px-3 py-1 text-cik-text">
                      {displayXp.toLocaleString()} XP
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                      className={`shrink-0 text-cik-text-2 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-cik-cta' : ''
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div
                    data-testid="friend-league-board"
                    className="flex flex-col gap-2.5 border-t border-cik-line bg-cik-surface px-4 pb-4 pt-3 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="cik-caption-1 rounded-pill bg-cik-surface-2 px-3 py-1.5 font-mono text-cik-text-2">
                        {isEn ? `Code: ${item.code}` : `Kod: ${item.code}`}
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void loadBoard(item.code)}
                          aria-label={isEn ? 'Refresh league' : 'Ligi yenile'}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text"
                        >
                          <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          data-testid="friend-league-copy-invite-btn"
                          onClick={() => void handleCopyInvite(item.code)}
                          className="cik-footnote inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-cik-cta px-3.5 text-cik-on-cta"
                        >
                          {copiedInvite ? (
                            <Check size={15} strokeWidth={2} aria-hidden="true" />
                          ) : (
                            <Copy size={15} strokeWidth={2} aria-hidden="true" />
                          )}
                          <span>
                            {copiedInvite
                              ? isEn
                                ? 'Copied'
                                : 'Kopyalandı'
                              : isEn
                                ? 'Copy Invite'
                                : 'Davet Kopyala'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleWebShareInvite(item)}
                          aria-label={isEn ? 'Share invite link' : 'Daveti paylaş'}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text"
                        >
                          <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={busyAction}
                          data-testid="friend-league-leave-btn"
                          onClick={() =>
                            setPendingConfirm((prev) =>
                              prev?.code === item.code && prev.mode === 'leave'
                                ? null
                                : { code: item.code, name: item.name, mode: 'leave' }
                            )
                          }
                          aria-label={isEn ? 'Leave league' : 'Ligden ayrıl'}
                          className="cik-footnote inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface-2 px-3 text-cik-text"
                        >
                          <LogOut size={15} strokeWidth={2} aria-hidden="true" />
                          <span>{isEn ? 'Leave' : 'Ligden Ayrıl'}</span>
                        </button>
                        {isCreator && (
                          <button
                            type="button"
                            disabled={busyAction}
                            data-testid="friend-league-delete-btn"
                            onClick={() =>
                              setPendingConfirm((prev) =>
                                prev?.code === item.code && prev.mode === 'delete'
                                  ? null
                                  : { code: item.code, name: item.name, mode: 'delete' }
                              )
                            }
                            aria-label={isEn ? 'Delete league' : 'Ligi sil'}
                            className="cik-footnote inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-cik-rose px-3 text-cik-rose-text"
                          >
                            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                            <span>{isEn ? 'Delete League' : 'Ligi Sil'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isThisLoading && !isLoadedBoard ? (
                      <div className="flex flex-col gap-2">
                        {[0, 1, 2].map((idx) => (
                          <Skeleton key={idx} className="h-12 w-full rounded-cik-md" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {entries.map((row) => (
                          <div
                            key={row.id}
                            className={`flex min-h-[50px] items-center justify-between gap-2.5 rounded-cik-md border px-3.5 py-2 ${
                              row.isUser
                                ? 'border-cik-cta bg-cik-pink text-cik-text'
                                : 'border-cik-line bg-cik-surface-2 text-cik-text'
                            }`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <span className="cik-footnote cik-tabular w-7 shrink-0 text-center text-cik-text-2">
                                {row.rank === 1 ? (
                                  <Crown
                                    size={16}
                                    strokeWidth={2}
                                    className="mx-auto text-cik-butter-text"
                                    aria-hidden="true"
                                  />
                                ) : row.rank === 2 || row.rank === 3 ? (
                                  <Medal
                                    size={16}
                                    strokeWidth={2}
                                    className="mx-auto text-cik-text-2"
                                    aria-hidden="true"
                                  />
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
                                  {isEn ? 'YOU' : 'SEN'}
                                </span>
                              ) : null}
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
                                {row.streak}
                              </span>
                              <span className="rounded-pill bg-cik-surface px-2.5 py-1 text-cik-text">
                                {row.weeklyXp.toLocaleString()} XP
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={isEn ? 'No friend league yet' : 'Henüz bir arkadaş ligin yok'}
          body={
            isEn
              ? 'Create a mini league above or paste a friend’s invite code to compete weekly.'
              : 'Yukarıdan yeni bir lig kur veya arkadaşının paylaştığı kodu girerek hemen katıl.'
          }
          imageSrc={UI_ICON_PATHS.explorer}
        />
      )}

      {pendingConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          data-testid="friend-league-confirm-bar"
          onClick={() => !busyAction && setPendingConfirm(null)}
          className="cik-scrim fixed inset-0 z-modal flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-sticker border border-cik-line bg-cik-bg-elevated p-5 text-cik-text shadow-e3"
          >
            <h3 className="cik-title-3 text-cik-text">
              {pendingConfirm.mode === 'delete'
                ? isEn
                  ? 'Delete League?'
                  : 'Ligi Sil?'
                : isEn
                  ? 'Leave League?'
                  : 'Ligden Ayrıl?'}
            </h3>
            <p className="cik-body mt-2 text-cik-text-2">
              {pendingConfirm.mode === 'delete'
                ? isEn
                  ? `Delete "${pendingConfirm.name}" permanently for all members?`
                  : `"${pendingConfirm.name}" ligini tüm üyeler için kalıcı olarak silmek istediğine emin misin?`
                : isEn
                  ? `Leave "${pendingConfirm.name}"? Your XP and other leagues stay intact.`
                  : `"${pendingConfirm.name}" liginden ayrılmak istediğine emin misin? XP puanın ve diğer liglerin korunur.`}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={busyAction}
                data-testid={
                  pendingConfirm.mode === 'delete'
                    ? 'friend-league-confirm-delete-btn'
                    : 'friend-league-confirm-leave-btn'
                }
                onClick={() =>
                  void (pendingConfirm.mode === 'delete'
                    ? handleConfirmDelete()
                    : handleConfirmLeave())
                }
                className="cik-headline inline-flex min-h-11 flex-1 items-center justify-center rounded-pill bg-cik-rose px-4 text-cik-rose-text disabled:opacity-60"
              >
                {busyAction
                  ? isEn
                    ? 'Working...'
                    : 'İşleniyor...'
                  : pendingConfirm.mode === 'delete'
                    ? isEn
                      ? 'Yes, Delete'
                      : 'Evet, Ligi Sil'
                    : isEn
                      ? 'Yes, Leave'
                      : 'Evet, Ayrıl'}
              </button>
              <button
                type="button"
                disabled={busyAction}
                data-testid="friend-league-cancel-confirm-btn"
                onClick={() => setPendingConfirm(null)}
                className="cik-headline inline-flex min-h-11 flex-1 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 px-4 text-cik-text disabled:opacity-60"
              >
                {isEn ? 'Cancel' : 'Vazgeç'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
