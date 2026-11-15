'use client';

import { useEffect, useState } from 'react';
import { type Language } from '@/i18n/translations';

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

export function clearPwaDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PWA_DISMISSED_KEY);
  } catch {
    // private mode / quota
  }
}

/**
 * Headless PWA install prompt capturer: captures native `beforeinstallprompt` / `appinstalled`
 * events without spawning any floating popup over the feed.
 */
export default function PwaInstallPrompt({
  onDeferredPromptChange,
}: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      try {
        window.localStorage.setItem(PWA_DISMISSED_KEY, 'true');
      } catch {
        // private mode / quota
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    onDeferredPromptChange?.(deferredPrompt);
  }, [deferredPrompt, onDeferredPromptChange]);

  return null;
}
