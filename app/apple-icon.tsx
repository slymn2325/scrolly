import { ImageResponse } from 'next/og';
import { ScrollyAppIconArtwork } from '@/lib/scrollyIcon';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<ScrollyAppIconArtwork size={180} />, {
    ...size,
  });
}
