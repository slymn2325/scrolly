'use client';

import { useEffect, useState } from 'react';

const OFFLINE_PROBE_PATH = '/robots.txt';
const PROBE_TIMEOUT_MS = 3500;

async function probeServerReachability(signal?: AbortSignal): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return true;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    await fetch(`${OFFLINE_PROBE_PATH}?ping=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Verifies real offline status so false-negative `navigator.onLine === false`
 * reports on virtual/Windows network adapters never flash false offline UI.
 */
export function useVerifiedOfflineStatus(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let activeController: AbortController | null = null;
    let retryTimer: number | null = null;

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const verify = async () => {
      clearRetry();
      if (typeof navigator !== 'undefined' && navigator.onLine !== false) {
        activeController?.abort();
        if (!cancelled) setIsOffline(false);
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const reachable = await probeServerReachability(controller.signal);
      if (cancelled || controller.signal.aborted) return;

      if (reachable) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
        retryTimer = window.setTimeout(() => {
          void verify();
        }, 10000);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void verify();
      }
    };

    void verify();
    window.addEventListener('online', verify);
    window.addEventListener('offline', verify);
    window.addEventListener('focus', verify);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearRetry();
      activeController?.abort();
      window.removeEventListener('online', verify);
      window.removeEventListener('offline', verify);
      window.removeEventListener('focus', verify);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return isOffline;
}
