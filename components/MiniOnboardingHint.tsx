'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Bookmark, ChevronRight, Sparkles, X } from 'lucide-react';
import type { Language } from '@/i18n/translations';

export const MINI_ONBOARDING_DISMISSED_KEY = 'scrolly_mini_onboarding_dismissed_v1';

export function readMiniOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(MINI_ONBOARDING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistMiniOnboardingDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MINI_ONBOARDING_DISMISSED_KEY, '1');
  } catch {
    // Ignore storage failures
  }
}

export function clearMiniOnboardingDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MINI_ONBOARDING_DISMISSED_KEY);
  } catch {
    // Ignore storage failures
  }
}

interface MiniOnboardingHintProps {
  visible: boolean;
  xp: number;
  lang: Language;
  darkMode?: boolean;
  onDismiss: () => void;
}

export default function MiniOnboardingHint({
  visible,
  xp,
  lang,
  darkMode = true,
  onDismiss,
}: MiniOnboardingHintProps) {
  const shouldShow = visible && xp === 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="mini-onboarding-hint"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          data-testid="mini-onboarding-hint"
          className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top,14px)+5.5rem)] z-[45] flex justify-center"
        >
          <div
            className={`pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] sm:text-[11px] font-extrabold shadow-lg ${
              darkMode
                ? 'border-white/20 bg-[#12121D]/95 text-white'
                : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E]'
            }`}
          >
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <ArrowDown className="h-3 w-3 text-violet-400" aria-hidden="true" />
              <span>{lang === 'tr' ? 'Kaydır' : 'Scroll'}</span>
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-45" aria-hidden="true" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="h-3 w-3 text-amber-400" aria-hidden="true" />
              <span>{lang === 'tr' ? 'Tahmin Et & +XP' : 'Guess & +XP'}</span>
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-45" aria-hidden="true" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Bookmark className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              <span>{lang === 'tr' ? 'Kaydet & 1v1' : 'Save & 1v1'}</span>
            </span>

            <button
              type="button"
              data-testid="mini-onboarding-dismiss-btn"
              onClick={onDismiss}
              aria-label={lang === 'tr' ? 'Rehberi gizle' : 'Dismiss guide'}
              className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                darkMode
                  ? 'bg-white/10 text-white/80 hover:bg-white/20'
                  : 'bg-[#1E1B2E]/10 text-[#1E1B2E]/80 hover:bg-[#1E1B2E]/20'
              }`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
