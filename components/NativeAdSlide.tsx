'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDown, BookOpen, Compass, Info, Megaphone, Sparkles } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import { getTotalCardsViewed } from '@/utils/userMemory';

const ADSENSE_CLIENT_ID = 'ca-pub-1368005726792126';
const ADSENSE_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
const MIN_WARMUP_CARDS_FOR_ADS = 10;

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface NativeAdSlideProps {
  lang: Language;
  adIndex: number;
  totalCardsViewed?: number;
  cookieBannerVisible?: boolean;
  onSkip: () => void;
}

const LAB_GUIDE_TIPS = [
  {
    tr: {
      badge: 'Lab Guide • Pro Tip',
      brand: 'Scrolly Keşif Rehberi',
      title: '3D Kartı Çevir ve Birincil Kaynağı Doğrula',
      body: 'Ön yüzdeki eskize dokunarak animasyonu tetikle, "Tahmini Kilitle" ile +20 XP kap ve arka yüzde NASA, Nature veya Science kaynak bağlantılarını doğrudan incele.',
    },
    en: {
      badge: 'Lab Guide • Pro Tip',
      brand: 'Scrolly Lab Guide',
      title: 'Flip Cards for Peer-Reviewed Sources & +20 XP',
      body: 'Tap any hand-drawn diagram to run its simulation, lock in your Quick Guess for +20 XP, and flip the card to inspect direct NASA, Nature, or Science citations.',
    },
  },
  {
    tr: {
      badge: 'Lab Guide • Pro Tip',
      brand: 'Scrolly Akış Stratejisi',
      title: 'Kategori Filtresi & Çevrimdışı PWA Gücü',
      body: 'Üstteki kategori haplarıyla odağını Uzay, Kuantum veya Doğa’ya çevir; metroda internet olmasa bile okuduğun desteler ve Kaşif Diploman yerel olarak çalışmaya devam eder.',
    },
    en: {
      badge: 'Lab Guide • Pro Tip',
      brand: 'Scrolly Discovery Tip',
      title: 'Filter by Discipline & Explore Offline Anywhere',
      body: 'Use the top discipline pills to focus on Space, Nature, or Physics—and keep swiping cards or reviewing your Explorer Radar even offline as a PWA.',
    },
  },
];

export default function NativeAdSlide({
  lang,
  adIndex,
  totalCardsViewed,
  cookieBannerVisible = false,
  onSkip,
}: NativeAdSlideProps) {
  const t = translations[lang];
  const tip = LAB_GUIDE_TIPS[adIndex % LAB_GUIDE_TIPS.length][lang];
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedSlotKeyRef = useRef<string | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [adStatus, setAdStatus] = useState<'idle' | 'filled' | 'unfilled' | 'failed'>('idle');
  const [storedCardsViewed, setStoredCardsViewed] = useState<number>(0);

  useEffect(() => {
    setStoredCardsViewed(getTotalCardsViewed());
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
  }, [adIndex, totalCardsViewed]);

  const effectiveCardsViewed = Math.max(totalCardsViewed ?? 0, storedCardsViewed);
  const isUserWarmedUp = effectiveCardsViewed >= MIN_WARMUP_CARDS_FOR_ADS;
  const shouldAttemptLiveAd =
    Boolean(ADSENSE_SLOT_ID) && isOnline && isUserWarmedUp && adStatus !== 'unfilled' && adStatus !== 'failed';
  const isAdFilled = shouldAttemptLiveAd && adStatus === 'filled';

  useEffect(() => {
    const insEl = insRef.current;
    if (!shouldAttemptLiveAd || !insEl) return;

    const syncStatusFromDom = () => {
      const statusAttr = insEl.getAttribute('data-ad-status');
      if (statusAttr === 'filled') {
        setAdStatus('filled');
      } else if (statusAttr === 'unfilled') {
        setAdStatus('unfilled');
      }
    };

    syncStatusFromDom();

    const observer = new MutationObserver(() => {
      syncStatusFromDom();
    });
    observer.observe(insEl, {
      attributes: true,
      attributeFilter: ['data-ad-status'],
    });

    const pushKey = `${ADSENSE_SLOT_ID}-${adIndex}`;
    if (pushedSlotKeyRef.current !== pushKey) {
      pushedSlotKeyRef.current = pushKey;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        setAdStatus('failed');
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [shouldAttemptLiveAd, adIndex]);

  return (
    <div
      data-testid="native-ad-card"
      data-adsense-client={ADSENSE_CLIENT_ID}
      data-adsense-warmed-up={isUserWarmedUp ? 'true' : 'false'}
      data-ad-render-state={isAdFilled ? 'filled' : 'pro-tip'}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`reels-slide relative flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-slate-100 px-5 pt-[calc(6.25rem+env(safe-area-inset-top))] select-none dark:bg-[#0B0F17] ${
        cookieBannerVisible
          ? 'pb-[calc(154px+env(safe-area-inset-bottom))]'
          : 'pb-[calc(94px+env(safe-area-inset-bottom))]'
      }`}
    >
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] md:max-w-xl flex-col justify-between rounded-3xl border-2 border-slate-300/90 bg-white/95 p-4 shadow-md dark:border-slate-700/90 dark:bg-[#121826]/95">
        {/* Top Disclosure Badge — Show "Advertisement • Reklam" ONLY when data-ad-status="filled" */}
        <div className="flex items-center justify-between gap-2">
          {isAdFilled ? (
            <span
              data-testid="ad-filled-badge"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>Advertisement • Reklam</span>
            </span>
          ) : (
            <span
              data-testid="pro-tip-badge"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-100/90 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-violet-900 shadow-sm dark:border-violet-500/40 dark:bg-violet-900/50 dark:text-violet-200"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>{tip.badge}</span>
            </span>
          )}

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {isAdFilled ? 'Google AdSense' : 'scrolly.live'}
          </span>
        </div>

        {/* Center Body: Policy-Safe AdSense Safe Buffer (min 32px vertical / 24px horizontal) or Lab Guide Fallback */}
        <div className="relative my-auto w-full">
          {shouldAttemptLiveAd && (
            <div
              data-testid="adsense-safe-zone"
              className={`${
                isAdFilled ? 'relative opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
              } w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 transition-opacity duration-200 dark:border-slate-700 dark:bg-[#0D1320]`}
            >
              <div
                data-testid="adsense-slot-container"
                className="flex w-full items-center justify-center overflow-hidden rounded-xl"
              >
                <ins
                  ref={insRef}
                  className="adsbygoogle"
                  style={{ display: 'block', width: '100%', minHeight: '250px' }}
                  data-ad-client={ADSENSE_CLIENT_ID}
                  data-ad-slot={ADSENSE_SLOT_ID}
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              </div>
            </div>
          )}

          {!isAdFilled && (
            <div
              data-testid="scrolly-discovery-tip-fallback"
              className="flex flex-col items-start rounded-2xl border border-slate-200 bg-slate-50/90 p-5 sm:p-6 dark:border-slate-700/80 dark:bg-slate-900/80"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md">
                <Compass className="h-6 w-6" />
              </div>

              <p className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{tip.brand}</span>
              </p>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold leading-tight text-ink dark:text-white">
                {tip.title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-ink/80 dark:text-slate-200/90">
                {tip.body}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={lang === 'en' ? '/about?lang=en' : '/about'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-extrabold text-violet-800 hover:bg-violet-50 dark:border-violet-700/50 dark:bg-slate-800 dark:text-violet-200"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Yayın İlkeleri' : 'Editorial Standards'}</span>
                </Link>
                <Link
                  href={`/category/science${lang === 'en' ? '?lang=en' : ''}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Bilim Arşivi' : 'Science Hub'}</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action — Safely Separated From Ad Container (No Like/Share Buttons) */}
        <div className="mt-3 flex items-center gap-3 pt-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onSkip}
            data-testid="native-ad-skip-btn"
            className="flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white shadow-lg dark:bg-violet-600 whitespace-normal break-words leading-snug"
          >
            <span>{t.nextCard}</span>
            <ArrowDown className="h-4 w-4 shrink-0" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
