'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { type Language } from '@/i18n/translations';

export const WELCOME_DISMISS_KEY = 'scrolly_welcome_dismissed_v1';

interface WelcomeExploreModalProps {
  open: boolean;
  lang: Language;
  onStart: () => void;
}

export default function WelcomeExploreModal({ open, lang, onStart }: WelcomeExploreModalProps) {
  const title = lang === 'tr' ? 'Scrolly’ye hoş geldin' : 'Welcome to Scrolly';
  const body =
    lang === 'tr'
      ? 'Her kaydırmada bir şaşkınlık. Keşfetmeye başla — kaydır, öğren, şaşır.'
      : 'A wonder in every swipe. Start exploring — scroll, learn, wonder.';
  const cta = lang === 'tr' ? 'Keşfetmeye Başla' : 'Start exploring';

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid="welcome-explore-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative w-full max-w-[380px] overflow-hidden rounded-3xl border border-white/15 bg-[#121218] p-6 text-white shadow-2xl dark:border-violet-500/20"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl"
            />
            <p className="font-display text-3xl font-black tracking-tight">Scrolly</p>
            <h2 className="mt-3 font-display text-xl font-bold leading-snug">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/75">{body}</p>
            <button
              type="button"
              data-testid="welcome-start-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStart();
              }}
              className="relative z-10 mt-6 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#09090B] active:scale-[0.98]"
            >
              {cta}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function readWelcomeDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(WELCOME_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistWelcomeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WELCOME_DISMISS_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}
