'use client';

import React, { useEffect, useState } from 'react';
import { Mail, WifiOff } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import type { DockTabId } from '@/utils/fluentAssets';
import BrandLogo from '@/components/BrandLogo';
import Icon from '@/components/cikartma/Icon';
import type { IconName } from '@/lib/iconMap';

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
  const [isOffline, setIsOffline] = useState(
    () => (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  );
  const isGuest = !accountEmail;
  const highlightedTab = activeTab === 'language' ? 'explore' : activeTab;
  const locale = lang === 'en' ? 'en' : 'tr';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOffline(navigator.onLine === false);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

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
              className={`relative flex min-h-[52px] items-center justify-start gap-3 rounded-pill px-3 cik-headline ${
                active ? 'bg-cik-pink text-cik-cta' : 'text-cik-text'
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
          className="rounded-cik-lg border border-cik-line bg-cik-surface px-3 py-3 shadow-e1"
        >
          <p className="cik-caption-2 text-cik-text-2">{lang === 'tr' ? 'Oturum' : 'Session'}</p>
          <p className="cik-headline mt-1 flex items-center gap-2 text-cik-text">
            <span className="cik-tabular">{streakDays}</span>
            <Icon name="streak" size={16} tone="default" />
            <span className="cik-tabular">· {xp.toLocaleString(locale)} XP</span>
          </p>
          <p
            data-testid="desktop-account-status"
            className="cik-caption-1 mt-2 truncate text-cik-text-2"
            title={accountEmail || accountLabel || undefined}
          >
            {accountEmail || accountLabel
              ? accountLabel || accountEmail
              : lang === 'tr'
                ? 'Misafir oturum'
                : 'Guest session'}
          </p>
          {isGuest && onBindEmail ? (
            <button
              type="button"
              data-testid="desktop-bind-email-btn"
              onClick={onBindEmail}
              className="cik-footnote mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-3 text-cik-on-cta"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{lang === 'tr' ? 'İlerlemeni kaydet' : 'Save progress'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
