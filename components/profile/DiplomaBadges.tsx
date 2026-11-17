'use client';

import React from 'react';
import { Download, Share } from 'lucide-react';
import Button from '@/components/cikartma/Button';
import LeagueBadge from '@/components/cikartma/LeagueBadge';
import { profileCopy } from '@/components/profile/copy';
import { CATEGORIES, getCategoryMeta, type CategoryId, type Language, translations } from '@/i18n/translations';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { getLeagueInfo, type UserMemoryState } from '@/utils/userMemory';
import type { FactCard } from '@/utils/factsData';

interface DiplomaBadgesProps {
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  exporting: boolean;
  onCelebrate: () => void;
  onDownload: () => void;
  onShare: () => void;
}

export default function DiplomaBadges({
  lang,
  memory,
  allFacts,
  exporting,
  onCelebrate,
  onDownload,
  onShare,
}: DiplomaBadgesProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);
  const league = getLeagueInfo(memory.xp, lang);
  const categories = CATEGORIES.filter((category) => category.id !== 'all');

  return (
    <div className="flex flex-col gap-4">
      <section
        data-testid="weekly-diploma-card"
        className="relative overflow-hidden rounded-sticker border-4 border-cik-sticker-rim bg-cik-butter p-5 text-center text-cik-butter-text shadow-sticker"
      >
        <img
          src={UI_ICON_PATHS.verifiedSeal}
          alt=""
          width={40}
          height={40}
          className="absolute right-4 top-4 h-10 w-10 object-contain"
        />
        <p className="cik-caption-1 text-cik-butter-text">{t.diplomaWeeklyCert}</p>
        <div className="my-3 flex justify-center" data-testid="diploma-league-shield">
          <LeagueBadge tier={league.id} size={64} lang={lang} />
        </div>
        <h3 className="cik-title-2 text-cik-butter-text">{league.label}</h3>
        <p className="cik-footnote mt-1 text-cik-butter-text">
          {memory.nickname} · <span className="cik-tabular">{memory.xp} XP</span>
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button data-testid="diploma-celebrate-btn" onClick={onCelebrate} className="w-full">
            {t.diplomaCelebrateBtn}
          </Button>
          <Button data-testid="diploma-download-btn" disabled={exporting} onClick={onDownload} className="w-full">
            <Download size={20} strokeWidth={2} aria-hidden="true" />
            <span>{t.diplomaDownloadPngBtn}</span>
          </Button>
          <Button data-testid="diploma-share-btn" tone="ghost" disabled={exporting} onClick={onShare} className="w-full">
            <Share size={20} strokeWidth={2} aria-hidden="true" />
            <span>{t.diplomaSharePngBtn}</span>
          </Button>
        </div>
      </section>

      <section aria-label={t.drawerBadges}>
        <h3 className="cik-headline text-cik-text">
          {t.drawerBadges} ({memory.badges.length})
        </h3>
        {categories.length === 0 ? (
          <p className="cik-body mt-3 text-cik-text-2">{t.drawerNoBadges}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const id = category.id as CategoryId;
              const meta = getCategoryMeta(id);
              const unlocked = memory.badges.includes(id);
              const inCategory = allFacts.filter((fact) => fact.category === id);
              const seen = inCategory.filter((fact) => memory.seenIds.includes(fact.id)).length;
              const total = Math.max(inCategory.length, 1);
              const pct = Math.max(4, Math.min(100, Math.round((seen / total) * 100)));
              return (
                <article
                  key={id}
                  className={`flex flex-col gap-2 rounded-cik-lg p-4 shadow-e1 ${
                    unlocked ? 'bg-cik-pink text-cik-text' : 'bg-cik-surface-2 text-cik-text-2'
                  }`}
                >
                  <img
                    src={meta.iconPath}
                    alt=""
                    width={40}
                    height={40}
                    className={`h-10 w-10 object-contain ${unlocked ? '' : 'opacity-40'}`}
                  />
                  <p className="cik-footnote text-cik-text">{meta.badge[lang]}</p>
                  {unlocked ? (
                    <p className="cik-caption-2 text-cik-text-2">{meta.label[lang]}</p>
                  ) : (
                    <>
                      <p className="cik-caption-2 text-cik-text-2">{copy.locked}</p>
                      <div className="h-2 overflow-hidden rounded-pill bg-cik-line" aria-hidden="true">
                        <div className="h-full rounded-pill bg-cik-berry" style={{ width: `${seen === 0 ? 0 : pct}%` }} />
                      </div>
                      <p className="cik-caption-2 cik-tabular text-cik-text-2">
                        {seen}/{inCategory.length}
                      </p>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
