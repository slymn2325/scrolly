'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  MessageCircle,
  Play,
  Share2,
  Swords,
  X,
} from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { encodeDuelPayload } from '@/utils/duelCodec';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';

export interface DuelChallengeConfig {
  factIds: string[];
  challengerName: string;
  targetScore: number;
  targetTimeSec?: number;
}

interface DuelModalProps {
  open: boolean;
  lang: Language;
  defaultNickname?: string;
  seedFact: FactCard;
  allFacts: FactCard[];
  onStartDuel: (config: DuelChallengeConfig) => void;
  onClose: () => void;
  onButtonPop: () => void;
}

export default function DuelModal({
  open,
  lang,
  defaultNickname,
  seedFact,
  allFacts,
  onStartDuel,
  onClose,
  onButtonPop,
}: DuelModalProps) {
  const t = translations[lang];
  const [nickname, setNickname] = useState<string>(defaultNickname || t.duelDefaultName);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && defaultNickname) {
      setNickname(defaultNickname);
    }
  }, [open, defaultNickname]);

  // Pack 5 unique cardIds starting with the selected seedFact
  const duelFactIds = useMemo(() => {
    const others = allFacts.filter((f) => f.id !== seedFact.id);
    const sameCat = others.filter((f) => f.category === seedFact.category);
    const diffCat = others.filter((f) => f.category !== seedFact.category);
    const pool = [...sameCat, ...diffCat];
    const picked = [seedFact.id];
    for (const item of pool) {
      if (!picked.includes(item.id)) picked.push(item.id);
      if (picked.length >= 5) break;
    }
    return picked;
  }, [allFacts, seedFact]);

  const targetScore = 460;
  const targetTimeSec = 28;

  const duelUrl = useMemo(() => {
    const cleanName = (nickname || t.duelDefaultName).trim().slice(0, 24);
    const code = encodeDuelPayload({
      cardIds: duelFactIds,
      score: targetScore,
      timeSec: targetTimeSec,
      name: cleanName,
      mode: 'duel',
    });
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    return `${origin}/?duel=${code}`;
  }, [duelFactIds, nickname, t.duelDefaultName]);

  const handleCopyDuel = async () => {
    onButtonPop();
    try {
      await navigator.clipboard.writeText(duelUrl);
    } catch {
      // Ignore clipboard failure
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const challengeText =
    lang === 'tr'
      ? `⚔️ ${nickname || t.duelDefaultName} sana Scrolly'de 1v1 Düello gönderdi! 5 soruda ${targetScore} Puanı (${targetTimeSec} sn) geçebilir misin?\n${duelUrl}`
      : `⚔️ ${nickname || t.duelDefaultName} challenged you to a 1v1 Scrolly Duel! Can you beat ${targetScore} pts (${targetTimeSec}s) across 5 questions?\n${duelUrl}`;

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.duelTitle}
          data-testid="duel-modal"
          className="fixed inset-0 z-50 flex w-full items-center justify-center bg-ink/55 px-3 pt-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative mb-[92px] max-h-[84dvh] w-full max-w-[430px] md:max-w-2xl overflow-y-auto no-scrollbar rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/50 dark:bg-[#1A162B] sm:p-6"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              aria-label="Close"
              data-testid="duel-close-btn"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/60 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-200"
            >
              <X className="h-4 w-4" />
            </motion.button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200/80 to-rose-200/80 p-1.5 shadow-sm dark:from-amber-500/20 dark:to-rose-500/20">
                <img
                  src={STATE_ILLUSTRATION_PATHS.duelArena}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain drop-shadow-sm"
                />
              </div>
              <div className="min-w-0 pr-8">
                <h2 className="font-display text-xl font-bold text-ink dark:text-white">
                  {t.duelTitle}
                </h2>
                <p className="text-xs font-semibold text-ink/60 dark:text-violet-200/70 whitespace-normal break-words leading-snug">
                  {seedFact.emoji ?? '⚔️'} {seedFact[lang].title}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink/75 dark:text-violet-100/80 sm:text-sm">
              {t.duelSubtitle}
            </p>

            {/* Nickname Input */}
            <div className="mt-4">
              <label
                htmlFor="duel-nickname-input"
                className="block text-xs font-extrabold text-ink/75 dark:text-violet-200"
              >
                {t.duelNameLabel}
              </label>
              <input
                id="duel-nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                className="mt-1.5 w-full rounded-2xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-bold text-ink outline-none focus:border-violet-500 dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>

            {/* Generated URL-safe Base64 Duel Link Box */}
            <div className="mt-3 rounded-2xl border border-violet-200 bg-pastel-lavender/40 p-3 dark:border-violet-700/50 dark:bg-violet-950/40">
              <p
                data-testid="duel-link-preview"
                className="truncate font-mono text-[11px] font-semibold text-violet-900 dark:text-violet-200"
              >
                {duelUrl}
              </p>
            </div>

            {/* Share & Play Controls */}
            <div className="mt-4 flex flex-col gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={handleCopyDuel}
                data-testid="copy-duel-link-btn"
                className={`flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors whitespace-normal break-words leading-snug ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'border-2 border-ink bg-white text-ink hover:bg-slate-50 dark:border-violet-400 dark:bg-white/10 dark:text-white'
                }`}
              >
                {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                <span>{copied ? t.duelLinkCopied : t.duelCopyLinkBtn}</span>
              </motion.button>

              <div className="grid grid-cols-2 gap-2.5">
                <motion.a
                  href={`https://wa.me/?text=${encodeURIComponent(challengeText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.94 }}
                  onClick={onButtonPop}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-3 py-2.5 text-center text-xs font-extrabold text-white whitespace-normal break-words leading-snug"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span>{t.duelShareWhatsapp}</span>
                </motion.a>
                <motion.a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(challengeText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.94 }}
                  onClick={onButtonPop}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-[#111827] px-3 py-2.5 text-center text-xs font-extrabold text-white whitespace-normal break-words leading-snug"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span>{t.duelShareX}</span>
                </motion.a>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onButtonPop();
                  onStartDuel({
                    factIds: duelFactIds,
                    challengerName: nickname || t.duelDefaultName,
                    targetScore,
                    targetTimeSec,
                  });
                }}
                data-testid="start-duel-btn"
                className="mt-1 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-cozy whitespace-normal break-words leading-snug"
              >
                <Play className="h-4 w-4 shrink-0 fill-current" />
                <span>{t.duelStartBtn}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
