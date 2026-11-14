'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';
import { DOCK_ICON_MAP, type DockTabId } from '@/utils/icons8Assets';

export type { DockTabId };

interface IosFloatingIslandDockProps {
  activeTab: DockTabId;
  lang: Language;
  showQuizDot: boolean;
  onSelectTab: (tab: DockTabId) => void;
}

export default function IosFloatingIslandDock({
  activeTab,
  lang,
  showQuizDot,
  onSelectTab,
}: IosFloatingIslandDockProps) {
  const t = translations[lang];

  // Exact left-to-right 5-item order required: Leaderboard | Quiz | Keşfet | Düello | Diploma
  const tabs: Array<{
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
      label: t.dockDiploma,
      iconSrc: DOCK_ICON_MAP.diploma,
      legacyTestId: 'profile-drawer-btn',
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-[430px] px-3 md:bottom-[calc(2dvh+0.75rem+env(safe-area-inset-bottom))]">
      <nav
        aria-label="iOS Floating Island Dock"
        data-testid="ios-floating-dock"
        style={{
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          backdropFilter: 'blur(40px) saturate(180%)',
        }}
        className="pointer-events-auto flex w-full items-center justify-between rounded-full border border-white/45 bg-white/20 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.16),inset_0_1px_1px_rgba(255,255,255,0.65)] backdrop-blur-2xl backdrop-saturate-180 dark:border-white/20 dark:bg-black/25 dark:shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]"
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
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 transition-colors ${
              isActive
                ? 'text-violet-800 dark:text-violet-100'
                : 'text-ink/85 hover:text-ink dark:text-white/85 dark:hover:text-white'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="ios-island-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute inset-0 rounded-full border border-white/60 bg-white/35 shadow-sm backdrop-blur-md dark:border-white/30 dark:bg-white/20"
              />
            )}

            <span className="relative z-10 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]">
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
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900" />
                </span>
              )}
            </span>

            <span className="relative z-10 truncate text-[10px] font-extrabold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.22)]">
              {tab.label}
            </span>
          </motion.button>
        );
      })}
      </nav>
    </div>
  );
}
