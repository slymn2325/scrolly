'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Share2, Target, Users } from 'lucide-react';
import GuessWidget, { type GuessAnswerDetails } from '@/components/GuessWidget';
import { getCategoryMeta, type CategoryId, type Language } from '@/i18n/translations';
import {
  buildDailyGuessShareText,
  computeDailyGuessPercentile,
  getDailyGuessDateIso,
  getDailyGuessNumber,
} from '@/lib/dailyGuess';
import { getOrCreateDeviceId, trackEvent } from '@/lib/telemetry';
import type { FactCard } from '@/types/fact';
import { getFactPrimarySlug } from '@/utils/factsData';

interface DailyGuessCardProps {
  fact: FactCard;
  lang: Language;
  onGuessReward: (
    xpAwarded: number,
    isAccurate: boolean,
    category?: CategoryId,
    accuracyPct?: number
  ) => void;
  onButtonPop: () => void;
}

interface StoredDailyGuess {
  date: string;
  factId: string;
  tier: 'spotOn' | 'close' | 'participated';
  earnedXp: number;
  accuracyPct: number;
  topPct: number;
}

const DAILY_GUESS_STORAGE_KEY = 'scrolly_daily_guess_v1';

function readStoredDailyGuess(expectedDate: string, factId: string): StoredDailyGuess | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DAILY_GUESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDailyGuess>;
    if (
      parsed?.date === expectedDate &&
      parsed?.factId === factId &&
      typeof parsed?.accuracyPct === 'number' &&
      typeof parsed?.earnedXp === 'number' &&
      (parsed.tier === 'spotOn' || parsed.tier === 'close' || parsed.tier === 'participated')
    ) {
      return {
        date: expectedDate,
        factId,
        tier: parsed.tier,
        earnedXp: parsed.earnedXp,
        accuracyPct: parsed.accuracyPct,
        topPct: typeof parsed.topPct === 'number' ? parsed.topPct : 10,
      };
    }
  } catch {
    // Ignore storage read failures
  }
  return null;
}

function writeStoredDailyGuess(record: StoredDailyGuess): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_GUESS_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota failures
  }
}

export default function DailyGuessCard({
  fact,
  lang,
  onGuessReward,
  onButtonPop,
}: DailyGuessCardProps) {
  const isEn = lang === 'en';
  const dateIso = getDailyGuessDateIso();
  const puzzleNumber = getDailyGuessNumber(dateIso);
  const localized = fact[lang];
  const challenge = localized.guessChallenge;
  const catMeta = getCategoryMeta(fact.category);

  const [savedAttempt, setSavedAttempt] = useState<StoredDailyGuess | null>(() =>
    readStoredDailyGuess(dateIso, fact.id)
  );
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [showFactReveal, setShowFactReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSavedAttempt(readStoredDailyGuess(dateIso, fact.id));
  }, [dateIso, fact.id]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const res = await fetch(
          `/api/daily-guess?date=${encodeURIComponent(dateIso)}&deviceId=${encodeURIComponent(deviceId)}`,
          { cache: 'no-store', credentials: 'same-origin' }
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok?: boolean;
          totalParticipants?: number;
          attempt?: { accuracyPct?: number; topPct?: number } | null;
        };
        if (cancelled) return;
        if (typeof data.totalParticipants === 'number') {
          setTotalParticipants(data.totalParticipants);
        }
        if (data.attempt && typeof data.attempt.topPct === 'number') {
          setSavedAttempt((prev) => {
            if (!prev) return prev;
            const next = { ...prev, topPct: data.attempt!.topPct! };
            writeStoredDailyGuess(next);
            return next;
          });
        }
      } catch {
        // Ignore offline stats fetch errors
      }
    };
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [dateIso]);

  if (!challenge) return null;

  const handleAnswered = (
    xpAwarded: number,
    isAccurate: boolean,
    details: GuessAnswerDetails
  ) => {
    const tier: StoredDailyGuess['tier'] =
      xpAwarded >= 20 ? 'spotOn' : xpAwarded >= 15 ? 'close' : 'participated';
    const fallbackTop = computeDailyGuessPercentile(details.accuracyPct, []);
    const localRecord: StoredDailyGuess = {
      date: dateIso,
      factId: fact.id,
      tier,
      earnedXp: xpAwarded,
      accuracyPct: details.accuracyPct,
      topPct: fallbackTop,
    };
    writeStoredDailyGuess(localRecord);
    setSavedAttempt(localRecord);
    setShowFactReveal(true);

    onGuessReward(xpAwarded, isAccurate, fact.category, details.accuracyPct);
    void trackEvent(getFactPrimarySlug(fact), fact.category, 'quick_guess', {
      dailyGuess: true,
      puzzleNumber,
      accuracyPct: details.accuracyPct,
    });

    const deviceId = getOrCreateDeviceId();
    void fetch('/api/daily-guess', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateIso,
        factId: fact.id,
        deviceId,
        accuracyPct: details.accuracyPct,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          topPct?: number;
          totalParticipants?: number;
        };
        if (typeof data.totalParticipants === 'number') {
          setTotalParticipants(data.totalParticipants);
        }
        if (typeof data.topPct === 'number') {
          const updated = { ...localRecord, topPct: data.topPct };
          writeStoredDailyGuess(updated);
          setSavedAttempt(updated);
        }
      })
      .catch(() => {
        // Offline safe
      });
  };

  const shareText = savedAttempt
    ? buildDailyGuessShareText({
        lang,
        number: puzzleNumber,
        accuracyPct: savedAttempt.accuracyPct,
        topPct: savedAttempt.topPct,
      })
    : '';

  const handleCopy = async () => {
    if (!shareText) return;
    onButtonPop();
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleWebShare = async () => {
    if (!shareText) return;
    onButtonPop();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: isEn
            ? `Scrolly Daily Guess #${puzzleNumber}`
            : `Scrolly Günün Tahmini #${puzzleNumber}`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopy();
  };

  const whatsappUrl = shareText
    ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
    : '#';
  const xUrl = shareText
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    : '#';

  return (
    <section
      data-testid="daily-guess-card"
      className="mt-4 rounded-cik-lg border border-cik-line bg-cik-surface p-4 shadow-e1"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="cik-caption-1 inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-3 py-1 text-cik-cta">
          <Target size={15} strokeWidth={2.2} aria-hidden="true" />
          <span>
            {isEn
              ? `Daily Guess #${puzzleNumber}`
              : `Günün Tahmini #${puzzleNumber}`}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {totalParticipants > 0 && (
            <span className="cik-caption-2 cik-tabular inline-flex items-center gap-1 rounded-pill bg-cik-surface-2 px-2.5 py-1 text-cik-text-2">
              <Users size={13} strokeWidth={2} aria-hidden="true" />
              <span>{totalParticipants}</span>
            </span>
          )}
          <span className="cik-caption-2 rounded-pill bg-cik-butter px-2.5 py-1 text-cik-butter-text">
            {catMeta.emoji} {catMeta.label[lang]}
          </span>
        </div>
      </div>

      <h3 className="cik-headline mt-3 text-cik-text">{localized.title}</h3>

      <div className="mt-3">
        <GuessWidget
          factId={`daily-guess-${dateIso}-${fact.id}`}
          challenge={challenge}
          lang={lang}
          onGuessAnswered={handleAnswered}
          onRequestFlip={() => setShowFactReveal((prev) => !prev)}
          onButtonPop={onButtonPop}
          initialAnsweredState={
            savedAttempt
              ? {
                  tier: savedAttempt.tier,
                  earnedXp: savedAttempt.earnedXp,
                  accuracyPct: savedAttempt.accuracyPct,
                }
              : null
          }
        />
      </div>

      {savedAttempt && (
        <div
          data-testid="daily-guess-share-box"
          className="mt-3 flex flex-col gap-2.5 rounded-cik-md border border-cik-line bg-cik-surface-2 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="cik-footnote cik-tabular rounded-pill bg-cik-mint px-3 py-1 text-cik-mint-text">
              {isEn
                ? `${savedAttempt.accuracyPct}% Accuracy`
                : `%${savedAttempt.accuracyPct} İsabet`}
            </span>
            <span
              data-testid="daily-guess-percentile"
              className="cik-footnote cik-tabular rounded-pill bg-cik-butter px-3 py-1 text-cik-butter-text"
            >
              {isEn ? `Top ${savedAttempt.topPct}%` : `Top %${savedAttempt.topPct}`}
            </span>
          </div>

          {showFactReveal && (
            <p className="cik-footnote text-cik-text-2">{localized.factText}</p>
          )}

          <p
            data-testid="daily-guess-share-preview"
            className="cik-caption-2 select-all rounded-cik-sm bg-cik-surface px-2.5 py-2 font-mono text-cik-text-2"
          >
            {shareText}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              data-testid="daily-guess-copy-btn"
              onClick={() => void handleCopy()}
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill bg-cik-cta px-3 text-cik-on-cta"
            >
              {copied ? (
                <Check size={15} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Copy size={15} strokeWidth={2.2} aria-hidden="true" />
              )}
              <span>
                {copied
                  ? isEn
                    ? 'Copied!'
                    : 'Kopyalandı'
                  : isEn
                    ? 'Copy'
                    : 'Kopyala'}
              </span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onButtonPop}
              data-testid="daily-guess-whatsapp-btn"
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill bg-cik-mint px-3 text-cik-mint-text"
            >
              <MessageCircle size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>WhatsApp</span>
            </a>

            <a
              href={xUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onButtonPop}
              data-testid="daily-guess-x-btn"
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill bg-cik-text px-3 text-cik-bg"
            >
              <span>X</span>
            </a>

            <button
              type="button"
              onClick={() => void handleWebShare()}
              data-testid="daily-guess-share-btn"
              className="cik-footnote inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-3 text-cik-text"
            >
              <Share2 size={15} strokeWidth={2.2} aria-hidden="true" />
              <span>{isEn ? 'Share' : 'Paylaş'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
