'use client';

import React from 'react';
import Link from 'next/link';
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
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-[430px] px-3 md:bottom-[calc(2dvh+88px+env(safe-area-inset-bottom))]">
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            aria-label="Cookie notice"
            data-testid="cookie-banner"
            className="pointer-events-auto flex w-full items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-xl dark:border-white/20 dark:bg-[#1A162B]/95"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2 text-[11px] leading-snug text-ink/85 dark:text-violet-100">
              <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2">{t.cookieText}</span>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] font-extrabold">
                  <Link
                    href="/privacy"
                    className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300"
                  >
                    {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                  </Link>
                  <Link
                    href={lang === 'en' ? '/about?lang=en' : '/about'}
                    className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300"
                  >
                    {lang === 'tr' ? 'Hakkımızda' : 'About'}
                  </Link>
                </div>
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onAccept}
              data-testid="cookie-accept-btn"
              className="shrink-0 whitespace-nowrap rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-ink/90 dark:bg-violet-600"
            >
              {t.cookieAccept}
            </motion.button>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
