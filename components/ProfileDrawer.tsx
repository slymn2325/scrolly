'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  ExternalLink,
  Flame,
  Heart,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';
import { type FactCard, getFactUrl } from '@/utils/factsData';
import type { UserMemoryState } from '@/utils/userMemory';

interface ProfileDrawerProps {
  open: boolean;
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  onClose: () => void;
  onResetMemory: () => void;
  onButtonPop: () => void;
}

export default function ProfileDrawer({
  open,
  lang,
  memory,
  allFacts,
  onClose,
  onResetMemory,
  onButtonPop,
}: ProfileDrawerProps) {
  const [justReset, setJustReset] = useState(false);
  const t = translations[lang];

  const favoriteFacts = allFacts.filter((f) => memory.favoriteIds.includes(f.id));
  const categoryList = CATEGORIES.filter((c) => c.id !== 'all');
  const maxWeight = Math.max(
    1,
    ...categoryList.map((c) => memory.categoryWeights[c.id as CategoryId] ?? 0)
  );

  const handleReset = () => {
    onButtonPop();
    onResetMemory();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 3000);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/35 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            data-testid="profile-drawer"
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FFFDF9] shadow-cozy-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="font-display text-xl font-bold text-ink">{t.drawerTitle}</h2>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                aria-label="Close drawer"
                className="rounded-full bg-slate-100 p-2 text-ink/60 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-violet-200 bg-pastel-lavender/60 p-4 text-center">
                  <p className="font-display text-3xl font-bold text-violet-800">
                    {memory.seenIds.length}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-violet-700/80">
                    {t.drawerDiscovered}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-pastel-sun/70 p-4 text-center">
                  <div className="flex items-center justify-center gap-1 font-display text-3xl font-bold text-amber-800">
                    <Flame className="h-6 w-6 fill-amber-500 text-amber-600" />
                    <span>{memory.streakDays}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-amber-800/80">{t.drawerStreak}</p>
                </div>
              </div>

              {memory.unlimitedRewindsUnlocked && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t.rewardedUnlockedBadge}</span>
                </div>
              )}

              {/* Earned Badges */}
              <section>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Award className="h-4 w-4 text-amber-600" />
                  {t.drawerBadges}
                </h3>
                {memory.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {memory.badges.map((catId) => {
                      const meta = getCategoryMeta(catId as CategoryId);
                      return (
                        <span
                          key={catId}
                          className={`inline-flex items-center gap-1.5 rounded-full border ${meta.borderClass} ${meta.bgClass} px-3 py-1.5 text-xs font-extrabold ${meta.accentText}`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.badge[lang]}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-3.5 text-xs font-medium text-ink/60">
                    {t.drawerNoBadges}
                  </p>
                )}
              </section>

              {/* Category Weights (+40% Algorithm Insight) */}
              <section>
                <h3 className="mb-2.5 text-sm font-extrabold text-ink">{t.drawerAffinity}</h3>
                <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  {categoryList.map((cat) => {
                    const weight = memory.categoryWeights[cat.id as CategoryId] ?? 0;
                    const pct = Math.round((weight / maxWeight) * 100);
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-ink/85">
                            <span>{cat.emoji}</span>
                            <span>{cat.label[lang]}</span>
                          </span>
                          <span className="text-ink/50">{weight}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            style={{ width: `${Math.max(4, pct)}%` }}
                            className={`h-full rounded-full ${cat.accentBg} transition-all duration-300`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Saved Favorites */}
              <section>
                <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  {t.drawerFavorites} ({favoriteFacts.length})
                </h3>
                {favoriteFacts.length > 0 ? (
                  <div className="space-y-2.5">
                    {favoriteFacts.map((fact) => {
                      const meta = getCategoryMeta(fact.category);
                      return (
                        <Link
                          key={fact.id}
                          href={getFactUrl(fact, lang)}
                          onClick={() => {
                            onButtonPop();
                            onClose();
                          }}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-colors hover:border-amber-200 hover:bg-amber-50/40"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl">{fact.emoji ?? '✨'}</span>
                            <div>
                              <span className={`text-[10px] font-extrabold uppercase ${meta.accentText}`}>
                                {meta.label[lang]}
                              </span>
                              <p className="text-xs font-bold leading-snug text-ink">
                                {fact[lang].title}
                              </p>
                            </div>
                          </div>
                          <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-ink/40" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-3.5 text-xs font-medium text-ink/60">
                    {t.drawerNoFavorites}
                  </p>
                )}
              </section>
            </div>

            {/* Footer Reset */}
            <div className="border-t border-amber-100 px-6 py-4">
              {justReset && (
                <p className="mb-2 text-center text-xs font-bold text-emerald-700">
                  {t.drawerResetConfirm}
                </p>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-2.5 text-xs font-bold text-ink/65 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t.drawerReset}</span>
              </motion.button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
