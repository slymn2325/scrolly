'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Sparkles, WifiOff } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import type { DockTabId } from '@/utils/fluentAssets';
import BrandLogo from '@/components/BrandLogo';
import Icon from '@/components/cikartma/Icon';
import type { IconName } from '@/lib/iconMap';
import { useVerifiedOfflineStatus } from '@/utils/networkStatus';
import { localizeDisplayNickname } from '@/utils/userMemory';

interface DesktopLeftNavProps {
  activeTab: DockTabId;
  lang: Language;
  darkMode: boolean;
  showQuizDot: boolean;
  xp: number;
  streakDays: number;
  accountLabel?: string | null;
  accountEmail?: string | null;
  onSelectTab: (tab: DockTabId) => void;
  onBindEmail?: () => void;
}

const NAV_ITEMS: Array<{
  id: DockTabId;
  tr: string;
  en: string;
  icon: IconName;
}> = [
  { id: 'explore', tr: 'Keşfet', en: 'Explore', icon: 'explore' },
  { id: 'quiz', tr: 'Quiz', en: 'Quiz', icon: 'quiz' },
  { id: 'leaderboard', tr: 'Sıralama', en: 'Leaderboard', icon: 'leaderboard' },
  { id: 'duel', tr: 'Scrolla', en: 'Scrolla', icon: 'duel' },
  { id: 'diploma', tr: 'Profil', en: 'Profile', icon: 'profile' },
];

export default function DesktopLeftNav({
  activeTab,
  lang,
  darkMode,
  showQuizDot,
  xp,
  streakDays,
  accountLabel = null,
  accountEmail = null,
  onSelectTab,
  onBindEmail,
}: DesktopLeftNavProps) {
  const isOffline = useVerifiedOfflineStatus();
  const isGuest = !accountEmail;
  const highlightedTab = activeTab === 'language' ? 'explore' : activeTab;
  const locale = lang === 'en' ? 'en' : 'tr';
  const displayAccountLabel = accountLabel ? localizeDisplayNickname(accountLabel, lang) : null;

  return (
    <aside
      data-testid="desktop-left-nav"
      data-theme={darkMode ? 'dark' : 'light'}
      lang={locale}
      className="relative z-content hidden h-full w-[232px] shrink-0 flex-col border-r border-cik-line bg-cik-bg px-4 py-5 text-cik-text lg:flex"
    >
      <div className="mb-6 flex items-center gap-3 px-2">
        <BrandLogo size={40} id="desktop-nav-brand" />
        <div className="min-w-0">
          <p className="cik-title-3 text-cik-text">Scrolly</p>
          <p className="cik-caption-2 text-cik-text-2">
            {lang === 'tr' ? 'Kaydır · Öğren · Şaşır' : 'Scroll · Learn · Wonder'}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2" aria-label={lang === 'tr' ? 'Ana menü' : 'Main'}>
        {NAV_ITEMS.map((item) => {
          const active = highlightedTab === item.id;
          const label = lang === 'tr' ? item.tr : item.en;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`desktop-nav-${item.id}`}
              aria-current={active ? 'page' : undefined}
              title={label}
              onClick={() => onSelectTab(item.id)}
              className={`scrolly-tactile relative flex min-h-[48px] items-center justify-start gap-3 rounded-pill px-3.5 cik-headline ${
                active
                  ? 'scrolly-glass-pill bg-cik-pink text-cik-cta'
                  : 'text-cik-text hover:bg-cik-surface'
              }`}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon name={item.icon} size={24} tone={active ? 'active' : 'default'} />
                {item.id === 'quiz' && showQuizDot ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-pill bg-cik-cta ring-2 ring-cik-bg" />
                ) : null}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}

        <Link
          href="/studio"
          data-testid="desktop-nav-create"
          title={lang === 'tr' ? 'Hikâye Stüdyosu' : 'Creator Studio'}
          className="scrolly-glass-pill scrolly-tactile mt-2 flex min-h-[46px] items-center justify-between gap-1.5 rounded-pill bg-cik-surface px-2.5 text-[13px] font-extrabold text-cik-cta hover:bg-cik-pink"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {lang === 'tr' ? 'Hikâye Stüdyosu' : 'Creator Studio'}
            </span>
          </span>
          <span className="shrink-0 rounded-pill bg-cik-cta px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-cik-on-cta">
            New
          </span>
        </Link>
      </nav>

      <div className="mt-auto space-y-3 border-t border-cik-line px-1 pt-4">
        {isOffline ? (
          <div
            data-testid="desktop-offline-badge"
            className="flex min-h-11 items-center gap-2 rounded-cik-md bg-cik-mint px-3 text-cik-mint-text"
          >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="cik-caption-1">
              {lang === 'tr' ? 'Çevrimdışısın' : "You're offline"}
            </span>
          </div>
        ) : null}
        <div
          data-testid="desktop-session-box"
          className="scrolly-glass-surface rounded-2xl p-3.5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-cik-text-2">
            {lang === 'tr' ? 'Oturum' : 'Session'}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-cik-text">
            <span className="tabular-nums">{streakDays}</span>
            <Icon name="streak" size={16} tone="default" />
            <span className="tabular-nums">· {xp.toLocaleString(locale)} XP</span>
          </p>
          <p
            data-testid="desktop-account-status"
            className="mt-2 truncate text-xs font-medium text-cik-text"
            title={accountEmail || displayAccountLabel || undefined}
          >
            {accountEmail || displayAccountLabel
              ? displayAccountLabel || accountEmail
              : lang === 'tr'
                ? 'Misafir oturum'
                : 'Guest session'}
          </p>
          {isGuest && onBindEmail ? (
            <button
              type="button"
              data-testid="desktop-bind-email-btn"
              onClick={onBindEmail}
              className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-cik-cta px-3 text-xs font-semibold text-cik-on-cta"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="leading-none">{lang === 'tr' ? 'İlerlemeyi kaydet' : 'Save progress'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
