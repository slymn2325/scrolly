'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';
import type { DockTabId } from '@/utils/fluentAssets';
import Icon from '@/components/cikartma/Icon';
import type { IconName } from '@/lib/iconMap';
import { motionSpring, motionTiming } from '@/lib/motion';

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
  const reduced = useReducedMotion() === true;
  const highlightedTab = activeTab === 'language' ? 'explore' : activeTab;

  return (
    <div
      data-testid="ios-floating-dock-shell"
      inert={chromeBlocked ? true : undefined}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-dock mx-auto w-full max-w-md px-2.5 pb-[max(8px,env(safe-area-inset-bottom))] ${
        chromeBlocked ? 'pointer-events-none opacity-0' : ''
      }`}
    >
      <nav
        aria-label={TABS.map((tab) => t[tab.labelKey]).join(' · ')}
        data-testid="ios-floating-dock"
        className={`${
          chromeBlocked ? 'pointer-events-none' : 'pointer-events-auto'
        } scrolly-glass-surface flex w-full items-end justify-between gap-0.5 rounded-pill px-1.5 py-1 text-cik-text`}
      >
        {TABS.map((tab) => {
          const isActive = highlightedTab === tab.id;
          const label = t[tab.labelKey];
          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={reduced ? undefined : { scale: 0.96 }}
              transition={reduced ? motionTiming.reducedFade : motionSpring.buttonRelease}
              onClick={() => onSelectTab(tab.id)}
              data-testid={`dock-tab-${tab.id}`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-pill px-1 ${
                isActive ? 'text-cik-cta' : 'text-cik-text-2'
              }`}
            >
              <motion.span
                className="relative flex h-6 w-6 items-center justify-center"
                animate={isActive && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={reduced ? motionTiming.reducedFade : motionSpring.dockTab}
              >
                <Icon name={tab.icon} size={24} tone={isActive ? 'active' : 'muted'} />
                {tab.id === 'quiz' && showQuizDot ? (
                  <span
                    data-testid="quiz-live-dot"
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-pill bg-cik-cta ring-2 ring-cik-bg"
                  />
                ) : null}
              </motion.span>
              <span className="max-w-full whitespace-nowrap text-[10px] font-bold leading-tight tracking-tight">{label}</span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-pill ${isActive ? 'bg-cik-cta' : 'bg-transparent'}`}
              />
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
