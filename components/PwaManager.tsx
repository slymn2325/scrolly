'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { useVerifiedOfflineStatus } from '@/utils/networkStatus';

interface PwaManagerProps {
  lang: Language;
}

export default function PwaManager({ lang }: PwaManagerProps) {
  const isOnline = !useVerifiedOfflineStatus();
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setSwReady(true))
        .catch(() => {
          // Ignore SW registration warnings in restricted contexts
        });
    }
  }, []);

  const t = translations[lang];

  if (!isOnline) {
    return (
      <div
        data-testid="pwa-offline-pill"
        className="cik-caption-2 inline-flex h-8 items-center gap-1 rounded-pill bg-cik-butter px-3 text-cik-butter-text"
      >
        <WifiOff size={16} strokeWidth={2} aria-hidden="true" />
        <span>{t.offlineMode}</span>
      </div>
    );
  }

  if (swReady) {
    return (
      <div
        data-testid="pwa-ready-pill"
        className="cik-caption-2 hidden h-8 items-center gap-1 rounded-pill bg-cik-mint px-3 text-cik-mint-text sm:inline-flex"
      >
        <Wifi size={16} strokeWidth={2} aria-hidden="true" />
        <span>{t.offlineReady}</span>
      </div>
    );
  }

  return null;
}
