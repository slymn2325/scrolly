'use client';

import { useEffect } from 'react';

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1368005726792126';
const CONSENT_KEY = 'scrolly_consent_v2';

function injectAdSense(): void {
  if (document.getElementById('google-adsense-script')) return;
  const script = document.createElement('script');
  script.id = 'google-adsense-script';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = ADSENSE_SRC;
  document.body.appendChild(script);
}

function hasAdConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

/** Loads AdSense after consent, during idle time, only where this component is mounted. */
export default function DeferredAdSense() {
  useEffect(() => {
    let idleId = 0;
    let timerId = 0;
    let scheduled = false;

    const schedule = () => {
      if (scheduled || !hasAdConsent()) return;
      scheduled = true;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => injectAdSense(), { timeout: 2500 });
      } else {
        timerId = window.setTimeout(injectAdSense, 1);
      }
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    window.addEventListener('storage', schedule);
    document.addEventListener('click', schedule);

    return () => {
      window.removeEventListener('load', schedule);
      window.removeEventListener('storage', schedule);
      document.removeEventListener('click', schedule);
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);
  return null;
}
