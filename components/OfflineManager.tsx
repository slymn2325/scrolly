'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  '/data/facts/facts.json',
];

export default function OfflineManager({ lang }: OfflineManagerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Evict stale pre-v1.0.6 offline cache buckets if present & register updated Service Worker
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== 'scrolly-offline-v1.0.6')
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

    // Idle-time prefetch of all sharded JSON files for instant offline discovery
    const prefetchAll = () => {
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

    if (typeof winWithIdle.requestIdleCallback === 'function') {
      idleId = winWithIdle.requestIdleCallback(prefetchAll);
    } else {
      fallbackTimer = setTimeout(prefetchAll, 1500);
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
      {isOffline && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(6.35rem+env(safe-area-inset-top))] z-40 mx-auto flex w-full max-w-[430px] justify-center px-3 md:top-[calc(2dvh+6.35rem+env(safe-area-inset-top))]">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            data-testid="offline-mode-banner"
          >
            <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-400/50 bg-emerald-950/90 px-3.5 py-1.5 text-[11px] font-extrabold text-emerald-100 shadow-lg backdrop-blur-xl">
              <img
                src={STATE_ILLUSTRATION_PATHS.offlineState}
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
              <span>{t.offlineReadyBanner}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
