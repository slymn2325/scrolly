'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';

interface CookieBannerProps {
  lang: Language;
  visible: boolean;
  onAccept: () => void;
  onDecline?: () => void;
  onDismiss?: () => void;
}

export default function CookieBanner({
  lang,
  visible,
  onAccept,
  onDecline: _onDecline,
  onDismiss: _onDismiss,
}: CookieBannerProps) {
  const t = translations[lang];

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(14px,env(safe-area-inset-bottom))+76px)] z-50 mx-auto flex w-full max-w-[520px] justify-center px-3">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            aria-label="Cookie notice"
            data-testid="cookie-banner"
            className="pointer-events-auto flex w-full items-center gap-2 rounded-full bg-night/95 px-3 py-1.5 text-[#F6F1EA] shadow-dock"
          >
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium">{t.cookieText}</p>
            <button
              type="button"
              onClick={onAccept}
              data-testid="cookie-accept-btn"
              className="inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-white px-3 text-[11px] font-bold text-ink"
            >
              {lang === 'tr' ? 'Anladım' : 'OK'}
            </button>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
