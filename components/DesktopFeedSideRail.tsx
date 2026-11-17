'use client';

import React, { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Keyboard,
  Lock,
  Share2,
  Sparkles,
  Swords,
} from 'lucide-react';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import type { FeedSlideItem } from '@/components/TikTokFeed';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import type { VocabPartOfSpeech } from '@/types/vocabulary';
import { formatPhoneticForDisplay, safeExternalHref } from '@/utils/phoneticDisplay';

const PART_OF_SPEECH_LABELS: Record<VocabPartOfSpeech, { tr: string; en: string }> = {
  isim: { tr: 'İsim', en: 'Noun' },
  sıfat: { tr: 'Sıfat', en: 'Adjective' },
  fiil: { tr: 'Fiil', en: 'Verb' },
  zarf: { tr: 'Zarf', en: 'Adverb' },
  edat: { tr: 'Edat', en: 'Preposition' },
};

export type DesktopRailMode = 'cluster' | 'actions' | 'insight';

interface DesktopFeedSideRailProps {
  onPrev: () => void;
  onNext: () => void;
  lang: Language;
  darkMode: boolean;
  activeFact?: FactCard | null;
  activeSlide?: FeedSlideItem | null;
  isGuessLocked?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  likesCount?: number;
  onLike?: () => void;
  onSave?: () => void;
  onDetail?: () => void;
  onDuel?: () => void;
  onShare?: () => void;
  mode?: DesktopRailMode;
}

/**
 * Desktop vertical action column + up/down steppers immediately adjacent to the card,
 * paired on wide screens (`xl:`) with a non-duplicating Insight / Source & Keyboard Shortcuts panel.
 */
export default function DesktopFeedSideRail({
  onPrev,
  onNext,
  lang,
  darkMode,
  activeFact,
  activeSlide,
  isGuessLocked = false,
  isLiked = false,
  isSaved = false,
  likesCount = 0,
  onLike,
  onSave,
  onDetail,
  onDuel,
  onShare,
  mode = 'cluster',
}: DesktopFeedSideRailProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showActions = mode === 'cluster' || mode === 'actions';
  const showInsight = mode === 'cluster' || mode === 'insight';

  const stepBtn = darkMode
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
    : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] hover:bg-white shadow-sm';

  const actionBtn = darkMode
    ? 'border-white/15 bg-white/[0.08] text-white/90 hover:bg-white/15 hover:border-white/25'
    : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] hover:bg-white shadow-sm';

  const labelTone = darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75';
  const hasFact = Boolean(activeFact);
  const isVocab = activeSlide?.type === 'vocabulary';
  const canSave = Boolean(hasFact || isVocab);
  const canDetail = Boolean(hasFact || isVocab);
  const catMeta = activeFact ? getCategoryMeta(activeFact.category) : null;
  const localized = activeFact ? activeFact[lang] : null;
  const sourceName =
    localized?.sourceName ||
    activeFact?.sourceName ||
    localized?.sourceHint ||
    (lang === 'tr' ? 'Doğrulanmış Bilimsel Kaynak' : 'Verified Scientific Source');
  const sourceUrl = safeExternalHref(localized?.sourceUrl || activeFact?.sourceUrl);
  const hasGuessChallenge = Boolean(localized?.guessChallenge);
  const isAnalysisUnlocked = !hasGuessChallenge || isGuessLocked;
  const deepAnalysisText =
    localized?.deepDiveDetail ||
    localized?.quiz?.explanation ||
    (lang === 'tr'
      ? 'Bu kart için doğrulanmış bilimsel arka plan ve ek açıklamalar detay ekranında yer alır.'
      : 'Verified scientific context and deeper notes for this discovery are available in detail view.');
  const estimatedReadSec =
    activeFact?.readingTimeSec ??
    Math.max(15, Math.round((deepAnalysisText.split(/\s+/).filter(Boolean).length || 45) / 3));

  const slideSummary = (() => {
    if (activeFact && localized) {
      return {
        kind: 'fact' as const,
        badge: `${catMeta?.label[lang] || activeFact.category}`,
        badgeColor: activeFact.accentColor || '#7C3AED',
        xpLabel: '+15 XP',
      };
    }
    if (activeSlide?.type === 'vocabulary') {
      const card = activeSlide.card;
      const cefr = (card.cefrLevel || 'B2/C1').trim().toUpperCase();
      const localizedPos =
        PART_OF_SPEECH_LABELS[card.partOfSpeech]?.[lang] || card.partOfSpeech;
      const synonyms = (card.synonyms || [])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2);
      return {
        kind: 'other' as const,
        badge: lang === 'tr' ? 'Kelime Laboratuvarı' : 'Word Lab',
        badgeColor: '#6366F1',
        subLabel: [cefr, localizedPos, formatPhoneticForDisplay(card.phonetic)]
          .filter(Boolean)
          .join(' · '),
        definitionEn: card.definitionEn,
        exampleEn: card.exampleEn,
        synonyms,
        note:
          lang === 'tr'
            ? 'Bağlam cümlesini ve İngilizce tanımı incele; karttaki başlığa veya Detay butonuna dokunarak anlam testini aç.'
            : 'Review the English definition and context sentence, then tap the word header or Detail to open the meaning quiz.',
        xpLabel: '+15 XP',
      };
    }
    if (activeSlide?.type === 'quizCta') {
      return {
        kind: 'other' as const,
        badge: lang === 'tr' ? 'Hızlı Quiz' : 'Quick Quiz',
        badgeColor: '#F59E0B',
        subLabel: lang === 'tr' ? '5 Soruluk Hafıza Tekrarı' : '5-Question Memory Recall',
        note:
          lang === 'tr'
            ? 'Az önce incelediğin kartları hızlı tekrar ile pekiştirerek serini ve lig puanını yükselt.'
            : 'Reinforce the cards you just explored to boost your streak and league standing.',
        xpLabel: '+50 XP',
      };
    }
    if (activeSlide?.type === 'ad') {
      return {
        kind: 'other' as const,
        badge: lang === 'tr' ? 'Bilgi Molası' : 'Quick Break',
        badgeColor: '#0EA5E9',
        subLabel: lang === 'tr' ? 'Akış & Düello' : 'Feed & Scrolla',
        note:
          lang === 'tr'
            ? 'Yeni kategori kartları için aşağı kaydırabilir veya Scrolla 1v1 odası başlatabilirsin.'
            : 'Scroll down for more verified cards or launch a Scrolla 1v1 duel.',
        xpLabel: '1v1',
      };
    }
    return null;
  })();

  return (
    <div
      data-testid="desktop-feed-side-cluster"
      data-mode={mode}
      className={
        mode === 'insight'
          ? 'flex h-full min-h-0 w-full max-w-[340px] shrink-0 flex-col'
          : mode === 'actions'
            ? 'hidden shrink-0 items-center md:flex'
            : 'hidden shrink-0 items-center gap-5 lg:flex'
      }
    >
      {/* 1. Ordered action bar + Up/Down steppers (Like → Save → Detail → 1v1 → Share) */}
      {showActions && (
      <aside
        data-testid="desktop-feed-side-rail"
        data-theme={darkMode ? 'dark' : 'light'}
        className={`relative z-20 flex w-[128px] flex-col justify-center gap-2 rounded-2xl border p-2 backdrop-blur-xl ${
          darkMode ? 'border-white/12 bg-[#13131A]/85' : 'border-[#1E1B2E]/10 bg-white/90 shadow-sm'
        }`}
        aria-label={lang === 'tr' ? 'Kart aksiyonları ve kaydırma' : 'Card actions and navigation'}
      >
        {onLike && (
          <button
            type="button"
            data-testid="desktop-action-like"
            onClick={onLike}
            disabled={!hasFact}
            aria-label={lang === 'tr' ? 'Beğen' : 'Like'}
            className={`flex h-10 w-full items-center gap-2 rounded-xl border px-2.5 text-left text-[11px] font-extrabold transition ${
              !hasFact
                ? `${actionBtn} cursor-not-allowed opacity-35`
                : isLiked
                  ? 'border-rose-400/60 bg-rose-500 text-white shadow-md shadow-rose-500/25'
                  : actionBtn
            }`}
          >
            <Heart className={`h-4 w-4 shrink-0 ${isLiked && hasFact ? 'fill-current' : ''}`} />
            <span className="min-w-0 truncate">
              {hasFact && likesCount > 0 ? likesCount : lang === 'tr' ? 'Beğen' : 'Like'}
            </span>
          </button>
        )}

        {onSave && (
          <button
            type="button"
            data-testid="desktop-action-save"
            onClick={onSave}
            disabled={!canSave}
            aria-label={lang === 'tr' ? 'Kaydet' : 'Save'}
            className={`flex h-10 w-full items-center gap-2 rounded-xl border px-2.5 text-left text-[11px] font-extrabold transition ${
              !canSave
                ? `${actionBtn} cursor-not-allowed opacity-35`
                : isSaved
                  ? 'border-amber-400/60 bg-amber-400 text-[#09090B] shadow-md shadow-amber-400/25'
                  : actionBtn
            }`}
          >
            <Bookmark className={`h-4 w-4 shrink-0 ${isSaved && canSave ? 'fill-current' : ''}`} />
            <span className="min-w-0 truncate">{lang === 'tr' ? 'Kaydet' : 'Save'}</span>
          </button>
        )}

        {onDetail && (
          <button
            type="button"
            data-testid="desktop-action-detail"
            onClick={onDetail}
            disabled={!canDetail}
            aria-label={lang === 'tr' ? '3D Flip / Detay' : '3D Flip / Detail'}
            className={`flex h-10 w-full items-center gap-2 rounded-xl border px-2.5 text-left text-[11px] font-extrabold transition ${actionBtn} ${
              !canDetail ? 'cursor-not-allowed opacity-35' : ''
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{lang === 'tr' ? '3D Detay' : '3D Flip'}</span>
          </button>
        )}

        {onDuel && (
          <button
            type="button"
            data-testid="desktop-action-duel"
            onClick={onDuel}
            aria-label="Scrolla 1v1"
            className="flex h-10 w-full items-center gap-2 rounded-xl border border-violet-400/45 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 text-left text-[11px] font-extrabold text-white shadow-md shadow-violet-500/25 transition hover:brightness-110"
          >
            <Swords className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">1v1</span>
          </button>
        )}

        {onShare && (
          <button
            type="button"
            data-testid="desktop-action-share"
            onClick={onShare}
            disabled={!hasFact}
            aria-label={lang === 'tr' ? 'Paylaş' : 'Share'}
            className={`flex h-10 w-full items-center gap-2 rounded-xl border px-2.5 text-left text-[11px] font-extrabold transition ${actionBtn} ${
              !hasFact ? 'cursor-not-allowed opacity-35' : ''
            }`}
          >
            <Share2 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{lang === 'tr' ? 'Paylaş' : 'Share'}</span>
          </button>
        )}

        <div
          className={`my-0.5 h-px w-full ${darkMode ? 'bg-white/15' : 'bg-[#1E1B2E]/15'}`}
          aria-hidden="true"
        />

        <div className="mt-4 flex gap-1.5">
          <button
            type="button"
            data-testid="desktop-feed-prev"
            onClick={onPrev}
            aria-label={lang === 'tr' ? 'Önceki kart' : 'Previous card'}
            title="↑"
            className={`flex h-10 flex-1 items-center justify-center rounded-xl border transition ${stepBtn}`}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            data-testid="desktop-feed-next"
            onClick={onNext}
            aria-label={lang === 'tr' ? 'Sonraki kart' : 'Next card'}
            title="↓"
            className={`flex h-10 flex-1 items-center justify-center rounded-xl border transition ${stepBtn}`}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
        <p className={`px-1 text-center text-[9px] font-bold uppercase tracking-wide ${labelTone}`}>
          ↑ ↓
        </p>
      </aside>
      )}

      {/* 2. Insight / Source panel — xl column or drawer host */}
      {showInsight && slideSummary && (
        <aside
          data-testid="desktop-info-shortcut-panel"
          className={`flex w-full max-w-[340px] shrink-0 flex-col gap-3 overflow-y-auto rounded-3xl border p-4 backdrop-blur-xl ${
            mode === 'cluster' ? 'hidden xl:flex' : 'flex h-full max-h-[min(92dvh,920px)]'
          } ${
            darkMode
              ? 'border-white/15 bg-[#13131A]/95 text-white shadow-2xl'
              : 'border-[#1E1B2E]/10 bg-white/95 text-[#1E1B2E] shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm"
              style={{ backgroundColor: slideSummary.badgeColor }}
            >
              <span>{slideSummary.badge}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums ${
                darkMode ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Sparkles className={`h-3 w-3 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>{slideSummary.xpLabel}</span>
            </span>
          </div>

          <div>
            <p
              data-testid="desktop-insight-heading"
              className={`text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'text-white/65' : 'text-[#1E1B2E]/65'
              }`}
            >
              {lang === 'tr' ? 'KART DETAYI & KAYNAK' : 'INSIGHT & SOURCE'}
            </p>

            {slideSummary.kind === 'fact' ? (
              !isAnalysisUnlocked ? (
                <div
                  data-testid="desktop-insight-locked"
                  className={`mt-2 rounded-2xl border p-3.5 backdrop-blur-md ${
                    darkMode
                      ? 'border-white/15 bg-white/[0.06] text-white/85'
                      : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.04] text-[#1E1B2E]/85'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Lock className={`mt-0.5 h-4 w-4 shrink-0 ${darkMode ? 'text-violet-300' : 'text-violet-600'}`} />
                    <p className="text-xs font-semibold leading-relaxed">
                      {lang === 'tr'
                        ? 'Tahminini kilitle: derin analiz ve bilimsel arka plan burada açılacak'
                        : 'Lock your guess: deep analysis & scientific context will unlock here'}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        darkMode ? 'bg-white/10 text-white/70' : 'bg-white text-[#1E1B2E]/70 shadow-sm'
                      }`}
                    >
                      {lang === 'tr' ? `~${estimatedReadSec} sn derin okuma` : `~${estimatedReadSec}s deep read`}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  data-testid="desktop-insight-unlocked"
                  className={`mt-2 rounded-2xl border p-3 ${
                    darkMode
                      ? 'border-emerald-400/20 bg-emerald-500/[0.08]'
                      : 'border-emerald-600/15 bg-emerald-50/70'
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      darkMode ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    {lang === 'tr' ? 'Bilimsel Arka Plan' : 'Scientific Context'}
                  </p>
                  <p
                    data-scroll-contain="true"
                    onWheel={(e) => {
                      const el = e.currentTarget;
                      if (el.scrollHeight > el.clientHeight + 1) e.stopPropagation();
                    }}
                    style={{ overscrollBehavior: 'contain' }}
                    className={`mt-1.5 max-h-[210px] overflow-y-auto pr-1 text-xs font-medium leading-relaxed ${
                      darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                    }`}
                  >
                    {deepAnalysisText}
                  </p>
                </div>
              )
            ) : (
              <div className="mt-2 space-y-2">
                {slideSummary.subLabel && (
                  <p className={`text-[11px] font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    {slideSummary.subLabel}
                  </p>
                )}
                {'definitionEn' in slideSummary && slideSummary.definitionEn && (
                  <div
                    className={`rounded-xl border px-2.5 py-2 ${
                      darkMode
                        ? 'border-white/10 bg-white/[0.04]'
                        : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.03]'
                    }`}
                  >
                    <p
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        darkMode ? 'text-white/50' : 'text-[#1E1B2E]/55'
                      }`}
                    >
                      {lang === 'tr' ? 'İngilizce Tanım' : 'English Definition'}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-semibold leading-snug ${
                        darkMode ? 'text-white/90' : 'text-[#1E1B2E]/90'
                      }`}
                    >
                      {slideSummary.definitionEn}
                    </p>
                  </div>
                )}
                {'exampleEn' in slideSummary && slideSummary.exampleEn && (
                  <div
                    className={`rounded-xl border px-2.5 py-2 ${
                      darkMode
                        ? 'border-indigo-400/20 bg-indigo-500/[0.08]'
                        : 'border-indigo-200 bg-indigo-50/70'
                    }`}
                  >
                    <p
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        darkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}
                    >
                      {lang === 'tr' ? 'Örnek Kullanım' : 'Usage Context'}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-medium italic leading-snug ${
                        darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                      }`}
                    >
                      “{slideSummary.exampleEn}”
                    </p>
                  </div>
                )}
                <p
                  className={`text-xs font-medium leading-relaxed ${
                    darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'
                  }`}
                >
                  {slideSummary.note}
                </p>
                {'synonyms' in slideSummary &&
                  slideSummary.synonyms &&
                  slideSummary.synonyms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          darkMode ? 'text-white/50' : 'text-[#1E1B2E]/55'
                        }`}
                      >
                        {lang === 'tr' ? 'Eş Anlam:' : 'Synonyms:'}
                      </span>
                      {slideSummary.synonyms.map((syn) => (
                        <span
                          key={syn}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            darkMode
                              ? 'border-indigo-400/30 bg-indigo-500/20 text-indigo-200'
                              : 'border-indigo-300 bg-indigo-50 text-indigo-800'
                          }`}
                        >
                          ≈ {syn}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>

          {hasFact && (
            <div
              className={`rounded-2xl border px-3 py-2.5 ${
                darkMode
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.03]'
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-wider ${
                  darkMode ? 'text-white' : 'text-ink'
                }`}
              >
                {lang === 'tr' ? 'Kaynak' : 'Source'}
              </p>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-flex items-center gap-1.5 text-xs font-bold underline decoration-dotted underline-offset-4 transition ${
                    darkMode ? 'text-sky-300 hover:text-sky-200' : 'text-violet-700 hover:text-violet-900'
                  }`}
                >
                  <span className="line-clamp-1">{sourceName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <p className="mt-1 text-xs font-bold">{sourceName}</p>
              )}
              <div
                className={`mt-2.5 flex items-center justify-between gap-2 border-t pt-2 ${
                  darkMode ? 'border-white/10' : 'border-[#1E1B2E]/10'
                }`}
              >
                <PoweredByGiphyBadge compact lang={lang} />
              </div>
            </div>
          )}

          <div
            className={`rounded-2xl border px-3 py-2.5 ${
              darkMode
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.03]'
            }`}
          >
            <button
              type="button"
              data-testid="desktop-shortcuts-toggle"
              onClick={() => setShortcutsOpen((open) => !open)}
              aria-expanded={shortcutsOpen}
              className={`flex w-full items-center justify-between gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5" />
                <span>{lang === 'tr' ? 'Klavye Kısayolları' : 'Keyboard Shortcuts'}</span>
              </span>
              {shortcutsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {shortcutsOpen && (
            <ul className="mt-2 space-y-1.5 text-[11px] font-semibold">
              <li className="flex items-center justify-between gap-2">
                <span className={darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'}>
                  {lang === 'tr' ? 'Geç' : 'Next / Prev'}
                </span>
                <kbd
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    darkMode
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
                  }`}
                >
                  ↑ / ↓
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className={darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'}>
                  {lang === 'tr' ? 'Beğen' : 'Like'}
                </span>
                <kbd
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    darkMode
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
                  }`}
                >
                  {lang === 'tr' ? 'Çift Tık' : 'Double Tap'}
                </kbd>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className={darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'}>
                  {lang === 'tr' ? 'Çevir (Detay)' : 'Flip Detail'}
                </span>
                <kbd
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    darkMode
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-[#1E1B2E]/15 bg-white text-[#1E1B2E]'
                  }`}
                >
                  Space
                </kbd>
              </li>
            </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
