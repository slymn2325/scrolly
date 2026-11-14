'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Compass, Megaphone, Sparkles } from 'lucide-react';
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
  cookieBannerVisible?: boolean;
  onSkip: () => void;
}

const DISCOVERY_TIP_ITEMS = [
  {
    tr: {
      brand: 'Scrolly Keşif İpucu',
      title: 'Bilgileri İnteraktif Eskizlerle Test Et',
      body: 'Her bilgi kartının üstündeki eskiz defterine dokunarak bilimsel animasyonları canlandırabilir, ardından tahmin kilitleyerek +20 XP kazanabilirsin.',
      tag: 'Keşif Rehberi',
    },
    en: {
      brand: 'Scrolly Discovery Tip',
      title: 'Animate Every Scientific Sketch Diagram',
      body: 'Tap any hand-drawn notebook diagram above the card to trigger measurements, lock your Quick Guess for +20 XP, and check verified sources on the back.',
      tag: 'Explorer Tip',
    },
  },
  {
    tr: {
      brand: 'Scrolly Çevrimdışı Mod',
      title: 'İnternetsiz Ortamda Bile Akış Seninle',
      body: 'Metroda veya uçakta tüm kategoriler, hafıza quizleri ve 9:16 Story / Başarı Diploması üreticisi cihazında hazır çalışır.',
      tag: 'Offline PWA',
    },
    en: {
      brand: 'Scrolly Offline Mode',
      title: 'Zero Connection? Your Deck Keeps Flowing',
      body: 'Every fact category, memory sprint quiz, and your 9:16 Story & Explorer Diploma PNG generator run locally even without Wi-Fi.',
      tag: 'Offline PWA',
    },
  },
];

export default function NativeAdSlide({
  lang,
  adIndex,
  cookieBannerVisible = false,
  onSkip,
}: NativeAdSlideProps) {
  const t = translations[lang];
  const tip = DISCOVERY_TIP_ITEMS[adIndex % DISCOVERY_TIP_ITEMS.length][lang];
  const [isOnline, setIsOnline] = useState(true);
  const [adFailed, setAdFailed] = useState(false);

  // Only load real AdSense unit when NEXT_PUBLIC_ADSENSE_SLOT_ID is explicitly defined & online
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
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`reels-slide relative flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-50 via-[#FFFBF0] to-violet-100 px-5 pt-[calc(6.25rem+env(safe-area-inset-top))] select-none dark:from-[#1A132B] dark:via-[#120F24] dark:to-[#1F1735] ${
        cookieBannerVisible
          ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
          : 'pb-[calc(94px+env(safe-area-inset-bottom))]'
      }`}
    >
      {/* Ambient Sponsor Glow */}
      <div className="pointer-events-none absolute -right-12 top-24 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-500/15" />
      <div className="pointer-events-none absolute -left-12 bottom-32 h-64 w-64 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/20" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] md:max-w-xl flex-col justify-between">
        {/* Top Sponsored Indicator */}
        <div className="flex items-center justify-between">
          <span
            data-testid="sponsored-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-900 shadow-sm dark:border-amber-600/60 dark:bg-amber-900/50 dark:text-amber-200"
          >
            <Megaphone className="h-3.5 w-3.5" />
            <span>{t.sponsoredLabel}</span>
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink/70 backdrop-blur-md dark:bg-white/10 dark:text-violet-200">
            {shouldRenderLiveAdSense ? 'Google AdSense' : tip.tag}
          </span>
        </div>

        {/* Live AdSense Slot when NEXT_PUBLIC_ADSENSE_SLOT_ID is set + online, otherwise clean Scrolly Discovery Tip */}
        {shouldRenderLiveAdSense ? (
          <div
            data-testid="adsense-slot-container"
            className="my-auto flex w-full flex-col items-center justify-center rounded-3xl border border-amber-200/80 bg-white/85 p-4 shadow-md backdrop-blur-md dark:border-white/15 dark:bg-white/5"
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
          <div
            data-testid="scrolly-discovery-tip-fallback"
            className="my-auto flex flex-col items-start rounded-3xl border border-amber-200/75 bg-white/75 p-5 sm:p-6 shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-violet-500 text-white shadow-md">
              <Compass className="h-7 w-7" />
            </div>

            <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{tip.brand}</span>
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-ink dark:text-white">
              {tip.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/80 dark:text-violet-100/85">
              {tip.body}
            </p>
          </div>
        )}

        {/* Footer Actions — Above iOS Floating Island Dock */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onSkip}
            whileTap={{ scale: 0.95 }}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full border border-amber-300 bg-white/90 px-5 py-2.5 text-xs font-extrabold text-ink shadow-sm backdrop-blur-md dark:border-white/20 dark:bg-white/15 dark:text-white whitespace-normal break-words leading-snug"
          >
            <span>{t.adLearnMore}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onSkip}
            data-testid="native-ad-skip-btn"
            className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white shadow-lg dark:bg-violet-600 whitespace-normal break-words leading-snug"
          >
            <span>{t.adSkipBtn}</span>
            <ArrowDown className="h-4 w-4 shrink-0" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
