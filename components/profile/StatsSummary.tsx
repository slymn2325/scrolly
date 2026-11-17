'use client';

import React, { useMemo } from 'react';
import TopicRadarChart from '@/components/TopicRadarChart';
import { profileCopy } from '@/components/profile/copy';
import { type CategoryId, type Language, translations } from '@/i18n/translations';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import { getLeagueInfo, getTodayDateString, type UserMemoryState } from '@/utils/userMemory';
import type { FactCard } from '@/utils/factsData';

interface StatsSummaryProps {
  lang: Language;
  memory: UserMemoryState;
  allFacts: FactCard[];
  onExploreCategory: (category: CategoryId) => void;
  onButtonPop: () => void;
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDay(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + delta);
  return formatDay(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  );
}

function streakSet(streakDays: number, lastActive: string | undefined): Set<string> {
  const marks = new Set<string>();
  if (!lastActive || streakDays <= 0) return marks;
  const count = Math.min(streakDays, 7);
  for (let index = 0; index < count; index += 1) {
    marks.add(shiftDay(lastActive, -index));
  }
  return marks;
}

export default function StatsSummary({
  lang,
  memory,
  allFacts,
  onExploreCategory,
  onButtonPop,
}: StatsSummaryProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);
  const league = getLeagueInfo(memory.xp, lang);
  const today = getTodayDateString();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDay(today, index - 6)), [today]);
  const active = streakSet(memory.streakDays, memory.lastActiveDate || memory.lastVisitDate);
  const goal = league.nextMinXp ?? Math.max(memory.weeklyXp, 1);
  const weeklyPct = Math.max(4, Math.min(100, Math.round((memory.weeklyXp / goal) * 100)));
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });

  const cards = [
    { icon: UI_ICON_PATHS.xpSparkles, value: memory.xp, label: 'XP' },
    { icon: UI_ICON_PATHS.verifiedSeal, value: memory.seenIds.length, label: t.drawerDiscovered },
    { icon: UI_ICON_PATHS.streakFire, value: memory.streakDays, label: t.drawerStreak },
    { icon: UI_ICON_PATHS.trophy, value: memory.weeklyXp, label: copy.weeklyXp },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-cik-lg bg-cik-surface p-5 shadow-e1">
            <img src={card.icon} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            <p className="cik-title-2 cik-tabular mt-2 text-cik-text">{card.value}</p>
            <p className="cik-footnote text-cik-text-2">{card.label}</p>
          </div>
        ))}
      </div>

      <TopicRadarChart
        lang={lang}
        memory={memory}
        allFacts={allFacts}
        onExploreCategory={onExploreCategory}
        onButtonPop={onButtonPop}
      />

      <section className="rounded-cik-lg bg-cik-surface p-5 shadow-e1" aria-label={copy.streakCalendar}>
        <h3 className="cik-headline text-cik-text">{copy.streakCalendar}</h3>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {days.map((iso) => {
            const [year, month, day] = iso.split('-').map(Number);
            const date = new Date(year, (month || 1) - 1, day || 1);
            const on = active.has(iso);
            return (
              <div key={iso} className="flex flex-col items-center gap-2">
                <span className="cik-caption-2 text-cik-text-3">{weekday.format(date)}</span>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-pill cik-caption-1 ${
                    on ? 'bg-cik-cta text-cik-on-cta' : 'bg-cik-surface-2 text-cik-text-3'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-cik-lg bg-cik-surface p-5 shadow-e1" aria-label={copy.weeklyXp}>
        <div className="flex items-end justify-between gap-3">
          <h3 className="cik-headline text-cik-text">{copy.weeklyXp}</h3>
          <p className="cik-title-3 cik-tabular text-cik-text">{memory.weeklyXp}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-pill bg-cik-pink" aria-hidden="true">
          <div className="h-full rounded-pill bg-cik-cta" style={{ width: `${weeklyPct}%` }} />
        </div>
        <p className="cik-footnote mt-2 text-cik-text-2">{league.label}</p>
      </section>
    </div>
  );
}
