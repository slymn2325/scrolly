'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface PwaManagerProps {
  lang: Language;
}

export default function PwaManager({ lang }: PwaManagerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setSwReady(true))
        .catch(() => {
          // Ignore SW registration warnings in restricted contexts
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = translations[lang];

  if (!isOnline) {
    return (
      <div
        data-testid="pwa-offline-pill"
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800"
      >
        <WifiOff className="h-3 w-3" />
        <span>{t.offlineMode}</span>
      </div>
    );
  }

  if (swReady) {
    return (
      <div
        data-testid="pwa-ready-pill"
        className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline-flex"
      >
        <Wifi className="h-3 w-3" />
        <span>{t.offlineReady}</span>
      </div>
    );
  }

  return null;
}
