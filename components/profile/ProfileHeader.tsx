'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import LeagueBadge from '@/components/cikartma/LeagueBadge';
import { profileCopy } from '@/components/profile/copy';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import { motionSpring, motionTiming } from '@/lib/motion';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { getLeagueInfo, type UserMemoryState } from '@/utils/userMemory';

interface ProfileHeaderProps {
  lang: Language;
  memory: UserMemoryState;
  focusNonce: number;
  onUpdateNickname: (nickname: string) => void;
}

function leagueProgress(xp: number, lang: Language): number {
  const league = getLeagueInfo(xp, lang);
  if (league.nextMinXp == null) return 1;
  const span = Math.max(1, league.nextMinXp - league.minXp);
  return Math.max(0, Math.min(1, (xp - league.minXp) / span));
}

function XpRing({ progress, label }: { progress: number; label: string }) {
  const reduced = useReducedMotion() === true;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" role="img" aria-label={label} className="shrink-0">
      <circle cx={32} cy={32} r={radius} fill="none" stroke="var(--cik-pink)" strokeWidth={6} />
      <motion.circle
        cx={32}
        cy={32}
        r={radius}
        fill="none"
        stroke="var(--cik-cta)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - pct) }}
        transition={reduced ? motionTiming.reducedFade : motionSpring.reveal}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

export default function ProfileHeader({ lang, memory, focusNonce, onUpdateNickname }: ProfileHeaderProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);
  const league = getLeagueInfo(memory.xp, lang);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(memory.nickname);

  useEffect(() => {
    setDraft(memory.nickname);
  }, [memory.nickname]);

  useEffect(() => {
    if (focusNonce === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  const commit = () => {
    const next = draft.trim().slice(0, 24);
    if (!next || next === memory.nickname) {
      setDraft(memory.nickname);
      return;
    }
    onUpdateNickname(next);
  };

  return (
    <div className="flex items-start gap-4">
      <img
        src="/assets/fluent/grinning-face.png"
        alt=""
        width={72}
        height={72}
        className="h-[72px] w-[72px] shrink-0 object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <input
            ref={inputRef}
            id={inputId}
            data-testid="diploma-nickname-input"
            value={draft}
            maxLength={24}
            aria-label={t.diplomaNickLabel}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                setDraft(memory.nickname);
                event.currentTarget.blur();
              }
            }}
            className="cik-large-title min-w-0 flex-1 border-0 bg-transparent p-0 text-cik-text"
          />
          <IconButton
            label={copy.editNick}
            onClick={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
          >
            <Pencil size={20} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <XpRing progress={leagueProgress(memory.xp, lang)} label={`${copy.xpRing}: ${memory.xp} XP`} />
          <LeagueBadge tier={league.id} size={48} lang={lang} />
          <div className="flex items-center gap-2">
            <img src={UI_ICON_PATHS.streakFire} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="cik-headline cik-tabular text-cik-text">{memory.streakDays}</span>
            <span className="cik-footnote text-cik-text-2">{t.drawerStreak}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
