'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sparkles, Timer, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';

interface RewardedAdModalProps {
  open: boolean;
  lang: Language;
  onClaimReward: () => void;
  onClose: () => void;
}

export default function RewardedAdModal({
  open,
  lang,
  onClaimReward,
  onClose,
}: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const t = translations[lang];

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(3);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const ready = secondsLeft === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.rewindUnlockBtn}
      data-testid="rewarded-ad-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ type: 'spring', stiffness: 320, damping: 25 }}
        className="relative w-full max-w-[430px] rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-6 shadow-cozy-lg"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onClose}
          aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/55 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
            <RotateCcw className="h-3.5 w-3.5" />
            {t.rewindUnlockBtn}
          </span>
        </div>

        <h2 className="mt-3 font-display text-xl font-bold text-ink sm:text-2xl">
          {lang === 'tr'
            ? 'Oturum Boyu Sınırsız Geri Sarma'
            : 'Unlimited Session Rewinds'}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-ink/70 sm:text-sm">
          {lang === 'tr'
            ? 'Kısa hazırlık tamamlandığında bu oturum boyunca okuduğun tüm bilgi kartlarına sınırsızca geri dönebilirsin.'
            : 'Once the brief preparation completes, you can rewind freely through every discovery card you viewed during this session.'}
        </p>

        {/* Honest Utility Session Box */}
        <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-pastel-lavender/70 via-white to-pastel-sun/70 p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-violet-700">
            <Sparkles className="h-4 w-4" />
            <span>{lang === 'tr' ? 'Keşif Oturumu' : 'Discovery Boost'}</span>
          </div>
          <p className="mt-1.5 font-display text-base font-bold text-ink">
            {lang === 'tr'
              ? 'Kaçırdığın Detayları Yeniden İncele'
              : 'Revisit Missed Science Details'}
          </p>
          <p className="mt-1 text-xs text-ink/75">
            {lang === 'tr'
              ? 'Birincil kaynak bağlantılarını kontrol et, kartların arka yüzünü oku ve Hafıza Quizine hazırlan.'
              : 'Inspect verified citations, read scientific explanations, and prepare for your Memory Quiz.'}
          </p>
        </div>

        {/* Countdown / Claim Action */}
        <div className="mt-5 flex flex-col gap-2">
          <motion.button
            type="button"
            disabled={!ready}
            whileTap={ready ? { scale: 0.94 } : undefined}
            onClick={onClaimReward}
            data-testid="rewarded-claim-btn"
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-extrabold transition-all ${
              ready
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-cozy'
                : 'cursor-wait bg-slate-200 text-ink/50'
            }`}
          >
            {ready ? (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>{t.rewardedClaimBtn}</span>
              </>
            ) : (
              <>
                <Timer className="h-4 w-4 animate-spin" />
                <span>
                  {t.rewardedCountdown} ({secondsLeft}s)...
                </span>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onClose}
            className="w-full rounded-full py-2 text-xs font-bold text-ink/55 hover:text-ink"
          >
            {t.rewardedSkipBtn}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
