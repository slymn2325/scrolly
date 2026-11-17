'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import CardMediaStage from '@/components/CardMediaStage';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import FactIcon from '@/components/FactIcon';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { ENABLE_COMPETITIVE_TABS } from '@/lib/featureFlags';
import { trackEvent } from '@/lib/telemetry';
import type { FactCard } from '@/types/fact';
import { getFactUrl } from '@/utils/factsData';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { safeExternalHref } from '@/utils/phoneticDisplay';
import {
  buildFactDetailArticle,
  buildStructuredDetailHighlights,
} from '@/utils/topicMotif';

interface FactDetailPageProps {
  fact: FactCard;
  lang: Language;
  darkMode: boolean;
  resolvedGifUrl?: string | null;
  onClose: () => void;
  onNextCard: () => void;
  onOpenDuel: (fact: FactCard) => void;
  onButtonPop: () => void;
  onEarnXp?: (xp: number, source?: string) => void;
  onSuccessSound?: () => void;
  onWrongSound?: () => void;
}

/**
 * Full-page scientific insight, verified source, and quick comprehension check screen.
 * Replaces the old modal/portal detail sheet so everything operates as a full integrated page.
 */
export default function FactDetailPage({
  fact,
  lang,
  darkMode,
  resolvedGifUrl,
  onClose,
  onNextCard,
  onOpenDuel,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: FactDetailPageProps) {
  const [miniQuizChoice, setMiniQuizChoice] = useState<number | null>(null);
  const [miniQuizAwarded, setMiniQuizAwarded] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);

  useEffect(() => {
    setMiniQuizChoice(null);
    setMiniQuizAwarded(false);
    setGifFailed(false);
  }, [fact.id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const t = translations[lang];
  const localized = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const factUrl = getFactUrl(fact, lang);
  const factSlug = fact.slug || fact.en.slug || fact.tr.slug || fact.id;
  const effectiveGifUrl = resolvedGifUrl ?? fact.gifUrl ?? null;

  const detailArticle = useMemo(
    () =>
      buildFactDetailArticle(
        {
          factText: localized.factText,
          deepDiveDetail: localized.deepDiveDetail,
          tag: localized.tag,
          sourceHint: localized.sourceHint,
          quiz: localized.quiz,
        },
        lang
      ),
    [localized.factText, localized.deepDiveDetail, localized.tag, localized.sourceHint, localized.quiz, lang]
  );

  const detailHighlights = useMemo(
    () =>
      buildStructuredDetailHighlights(
        {
          factText: localized.factText,
          deepDiveDetail: localized.deepDiveDetail,
          tag: localized.tag,
          sourceHint: localized.sourceHint,
          quiz: localized.quiz,
        },
        lang
      ),
    [localized.factText, localized.deepDiveDetail, localized.tag, localized.sourceHint, localized.quiz, lang]
  );

  const resolvedSourceName =
    localized.sourceName || fact.sourceName || localized.sourceHint;
  const resolvedSourceUrl = safeExternalHref(localized.sourceUrl || fact.sourceUrl);

  return (
    <motion.div
      key={`detail-page-${fact.id}`}
      data-testid="fact-card-back"
      data-card-view="detail"
      data-presentation="page"
      data-theme={darkMode ? 'dark' : 'light'}
      initial={{ opacity: 0.96, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.01 } }}
      transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
      className={`backface-hidden absolute inset-0 z-30 flex h-full w-full flex-col overflow-hidden ${
        darkMode ? 'bg-[#111115] text-white' : 'bg-[#FFFDF9] text-[#1E1B2E]'
      }`}
    >
      {/* Top Page Bar */}
      <div
        className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-3 pt-[calc(env(safe-area-inset-top,14px)+14px)] lg:pt-4 ${
          darkMode ? 'border-white/10 bg-[#111115]' : 'border-[#1E1B2E]/10 bg-[#FFFDF9]'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onButtonPop();
            onClose();
          }}
          aria-label={t.tiktokBackFrontBtn}
          data-testid="detail-close-btn"
          className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-extrabold transition active:scale-95 ${
            darkMode
              ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
              : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E] hover:bg-slate-50'
          }`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>{lang === 'tr' ? 'Karta Dön' : 'Back to Card'}</span>
        </button>

        <div
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
            darkMode ? 'bg-white/10 text-white' : 'bg-[#1E1B2E]/[0.08] text-[#1E1B2E]'
          }`}
        >
          <img src={catMeta.iconPath} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
          <span>{t.whyHowHeader}</span>
        </div>
      </div>

      {/* Scrollable Page Content */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">
        <div className="flex-1 space-y-4">
          {/* Visual Hero Banner */}
          <div
            className="relative overflow-hidden rounded-2xl border p-4"
            style={{
              borderColor: `${fact.accentColor}40`,
              background: darkMode
                ? `linear-gradient(135deg, ${fact.accentColor}2A 0%, rgba(17,17,22,0.92) 100%)`
                : `linear-gradient(135deg, ${fact.accentColor}1C 0%, #FFFFFF 100%)`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                    style={{ backgroundColor: fact.accentColor || '#7C3AED' }}
                  >
                    <span>{fact.emoji || catMeta.emoji}</span>
                    <span>{detailHighlights.topicTag}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                      darkMode
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    <span>{fact.readingTimeSec || 18}s · +15 XP</span>
                  </span>
                </div>
                <h2 className="mt-2.5 font-display text-xl font-bold leading-snug whitespace-normal break-words">
                  {localized.title}
                </h2>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  darkMode
                    ? 'border-white/15 bg-black/35'
                    : 'border-[#1E1B2E]/10 bg-white shadow-sm'
                }`}
              >
                <FactIcon
                  name={fact.iconName}
                  className="h-6 w-6"
                  style={{ color: fact.accentColor || '#7C3AED' }}
                />
              </div>
            </div>

            {effectiveGifUrl && !gifFailed ? (
              <div className="relative mt-3 h-44 w-full overflow-hidden rounded-xl border border-white/15">
                <CardMediaStage
                  url={effectiveGifUrl}
                  posterUrl={fact.posterUrl}
                  mediaType={fact.mediaType}
                  mediaSource={fact.mediaSource}
                  isActive
                  showBadge={false}
                  title={localized.title}
                  failed={gifFailed}
                  onFailed={() => setGifFailed(true)}
                />
                <div className="absolute inset-0 z-[4] bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="mt-3">
                <CategoryMotionArt
                  variant="compact"
                  category={fact.category}
                  accentColor={fact.accentColor}
                  iconName={fact.iconName}
                  emoji={fact.emoji ?? catMeta.emoji}
                  lang={lang}
                  isActive
                />
              </div>
            )}
          </div>

          {/* Quick Takeaways Strip */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div
              className={`rounded-2xl border px-3.5 py-2.5 ${
                darkMode
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-[#1E1B2E]/10 bg-white'
              }`}
            >
              <p
                className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-violet-300' : 'text-violet-700'
                }`}
              >
                <img
                  src={UI_ICON_PATHS.target}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  decoding="async"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span>{lang === 'tr' ? 'Hızlı Özet' : 'Core Takeaway'}</span>
              </p>
              <p
                className={`mt-1 text-xs font-semibold leading-relaxed ${
                  darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                }`}
              >
                {localized.factText}
              </p>
            </div>
            <div
              className={`rounded-2xl border px-3.5 py-2.5 ${
                darkMode
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-[#1E1B2E]/10 bg-white'
              }`}
            >
              <p
                className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-sky-300' : 'text-sky-700'
                }`}
              >
                <img
                  src={UI_ICON_PATHS.microscope}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  decoding="async"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span>{lang === 'tr' ? 'Bilimsel Odak' : 'Focus Question'}</span>
              </p>
              <p
                className={`mt-1 text-xs font-semibold leading-relaxed ${
                  darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                }`}
              >
                {detailHighlights.curiosityHook}
              </p>
            </div>
          </div>

          {/* Scientific Deep-Dive Narrative */}
          <div
            className={`rounded-2xl border p-4 ${
              darkMode
                ? 'border-white/10 bg-white/[0.03]'
                : 'border-[#1E1B2E]/10 bg-white'
            }`}
          >
            <p
              className={`mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
              }`}
            >
              <img
                src={UI_ICON_PATHS.openBook}
                alt=""
                aria-hidden="true"
                width={14}
                height={14}
                decoding="async"
                className="h-3.5 w-3.5 shrink-0 object-contain"
              />
              <span>{lang === 'tr' ? 'Derinlemesine Bilim Analizi' : 'Deep-Dive Science'}</span>
            </p>
            <p
              data-testid="fact-detail-article"
              data-differs-from-teaser={detailArticle.differsFromTeaser ? 'true' : 'false'}
              className={`whitespace-pre-wrap text-[14.5px] leading-relaxed break-words ${
                darkMode ? 'text-white/90' : 'text-[#1E1B2E]/85'
              }`}
            >
              {detailArticle.article}
            </p>
          </div>

          {/* Engaging Key Insight & Curiosity Hook */}
          <div
            className={`rounded-2xl border p-3.5 ${
              darkMode
                ? 'border-amber-400/25 bg-amber-400/10'
                : 'border-amber-300 bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <img
                src={UI_ICON_PATHS.xpSparkles}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 object-contain"
              />
              <p
                className={`text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-amber-300' : 'text-amber-800'
                }`}
              >
                {lang === 'tr' ? 'Kilit Bilimsel İçgörü' : 'Key Scientific Insight'}
              </p>
            </div>
            <p
              className={`mt-1 text-xs font-bold leading-relaxed ${
                darkMode ? 'text-white/90' : 'text-[#1E1B2E]/90'
              }`}
            >
              {detailHighlights.keyInsight}
            </p>
          </div>

          {/* Interactive 1-Tap Comprehension Mini-Quiz (+15 XP) */}
          {localized.quiz && localized.quiz.options && localized.quiz.options.length >= 2 && (
            <div
              data-testid="detail-mini-quiz"
              className={`rounded-2xl border p-4 ${
                darkMode
                  ? 'border-violet-400/30 bg-violet-500/10'
                  : 'border-violet-200 bg-violet-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    darkMode ? 'text-violet-300' : 'text-violet-700'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Hızlı Kavrama Testi' : 'Quick Knowledge Check'}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    miniQuizChoice !== null && miniQuizChoice === localized.quiz.correctIndex
                      ? 'bg-emerald-500 text-white'
                      : darkMode
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {miniQuizChoice !== null && miniQuizChoice === localized.quiz.correctIndex
                    ? '+15 XP ✓'
                    : '+15 XP'}
                </span>
              </div>
              <p className="mt-2 text-xs font-extrabold leading-snug">
                {localized.quiz.question}
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-1.5">
                {localized.quiz.options.map((opt, idx) => {
                  const picked = miniQuizChoice === idx;
                  const answered = miniQuizChoice !== null;
                  const isCorrectOpt = idx === localized.quiz.correctIndex;
                  let optStyle = darkMode
                    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E] hover:bg-violet-50';
                  if (answered) {
                    if (isCorrectOpt) {
                      optStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-500 dark:text-emerald-200';
                    } else if (picked) {
                      optStyle = 'border-rose-500 bg-rose-500/20 text-rose-500 dark:text-rose-200';
                    } else {
                      optStyle = darkMode
                        ? 'border-white/10 bg-white/[0.02] text-white/45'
                        : 'border-[#1E1B2E]/10 bg-white/50 text-[#1E1B2E]/45';
                    }
                  }
                  return (
                    <button
                      key={`${fact.id}-dq-${idx}`}
                      type="button"
                      data-testid={`detail-quiz-opt-${idx}`}
                      disabled={answered}
                      onClick={() => {
                        if (miniQuizChoice !== null) return;
                        onButtonPop();
                        setMiniQuizChoice(idx);
                        const right = idx === localized.quiz.correctIndex;
                        if (right) {
                          onSuccessSound?.();
                          if (!miniQuizAwarded) {
                            setMiniQuizAwarded(true);
                            onEarnXp?.(15, 'detail_mini_quiz');
                          }
                        } else {
                          onWrongSound?.();
                        }
                      }}
                      className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition active:scale-[0.99] ${optStyle}`}
                    >
                      <span className="whitespace-normal break-words leading-snug">{opt}</span>
                      {answered && isCorrectOpt && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {miniQuizChoice !== null && localized.quiz.explanation && (
                <p
                  className={`mt-2.5 text-[11px] font-semibold leading-relaxed ${
                    darkMode ? 'text-white/80' : 'text-[#1E1B2E]/80'
                  }`}
                >
                  {localized.quiz.explanation}
                </p>
              )}
            </div>
          )}

          {/* Scrolla 1v1 Quick Duel Banner */}
          {ENABLE_COMPETITIVE_TABS && (
            <button
              type="button"
              onClick={() => {
                onButtonPop();
                void trackEvent(factSlug, fact.category, 'duel');
                onOpenDuel(fact);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 px-4 py-3 text-left text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-100">
                  Scrolla 1v1
                </p>
                <p className="text-xs font-extrabold">
                  {lang === 'tr'
                    ? 'Bu bilgiyle arkadaşını 1v1 düelloya davet et!'
                    : 'Challenge a friend in a Scrolla 1v1 duel!'}
                </p>
              </div>
              <Swords className="h-5 w-5 shrink-0" />
            </button>
          )}

          {/* Verified Source Attribution */}
          <div
            data-testid="fact-source-box"
            className={`flex flex-col gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
              darkMode
                ? 'border-white/15 bg-white/5'
                : 'border-[#1E1B2E]/[0.12] bg-white'
            }`}
          >
            <div className={`flex items-start gap-2 font-bold ${darkMode ? 'text-white/90' : 'text-[#1E1B2E]'}`}>
              <BookOpen className={`mt-0.5 h-4 w-4 shrink-0 ${darkMode ? 'text-violet-300' : 'text-violet-600'}`} />
              <div className="min-w-0 flex-1">
                <span
                  lang={lang}
                  className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    darkMode ? 'text-white/60' : 'text-[#1E1B2E]/55'
                  }`}
                >
                  <img
                    src={UI_ICON_PATHS.verifiedSeal}
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span>{t.sourceLabel}</span>
                </span>
                <span data-testid="fact-source-name" className="mt-0.5 block text-xs font-extrabold whitespace-normal break-words">
                  {resolvedSourceName}
                </span>
              </div>
            </div>
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-t pt-2 ${
                darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
              }`}
            >
              {resolvedSourceUrl ? (
                <a
                  href={resolvedSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="fact-source-link"
                  className={`inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${
                    darkMode
                      ? 'bg-violet-500/25 text-violet-100'
                      : 'bg-violet-100 text-violet-800'
                  }`}
                >
                  <span>{t.verifySourceCta}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className={`text-[11px] font-semibold ${darkMode ? 'text-white/70' : 'text-[#1E1B2E]/65'}`}>
                  {localized.sourceHint}
                </span>
              )}
              <Link
                href={factUrl}
                className={`inline-flex min-h-[36px] items-center gap-1 font-extrabold hover:underline ${
                  darkMode ? 'text-white/80' : 'text-[#1E1B2E]/75'
                }`}
              >
                <span>{t.readFullPage}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
            </div>
            {effectiveGifUrl && !gifFailed && (
              <div
                className={`flex items-center justify-between gap-2 border-t pt-2 ${
                  darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
                  }`}
                >
                  {lang === 'tr' ? 'Görsel GIF Kaynağı' : 'GIF Media Attribution'}
                </span>
                <PoweredByGiphyBadge compact lang={lang} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Full-Page Footer Controls */}
      <div
        className={`flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:px-5 ${
          darkMode
            ? 'border-white/10 bg-[#111115]'
            : 'border-[#1E1B2E]/10 bg-[#FFFDF9]'
        }`}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onClose();
          }}
          data-testid="flip-back-btn"
          className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-extrabold ${
            darkMode
              ? 'border-white/15 bg-white/10 text-white'
              : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
          }`}
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span>{lang === 'tr' ? 'Karta Dön' : 'Back to Card'}</span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            onButtonPop();
            onNextCard();
          }}
          data-testid="next-card-btn"
          className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-extrabold ${
            darkMode
              ? 'bg-white text-[#09090B]'
              : 'bg-[#1E1B2E] text-white'
          }`}
        >
          <span>{lang === 'tr' ? 'Sonraki Bilgiye Kaydır' : t.tiktokNextSlideBtn}</span>
          <ArrowDown className="h-4 w-4 shrink-0" />
        </motion.button>
      </div>
    </motion.div>
  );
}
