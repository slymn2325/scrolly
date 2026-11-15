'use client';

import { ArrowLeft, PlusSquare, Share, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { translations, type Language } from '@/i18n/translations';
import { DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import { useEscapeClose } from '@/utils/useEscapeClose';

interface PwaInstallGuideModalProps {
  open: boolean;
  lang: Language;
  darkMode?: boolean;
  onClose: () => void;
  onButtonPop: () => void;
}

/**
 * Full-page 3-step visual guide explaining how to install Scrolly onto the user's home screen
 * on iOS Safari and browsers without a native `beforeinstallprompt` sheet.
 */
export default function PwaInstallGuideModal({
  open,
  lang,
  darkMode = true,
  onClose,
  onButtonPop,
}: PwaInstallGuideModalProps) {
  const handleClose = () => {
    onButtonPop();
    onClose();
  };

  useEscapeClose(open, onClose);

  const t = translations[lang];
  const steps = [
    {
      num: '1',
      icon: Share,
      text: t.pwaGuideStep1,
    },
    {
      num: '2',
      icon: PlusSquare,
      text: t.pwaGuideStep2,
    },
    {
      num: '3',
      icon: Sparkles,
      text: t.pwaGuideStep3,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pwa-install-guide-page"
          data-testid="pwa-install-guide-modal"
          data-presentation="page"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
          transition={{ duration: 0.2 }}
          className={`absolute inset-0 z-30 flex h-full w-full flex-col overflow-hidden ${
            darkMode ? 'bg-[#0F0D18] text-white' : 'bg-[#FFFDF9] text-[#1E1B2E]'
          }`}
        >
          {/* Top Navigation Bar */}
          <div
            className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-3 pt-[calc(env(safe-area-inset-top,14px)+14px)] lg:pt-4 ${
              darkMode ? 'border-white/10 bg-[#0F0D18]' : 'border-[#1E1B2E]/10 bg-[#FFFDF9]'
            }`}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label={t.pwaDismissLabel}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-extrabold transition active:scale-95 ${
                darkMode
                  ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                  : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E] hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>{lang === 'tr' ? 'Profile Dön' : 'Back to Profile'}</span>
            </button>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                darkMode ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-100 text-violet-800'
              }`}
            >
              <img src={UI_ICON_PATHS.verifiedSeal} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
              <span>{lang === 'tr' ? 'Tam Ekran PWA' : 'App Mode'}</span>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-6">
            <div
              className={`rounded-3xl border p-5 ${
                darkMode
                  ? 'border-violet-400/25 bg-gradient-to-br from-violet-950/60 via-[#151226] to-[#0F0D18]'
                  : 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50/40'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                    darkMode
                      ? 'border-violet-400/30 bg-violet-500/20'
                      : 'border-violet-200 bg-white shadow-sm'
                  }`}
                >
                  <img
                    src={DOCK_ICON_MAP.explore}
                    alt=""
                    aria-hidden="true"
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-extrabold leading-snug">
                    {t.pwaGuideTitle}
                  </h2>
                  <p
                    className={`mt-1 text-xs font-medium leading-relaxed ${
                      darkMode ? 'text-white/70' : 'text-[#1E1B2E]/70'
                    }`}
                  >
                    {t.pwaPromptSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <ol className="mt-5 space-y-3">
              {steps.map(({ num, icon: StepIcon, text }) => (
                <li
                  key={num}
                  className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 ${
                    darkMode
                      ? 'border-white/10 bg-white/[0.04]'
                      : 'border-[#1E1B2E]/10 bg-white shadow-sm'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      darkMode
                        ? 'bg-violet-500/30 text-violet-100'
                        : 'bg-violet-100 text-violet-800'
                    }`}
                  >
                    {num}
                  </span>
                  <StepIcon
                    className={`h-4 w-4 shrink-0 ${
                      darkMode ? 'text-violet-300' : 'text-violet-600'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold leading-relaxed ${
                      darkMode ? 'text-white/90' : 'text-[#1E1B2E]/90'
                    }`}
                  >
                    {text}
                  </span>
                </li>
              ))}
            </ol>

            <div
              className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                darkMode
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <img
                src={UI_ICON_PATHS.xpSparkles}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 shrink-0 object-contain"
              />
              <p className="text-[11px] font-bold leading-snug">
                {lang === 'tr'
                  ? 'Ana Ekrana eklendiğinde Scrolly kesintisiz tam ekran modda ve hızlı önbellekle çalışır.'
                  : 'Once added to your Home Screen, Scrolly launches cleanly in full-screen app mode.'}
              </p>
            </div>
          </div>

          {/* Sticky Footer */}
          <div
            className={`shrink-0 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,16px)+18px)] ${
              darkMode ? 'border-white/10 bg-[#0F0D18]' : 'border-[#1E1B2E]/10 bg-[#FFFDF9]'
            }`}
          >
            <button
              type="button"
              onClick={handleClose}
              data-testid="pwa-install-guide-close"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              <img src={UI_ICON_PATHS.badgeStar} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
              <span>{t.pwaGuideCloseBtn}</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
