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
import CardMediaStage from '@/components/CardMediaStage';
import CategoryMotionArt from '@/components/CategoryMotionArt';
import DeferredAdSense from '@/components/DeferredAdSense';
import FactIcon from '@/components/FactIcon';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import StickyAdBanner from '@/components/StickyAdBanner';
import { discoveryCtaLabel, getCategoryMeta, type Language, translations } from '@/i18n/translations';
import { detectMediaProvider, mediaCreditLine } from '@/lib/mediaProvider';
import { formatValueWithUnit } from '@/lib/formatUnit';
import { fetchTopicGifFromApi, syncProfileToApi, trackEvent } from '@/lib/telemetry';
import { writeLanguageCookie } from '@/lib/locale';
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
} from '@/utils/fluentAssets';
import { safeExternalHref } from '@/utils/phoneticDisplay';
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
  catalogCount: number;
  articleBody?: string;
}

interface BreakdownCardItem {
  id: string;
  indexLabel: string;
  title: string;
  body: string;
  kind: 'mechanism' | 'context' | 'evidence';
}

function normalizeDetailCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function withoutRepeatedInsight(segment: string, keyInsight: string): string {
  const insight = normalizeDetailCopy(keyInsight);
  const trimmed = segment.trim();
  if (!trimmed) return '';
  if (!insight) return trimmed;
  if (normalizeDetailCopy(trimmed) === insight) return '';
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length === 0) return trimmed;
  const kept = sentences.filter((sentence) => normalizeDetailCopy(sentence) !== insight);
  if (kept.length === 0) return '';
  if (kept.length === sentences.length) return trimmed;
  return kept.join(' ');
}

function buildBreakdownCards(
  articleText: string,
  category: FactCard['category'],
  lang: Language,
  keyInsight: string
): BreakdownCardItem[] {
  const rawParagraphs = articleText
    .split(/\n{2,}/)
    .map((paragraph) => withoutRepeatedInsight(paragraph, keyInsight))
    .filter(Boolean);

  let segments = [...rawParagraphs];
  if (segments.length === 1 && segments[0].length > 170) {
    const sentences = segments[0].split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length >= 2) {
      const mid = Math.ceil(sentences.length / 2);
      segments = [sentences.slice(0, mid).join(' '), sentences.slice(mid).join(' ')].filter(Boolean);
    }
  }
  segments = segments
    .map((segment) => withoutRepeatedInsight(segment, keyInsight))
    .filter((segment, index, list) => {
      const norm = normalizeDetailCopy(segment);
      if (!norm) return false;
      return list.findIndex((item) => normalizeDetailCopy(item) === norm) === index;
    });

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
  catalogCount,
  articleBody = '',
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
  const resolvedSourceUrl = safeExternalHref(content.sourceUrl || fact.sourceUrl);
  const mediaCredit = mediaCreditLine(
    detectMediaProvider({
      gifUrl: resolvedGifUrl || fact.gifUrl,
      posterUrl: fact.posterUrl,
      mediaSource: fact.mediaSource,
      mediaProvider: fact.mediaSource,
    }),
    lang
  );

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
          articleBody,
          tag: content.tag,
          sourceHint: content.sourceHint,
          quiz: content.quiz,
        },
        lang
      ),
    [
      articleBody,
      content.factText,
      content.deepDiveDetail,
      content.tag,
      content.sourceHint,
      content.quiz,
      lang,
    ]
  );

  const breakdownCards = useMemo(
    () =>
      detailArticle.isLongForm
        ? []
        : buildBreakdownCards(
            detailArticle.article,
            fact.category,
            lang,
            detailHighlights.keyInsight
          ),
    [detailArticle.article, detailArticle.isLongForm, detailHighlights.keyInsight, fact.category, lang]
  );

  const longFormParagraphs = useMemo(
    () =>
      detailArticle.isLongForm
        ? detailArticle.article
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
        : [],
    [detailArticle.article, detailArticle.isLongForm]
  );

  const insightNorm = normalizeDetailCopy(detailHighlights.keyInsight);
  const insightAlreadyVisible =
    insightNorm.length > 0 &&
    (normalizeDetailCopy(content.factText).includes(insightNorm) ||
      longFormParagraphs.some((paragraph) => normalizeDetailCopy(paragraph).includes(insightNorm)) ||
      breakdownCards.some((card) => normalizeDetailCopy(card.body).includes(insightNorm)));

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

  const blufLeadText = useMemo(() => {
    const base = content.factText.trim();
    const countWords = (str: string) => str.split(/\s+/).filter(Boolean).length;
    if (countWords(base) >= 35) return base;

    const deepSentences = (content.deepDiveDetail || '')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    let combined = base;
    for (const sentence of deepSentences) {
      if (normalizeDetailCopy(combined).includes(normalizeDetailCopy(sentence))) continue;
      const next = `${combined} ${sentence}`.trim();
      if (countWords(next) > 62 && countWords(combined) >= 28) break;
      combined = next;
      if (countWords(combined) >= 35) break;
    }
    return combined;
  }, [content.factText, content.deepDiveDetail]);

  const handleLangSwitch = (targetLang: Language) => {
    const safeLang: 'tr' | 'en' = targetLang === 'en' ? 'en' : 'tr';
    vibrateTap(12);
    playPop(soundEnabled);
    writeLanguageCookie(safeLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = safeLang;
    }
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
        const colors = ['--cik-cta', '--cik-mint', '--cik-butter']
          .map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim())
          .filter(Boolean);
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.72 },
          ...(colors.length > 0 ? { colors } : {}),
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
    <div className="relative min-h-screen bg-cik-bg pb-24 text-cik-text">
      <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
        <div className="mx-auto flex max-w-[42.5rem] items-center justify-between gap-2 px-4 py-3">
          <Link
            href={feedOpenHref}
            onClick={() => {
              vibrateTap(12);
              playPop(soundEnabled);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-3.5 py-1.5 text-xs font-bold text-cik-text shadow-e1 hover:bg-cik-butter sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.backToFeed}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Gamified XP Counter */}
            <span className="hidden items-center gap-1 rounded-pill border border-cik-line bg-cik-pink px-3 py-1 text-xs font-black text-cik-cta sm:inline-flex">
              <img src={UI_ICON_PATHS.xpSparkles} alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
              <span>{userXp} XP</span>
            </span>

            {/* TR | EN Switcher */}
            <div className="inline-flex items-center rounded-pill border border-cik-line bg-cik-surface p-0.5 shadow-e1">
              {(['tr', 'en'] as Language[]).map((code) => {
                const active = lang === code;
                return (
                  <motion.button
                    key={code}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleLangSwitch(code)}
                    data-testid={`seo-lang-${code}`}
                    className={`rounded-pill px-2.5 py-1 text-xs font-extrabold uppercase ${
                      active
                        ? 'bg-cik-cta text-cik-on-cta'
                        : 'text-cik-text hover:text-cik-text'
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
              className={`flex h-9 w-9 items-center justify-center rounded-pill border shadow-e1 ${
                soundEnabled
                  ? 'border-cik-line bg-cik-pink text-cik-mint-text'
                  : 'border-cik-line bg-cik-surface text-cik-text'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[42.5rem] px-4 pt-6">
        {/* Semantic Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-cik-text"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-cik-cta hover:underline"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{lang === 'tr' ? 'Ana Sayfa' : 'Home'}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-cik-text" />
          <Link
            href={categoryHref}
            className="inline-flex items-center gap-1 hover:text-cik-cta hover:underline"
          >
            <span>{catMeta.emoji}</span>
            <span>{catMeta.label[lang]}</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-cik-text" />
          <span className="truncate font-bold text-cik-text">{content.title}</span>
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
          className={`relative overflow-hidden rounded-sticker border-2 border-cik-line p-5 sm:p-8`}
        >
          {/* Subtle category color aura glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-pill opacity-25 blur-3xl"
            style={{ backgroundColor: fact.accentColor }}
          />

          {/* Top Meta Chips + Save Button */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryHref}
                className={`inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-3.5 py-1 text-xs font-extrabold text-cik-cta hover:opacity-90`}
              >
                <span>{catMeta.emoji}</span>
                <span>{catMeta.label[lang]}</span>
              </Link>
              <span
                className="inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-extrabold text-cik-text shadow-sm"
                style={{ backgroundColor: fact.accentColor || 'var(--cik-cta)' }}
              >
                <Sparkles className="h-3 w-3" />
                <span>{detailHighlights.topicTag}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-pill bg-cik-surface px-3 py-1 text-xs font-bold text-cik-text">
                <Clock className="h-3.5 w-3.5" />
                {fact.readingTimeSec ?? 20} {t.seoReadingTime}
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                isFavorite
                  ? 'border-cik-line bg-cik-rose text-cik-text'
                  : 'border-cik-line bg-cik-surface text-cik-text hover:text-cik-rose-text'
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
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-cik-surface shadow-sm sm:h-16 sm:w-16"
            >
              <FactIcon name={fact.iconName} className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="cik-title-1 text-cik-text">
                {content.title}
              </h1>
              <p
                data-geo-summary="true"
                className="cik-body mt-3 text-cik-text"
              >
                <span>{blufLeadText}</span>
                {resolvedSourceUrl ? (
                  <>
                    {' '}
                    <a
                      href={resolvedSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="bluf-primary-source-link"
                      className="inline-flex items-center gap-1 font-extrabold text-cik-cta underline underline-offset-2"
                    >
                      <span>({resolvedSourceName || (lang === 'tr' ? 'Birincil Kaynak' : 'Primary Source')})</span>
                      <ExternalLink className="inline h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </>
                ) : resolvedSourceName ? (
                  <span className="ml-1 font-bold text-cik-text-2">
                    ({resolvedSourceName})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Interactive Bounded Visual Showcase: Cached GIF + Motion Canvas + SVG/PNG Illustration */}
          <div
            data-testid="detail-visual-stage"
            className="relative mt-6 h-60 w-full overflow-hidden rounded-sticker border border-cik-line bg-cik-bg shadow-e1 sm:h-72"
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
              <CardMediaStage
                url={resolvedGifUrl}
                posterUrl={fact.posterUrl}
                mediaType={fact.mediaType}
                mediaSource={fact.mediaSource}
                isActive
                priority
                testId="detail-gif-preview"
                title={content.title}
                failed={gifFailed}
                onFailed={() => setGifFailed(true)}
              />
            )}

            {/* Dark Readability Scrim */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-content bg-cik-bg/20"
            />

            {/* Top HUD Pills */}
            <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2 p-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-3 py-1 cik-caption-2 font-extrabold text-cik-text backdrop-blur-md">
                {resolvedGifUrl && !gifFailed ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-cik-mint-text" />
                    <span>{lang === 'tr' ? 'Görsel' : 'Visual'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-cik-butter-text" />
                    <span>{lang === 'tr' ? 'Etkileşimli Sahne' : 'Interactive Scene'}</span>
                  </>
                )}
              </span>

              {fact.visualQuery && (
                <span className="hidden rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 cik-caption-2 font-bold uppercase tracking-wider text-cik-text backdrop-blur-md sm:inline-flex">
                  {fact.visualQuery}
                </span>
              )}
            </div>

            {/* Bottom HUD: Category Illustration + Hook */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cik-line bg-cik-surface p-1.5 backdrop-blur-md">
                  <img
                    src={catIllustration}
                    alt={catMeta.label[lang]}
                    className="h-9 w-9 object-contain drop-shadow"
                  />
                </div>
                <div className="min-w-0 text-cik-text">
                  <p className="cik-caption-2 font-black uppercase tracking-wider text-cik-butter-text">
                    {fact.emoji ?? catMeta.emoji} {detailHighlights.topicTag}
                  </p>
                  <p className="line-clamp-1 text-xs font-bold text-cik-text sm:text-sm">
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
            className={`relative z-10 mt-6 grid gap-3 ${
              insightAlreadyVisible ? 'grid-cols-1' : 'sm:grid-cols-2'
            }`}
          >
            {/* Card 1: Interactive Key Number / Guess Challenge */}
            <div
              className={`rounded-2xl border border-cik-line bg-cik-surface p-4 shadow-sm ${
                insightAlreadyVisible ? 'col-span-full' : 'sm:col-span-1'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="inline-flex items-center gap-1 cik-caption-2 font-black uppercase tracking-wider text-cik-butter-text">
                  <Target className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Kilit Sayı / Tahmin' : 'Key Metric'}</span>
                </span>
                <span className="rounded-pill bg-cik-butter px-2 py-0.5 cik-caption-2 font-black text-cik-butter-text">
                  +20 XP
                </span>
              </div>

              {guessQaAnswer ? (
                <div className="mt-2">
                  <p className="text-xs font-bold leading-snug text-cik-text">
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
                            className="rounded-xl border border-cik-line bg-cik-butter px-2.5 py-1.5 text-left text-xs font-bold text-cik-text transition hover:bg-cik-butter"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-cik-cta">
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
                          className="w-full rounded-xl bg-cik-butter px-3 py-1.5 text-xs font-extrabold text-cik-text shadow-sm hover:bg-cik-butter"
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
                      className="mt-2.5 rounded-xl border border-cik-line bg-cik-mint p-2.5"
                    >
                      <p className="cik-caption-2 font-black uppercase tracking-wider text-cik-mint-text">
                        {lang === 'tr' ? 'Gerçek Değer' : 'Verified Number'}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-extrabold text-cik-mint-text">
                        {guessQaAnswer.answer}
                      </p>
                      {guessSelectedBinary !== null && (
                        <p className="mt-0.5 cik-caption-2 font-semibold text-cik-mint-text">
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
                <p className="mt-2 text-xs font-semibold leading-relaxed text-cik-text">
                  {detailHighlights.curiosityHook}
                </p>
              )}
            </div>

            {/* Card 2: Key Mechanism / Insight. Hidden when that sentence is already in the body. */}
            {insightAlreadyVisible ? null : (
            <div className="rounded-2xl border border-cik-line bg-cik-surface p-4 shadow-sm sm:col-span-1">
              <span className="inline-flex items-center gap-1 cik-caption-2 font-black uppercase tracking-wider text-cik-cta">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{lang === 'tr' ? 'Kilit Mekanizma' : 'Key Insight'}</span>
              </span>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-cik-text sm:cik-footnote">
                {detailHighlights.keyInsight}
              </p>
            </div>
            )}

            {/* Card 3: Quick Stats & Category Rank */}
            <div className="hidden">
              <div>
                <span className="inline-flex items-center gap-1 cik-caption-2 font-black uppercase tracking-wider text-cik-mint-text">
                  <Flame className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Keşif Özeti' : 'Discovery Snapshot'}</span>
                </span>
                <p className="mt-2 flex items-center gap-2 font-display text-base font-bold text-cik-text">
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
                <p className="mt-1 text-xs font-semibold text-cik-text">
                  {detailHighlights.topicTag}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-cik-line pt-2.5 cik-caption-2 font-extrabold text-cik-text">
                <span className="inline-flex items-center gap-1 rounded-pill bg-cik-mint px-2 py-0.5 text-cik-mint-text">
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
                <span className="rounded-pill bg-cik-pink px-2 py-0.5 text-cik-cta">
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
              className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cik-cta"
            >
              <Microscope className="h-4 w-4" />
              <span>{t.whyHowHeader}</span>
            </h2>

            {longFormParagraphs.length > 0 ? (
              <div className="rounded-2xl border border-cik-line bg-cik-surface p-4 shadow-sm sm:p-5">
                {longFormParagraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className="mt-3 text-sm leading-relaxed text-cik-text first:mt-0 sm:cik-subhead"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3">
              {breakdownCards.map((card) => (
                <div
                  key={card.id}
                  style={{ borderLeftColor: fact.accentColor || 'var(--cik-cta)' }}
                  className="rounded-2xl border border-l-4 border-cik-line bg-cik-surface p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: `${fact.accentColor}22`, color: fact.accentColor }}
                      className="inline-flex h-6 items-center justify-center rounded-pill px-2 cik-caption-2 font-black"
                    >
                      {card.indexLabel}
                    </span>
                    <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-cik-text sm:text-base">
                      {card.kind === 'mechanism' ? (
                        <Microscope className="h-4 w-4 text-cik-cta" />
                      ) : card.kind === 'context' ? (
                        <Sparkles className="h-4 w-4 text-cik-butter-text" />
                      ) : (
                        <Layers className="h-4 w-4 text-cik-mint-text" />
                      )}
                      <span>{card.title}</span>
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-cik-text sm:cik-subhead">
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
              data-testid="detail-source-card"
              className="group relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cik-line bg-cik-mint px-4 py-3.5 text-xs font-semibold text-cik-mint-text transition hover:border-cik-line hover:bg-cik-mint"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cik-surface shadow-sm">
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
                  <div className="flex items-center gap-1.5 cik-caption-2 font-extrabold uppercase tracking-wider text-cik-mint-text">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{t.seoVerifiedSource}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-cik-text">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-cik-butter-text" />
                    <span>{resolvedSourceName}</span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-cik-surface px-3.5 py-2 text-xs font-extrabold text-cik-cta shadow-sm ring-1 ring-cik-focus transition group-hover:bg-cik-pink group-hover:text-cik-text">
                <span>{t.verifySourceCta}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          ) : (
            <aside
              data-testid="detail-source-card"
              className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cik-line bg-cik-mint px-4 py-3.5 text-xs font-semibold text-cik-mint-text"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cik-mint text-cik-mint-text">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="cik-caption-2 font-extrabold uppercase tracking-wider text-cik-mint-text">
                    {t.seoVerifiedSource}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-cik-text">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-cik-butter-text" />
                    <span>{resolvedSourceName}</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
          {mediaCredit ? (
            <p data-testid="detail-media-credit" className="relative z-10 mt-2 text-xs font-bold text-cik-text">
              {mediaCredit}
            </p>
          ) : null}
        </motion.article>

        {/* Gamified Primary CTAs: Scrolla Challenge + Open in Feed */}
        <div className="mt-6 rounded-sticker border border-cik-line bg-cik-pink p-5 text-center shadow-e1">
          <p className="inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-cik-cta">
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
          <p className="mt-1 text-sm font-medium text-cik-text">
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
              className="cik-headline inline-flex min-h-12 items-center gap-2 rounded-pill bg-cik-cta px-6 py-3 text-cik-on-cta shadow-sticker disabled:opacity-40"
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
              <span className="rounded-pill bg-cik-surface px-2 py-0.5 cik-caption-2 font-black uppercase">
                1v1
              </span>
            </motion.button>

            <Link href={feedOpenHref} onClick={() => playPop(soundEnabled)}>
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.94 }}
                data-testid="seo-explore-cta"
                className="inline-flex min-h-12 items-center gap-2 rounded-pill border-2 border-cik-line bg-cik-surface px-5 py-3 font-display text-sm font-bold text-cik-cta shadow-sm hover:bg-cik-pink sm:text-base"
              >
                <Play className="h-4 w-4 fill-current text-cik-cta" />
                <span>
                  {lang === 'tr' ? 'Bu Kartı Akışta Aç →' : 'Open in Interactive Feed →'}
                </span>
              </motion.span>
            </Link>

            <Link
              href={categoryHref}
              onClick={() => playPop(soundEnabled)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-4 py-2.5 text-xs font-extrabold text-cik-cta hover:bg-cik-pink sm:text-sm"
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
          className="mt-6 rounded-sticker border-2 border-cik-line bg-cik-surface p-6 shadow-e1 sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-3 py-1 text-xs font-extrabold text-cik-cta">
              <Brain className="h-3.5 w-3.5" />
              {t.seoMiniQuizTitle}
            </span>
            <span className="inline-flex items-center gap-1 rounded-pill bg-cik-butter px-2.5 py-1 cik-caption-2 font-black text-cik-butter-text">
              <Sparkles className="h-3 w-3" />
              {isCorrect ? '+25 XP ✓' : '+25 XP'}
            </span>
          </div>

          <h2 className="mt-3 font-display text-lg font-bold text-cik-text sm:text-xl">
            {content.quiz.question}
          </h2>

          <div className="mt-4 flex flex-col gap-2.5">
            {preparedQuiz.options.map((opt, idx) => {
              const selected = selectedOption === idx;
              const correctOpt = idx === preparedQuiz.correctIndex;
              let style =
                'border-cik-line bg-cik-surface-2 text-cik-text hover:border-cik-line hover:bg-cik-pink/40';
              if (hasAnswered) {
                if (correctOpt) {
                  style =
                    'border-cik-line bg-cik-mint text-cik-mint-text font-bold';
                } else if (selected) {
                  style =
                    'border-cik-line bg-cik-rose text-cik-rose-text';
                } else {
                  style =
                    'border-cik-line bg-cik-surface-2 text-cik-text';
                }
              }

              return (
                <motion.button
                  key={idx}
                  type="button"
                  whileTap={!hasAnswered ? { scale: 0.97 } : undefined}
                  disabled={hasAnswered}
                  onClick={() => handleSelectQuizOption(idx)}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cik-focus whitespace-normal break-words leading-snug ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        hasAnswered && correctOpt
                          ? 'bg-cik-mint text-cik-text'
                          : hasAnswered && selected
                            ? 'bg-cik-rose text-cik-text'
                            : 'bg-cik-surface text-cik-cta shadow-sm'
                      }`}
                    >
                      {optionLetters[idx] ?? idx + 1}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {hasAnswered && correctOpt && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-cik-mint-text" />
                  )}
                  {hasAnswered && selected && !correctOpt && (
                    <XCircle className="h-5 w-5 shrink-0 text-cik-rose-text" />
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
                  ? 'border border-cik-line bg-cik-mint text-cik-mint-text'
                  : 'border border-cik-line bg-cik-rose text-cik-rose-text'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold">
                  {isCorrect
                    ? `${t.quizCorrect} (+25 XP)`
                    : `${t.quizWrong} (+5 XP)`}
                </p>
                <span className="cik-caption-2 font-bold opacity-75">
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
                  className="inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-3.5 py-1.5 text-xs font-extrabold text-cik-text shadow-sm hover:bg-cik-pink"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? "Scrolla'da Yarış" : 'Race in Scrolla'}</span>
                </button>
                <Link
                  href="/"
                  onClick={() => playPop(soundEnabled)}
                  className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-3.5 py-1.5 text-xs font-bold text-cik-cta hover:bg-cik-pink"
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
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-cik-surface px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cik-text">
            <Share2 className="h-3.5 w-3.5 text-cik-cta" />
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
              className="inline-flex items-center gap-1.5 rounded-pill bg-cik-mint px-3.5 py-2 text-xs font-bold text-cik-mint-text transition-colors hover:bg-cik-mint"
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
              className="inline-flex items-center gap-1.5 rounded-pill bg-cik-surface-2 px-3.5 py-2 text-xs font-bold text-cik-text transition-colors hover:bg-cik-surface-2"
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
              className="inline-flex items-center gap-1.5 rounded-pill border border-cik-line bg-cik-pink px-3.5 py-2 text-xs font-bold text-cik-cta transition-colors hover:bg-cik-pink"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-cik-mint-text" />
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
          className="mt-6 rounded-sticker border border-cik-line bg-cik-surface p-5 shadow-sm sm:p-6"
        >
          <h2
            id="fact-qa-heading"
            className="flex items-center gap-2 font-display text-base font-bold text-cik-text sm:text-lg"
          >
            <HelpCircle className="h-5 w-5 text-cik-cta" />
            <span>
              {lang === 'tr'
                ? 'Hızlı Soru & Cevap Kartları'
                : 'Quick Q&A Knowledge Cards'}
            </span>
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {guessQaAnswer && (
              <div className="rounded-2xl border border-cik-line bg-cik-butter p-4">
                <p className="cik-caption-2 font-black uppercase tracking-wider text-cik-butter-text">
                  {lang === 'tr' ? 'Tahmin Özeti' : 'Quick Guess'}
                </p>
                <p className="mt-1 text-xs font-extrabold text-cik-text">
                  {guessQaAnswer.prompt}
                </p>
                <p className="mt-2 inline-block rounded-pill bg-cik-surface px-3 py-1 text-xs font-extrabold text-cik-butter-text shadow-sm">
                  {guessQaAnswer.answer}
                </p>
              </div>
            )}

            <div
              className={`rounded-2xl border border-cik-line bg-cik-pink p-4 ${
                !guessQaAnswer ? 'sm:col-span-2' : ''
              }`}
            >
              <p className="cik-caption-2 font-black uppercase tracking-wider text-cik-cta">
                {lang === 'tr' ? 'Bilgi Kontrolü' : 'Fact Check'}
              </p>
              <p className="mt-1 text-xs font-extrabold text-cik-text">
                {content.quiz.question}
              </p>
              <p className="mt-2 inline-block rounded-pill bg-cik-surface px-3 py-1 text-xs font-extrabold text-cik-cta shadow-sm">
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
              className="inline-flex items-center gap-2.5 rounded-pill border border-cik-line bg-cik-surface px-7 py-3.5 font-display text-sm font-bold text-cik-cta shadow-sm hover:bg-cik-pink sm:text-base"
            >
              <Sparkles className="h-4 w-4 text-cik-cta" />
              <span>{discoveryCtaLabel(lang, catalogCount)}</span>
            </motion.span>
          </Link>
        </div>

        {/* Related Facts (Same Category) */}
        {relatedFacts.length > 0 && (
          <section className="mt-10" aria-labelledby="related-facts-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id="related-facts-heading" className="font-display text-lg font-bold text-cik-text">
                {t.seoRelatedTitle}
              </h3>
              <Link
                href={categoryHref}
                className="text-xs font-extrabold text-cik-cta hover:underline"
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
                    className={`flex flex-col justify-between rounded-2xl border border-cik-line bg-cik-surface p-4 shadow-sm transition-transform hover:-translate-y-0.5`}
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
                        <span className={`cik-caption-2 font-extrabold text-cik-cta`}>
                          {relMeta.label[lang]}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold leading-snug text-cik-text">
                        {rel[lang].title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-cik-text">
                        {rel[lang].factText}
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cik-cta">
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

      <DeferredAdSense />
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
