'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { translations, type CategoryFilter, type Language, type TranslationDict } from '@/i18n/translations';
import Button from '@/components/cikartma/Button';
import { sheetDismiss, sheetTransition } from '@/lib/motion';
import type { ConsentChoice } from '@/utils/consent';
import { applyGoogleConsentChoice } from '@/utils/consent';
import CategoryPick from '@/components/onboarding/CategoryPick';
import ConsentStrip from '@/components/onboarding/ConsentStrip';
import SliderDemo from '@/components/onboarding/SliderDemo';
import { useModalSurface } from '@/components/onboarding/useModalSurface';
import { usePrefersReducedMotion } from '@/components/onboarding/usePrefersReducedMotion';

const STEPS = [0, 1, 2] as const;
type StepIndex = (typeof STEPS)[number];

interface OnboardingFlowProps {
  open: boolean;
  lang: Language;
  cookieAccepted: boolean;
  onDismiss: () => void;
  onSelectCategory?: (category: CategoryFilter) => void;
  onConsent?: (choice: ConsentChoice) => void;
}

export default function OnboardingFlow({
  open,
  lang,
  cookieAccepted,
  onDismiss,
  onSelectCategory,
  onConsent,
}: OnboardingFlowProps) {
  const copy = translations[lang];
  const titleId = useId();
  const reduced = usePrefersReducedMotion();
  const dragControls = useDragControls();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<StepIndex>(0);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [consentDone, setConsentDone] = useState(cookieAccepted);
  const { panelRef, layerRef } = useModalSurface(mounted && open, onDismiss);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setConsentDone(cookieAccepted);
  }, [cookieAccepted]);

  const finish = useCallback(
    (applyCategory: boolean) => {
      if (applyCategory) onSelectCategory?.(category);
      onDismiss();
    },
    [category, onDismiss, onSelectCategory],
  );

  const advance = () => {
    if (step === 2) {
      finish(true);
      return;
    }
    setStep((current) => (current === 0 ? 1 : 2));
  };

  const chooseConsent = (choice: ConsentChoice) => {
    applyGoogleConsentChoice(choice);
    setConsentDone(true);
    onConsent?.(choice);
  };

  if (!mounted) return null;

  const title = stepTitle(step, copy);
  const body = stepBody(step, copy);
  const primary = step === 2 ? copy.onboardingStart : copy.onboardingNext;
  const stepLabel = copy.onboardingStepLabel.replace('{step}', String(step + 1));

  return createPortal(
    <AnimatePresence>
      {open ? (
      <div ref={layerRef} data-cik-layer="onboarding" className="fixed inset-0 z-sheet flex items-end justify-center" role="presentation">
        <motion.div
          className="cik-scrim absolute inset-0"
          aria-hidden="true"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: sheetTransition(reduced, 'close') }}
          transition={sheetTransition(reduced, 'open')}
        />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-testid="onboarding-flow"
          data-step={step + 1}
          lang={lang}
          drag={reduced ? false : 'y'}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            const height = panelRef.current?.getBoundingClientRect().height ?? 1;
            const pulled = info.offset.y > height * sheetDismiss.distanceRatio;
            const flung = info.velocity.y > sheetDismiss.velocityPxPerSec;
            if (pulled || flung) onDismiss();
          }}
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={
            reduced
              ? { opacity: 0, transition: sheetTransition(true, 'close') }
              : { y: '100%', transition: sheetTransition(false, 'close') }
          }
          transition={sheetTransition(reduced, 'open')}
          className="cik-sheet relative flex max-h-[calc(100dvh-64px)] w-full max-w-lg flex-col bg-cik-surface text-cik-text"
        >
          <div
            className="flex h-11 w-full items-center justify-center"
            style={{ touchAction: 'none' }}
            onPointerDown={(event) => {
              if (reduced) return;
              dragControls.start(event);
            }}
          >
            <span aria-hidden="true" className="h-1 w-8 rounded-pill bg-cik-line" />
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-2">
            <p className="cik-caption-1 whitespace-nowrap text-cik-text-2">{stepLabel}</p>
            <div className="flex items-center gap-2" aria-hidden="true">
              {STEPS.map((index) => (
                <span
                  key={index}
                  className={`h-2 rounded-pill ${index === step ? 'w-8 bg-cik-berry' : 'w-2 bg-cik-line'}`}
                />
              ))}
            </div>
            <Button
              tone="ghost"
              data-testid="mini-onboarding-dismiss-btn"
              onClick={onDismiss}
              className="px-4"
            >
              {copy.onboardingSkip}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <div className="flex flex-col gap-4">
              {step === 0 ? (
                <img
                  src="/assets/fluent/sparkles.png"
                  alt=""
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] object-contain"
                />
              ) : null}
              <h2 id={titleId} className="cik-title-2 text-cik-text">
                {title}
              </h2>
              <p className="cik-body text-cik-text-2">{body}</p>
              {step === 1 ? <SliderDemo lang={lang} /> : null}
              {step === 2 ? <CategoryPick lang={lang} selected={category} onSelect={setCategory} /> : null}
            </div>
          </div>
          <div
            className="flex flex-col gap-2 px-5 pt-2"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <Button data-testid="onboarding-next" className="w-full" onClick={advance}>
              {primary}
            </Button>
            <ConsentStrip lang={lang} accepted={consentDone} onChoice={chooseConsent} />
          </div>
        </motion.div>
      </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function stepTitle(step: StepIndex, copy: TranslationDict): string {
  switch (step) {
    case 0:
      return copy.onboardingStep1Title;
    case 1:
      return copy.onboardingStep2Title;
    case 2:
      return copy.onboardingStep3Title;
    default: {
      const neverStep: never = step;
      return neverStep;
    }
  }
}

function stepBody(step: StepIndex, copy: TranslationDict): string {
  switch (step) {
    case 0:
      return copy.onboardingStep1Body;
    case 1:
      return copy.onboardingStep2Body;
    case 2:
      return copy.onboardingStep3Body;
    default: {
      const neverStep: never = step;
      return neverStep;
    }
  }
}
