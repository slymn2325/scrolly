import type { Metadata } from 'next';
import StudioGateClient from '@/components/stories/StudioGateClient';

export const metadata: Metadata = {
  title: 'Scrolly Creator Studio — Etkileşimli Hikâye & Embed Platformu | Scrolly',
  description:
    'Durağan makale URL’lerini veya metinleri 30 saniyede GIF destekli, Quick Guess etkileşimli hikâyelere dönüştürün ve sitenize tek satır <iframe> ile gömün.',
  alternates: {
    canonical: 'https://scrolly.live/studio',
  },
};

export default function StudioPage() {
  return <StudioGateClient />;
}
