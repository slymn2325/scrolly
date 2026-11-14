'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  HelpCircle,
  Home,
  Microscope,
  Play,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import FactIcon from '@/components/FactIcon';
import FloatingBackground from '@/components/FloatingBackground';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import StickyAdBanner from '@/components/StickyAdBanner';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import {
  categoryIdToRouteSlug,
  type FactCard,
  getFactPrimarySlug,
  getFactUrl,
} from '@/utils/factsData';
import { vibrateTap } from '@/utils/haptics';
import { prepareQuizOptions } from '@/utils/recommendation';
import { playDing, playPop, playWrong } from '@/utils/soundEngine';
import {
  loadUserMemory,
  saveUserMemory,
  toggleFavoriteFact,
} from '@/utils/userMemory';

interface SingleFactViewProps {
  fact: FactCard;
  relatedFacts: FactCard[];
  initialLang: Language;
  hasExplicitLang?: boolean;
}

export default function SingleFactView({
  fact,
  relatedFacts,
  initialLang,
  hasExplicitLang = true,
}: SingleFactViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLang] = useState<Language>(initialLang);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [adDismissed, setAdDismissed] = useState(false);

  const primarySlug = getFactPrimarySlug(fact);
  const categorySlug = categoryIdToRouteSlug(fact.category);

  useEffect(() => {
    setLang(initialLang);
    setSelectedOption(null);
  }, [initialLang, primarySlug]);

  useEffect(() => {
    const state = loadUserMemory();
    setSoundEnabled(state.soundEnabled);
    setIsFavorite(state.favoriteIds.includes(fact.id));
    if (!hasExplicitLang && (state.lang === 'tr' || state.lang === 'en')) {
      setLang(state.lang);
    }
  }, [fact.id, hasExplicitLang]);

  const t = translations[lang];
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const resolvedSourceName =
    content.sourceName || fact.sourceName || content.sourceHint;
  const resolvedSourceUrl = content.sourceUrl || fact.sourceUrl;

  const preparedQuiz = useMemo(
    () => prepareQuizOptions(content.quiz, `${fact.id}-${lang}`),
    [content.quiz, fact.id, lang]
  );

  const hasAnswered = selectedOption !== null;
  const isCorrect = hasAnswered && selectedOption === preparedQuiz.correctIndex;

  const correctQuizAnswer =
    content.quiz.options[content.quiz.correctIndex] ?? content.quiz.options[0];

  const guessQaAnswer = useMemo(() => {
    const gc = content.guessChallenge;
    if (!gc) return null;
    if (gc.type === 'slider' && typeof gc.correctValue === 'number') {
      const unit = gc.unit ? ` ${gc.unit}` : '';
      return {
        prompt: gc.prompt,
        answer: `${gc.correctValue}${unit}`,
      };
    }
    if (gc.type === 'binary' && gc.options && typeof gc.correctOptionIndex === 'number') {
      return {
        prompt: gc.prompt,
        answer: gc.options[gc.correctOptionIndex] ?? '',
      };
    }
    return null;
  }, [content.guessChallenge]);

  const handleLangSwitch = (targetLang: Language) => {
    vibrateTap(12);
    playPop(soundEnabled);
    setLang(targetLang);
    setSelectedOption(null);
    const state = loadUserMemory();
    saveUserMemory({ ...state, lang: targetLang });
    if (pathname?.startsWith('/fact/')) {
      router.push(`/fact/${primarySlug}?lang=${targetLang}`);
    } else {
      router.push(getFactUrl(fact, targetLang));
    }
  };

  const handleToggleSound = () => {
    vibrateTap(12);
    const next = !soundEnabled;
    setSoundEnabled(next);
    const state = loadUserMemory();
    saveUserMemory({ ...state, soundEnabled: next });
    if (next) playPop(true);
  };

  const handleToggleFavorite = () => {
    vibrateTap(12);
    playDing(soundEnabled);
    const state = loadUserMemory();
    const updated = toggleFavoriteFact(state, fact.id, fact.category);
    setIsFavorite(updated.favoriteIds.includes(fact.id));
  };

  const handleSelectQuizOption = (idx: number) => {
    if (hasAnswered) return;
    vibrateTap(12);
    setSelectedOption(idx);
    if (idx === preparedQuiz.correctIndex) {
      playDing(soundEnabled);
    } else {
      playWrong(soundEnabled);
    }
  };

  const categoryHref = hasExplicitLang
    ? `/category/${categorySlug}?lang=${lang}`
    : `/category/${categorySlug}`;

  const feedOpenHref = `/?fact=${encodeURIComponent(primarySlug)}`;

  return (
    <div className="relative min-h-screen pb-24">
      <FloatingBackground />

      {/* Top SEO Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-[#FFFDF9]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href={feedOpenHref}
            onClick={() => {
              vibrateTap(12);
              playPop(soundEnabled);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-pill hover:bg-amber-50 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.backToFeed}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* TR | EN Switcher */}
            <div className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 shadow-pill">
              {(['tr', 'en'] as Language[]).map((code) => {
                const active = lang === code;
                return (
                  <motion.button
                    key={code}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleLangSwitch(code)}
                    data-testid={`seo-lang-${code}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase ${
                      active ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {code.toUpperCase()}
                  </motion.button>
                );
              })}
            </div>

            {/* Sound Toggle */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleToggleSound}
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
              className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-pill ${
                soundEnabled
                  ? 'border-teal-200 bg-pastel-mint text-teal-800'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 pt-5 sm:pt-8">
        {/* Semantic Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink/65"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink/40" />
          <Link
            href={categoryHref}
            className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline"
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label[lang]}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink/40" />
          <span className="truncate font-bold text-ink/85">{content.title}</span>
        </nav>

        {/* Hero Fact Article */}
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ backgroundColor: catMeta.cardBg }}
          className={`rounded-3xl border-2 ${catMeta.borderClass} p-6 shadow-cozy-lg sm:p-9`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryHref}
                className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.pillBg} px-3.5 py-1 text-xs font-extrabold ${catMeta.accentText} hover:opacity-90`}
              >
                <span>{catMeta.emoji}</span>
                <span>{catMeta.label[lang]}</span>
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink/60">
                <Clock className="h-3.5 w-3.5" />
                {fact.readingTimeSec ?? 20} {t.seoReadingTime}
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                isFavorite
                  ? 'border-rose-300 bg-rose-500 text-white'
                  : 'border-white bg-white/90 text-ink/70 hover:text-rose-600'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? t.favorited : t.favorite}</span>
            </motion.button>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div
              style={{
                backgroundColor: `${fact.accentColor}1A`,
                color: fact.accentColor,
              }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm sm:h-16 sm:w-16"
            >
              <FactIcon name={fact.iconName} className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                {content.title}
              </h1>
              {/* GEO Direct Summary / Definitional Anchor */}
              <p
                data-geo-summary="true"
                className="mt-3 text-base font-medium leading-relaxed text-ink/90 sm:text-lg"
              >
                {content.factText}
              </p>
            </div>
          </div>

          {/* Interactive Scientific Sketch Diagram */}
          <div className="mt-6 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm">
            <CategoryMotionArt
              factId={fact.id}
              sketchType={fact.sketchType || fact.id}
              category={fact.category}
              accentColor={fact.accentColor}
              iconName={fact.iconName}
              emoji={fact.emoji}
              lang={lang}
              variant="hero"
              onButtonPop={() => playPop(soundEnabled)}
            />
          </div>

          {/* Scientific "Why / How?" Explanation */}
          <section
            aria-labelledby="scientific-explanation-heading"
            className="mt-6 rounded-2xl border border-white bg-white/95 p-5 shadow-sm"
          >
            <h2
              id="scientific-explanation-heading"
              className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-700"
            >
              <Microscope className="h-4 w-4" />
              <span>{t.whyHowHeader}</span>
            </h2>
            <p className="text-sm leading-relaxed text-ink/85 sm:text-base">
              {content.deepDiveDetail}
            </p>
          </section>

          {/* Clickable Verified Source Box */}
          <aside
            aria-label={t.seoVerifiedSource}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 px-4 py-3.5 text-xs font-semibold text-emerald-950"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800/80">
                  {t.seoVerifiedSource}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>{resolvedSourceName}</span>
                </div>
              </div>
            </div>
            {resolvedSourceUrl && (
              <a
                href={resolvedSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50"
              >
                <span>{t.verifySourceCta}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </aside>
        </motion.article>

        {/* Primary CTA: Open Directly in Interactive Feed (/?fact=[slug]) */}
        <div className="mt-6 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-rose-50 p-5 text-center shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
            {lang === 'tr' ? 'Etkileşimli Mikro Öğrenme Akışı' : 'Interactive Micro-Discovery Feed'}
          </p>
          <p className="mt-1 text-sm font-medium text-ink/80">
            {lang === 'tr'
              ? 'Bu kartı kaydırmalı akışta aç, tahminini kilitle ve +20 XP kazan.'
              : 'Open this card in the vertical discovery feed, lock your guess, and earn +20 XP.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href={feedOpenHref} onClick={() => playPop(soundEnabled)}>
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.94 }}
                data-testid="seo-explore-cta"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-6 py-3.5 font-display text-sm font-bold text-white shadow-cozy-lg sm:text-base"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {lang === 'tr' ? 'Bu Kartı Akışta Aç →' : 'Open in Interactive Feed →'}
                </span>
              </motion.span>
            </Link>
            <Link
              href={categoryHref}
              onClick={() => playPop(soundEnabled)}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-5 py-3 text-xs font-extrabold text-violet-800 hover:bg-violet-50 sm:text-sm"
            >
              <span>{catMeta.emoji}</span>
              <span>
                {lang === 'tr'
                  ? `Tüm ${catMeta.label.tr} Kartları`
                  : `All ${catMeta.label.en} Facts`}
              </span>
            </Link>
          </div>
        </div>

        {/* GEO Question & Answer Knowledge Block */}
        <section
          aria-labelledby="fact-qa-heading"
          className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <h2
            id="fact-qa-heading"
            className="flex items-center gap-2 font-display text-lg font-bold text-ink"
          >
            <HelpCircle className="h-5 w-5 text-violet-600" />
            <span>
              {lang === 'tr'
                ? 'Soru & Cevap (Hızlı Tahmin ve Bilgi Özeti)'
                : 'Questions & Answers (Quick Guess & Key Takeaway)'}
            </span>
          </h2>

          <div className="mt-4 space-y-3">
            {guessQaAnswer && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <p className="text-sm font-extrabold text-ink">
                  {lang === 'tr' ? 'Tahmin Sorusu: ' : 'Quick Guess: '}
                  {guessQaAnswer.prompt}
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-900">
                  {lang === 'tr' ? 'Doğru Yanıt: ' : 'Verified Answer: '}
                  <span className="font-extrabold">{guessQaAnswer.answer}</span>
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
              <p className="text-sm font-extrabold text-ink">
                {lang === 'tr' ? 'Bilgi Sorusu: ' : 'Quiz Question: '}
                {content.quiz.question}
              </p>
              <p className="mt-1 text-sm font-semibold text-violet-900">
                {lang === 'tr' ? 'Doğru Cevap: ' : 'Correct Answer: '}
                <span className="font-extrabold">{correctQuizAnswer}</span>
              </p>
              {content.quiz.explanation && (
                <p className="mt-1.5 text-xs leading-relaxed text-ink/75 sm:text-sm">
                  {content.quiz.explanation}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Single-Fact Interactive Mini Quiz */}
        <section
          data-testid="seo-mini-quiz"
          className="mt-6 rounded-3xl border-2 border-violet-200 bg-white p-6 shadow-cozy sm:p-8"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-3 py-1 text-xs font-extrabold text-violet-800">
              <Brain className="h-3.5 w-3.5" />
              {t.seoMiniQuizTitle}
            </span>
          </div>

          <h2 className="mt-3 font-display text-lg font-bold text-ink sm:text-xl">
            {content.quiz.question}
          </h2>

          <div className="mt-4 flex flex-col gap-2.5">
            {preparedQuiz.options.map((opt, idx) => {
              const selected = selectedOption === idx;
              const correctOpt = idx === preparedQuiz.correctIndex;
              let style =
                'border-slate-200 bg-slate-50/80 text-ink hover:border-violet-300 hover:bg-pastel-lavender/40';
              if (hasAnswered) {
                if (correctOpt) {
                  style = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold';
                } else if (selected) {
                  style = 'border-rose-400 bg-rose-50 text-rose-900';
                } else {
                  style = 'border-slate-100 bg-slate-50/40 text-ink/45';
                }
              }

              return (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={!hasAnswered ? { scale: 0.97 } : undefined}
                  disabled={hasAnswered}
                  onClick={() => handleSelectQuizOption(idx)}
                  className={`flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all whitespace-normal break-words leading-snug ${style}`}
                >
                  <span>{opt}</span>
                  {hasAnswered && correctOpt && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  )}
                  {hasAnswered && selected && !correctOpt && (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 rounded-2xl p-3.5 text-xs sm:text-sm ${
                isCorrect
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <p className="font-extrabold">{isCorrect ? t.quizCorrect : t.quizWrong}</p>
              {content.quiz.explanation && (
                <p className="mt-1 text-ink/80">{content.quiz.explanation}</p>
              )}
            </motion.div>
          )}
        </section>

        {/* Big Main Discovery CTA */}
        <div className="mt-7 text-center">
          <Link href="/" onClick={() => playPop(soundEnabled)}>
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-violet-300 bg-white px-7 py-3.5 font-display text-sm font-bold text-violet-900 shadow-sm hover:bg-violet-50 sm:text-base"
            >
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span>{t.seoCtaButton}</span>
            </motion.span>
          </Link>
        </div>

        {/* Related Facts (Same Category) */}
        {relatedFacts.length > 0 && (
          <section className="mt-10" aria-labelledby="related-facts-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id="related-facts-heading" className="font-display text-lg font-bold text-ink">
                {t.seoRelatedTitle}
              </h3>
              <Link
                href={categoryHref}
                className="text-xs font-extrabold text-violet-700 hover:underline"
              >
                {lang === 'tr' ? 'Kategoriyi Gör →' : 'View Category →'}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedFacts.map((rel) => {
                const relMeta = getCategoryMeta(rel.category);
                const relSlug = getFactPrimarySlug(rel);
                const relHref = hasExplicitLang
                  ? `/fact/${relSlug}?lang=${lang}`
                  : `/fact/${relSlug}`;
                return (
                  <Link
                    key={rel.id}
                    href={relHref}
                    onClick={() => playPop(soundEnabled)}
                    className={`flex flex-col justify-between rounded-2xl border ${relMeta.borderClass} bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{rel.emoji ?? '✨'}</span>
                        <span className={`text-[11px] font-extrabold ${relMeta.accentText}`}>
                          {relMeta.label[lang]}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold leading-snug text-ink">
                        {rel[lang].title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-ink/65">
                        {rel[lang].factText}
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                      <span>{t.readFullPage}</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <SiteTrustFooter lang={lang} />

      <StickyAdBanner
        lang={lang}
        visible={!adDismissed}
        onDismiss={() => {
          vibrateTap(12);
          playPop(soundEnabled);
          setAdDismissed(true);
        }}
      />
    </div>
  );
}
