'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Confetti from '@/components/celebrations/Confetti';
import { GUESS_CORRECT_EVENT } from '@/components/celebrations/events';
import LevelUpSheet, { type LevelUpMoment } from '@/components/celebrations/LevelUpSheet';
import {
  persistFirstStickerCelebrated,
  persistStreakSevenCelebrated,
  readFirstStickerCelebrated,
  readStreakSevenCelebrated,
} from '@/components/celebrations/storage';
import StickerFly from '@/components/celebrations/StickerFly';
import StickerSlap from '@/components/celebrations/StickerSlap';
import { translations, type Language } from '@/i18n/translations';
import { vibrateSuccess } from '@/utils/haptics';
import { getLeagueInfo, XP_GAINED_EVENT, type XpGainedDetail } from '@/utils/userMemory';
import type { LeagueTierId } from '@/utils/icons8Assets';

const LEAGUE_RANK: Record<LeagueTierId, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

interface CelebrationHostProps {
  lang: Language;
}

function readStoredProgress(): { xp: number; streakDays: number } {
  if (typeof window === 'undefined') return { xp: 0, streakDays: 0 };
  try {
    const raw = window.localStorage.getItem('merak_user_state_v1');
    if (!raw) return { xp: 0, streakDays: 0 };
    const parsed = JSON.parse(raw) as { xp?: number; streakDays?: number };
    return {
      xp: typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) ? parsed.xp : 0,
      streakDays:
        typeof parsed.streakDays === 'number' && Number.isFinite(parsed.streakDays) ? parsed.streakDays : 0,
    };
  } catch {
    return { xp: 0, streakDays: 0 };
  }
}

function celebrateHaptic(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('merak_user_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as { vibrationEnabled?: boolean };
      if (parsed.vibrationEnabled === false) return;
    }
  } catch {
    // Unreadable memory still attempts the haptic helper, which no-ops without vibrate.
  }
  vibrateSuccess();
}

export default function CelebrationHost({ lang }: CelebrationHostProps) {
  const copy = translations[lang];
  const [mounted, setMounted] = useState(false);
  const [firstOpen, setFirstOpen] = useState(false);
  const [slapOpen, setSlapOpen] = useState(false);
  const [queue, setQueue] = useState<LevelUpMoment[]>([]);
  const firstRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let lastXp: number | null = null;
    let lastStreak: number | null = null;
    const stored = readStoredProgress();
    lastXp = stored.xp;
    lastStreak = stored.streakDays;

    const onCorrect = () => {
      if (!readFirstStickerCelebrated()) {
        persistFirstStickerCelebrated();
        celebrateHaptic();
        firstRef.current = true;
        setFirstOpen(true);
        return;
      }
      if (firstRef.current) return;
      setSlapOpen(true);
    };

    const onXp = (event: Event) => {
      const detail = (event as CustomEvent<XpGainedDetail>).detail;
      if (!detail || detail.amount <= 0) return;
      const prevXp = lastXp ?? Math.max(0, detail.totalXp - detail.amount);
      const prevStreak = lastStreak ?? detail.streakDays;
      const prevTier = getLeagueInfo(prevXp, lang).id;
      const nextTier = getLeagueInfo(detail.totalXp, lang).id;
      lastXp = detail.totalXp;
      lastStreak = detail.streakDays;

      const moments: LevelUpMoment[] = [];
      if (LEAGUE_RANK[nextTier] > LEAGUE_RANK[prevTier]) {
        moments.push({ kind: 'league', tier: nextTier });
      }
      if (prevStreak < 7 && detail.streakDays >= 7 && !readStreakSevenCelebrated()) {
        persistStreakSevenCelebrated();
        moments.push({ kind: 'streak' });
      }
      if (moments.length > 0) {
        setQueue((current) => [...current, ...moments]);
      }
    };

    window.addEventListener(GUESS_CORRECT_EVENT, onCorrect);
    window.addEventListener(XP_GAINED_EVENT, onXp);
    return () => {
      window.removeEventListener(GUESS_CORRECT_EVENT, onCorrect);
      window.removeEventListener(XP_GAINED_EVENT, onXp);
    };
  }, [lang]);

  const finishFirst = useCallback(() => {
    firstRef.current = false;
    setFirstOpen(false);
  }, []);

  const closeMoment = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <Confetti active={firstOpen} />
      {firstOpen ? (
        <StickerFly
          title={copy.firstStickerTitle}
          imageSrc="/assets/fluent/party-popper.png"
          onDone={finishFirst}
        />
      ) : null}
      {slapOpen && !firstOpen ? <StickerSlap label={copy.spotOnSlap} onDone={() => setSlapOpen(false)} /> : null}
      <LevelUpSheet
        moment={firstOpen ? null : (queue[0] ?? null)}
        lang={lang}
        onClose={closeMoment}
      />
    </>,
    document.body,
  );
}
