'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface StickyAdBannerProps {
  lang: Language;
  visible: boolean;
  onDismiss: () => void;
}

export default function StickyAdBanner({ lang, visible, onDismiss }: StickyAdBannerProps) {
  const t = translations[lang];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25 }}
          data-ad-slot="sticky-bottom-banner"
          data-testid="sticky-ad-banner"
          className="fixed bottom-16 left-3 right-3 z-20 mx-auto max-w-3xl sm:bottom-2"
        >
          <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-sky-200/80 bg-white/95 px-3.5 py-2 shadow-cozy backdrop-blur-md dark:border-white/15 dark:bg-[#1A162B]/95 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
                {t.sponsoredLabel}
              </span>
              <Sparkles className="hidden h-4 w-4 shrink-0 text-amber-500 sm:block" />
              <p className="truncate text-xs font-medium text-ink/80 dark:text-violet-100/85 sm:text-sm">
                {t.stickyAdTitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 pr-5 sm:pr-6">
              <motion.a
                href="#sponsored-digest"
                onClick={(e) => {
                  e.preventDefault();
                }}
                whileTap={{ scale: 0.94 }}
                className="rounded-full bg-pastel-sky px-3 py-1 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-100"
              >
                {t.stickyAdCta}
              </motion.a>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onDismiss}
              aria-label="Close ad"
              data-testid="sticky-ad-close-btn"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/45 transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
