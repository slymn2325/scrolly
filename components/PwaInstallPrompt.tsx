'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Share, Smartphone, Sparkles, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWA_DISMISSED_KEY = 'scrolly_pwa_prompt_dismissed';

interface PwaInstallPromptProps {
  lang: Language;
  swipedCount: number;
  forceOpen?: boolean;
  onCloseForceOpen?: () => void;
  onButtonPop: () => void;
}

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaMatch =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const navStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mediaMatch || navStandalone);
}

export default function PwaInstallPrompt({
  lang,
  swipedCount,
  forceOpen = false,
  onCloseForceOpen,
  onButtonPop,
}: PwaInstallPromptProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [closedThisSession, setClosedThisSession] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncStandalone = () => {
      setIsStandalone(checkIsStandalone());
    };

    syncStandalone();

    try {
      const alreadyDismissed = window.localStorage.getItem(PWA_DISMISSED_KEY) === 'true';
      setDismissed(alreadyDismissed);
    } catch {
      setDismissed(false);
    }
    setHydrated(true);

    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;

    if (mq) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', syncStandalone);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(syncStandalone);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mq) {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', syncStandalone);
        } else if (typeof mq.removeListener === 'function') {
          mq.removeListener(syncStandalone);
        }
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Profile can re-open after a prior dismiss
  useEffect(() => {
    if (forceOpen) setClosedThisSession(false);
  }, [forceOpen]);

  const dismissNow = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onButtonPop();
    setClosedThisSession(true);
    try {
      window.localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage quota errors
    }
    setDismissed(true);
    onCloseForceOpen?.();
  };

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onButtonPop();
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
      } catch {
        setShowIosHint(true);
      }
      setDeferredPrompt(null);
      dismissNow();
      return;
    }
    setShowIosHint(true);
    dismissNow();
  };

  const showPrompt =
    hydrated &&
    !isStandalone &&
    !closedThisSession &&
    (forceOpen || (!dismissed && swipedCount >= 2));

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Above HUD (z-30) so X / outside dismiss aren't blocked */}
          <button
            type="button"
            aria-label={t.pwaDismissLabel}
            data-testid="pwa-install-backdrop"
            onClick={dismissNow}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[54] cursor-default bg-black/25"
          />
          <div className="pointer-events-none fixed inset-x-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-[55] mx-auto w-full max-w-[430px] px-3 lg:max-w-[min(620px,50vw)]">
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              data-testid="pwa-install-prompt"
              role="dialog"
              aria-modal="true"
              aria-label={t.pwaPromptTitle}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                backdropFilter: 'blur(36px) saturate(180%)',
              }}
              className="pointer-events-auto relative z-[56] w-full rounded-3xl border border-white/55 bg-white/90 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.22),inset_0_1px_1px_rgba(255,255,255,0.75)] dark:border-white/20 dark:bg-[#130F24]/95"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#FF7675] text-white shadow-sm">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-violet-700 dark:text-violet-300" />
                      <p className="text-xs font-extrabold leading-tight text-ink dark:text-white">
                        {t.pwaPromptTitle}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-ink/75 dark:text-violet-100/80">
                      {t.pwaPromptSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={t.pwaDismissLabel}
                  data-testid="pwa-install-dismiss-btn"
                  onClick={dismissNow}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="relative z-[57] flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink hover:bg-white dark:bg-white/15 dark:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstallClick}
                  data-testid="pwa-install-action-btn"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-xs font-black text-white shadow-sm hover:opacity-95 dark:bg-violet-600"
                >
                  <span>{t.pwaInstallBtn}</span>
                </motion.button>
                <button
                  type="button"
                  data-testid="pwa-install-not-now-btn"
                  onClick={dismissNow}
                  className="inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-extrabold text-ink/70 hover:text-ink dark:text-violet-100/80 dark:hover:text-white"
                >
                  {lang === 'tr' ? 'Şimdi değil' : 'Not now'}
                </button>
              </div>

              {showIosHint && (
                <div
                  data-testid="pwa-ios-guide"
                  className="mt-2 flex items-center gap-2 rounded-2xl border border-white/50 bg-white/45 px-2.5 py-1.5 text-[11px] font-bold text-ink/85 dark:border-white/15 dark:bg-white/10 dark:text-violet-100"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300">
                    <Share className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 leading-snug">{t.pwaIosInstruction}</span>
                  <motion.span
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="shrink-0 text-violet-700 dark:text-violet-300"
                  >
                    <ArrowUp className="h-3.5 w-3.5 rotate-180" />
                  </motion.span>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
