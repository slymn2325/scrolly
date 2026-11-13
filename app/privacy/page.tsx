import type { Metadata } from 'next';
import PrivacyPolicyView from '@/components/PrivacyPolicyView';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası / Privacy Policy | Scrolly',
  description:
    'Scrolly (scrolly.live) çerez kullanımı, anonim yerel depolama ve Google AdSense reklam politikaları hakkında bilgilendirme.',
  alternates: {
    canonical: 'https://scrolly.live/privacy',
  },
  openGraph: {
    title: 'Gizlilik Politikası / Privacy Policy | Scrolly',
    description:
      'Cookie notice, anonymous local browser memory, and Google AdSense disclosures for Scrolly.',
    url: 'https://scrolly.live/privacy',
    siteName: 'Scrolly',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return <PrivacyPolicyView />;
}
