'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Megaphone, Sparkles } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

const ADSENSE_CLIENT_ID = 'ca-pub-1368005726792126';
const ADSENSE_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface NativeAdSlideProps {
  lang: Language;
  adIndex: number;
  onSkip: () => void;
}

const SPONSOR_ITEMS = [
  {
    tr: {
      brand: 'Scrolly Bilim Atlası',
      title: 'Günde 5 Dakikada Evrenin Sırlarını Dinle',
      body: 'Astrofizik, kuantum dünyası ve insan beyni üzerine ücretsiz sesli bölümlerle bilgini derinleştir.',
      tag: 'Bilim & Kültür',
    },
    en: {
      brand: 'Scrolly Science Atlas',
      title: 'Daily 5-Minute Cosmic & Science Audio Drops',
      body: 'Dive deeper into astrophysics, quantum oddities, and neuroscience with bite-sized daily audio.',
      tag: 'Science & Audio',
    },
  },
  {
    tr: {
      brand: 'CosmosKit Gözlem Seti',
      title: 'Şehir Işıklarından Uzak Gökyüzü Rehberi',
      body: 'Yeni başlayanlar için yıldız haritası, gezegen takvimi ve cep dürbünü rehberi.',
      tag: 'Keşif Ekipmanı',
    },
    en: {
      brand: 'CosmosKit Starlight',
      title: 'Your Pocket Night-Sky Observatory Guide',
      body: 'Interactive constellation maps, planet visibility alerts, and beginner optics curated cleanly.',
      tag: 'Explore Gear',
    },
  },
];

export default function NativeAdSlide({ lang, adIndex, onSkip }: NativeAdSlideProps) {
  const t = translations[lang];
  const sponsor = SPONSOR_ITEMS[adIndex % SPONSOR_ITEMS.length][lang];
  const [isOnline, setIsOnline] = useState(true);
  const [adFailed, setAdFailed] = useState(false);

  const shouldRenderLiveAdSense = Boolean(ADSENSE_SLOT_ID) && isOnline && !adFailed;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!shouldRenderLiveAdSense) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      setAdFailed(true);
    }
  }, [shouldRenderLiveAdSense, adIndex]);

  return (
    <div
      data-testid="native-ad-card"
      data-adsense-client={ADSENSE_CLIENT_ID}
      // Strictly isolated from card flip, heart burst, likes, and read counters
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="reels-slide relative flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-50 via-[#FFFBF0] to-violet-100 px-5 pb-24 pt-28 select-none dark:from-[#1A132B] dark:via-[#120F24] dark:to-[#1F1735]"
    >
      {/* Ambient Sponsor Glow */}
      <div className="pointer-events-none absolute -right-12 top-24 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15" />
      <div className="pointer-events-none absolute -left-12 bottom-32 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />

      {/* Top Sponsored Indicator */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-900 shadow-sm dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-200">
          <Megaphone className="h-3.5 w-3.5" />
          <span>{t.sponsoredLabel}</span>
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink/70 backdrop-blur-md dark:bg-white/10 dark:text-violet-200">
          {shouldRenderLiveAdSense ? 'Google AdSense' : sponsor.tag}
        </span>
      </div>

      {/* Center Showcase: Live AdSense Unit when slot + network active, Demo Sponsor Card offline/fallback */}
      {shouldRenderLiveAdSense ? (
        <div
          data-testid="adsense-slot-container"
          className="relative z-10 my-auto flex w-full flex-col items-center justify-center rounded-3xl border border-amber-200/80 bg-white/80 p-4 shadow-md backdrop-blur-md dark:border-white/15 dark:bg-white/5"
        >
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '280px' }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot={ADSENSE_SLOT_ID}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        <div className="relative z-10 my-auto flex flex-col items-start">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-rose-400 text-white shadow-lg">
            <Sparkles className="h-10 w-10" />
          </div>

          <p className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
            {sponsor.brand}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-ink dark:text-white">
            {sponsor.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink/80 dark:text-violet-100/85">
            {sponsor.body}
          </p>
        </div>
      )}

      {/* Footer Actions — Above iOS Floating Island Dock */}
      <div className="relative z-20 flex items-center gap-3">
        <motion.a
          href="#sponsored-info"
          onClick={(e) => {
            e.preventDefault();
            onSkip();
          }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white/90 px-5 py-3 text-xs font-extrabold text-ink shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/15 dark:text-white"
        >
          <span>{t.adLearnMore}</span>
          <ArrowUpRight className="h-4 w-4" />
        </motion.a>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onSkip}
          data-testid="native-ad-skip-btn"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white shadow-lg dark:bg-violet-600"
        >
          <span>{t.adSkipBtn}</span>
          <ArrowDown className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
