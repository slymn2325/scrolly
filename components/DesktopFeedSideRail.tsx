'use client';

import React, { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Keyboard,
  Lock,
  RotateCw,
  Share,
  Sparkles,
} from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import MediaAttributionBadge from '@/components/MediaAttributionBadge';
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
  onShare,
  mode = 'cluster',
}: DesktopFeedSideRailProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showActions = mode === 'cluster' || mode === 'actions';
  const showInsight = mode === 'cluster' || mode === 'insight';

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

  const hintText = localized?.guessChallenge?.prompt
    ? localized.guessChallenge.prompt
    : lang === 'tr'
      ? 'İpucu cevabı söylemez. Tahminini kilitle, sonra detayı aç.'
      : 'The hint does not give the answer. Lock a guess, then open detail.';

  return (
    <div
      data-testid="desktop-feed-side-cluster"
      data-mode={mode}
      className={
        mode === 'insight'
          ? 'flex h-full min-h-0 w-full shrink-0 flex-col'
          : mode === 'actions'
            ? 'hidden shrink-0 flex-col items-center justify-center self-center gap-3 md:flex'
            : 'hidden shrink-0 flex-col items-center justify-center self-center gap-3 lg:flex'
      }
    >
      {showActions && (
      <aside
        data-testid="desktop-feed-side-rail"
        data-theme={darkMode ? 'dark' : 'light'}
        className="relative flex w-11 shrink-0 flex-col items-center justify-center gap-3 self-center"
        aria-label={lang === 'tr' ? 'Kart aksiyonları ve kaydırma' : 'Card actions and navigation'}
      >
        {onLike && (
          <IconButton
            label={
              likesCount > 0
                ? `${lang === 'tr' ? 'Beğen' : 'Like'} ${likesCount}`
                : lang === 'tr'
                  ? 'Beğen'
                  : 'Like'
            }
            data-testid="desktop-action-like"
            onClick={onLike}
            disabled={!hasFact}
            aria-pressed={isLiked}
            className={isLiked && hasFact ? 'bg-cik-cta text-cik-on-cta' : 'disabled:opacity-40'}
          >
            <Heart size={24} strokeWidth={2} className={isLiked && hasFact ? 'fill-current' : ''} />
          </IconButton>
        )}
        {onSave && (
          <IconButton
            label={lang === 'tr' ? 'Kaydet' : 'Save'}
            data-testid="desktop-action-save"
            onClick={onSave}
            disabled={!canSave}
            aria-pressed={isSaved}
            className={isSaved && canSave ? 'bg-cik-butter text-cik-butter-text' : 'disabled:opacity-40'}
          >
            <Bookmark size={24} strokeWidth={2} className={isSaved && canSave ? 'fill-current' : ''} />
          </IconButton>
        )}
        {onDetail && (
          <IconButton
            label={lang === 'tr' ? 'Detay' : 'Detail'}
            data-testid="desktop-action-detail"
            onClick={onDetail}
            disabled={!canDetail}
            className="disabled:opacity-40"
          >
            <RotateCw size={24} strokeWidth={2} />
          </IconButton>
        )}
        {onShare && (
          <IconButton
            label={lang === 'tr' ? 'Paylaş' : 'Share'}
            data-testid="desktop-action-share"
            onClick={onShare}
            disabled={!hasFact}
            className="disabled:opacity-40"
          >
            <Share size={24} strokeWidth={2} />
          </IconButton>
        )}
        <IconButton
          label={lang === 'tr' ? 'Önceki kart' : 'Previous card'}
          data-testid="desktop-feed-prev"
          onClick={onPrev}
        >
          <ChevronUp size={24} strokeWidth={2} />
        </IconButton>
        <IconButton
          label={lang === 'tr' ? 'Sonraki kart' : 'Next card'}
          data-testid="desktop-feed-next"
          onClick={onNext}
        >
          <ChevronDown size={24} strokeWidth={2} />
        </IconButton>
      </aside>
      )}

      {showInsight && slideSummary && (
        <aside
          data-testid="desktop-info-shortcut-panel"
          data-theme={darkMode ? 'dark' : 'light'}
          data-scroll-contain="true"
          className={`flex w-full max-w-[320px] shrink-0 flex-col gap-4 overflow-y-auto rounded-sticker bg-cik-surface p-5 text-cik-text shadow-e1 ${
            mode === 'cluster' ? 'hidden xl:flex' : 'flex h-full max-h-[min(92dvh,920px)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="cik-footnote inline-flex items-center rounded-pill bg-cik-berry px-3 py-1 text-cik-text">
              {slideSummary.badge}
            </span>
            <span className="cik-caption-2 cik-tabular inline-flex items-center gap-1 rounded-pill bg-cik-butter px-3 py-1 text-cik-butter-text">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{slideSummary.xpLabel}</span>
            </span>
          </div>

          <div>
            <p data-testid="desktop-insight-heading" className="cik-caption-2 text-cik-text-2">
              {lang === 'tr' ? 'Bağlam' : 'Context'}
            </p>
            {slideSummary.kind === 'fact' ? (
              <div
                data-testid={isAnalysisUnlocked ? 'desktop-insight-unlocked' : 'desktop-insight-locked'}
                className="mt-2 rounded-cik-md bg-cik-surface-2 p-3"
              >
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cik-text-2" aria-hidden="true" />
                  <p className="cik-subhead text-cik-text">{hintText}</p>
                </div>
                <p className="cik-caption-2 cik-tabular mt-2 text-cik-text-2">
                  {lang === 'tr' ? `~${estimatedReadSec} sn` : `~${estimatedReadSec}s`}
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {slideSummary.subLabel && (
                  <p className="cik-footnote text-cik-text-2">{slideSummary.subLabel}</p>
                )}
                {'definitionEn' in slideSummary && slideSummary.definitionEn && (
                  <p className="cik-subhead text-cik-text">{slideSummary.definitionEn}</p>
                )}
                {'exampleEn' in slideSummary && slideSummary.exampleEn && (
                  <p className="cik-subhead text-cik-text-2">“{slideSummary.exampleEn}”</p>
                )}
                <p className="cik-subhead text-cik-text">{slideSummary.note}</p>
              </div>
            )}
          </div>

          {hasFact && (
            <div className="rounded-cik-md bg-cik-surface-2 px-3 py-3">
              <p className="cik-caption-2 text-cik-text-2">{lang === 'tr' ? 'Kaynak' : 'Source'}</p>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cik-footnote mt-1 inline-flex min-h-11 items-center gap-2 text-cik-cta underline"
                >
                  <span className="line-clamp-1">{sourceName}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <p className="cik-footnote mt-1 text-cik-text">{sourceName}</p>
              )}
              {activeFact ? (
                <MediaAttributionBadge
                  className="mt-2"
                  lang={lang}
                  card={{
                    gifUrl: activeFact.gifUrl,
                    posterUrl: activeFact.posterUrl,
                    mediaSource: activeFact.mediaSource,
                    mediaProvider: activeFact.mediaSource,
                    mediaCredit: activeFact.mediaCredit,
                  }}
                />
              ) : null}
            </div>
          )}

          <div className="rounded-cik-md bg-cik-surface-2 px-3 py-3">
            <button
              type="button"
              data-testid="desktop-shortcuts-toggle"
              onClick={() => setShortcutsOpen((open) => !open)}
              aria-expanded={shortcutsOpen}
              className="cik-footnote flex min-h-11 w-full items-center justify-between gap-2 text-cik-text"
            >
              <span className="inline-flex items-center gap-2">
                <Keyboard className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'tr' ? 'Klavye' : 'Keyboard'}</span>
              </span>
              {shortcutsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {shortcutsOpen && (
              <ul className="cik-caption-2 mt-2 space-y-2 text-cik-text-2">
                <li className="flex items-center justify-between gap-2">
                  <span>{lang === 'tr' ? 'Sonraki' : 'Next'}</span>
                  <kbd className="rounded-cik-sm bg-cik-bg-elevated px-2 py-1 font-mono text-cik-text">↓ J</kbd>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>{lang === 'tr' ? 'Önceki' : 'Previous'}</span>
                  <kbd className="rounded-cik-sm bg-cik-bg-elevated px-2 py-1 font-mono text-cik-text">↑ K</kbd>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>{lang === 'tr' ? 'İleri / geri' : 'Forward / back'}</span>
                  <kbd className="rounded-cik-sm bg-cik-bg-elevated px-2 py-1 font-mono text-cik-text">Space</kbd>
                </li>
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
