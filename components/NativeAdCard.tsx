'use client';

import React from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { ArrowRight, ExternalLink, Sparkles, Star } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface NativeAdCardProps {
  lang: Language;
  onSkip: () => void;
}

const SPONSORED_CONTENT = {
  tr: {
    brand: 'Bilim & Keşif Kulübü',
    headline: 'Her Sabah Kahvenle 1 Dakikalık Bilimsel Şaşkınlık',
    body: 'Gökyüzü olayları, yeni arkeolojik keşifler ve doğanın tuhaf sırları: Reklamsız özenle seçilmiş haftalık merak paketini ücretsiz dene.',
    highlights: ['Haftada 5 seçkin keşif', 'Bilimsel kaynaklı özetler', 'Tek tıkla abonelik çıkışı'],
  },
  en: {
    brand: 'Science & Wonder Club',
    headline: '1 Minute of Scientific Wonder With Your Morning Coffee',
    body: 'Cosmic phenomena, fresh archaeological breakthroughs, and nature oddities—curated weekly with verified sources and zero fluff.',
    highlights: ['5 curated discoveries weekly', 'Peer-reviewed source links', 'One-click unsubscribe'],
  },
};

export default function NativeAdCard({ lang, onSkip }: NativeAdCardProps) {
  const t = translations[lang];
  const ad = SPONSORED_CONTENT[lang];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 95 || Math.abs(info.velocity.x) > 480) {
      onSkip();
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, x: -90 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        data-ad-slot="in-feed-native"
        data-testid="native-ad-card"
        data-fact-surface="true"
        className="flex min-h-[440px] w-full flex-col justify-between rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-[#FFFDF7] via-[#FEF6D8]/55 to-[#E5F6FF]/55 p-6 shadow-cozy-lg dark:border-violet-700/50 dark:bg-none sm:min-h-[460px] sm:p-8"
      >
        {/* Top Sponsor Tag */}
        <div className="flex items-center justify-between gap-2">
          <span
            data-testid="native-ad-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/95 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {t.sponsoredLabel}
          </span>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onSkip}
            data-testid="native-ad-skip-top-btn"
            className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-bold text-ink/75 shadow-sm hover:bg-white hover:text-ink"
          >
            <span>{t.adSkipBtn}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>

        {/* Center Native Ad Content */}
        <div className="my-auto flex flex-col items-start gap-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm">
              🔭
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
                {ad.brand}
              </p>
              <div className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
            </div>
          </div>

          <h2 className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
            {ad.headline}
          </h2>

          <p className="text-sm leading-relaxed text-ink/80 sm:text-base">{ad.body}</p>

          <div className="flex flex-wrap gap-2">
            {ad.highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-amber-200/70 bg-white/85 px-3 py-1 text-xs font-semibold text-ink/75"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-amber-200/50 pt-4">
          <motion.a
            href="#native-sponsor"
            onClick={(e) => {
              e.preventDefault();
            }}
            whileTap={{ scale: 0.94 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-200/75 sm:text-sm"
          >
            <span>{t.adLearnMore}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </motion.a>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onSkip}
            data-testid="native-ad-skip-btn"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white shadow-pill hover:bg-ink/90 sm:text-sm"
          >
            <span>{t.adSkipBtn}</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
