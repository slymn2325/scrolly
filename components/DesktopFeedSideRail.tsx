'use client';

import React from 'react';
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
import type { FeedSlideItem } from '@/components/TikTokFeed';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';

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
}: DesktopFeedSideRailProps) {
  const stepBtn = darkMode
    ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
    : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] hover:bg-white shadow-sm';

  const actionBtn = darkMode
    ? 'border-white/15 bg-white/[0.08] text-white/90 hover:bg-white/15 hover:border-white/25'
    : 'border-[#1E1B2E]/15 bg-white/95 text-[#1E1B2E] hover:bg-white shadow-sm';

  const labelTone = darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75';
  const hasFact = Boolean(activeFact);
  const catMeta = activeFact ? getCategoryMeta(activeFact.category) : null;
  const localized = activeFact ? activeFact[lang] : null;
  const sourceName =
    localized?.sourceName ||
    activeFact?.sourceName ||
    localized?.sourceHint ||
    (lang === 'tr' ? 'Doğrulanmış Bilimsel Kaynak' : 'Verified Scientific Source');
  const sourceUrl = localized?.sourceUrl || activeFact?.sourceUrl;
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
        badge: `${catMeta?.emoji || activeFact.emoji || '✨'} ${catMeta?.label[lang] || activeFact.category}`,
        badgeColor: activeFact.accentColor || '#7C3AED',
        xpLabel: '+15 XP',
      };
    }
    if (activeSlide?.type === 'vocabulary') {
      return {
        kind: 'other' as const,
        badge: lang === 'tr' ? '📚 İngilizce Kelime' : '📚 Vocabulary Card',
        badgeColor: '#6366F1',
        subLabel: [activeSlide.card.partOfSpeech, activeSlide.card.phonetic].filter(Boolean).join(' · '),
        note:
          lang === 'tr'
            ? 'Bağlamdaki boşluğu tamamla, telaffuzu dinle ve kelimeyi kişisel defterine kaydet.'
            : 'Complete the contextual fill-in, listen to pronunciation, and save to your notebook.',
        xpLabel: '+15 XP',
      };
    }
    if (activeSlide?.type === 'quizCta') {
      return {
        kind: 'other' as const,
        badge: lang === 'tr' ? '⚡ Hızlı Quiz' : '⚡ Quick Quiz',
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
        badge: lang === 'tr' ? '✨ Bilgi Molası' : '✨ Quick Break',
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
      className="hidden shrink-0 items-center gap-5 lg:flex"
    >
      {/* 1. Card-Adjacent Action Column + Up/Down Steppers */}
      <aside
        data-testid="desktop-feed-side-rail"
        data-theme={darkMode ? 'dark' : 'light'}
        className="relative z-20 flex flex-col items-center justify-center gap-3"
        aria-label={lang === 'tr' ? 'Kart aksiyonları ve kaydırma' : 'Card actions and navigation'}
      >
        {onLike && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="desktop-action-like"
              onClick={onLike}
              disabled={!hasFact}
              aria-label={lang === 'tr' ? 'Beğen' : 'Like'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${
                !hasFact
                  ? `${actionBtn} cursor-not-allowed opacity-35`
                  : isLiked
                    ? 'border-rose-400/60 bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : actionBtn
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked && hasFact ? 'fill-current' : ''}`} />
            </button>
            <span className={`text-[10px] font-extrabold tabular-nums ${labelTone}`}>
              {hasFact && likesCount > 0 ? likesCount : lang === 'tr' ? 'Beğen' : 'Like'}
            </span>
          </div>
        )}

        {onSave && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="desktop-action-save"
              onClick={onSave}
              disabled={!hasFact}
              aria-label={lang === 'tr' ? 'Kaydet' : 'Save'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${
                !hasFact
                  ? `${actionBtn} cursor-not-allowed opacity-35`
                  : isSaved
                    ? 'border-amber-400/60 bg-amber-400 text-[#09090B] shadow-lg shadow-amber-400/30'
                    : actionBtn
              }`}
            >
              <Bookmark className={`h-5 w-5 ${isSaved && hasFact ? 'fill-current' : ''}`} />
            </button>
            <span className={`text-[10px] font-extrabold ${labelTone}`}>
              {lang === 'tr' ? 'Kaydet' : 'Save'}
            </span>
          </div>
        )}

        {onDetail && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="desktop-action-detail"
              onClick={onDetail}
              disabled={!hasFact}
              aria-label={lang === 'tr' ? 'Detay' : 'Detail'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${actionBtn} ${
                !hasFact ? 'cursor-not-allowed opacity-35' : ''
              }`}
            >
              <BookOpen className="h-5 w-5" />
            </button>
            <span className={`text-[10px] font-extrabold ${labelTone}`}>
              {lang === 'tr' ? 'Detay' : 'Detail'}
            </span>
          </div>
        )}

        {onDuel && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="desktop-action-duel"
              onClick={onDuel}
              aria-label="Scrolla"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/50 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105"
            >
              <Swords className="h-5 w-5" />
            </button>
            <span className={`text-[10px] font-extrabold ${labelTone}`}>Scrolla</span>
          </div>
        )}

        {onShare && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="desktop-action-share"
              onClick={onShare}
              disabled={!hasFact}
              aria-label={lang === 'tr' ? 'Paylaş' : 'Share'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${actionBtn} ${
                !hasFact ? 'cursor-not-allowed opacity-35' : ''
              }`}
            >
              <Share2 className="h-5 w-5" />
            </button>
            <span className={`text-[10px] font-extrabold ${labelTone}`}>
              {lang === 'tr' ? 'Paylaş' : 'Share'}
            </span>
          </div>
        )}

        <div
          className={`my-1 h-px w-7 ${darkMode ? 'bg-white/15' : 'bg-[#1E1B2E]/15'}`}
          aria-hidden="true"
        />

        <button
          type="button"
          data-testid="desktop-feed-prev"
          onClick={onPrev}
          aria-label={lang === 'tr' ? 'Önceki kart' : 'Previous card'}
          className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition ${stepBtn}`}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          data-testid="desktop-feed-next"
          onClick={onNext}
          aria-label={lang === 'tr' ? 'Sonraki kart' : 'Next card'}
          className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition ${stepBtn}`}
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </aside>

      {/* 2. Large Desktop Right Panel (xl:): Non-Duplicating Insight / Source & Keyboard Shortcuts */}
      {slideSummary && (
        <aside
          data-testid="desktop-info-shortcut-panel"
          className={`hidden w-[300px] shrink-0 flex-col gap-3 rounded-3xl border p-4 backdrop-blur-xl xl:flex ${
            darkMode
              ? 'border-white/15 bg-black/45 text-white shadow-2xl'
              : 'border-[#1E1B2E]/10 bg-white/90 text-[#1E1B2E] shadow-xl'
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
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
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
                darkMode ? 'text-white/50' : 'text-[#1E1B2E]/55'
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
                        ? '🔒 Tahminini kilitle — derin analiz ve bilimsel arka plan burada açılacak'
                        : '🔒 Lock your guess — deep analysis & scientific context will unlock here'}
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
                    className={`mt-1.5 max-h-[210px] overflow-y-auto pr-1 text-xs font-medium leading-relaxed ${
                      darkMode ? 'text-white/85' : 'text-[#1E1B2E]/85'
                    }`}
                  >
                    {deepAnalysisText}
                  </p>
                </div>
              )
            ) : (
              <div className="mt-2">
                {slideSummary.subLabel && (
                  <p className={`text-[11px] font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    {slideSummary.subLabel}
                  </p>
                )}
                <p
                  className={`mt-1 text-xs font-medium leading-relaxed ${
                    darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'
                  }`}
                >
                  {slideSummary.note}
                </p>
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
                  darkMode ? 'text-white/45' : 'text-[#1E1B2E]/50'
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
            </div>
          )}

          <div
            className={`rounded-2xl border px-3 py-2.5 ${
              darkMode
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-[#1E1B2E]/10 bg-[#1E1B2E]/[0.03]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'text-white/55' : 'text-[#1E1B2E]/55'
              }`}
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>{lang === 'tr' ? 'Klavye Kısayolları' : 'Keyboard Shortcuts'}</span>
            </div>
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
          </div>
        </aside>
      )}
    </div>
  );
}
