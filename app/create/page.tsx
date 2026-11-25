import type { Metadata } from 'next';
import StoryStudioClient from '@/components/stories/StoryStudioClient';

export const metadata: Metadata = {
  title: 'Scrollytelling Studio — İnteraktif Hikâye Oluştur | Scrolly',
  description:
    'Herhangi bir makale URL’sini veya metni saniyeler içinde gömülebilir interaktif mikro öğrenme ve Quick Guess kart destesine dönüştür.',
  alternates: {
    canonical: 'https://scrolly.live/create',
  },
};

export default function CreateStoryPage() {
  return <StoryStudioClient />;
}
