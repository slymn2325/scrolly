'use client';

import React from 'react';
import Button from '@/components/cikartma/Button';
import LeagueBadge from '@/components/cikartma/LeagueBadge';
import Sheet from '@/components/cikartma/Sheet';
import { translations, type Language, type TranslationDict } from '@/i18n/translations';
import { getLeagueInfo } from '@/utils/userMemory';
import { UI_ICON_PATHS, type LeagueTierId } from '@/utils/icons8Assets';

const TIER_XP: Record<LeagueTierId, number> = {
  bronze: 0,
  silver: 400,
  gold: 1000,
  platinum: 1800,
  diamond: 2800,
};

export type LevelUpMoment =
  | { kind: 'league'; tier: LeagueTierId }
  | { kind: 'streak' };

interface LevelUpSheetProps {
  moment: LevelUpMoment | null;
  lang: Language;
  onClose: () => void;
}

export default function LevelUpSheet({ moment, lang, onClose }: LevelUpSheetProps) {
  const copy = translations[lang];
  const open = moment !== null;
  const title = moment ? momentTitle(moment, copy) : copy.celebrationContinue;
  const leagueLabel =
    moment?.kind === 'league' ? getLeagueInfo(TIER_XP[moment.tier], lang).label : '';

  return (
    <Sheet open={open} title={title} onClose={onClose} closeLabel={copy.sheetClose}>
      {moment ? (
        <div data-testid="level-up-sheet" className="flex flex-col items-center gap-4 pb-4 text-center">
          {moment.kind === 'league' ? (
            <LeagueBadge tier={moment.tier} size={72} lang={lang} />
          ) : (
            <img src={UI_ICON_PATHS.streakFire} alt="" width={72} height={72} className="h-[72px] w-[72px] object-contain" />
          )}
          {moment.kind === 'league' ? (
            <p className="cik-headline text-cik-text">{leagueLabel}</p>
          ) : (
            <p className="cik-body text-cik-text-2">{copy.streakUpBody}</p>
          )}
          <Button className="w-full" onClick={onClose}>
            {copy.celebrationContinue}
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function momentTitle(moment: LevelUpMoment, copy: TranslationDict): string {
  switch (moment.kind) {
    case 'league':
      return copy.leagueUpTitle;
    case 'streak':
      return copy.streakUpTitle;
    default: {
      const neverMoment: never = moment;
      return neverMoment;
    }
  }
}
