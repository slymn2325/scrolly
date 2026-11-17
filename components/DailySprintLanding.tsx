import Link from 'next/link';
import {
  dailyPlayHref,
  dailyPuzzleNumber,
  istanbulTodayIso,
  parseIsoDate,
} from '@/utils/viralShare';

interface DailySprintLandingProps {
  rawDate: string;
  lang: 'tr' | 'en';
}

export default function DailySprintLanding({ rawDate, lang }: DailySprintLandingProps) {
  const iso = parseIsoDate(rawDate) || rawDate;
  const number = dailyPuzzleNumber(iso);
  const today = istanbulTodayIso();
  const isFuture = iso > today;
  const isEn = lang === 'en';
  const playHref = dailyPlayHref(isFuture ? today : iso, lang);

  const title = isEn ? `Scrolly Daily #${number}` : `Scrolly Günlük #${number}`;
  const intro = isEn
    ? 'Five sourced questions, one shared grid. This page does not reveal the answers or anyone’s score.'
    : 'Beş kaynaklı soru, tek bir paylaşım ızgarası. Bu sayfa cevapları ve kimsenin skorunu göstermez.';
  const when = isFuture
    ? isEn
      ? 'This sprint is not open yet. You can play today’s instead.'
      : 'Bu sprint henüz açılmadı. İstersen bugünün sprintini oynayabilirsin.'
    : iso === today
      ? isEn
        ? 'Today’s sprint is open.'
        : 'Bugünün sprinti açık.'
      : isEn
        ? `This is the sprint for ${iso}.`
        : `${iso} sprinti.`;
  const cta = isEn ? 'Play too' : 'Sen de oyna';

  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#FFFDF9] text-[#1E1B2E]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
          {isEn ? 'Daily sprint' : 'Günlük sprint'}
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-[#1E1B2E]/80">{intro}</p>
        <p className="mt-2 text-sm font-semibold text-[#1E1B2E]/60">{when}</p>
        <Link
          href={playHref}
          data-testid="daily-play-cta"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-violet-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-500/25"
        >
          {cta}
        </Link>
        <p className="mt-6 text-xs font-bold text-[#1E1B2E]/45">scrolly.live</p>
      </div>
    </main>
  );
}
