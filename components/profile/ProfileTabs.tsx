'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import { pressTransition } from '@/lib/motion';

export type ProfilePane = 'ozet' | 'album' | 'saved' | 'diploma';

interface ProfileTabsProps {
  lang: Language;
  pane: ProfilePane;
  onSelect: (pane: ProfilePane) => void;
}

const PANES: ProfilePane[] = ['ozet', 'album', 'saved', 'diploma'];

export default function ProfileTabs({ lang, pane, onSelect }: ProfileTabsProps) {
  const t = translations[lang];
  const reduced = useReducedMotion() === true;
  const listRef = useRef<HTMLDivElement>(null);
  const labels: Record<ProfilePane, string> = {
    ozet: t.profileTabSummary,
    album: t.profileTabAlbum,
    saved: t.profileTabSaved,
    diploma: t.profileTabDiploma,
  };

  const focusPane = (next: ProfilePane) => {
    onSelect(next);
    const button = listRef.current?.querySelector<HTMLButtonElement>(`[data-testid="profile-tab-${next}"]`);
    button?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t.dockDiploma}
      className="no-scrollbar flex min-w-0 flex-wrap gap-1.5 py-2"
    >
      {PANES.map((id) => {
        const selected = pane === id;
        const look = selected
          ? 'bg-cik-berry text-cik-on-berry shadow-sticker'
          : 'bg-cik-surface text-cik-text-2 shadow-e1';
        return (
          <motion.button
            key={id}
            type="button"
            role="tab"
            id={`profile-tab-${id}`}
            aria-selected={selected}
            aria-controls={`profile-panel-${id}`}
            tabIndex={selected ? 0 : -1}
            data-testid={`profile-tab-${id}`}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            transition={pressTransition(reduced)}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => {
              const index = PANES.indexOf(id);
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                focusPane(PANES[(index + 1) % PANES.length]);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                focusPane(PANES[(index - 1 + PANES.length) % PANES.length]);
              }
            }}
            className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-pill px-3 text-xs font-bold ${look}`}
          >
            {labels[id]}
          </motion.button>
        );
      })}
    </div>
  );
}
