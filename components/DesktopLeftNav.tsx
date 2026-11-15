'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS, type DockTabId } from '@/utils/icons8Assets';

interface DesktopLeftNavProps {
  activeTab: DockTabId;
  lang: Language;
  darkMode: boolean;
  showQuizDot: boolean;
  xp: number;
  streakDays: number;
  onSelectTab: (tab: DockTabId) => void;
}

const TAB_STATUS_COPY: Record<DockTabId, { tr: string; en: string }> = {
  explore: { tr: 'Keşfet · Tam ekran Reels', en: 'For You · Full-screen Reels' },
  quiz: { tr: 'Quiz · Hafıza & Sprint', en: 'Quiz · Memory & Sprint' },
  leaderboard: { tr: 'Liderlik · Canlı Lig', en: 'Leaderboard · Live League' },
  duel: { tr: 'Scrolla · 1v1 & Grup', en: 'Scrolla · 1v1 & Group' },
  diploma: { tr: 'Profil · Kaşif Diploması', en: 'Profile · Explorer Diploma' },
};

const NAV_ITEMS: Array<{ id: DockTabId; tr: string; en: string; icon: keyof typeof DOCK_ICON_MAP; badge?: string }> = [
  { id: 'explore', tr: 'Keşfet', en: 'For You', icon: 'explore' },
  { id: 'quiz', tr: 'Quiz', en: 'Quiz', icon: 'quiz' },
  { id: 'leaderboard', tr: 'Liderlik', en: 'Leaderboard', icon: 'leaderboard' },
  { id: 'duel', tr: 'Scrolla', en: 'Scrolla', icon: 'duel', badge: '1v1' },
  { id: 'diploma', tr: 'Profil', en: 'Profile', icon: 'diploma' },
];

export default function DesktopLeftNav({
  activeTab,
  lang,
  darkMode,
  showQuizDot,
  xp,
  streakDays,
  onSelectTab,
}: DesktopLeftNavProps) {
  const [isOffline, setIsOffline] = useState(false);

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
      className={`relative z-30 hidden h-full w-[220px] shrink-0 flex-col border-r px-3 py-4 lg:flex xl:w-[240px] ${
        darkMode
          ? 'border-white/10 bg-[#0A0A0E] text-white'
          : 'border-[#1E1B2E]/10 bg-[#FFFDF9] text-[#1E1B2E]'
      }`}
    >
      <div className="mb-6 px-2">
        <p className="font-display text-2xl font-black tracking-tight">Scrolly</p>
        <p className={`mt-1 text-[11px] font-semibold ${darkMode ? 'text-white/50' : 'text-[#1E1B2E]/55'}`}>
          {lang === 'tr' ? 'Kaydır · Öğren · Şaşır' : 'Scroll · Learn · Wonder'}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Desktop main">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          const isDuel = item.id === 'duel';
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`desktop-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex h-12 items-center gap-3 rounded-xl border px-3 text-sm font-extrabold transition ${
                active
                  ? isDuel
                    ? darkMode
                      ? 'border-violet-400/40 bg-violet-500/20 text-white shadow-sm shadow-violet-500/20'
                      : 'border-violet-300/70 bg-violet-50 text-violet-950 shadow-sm'
                    : darkMode
                      ? 'border-white/10 bg-white/10 text-white'
                      : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.08] text-[#1E1B2E]'
                  : isDuel
                    ? darkMode
                      ? 'border-violet-500/20 bg-violet-500/[0.06] text-white/85 hover:border-violet-400/40 hover:bg-violet-500/15 hover:text-white'
                      : 'border-violet-200/70 bg-violet-50/50 text-[#1E1B2E]/85 hover:border-violet-300 hover:bg-violet-50 hover:text-[#1E1B2E]'
                    : darkMode
                      ? 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                      : 'border-transparent text-[#1E1B2E]/70 hover:bg-[#1E1B2E]/[0.05] hover:text-[#1E1B2E]'
              }`}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <img
                  src={DOCK_ICON_MAP[item.icon]}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  decoding="async"
                  className="h-6 w-6 object-contain"
                />
                {item.id === 'quiz' && showQuizDot && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ${
                      darkMode ? 'ring-[#0A0A0E]' : 'ring-[#FFFDF9]'
                    }`}
                  />
                )}
              </span>
              <span>{lang === 'tr' ? item.tr : item.en}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto space-y-2 border-t px-2 pt-4 ${darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'}`}>
        {isOffline && (
          <div
            data-testid="desktop-offline-badge"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold ${
              darkMode
                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
            }`}
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>{lang === 'tr' ? 'Çevrimdışı Mod · Hazır' : 'Offline Mode · Ready'}</span>
          </div>
        )}
        <div
          className={`rounded-xl border px-3 py-2.5 ${
            darkMode ? 'border-white/10 bg-white/5' : 'border-[#1E1B2E]/10 bg-white'
          }`}
        >
          <p
            className={`text-[10px] font-black uppercase tracking-wider ${
              darkMode ? 'text-white/45' : 'text-[#1E1B2E]/45'
            }`}
          >
            {lang === 'tr' ? 'Oturum' : 'Session'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold">
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
            <span>· {xp} XP</span>
          </p>
        </div>
        <p
          data-testid="desktop-nav-status"
          className={`px-1 text-[10px] font-semibold leading-snug ${darkMode ? 'text-white/40' : 'text-[#1E1B2E]/45'}`}
        >
          {statusText}
        </p>
      </div>
    </aside>
  );
}
