'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { CATEGORY_SELECTOR_OPTIONS, translations, type CategoryFilter, type Language } from '@/i18n/translations';
import { vibrateTap } from '@/utils/haptics';

interface CategoryPickProps {
  lang: Language;
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}

export default function CategoryPick({ lang, selected, onSelect }: CategoryPickProps) {
  const copy = translations[lang];
  return (
    <div className="grid grid-cols-2 gap-2" role="listbox" aria-label={copy.onboardingStep3Title}>
      {CATEGORY_SELECTOR_OPTIONS.map((category) => {
        const isSelected = category.id === selected;
        const label = category.label[lang];
        return (
          <button
            key={category.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            data-testid={`onboarding-category-${category.id}`}
            onClick={() => {
              vibrateTap(8);
              onSelect(category.id);
            }}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-2 rounded-cik-lg px-2 py-2 text-center active:scale-[0.96] ${
              isSelected ? 'bg-cik-berry text-cik-on-berry shadow-sticker' : 'bg-cik-surface-2 text-cik-text shadow-e1'
            }`}
          >
            <img src={category.iconPath} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
            <span className="cik-footnote line-clamp-2 w-full">{label}</span>
            {isSelected ? (
              <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-pill bg-cik-cta text-cik-on-cta">
                <Check size={16} strokeWidth={2} aria-hidden="true" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
