'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Brain,
  Flame,
  Moon,
  Sparkles,
  Sun,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import PwaManager from '@/components/PwaManager';
import {
  CATEGORIES,
  type CategoryFilter,
  type Language,
  translations,
} from '@/i18n/translations';
import { getLeagueInfo } from '@/utils/userMemory';

interface NavbarProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onOpenDuel: () => void;
  onTriggerMiniQuiz: () => void;
  cardsSinceLastQuiz: number;
  streakDays: number;
  xp: number;
  badgeCount: number;
  favoriteCount: number;
}

export default function Navbar({
  lang,
  onChangeLang,
  darkMode,
  onToggleDarkMode,
  activeCategory,
  onSelectCategory,
  soundEnabled,
  onToggleSound,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenDuel,
  onTriggerMiniQuiz,
  cardsSinceLastQuiz,
  streakDays,
  xp,
  badgeCount,
  favoriteCount,
}: NavbarProps) {
  const t = translations[lang];
  const quizProgress = Math.min(5, cardsSinceLastQuiz);
  const isQuizReady = quizProgress >= 5;
  const league = getLeagueInfo(xp, lang);

  return (
    <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-[#FFFDF9]/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0F0D1A]/90">
      <div className="mx-auto max-w-4xl px-4 pt-3 pb-2.5">
        {/* Top Row: Brand + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 text-ink shadow-pill"
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display text-lg font-bold tracking-tight text-ink dark:text-white sm:text-xl">
                  {t.brandName}
                </span>
                <span
                  title={`${streakDays} ${t.streakLabel}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                >
                  <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
                  {streakDays}
                </span>
                <PwaManager lang={lang} />
              </div>
              <p className="hidden text-[11px] font-medium text-ink/55 dark:text-violet-200/60 sm:block">
                {t.brandTagline}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Live League / Leaderboard Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenLeaderboard}
              data-testid="leaderboard-btn"
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-extrabold shadow-pill ${league.colorClass}`}
            >
              <span>{league.emoji}</span>
              <span>{xp} XP</span>
            </motion.button>

            {/* 1v1 Duel Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenDuel}
              data-testid="duel-btn"
              title={t.duelBtn}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-pastel-coral px-2.5 py-1.5 text-xs font-extrabold text-rose-900 shadow-pill hover:bg-rose-100 dark:border-rose-700/50 dark:bg-rose-950/60 dark:text-rose-200"
            >
              <Swords className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t.duelBtn}</span>
            </motion.button>

            {/* Mini Quiz Trigger Button */}
            <motion.button
              type="button"
              onClick={onTriggerMiniQuiz}
              whileTap={{ scale: 0.94 }}
              animate={isQuizReady ? { scale: [1, 1.04, 1] } : undefined}
              transition={isQuizReady ? { repeat: Infinity, duration: 2 } : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-pill transition-colors sm:text-sm ${
                isQuizReady
                  ? 'bg-violet-600 text-white ring-2 ring-violet-300'
                  : 'border border-violet-200 bg-pastel-lavender text-violet-800 hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-950/70 dark:text-violet-200'
              }`}
              data-testid="mini-quiz-btn"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">{t.miniQuizBtn}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                  isQuizReady
                    ? 'bg-white/25 text-white'
                    : 'bg-white text-violet-700 dark:bg-white/15 dark:text-violet-100'
                }`}
              >
                {quizProgress}/5
              </span>
            </motion.button>

            {/* TR | EN Language Switcher Pill */}
            <div
              role="group"
              aria-label="Language Switcher"
              className="inline-flex items-center rounded-full border border-amber-200/80 bg-white p-0.5 shadow-pill dark:border-white/15 dark:bg-white/10"
            >
              {(['tr', 'en'] as Language[]).map((code) => {
                const active = lang === code;
                return (
                  <motion.button
                    key={code}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onChangeLang(code)}
                    data-testid={`lang-btn-${code}`}
                    className={`relative rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-ink/60 hover:text-ink dark:text-violet-200/70 dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="lang-pill-active"
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        className="absolute inset-0 rounded-full bg-ink dark:bg-violet-600"
                      />
                    )}
                    <span className="relative z-10">{code.toUpperCase()}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Night Mode (Gece Modu) Toggle */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleDarkMode}
              aria-label={darkMode ? t.lightModeOn : t.darkModeOn}
              title={darkMode ? t.lightModeOn : t.darkModeOn}
              data-testid="theme-toggle-btn"
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-pill transition-colors ${
                darkMode
                  ? 'border-amber-500/50 bg-amber-950/60 text-amber-300'
                  : 'border-violet-200 bg-pastel-lavender text-violet-800'
              }`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.button>

            {/* Sound Toggle Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleSound}
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
              title={soundEnabled ? t.soundOn : t.soundOff}
              data-testid="sound-toggle-btn"
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-pill transition-colors ${
                soundEnabled
                  ? 'border-teal-200 bg-pastel-mint text-teal-800 dark:border-teal-700/50 dark:bg-teal-950/60 dark:text-teal-300'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-white/15 dark:bg-white/5'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </motion.button>

            {/* Collection / Profile Drawer Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onOpenProfile}
              aria-label={t.collectionTitle}
              title={t.collectionTitle}
              data-testid="profile-drawer-btn"
              className="relative flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-pastel-sun px-3 text-xs font-bold text-amber-900 shadow-pill hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-200"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{favoriteCount + badgeCount}</span>
            </motion.button>
          </div>
        </div>

        {/* Horizontally Scrollable Category Filters */}
        <nav
          aria-label="Categories"
          className="no-scrollbar -mx-1 mt-2.5 flex items-center gap-2 overflow-x-auto px-1 pb-1"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onSelectCategory(cat.id)}
                data-testid={`cat-filter-${cat.id}`}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all sm:text-sm ${
                  isSelected
                    ? `${cat.bgClass} ${cat.borderClass} ${cat.accentText} ring-2 ${cat.ringClass} shadow-sm`
                    : 'border-slate-200/80 bg-white/90 text-ink/70 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-violet-200/80 dark:hover:bg-white/10'
                }`}
              >
                <span aria-hidden="true">{cat.emoji}</span>
                <span>{cat.label[lang]}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
