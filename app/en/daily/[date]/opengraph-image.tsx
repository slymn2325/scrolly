import { dailyOgImage, VIRAL_OG_SIZE } from '@/lib/viralOgCard';

export const alt = 'Scrolly Daily';
export const size = VIRAL_OG_SIZE;
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ date: string }>;
}

export default async function EnglishDailyOpenGraphImage({ params }: OgProps) {
  const { date } = await params;
  return dailyOgImage(date, 'en');
}
