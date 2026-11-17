'use client';

import React, { useEffect, useRef, useState } from 'react';
import CelebrationHost from '@/components/celebrations/CelebrationHost';
import { isFirstVisitProfile } from '@/components/onboarding/firstVisit';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import type { CategoryFilter, Language } from '@/i18n/translations';
import type { ConsentChoice } from '@/utils/consent';

export const MINI_ONBOARDING_DISMISSED_KEY = 'scrolly_mini_onboarding_dismissed_v1';

export function readMiniOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(MINI_ONBOARDING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistMiniOnboardingDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MINI_ONBOARDING_DISMISSED_KEY, '1');
  } catch {
    // Ignore storage failures
  }
}

export function clearMiniOnboardingDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MINI_ONBOARDING_DISMISSED_KEY);
  } catch {
    // Ignore storage failures
  }
}

interface MiniOnboardingHintProps {
  visible: boolean;
  xp: number;
  lang: Language;
  darkMode?: boolean;
  onDismiss: () => void;
  cookieAccepted?: boolean;
  onSelectCategory?: (category: CategoryFilter) => void;
  onConsent?: (choice: ConsentChoice) => void;
}

export default function MiniOnboardingHint({
  visible,
  xp,
  lang,
  darkMode: _darkMode = true,
  onDismiss,
  cookieAccepted = false,
  onSelectCategory,
  onConsent,
}: MiniOnboardingHintProps) {
  const latched = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visible || readMiniOnboardingDismissed()) {
      latched.current = false;
      setOpen(false);
      return;
    }
    if (latched.current || isFirstVisitProfile(xp)) {
      latched.current = true;
      setOpen(true);
    }
  }, [visible, xp]);

  return (
    <>
      <CelebrationHost lang={lang} />
      <OnboardingFlow
        open={open}
        lang={lang}
        cookieAccepted={cookieAccepted}
        onDismiss={onDismiss}
        onSelectCategory={onSelectCategory}
        onConsent={onConsent}
      />
    </>
  );
}
