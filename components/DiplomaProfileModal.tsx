'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useEscapeClose } from '@/utils/useEscapeClose';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Bookmark,
  BookMarked,
  Download,
  ExternalLink,
  Heart,
  RotateCcw,
  Share2,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { checkIsStandalone } from '@/components/PwaInstallPrompt';
import TopicRadarChart from '@/components/TopicRadarChart';
import {
  CATEGORIES,
  FEED_EXPERIENCE_COPY,
  type CategoryFilter,
  type CategoryId,
  getCategoryMeta,
  type Language,
  translations,
  VOCABULARY_META,
} from '@/i18n/translations';
import { generateDiplomaCertificateImage } from '@/utils/diplomaCanvasGenerator';
import {
  buildFactHref,
  type FactCard,
  getFactPrimarySlug,
} from '@/utils/factsData';
import { DOCK_ICON_MAP, UI_ICON_PATHS } from '@/utils/icons8Assets';
import { loadLikedFactIds, removeLikedFact } from '@/utils/likedFacts';
import {
  loadSavedFactIds,
  removeSavedFact,
  SAVED_FACTS_UPDATED_EVENT,
} from '@/utils/savedFacts';
import { getLeagueInfo, type UserMemoryState } from '@/utils/userMemory';
import type { SavedVocabularyEntry, VocabPartOfSpeech } from '@/types/vocabulary';
import {
  loadSavedVocabNotebook,
  removeSavedVocabWord,
  speakVocabularyText,
} from '@/utils/vocabNotebook';

const VOCAB_POS_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

interface FactArchiveSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  testId: string;
  emptyText: string;
  facts: FactCard[];
  lang: Language;
  removeTestIdPrefix: string;
  removeAriaVerb: string;
  onButtonPop: () => void;
  onRemoveFact: (factId: string) => void;
}

function FactArchiveSection({
  title,
  count,
  icon,
  testId,
  emptyText,
  facts,
  lang,
  removeTestIdPrefix,
  removeAriaVerb,
  onButtonPop,
  onRemoveFact,
}: FactArchiveSectionProps) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
        {icon}
        <span>
          {title} ({count})
        </span>
      </h3>
      <div data-testid={testId}>
        {facts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-medium text-ink/60 dark:border-white/20 dark:text-violet-200/60">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-2">
            {facts.map((fact) => (
              <div
                key={fact.id}
                className="flex items-start justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-xs font-bold text-ink shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <Link
                  href={buildFactHref(getFactPrimarySlug(fact), lang)}
                  onClick={onButtonPop}
                  className="min-w-0 flex-1 line-clamp-2 transition hover:text-violet-700 dark:hover:text-violet-200"
                >
                  {fact.emoji} {fact[lang].title}
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5 text-ink/45 dark:text-violet-300" aria-hidden />
                  <button
                    type="button"
                    data-testid={`${removeTestIdPrefix}-${fact.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onButtonPop();
                      onRemoveFact(fact.id);
                    }}
                    aria-label={`${fact[lang].title} ${removeAriaVerb}`}
                    className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DiplomaProfileModalProps {
  open: boolean;
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  presentation?: 'modal' | 'page';
  onUpdateNickname: (nick: string) => void;
  onToggleNotifications: () => void;
  onSelectCategoryFromConstellation: (category: CategoryId) => void;
  onRemoveFavorite: (factId: string) => void;
  onResetMemory: () => void;
  onRequestPwaInstall?: () => void;
  onClose: () => void;
  onButtonPop: () => void;
  onCelebrateLeague: () => void;
}

export default function DiplomaProfileModal({
  open,
  lang,
  memory,
  allFacts,
  presentation = 'modal',
  onUpdateNickname,
  onToggleNotifications,
  onSelectCategoryFromConstellation,
  onRemoveFavorite,
  onResetMemory,
  onRequestPwaInstall,
  onClose,
  onButtonPop,
  onCelebrateLeague,
}: DiplomaProfileModalProps) {
  const isPage = presentation === 'page';
  const [justReset, setJustReset] = useState(false);
  const [exportingDiploma, setExportingDiploma] = useState(false);
  const [diplomaStatusMsg, setDiplomaStatusMsg] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [savedVocab, setSavedVocab] = useState<SavedVocabularyEntry[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];
  const copy = FEED_EXPERIENCE_COPY[lang];
  const league = getLeagueInfo(memory.xp, lang);

  useEffect(() => {
    setIsStandalone(checkIsStandalone());
    if (!open) return;
    const resetTop = () => {
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTop = 0;
      }
    };
    resetTop();
    const rafId = requestAnimationFrame(resetTop);
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const syncVocab = () => setSavedVocab(loadSavedVocabNotebook());
    const syncSaved = () => setSavedIds(loadSavedFactIds());
    const syncLikes = () => setLikedIds(loadLikedFactIds());
    syncVocab();
    syncSaved();
    syncLikes();
    window.addEventListener('scrolly-vocab-updated', syncVocab);
    window.addEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
    window.addEventListener('scrolly-liked-facts-updated', syncLikes);
    return () => {
      window.removeEventListener('scrolly-vocab-updated', syncVocab);
      window.removeEventListener(SAVED_FACTS_UPDATED_EVENT, syncSaved);
      window.removeEventListener('scrolly-liked-facts-updated', syncLikes);
    };
  }, [open]);

  useEscapeClose(open && !isPage, onClose);

  const savedIdSet = new Set([...savedIds, ...memory.favoriteIds]);
  const likedIdSet = new Set(likedIds);
  const savedFacts = allFacts.filter((f) => savedIdSet.has(f.id));
  const likedFacts = allFacts.filter((f) => likedIdSet.has(f.id));
  const categoryList = CATEGORIES.filter((c) => c.id !== 'all');
  const affinityCategories = [...categoryList, VOCABULARY_META];
  const getAffinityWeight = (catId: CategoryFilter): number => {
    if (catId === 'vocabulary') {
      return Math.max(memory.categoryWeights.vocabulary ?? 0, savedVocab.length);
    }
    return memory.categoryWeights[catId as CategoryId] ?? 0;
  };
  const maxWeight = Math.max(1, ...affinityCategories.map((c) => getAffinityWeight(c.id)));

  const handleCelebrate = () => {
    onButtonPop();
    onCelebrateLeague();
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.5 },
      });
    } catch {
      // Ignore confetti issues in headless mode
    }
  };

  const triggerDiplomaDownload = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `scrolly-diploma-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setDiplomaStatusMsg(t.diplomaDownloadedToast);
    setTimeout(() => setDiplomaStatusMsg(null), 2400);
  };

  const handleDownloadDiploma = async () => {
    if (exportingDiploma) return;
    onButtonPop();
    setExportingDiploma(true);
    try {
      const asset = await generateDiplomaCertificateImage(memory, allFacts, lang);
      triggerDiplomaDownload(asset.dataUrl);
    } finally {
      setExportingDiploma(false);
    }
  };

  const handleShareDiploma = async () => {
    if (exportingDiploma) return;
    onButtonPop();
    setExportingDiploma(true);
    try {
      const asset = await generateDiplomaCertificateImage(memory, allFacts, lang);
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [asset.file] }) &&
        typeof navigator.share === 'function'
      ) {
        try {
          await navigator.share({
            files: [asset.file],
            title: `${t.brandName} — ${t.diplomaTitle}`,
            text: `${memory.nickname} • ${league.label} (${memory.xp} XP)`,
          });
          return;
        } catch {
          // User dismissed share or share unavailable -> fallback to PNG download
        }
      }
      triggerDiplomaDownload(asset.dataUrl);
    } finally {
      setExportingDiploma(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          role={isPage ? 'region' : 'dialog'}
          aria-modal={isPage ? undefined : true}
          aria-label={t.diplomaTitle}
          data-testid="diploma-modal"
          data-presentation={presentation}
          className={
            isPage
              ? 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] dark:bg-[#171228]'
              : 'absolute inset-0 z-20 flex h-full w-full flex-col bg-[#FFFDF9] dark:bg-[#171228]'
          }
        >
          <motion.div
            initial={isPage ? { opacity: 0, x: 12 } : { opacity: 0, scale: 0.92, y: 18 }}
            animate={isPage ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isPage ? { opacity: 0, x: 8 } : { opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={
              isPage
                ? 'relative flex h-full w-full flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom,16px)+100px)] lg:pb-0'
                : 'relative mb-[92px] flex max-h-[82dvh] w-full max-w-[430px] md:max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-amber-200 bg-[#FFFDF9] shadow-2xl dark:border-violet-700/50 dark:bg-[#171228]'
            }
          >
            {/* Header */}
            <div
              className={`flex shrink-0 items-center justify-between border-b border-amber-100 px-5 pb-4 dark:border-white/10 ${
                isPage ? 'pt-[calc(env(safe-area-inset-top,20px)+16px)] lg:pt-4' : 'pt-4'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 p-1.5 dark:bg-violet-900/60">
                  <img
                    src={DOCK_ICON_MAP.diploma}
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <h2 className="font-display text-lg font-bold text-ink dark:text-white">
                  {t.diplomaTitle}
                </h2>
              </div>

              {!isPage && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  onButtonPop();
                  onClose();
                }}
                aria-label="Close"
                data-testid="diploma-close-btn"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-ink/75 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
              )}
            </div>

            {/* Scrollable Body */}
            <div
              ref={scrollBodyRef}
              data-testid="diploma-scroll-body"
              className={`no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-4 ${
                isPage ? 'pb-8 lg:pb-6' : 'pb-5'
              }`}
            >
              {/* Explorer Nickname */}
              <div>
                <label
                  htmlFor="diploma-nickname-input"
                  className="block text-xs font-extrabold text-ink/70 dark:text-violet-200/80"
                >
                  {t.diplomaNickLabel}
                </label>
                <input
                  id="diploma-nickname-input"
                  type="text"
                  data-testid="diploma-nickname-input"
                  value={memory.nickname}
                  onChange={(e) => onUpdateNickname(e.target.value)}
                  maxLength={24}
                  className="mt-1.5 w-full rounded-2xl border border-amber-200 bg-white px-3.5 py-2 text-sm font-bold text-ink outline-none focus:border-violet-500 dark:border-white/15 dark:bg-white/10 dark:text-white"
                />
              </div>

              {/* Weekly League Diploma Certificate Card */}
              <div
                data-testid="weekly-diploma-card"
                className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-4 text-center shadow-sm dark:border-amber-600/50 dark:from-[#261D3A] dark:via-[#1B162D] dark:to-[#1F2937]"
              >
                <img
                  src={UI_ICON_PATHS.verifiedSeal}
                  alt=""
                  aria-hidden="true"
                  className="absolute right-3 top-3 h-8 w-8 object-contain opacity-90 drop-shadow-sm"
                />
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {t.diplomaWeeklyCert}
                </p>
                <div className="my-2 flex justify-center">
                  <img
                    src={league.shieldIcon}
                    alt={league.label}
                    data-testid="diploma-league-shield"
                    className="h-14 w-14 object-contain drop-shadow-md"
                  />
                </div>
                <h3 className="font-display text-xl font-bold text-ink dark:text-white">
                  {league.label}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-ink/70 dark:text-violet-200/80">
                  {memory.nickname} • {memory.xp} XP
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={handleCelebrate}
                    data-testid="diploma-celebrate-btn"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-2 text-xs font-black text-ink shadow-sm hover:bg-amber-300 whitespace-normal break-words leading-snug"
                  >
                    <span>{t.diplomaCelebrateBtn}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={exportingDiploma}
                    onClick={handleDownloadDiploma}
                    data-testid="diploma-download-btn"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-black text-white shadow-sm hover:opacity-90 disabled:opacity-60 dark:bg-violet-600 whitespace-normal break-words leading-snug"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.diplomaDownloadPngBtn}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={exportingDiploma}
                    onClick={handleShareDiploma}
                    data-testid="diploma-share-btn"
                    className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-ink/20 bg-white/85 px-3.5 py-2 text-xs font-black text-ink shadow-sm hover:bg-white disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white whitespace-normal break-words leading-snug"
                  >
                    <Share2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.diplomaSharePngBtn}</span>
                  </motion.button>
                </div>

                {diplomaStatusMsg && (
                  <p
                    data-testid="diploma-status-toast"
                    className="mt-2 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300"
                  >
                    ✓ {diplomaStatusMsg}
                  </p>
                )}
              </div>

              {/* Interactive 7-Axis DataMB Topic Radar */}
              <TopicRadarChart
                lang={lang}
                memory={memory}
                allFacts={allFacts}
                onExploreCategory={(cat) => {
                  onClose();
                  onSelectCategoryFromConstellation(cat);
                }}
                onButtonPop={onButtonPop}
              />

              {/* Key Metrics Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3 text-center dark:border-white/10 dark:bg-white/5">
                  <img
                    src={UI_ICON_PATHS.xpSparkles}
                    alt=""
                    aria-hidden="true"
                    className="mx-auto h-5 w-5 object-contain"
                  />
                  <p className="mt-1 text-lg font-extrabold text-ink dark:text-white">{memory.xp}</p>
                  <p className="text-[10px] font-bold text-ink/60 dark:text-violet-200/70">XP</p>
                </div>
                <div className="rounded-2xl border border-violet-200/70 bg-pastel-lavender/50 p-3 text-center dark:border-white/10 dark:bg-white/5">
                  <img
                    src={UI_ICON_PATHS.verifiedSeal}
                    alt=""
                    aria-hidden="true"
                    className="mx-auto h-5 w-5 object-contain"
                  />
                  <p className="mt-1 text-lg font-extrabold text-ink dark:text-white">
                    {memory.seenIds.length}
                  </p>
                  <p className="text-[10px] font-bold text-ink/60 dark:text-violet-200/70">
                    {t.drawerDiscovered}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200/70 bg-pastel-coral/50 p-3 text-center dark:border-white/10 dark:bg-white/5">
                  <img
                    src={UI_ICON_PATHS.streakFire}
                    alt=""
                    aria-hidden="true"
                    className="mx-auto h-5 w-5 object-contain"
                  />
                  <p className="mt-1 text-lg font-extrabold text-ink dark:text-white">
                    {memory.streakDays}
                  </p>
                  <p className="text-[10px] font-bold text-ink/60 dark:text-violet-200/70">
                    {t.drawerStreak}
                  </p>
                </div>
              </div>

              {/* Category Badges */}
              <div>
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
                  {t.drawerBadges} ({memory.badges.length})
                </h3>
                {memory.badges.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-medium text-ink/60 dark:border-white/20 dark:text-violet-200/60">
                    {t.drawerNoBadges}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {memory.badges.map((badgeId) => {
                      const meta = getCategoryMeta(badgeId);
                      return (
                        <span
                          key={badgeId}
                          className={`inline-flex items-center gap-1.5 rounded-full ${meta.bgClass} px-2.5 py-1 text-[11px] font-bold ${meta.accentText}`}
                        >
                          <img
                            src={meta.iconPath}
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4 object-contain"
                          />
                          <span>{meta.badge[lang]}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Topic Affinity (all 7 fact categories + Language Learning) */}
              <div>
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
                  {t.drawerAffinity}
                </h3>
                <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  {affinityCategories.map((cat) => {
                    const weight = getAffinityWeight(cat.id);
                    const pct = Math.round((weight / maxWeight) * 100);
                    return (
                      <div key={cat.id} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] font-bold text-ink/80 dark:text-violet-100">
                          <span className="inline-flex items-center gap-1.5">
                            <img
                              src={cat.iconPath}
                              alt=""
                              aria-hidden="true"
                              className="h-4 w-4 object-contain"
                            />
                            <span>{cat.label[lang]}</span>
                          </span>
                          <span>{weight}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            style={{ width: `${Math.max(4, pct)}%` }}
                            className={`h-full rounded-full ${cat.accentBg}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 1. Saved Facts Archive (🔖) */}
              <FactArchiveSection
                title={t.diplomaSavedArchive}
                count={savedFacts.length}
                icon={<Bookmark className="h-3.5 w-3.5 text-amber-500" />}
                testId="diploma-saved-list"
                emptyText={t.diplomaNoSavedFacts}
                facts={savedFacts}
                lang={lang}
                removeTestIdPrefix="diploma-unsave"
                removeAriaVerb={lang === 'tr' ? 'kaydını kaldır' : 'remove from saved'}
                onButtonPop={onButtonPop}
                onRemoveFact={(factId) => {
                  removeSavedFact(factId);
                  setSavedIds(loadSavedFactIds());
                  if (memory.favoriteIds.includes(factId)) {
                    onRemoveFavorite(factId);
                  }
                }}
              />

              {/* 2. Double-Tap / ❤️ Liked Facts Archive */}
              <FactArchiveSection
                title={t.diplomaLikedArchive}
                count={likedFacts.length}
                icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
                testId="diploma-liked-list"
                emptyText={t.diplomaNoLikedFacts}
                facts={likedFacts}
                lang={lang}
                removeTestIdPrefix="diploma-unlike"
                removeAriaVerb={lang === 'tr' ? 'beğenisini kaldır' : 'remove from likes'}
                onButtonPop={onButtonPop}
                onRemoveFact={(factId) => {
                  removeLikedFact(factId);
                  setLikedIds(loadLikedFactIds());
                }}
              />

              {/* Kelime Defteri */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/65 dark:text-violet-200/70">
                  <BookMarked className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    {copy.vocabNotebookTitle} ({savedVocab.length})
                  </span>
                </h3>
                <div data-testid="diploma-vocab-notebook">
                  {savedVocab.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 p-3 text-xs font-medium text-ink/60 dark:border-white/20 dark:text-violet-200/60">
                      {lang === 'tr'
                        ? 'Henüz kelime kaydetmedin. Kelime kartlarında sağdaki Kaydet (🔖) butonuna dokun.'
                        : 'No saved words yet. Tap Save (🔖) on Vocabulary cards.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {savedVocab.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs dark:border-indigo-400/20 dark:bg-indigo-950/40"
                        >
                          <div className="min-w-0">
                            <p className="font-black text-indigo-800 dark:text-indigo-200">
                              {entry.word}{' '}
                              <span className="font-mono text-[10px] font-semibold text-slate-500">
                                {entry.phonetic}
                              </span>
                            </p>
                            <p className="font-bold text-emerald-700 dark:text-emerald-300">
                              {entry.meaningTr} ·{' '}
                              {VOCAB_POS_LABELS[entry.partOfSpeech]?.[lang] ?? entry.partOfSpeech}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                              {entry.exampleEn}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onButtonPop();
                                speakVocabularyText(entry.word, 'en-US', 0.9);
                              }}
                              aria-label={`${copy.listenEn}: ${entry.word}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              data-testid={`diploma-vocab-remove-${entry.id}`}
                              onClick={() => {
                                onButtonPop();
                                setSavedVocab(removeSavedVocabWord(entry.word));
                              }}
                              aria-label={
                                lang === 'tr'
                                  ? `${entry.word} kelimesini defterden sil`
                                  : `Remove ${entry.word} from notebook`
                              }
                              className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications Toggle */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onButtonPop();
                  onToggleNotifications();
                }}
                data-testid="diploma-notifications-btn"
                className="flex w-full min-h-[48px] items-center justify-between gap-2 rounded-2xl border border-violet-200 bg-pastel-lavender/40 px-4 py-2.5 text-left text-xs font-extrabold text-violet-950 dark:border-violet-700/50 dark:bg-violet-950/40 dark:text-violet-100 whitespace-normal break-words leading-snug"
              >
                <span className="inline-flex items-center gap-2">
                  {memory.notificationsEnabled ? (
                    <Bell className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <BellOff className="h-4 w-4 shrink-0 text-ink/50 dark:text-violet-300" />
                  )}
                  <span>{t.diplomaNotificationsLabel}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-ink shadow-sm dark:bg-white/10 dark:text-white">
                  {memory.notificationsEnabled
                    ? t.diplomaNotificationsOn
                    : t.diplomaNotificationsOff}
                </span>
              </motion.button>

              {/* Scroll-bottom Profile Reset & Trust Links (visible when scrolled to bottom) */}
              <div className="mt-6 rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                {justReset && (
                  <p className="mb-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t.drawerResetConfirm}
                  </p>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onButtonPop();
                    onResetMemory();
                    setSavedIds([]);
                    setLikedIds([]);
                    setSavedVocab([]);
                    setJustReset(true);
                    setTimeout(() => setJustReset(false), 3000);
                  }}
                  data-testid="diploma-reset-btn"
                  className="relative z-20 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300 whitespace-normal break-words leading-snug"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t.drawerReset}</span>
                </motion.button>

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                {onRequestPwaInstall && (
                  <button
                    type="button"
                    onClick={() => {
                      onButtonPop();
                      onRequestPwaInstall();
                    }}
                    data-testid="diploma-pwa-install-link"
                    className={`cursor-pointer text-[11px] font-extrabold underline underline-offset-4 transition ${
                      isStandalone
                        ? 'text-emerald-600 decoration-emerald-400/50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200'
                        : 'text-violet-700 decoration-violet-400/40 hover:text-violet-900 dark:text-violet-300 dark:hover:text-white'
                    }`}
                  >
                    {isStandalone ? t.pwaInstalledBtn : t.pwaManualInstallLink}
                  </button>
                )}

                <Link
                  href="/privacy"
                  onClick={() => {
                    onButtonPop();
                    onClose();
                  }}
                  data-testid="diploma-privacy-link"
                  className="text-[11px] font-bold text-ink/55 underline decoration-ink/25 underline-offset-4 transition hover:text-ink dark:text-violet-200/65 dark:decoration-violet-300/30 dark:hover:text-white"
                >
                  {lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
                </Link>
                <span className="inline-flex flex-wrap items-center justify-center gap-1">
                  <Link
                    href={lang === 'en' ? '/contact?lang=en' : '/contact'}
                    onClick={() => {
                      onButtonPop();
                      onClose();
                    }}
                    data-testid="diploma-contact-link"
                    className="text-[11px] font-bold text-ink/55 underline decoration-ink/25 underline-offset-4 transition hover:text-ink dark:text-violet-200/65 dark:decoration-violet-300/30 dark:hover:text-white"
                  >
                    {lang === 'tr' ? 'İletişim' : 'Contact'}
                  </Link>
                  <a
                    href="mailto:contact@scrolly.live"
                    data-testid="diploma-contact-email"
                    className="text-[11px] font-extrabold text-violet-700 underline decoration-violet-400/40 underline-offset-4 transition hover:text-violet-900 dark:text-violet-300 dark:hover:text-white"
                  >
                    (contact@scrolly.live)
                  </a>
                </span>
                <Link
                  href={lang === 'en' ? '/about?lang=en' : '/about'}
                  onClick={() => {
                    onButtonPop();
                    onClose();
                  }}
                  className="text-[11px] font-bold text-ink/55 underline decoration-ink/25 underline-offset-4 transition hover:text-ink dark:text-violet-200/65 dark:decoration-violet-300/30 dark:hover:text-white"
                >
                  {lang === 'tr' ? 'Hakkımızda' : 'About'}
                </Link>
                <Link
                  href={lang === 'en' ? '/terms?lang=en' : '/terms'}
                  onClick={() => {
                    onButtonPop();
                    onClose();
                  }}
                  className="text-[11px] font-bold text-ink/55 underline decoration-ink/25 underline-offset-4 transition hover:text-ink dark:text-violet-200/65 dark:decoration-violet-300/30 dark:hover:text-white"
                >
                  {lang === 'tr' ? 'Kullanım Koşulları' : 'Terms'}
                </Link>
              </div>
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
