'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface CookieBannerProps {
  lang: Language;
  visible: boolean;
  onAccept: () => void;
}

export default function CookieBanner({ lang, visible, onAccept }: CookieBannerProps) {
  const t = translations[lang];

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          aria-label="Cookie notice"
          data-testid="cookie-banner"
          className="fixed bottom-24 left-1/2 z-40 flex w-[92%] max-w-[390px] -translate-x-1/2 items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-white/90 px-3.5 py-2.5 shadow-xl backdrop-blur-xl dark:border-white/20 dark:bg-[#1A162B]/90"
        >
          <div className="flex items-center gap-2 text-[11px] leading-snug text-ink/85 dark:text-violet-100">
            <Cookie className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="line-clamp-2">{t.cookieText}</span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onAccept}
            data-testid="cookie-accept-btn"
            className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-ink/90"
          >
            {t.cookieAccept}
          </motion.button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
