'use client';

import React from 'react';
import { type Language, translations } from '@/i18n/translations';
import { DOCK_ICON_MAP, type DockTabId } from '@/utils/icons8Assets';

interface DesktopLeftNavProps {
  activeTab: DockTabId;
  lang: Language;
  darkMode: boolean;
  showQuizDot: boolean;
  xp: number;
  streakDays: number;
  onSelectTab: (tab: DockTabId) => void;
}

const NAV_ITEMS: Array<{ id: DockTabId; tr: string; en: string; icon: keyof typeof DOCK_ICON_MAP }> = [
  { id: 'explore', tr: 'Keşfet', en: 'For You', icon: 'explore' },
  { id: 'quiz', tr: 'Quiz', en: 'Quiz', icon: 'quiz' },
  { id: 'leaderboard', tr: 'Liderlik', en: 'Leaderboard', icon: 'leaderboard' },
  { id: 'duel', tr: 'Düello', en: 'Duel', icon: 'duel' },
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
  const t = translations[lang];

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
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`desktop-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-extrabold transition ${
                active
                  ? darkMode
                    ? 'bg-white/10 text-white'
                    : 'bg-[#1E1B2E]/8 text-[#1E1B2E]'
                  : darkMode
                    ? 'text-white/70 hover:bg-white/5 hover:text-white'
                    : 'text-[#1E1B2E]/70 hover:bg-[#1E1B2E]/5 hover:text-[#1E1B2E]'
              }`}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <img
                  src={DOCK_ICON_MAP[item.icon]}
                  alt=""
                  aria-hidden="true"
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
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto space-y-2 border-t px-2 pt-4 ${darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'}`}>
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
          <p className="mt-1 text-sm font-extrabold">
            {streakDays}🔥 · {xp} XP
          </p>
        </div>
        <p className={`px-1 text-[10px] font-semibold leading-snug ${darkMode ? 'text-white/40' : 'text-[#1E1B2E]/45'}`}>
          {t.dockExplore} · {lang === 'tr' ? 'Tam ekran Reels' : 'Full-screen Reels'}
        </p>
      </div>
    </aside>
  );
}
