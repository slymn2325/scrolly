'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type Language, translations } from '@/i18n/translations';
import { motionTiming } from '@/lib/motion';

interface CookieBannerProps {
  lang: Language;
  visible: boolean;
  onAccept: () => void;
  onDecline?: () => void;
  onDismiss?: () => void;
}

/**
 * One-line strip sitting on the dock. Accept grants consent through the
 * existing callback. Settings only reveals the already-wired decline action.
 */
export default function CookieBanner({
  lang,
  visible,
  onAccept,
  onDecline,
  onDismiss: _onDismiss,
}: CookieBannerProps) {
  const t = translations[lang];
  const reduced = useReducedMotion() === true;
  const [showChoices, setShowChoices] = useState(false);
  const [bottomPx, setBottomPx] = useState(80);
  const acceptLabel = lang === 'tr' ? 'Kabul et' : 'Accept';
  const settingsLabel = lang === 'tr' ? 'Ayarlar' : 'Settings';
  const declineLabel = lang === 'tr' ? 'Reddet' : 'Decline';

  useEffect(() => {
    if (!visible) {
      setShowChoices(false);
      delete document.documentElement.dataset.cikCookie;
      return;
    }
    document.documentElement.dataset.cikCookie = 'open';
    return () => {
      delete document.documentElement.dataset.cikCookie;
    };
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const view = window.innerHeight;
      const dock = document.querySelector('[data-testid="ios-floating-dock"]');
      const dockRect = dock?.getBoundingClientRect();
      const hasVisibleDock = Boolean(dockRect && dockRect.height > 0 && dockRect.top > 0);
      const next = hasVisibleDock
        ? Math.max(16, Math.round(view - (dockRect!.top - 8)))
        : 20;
      setBottomPx((prev) => (prev === next ? prev : next));
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(place);
    };
    place();
    const feed = document.querySelector('[data-testid="tiktok-feed-container"]');
    feed?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      feed?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div
          className="pointer-events-none fixed inset-x-0 z-dock px-4"
          style={{ bottom: `${bottomPx}px` }}
        >
          <motion.aside
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={motionTiming.reducedFade}
            aria-label={lang === 'tr' ? 'Çerez bildirimi' : 'Cookie notice'}
            data-testid="cookie-banner"
            className="material-thick pointer-events-auto mx-auto flex min-h-11 w-full max-w-lg flex-wrap items-center gap-2 rounded-pill px-3 py-1.5 shadow-e1 sm:flex-nowrap"
          >
            <p className="cik-caption-1 min-w-0 flex-1 truncate pl-1 text-cik-text">{t.cookieText}</p>
            <Link
              href={lang === 'en' ? '/privacy?lang=en' : '/privacy'}
              data-testid="cookie-privacy-link"
              className="cik-caption-1 shrink-0 px-1.5 text-cik-text-2 underline"
            >
              {lang === 'tr' ? 'Gizlilik' : 'Privacy'}
            </Link>
            <button
              type="button"
              onClick={onAccept}
              data-testid="cookie-accept-btn"
              className="cik-caption-1 inline-flex h-11 shrink-0 items-center rounded-pill bg-cik-cta px-3 text-cik-on-cta"
            >
              {acceptLabel}
            </button>
            {showChoices && onDecline ? (
              <button
                type="button"
                onClick={onDecline}
                data-testid="cookie-decline-btn"
                className="cik-caption-1 inline-flex h-11 shrink-0 items-center rounded-pill px-3 text-cik-cta"
              >
                {declineLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowChoices(true)}
                data-testid="cookie-settings-btn"
                className="cik-caption-1 inline-flex h-11 shrink-0 items-center rounded-pill px-3 text-cik-cta"
              >
                {settingsLabel}
              </button>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
