import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DailySprintLanding from '@/components/DailySprintLanding';
import { dailyPuzzleNumber, dailyResultPath, parseIsoDate, PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ tarih: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tarih } = await params;
  const iso = parseIsoDate(tarih);
  if (!iso) return { title: 'Scrolly Günlük' };
  const number = dailyPuzzleNumber(iso);
  const title = `Scrolly Günlük #${number}`;
  const description = '5 kaynaklı soru. Cevap yok — sen de oyna ve ızgaranı paylaş.';
  const url = `${PUBLIC_SITE_ORIGIN}${dailyResultPath(iso, 'tr')}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: url,
        en: `${PUBLIC_SITE_ORIGIN}${dailyResultPath(iso, 'en')}`,
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

export default async function GunlukPage({ params }: PageProps) {
  const { tarih } = await params;
  const iso = parseIsoDate(tarih);
  if (!iso) notFound();
  return <DailySprintLanding rawDate={iso} lang="tr" />;
}
