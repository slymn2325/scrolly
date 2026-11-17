'use client';

import React, { useEffect, useState } from 'react';
import { Mail, WifiOff } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS, type DockTabId } from '@/utils/icons8Assets';

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

const TAB_STATUS_COPY: Record<DockTabId, { tr: string; en: string }> = {
  explore: { tr: 'Keşfet', en: 'Explore' },
  quiz: { tr: 'Quiz', en: 'Quiz' },
  leaderboard: { tr: 'Liderlik', en: 'Leaderboard' },
  language: { tr: 'Dil', en: 'Language' },
  duel: { tr: 'Scrolla · 1v1', en: 'Scrolla · 1v1' },
  diploma: { tr: 'Profil', en: 'Profile' },
};

const NAV_ITEMS: Array<{
  id: DockTabId;
  tr: string;
  en: string;
  icon: keyof typeof DOCK_ICON_MAP;
}> = [
  { id: 'explore', tr: 'Keşfet', en: 'Explore', icon: 'explore' },
  { id: 'quiz', tr: 'Quiz', en: 'Quiz', icon: 'quiz' },
  { id: 'language', tr: 'Dil', en: 'Language', icon: 'language' },
  { id: 'diploma', tr: 'Profil', en: 'Profile', icon: 'diploma' },
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
  const [isOffline, setIsOffline] = useState(false);
  const isGuest = !accountEmail;

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

  const statusText = TAB_STATUS_COPY[activeTab]?.[lang] ?? TAB_STATUS_COPY.explore[lang];

  return (
    <aside
      data-testid="desktop-left-nav"
      data-theme={darkMode ? 'dark' : 'light'}
      className={`relative z-30 hidden h-full w-[232px] shrink-0 flex-col border-r px-4 py-5 lg:flex ${
        darkMode
          ? 'border-white/10 bg-[#0A0A0E] text-white'
          : 'border-[#1E1B2E]/10 bg-[#FFFDF9] text-[#1E1B2E]'
      }`}
    >
      <div className="mb-4 px-1 mb-6 px-2">
        <p className="font-display text-lg font-black tracking-tight xl:text-2xl">
          <span className="font-display text-3xl italic">Scrolly</span>
          <span className="hidden" aria-label="Scrolly">
            S
          </span>
        </p>
        <p
          className={`mt-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${
            darkMode ? 'text-white/65' : 'text-[#1E1B2E]/65'
          }`}
        >
          {lang === 'tr' ? 'Kaydır · Öğren · Şaşır' : 'Scroll · Learn · Wonder'}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Desktop main">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`desktop-nav-${item.id}`}
              aria-current={active ? 'page' : undefined}
              title={lang === 'tr' ? item.tr : item.en}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex h-12 items-center justify-center gap-3 rounded-xl border px-2 text-sm font-extrabold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 justify-start px-3 ${
                active
                  ? darkMode
                    ? 'border-white/15 bg-white/10 text-white before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-r-full before:bg-violet-400'
                    : 'border-[#1E1B2E]/15 bg-[#1E1B2E]/[0.08] text-[#1E1B2E] before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-r-full before:bg-violet-600'
                  : darkMode
                    ? 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
                    : 'border-transparent text-[#1E1B2E]/80 hover:bg-[#1E1B2E]/[0.05] hover:text-[#1E1B2E]'
              }`}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <img
                  src={DOCK_ICON_MAP[item.icon]}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  loading="eager"
                  decoding="sync"
                  className="h-6 w-6 object-contain drop-shadow-sm"
                />
                {item.id === 'quiz' && showQuizDot && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ${
                      darkMode ? 'ring-[#0A0A0E]' : 'ring-[#FFFDF9]'
                    }`}
                  />
                )}
              </span>
              <span className="">{lang === 'tr' ? item.tr : item.en}</span>
              
            </button>
          );
        })}
      </nav>

      <div
        className={`mt-auto space-y-2 border-t px-1 pt-3 px-2 pt-4 ${
          darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
        }`}
      >
        {isOffline && (
          <div
            data-testid="desktop-offline-badge"
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-extrabold justify-start px-3 ${
              darkMode
                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
            }`}
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden inline">
              {lang === 'tr' ? 'Çevrimdışı Mod · Hazır' : 'Offline Mode · Ready'}
            </span>
          </div>
        )}
        <button
          type="button"
          data-testid="desktop-scrolla-card"
          onClick={() => onSelectTab('duel')}
          className={`mb-2 w-full rounded-2xl border px-3 py-3 text-left ${darkMode ? 'border-white/10 bg-white/5' : 'border-black/10 bg-white/80'}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Scrolla</p>
          <p className="mt-1 text-sm font-semibold">{lang === 'tr' ? '1v1 bilgi düellosu' : '1v1 fact duel'}</p>
        </button>
        <div
          data-testid="desktop-session-box"
          className={`rounded-xl border px-2 py-2 px-3 py-2.5 ${
            darkMode ? 'border-white/10 bg-white/5' : 'border-[#1E1B2E]/10 bg-white'
          }`}
        >
          <p
            className={`hidden text-[10px] font-black uppercase tracking-wider xl:block ${
              darkMode ? 'text-white/65' : 'text-[#1E1B2E]/65'
            }`}
          >
            {lang === 'tr' ? 'Oturum' : 'Session'}
          </p>
          <p className="mt-0 flex items-center justify-center gap-1 text-xs font-extrabold tabular-nums mt-1 justify-start text-sm">
            <span>{streakDays}</span>
            <img
              src={UI_ICON_PATHS.streakFire}
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              decoding="async"
              className="h-4 w-4 shrink-0 object-contain"
            />
            <span className="hidden inline">· {xp.toLocaleString()} XP</span>
            <span className="hidden">{xp > 999 ? `${Math.round(xp / 1000)}k` : xp}</span>
          </p>
          <p
            data-testid="desktop-account-status"
            className={`mt-2 hidden truncate text-[11px] font-bold xl:block ${
              darkMode ? 'text-white/80' : 'text-[#1E1B2E]/80'
            }`}
            title={accountEmail || accountLabel || undefined}
          >
            {accountEmail || accountLabel
              ? accountLabel || accountEmail
              : lang === 'tr'
                ? 'Misafir oturum'
                : 'Guest session'}
          </p>
          {isGuest && onBindEmail && (
            <button
              type="button"
              data-testid="desktop-bind-email-btn"
              onClick={onBindEmail}
              className={`mt-2 hidden w-full items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 xl:flex ${
                darkMode
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-110'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:brightness-105'
              }`}
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{lang === 'tr' ? 'İlerlemeni Kaydet' : 'Save Progress'}</span>
            </button>
          )}
          {isGuest && onBindEmail && (
            <button
              type="button"
              data-testid="desktop-bind-email-btn-compact"
              onClick={onBindEmail}
              aria-label={lang === 'tr' ? 'E-posta Bağla' : 'Link Email'}
              className={`mt-2 flex h-9 w-full items-center justify-center rounded-xl hidden ${
                darkMode
                  ? 'bg-violet-600/90 text-white'
                  : 'bg-violet-600 text-white'
              }`}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p
          data-testid="desktop-nav-status"
          className={`hidden px-1 text-[10px] font-semibold leading-snug xl:block ${
            darkMode ? 'text-white/65' : 'text-[#1E1B2E]/65'
          }`}
        >
          {statusText}
        </p>
      </div>
    </aside>
  );
}
