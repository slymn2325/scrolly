'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/fluentAssets';
import { motionTiming } from '@/lib/motion';

interface OfflineManagerProps {
  lang: Language;
}

const PREFETCH_FACT_SHARDS = [
  '/data/facts/space.json',
  '/data/facts/nature.json',
  '/data/facts/human_body.json',
  '/data/facts/history.json',
  '/data/facts/science.json',
  '/data/facts/records.json',
  '/data/facts/statistics.json',
  '/data/facts/facts.json',
];

export default function OfflineManager({ lang }: OfflineManagerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reduced = useReducedMotion() === true;
  const t = translations[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(navigator.onLine === false);

    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setDismissed(false);
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== 'scrolly-offline-v3')
              .map((oldKey) => caches.delete(oldKey))
          )
        )
        .catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {
          // Ignore registration errors in unsupported contexts
        });
    }

    const isStandalonePwa =
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    const prefetchAll = () => {
      if (!isStandalonePwa) return;
      PREFETCH_FACT_SHARDS.forEach((url) => {
        fetch(url, { priority: 'low' } as RequestInit).catch(() => {});
      });
    };

    const winWithIdle = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (isStandalonePwa) {
      if (typeof winWithIdle.requestIdleCallback === 'function') {
        idleId = winWithIdle.requestIdleCallback(prefetchAll);
      } else {
        fallbackTimer = setTimeout(prefetchAll, 1500);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (idleId !== undefined && typeof winWithIdle.cancelIdleCallback === 'function') {
        winWithIdle.cancelIdleCallback(idleId);
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && !dismissed ? (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-toast mx-auto flex w-full max-w-md justify-center px-4 lg:hidden">
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={motionTiming.reducedFade}
            data-testid="offline-mode-banner"
            className="pointer-events-auto"
          >
            <div className="material-thick flex items-center gap-2 rounded-pill border border-cik-line py-1 pl-3 pr-1 text-cik-text shadow-e1">
              <img
                src={STATE_ILLUSTRATION_PATHS.offlineState}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                decoding="async"
                className="h-6 w-6 shrink-0 object-contain"
              />
              <span className="cik-caption-1">{t.offlineReadyBanner}</span>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label={lang === 'tr' ? 'Kapat' : 'Dismiss'}
                data-testid="offline-banner-close-btn"
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-cik-text"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
