'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';

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

    // Evict stale pre-v3 offline cache buckets if present & register updated Service Worker
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

    // Only prefetch JSON fact shards when installed & launched in standalone PWA mode
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
      {isOffline && !dismissed && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,12px)+98px)] z-[19] mx-auto flex w-full max-w-[360px] justify-center px-3 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            data-testid="offline-mode-banner"
          >
            <div className="pointer-events-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/50 bg-emerald-950/90 py-1 pl-2.5 pr-1.5 text-[10.5px] font-extrabold text-emerald-100 shadow-lg backdrop-blur-xl">
              <img
                src={STATE_ILLUSTRATION_PATHS.offlineState}
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
                decoding="async"
                className="h-4 w-4 shrink-0 object-contain"
              />
              <span>{t.offlineReadyBanner}</span>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label={lang === 'tr' ? 'Kapat' : 'Dismiss'}
                data-testid="offline-banner-close-btn"
                className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-emerald-100 transition hover:bg-white/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
