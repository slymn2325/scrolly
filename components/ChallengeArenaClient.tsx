'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Compass,
  Copy,
  Crown,
  Share2,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { Button, Toast } from '@/components/cikartma';
import MemoryQuizCard from '@/components/MemoryQuizCard';
import type { ChallengeQuestionSnapshot, ChallengeRecord } from '@/types/challenge';
import { syncProfileToApi, trackEvent } from '@/lib/telemetry';
import type { VocabularyCard } from '@/types/vocabulary';
import { copyTextToClipboard } from '@/utils/clipboard';
import type { QuizQuestionItem } from '@/utils/recommendation';
import {
  addUserXp,
  loadUserMemory,
  saveUserMemory,
} from '@/utils/userMemory';
import { playCelebration, playDing, playPop, playTick, playWrong } from '@/utils/soundEngine';

interface ChallengeArenaClientProps {
  challenge: ChallengeRecord;
  questions: QuizQuestionItem[];
  vocabularyPool: VocabularyCard[];
}

interface ChallengerOutcome {
  name: string;
  results: boolean[];
  score: number;
  correct: number;
  total: number;
  elapsedSec: number;
  snapshots?: ChallengeQuestionSnapshot[];
}

export default function ChallengeArenaClient({
  challenge,
  questions,
  vocabularyPool,
}: ChallengeArenaClientProps) {
  const lang = challenge.lang;
  const isEn = lang === 'en';
  const [stage, setStage] = useState<'intro' | 'playing' | 'result'>('intro');
  const [nickname, setNickname] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [myOutcome, setMyOutcome] = useState<ChallengerOutcome | null>(null);
  const [rematchUrl, setRematchUrl] = useState<string | null>(null);
  const [creatingRematch, setCreatingRematch] = useState(false);
  const [rematchCopied, setRematchCopied] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const homeHref = isEn ? '/en' : '/';
  const displayQuestionCount = questions.length > 0 ? questions.length : challenge.totalQuestions;

  useEffect(() => {
    const mem = loadUserMemory();
    setSoundEnabled(mem.soundEnabled);
    if (mem.nickname) {
      setNickname(mem.nickname);
    }
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playPop(soundEnabled);
    const mem = loadUserMemory();
    const cleaned = nickname.trim().slice(0, 28);
    if (cleaned && cleaned !== mem.nickname) {
      saveUserMemory({ ...mem, nickname: cleaned });
    }
    setStage('playing');
  };

  const handleComplete = (
    results: boolean[],
    _sourceCategories: string[],
    earnedXp: number,
    elapsedSec: number,
    _usedQuestionIds: string[],
    usedSnapshots?: ChallengeQuestionSnapshot[]
  ) => {
    const mem = loadUserMemory();
    const finalName =
      nickname.trim().slice(0, 28) ||
      mem.nickname ||
      (isEn ? 'Challenger' : 'Meydan Okuyan');

    const updated = addUserXp({ ...mem, nickname: finalName }, earnedXp, 'challenge');
    saveUserMemory(updated);

    const wonOrTie = earnedXp >= challenge.creatorScore;
    if (wonOrTie) {
      playCelebration(soundEnabled);
    } else {
      playPop(soundEnabled);
    }

    void trackEvent(`challenge-${challenge.code}`, challenge.category, 'quiz_answer', {
      challengeCode: challenge.code,
      score: earnedXp,
      creatorScore: challenge.creatorScore,
    });
    void syncProfileToApi({
      username: updated.nickname,
      xp: updated.xp,
      weeklyXp: updated.weeklyXp,
      streak: updated.streakDays,
      lastVisitDate: updated.lastVisitDate,
    });

    setMyOutcome({
      name: finalName,
      results,
      score: earnedXp,
      correct: results.filter(Boolean).length,
      total: results.length,
      elapsedSec,
      snapshots: usedSnapshots,
    });
    setStage('result');
  };

  const handleCreateRematch = async () => {
    if (!myOutcome || creatingRematch) return;
    playPop(soundEnabled);
    setRematchError(null);

    if (rematchUrl) {
      const ok = await copyTextToClipboard(rematchUrl);
      if (ok) {
        setRematchCopied(true);
        setTimeout(() => setRematchCopied(false), 2400);
      }
      return;
    }

    setCreatingRematch(true);
    try {
      const snapshotsToSend =
        myOutcome.snapshots && myOutcome.snapshots.length > 0
          ? myOutcome.snapshots
          : challenge.questionsSnapshot;
      const res = await fetch('/api/challenges', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorNickname: myOutcome.name,
          creatorScore: myOutcome.score,
          creatorCorrect: myOutcome.correct,
          totalQuestions: myOutcome.total,
          questionIds: challenge.questionIds,
          questionsSnapshot: snapshotsToSend,
          category: challenge.category,
          lang,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.url) {
        setRematchError(
          isEn
            ? `Could not create rematch link right now (${data?.error || res.status}).`
            : `Rövanş linki şu anda oluşturulamadı (${data?.error || res.status}).`
        );
        return;
      }
      setRematchUrl(data.url);
      const ok = await copyTextToClipboard(data.url);
      if (ok) {
        setRematchCopied(true);
        setTimeout(() => setRematchCopied(false), 2400);
      }
    } catch {
      setRematchError(
        isEn
          ? 'Connection error. Please try again.'
          : 'Bağlantı hatası. Lütfen tekrar dene.'
      );
    } finally {
      setCreatingRematch(false);
    }
  };

  const handleShareRematch = async () => {
    if (!rematchUrl || !myOutcome) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: isEn
            ? `${myOutcome.name} scored ${myOutcome.score} XP — Can you beat it?`
            : `${myOutcome.name} ${myOutcome.score} XP yaptı — Geçebilir misin?`,
          text: isEn
            ? `I scored ${myOutcome.score} XP on Scrolly. Can you beat my score on the exact same questions?`
            : `Scrolly'de aynı sorularda ${myOutcome.score} XP yaptım! Beni geçebilir misin?`,
          url: rematchUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    const ok = await copyTextToClipboard(rematchUrl);
    if (ok) {
      setRematchCopied(true);
      setTimeout(() => setRematchCopied(false), 2400);
    }
  };

  const quizModeForChallenge =
    challenge.category === 'vocabulary'
      ? 'vocabulary'
      : questions.length >= 8
        ? 'weekly'
        : 'daily';

  if (stage === 'playing') {
    if (questions.length === 0) {
      return (
        <main
          data-testid="challenge-empty-stage"
          className="h-[100dvh] w-full overflow-y-auto bg-cik-bg px-4 py-8 text-cik-text"
        >
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-cik-lg border border-cik-line bg-cik-surface p-6 text-center shadow-e3">
            <h1 className="cik-title-2 text-cik-text">
              {isEn ? 'Questions unavailable' : 'Sorular yüklenemedi'}
            </h1>
            <p className="cik-subhead text-cik-text-2">
              {isEn
                ? 'This challenge question pack is temporarily unavailable.'
                : 'Bu meydan okumanın soru paketi şu anda yüklenemedi.'}
            </p>
            <Link
              href={homeHref}
              className="cik-headline inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
            >
              <Compass size={18} strokeWidth={2} aria-hidden="true" />
              <span>{isEn ? 'Explore Scrolly' : "Scrolly'yi Keşfet"}</span>
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main
        data-testid="challenge-playing-stage"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-cik-bg px-3 py-4 text-cik-text"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-cik-lg border border-cik-line bg-cik-surface px-4 py-2.5 shadow-e1">
            <span className="cik-footnote inline-flex items-center gap-2 text-cik-cta">
              <Swords size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                {isEn
                  ? `Target: ${challenge.creatorNickname} (${challenge.creatorScore} XP)`
                  : `Hedef: ${challenge.creatorNickname} (${challenge.creatorScore} XP)`}
              </span>
            </span>
            <span className="cik-caption-2 cik-tabular rounded-pill bg-cik-pink px-2.5 py-1 text-cik-text">
              #{challenge.code}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <MemoryQuizCard
              questions={questions}
              lang={lang}
              quizMode={quizModeForChallenge}
              vocabularyPool={vocabularyPool}
              onAnswerSound={(isCorrect) =>
                isCorrect ? playDing(soundEnabled) : playWrong(soundEnabled)
              }
              onTickSound={(urgent) => playTick(soundEnabled, urgent)}
              onButtonPop={() => playPop(soundEnabled)}
              onComplete={handleComplete}
              onSkip={() => setStage('intro')}
            />
          </div>
        </div>
      </main>
    );
  }

  if (stage === 'result' && myOutcome) {
    const beatCreator = myOutcome.score > challenge.creatorScore;
    const tied = myOutcome.score === challenge.creatorScore;
    const bannerClass = beatCreator
      ? 'bg-cik-mint text-cik-mint-text'
      : tied
        ? 'bg-cik-butter text-cik-butter-text'
        : 'bg-cik-pink text-cik-text';
    const headline = beatCreator
      ? isEn
        ? `You beat ${challenge.creatorNickname}!`
        : `${challenge.creatorNickname} skorunu geçtin!`
      : tied
        ? isEn
          ? `Dead heat with ${challenge.creatorNickname}!`
          : `${challenge.creatorNickname} ile berabere!`
        : isEn
          ? `${challenge.creatorNickname} held the crown`
          : `${challenge.creatorNickname} önde kaldı`;

    return (
      <main
        data-testid="challenge-result-stage"
        className="h-[100dvh] w-full overflow-y-auto bg-cik-bg px-4 py-8 text-cik-text"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-12">
          <div className={`rounded-cik-lg p-5 text-center shadow-e1 ${bannerClass}`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-cik-surface text-cik-cta shadow-e1">
              {beatCreator ? (
                <Crown size={24} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Trophy size={24} strokeWidth={2} aria-hidden="true" />
              )}
            </div>
            <h1 className="cik-title-2 mt-3">{headline}</h1>
            <p className="cik-subhead mt-1 opacity-90">
              {isEn
                ? 'Side-by-side result on the exact same question pack'
                : 'Birebir aynı sorularda yan yana sonuç kıyaslaması'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3" data-testid="challenge-comparison-grid">
            <div className="rounded-cik-lg border border-cik-line bg-cik-surface p-4 text-center shadow-e1">
              <p className="cik-caption-2 uppercase tracking-wider text-cik-text-2">
                {challenge.creatorNickname}
              </p>
              <p className="cik-title-1 cik-tabular mt-2 text-cik-text">
                {challenge.creatorScore}
              </p>
              <p className="cik-caption-1 text-cik-text-2">XP</p>
              <p className="cik-footnote cik-tabular mt-2 rounded-pill bg-cik-surface-2 px-3 py-1 text-cik-text-2">
                {challenge.creatorCorrect}/{challenge.totalQuestions}{' '}
                {isEn ? 'correct' : 'doğru'}
              </p>
            </div>

            <div className="rounded-cik-lg border-2 border-cik-cta bg-cik-pink p-4 text-center shadow-e1">
              <p className="cik-caption-2 font-extrabold uppercase tracking-wider text-cik-cta">
                {myOutcome.name} · {isEn ? 'YOU' : 'SEN'}
              </p>
              <p className="cik-title-1 cik-tabular mt-2 text-cik-text">
                {myOutcome.score}
              </p>
              <p className="cik-caption-1 text-cik-text-2">XP</p>
              <p className="cik-footnote cik-tabular mt-2 rounded-pill bg-cik-surface px-3 py-1 text-cik-text">
                {myOutcome.correct}/{myOutcome.total}{' '}
                {isEn ? 'correct' : 'doğru'} · {myOutcome.elapsedSec}
                {isEn ? 's' : ' sn'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-cik-lg border border-cik-line bg-cik-surface p-4 shadow-e1">
            <Button
              data-testid="challenge-rematch-btn"
              disabled={creatingRematch}
              onClick={() => void handleCreateRematch()}
              className="w-full"
            >
              {rematchCopied ? (
                <Check size={20} strokeWidth={2} aria-hidden="true" />
              ) : rematchUrl ? (
                <Copy size={20} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Swords size={20} strokeWidth={2} aria-hidden="true" />
              )}
              <span>
                {creatingRematch
                  ? isEn
                    ? 'Creating rematch link...'
                    : 'Rövanş linki oluşturuluyor...'
                  : rematchCopied
                    ? isEn
                      ? 'Rematch link copied!'
                      : 'Rövanş linki kopyalandı!'
                    : isEn
                      ? 'Create Rematch Link'
                      : 'Rövanş Linki Oluştur'}
              </span>
            </Button>

            {rematchUrl && (
              <div className="flex items-center justify-between gap-2 rounded-cik-md bg-cik-surface-2 px-3 py-2">
                <span className="cik-caption-2 truncate font-mono text-cik-text-2">
                  {rematchUrl}
                </span>
                <button
                  type="button"
                  onClick={() => void handleShareRematch()}
                  className="cik-caption-1 inline-flex h-11 shrink-0 items-center gap-1 rounded-pill bg-cik-cta px-3 text-cik-on-cta"
                >
                  <Share2 size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{isEn ? 'Share' : 'Paylaş'}</span>
                </button>
              </div>
            )}

            {rematchError && (
              <p className="cik-footnote text-center text-cik-rose-text">{rematchError}</p>
            )}

            <Link
              href={homeHref}
              data-testid="challenge-explore-link"
              className="cik-headline inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface-2 px-4 text-cik-text"
            >
              <Compass size={18} strokeWidth={2} aria-hidden="true" />
              <span>{isEn ? 'Explore Scrolly' : "Scrolly'yi Keşfet"}</span>
            </Link>
          </div>
        </div>
        <Toast message={rematchCopied ? (isEn ? 'Link copied!' : 'Link kopyalandı!') : null} />
      </main>
    );
  }

  return (
    <main
      data-testid="challenge-intro-stage"
      className="h-[100dvh] w-full overflow-y-auto bg-cik-bg px-4 py-8 text-cik-text"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-12">
        <div className="flex items-center justify-between">
          <Link
            href={homeHref}
            className="cik-footnote inline-flex min-h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
          >
            <Compass size={16} strokeWidth={2} aria-hidden="true" />
            <span>Scrolly</span>
          </Link>
          <span className="cik-caption-2 cik-tabular rounded-pill bg-cik-pink px-3 py-1.5 text-cik-cta">
            #{challenge.code}
          </span>
        </div>

        <section className="rounded-cik-lg border border-cik-line bg-cik-surface p-6 text-center shadow-e3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-cik-pink text-cik-cta">
            <Swords size={28} strokeWidth={2} aria-hidden="true" />
          </div>

          <p className="cik-caption-2 mt-4 uppercase tracking-widest text-cik-cta">
            {isEn ? 'Can You Beat This Score?' : 'Beni Geçebilir Misin?'}
          </p>

          <h1 className="cik-title-2 mt-2 text-cik-text">
            {isEn
              ? `${challenge.creatorNickname} scored ${challenge.creatorScore} XP`
              : `${challenge.creatorNickname} ${challenge.creatorScore} XP yaptı`}
          </h1>

          <p className="cik-subhead mt-2 text-cik-text-2">
            {isEn
              ? `${challenge.creatorCorrect}/${challenge.totalQuestions} correct · Same questions, no account required.`
              : `${challenge.creatorCorrect}/${challenge.totalQuestions} doğru · Kayıt olmadan aynı soruları çöz.`}
          </p>

          <form onSubmit={handleStart} className="mt-6 flex flex-col gap-3 text-left">
            <div>
              <label
                htmlFor="challenge-player-name"
                className="cik-caption-1 mb-1.5 block text-cik-text-2"
              >
                {isEn ? 'Your Name' : 'Takma Adın'}
              </label>
              <input
                id="challenge-player-name"
                data-testid="challenge-name-input"
                type="text"
                maxLength={28}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={isEn ? 'Explorer' : 'Merak Kâşifi'}
                className="w-full rounded-cik-md border border-cik-line bg-cik-surface-2 px-4 py-3 text-[16px] font-semibold text-cik-text placeholder:text-cik-text-3"
              />
            </div>

            <Button
              type="submit"
              data-testid="challenge-start-btn"
              className="mt-1 w-full"
            >
              <Sparkles size={20} strokeWidth={2} aria-hidden="true" />
              <span>
                {isEn
                  ? `Start ${displayQuestionCount}-Question Challenge`
                  : `${displayQuestionCount} Soruluk Meydan Okumayı Başlat`}
              </span>
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
