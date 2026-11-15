'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusSquare, Share, Smartphone, Sparkles, X } from 'lucide-react';
import { translations, type Language } from '@/i18n/translations';

interface PwaInstallGuideModalProps {
  open: boolean;
  lang: Language;
  onClose: () => void;
  onButtonPop: () => void;
}

/**
 * Interactive 3-step visual modal explaining how to install Scrolly onto the user's home screen
 * on iOS Safari and browsers without a native `beforeinstallprompt` sheet.
 */
export default function PwaInstallGuideModal({
  open,
  lang,
  onClose,
  onButtonPop,
}: PwaInstallGuideModalProps) {
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady) return null;

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

  const handleClose = () => {
    onButtonPop();
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="pwa-install-guide-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={handleClose}
          data-testid="pwa-install-guide-modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-violet-300/25 bg-[#12101B] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/20 text-violet-200">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold leading-snug text-white">
                    {t.pwaGuideTitle}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-white/65">
                    {t.pwaPromptSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t.pwaDismissLabel}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-2.5">
              {steps.map(({ num, icon: StepIcon, text }) => (
                <li
                  key={num}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-[11px] font-black text-violet-100">
                    {num}
                  </span>
                  <StepIcon className="h-4 w-4 shrink-0 text-violet-300" />
                  <span className="text-xs font-medium leading-snug text-white/90">
                    {text}
                  </span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={handleClose}
              data-testid="pwa-install-guide-close"
              className="mt-4 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-xs font-extrabold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              {t.pwaGuideCloseBtn}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
