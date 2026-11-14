export type ConsentChoice = 'granted' | 'denied';

const CONSENT_STORAGE_KEY = 'scrolly_consent_v2';

declare global {
  interface Window {
    dataLayer?: (unknown[] | Record<string, unknown>)[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function applyGoogleConsentChoice(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Ignore storage restriction
  }

  const consentPayload = {
    ad_storage: choice,
    analytics_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
  };

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', consentPayload);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(['consent', 'update', consentPayload]);
  }
}
