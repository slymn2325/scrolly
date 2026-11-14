'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { DOCK_ICON_MAP, type DockTabId } from '@/utils/icons8Assets';

export type { DockTabId };

interface IosFloatingIslandDockProps {
  activeTab: DockTabId;
  lang: Language;
  darkMode?: boolean;
  showQuizDot: boolean;
  onSelectTab: (tab: DockTabId) => void;
  /** When true, dock ignores pointer hits so overlays above remain clickable */
  chromeBlocked?: boolean;
}

export default function IosFloatingIslandDock({
  activeTab,
  lang,
  darkMode = true,
  showQuizDot,
  onSelectTab,
  chromeBlocked = false,
}: IosFloatingIslandDockProps) {
  const t = translations[lang];

  // When ENABLE_COMPETITIVE_TABS is false, keep only the 3 core tabs: Explore | Quiz | Profile & Streak
  const allTabs: Array<{
    id: DockTabId;
    label: string;
    iconSrc: string;
    legacyTestId: string;
  }> = [
    {
      id: 'leaderboard',
      label: t.dockLeaderboard,
      iconSrc: DOCK_ICON_MAP.leaderboard,
      legacyTestId: 'leaderboard-btn',
    },
    {
      id: 'quiz',
      label: t.dockQuiz,
      iconSrc: DOCK_ICON_MAP.quiz,
      legacyTestId: 'mini-quiz-btn',
    },
    {
      id: 'explore',
      label: t.dockExplore,
      iconSrc: DOCK_ICON_MAP.explore,
      legacyTestId: 'explore-feed-btn',
    },
    {
      id: 'duel',
      label: t.dockDuel,
      iconSrc: DOCK_ICON_MAP.duel,
      legacyTestId: 'duel-btn',
    },
    {
      id: 'diploma',
      label: lang === 'tr' ? 'Profil & Seri' : 'Profile & Streak',
      iconSrc: DOCK_ICON_MAP.diploma,
      legacyTestId: 'profile-drawer-btn',
    },
  ];

  const tabs = ENABLE_COMPETITIVE_TABS
    ? allTabs
    : [allTabs[2], allTabs[1], allTabs[4]];

  return (
    <div
      data-testid="ios-floating-dock-shell"
      className={`pointer-events-none absolute inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full px-3 ${
        chromeBlocked ? 'opacity-40' : ''
      }`}
    >
      <nav
        aria-label="iOS Floating Island Dock"
        data-testid="ios-floating-dock"
        data-theme={darkMode ? 'dark' : 'light'}
        className={`${
          chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
        } flex w-full items-center justify-between rounded-full border px-2 py-1.5 backdrop-blur-md ${
          darkMode
            ? 'border-white/15 bg-[#111115]/92 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)]'
            : 'border-[#1E1B2E]/12 bg-[#FFFDF9]/95 text-[#1E1B2E] shadow-[0_8px_28px_rgba(30,27,46,0.18)]'
        }`}
      >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isCenter = tab.id === 'explore';

        return (
          <motion.button
            key={tab.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onSelectTab(tab.id)}
            data-testid={`dock-tab-${tab.id}`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors ${
              darkMode
                ? isActive
                  ? 'text-white'
                  : 'text-white/75 hover:text-white'
                : isActive
                  ? 'text-[#1E1B2E]'
                  : 'text-[#1E1B2E]/65 hover:text-[#1E1B2E]'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="ios-island-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className={`absolute inset-0 rounded-full border shadow-sm ${
                  darkMode ? 'border-white/25 bg-white/15' : 'border-[#1E1B2E]/12 bg-[#1E1B2E]/8'
                }`}
              />
            )}

            <span className="relative z-10 flex items-center justify-center">
              <img
                src={tab.iconSrc}
                alt=""
                aria-hidden="true"
                className={`object-contain transition-transform duration-200 ${
                  isCenter ? 'h-6 w-6' : 'h-[22px] w-[22px]'
                } ${isActive ? 'scale-110' : 'opacity-90'}`}
              />
              {tab.id === 'quiz' && showQuizDot && (
                <span
                  data-testid="quiz-live-dot"
                  className="absolute -right-1 -top-1 flex h-2.5 w-2.5"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ${
                      darkMode ? 'ring-[#111115]' : 'ring-[#FFFDF9]'
                    }`}
                  />
                </span>
              )}
            </span>

            <span className="relative z-10 truncate text-[10px] font-extrabold tracking-tight text-inherit">
              {tab.label}
            </span>
          </motion.button>
        );
      })}
      </nav>
    </div>
  );
}
