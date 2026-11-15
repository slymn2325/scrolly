'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  Flame,
  Heart,
  HelpCircle,
  Home,
  Layers,
  Lightbulb,
  Loader2,
  MessageCircle,
  Microscope,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
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
import { formatValueWithUnit } from '@/lib/formatUnit';
import { fetchTopicGifFromApi, syncProfileToApi, trackEvent } from '@/lib/telemetry';
import { createScrollaRoom, getOrCreateScrollaPlayerId } from '@/utils/duelLobby';
import {
  buildCategoryHref,
  buildFactHref,
  categoryIdToRouteSlug,
  type FactCard,
  getFactPrimarySlug,
} from '@/utils/factsData';
import { vibrateSuccess, vibrateTap } from '@/utils/haptics';
import {
  CATEGORY_ILLUSTRATION_MAP,
  CATEGORY_SUB_ICON_MAP,
  UI_ICON_PATHS,
} from '@/utils/icons8Assets';
import { prepareQuizOptions } from '@/utils/recommendation';
import { playCelebration, playDing, playPop, playWrong } from '@/utils/soundEngine';
import {
  buildFactDetailArticle,
  buildStructuredDetailHighlights,
} from '@/utils/topicMotif';
import {
  addUserXp,
  loadUserMemory,
  saveUserMemory,
  toggleFavoriteFact,
  type UserMemoryState,
} from '@/utils/userMemory';

interface SingleFactViewProps {
  fact: FactCard;
  relatedFacts: FactCard[];
  initialLang: Language;
  hasExplicitLang?: boolean;
}

interface BreakdownCardItem {
  id: string;
  indexLabel: string;
  title: string;
  body: string;
  kind: 'mechanism' | 'context' | 'evidence';
}

function buildBreakdownCards(
  articleText: string,
  category: FactCard['category'],
  lang: Language
): BreakdownCardItem[] {
  const rawParagraphs = articleText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  let segments = [...rawParagraphs];
  if (segments.length === 1 && segments[0].length > 170) {
    const sentences = segments[0].split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length >= 2) {
      const mid = Math.ceil(sentences.length / 2);
      segments = [sentences.slice(0, mid).join(' '), sentences.slice(mid).join(' ')].filter(Boolean);
    }
  }

  const isHistorical = category === 'history';
  const titlesTr = isHistorical
    ? ['Tarihsel Mekanizma', 'Arka Plan & Etki', 'Kaynak Bağlamı']
    : ['Bilimsel Mekanizma', 'Neden Önemli?', 'Kanıt & Bağlam'];
  const titlesEn = isHistorical
    ? ['Historical Mechanism', 'Context & Impact', 'Archive Evidence']
    : ['Scientific Mechanism', 'Why It Matters', 'Evidence & Context'];
  const kinds: Array<BreakdownCardItem['kind']> = ['mechanism', 'context', 'evidence'];

  return segments.slice(0, 3).map((body, idx) => ({
    id: `breakdown-${idx}`,
    indexLabel: `0${idx + 1}`,
    title: (lang === 'tr' ? titlesTr : titlesEn)[idx] ?? (lang === 'tr' ? 'Detay Notu' : 'Deep Note'),
    body,
    kind: kinds[idx] ?? 'evidence',
  }));
}

export default function SingleFactView({
  fact,
  relatedFacts,
  initialLang,
  hasExplicitLang = true,
}: SingleFactViewProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(initialLang);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [userXp, setUserXp] = useState(0);
  const [userNickname, setUserNickname] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizXpAwarded, setQuizXpAwarded] = useState(false);
  const [guessRevealed, setGuessRevealed] = useState(false);
  const [guessSelectedBinary, setGuessSelectedBinary] = useState<number | null>(null);
  const [sliderGuessVal, setSliderGuessVal] = useState<number>(0);
  const [adDismissed, setAdDismissed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [creatingScrolla, setCreatingScrolla] = useState(false);

  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | null>(fact.gifUrl || null);
  const [gifFailed, setGifFailed] = useState(false);
  const trackedDetailViewRef = useRef(false);

  const primarySlug = getFactPrimarySlug(fact);
  const categorySlug = categoryIdToRouteSlug(fact.category);

  useEffect(() => {
    setLang(initialLang);
    setSelectedOption(null);
    setQuizXpAwarded(false);
    setGuessRevealed(false);
    setGuessSelectedBinary(null);
  }, [initialLang, primarySlug]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const state = loadUserMemory();
    setSoundEnabled(state.soundEnabled);
    setUserXp(state.xp);
    setUserNickname(state.nickname);
    setIsFavorite(state.favoriteIds.includes(fact.id));
    if (!hasExplicitLang && (state.lang === 'tr' || state.lang === 'en')) {
      setLang(state.lang);
    }
    if (!trackedDetailViewRef.current) {
      trackedDetailViewRef.current = true;
      void trackEvent(primarySlug, fact.category, 'detail_open', { page: 'single_fact' });
    }
  }, [fact.id, fact.category, primarySlug, hasExplicitLang]);

  useEffect(() => {
    const gc = fact[lang].guessChallenge;
    if (gc?.type === 'slider') {
      const min = gc.min ?? 0;
      const max = gc.max ?? 100;
      setSliderGuessVal(Math.round((min + max) / 2));
    }
  }, [fact, lang]);

  useEffect(() => {
    setGifFailed(false);
    if (fact.gifUrl) {
      setResolvedGifUrl(fact.gifUrl);
      return;
    }
    setResolvedGifUrl(null);
    if (!fact.visualQuery) return;
    let cancelled = false;
    void fetchTopicGifFromApi(fact.visualQuery, primarySlug).then((url) => {
      if (!cancelled && url) {
        setResolvedGifUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fact.id, fact.gifUrl, fact.visualQuery, primarySlug]);

  const t = translations[lang];
  const content = fact[lang];
  const catMeta = getCategoryMeta(fact.category);
  const catIllustration = CATEGORY_ILLUSTRATION_MAP[fact.category];
  const catSubIcon = CATEGORY_SUB_ICON_MAP[fact.category];
  const resolvedSourceName =
    content.sourceName || fact.sourceName || content.sourceHint;
  const resolvedSourceUrl = content.sourceUrl || fact.sourceUrl;

  const detailHighlights = useMemo(
    () =>
      buildStructuredDetailHighlights(
        {
          factText: content.factText,
          deepDiveDetail: content.deepDiveDetail,
          tag: content.tag,
          sourceHint: content.sourceHint,
          quiz: content.quiz,
        },
        lang
      ),
    [content.factText, content.deepDiveDetail, content.tag, content.sourceHint, content.quiz, lang]
  );

  const detailArticle = useMemo(
    () =>
      buildFactDetailArticle(
        {
          factText: content.factText,
          deepDiveDetail: content.deepDiveDetail,
          tag: content.tag,
          sourceHint: content.sourceHint,
          quiz: content.quiz,
        },
        lang
      ),
    [content.factText, content.deepDiveDetail, content.tag, content.sourceHint, content.quiz, lang]
  );

  const breakdownCards = useMemo(
    () => buildBreakdownCards(detailArticle.article, fact.category, lang),
    [detailArticle.article, fact.category, lang]
  );

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
      return {
        type: 'slider' as const,
        prompt: gc.prompt,
        min: gc.min ?? 0,
        max: gc.max ?? 100,
        step: gc.step ?? 1,
        unit: gc.unit,
        correctValue: gc.correctValue,
        answer: gc.unit
          ? formatValueWithUnit(gc.correctValue, gc.unit, lang)
          : String(gc.correctValue),
      };
    }
    if (gc.type === 'binary' && gc.options && typeof gc.correctOptionIndex === 'number') {
      return {
        type: 'binary' as const,
        prompt: gc.prompt,
        options: gc.options,
        correctOptionIndex: gc.correctOptionIndex,
        answer: gc.options[gc.correctOptionIndex] ?? '',
      };
    }
    return null;
  }, [content.guessChallenge, lang]);

  const handleLangSwitch = (targetLang: Language) => {
    const safeLang: 'tr' | 'en' = targetLang === 'en' ? 'en' : 'tr';
    vibrateTap(12);
    playPop(soundEnabled);
    setLang(safeLang);
    setSelectedOption(null);
    const state = loadUserMemory();
    saveUserMemory({ ...state, lang: safeLang });
    router.push(buildFactHref(primarySlug, safeLang));
  };

  const handleToggleSound = () => {
    vibrateTap(12);
    const next = !soundEnabled;
    setSoundEnabled(next);
    const state = loadUserMemory();
    saveUserMemory({ ...state, soundEnabled: next });
    if (next) playPop(true);
  };

  const syncMemorySnapshot = (updated: UserMemoryState) => {
    void syncProfileToApi({
      username: updated.nickname,
      xp: updated.xp,
      weeklyXp: updated.weeklyXp,
      dailyBestScore: updated.dailyBestScore,
      lastDailyQuizDate: updated.lastDailyQuizDate,
      streak: updated.streakDays,
      lastVisitDate: updated.lastVisitDate,
      seenIds: updated.seenIds,
      favoriteIds: updated.favoriteIds,
      categoryWeights: updated.categoryWeights,
      categoryAccuracy: updated.categoryAccuracy,
      badges: updated.badges,
    });
  };

  const handleToggleFavorite = () => {
    vibrateTap(12);
    playDing(soundEnabled);
    const state = loadUserMemory();
    const updated = toggleFavoriteFact(state, fact.id, fact.category);
    setIsFavorite(updated.favoriteIds.includes(fact.id));
    setUserXp(updated.xp);
    syncMemorySnapshot(updated);
  };

  const handleLockDetailGuess = (binaryIdx?: number) => {
    if (guessRevealed) return;
    vibrateTap(12);
    if (typeof binaryIdx === 'number') {
      setGuessSelectedBinary(binaryIdx);
    }
    setGuessRevealed(true);
    const isSpotOn =
      guessQaAnswer?.type === 'binary'
        ? binaryIdx === guessQaAnswer.correctOptionIndex
        : guessQaAnswer?.type === 'slider'
          ? Math.abs(sliderGuessVal - guessQaAnswer.correctValue) <=
            Math.max(1, (guessQaAnswer.max - guessQaAnswer.min) * 0.15)
          : true;

    const xpGain = isSpotOn ? 20 : 10;
    const updated = addUserXp(loadUserMemory(), xpGain);
    setUserXp(updated.xp);
    syncMemorySnapshot(updated);
    if (isSpotOn) {
      playDing(soundEnabled);
    } else {
      playPop(soundEnabled);
    }
  };

  const handleSelectQuizOption = (idx: number) => {
    if (hasAnswered) return;
    vibrateTap(12);
    setSelectedOption(idx);
    const correct = idx === preparedQuiz.correctIndex;
    if (correct) {
      vibrateSuccess();
      playCelebration(soundEnabled);
      if (!quizXpAwarded) {
        const updated = addUserXp(loadUserMemory(), 25);
        setUserXp(updated.xp);
        setQuizXpAwarded(true);
        syncMemorySnapshot(updated);
      }
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.72 },
          colors: [fact.accentColor || '#7C3AED', '#34D399', '#FBBF24'],
        });
      } catch {
        // Ignore confetti errors in headless browsers
      }
    } else {
      playWrong(soundEnabled);
      if (!quizXpAwarded) {
        const updated = addUserXp(loadUserMemory(), 5);
        setUserXp(updated.xp);
        setQuizXpAwarded(true);
        syncMemorySnapshot(updated);
      }
    }
  };

  const handleScrollaChallenge = async () => {
    if (creatingScrolla) return;
    vibrateTap(14);
    playPop(soundEnabled);
    setCreatingScrolla(true);

    try {
      const state = loadUserMemory();
      const playerId = getOrCreateScrollaPlayerId(state.playerId);
      const seededIds = [fact.id, ...relatedFacts.map((r) => r.id)].slice(0, 5);
      const res = await createScrollaRoom({
        hostId: playerId,
        hostName: userNickname || state.nickname || t.duelDefaultName,
        category: fact.category,
        questionCount: 5,
        cardIds: seededIds.length >= 2 ? seededIds : undefined,
      });

      if (res.ok && res.room?.code) {
        router.push(`/?duel=${encodeURIComponent(res.room.code)}`);
        return;
      }
    } catch {
      // Fallback below
    } finally {
      setCreatingScrolla(false);
    }

    router.push(`/?fact=${encodeURIComponent(primarySlug)}`);
  };

  const safeLang: 'tr' | 'en' = lang === 'en' ? 'en' : 'tr';
  const categoryHref = buildCategoryHref(categorySlug, safeLang);
  const canonicalPath = buildFactHref(primarySlug, safeLang);
  const feedOpenHref = `/?fact=${encodeURIComponent(primarySlug)}`;
  const optionLetters = ['A', 'B', 'C'] as const;

  return (
    <div className="relative min-h-screen pb-24 text-ink dark:text-violet-50">
      <FloatingBackground />

      {/* Top Sticky Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-[#FFFDF9]/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0F0D1A]/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href={feedOpenHref}
            onClick={() => {
              vibrateTap(12);
              playPop(soundEnabled);
            }}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink shadow-pill hover:bg-amber-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.backToFeed}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Gamified XP Counter */}
            <span className="hidden items-center gap-1 rounded-full border border-violet-200 bg-pastel-lavender px-3 py-1 text-xs font-black text-violet-900 dark:border-violet-600/40 dark:bg-violet-900/50 dark:text-violet-100 sm:inline-flex">
              <img src={UI_ICON_PATHS.xpSparkles} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
              <span>{userXp} XP</span>
            </span>

            {/* TR | EN Switcher */}
            <div className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 shadow-pill dark:border-white/15 dark:bg-white/10">
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
                      active
                        ? 'bg-ink text-white dark:bg-violet-600'
                        : 'text-ink/60 hover:text-ink dark:text-violet-200/70 dark:hover:text-white'
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
                  ? 'border-teal-200 bg-pastel-mint text-teal-800 dark:border-teal-500/40 dark:bg-teal-900/50 dark:text-teal-200'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-white/15 dark:bg-white/10'
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
          className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink/65 dark:text-violet-200/70"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline dark:hover:text-violet-300"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink/40 dark:text-white/30" />
          <Link
            href={categoryHref}
            className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline dark:hover:text-violet-300"
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label[lang]}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink/40 dark:text-white/30" />
          <span className="truncate font-bold text-ink/85 dark:text-white/90">{content.title}</span>
        </nav>

        {/* Hero Fact Article with Category Aura */}
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            backgroundColor: catMeta.cardBg,
            boxShadow: `0 24px 60px -18px ${fact.accentColor}40`,
          }}
          data-fact-surface="true"
          className={`relative overflow-hidden rounded-3xl border-2 ${catMeta.borderClass} p-5 sm:p-8`}
        >
          {/* Subtle category color aura glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
            style={{ backgroundColor: fact.accentColor }}
          />

          {/* Top Meta Chips + Save Button */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryHref}
                className={`inline-flex items-center gap-1.5 rounded-full ${catMeta.pillBg} px-3.5 py-1 text-xs font-extrabold ${catMeta.accentText} hover:opacity-90`}
              >
                <span>{catMeta.emoji}</span>
                <span>{catMeta.label[lang]}</span>
              </Link>
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-sm"
                style={{ backgroundColor: fact.accentColor || '#7C3AED' }}
              >
                <Sparkles className="h-3 w-3" />
                <span>{detailHighlights.topicTag}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink/70 dark:bg-white/10 dark:text-violet-100">
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
                  : 'border-white bg-white/90 text-ink/75 hover:text-rose-600 dark:border-white/15 dark:bg-white/10 dark:text-white'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? t.favorited : t.favorite}</span>
            </motion.button>
          </div>

          {/* Title + GEO Teaser Anchor */}
          <div className="relative z-10 mt-5 flex items-start gap-4">
            <div
              style={{
                backgroundColor: `${fact.accentColor}22`,
                color: fact.accentColor,
                borderColor: `${fact.accentColor}44`,
              }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-white/95 shadow-sm dark:bg-white/10 sm:h-16 sm:w-16"
            >
              <FactIcon name={fact.iconName} className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-ink dark:text-white sm:text-3xl">
                {content.title}
              </h1>
              <p
                data-geo-summary="true"
                className="mt-2.5 text-base font-medium leading-relaxed text-ink/90 dark:text-violet-100/90 sm:text-lg"
              >
                {content.factText}
              </p>
            </div>
          </div>

          {/* Interactive Bounded Visual Showcase: Cached GIF + Motion Canvas + SVG/PNG Illustration */}
          <div
            data-testid="detail-visual-stage"
            className="relative mt-6 h-60 w-full overflow-hidden rounded-3xl border border-white/60 bg-[#0A0914] shadow-lg dark:border-white/15 sm:h-72"
          >
            <CategoryMotionArt
              factId={fact.id}
              sketchType={fact.sketchType || fact.id}
              category={fact.category}
              accentColor={fact.accentColor}
              iconName={fact.iconName}
              emoji={fact.emoji}
              lang={lang}
              variant="hero"
              topicText={`${content.title} ${content.factText} ${content.tag || ''}`}
              tag={content.tag}
              onButtonPop={() => playPop(soundEnabled)}
            />

            {resolvedGifUrl && !gifFailed && (
              <img
                src={resolvedGifUrl}
                alt={content.title}
                onError={() => setGifFailed(true)}
                data-testid="detail-gif-preview"
                className="absolute inset-0 z-[2] h-full w-full object-cover"
              />
            )}

            {/* Dark Readability Scrim */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/85 via-black/35 to-black/30"
            />

            {/* Top HUD Pills */}
            <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2 p-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur-md">
                {resolvedGifUrl && !gifFailed ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-emerald-300" />
                    <span>{lang === 'tr' ? 'Konu GIF Önizlemesi' : 'Topic GIF Visual'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>{lang === 'tr' ? 'Etkileşimli Sahne' : 'Interactive Scene'}</span>
                  </>
                )}
              </span>

              {fact.visualQuery && (
                <span className="hidden rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80 backdrop-blur-md sm:inline-flex">
                  {fact.visualQuery}
                </span>
              )}
            </div>

            {/* Bottom HUD: Category Illustration + Hook */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 p-1.5 backdrop-blur-md">
                  <img
                    src={catIllustration}
                    alt={catMeta.label[lang]}
                    className="h-9 w-9 object-contain drop-shadow"
                  />
                </div>
                <div className="min-w-0 text-white">
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                    {fact.emoji ?? catMeta.emoji} {detailHighlights.topicTag}
                  </p>
                  <p className="line-clamp-1 text-xs font-bold text-white/90 sm:text-sm">
                    {detailHighlights.sourceNote}
                  </p>
                </div>
              </div>

              <img
                src={catSubIcon}
                alt=""
                aria-hidden="true"
                className="hidden h-9 w-9 shrink-0 object-contain opacity-90 drop-shadow sm:block"
              />
            </div>
          </div>

          {/* Crisp Quick Highlights & Key Numbers Grid */}
          <section
            aria-label={lang === 'tr' ? 'Öne Çıkanlar ve Kilit Veriler' : 'Quick Highlights & Key Numbers'}
            className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3"
          >
            {/* Card 1: Interactive Key Number / Guess Challenge */}
            <div className="rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-sm dark:border-amber-500/30 dark:bg-white/5 sm:col-span-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Target className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Kilit Sayı / Tahmin' : 'Key Metric'}</span>
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  +20 XP
                </span>
              </div>

              {guessQaAnswer ? (
                <div className="mt-2">
                  <p className="text-xs font-bold leading-snug text-ink/85 dark:text-white/90">
                    {guessQaAnswer.prompt}
                  </p>

                  {!guessRevealed ? (
                    guessQaAnswer.type === 'binary' ? (
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        {guessQaAnswer.options.map((opt, bIdx) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleLockDetailGuess(bIdx)}
                            className="rounded-xl border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-left text-xs font-bold text-ink transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-white/10 dark:text-white"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-violet-700 dark:text-violet-300">
                          <span>{lang === 'tr' ? 'Tahminin:' : 'Your guess:'}</span>
                          <span>
                            {guessQaAnswer.unit
                              ? formatValueWithUnit(sliderGuessVal, guessQaAnswer.unit, lang)
                              : sliderGuessVal}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={guessQaAnswer.min}
                          max={guessQaAnswer.max}
                          step={guessQaAnswer.step}
                          value={sliderGuessVal}
                          onChange={(e) => setSliderGuessVal(Number(e.target.value))}
                          aria-label={guessQaAnswer.prompt}
                          className="w-full accent-violet-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleLockDetailGuess()}
                          data-testid="detail-guess-reveal-btn"
                          className="w-full rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-amber-600"
                        >
                          {lang === 'tr' ? 'Tahmini Kilitle' : 'Lock Guess'}
                        </button>
                      </div>
                    )
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      data-testid="fact-key-highlight"
                      className="mt-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 dark:border-emerald-500/40 dark:bg-emerald-950/50"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {lang === 'tr' ? 'Gerçek Değer' : 'Verified Number'}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold text-emerald-950 dark:text-white">
                        {guessQaAnswer.answer}
                      </p>
                      {guessSelectedBinary !== null && (
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                          {guessSelectedBinary === guessQaAnswer.correctOptionIndex
                            ? lang === 'tr'
                              ? 'Tam isabet! +20 XP'
                              : 'Spot on! +20 XP'
                            : lang === 'tr'
                              ? 'Doğru cevap açıldı! +10 XP'
                              : 'Answer revealed! +10 XP'}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs font-semibold leading-relaxed text-ink/80 dark:text-violet-100/85">
                  {detailHighlights.curiosityHook}
                </p>
              )}
            </div>

            {/* Card 2: Key Mechanism / Insight */}
            <div className="rounded-2xl border border-violet-200/80 bg-white/95 p-4 shadow-sm dark:border-violet-500/30 dark:bg-white/5 sm:col-span-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{lang === 'tr' ? 'Kilit Mekanizma' : 'Key Insight'}</span>
              </span>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-ink/85 dark:text-violet-100/90 sm:text-[13px]">
                {detailHighlights.keyInsight}
              </p>
            </div>

            {/* Card 3: Quick Stats & Category Rank */}
            <div className="flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-white/95 p-4 shadow-sm dark:border-teal-500/30 dark:bg-white/5 sm:col-span-1">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Keşif Özeti' : 'Discovery Snapshot'}</span>
                </span>
                <p className="mt-2 flex items-center gap-2 font-display text-base font-bold text-ink dark:text-white">
                  <img
                    src={catMeta.iconPath}
                    alt=""
                    aria-hidden="true"
                    width={18}
                    height={18}
                    decoding="async"
                    className="h-[18px] w-[18px] shrink-0 object-contain"
                  />
                  <span>{catMeta.label[lang]}</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-ink/70 dark:text-violet-200/75">
                  {detailHighlights.topicTag}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] font-extrabold text-ink/75 dark:border-white/10 dark:text-violet-200">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                  <img
                    src={UI_ICON_PATHS.lightning}
                    alt=""
                    aria-hidden="true"
                    width={12}
                    height={12}
                    decoding="async"
                    className="h-3 w-3 shrink-0 object-contain"
                  />
                  <span>{fact.readingTimeSec ?? 20}s</span>
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
                  {detailArticle.wordCount} {lang === 'tr' ? 'kelime' : 'words'}
                </span>
              </div>
            </div>
          </section>

          {/* Scientific / Historical Breakdown Cards (No Walls of Plain Text) */}
          <section
            aria-labelledby="scientific-explanation-heading"
            className="relative z-10 mt-6 space-y-3"
          >
            <h2
              id="scientific-explanation-heading"
              className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300"
            >
              <Microscope className="h-4 w-4" />
              <span>{t.whyHowHeader}</span>
            </h2>

            <div className="grid gap-3">
              {breakdownCards.map((card) => (
                <div
                  key={card.id}
                  style={{ borderLeftColor: fact.accentColor || '#7C3AED' }}
                  className="rounded-2xl border border-l-4 border-white/90 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: `${fact.accentColor}22`, color: fact.accentColor }}
                      className="inline-flex h-6 items-center justify-center rounded-full px-2 text-[11px] font-black"
                    >
                      {card.indexLabel}
                    </span>
                    <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink dark:text-white sm:text-base">
                      {card.kind === 'mechanism' ? (
                        <Microscope className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                      ) : card.kind === 'context' ? (
                        <Sparkles className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Layers className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                      )}
                      <span>{card.title}</span>
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/85 dark:text-violet-100/85 sm:text-[15px]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Clickable Verified Source Card */}
          {resolvedSourceUrl ? (
            <a
              href={resolvedSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t.seoVerifiedSource}: ${resolvedSourceName}`}
              data-testid="detail-source-card"
              className="group relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/85 px-4 py-3.5 text-xs font-semibold text-emerald-950 transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                  <img
                    src={UI_ICON_PATHS.verifiedSeal}
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    decoding="async"
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800/85 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t.seoVerifiedSource}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-white">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                    <span>{resolvedSourceName}</span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-violet-700 shadow-sm ring-1 ring-violet-200 transition group-hover:bg-violet-600 group-hover:text-white dark:bg-white/10 dark:text-violet-200 dark:ring-white/20">
                <span>{t.verifySourceCta}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          ) : (
            <aside
              aria-label={t.seoVerifiedSource}
              data-testid="detail-source-card"
              className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 px-4 py-3.5 text-xs font-semibold text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300">
                    {t.seoVerifiedSource}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-ink dark:text-white">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
                    <span>{resolvedSourceName}</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </motion.article>

        {/* Gamified Primary CTAs: Scrolla Challenge + Open in Feed */}
        <div className="mt-6 rounded-3xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 p-5 text-center shadow-sm dark:border-violet-600/40 dark:from-violet-950/60 dark:via-fuchsia-950/40 dark:to-amber-950/30 sm:p-6">
          <p className="inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
            <img
              src={UI_ICON_PATHS.lightning}
              alt=""
              aria-hidden="true"
              width={14}
              height={14}
              decoding="async"
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
            <span>{lang === 'tr' ? 'Scrolla Arena & Etkileşimli Akış' : 'Scrolla Arena & Interactive Feed'}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-ink/80 dark:text-violet-100/85">
            {lang === 'tr'
              ? 'Bu konudan 6 haneli Scrolla 1v1 odası kur ya da kartı tam ekran keşif akışında aç!'
              : 'Launch a 6-character Scrolla 1v1 duel from this topic or open it in the full-screen feed!'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              disabled={creatingScrolla}
              onClick={handleScrollaChallenge}
              data-testid="scrolla-challenge-cta"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 px-6 py-3 font-display text-sm font-bold text-white shadow-cozy-lg disabled:opacity-70 sm:text-base"
            >
              {creatingScrolla ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Swords className="h-4 w-4" />
              )}
              <span>
                {creatingScrolla
                  ? lang === 'tr'
                    ? 'Scrolla Odası Kuruluyor...'
                    : 'Opening Scrolla Room...'
                  : lang === 'tr'
                    ? "Scrolla'da Meydan Oku"
                    : 'Challenge in Scrolla'}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase">
                1v1
              </span>
            </motion.button>

            <Link href={feedOpenHref} onClick={() => playPop(soundEnabled)}>
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.94 }}
                data-testid="seo-explore-cta"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 border-violet-300 bg-white px-5 py-3 font-display text-sm font-bold text-violet-900 shadow-sm hover:bg-violet-50 dark:border-violet-500/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 sm:text-base"
              >
                <Play className="h-4 w-4 fill-current text-violet-600 dark:text-violet-300" />
                <span>
                  {lang === 'tr' ? 'Bu Kartı Akışta Aç →' : 'Open in Interactive Feed →'}
                </span>
              </motion.span>
            </Link>

            <Link
              href={categoryHref}
              onClick={() => playPop(soundEnabled)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-violet-200 bg-white/90 px-4 py-2.5 text-xs font-extrabold text-violet-800 hover:bg-violet-50 dark:border-white/15 dark:bg-white/5 dark:text-violet-200 sm:text-sm"
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

        {/* Engaging Inline Topic Quiz Card */}
        <section
          data-testid="seo-mini-quiz"
          className="mt-6 rounded-3xl border-2 border-violet-200 bg-white p-6 shadow-cozy dark:border-violet-600/50 dark:bg-[#17122B] sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-lavender px-3 py-1 text-xs font-extrabold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
              <Brain className="h-3.5 w-3.5" />
              {t.seoMiniQuizTitle}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <Sparkles className="h-3 w-3" />
              {isCorrect ? '+25 XP ✓' : '+25 XP'}
            </span>
          </div>

          <h2 className="mt-3 font-display text-lg font-bold text-ink dark:text-white sm:text-xl">
            {content.quiz.question}
          </h2>

          <div className="mt-4 flex flex-col gap-2.5">
            {preparedQuiz.options.map((opt, idx) => {
              const selected = selectedOption === idx;
              const correctOpt = idx === preparedQuiz.correctIndex;
              let style =
                'border-slate-200 bg-slate-50/80 text-ink hover:border-violet-300 hover:bg-pastel-lavender/40 dark:border-white/15 dark:bg-white/5 dark:text-violet-100 dark:hover:border-violet-400';
              if (hasAnswered) {
                if (correctOpt) {
                  style =
                    'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold dark:border-emerald-500/70 dark:bg-emerald-950/60 dark:text-emerald-100';
                } else if (selected) {
                  style =
                    'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/70 dark:bg-rose-950/60 dark:text-rose-100';
                } else {
                  style =
                    'border-slate-100 bg-slate-50/40 text-ink/45 dark:border-white/5 dark:bg-white/5 dark:text-white/40';
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
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        hasAnswered && correctOpt
                          ? 'bg-emerald-600 text-white'
                          : hasAnswered && selected
                            ? 'bg-rose-500 text-white'
                            : 'bg-white text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200'
                      }`}
                    >
                      {optionLetters[idx] ?? idx + 1}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {hasAnswered && correctOpt && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {hasAnswered && selected && !correctOpt && (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 rounded-2xl p-4 text-xs sm:text-sm ${
                isCorrect
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/50 dark:text-emerald-100'
                  : 'border border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-700/50 dark:bg-rose-950/50 dark:text-rose-100'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold">
                  {isCorrect
                    ? `${t.quizCorrect} (+25 XP)`
                    : `${t.quizWrong} (+5 XP)`}
                </p>
                <span className="text-[11px] font-bold opacity-75">
                  {catMeta.emoji} {detailHighlights.topicTag}
                </span>
              </div>
              {content.quiz.explanation && (
                <p className="mt-1.5 leading-relaxed opacity-90">{content.quiz.explanation}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleScrollaChallenge}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-violet-700"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? "Scrolla'da Yarış" : 'Race in Scrolla'}</span>
                </button>
                <Link
                  href="/"
                  onClick={() => playPop(soundEnabled)}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-bold text-violet-800 hover:bg-violet-50 dark:border-white/15 dark:bg-white/10 dark:text-white"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Yeni Kartlar Keşfet' : 'Explore More'}</span>
                </Link>
              </div>
            </motion.div>
          )}
        </section>

        {/* Social Share Buttons Bar (WhatsApp, X, Copy Link) */}
        <div
          data-testid="single-fact-share-bar"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
        >
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/60 dark:text-violet-200/75">
            <Share2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
            <span>{lang === 'tr' ? 'Bu Bilgiyi Paylaş' : 'Share This Fact'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `${content.title} — https://scrolly.live${canonicalPath}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-whatsapp-btn"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(
                content.title
              )}&url=${encodeURIComponent(`https://scrolly.live${canonicalPath}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-x-btn"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:bg-slate-900/10 dark:bg-white/10 dark:text-white"
            >
              <span className="font-mono text-xs font-black leading-none">𝕏</span>
              <span>{lang === 'tr' ? "X'te Paylaş" : 'Post on X'}</span>
            </a>
            <button
              type="button"
              data-testid="share-copy-link-btn"
              onClick={() => {
                const url = `https://scrolly.live${canonicalPath}`;
                if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(url).catch(() => {});
                }
                setCopiedLink(true);
                window.setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-900/40 dark:text-violet-200"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  <span>{lang === 'tr' ? 'Kopyalandı!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Bağlantıyı Kopyala' : 'Copy Link'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compact GEO Question & Answer Knowledge Cards */}
        <section
          aria-labelledby="fact-qa-heading"
          className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#17122B] sm:p-6"
        >
          <h2
            id="fact-qa-heading"
            className="flex items-center gap-2 font-display text-base font-bold text-ink dark:text-white sm:text-lg"
          >
            <HelpCircle className="h-5 w-5 text-violet-600 dark:text-violet-300" />
            <span>
              {lang === 'tr'
                ? 'Hızlı Soru & Cevap Kartları'
                : 'Quick Q&A Knowledge Cards'}
            </span>
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {guessQaAnswer && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  {lang === 'tr' ? 'Tahmin Özeti' : 'Quick Guess'}
                </p>
                <p className="mt-1 text-xs font-extrabold text-ink dark:text-white">
                  {guessQaAnswer.prompt}
                </p>
                <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-amber-900 shadow-sm dark:bg-white/10 dark:text-amber-200">
                  {guessQaAnswer.answer}
                </p>
              </div>
            )}

            <div
              className={`rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-950/30 ${
                !guessQaAnswer ? 'sm:col-span-2' : ''
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-violet-800 dark:text-violet-300">
                {lang === 'tr' ? 'Bilgi Kontrolü' : 'Fact Check'}
              </p>
              <p className="mt-1 text-xs font-extrabold text-ink dark:text-white">
                {content.quiz.question}
              </p>
              <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold text-violet-900 shadow-sm dark:bg-white/10 dark:text-violet-200">
                {correctQuizAnswer}
              </p>
            </div>
          </div>
        </section>

        {/* Big Main Discovery CTA */}
        <div className="mt-7 text-center">
          <Link href="/" onClick={() => playPop(soundEnabled)}>
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.94 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-violet-300 bg-white px-7 py-3.5 font-display text-sm font-bold text-violet-900 shadow-sm hover:bg-violet-50 dark:border-violet-500/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 sm:text-base"
            >
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              <span>{t.seoCtaButton}</span>
            </motion.span>
          </Link>
        </div>

        {/* Related Facts (Same Category) */}
        {relatedFacts.length > 0 && (
          <section className="mt-10" aria-labelledby="related-facts-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id="related-facts-heading" className="font-display text-lg font-bold text-ink dark:text-white">
                {t.seoRelatedTitle}
              </h3>
              <Link
                href={categoryHref}
                className="text-xs font-extrabold text-violet-700 hover:underline dark:text-violet-300"
              >
                {lang === 'tr' ? 'Kategoriyi Gör →' : 'View Category →'}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedFacts.map((rel) => {
                const relMeta = getCategoryMeta(rel.category);
                const relSlug = getFactPrimarySlug(rel);
                const relHref = buildFactHref(relSlug, safeLang);
                const relSubIcon = CATEGORY_SUB_ICON_MAP[rel.category];
                return (
                  <Link
                    key={rel.id}
                    href={relHref}
                    onClick={() => playPop(soundEnabled)}
                    className={`flex flex-col justify-between rounded-2xl border ${relMeta.borderClass} bg-white p-4 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#17122B]`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={relSubIcon}
                            alt=""
                            aria-hidden="true"
                            width={24}
                            height={24}
                            decoding="async"
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                        <span className={`text-[11px] font-extrabold ${relMeta.accentText}`}>
                          {relMeta.label[lang]}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold leading-snug text-ink dark:text-white">
                        {rel[lang].title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-ink/65 dark:text-violet-200/75">
                        {rel[lang].factText}
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 dark:text-violet-300">
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
