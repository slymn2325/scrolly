'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Heart,
  Microscope,
  Sparkles,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import FactIcon from '@/components/FactIcon';
import FloatingBackground from '@/components/FloatingBackground';
import StickyAdBanner from '@/components/StickyAdBanner';
import { getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { type FactCard, getFactUrl } from '@/utils/factsData';
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
}

export default function SingleFactView({
  fact,
  relatedFacts,
  initialLang,
}: SingleFactViewProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(initialLang);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [adDismissed, setAdDismissed] = useState(false);

  useEffect(() => {
    const state = loadUserMemory();
    setSoundEnabled(state.soundEnabled);
    setIsFavorite(state.favoriteIds.includes(fact.id));
  }, [fact.id]);

  const t = translations[lang];
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);

  const preparedQuiz = useMemo(
    () => prepareQuizOptions(content.quiz, `${fact.id}-${lang}`),
    [content.quiz, fact.id, lang]
  );

  const hasAnswered = selectedOption !== null;
  const isCorrect = hasAnswered && selectedOption === preparedQuiz.correctIndex;

  const handleLangSwitch = (targetLang: Language) => {
    vibrateTap(12);
    playPop(soundEnabled);
    setLang(targetLang);
    const state = loadUserMemory();
    saveUserMemory({ ...state, lang: targetLang });
    const targetUrl = getFactUrl(fact, targetLang);
    router.push(targetUrl);
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

  return (
    <div className="relative min-h-screen pb-24">
      <FloatingBackground />

      {/* Top SEO Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-[#FFFDF9]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
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
      <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-10">
        {/* Hero Fact Card */}
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ backgroundColor: catMeta.cardBg }}
          className={`rounded-3xl border-2 ${catMeta.borderClass} p-6 shadow-cozy-lg sm:p-9`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.pillBg} px-3.5 py-1 text-xs font-extrabold ${catMeta.accentText}`}
              >
                <span>{catMeta.emoji}</span>
                <span>{catMeta.label[lang]}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink/60">
                <Clock className="h-3.5 w-3.5" />
                {fact.readingTimeSec ?? 15} {t.seoReadingTime}
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
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm"
            >
              <FactIcon name={fact.iconName} className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                {content.title}
              </h1>
              <p className="mt-3 text-base font-medium leading-relaxed text-ink/85 sm:text-lg">
                {content.factText}
              </p>
            </div>
          </div>

          {/* Scientific "Why / How?" Explanation */}
          <div className="mt-6 rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-700">
              <Microscope className="h-4 w-4" />
              <span>{t.whyHowHeader}</span>
            </div>
            <p className="text-sm leading-relaxed text-ink/85 sm:text-base">
              {content.deepDiveDetail}
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-ink/60">
              <BookOpen className="h-4 w-4 text-amber-600" />
              <span>
                <strong>{t.seoVerifiedSource}:</strong> {content.sourceHint}
              </span>
            </div>
          </div>
        </motion.article>

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
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${style}`}
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
              data-testid="seo-explore-cta"
              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-7 py-4 font-display text-base font-bold text-white shadow-cozy-lg sm:text-lg"
            >
              <Sparkles className="h-5 w-5" />
              <span>{t.seoCtaButton}</span>
            </motion.span>
          </Link>
        </div>

        {/* Related Facts */}
        {relatedFacts.length > 0 && (
          <section className="mt-10">
            <h3 className="mb-3 font-display text-lg font-bold text-ink">{t.seoRelatedTitle}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedFacts.map((rel) => {
                const relMeta = getCategoryMeta(rel.category);
                return (
                  <Link
                    key={rel.id}
                    href={getFactUrl(rel, lang)}
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
