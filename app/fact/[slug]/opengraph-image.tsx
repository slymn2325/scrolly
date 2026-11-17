import { factOgSize, loadFactOpenGraphImage } from '@/lib/factOpenGraphImage';

export const revalidate = 3600;
export const alt = 'Scrolly — Doğrulanmış Mikro Öğrenme Kartı';
export const size = factOgSize;
export const contentType = 'image/png';

interface OgProps {
  params: Promise<{ slug: string }>;
}

export default async function FactOpenGraphImage({ params }: OgProps) {
  const { slug } = await params;
  return loadFactOpenGraphImage(slug, 'tr');
}
