'use client';

import { ArrowLeft, PlusSquare, Share, Smartphone, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { translations, type Language } from '@/i18n/translations';
import { motionTiming } from '@/lib/motion';
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
  darkMode: _darkMode = true,
  onClose,
  onButtonPop,
}: PwaInstallGuideModalProps) {
  const reduced = useReducedMotion() === true;
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
          transition={motionTiming.reducedFade}
          className="absolute inset-0 z-sheet flex h-full w-full flex-col overflow-hidden bg-cik-bg text-cik-text"
        >
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-cik-line bg-cik-bg px-4 pb-3"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label={t.pwaDismissLabel}
              className="cik-footnote inline-flex h-11 items-center gap-2 rounded-pill bg-cik-surface px-4 text-cik-text shadow-e1"
            >
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              <span>{lang === 'tr' ? 'Profile Dön' : 'Back to Profile'}</span>
            </button>

            <div className="cik-caption-1 inline-flex h-8 items-center gap-2 rounded-pill bg-cik-pink px-3 text-cik-text">
              <Smartphone size={16} strokeWidth={2} aria-hidden="true" />
              <span>{lang === 'tr' ? 'Tam Ekran PWA' : 'App Mode'}</span>
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-center gap-4 rounded-cik-lg bg-cik-surface-2 p-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-cik-md bg-cik-pink text-cik-text">
                <Smartphone size={24} strokeWidth={2} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="pwa-guide-title" className="cik-title-3 text-cik-text">
                  {t.pwaGuideTitle}
                </h2>
                <p className="cik-subhead mt-1 text-cik-text-2">{t.pwaPromptSubtitle}</p>
              </div>
            </div>

            <ol className="mt-4 flex flex-col gap-3">
              {steps.map(({ num, icon: StepIcon, text }) => (
                <li
                  key={num}
                  className="flex min-h-[52px] items-center gap-3 rounded-cik-lg border border-cik-line bg-cik-surface px-4 py-3"
                >
                  <span className="cik-caption-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-cik-pink text-cik-text">
                    {num}
                  </span>
                  <StepIcon size={20} strokeWidth={2} aria-hidden="true" className="shrink-0 text-cik-cta" />
                  <span className="cik-subhead text-cik-text">{text}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center gap-3 rounded-cik-lg bg-cik-butter px-4 py-3 text-cik-butter-text">
              <Sparkles size={20} strokeWidth={2} aria-hidden="true" className="shrink-0" />
              <p className="cik-footnote">
                {lang === 'tr'
                  ? 'Ana ekrana eklenince Scrolly tam ekran ve hazır önbellekle açılır.'
                  : 'Once it is on your Home Screen, Scrolly opens full screen from its cache.'}
              </p>
            </div>
          </div>

          <div
            className="shrink-0 border-t border-cik-line bg-cik-bg px-4 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
          >
            <button
              type="button"
              onClick={handleClose}
              data-testid="pwa-install-guide-close"
              className="cik-headline flex h-11 w-full items-center justify-center rounded-pill bg-cik-cta text-cik-on-cta"
            >
              {t.pwaGuideCloseBtn}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
