'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import {
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';

interface WelcomeBadgeProps {
  lang: Language;
  discoveredCount: number;
  topCategory: CategoryId | null;
  isReturningUser: boolean;
}

export default function WelcomeBadge({
  lang,
  discoveredCount,
  topCategory,
  isReturningUser,
}: WelcomeBadgeProps) {
  const t = translations[lang];
  const catMeta = topCategory ? getCategoryMeta(topCategory) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto mb-4 flex max-w-xl justify-center px-2"
    >
      {isReturningUser || discoveredCount > 0 ? (
        <div
          data-testid="welcome-badge-returning"
          className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-amber-200/90 bg-white/90 px-4 py-2 text-center text-xs font-semibold text-ink shadow-pill backdrop-blur-sm dark:border-white/15 dark:bg-[#1A162B]/90 dark:text-violet-100 sm:rounded-full sm:text-sm"
        >
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <strong>{t.welcomeReturning}</strong>
          </span>
          <span>
            <strong className="text-violet-700 dark:text-violet-300">{discoveredCount}</strong>{' '}
            {t.discoveredCount}
          </span>
          {catMeta && (
            <>
              <span className="text-ink/30 dark:text-white/30">•</span>
              <span className="inline-flex items-center gap-1">
                {t.favoriteArea}:{' '}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${catMeta.bgClass} ${catMeta.accentText}`}
                >
                  {catMeta.emoji} {catMeta.label[lang]}
                </span>
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 sm:inline-flex">
                <TrendingUp className="h-3 w-3" />
                {t.priorityActive}
              </span>
            </>
          )}
        </div>
      ) : (
        <div
          data-testid="welcome-badge-new"
          className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/85 px-4 py-1.5 text-xs font-semibold text-ink/80 shadow-pill backdrop-blur-sm dark:border-white/15 dark:bg-[#1A162B]/90 dark:text-violet-100 sm:text-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
          <span>{t.welcomeNew}</span>
        </div>
      )}
    </motion.div>
  );
}
