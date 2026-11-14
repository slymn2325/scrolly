import { ImageResponse } from 'next/og';
import { ScrollyAppIconArtwork } from '@/lib/scrollyIcon';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<ScrollyAppIconArtwork size={512} />, {
    ...size,
  });
}
