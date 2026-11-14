'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { type Language } from '@/i18n/translations';

const ADSENSE_CLIENT_ID = 'ca-pub-1368005726792126';
const ADSENSE_STICKY_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_STICKY_SLOT_ID;

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface StickyAdBannerProps {
  lang: Language;
  visible: boolean;
  onDismiss: () => void;
}

export default function StickyAdBanner({
  lang,
  visible,
  onDismiss,
}: StickyAdBannerProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [adStatus, setAdStatus] = useState<'idle' | 'filled' | 'unfilled' | 'failed'>('idle');

  const shouldAttemptLiveAd =
    visible &&
    Boolean(ADSENSE_STICKY_SLOT_ID) &&
    isOnline &&
    adStatus !== 'unfilled' &&
    adStatus !== 'failed';

  const isAdFilled = shouldAttemptLiveAd && adStatus === 'filled';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const insEl = insRef.current;
    if (!shouldAttemptLiveAd || !insEl) return;

    const syncStatusFromDom = () => {
      const attr = insEl.getAttribute('data-ad-status');
      if (attr === 'filled') setAdStatus('filled');
      else if (attr === 'unfilled') setAdStatus('unfilled');
    };

    syncStatusFromDom();

    const observer = new MutationObserver(syncStatusFromDom);
    observer.observe(insEl, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
    });

    if (!pushedRef.current) {
      pushedRef.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        setAdStatus('failed');
      }
    }

    return () => observer.disconnect();
  }, [shouldAttemptLiveAd]);

  if (!shouldAttemptLiveAd) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isAdFilled ? 1 : 0, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.25 }}
        aria-hidden={!isAdFilled}
        aria-label={lang === 'tr' ? 'Reklam Alanı' : 'Advertisement'}
        data-ad-slot="sticky-bottom-banner"
        data-testid="sticky-ad-banner"
        className={`fixed bottom-16 left-3 right-3 z-20 mx-auto max-w-3xl sm:bottom-3 ${
          isAdFilled ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="relative rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 pb-2.5 pt-2 shadow-cozy backdrop-blur-md dark:border-white/15 dark:bg-[#1A162B]/95 sm:px-4">
          {isAdFilled && (
            <div className="mb-1 flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {lang === 'tr' ? 'Reklam' : 'Advertisement'}
              </span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onDismiss}
                aria-label={lang === 'tr' ? 'Reklamı kapat' : 'Close advertisement'}
                data-testid="sticky-ad-close-btn"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink/75 transition-colors hover:bg-slate-100 hover:text-ink dark:text-white/80 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          )}

          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '60px' }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={ADSENSE_STICKY_SLOT_ID}
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
