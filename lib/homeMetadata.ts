import type { Metadata } from 'next';
import { fitDocumentTitle } from '@/utils/factSeo';

const HOME_TR = 'https://scrolly.live/';
const HOME_EN = 'https://scrolly.live/en';

export const BRAND_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Scrolly',
} as const;

const HOME_COPY = {
  tr: {
    title: 'Scrolly — Tek Saniyede Mikro Keşif | scrolly.live',
    description:
      'Uzay, doğa, insan vücudu, tarih ve bilim hakkında şaşırtıcı bilgiler keşfet, son 5 kartla hafıza quizine gir ve skorunu paylaş!',
  },
  en: {
    title: 'Scrolly — A Micro Discovery in One Second | scrolly.live',
    description:
      'Discover surprising facts about space, nature, the human body, history, and science. Quiz the last five cards and share your score.',
  },
} as const;

export function buildHomeMetadata(lang: 'tr' | 'en'): Metadata {
  const copy = HOME_COPY[lang];
  const title = fitDocumentTitle(copy.title);
  const canonical = lang === 'en' ? HOME_EN : HOME_TR;
  const image = { ...BRAND_OG_IMAGE, alt: title };
  return {
    title,
    description: copy.description,
    alternates: {
      canonical,
      languages: {
        tr: HOME_TR,
        en: HOME_EN,
        'x-default': HOME_TR,
      },
    },
    openGraph: {
      title,
      description: copy.description,
      url: canonical,
      siteName: 'Scrolly',
      locale: lang === 'en' ? 'en_US' : 'tr_TR',
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: copy.description,
      images: [image.url],
    },
  };
}
