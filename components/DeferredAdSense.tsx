'use client';

import { useEffect } from 'react';

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1368005726792126';

function injectAdSense(): void {
  if (document.getElementById('google-adsense-script')) return;
  const script = document.createElement('script');
  script.id = 'google-adsense-script';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = ADSENSE_SRC;
  document.body.appendChild(script);
}

/** Loads AdSense after the window load event, only where this component is mounted. */
export default function DeferredAdSense() {
  useEffect(() => {
    let idleId = 0;
    let timerId = 0;
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => injectAdSense(), { timeout: 2500 });
      } else {
        timerId = window.setTimeout(injectAdSense, 1);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);
  return null;
}
