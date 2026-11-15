'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Share, Smartphone, Sparkles, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWA_DISMISSED_KEY = 'scrolly_pwa_prompt_dismissed';

interface PwaInstallPromptProps {
  lang: Language;
  swipedCount: number;
  forceOpen?: boolean;
  autoPromptEnabled?: boolean;
  onCloseForceOpen?: () => void;
  onOpenInstallGuide?: () => void;
  onDeferredPromptChange?: (promptEvent: BeforeInstallPromptEvent | null) => void;
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

function readDismissedFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(PWA_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeDismissedToStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PWA_DISMISSED_KEY, 'true');
  } catch {
    // private mode / quota — still hide via React state
  }
}

export function clearPwaDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PWA_DISMISSED_KEY);
  } catch {
    // private mode / quota
  }
}

export default function PwaInstallPrompt({
  lang,
  swipedCount,
  forceOpen = false,
  autoPromptEnabled = true,
  onCloseForceOpen,
  onOpenInstallGuide,
  onDeferredPromptChange,
  onButtonPop,
}: PwaInstallPromptProps) {
  const [portalReady, setPortalReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [closedThisSession, setClosedThisSession] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncStandalone = () => {
      setIsStandalone(checkIsStandalone());
    };

    syncStandalone();
    setDismissed(readDismissedFromStorage());
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
      writeDismissedToStorage();
      setDismissed(true);
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

  useEffect(() => {
    onDeferredPromptChange?.(deferredPrompt);
  }, [deferredPrompt, onDeferredPromptChange]);

  useEffect(() => {
    if (forceOpen) {
      setClosedThisSession(false);
      setDismissed(false);
    }
  }, [forceOpen]);

  const dismissNow = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onButtonPop();
    writeDismissedToStorage();
    setDismissed(true);
    setClosedThisSession(true);
    onCloseForceOpen?.();
  };

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
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
        onOpenInstallGuide?.();
      }
      setDeferredPrompt(null);
      dismissNow();
      return;
    }
    setShowIosHint(true);
    if (onOpenInstallGuide) {
      dismissNow();
      onOpenInstallGuide();
    }
  };

  const storageDismissed = hydrated && readDismissedFromStorage();
  const shouldRender =
    portalReady &&
    hydrated &&
    !isStandalone &&
    !closedThisSession &&
    (forceOpen ||
      (autoPromptEnabled && !storageDismissed && !dismissed && swipedCount >= 2));

  if (!portalReady) return null;

  return createPortal(
    <AnimatePresence>
      {shouldRender && (
        <div data-testid="pwa-install-root" className="contents">
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.pwaDismissLabel}
            data-testid="pwa-install-backdrop"
            onClick={dismissNow}
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            className="fixed inset-0 z-[80] bg-black/35"
          />
          <div className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[81] flex justify-center px-3 pt-2">
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              data-testid="pwa-install-prompt"
              role="dialog"
              aria-modal="true"
              aria-label={t.pwaPromptTitle}
              onClick={(ev) => ev.stopPropagation()}
              onPointerDown={(ev) => ev.stopPropagation()}
              style={{
                WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                backdropFilter: 'blur(36px) saturate(180%)',
              }}
              className="pointer-events-auto relative w-full max-w-[430px] rounded-3xl border border-white/55 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.28)] dark:border-white/20 dark:bg-[#130F24]/[0.96] lg:max-w-[min(620px,50vw)]"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#FF7675] text-white shadow-sm">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 shrink-0 text-violet-700 dark:text-violet-300" />
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
                  onPointerDown={(ev) => ev.stopPropagation()}
                  className="relative z-[82] -mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink hover:bg-slate-200 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstallClick}
                  data-testid="pwa-install-action-btn"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2.5 text-xs font-black text-white shadow-sm hover:opacity-95 dark:bg-violet-600"
                >
                  <span>{t.pwaInstallBtn}</span>
                </motion.button>
                <button
                  type="button"
                  data-testid="pwa-install-not-now-btn"
                  onClick={dismissNow}
                  className="inline-flex h-11 items-center justify-center rounded-full px-3 text-[11px] font-extrabold text-ink/70 hover:text-ink dark:text-violet-100/80 dark:hover:text-white"
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
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
