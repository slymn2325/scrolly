'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import type { ConsentChoice } from '@/utils/consent';

interface ConsentStripProps {
  lang: Language;
  accepted: boolean;
  onChoice: (choice: ConsentChoice) => void;
}

export default function ConsentStrip({ lang, accepted, onChoice }: ConsentStripProps) {
  const copy = translations[lang];
  const detailsId = useId();
  const [open, setOpen] = useState(false);

  if (accepted) return null;

  return (
    <div
      data-testid="onboarding-consent"
      role="region"
      aria-label={copy.onboardingConsentSettings}
      className={`material-thick flex flex-col gap-2 px-4 py-2 ${open ? 'rounded-cik-lg' : 'rounded-pill'}`}
    >
      <div className="flex items-center gap-2">
        <p className="cik-caption-1 min-w-0 flex-1 truncate text-cik-text-2">{copy.onboardingConsent}</p>
        <button
          type="button"
          data-testid="onboarding-consent-accept"
          onClick={() => onChoice('granted')}
          className="cik-footnote inline-flex h-11 shrink-0 items-center justify-center rounded-pill bg-cik-cta px-4 text-cik-on-cta active:scale-[0.96]"
        >
          {copy.onboardingConsentAccept}
        </button>
        <button
          type="button"
          data-testid="onboarding-consent-settings"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((current) => !current)}
          className="cik-footnote inline-flex h-11 shrink-0 items-center justify-center rounded-pill px-4 text-cik-text active:scale-[0.96]"
        >
          {copy.onboardingConsentSettings}
        </button>
      </div>
      {open ? (
        <div id={detailsId} className="flex flex-col gap-2 px-2 pb-2">
          <p className="cik-caption-1 text-pretty text-cik-text-2">
            {copy.cookieText}{' '}
            <Link
              href={lang === 'en' ? '/privacy?lang=en' : '/privacy'}
              data-testid="onboarding-consent-privacy-link"
              className="cik-caption-1 text-cik-cta underline"
            >
              {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
            </Link>
          </p>
          <button
            type="button"
            data-testid="onboarding-consent-decline"
            onClick={() => onChoice('denied')}
            className="cik-footnote inline-flex h-11 items-center justify-center self-start rounded-pill px-4 text-cik-text active:scale-[0.96]"
          >
            {copy.onboardingConsentDecline}
          </button>
        </div>
      ) : null}
    </div>
  );
}
