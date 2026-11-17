'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';
import type { DockTabId } from '@/utils/icons8Assets';
import Icon from '@/components/cikartma/Icon';
import type { IconName } from '@/lib/iconMap';

export type { DockTabId };

interface IosFloatingIslandDockProps {
  activeTab: DockTabId;
  lang: Language;
  darkMode?: boolean;
  showQuizDot: boolean;
  onSelectTab: (tab: DockTabId) => void;
  chromeBlocked?: boolean;
}

const TABS: Array<{
  id: DockTabId;
  icon: IconName;
  labelKey: 'dockExplore' | 'dockQuiz' | 'dockLeaderboard' | 'dockDuel' | 'dockDiploma';
}> = [
  { id: 'explore', icon: 'explore', labelKey: 'dockExplore' },
  { id: 'quiz', icon: 'quiz', labelKey: 'dockQuiz' },
  { id: 'leaderboard', icon: 'leaderboard', labelKey: 'dockLeaderboard' },
  { id: 'duel', icon: 'duel', labelKey: 'dockDuel' },
  { id: 'diploma', icon: 'profile', labelKey: 'dockDiploma' },
];

export default function IosFloatingIslandDock({
  activeTab,
  lang,
  showQuizDot,
  onSelectTab,
  chromeBlocked = false,
}: IosFloatingIslandDockProps) {
  const t = translations[lang];

  return (
    <div
      data-testid="ios-floating-dock-shell"
      className={`pointer-events-none fixed inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-[440px] px-4 ${
        chromeBlocked ? 'opacity-40' : ''
      }`}
    >
      <nav
        aria-label="Kesfet Quiz Siralama Scrolla Profil"
        data-testid="ios-floating-dock"
        className={`${
          chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
        } flex w-full items-center justify-between rounded-pill border-[3px] border-white bg-cik-surface px-1.5 py-1 text-cik-text shadow-sticker`}
      >
        {TABS.map((tab) => {
          const highlightedTab = activeTab === 'language' ? 'explore' : activeTab;
          const isActive = highlightedTab === tab.id;
          const label = t[tab.labelKey];
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectTab(tab.id)}
              data-testid={`dock-tab-${tab.id}`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-pill px-1 ${
                isActive ? 'text-cik-cta' : 'text-cik-muted'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="ios-island-pill"
                  className="absolute inset-0 rounded-pill bg-cik-pink"
                />
              )}
              <span className="relative z-10 flex items-center justify-center">
                <Icon name={tab.icon} size={24} tone={isActive ? 'active' : 'muted'} />
                {tab.id === 'quiz' && showQuizDot && (
                  <span data-testid="quiz-live-dot" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cik-cta ring-2 ring-white" />
                )}
              </span>
              <span
                className={`relative z-10 max-w-full whitespace-nowrap text-[10px] font-bold leading-none sm:text-[11px] ${
                  isActive ? 'text-cik-cta' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
