'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import { motionTiming } from '@/lib/motion';

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
  const reduced = useReducedMotion() === true;
  const [isOnline, setIsOnline] = useState(true);
  const [adStatus, setAdStatus] = useState<'idle' | 'filled' | 'unfilled' | 'failed'>('idle');
  const [lift, setLift] = useState(16);
  const [sheetOpen, setSheetOpen] = useState(false);

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
    const measure = () => {
      const dock = document.querySelector('[data-testid="ios-floating-dock"]');
      const cookie = document.documentElement.dataset.cikCookie === 'open';
      const dockClearance = dock ? 64 : 16;
      const cookieClearance = cookie ? 44 + 8 : 0;
      setLift(dockClearance + cookieClearance);
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cik-cookie'] });
    const onChrome = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setSheetOpen(Boolean(detail?.open));
      measure();
    };
    window.addEventListener('scrolly-chrome-block', onChrome as EventListener);
    return () => {
      observer.disconnect();
      window.removeEventListener('scrolly-chrome-block', onChrome as EventListener);
    };
  }, [visible]);

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

  if (!shouldAttemptLiveAd || sheetOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: isAdFilled ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={reduced ? motionTiming.reducedFade : { duration: 0.15 }}
        aria-hidden={!isAdFilled}
        aria-label={lang === 'tr' ? 'Reklam Alanı' : 'Advertisement'}
        data-ad-slot="sticky-bottom-banner"
        data-testid="sticky-ad-banner"
        className={`fixed inset-x-0 z-dock mx-auto w-full max-w-3xl px-4 ${
          isAdFilled ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${lift}px)` }}
      >
        <div className="relative h-16 overflow-hidden rounded-cik-lg border border-cik-line bg-cik-surface shadow-e1">
          <div className="pointer-events-none absolute left-3 top-2 z-content">
            <span className="cik-caption-2 rounded-pill bg-cik-pink px-2 py-1 text-cik-text">
              {lang === 'tr' ? 'Reklam' : 'Ad'}
            </span>
          </div>
          {isAdFilled && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={lang === 'tr' ? 'Reklamı kapat' : 'Close advertisement'}
              data-testid="sticky-ad-close-btn"
              className="absolute right-0 top-0 z-content inline-flex h-11 w-11 items-center justify-center rounded-pill text-cik-text"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
          <ins
            ref={insRef}
            className="adsbygoogle block h-16 w-full"
            style={{ display: 'block', width: '100%', height: '64px' }}
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
