'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import CardMediaStage from '@/components/CardMediaStage';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import FactIcon from '@/components/FactIcon';
import MediaAttributionBadge from '@/components/MediaAttributionBadge';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { UI_ICON_PATHS } from '@/utils/fluentAssets';
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
  onOpenDuel: _onOpenDuel,
  onButtonPop,
  onEarnXp,
  onSuccessSound,
  onWrongSound,
}: FactDetailPageProps) {
  const [miniQuizChoice, setMiniQuizChoice] = useState<number | null>(null);
  const [miniQuizAwarded, setMiniQuizAwarded] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const startedOnHeaderRef = useRef(false);

  useEffect(() => {
    setMiniQuizChoice(null);
    setMiniQuizAwarded(false);
    setGifFailed(false);
    setDragY(0);
    setIsTouchDragging(false);
    touchStartYRef.current = null;
    startedOnHeaderRef.current = false;
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

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const target = event.target as HTMLElement | null;
    const fromHeader = Boolean(target?.closest('[data-detail-drag-handle="true"]'));
    const scrollTop = scrollBodyRef.current?.scrollTop ?? 0;
    if (!fromHeader && scrollTop > 0) return;
    touchStartYRef.current = event.touches[0].clientY;
    startedOnHeaderRef.current = fromHeader;
    setIsTouchDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null || event.touches.length !== 1) return;
    const deltaY = event.touches[0].clientY - touchStartYRef.current;
    const scrollTop = scrollBodyRef.current?.scrollTop ?? 0;
    if (deltaY <= 0) {
      setDragY(0);
      if (!startedOnHeaderRef.current && deltaY < -8) {
        touchStartYRef.current = null;
        setIsTouchDragging(false);
      }
      return;
    }
    if (!startedOnHeaderRef.current && scrollTop > 0) {
      touchStartYRef.current = null;
      setDragY(0);
      setIsTouchDragging(false);
      return;
    }
    setDragY(Math.min(deltaY, 280));
  };

  const handleTouchEnd = () => {
    if (touchStartYRef.current === null) return;
    const shouldClose = dragY > 70;
    touchStartYRef.current = null;
    startedOnHeaderRef.current = false;
    setIsTouchDragging(false);
    setDragY(0);
    if (shouldClose) {
      onButtonPop();
      onClose();
    }
  };

  return (
    <motion.div
      key={`detail-page-${fact.id}`}
      data-testid="fact-card-back"
      data-card-view="detail"
      data-presentation="page"
      data-theme={darkMode ? 'dark' : 'light'}
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      initial={{ opacity: 0.96, y: 8 }}
      animate={{ opacity: 1, y: dragY }}
      exit={{ opacity: 0, transition: { duration: 0.01 } }}
      transition={isTouchDragging ? { duration: 0 } : { duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
      className="relative z-hud flex h-full w-full flex-col overflow-hidden bg-cik-bg text-cik-text outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
    >
      {/* Top Page Bar */}
      <div
        data-detail-drag-handle="true"
        className={`flex shrink-0 flex-col border-b px-4 pb-3 pt-[calc(env(safe-area-inset-top,14px)+8px)] lg:pt-4 ${
          darkMode ? 'border-cik-line bg-cik-pink' : 'border-cik-line bg-cik-pink'
        }`}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-2 h-1 w-9 rounded-pill bg-cik-line lg:hidden"
        />
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onButtonPop();
              onClose();
            }}
            aria-label={t.tiktokBackFrontBtn}
            data-testid="detail-close-btn"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-3.5 text-xs font-extrabold text-cik-text"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{lang === 'tr' ? 'Karta Dön' : 'Back to Card'}</span>
          </button>

          <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-pill bg-cik-bg px-3 py-1.5 text-xs font-extrabold text-cik-text">
            <img src={catMeta.iconPath} alt="" aria-hidden="true" className="h-4 w-4 shrink-0 object-contain" />
            <span className="min-w-0">{t.whyHowHeader}</span>
          </div>
        </div>
      </div>

      {/* Scrollable Page Content */}
      <div
        ref={scrollBodyRef}
        className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-28 pt-4 sm:px-5 lg:pb-6"
      >
        <div className="flex-1 space-y-4">
          {/* Visual Hero Banner */}
          <div className="relative overflow-hidden rounded-sticker border border-cik-line bg-cik-pink p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 cik-caption-2 font-black uppercase tracking-wider text-cik-text"
                    style={{ backgroundColor: fact.accentColor || 'var(--cik-cta)' }}
                  >
                    <span>{fact.emoji || catMeta.emoji}</span>
                    <span>{detailHighlights.topicTag}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 cik-caption-2 font-black ${
                      darkMode
                        ? 'bg-cik-butter text-cik-butter-text'
                        : 'bg-cik-butter text-cik-butter-text'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    <span>{fact.readingTimeSec || 18}s · +15 XP</span>
                  </span>
                </div>
                <h2 className="cik-title-1 mt-3 text-cik-text">
                  {localized.title}
                </h2>
              </div>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  darkMode
                    ? 'border-cik-line bg-cik-surface'
                    : 'border-cik-line bg-cik-surface shadow-sm'
                }`}
              >
                <FactIcon
                  name={fact.iconName}
                  className="h-6 w-6"
                  style={{ color: fact.accentColor || 'var(--cik-cta)' }}
                />
              </div>
            </div>

            {effectiveGifUrl && !gifFailed ? (
              <div className="relative mt-3 h-44 w-full overflow-hidden rounded-xl border border-cik-line">
                <CardMediaStage
                  url={effectiveGifUrl}
                  posterUrl={fact.posterUrl}
                  mediaType={fact.mediaType}
                  mediaSource={fact.mediaSource}
                  isActive
                  title={localized.title}
                  failed={gifFailed}
                  onFailed={() => setGifFailed(true)}
                />
                <div className="absolute inset-0 z-content bg-cik-bg/20" />
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
                  ? 'border-cik-line bg-cik-surface'
                  : 'border-cik-line bg-cik-surface'
              }`}
            >
              <p
                className={`flex items-center gap-1.5 cik-caption-2 font-black uppercase tracking-wider ${
                  darkMode ? 'text-cik-cta' : 'text-cik-cta'
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
                  darkMode ? 'text-cik-text' : 'text-cik-text'
                }`}
              >
                {localized.factText}
              </p>
            </div>
            <div
              className={`rounded-2xl border px-3.5 py-2.5 ${
                darkMode
                  ? 'border-cik-line bg-cik-surface'
                  : 'border-cik-line bg-cik-surface'
              }`}
            >
              <p
                className={`flex items-center gap-1.5 cik-caption-2 font-black uppercase tracking-wider ${
                  darkMode ? 'text-cik-cta' : 'text-cik-cta'
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
                  darkMode ? 'text-cik-text' : 'text-cik-text'
                }`}
              >
              {detailHighlights.curiosityHook}
            </p>
          </div>
            {localized.quiz?.explanation ? (
              <div
                data-testid="detail-cause-effect"
                className="rounded-2xl border border-cik-line bg-cik-pink px-3.5 py-2.5"
              >
                <p className="cik-caption-2 font-black uppercase tracking-wider text-cik-cta">
                  {lang === 'tr' ? 'Neden / Sonuç' : 'Cause / Effect'}
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-cik-text">
                  {localized.quiz.explanation}
                </p>
              </div>
            ) : null}
          </div>

          {/* Scientific Deep-Dive Narrative */}
          <div
            className={`rounded-2xl border p-4 ${
              darkMode
                ? 'border-cik-line bg-cik-surface'
                : 'border-cik-line bg-cik-surface'
            }`}
          >
            <p
              className={`mb-2 flex items-center gap-1.5 cik-caption-2 font-black uppercase tracking-wider ${
                darkMode ? 'text-cik-text' : 'text-cik-text'
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
              className={`whitespace-pre-wrap cik-body leading-relaxed break-words ${
                darkMode ? 'text-cik-text' : 'text-cik-text'
              }`}
            >
              {detailArticle.article}
            </p>
          </div>

          {/* Engaging Key Insight & Curiosity Hook */}
          <div
            className={`rounded-2xl border p-3.5 ${
              darkMode
                ? 'border-cik-line bg-cik-butter'
                : 'border-cik-line bg-cik-butter'
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
                className={`cik-caption-2 font-black uppercase tracking-wider ${
                  darkMode ? 'text-cik-butter-text' : 'text-cik-butter-text'
                }`}
              >
                {lang === 'tr' ? 'Kilit Bilimsel İçgörü' : 'Key Scientific Insight'}
              </p>
            </div>
            <p
              className={`mt-1 text-xs font-bold leading-relaxed ${
                darkMode ? 'text-cik-text' : 'text-cik-text'
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
                  ? 'border-cik-line bg-cik-pink'
                  : 'border-cik-line bg-cik-pink'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 cik-caption-2 font-black uppercase tracking-wider ${
                    darkMode ? 'text-cik-cta' : 'text-cik-cta'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Hızlı Kavrama Testi' : 'Quick Knowledge Check'}</span>
                </span>
                <span
                  className={`rounded-pill px-2 py-0.5 cik-caption-2 font-black ${
                    miniQuizChoice !== null && miniQuizChoice === localized.quiz.correctIndex
                      ? 'bg-cik-mint text-cik-text'
                      : darkMode
                        ? 'bg-cik-butter text-cik-butter-text'
                        : 'bg-cik-butter text-cik-butter-text'
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
                    ? 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-surface'
                    : 'border-cik-line bg-cik-surface text-cik-text hover:bg-cik-pink';
                  if (answered) {
                    if (isCorrectOpt) {
                      optStyle = 'border-cik-line bg-cik-mint text-cik-mint-text';
                    } else if (picked) {
                      optStyle = 'border-cik-line bg-cik-rose text-cik-rose-text';
                    } else {
                      optStyle = darkMode
                        ? 'border-cik-line bg-cik-surface text-cik-text'
                        : 'border-cik-line bg-cik-surface text-cik-text';
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
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left cik-caption-2 font-bold transition active:scale-[0.99] ${optStyle}`}
                    >
                      <span className="whitespace-normal break-words leading-snug">{opt}</span>
                      {answered && isCorrectOpt && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-cik-mint-text" />
                      )}
                    </button>
                  );
                })}
              </div>
              {miniQuizChoice !== null && localized.quiz.explanation && (
                <p
                  className={`mt-2.5 cik-caption-2 font-semibold leading-relaxed ${
                    darkMode ? 'text-cik-text' : 'text-cik-text'
                  }`}
                >
                  {localized.quiz.explanation}
                </p>
              )}
            </div>
          )}

          {/* Verified Source Attribution */}
          <div
            data-testid="fact-source-box"
            className={`flex flex-col gap-2.5 rounded-2xl border px-4 py-3 text-xs ${
              darkMode
                ? 'border-cik-line bg-cik-surface'
                : 'border-cik-line bg-cik-surface'
            }`}
          >
            <div className={`flex items-start gap-2 font-bold ${darkMode ? 'text-cik-text' : 'text-cik-text'}`}>
              <BookOpen className={`mt-0.5 h-4 w-4 shrink-0 ${darkMode ? 'text-cik-cta' : 'text-cik-cta'}`} />
              <div className="min-w-0 flex-1">
                <span
                  lang={lang}
                  className={`inline-flex items-center gap-1 cik-caption-2 font-black uppercase tracking-wider ${
                    darkMode ? 'text-cik-text' : 'text-cik-text'
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
                darkMode ? 'border-cik-line' : 'border-cik-line'
              }`}
            >
              {resolvedSourceUrl ? (
                <a
                  href={resolvedSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="fact-source-link"
                  className={`inline-flex min-h-11 items-center gap-1 rounded-pill px-3 py-1 cik-caption-2 font-extrabold ${
                    darkMode
                      ? 'bg-cik-pink text-cik-cta'
                      : 'bg-cik-pink text-cik-cta'
                  }`}
                >
                  <span>{t.verifySourceCta}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className={`cik-caption-2 font-semibold ${darkMode ? 'text-cik-text' : 'text-cik-text'}`}>
                  {localized.sourceHint}
                </span>
              )}
            </div>
          </div>
          <MediaAttributionBadge
            lang={lang}
            card={{
              gifUrl: effectiveGifUrl,
              posterUrl: fact.posterUrl,
              videoUrl: fact.gifUrl,
              mediaSource: fact.mediaSource,
              mediaProvider: fact.mediaSource,
              mediaCredit: fact.mediaCredit,
            }}
          />
        </div>
      </div>

      {/* Pinned Full-Page Footer Controls */}
      <div
        className={`flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-[max(14px,env(safe-area-inset-bottom))] sm:px-5 ${
          darkMode
            ? 'border-cik-line bg-cik-bg'
            : 'border-cik-line bg-cik-bg'
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
              ? 'border-cik-line bg-cik-surface text-cik-text'
              : 'border-cik-line bg-cik-surface text-cik-text'
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
              ? 'bg-cik-surface text-cik-text'
              : 'bg-cik-bg text-cik-text'
          }`}
        >
          <span>{lang === 'tr' ? 'Sonraki Bilgiye Kaydır' : t.tiktokNextSlideBtn}</span>
          <ArrowDown className="h-4 w-4 shrink-0" />
        </motion.button>
      </div>
    </motion.div>
  );
}
