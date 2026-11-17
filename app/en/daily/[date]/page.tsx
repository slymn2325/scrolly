import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DailySprintLanding from '@/components/DailySprintLanding';
import { dailyPuzzleNumber, dailyResultPath, parseIsoDate, PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const iso = parseIsoDate(date);
  if (!iso) return { title: 'Scrolly Daily' };
  const number = dailyPuzzleNumber(iso);
  const title = `Scrolly Daily #${number}`;
  const description = '5 sourced questions. No spoilers — play and share your grid.';
  const url = `${PUBLIC_SITE_ORIGIN}${dailyResultPath(iso, 'en')}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${PUBLIC_SITE_ORIGIN}${dailyResultPath(iso, 'tr')}`,
        en: url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function EnglishDailyPage({ params }: PageProps) {
  const { date } = await params;
  const iso = parseIsoDate(date);
  if (!iso) notFound();
  return <DailySprintLanding rawDate={iso} lang="en" />;
}
