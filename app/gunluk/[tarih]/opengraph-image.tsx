import { dailyOgImage, VIRAL_OG_SIZE } from '@/lib/viralOgCard';

export const alt = 'Scrolly Günlük';
export const size = VIRAL_OG_SIZE;
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ tarih: string }>;
}

export default async function GunlukOpenGraphImage({ params }: OgProps) {
  const { tarih } = await params;
  return dailyOgImage(tarih, 'tr');
}
