'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
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
  initialLeagueCode,
  onClearInitialLeagueCode,
}: FriendLeaguePanelProps) {
  const isEn = lang === 'en';
  const [leagueName, setLeagueName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [myLeagues, setMyLeagues] = useState<FriendLeagueSummary[]>([]);
  const [activeLeague, setActiveLeague] = useState<FriendLeagueRecord | null>(null);
  const [entries, setEntries] = useState<FriendLeagueMemberEntry[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<'leave' | 'delete' | null>(null);
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
      setLoading(true);
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
        setLoading(false);
      }
    },
    [isEn]
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
      if (initialLeagueCode && /^[A-Z0-9]{6,8}$/i.test(initialLeagueCode.trim())) {
        await joinLeagueByCode(initialLeagueCode, true);
        onClearInitialLeagueCode?.();
        return;
      }
      const list = await loadJoinedLeagues();
      if (!active) return;
      const storedCodes = readStoredLeagueCodes();
      const firstCode = list[0]?.code || storedCodes[0];
      if (firstCode) {
        await loadBoard(firstCode);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [initialLeagueCode, joinLeagueByCode, loadBoard, loadJoinedLeagues, onClearInitialLeagueCode]);

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

      if (filtered.length > 0) {
        await loadBoard(filtered[0].code);
      } else {
        setActiveLeague(null);
        setEntries([]);
        setInviteUrl('');
      }
    },
    [loadBoard, loadJoinedLeagues]
  );

  const handleConfirmLeave = async () => {
    if (!activeLeague || busyAction) return;
    const targetCode = activeLeague.code;
    const targetName = activeLeague.name;
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
      setBusyAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeLeague || busyAction) return;
    const targetCode = activeLeague.code;
    const targetName = activeLeague.name;
    setBusyAction(true);
    setErrorMessage(null);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(
        `/api/friend-leagues/${encodeURIComponent(targetCode)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        }
      );
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
      setBusyAction(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    const ok = await copyTextToClipboard(inviteUrl);
    if (ok) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2400);
    }
  };

  const handleWebShareInvite = async () => {
    if (!inviteUrl || !activeLeague) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: activeLeague.name,
          text: isEn
            ? `Join my "${activeLeague.name}" mini league on Scrolly!`
            : `Scrolly'deki "${activeLeague.name}" arkadaş ligime katıl!`,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await handleCopyInvite();
  };

  const isActiveLeagueCreator = Boolean(
    activeLeague &&
      (activeLeague.isCreator ||
        myLeagues.find((l) => l.code === activeLeague.code)?.isCreator ||
        (typeof window !== 'undefined' &&
          activeLeague.creatorDeviceId &&
          activeLeague.creatorDeviceId === getOrCreateDeviceId()))
  );

  return (
    <div data-testid="friend-league-panel" className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      <form
        onSubmit={handleCreateLeague}
        data-testid="friend-league-create-form"
        className="rounded-cik-lg border border-cik-line bg-cik-surface p-4 shadow-e1"
      >
        <p className="cik-headline text-cik-text">
          {isEn ? 'Create Private Friend / Class League' : 'Özel Arkadaş / Sınıf Ligi Kur'}
        </p>
        <p className="cik-caption-1 mt-1 text-cik-text-2">
          {isEn
            ? 'Compete in live Weekly XP rankings with just your invited friends.'
            : 'Sadece davet ettiğin arkadaşlarınla canlı haftalık XP yarışına gir.'}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            maxLength={40}
            data-testid="friend-league-name-input"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder={isEn ? 'e.g. Bio Study Group' : 'ör. 11-A / Ekip Ligi'}
            className="min-w-0 flex-1 rounded-cik-md border border-cik-line bg-cik-surface-2 px-3.5 py-2.5 text-[16px] font-semibold text-cik-text placeholder:text-cik-text-3"
          />
          <Button
            type="submit"
            disabled={busyAction}
            data-testid="friend-league-create-btn"
            className="shrink-0"
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span>{isEn ? 'Create & Get Link' : 'Lig Kur & Davet Linki Al'}</span>
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-2 rounded-cik-lg border border-cik-line bg-cik-surface p-3 shadow-e1">
        <input
          type="text"
          maxLength={200}
          data-testid="friend-league-join-input"
          value={joinCodeInput}
          onChange={(e) => setJoinCodeInput(extractInviteCode(e.target.value, 'league'))}
          onPaste={(e) => {
            const pasted = e.clipboardData?.getData('text');
            if (!pasted) return;
            e.preventDefault();
            setJoinCodeInput(extractInviteCode(pasted, 'league'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void joinLeagueByCode(joinCodeInput, true);
            }
          }}
          placeholder={
            isEn ? 'Invite code or link (e.g. K7M2P9)' : 'Davet kodu veya linki (ör. K7M2P9)'
          }
          className="min-w-0 flex-1 rounded-cik-md border border-cik-line bg-cik-surface-2 px-3 py-2 text-[16px] font-semibold uppercase tracking-wider text-cik-text placeholder:text-cik-text-3"
        />
        <Button
          tone="ghost"
          disabled={busyAction}
          data-testid="friend-league-join-btn"
          onClick={() => void joinLeagueByCode(joinCodeInput, true)}
          className="shrink-0"
        >
          {isEn ? 'Join' : 'Katıl'}
        </Button>
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

      {myLeagues.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="friend-league-pills">
          {myLeagues.map((item) => {
            const isSelected = activeLeague?.code === item.code;
            return (
              <button
                key={item.code}
                type="button"
                data-testid={`friend-league-pill-${item.code}`}
                aria-pressed={isSelected}
                onClick={() => void loadBoard(item.code)}
                className={`cik-footnote inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 py-1.5 ${
                  isSelected
                    ? 'border-cik-cta bg-cik-berry text-cik-on-berry shadow-e1'
                    : 'border-cik-line bg-cik-surface text-cik-text'
                }`}
              >
                {item.isCreator ? (
                  <Crown size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Users size={14} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{item.name}</span>
                <span className="cik-tabular opacity-80">({item.memberCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} className="h-14 w-full rounded-cik-lg" />
          ))}
        </div>
      ) : activeLeague ? (
        <div
          data-testid="friend-league-board"
          className="flex flex-col gap-2.5 rounded-cik-lg border border-cik-line bg-cik-surface p-4 shadow-e1"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="cik-title-3 truncate text-cik-text">{activeLeague.name}</h3>
                {isActiveLeagueCreator && (
                  <span className="cik-caption-2 inline-flex shrink-0 items-center gap-1 rounded-pill bg-cik-butter px-2 py-0.5 text-cik-butter-text">
                    <Crown size={12} strokeWidth={2} aria-hidden="true" />
                    <span>{isEn ? 'Creator' : 'Kurucu'}</span>
                  </span>
                )}
              </div>
              <p className="cik-caption-1 text-cik-text-2">
                {isEn
                  ? `Weekly XP · Code ${activeLeague.code} · ${entries.length} member(s)`
                  : `Haftalık XP · Kod: ${activeLeague.code} · ${entries.length} üye`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => void loadBoard(activeLeague.code)}
                aria-label={isEn ? 'Refresh league' : 'Ligi yenile'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text"
              >
                <RefreshCw size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="friend-league-copy-invite-btn"
                onClick={() => void handleCopyInvite()}
                className="cik-footnote inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-cik-cta px-3.5 text-cik-on-cta"
              >
                {copiedInvite ? (
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Copy size={16} strokeWidth={2} aria-hidden="true" />
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
                onClick={() => void handleWebShareInvite()}
                aria-label={isEn ? 'Share invite link' : 'Daveti paylaş'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text"
              >
                <Share2 size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={busyAction}
                data-testid="friend-league-leave-btn"
                onClick={() =>
                  setPendingConfirm((prev) => (prev === 'leave' ? null : 'leave'))
                }
                aria-label={isEn ? 'Leave league' : 'Ligden ayrıl'}
                className="cik-footnote inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface-2 px-3 text-cik-text"
              >
                <LogOut size={15} strokeWidth={2} aria-hidden="true" />
                <span>{isEn ? 'Leave' : 'Ligden Ayrıl'}</span>
              </button>
              {isActiveLeagueCreator && (
                <button
                  type="button"
                  disabled={busyAction}
                  data-testid="friend-league-delete-btn"
                  onClick={() =>
                    setPendingConfirm((prev) => (prev === 'delete' ? null : 'delete'))
                  }
                  aria-label={isEn ? 'Delete league' : 'Ligi sil'}
                  className="cik-footnote inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-cik-rose px-3 text-cik-rose-text"
                >
                  <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                  <span>{isEn ? 'Delete League' : 'Ligi Sil'}</span>
                </button>
              )}
            </div>
          </div>

          {pendingConfirm && (
            <div
              data-testid="friend-league-confirm-bar"
              className="flex flex-wrap items-center justify-between gap-2 rounded-cik-md bg-cik-rose px-3.5 py-2.5 text-cik-rose-text"
            >
              <p className="cik-footnote">
                {pendingConfirm === 'delete'
                  ? isEn
                    ? `Delete "${activeLeague.name}" permanently for all members?`
                    : `"${activeLeague.name}" ligini tüm üyeler için kalıcı olarak silmek istediğine emin misin?`
                  : isEn
                    ? `Leave "${activeLeague.name}"? Your XP and other leagues stay intact.`
                    : `"${activeLeague.name}" liginden ayrılmak istediğine emin misin? (XP puanın ve diğer liglerin korunur.)`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyAction}
                  data-testid={
                    pendingConfirm === 'delete'
                      ? 'friend-league-confirm-delete-btn'
                      : 'friend-league-confirm-leave-btn'
                  }
                  onClick={() =>
                    void (pendingConfirm === 'delete'
                      ? handleConfirmDelete()
                      : handleConfirmLeave())
                  }
                  className="cik-caption-1 inline-flex min-h-9 items-center gap-1 rounded-pill bg-cik-cta px-3.5 py-1.5 text-cik-on-cta"
                >
                  <span>
                    {pendingConfirm === 'delete'
                      ? isEn
                        ? 'Yes, Delete'
                        : 'Evet, Ligi Sil'
                      : isEn
                        ? 'Yes, Leave'
                        : 'Evet, Ayrıl'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busyAction}
                  data-testid="friend-league-cancel-confirm-btn"
                  onClick={() => setPendingConfirm(null)}
                  className="cik-caption-1 inline-flex min-h-9 items-center rounded-pill bg-cik-surface px-3 py-1.5 text-cik-text"
                >
                  <span>{isEn ? 'Cancel' : 'Vazgeç'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {entries.map((row) => (
              <div
                key={row.id}
                className={`flex min-h-[52px] items-center justify-between gap-2.5 rounded-cik-md border px-3.5 py-2 ${
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
    </div>
  );
}
