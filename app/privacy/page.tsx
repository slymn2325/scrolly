import type { Metadata } from 'next';
import PrivacyPolicyView from '@/components/PrivacyPolicyView';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası / Privacy Policy | Scrolly',
  description:
    'Scrolly (scrolly.live) çerez kullanımı, Google AdSense (ca-pub-1368005726792126), Google Analytics (GTM-TQ6VVKM7) ve veri sorumlusu (contact@scrolly.live) politikası.',
  alternates: {
    canonical: 'https://scrolly.live/privacy',
  },
  openGraph: {
    title: 'Gizlilik Politikası / Privacy Policy | Scrolly',
    description:
      'Cookie notice, Google AdSense (ca-pub-1368005726792126), Google Analytics (GTM-TQ6VVKM7), and data controller contact (contact@scrolly.live).',
    url: 'https://scrolly.live/privacy',
    siteName: 'Scrolly',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return <PrivacyPolicyView />;
}
