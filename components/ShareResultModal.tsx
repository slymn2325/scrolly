'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Award,
  Check,
  Clock,
  Copy,
  MessageCircle,
  Share2,
  Swords,
  X,
} from 'lucide-react';
import type { DuelChallengeConfig } from '@/components/DuelModal';
import {
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
} from '@/i18n/translations';
import { encodeDuelPayload } from '@/utils/duelCodec';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';

interface ShareResultModalProps {
  lang: Language;
  results: boolean[];
  badgeCategory: CategoryId;
  earnedXp: number;
  elapsedSec?: number;
  challengerNickname?: string;
  questionIds?: string[];
  duelConfig?: DuelChallengeConfig | null;
  onButtonPop: () => void;
  onClose: () => void;
}

export default function ShareResultModal({
  lang,
  results,
  badgeCategory,
  earnedXp,
  elapsedSec = 24,
  challengerNickname = 'Merak Avcısı',
  questionIds = [],
  duelConfig,
  onButtonPop,
  onClose,
}: ShareResultModalProps) {
  const [copied, setCopied] = useState(false);
  const [duelCopied, setDuelCopied] = useState(false);
  const t = translations[lang];

  const correctCount = results.filter(Boolean).length;
  const totalCount = results.length;
  const wordleGrid = results.map((ok) => (ok ? '🟩' : '🟥')).join('');
  const catMeta = getCategoryMeta(badgeCategory);
  const badgeLabel =
    lang === 'tr' ? `${catMeta.badge.tr} Rozeti` : `${catMeta.badge.en} Badge`;

  const duelWon = duelConfig ? earnedXp > duelConfig.targetScore : false;
  const duelTie = duelConfig ? earnedXp === duelConfig.targetScore : false;

  const scoreWord = lang === 'tr' ? 'Puan' : 'Pts';
  const shareSummaryLine = `🧠 ${t.brandName}: ${earnedXp} ${scoreWord} • ${wordleGrid} • ${catMeta.emoji} ${badgeLabel}`;
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
  const fullShareText = `${shareSummaryLine}\n${t.shareChallengeText}\n${siteUrl}`;

  const duelShareUrl = useMemo(() => {
    const code = encodeDuelPayload({
      cardIds: questionIds.slice(0, 5),
      score: earnedXp,
      timeSec: elapsedSec,
      name: challengerNickname,
      mode: 'duel',
    });
    return `${siteUrl}/?duel=${code}`;
  }, [questionIds, earnedXp, elapsedSec, challengerNickname, siteUrl]);

  useEffect(() => {
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#A78BFA', '#34D399', '#FBBF24', '#FB7185', '#38BDF8'],
      });
    } catch {
      // Ignore confetti errors in headless environments
    }
  }, []);

  const handleCopy = async () => {
    onButtonPop();
    try {
      await navigator.clipboard.writeText(fullShareText);
    } catch {
      // Ignore clipboard error
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyDuelFromResult = async () => {
    onButtonPop();
    try {
      await navigator.clipboard.writeText(duelShareUrl);
    } catch {
      // Ignore clipboard error
    }
    setDuelCopied(true);
    setTimeout(() => setDuelCopied(false), 2500);
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      data-testid="share-result-modal"
      className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="relative mb-[92px] max-h-[84dvh] w-full overflow-y-auto no-scrollbar rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/60 dark:bg-[#1A162B] sm:p-6"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onClose();
          }}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/55 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-200"
        >
          <X className="h-4 w-4" />
        </motion.button>

        {/* Celebration Header */}
        <div className="text-center">
          <div className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/80 via-rose-200/80 to-violet-200/80 p-2 shadow-sm dark:from-amber-500/20 dark:via-rose-500/20 dark:to-violet-500/20">
            <img
              src={
                duelConfig
                  ? STATE_ILLUSTRATION_PATHS.duelArena
                  : STATE_ILLUSTRATION_PATHS.quizCelebration
              }
              alt=""
              aria-hidden="true"
              className="h-12 w-12 object-contain drop-shadow-md"
            />
          </div>
          <h2
            id="share-modal-title"
            className="font-display text-2xl font-bold text-ink dark:text-white"
          >
            {duelConfig
              ? duelWon
                ? t.duelWonTitle
                : duelTie
                ? t.duelTieTitle
                : t.duelLostTitle
              : t.shareModalTitle}
          </h2>
          <p className="mt-1 text-sm font-medium text-ink/60 dark:text-violet-200/80">
            {t.shareModalScoreLabel}:{' '}
            <strong className="text-violet-700 dark:text-violet-300">
              {correctCount}/{totalCount}
            </strong>{' '}
            •{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">
              +{earnedXp} XP
            </strong>
          </p>
        </div>

        {/* VS Side-by-Side Comparison Card when playing a 1v1 Duel */}
        {duelConfig && (
          <div
            data-testid="duel-vs-card"
            className="mt-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-white to-rose-50 p-3.5 shadow-sm dark:border-amber-600/60 dark:from-amber-950/40 dark:via-[#231D3A] dark:to-rose-950/40"
          >
            <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              ⚔️ {t.vsComparisonTitle}
            </p>
            <div className="grid grid-cols-3 items-center gap-2 text-center">
              <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-white/10">
                <p className="truncate text-[10px] font-bold text-ink/60 dark:text-violet-200">
                  {t.yourResult}
                </p>
                <p className="mt-0.5 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {earnedXp}
                </p>
                <p className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ink/60 dark:text-violet-200/80">
                  <Clock className="h-3 w-3" /> {elapsedSec}s
                </p>
              </div>

              <div className="font-display text-lg font-black text-rose-500">VS</div>

              <div className="rounded-xl bg-white/90 p-2.5 shadow-sm dark:bg-white/10">
                <p className="truncate text-[10px] font-bold text-ink/60 dark:text-violet-200">
                  {duelConfig.challengerName}
                </p>
                <p className="mt-0.5 text-lg font-black text-violet-700 dark:text-violet-300">
                  {duelConfig.targetScore}
                </p>
                <p className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ink/60 dark:text-violet-200/80">
                  <Clock className="h-3 w-3" /> {duelConfig.targetTimeSec ?? 28}s
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wordle-Style Shareable Result Box */}
        <div
          data-testid="wordle-share-card"
          className="mt-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-pastel-lavender/60 via-white to-pastel-mint/60 p-4 text-center shadow-sm dark:border-violet-700/60 dark:from-violet-950/60 dark:via-[#221C38] dark:to-teal-950/50"
        >
          <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            {t.shareCardHeader}
          </p>

          <div className="my-2.5 flex flex-wrap items-center justify-center gap-1.5 text-2xl tracking-widest">
            {results.map((ok, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.06 + idx * 0.07, type: 'spring', stiffness: 360 }}
              >
                {ok ? '🟩' : '🟥'}
              </motion.span>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-pastel-sun px-3 py-1 text-xs font-extrabold text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/50 dark:text-amber-200">
            <Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            <span>
              {catMeta.emoji} {badgeLabel}
            </span>
          </div>

          <p
            data-testid="share-summary-text"
            className="mt-2.5 select-all rounded-xl bg-white/90 px-3 py-2 font-mono text-[11px] font-semibold text-ink/80 dark:bg-black/30 dark:text-violet-100"
          >
            {shareSummaryLine}
          </p>
        </div>

        {/* One-Click Sharing + 1v1 Duel Challenge Generator */}
        <div className="mt-4 flex flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleCopy}
            data-testid="copy-result-btn"
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-pill transition-colors sm:text-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'border-2 border-ink bg-white text-ink hover:bg-slate-50 dark:border-violet-400 dark:bg-white/10 dark:text-white'
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? t.shareCopiedBtn : t.shareCopyBtn}</span>
          </motion.button>

          {questionIds.length > 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleCopyDuelFromResult}
              data-testid="copy-duel-from-result-btn"
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-colors ${
                duelCopied
                  ? 'bg-emerald-600 text-white'
                  : 'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-200'
              }`}
            >
              <Swords className="h-4 w-4" />
              <span>{duelCopied ? t.duelLinkCopied : t.duelCopyLinkBtn}</span>
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.94 }}
              onClick={onButtonPop}
              data-testid="share-whatsapp-btn"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-2.5 text-xs font-extrabold text-white shadow-pill hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{t.shareWhatsAppBtn}</span>
            </motion.a>

            <motion.a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.94 }}
              onClick={onButtonPop}
              data-testid="share-x-btn"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#111827] px-3 py-2.5 text-xs font-extrabold text-white shadow-pill hover:bg-black"
            >
              <Share2 className="h-4 w-4" />
              <span>{t.shareXBtn}</span>
            </motion.a>
          </div>
        </div>

        {/* Continue Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onClose();
          }}
          data-testid="share-continue-btn"
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 py-3 text-sm font-extrabold text-white shadow-cozy hover:bg-violet-700"
        >
          <span>{t.shareContinueBtn}</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}
