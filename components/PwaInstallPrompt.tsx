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

  const persistDismissal = () => {
    try {
      window.localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage quota errors
    }
    setDismissed(true);
    onCloseForceOpen?.();
  };

  if (isStandalone || (!forceOpen && (dismissed || swipedCount < 2))) {
    return null;
  }

  const handleInstallClick = async () => {
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
      persistDismissal();
      return;
    }
    setShowIosHint(true);
    persistDismissal();
  };

  return (
    <AnimatePresence>
      <div className="pointer-events-none fixed inset-x-0 top-[calc(6.35rem+env(safe-area-inset-top))] z-30 mx-auto w-full max-w-[430px] px-3 md:top-[calc(2dvh+6.35rem+env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          data-testid="pwa-install-prompt"
          style={{
            WebkitBackdropFilter: 'blur(36px) saturate(180%)',
            backdropFilter: 'blur(36px) saturate(180%)',
          }}
          className="pointer-events-auto w-full rounded-3xl border border-white/55 bg-white/85 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.18),inset_0_1px_1px_rgba(255,255,255,0.75)] dark:border-white/20 dark:bg-[#130F24]/90"
        >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
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
            onClick={() => {
              onButtonPop();
              persistDismissal();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/55 text-ink/75 hover:bg-white/80 dark:bg-white/10 dark:text-white/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleInstallClick}
            data-testid="pwa-install-action-btn"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-black text-white shadow-sm hover:opacity-95 dark:bg-violet-600"
          >
            <span>{t.pwaInstallBtn}</span>
          </motion.button>
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
    </AnimatePresence>
  );
}
