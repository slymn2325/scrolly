import { preload } from 'react-dom';
import { getImageProps } from 'next/image';
import HomeScreen from '@/components/HomeScreen';
import { buildHomeMetadata } from '@/lib/homeMetadata';
import { getAllFactsServer } from '@/lib/db';
import { staticPosterUrl } from '@/utils/cardMediaUrl';
import { interleaveFactsByCategory } from '@/utils/factsData';

export const dynamic = 'force-dynamic';
export const metadata = buildHomeMetadata('tr');

const CARD_IMAGE_SIZES =
  '(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 720px, 390px';

function preloadFirstPoster(src: string | null, alt: string) {
  if (!src || src.includes('magnifying-glass')) return;
  try {
    const { props } = getImageProps({
      src,
      alt,
      fill: true,
      preload: true,
      fetchPriority: 'high',
      sizes: CARD_IMAGE_SIZES,
    });
    preload(props.src, {
      as: 'image',
      fetchPriority: 'high',
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
    });
  } catch {
    // A poster the image optimizer cannot accept still renders in the card.
  }
}

export default async function HomePage() {
  const facts = interleaveFactsByCategory(await getAllFactsServer());
  const first = facts[0];
  preloadFirstPoster(
    first ? staticPosterUrl(first.gifUrl, first.posterUrl) : null,
    first?.tr.title ?? ''
  );
  return <HomeScreen lang="tr" />;
}
