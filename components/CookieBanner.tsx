'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
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
  onDecline,
  onDismiss,
}: CookieBannerProps) {
  const t = translations[lang];

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-[420px] px-3 md:bottom-[calc(2dvh+84px+env(safe-area-inset-bottom))] lg:inset-x-auto lg:left-auto lg:right-6 lg:bottom-6 lg:mx-0 lg:max-w-sm lg:px-0">
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            aria-label="Cookie notice"
            data-testid="cookie-banner"
            className="pointer-events-auto relative flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-[#161622]/95 px-3.5 py-2.5 pr-9 text-white shadow-xl backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={onDismiss ?? onDecline ?? onAccept}
              aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
              data-testid="cookie-close-btn"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-violet-200 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex min-w-0 items-start gap-2 text-[11px] leading-snug text-violet-100">
              <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2 sm:line-clamp-3">{t.cookieText}</span>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] font-extrabold">
                  <Link
                    href="/privacy"
                    className="text-violet-300 underline underline-offset-2 hover:text-white"
                  >
                    {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                  </Link>
                  <Link
                    href="/about"
                    className="text-violet-300 underline underline-offset-2 hover:text-white"
                  >
                    {lang === 'tr' ? 'Hakkımızda' : 'About'}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {onDecline && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={onDecline}
                  data-testid="cookie-decline-btn"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-violet-100 shadow-sm hover:bg-white/15 hover:text-white"
                >
                  {t.cookieDecline}
                </motion.button>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onAccept}
                data-testid="cookie-accept-btn"
                className="inline-flex min-h-[38px] items-center justify-center whitespace-nowrap rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white shadow-sm hover:bg-violet-500"
              >
                {t.cookieAccept}
              </motion.button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
