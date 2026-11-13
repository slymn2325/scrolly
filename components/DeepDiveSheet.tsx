'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  Heart,
  Microscope,
  X,
  XCircle,
} from 'lucide-react';
import FactIcon from '@/components/FactIcon';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { type FactCard, getFactUrl } from '@/utils/factsData';
import { prepareQuizOptions } from '@/utils/recommendation';

interface DeepDiveSheetProps {
  open: boolean;
  fact: FactCard;
  lang: Language;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onAnswerSound: (isCorrect: boolean) => void;
  onButtonPop: () => void;
}

export default function DeepDiveSheet({
  open,
  fact,
  lang,
  isFavorite,
  onClose,
  onToggleFavorite,
  onAnswerSound,
  onButtonPop,
}: DeepDiveSheetProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const t = translations[lang];
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const factUrl = getFactUrl(fact, lang);

  const preparedQuiz = useMemo(
    () => prepareQuizOptions(content.quiz, `${fact.id}-${lang}-sheet`),
    [content.quiz, fact.id, lang]
  );

  const hasAnswered = selectedOption !== null;
  const isCorrect = hasAnswered && selectedOption === preparedQuiz.correctIndex;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 420) {
      onClose();
    }
  };

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    onAnswerSound(idx === preparedQuiz.correctIndex);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet / Modal */}
          <motion.section
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.45 }}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-label={t.deepDiveBtn}
            data-testid="deep-dive-sheet"
            className="relative z-10 flex max-h-[88vh] w-full max-w-xl flex-col rounded-t-3xl border-t-2 border-amber-200 bg-[#FFFDF9] shadow-cozy-lg sm:rounded-3xl sm:border-2"
          >
            {/* Drag Handle */}
            <div className="flex flex-col items-center pt-3 pb-1">
              <span className="h-1.5 w-12 rounded-full bg-ink/15" />
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                {t.sheetCloseHint}
              </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-5 py-3 sm:px-6">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: `${fact.accentColor}1A`, color: fact.accentColor }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                >
                  <FactIcon name={fact.iconName} className="h-5 w-5" />
                </div>
                <div>
                  <span className={`text-[11px] font-extrabold uppercase ${catMeta.accentText}`}>
                    {catMeta.emoji} {catMeta.label[lang]}
                  </span>
                  <p className="text-xs font-bold text-ink/55">{t.sheetSubtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? t.favorited : t.favorite}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                    isFavorite
                      ? 'border-rose-300 bg-rose-500 text-white'
                      : 'border-slate-200 bg-white text-ink/50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={onClose}
                  aria-label="Close"
                  data-testid="deep-dive-close-btn"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink/60 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable Deep Dive Body */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <h2 className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                  {fact.emoji ? `${fact.emoji} ` : ''}
                  {content.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink/75 sm:text-base">
                  {content.factText}
                </p>
              </div>

              {/* Scientific Detail */}
              <div className={`rounded-2xl border ${catMeta.borderClass} ${catMeta.bgClass}/60 p-4`}>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/80">
                  <Microscope className="h-4 w-4 text-violet-600" />
                  <span>{t.whyHowHeader}</span>
                </div>
                <p className="text-sm leading-relaxed text-ink/85 sm:text-base">
                  {content.deepDiveDetail}
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-2.5 text-xs font-semibold text-ink/65">
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    <strong>{t.sourceLabel}:</strong> {content.sourceHint}
                  </span>
                </div>
              </div>

              {/* Quick Interactive Check */}
              <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-700">
                  <Brain className="h-4 w-4" />
                  <span>{t.seoMiniQuizTitle}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-ink">{content.quiz.question}</p>

                <div className="mt-3 flex flex-col gap-2">
                  {preparedQuiz.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isRight = idx === preparedQuiz.correctIndex;
                    let cls =
                      'border-slate-200 bg-slate-50 text-ink hover:border-violet-300';
                    if (hasAnswered) {
                      if (isRight) cls = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold';
                      else if (isSelected) cls = 'border-rose-400 bg-rose-50 text-rose-900';
                      else cls = 'border-slate-100 bg-slate-50/40 text-ink/45';
                    }
                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        whileTap={!hasAnswered ? { scale: 0.97 } : undefined}
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(idx)}
                        className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-xs font-semibold transition-colors sm:text-sm ${cls}`}
                      >
                        <span>{opt}</span>
                        {hasAnswered && isRight && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                        {hasAnswered && isSelected && !isRight && (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {hasAnswered && content.quiz.explanation && (
                  <p
                    className={`mt-2.5 rounded-xl p-2.5 text-xs font-semibold ${
                      isCorrect
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {content.quiz.explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Link */}
            <div className="flex items-center justify-between gap-3 border-t border-amber-100 px-5 py-3.5 sm:px-6">
              <Link
                href={factUrl}
                onClick={onButtonPop}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-ink/75 hover:bg-slate-50"
              >
                <span>{t.readFullPage}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                className="rounded-full bg-ink px-5 py-2 text-xs font-extrabold text-white"
              >
                {t.cookieAccept}
              </motion.button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
