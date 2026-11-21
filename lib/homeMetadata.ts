import type { Metadata } from 'next';
import { fitDocumentTitle } from '@/utils/factSeo';

const HOME_TR = 'https://scrolly.live';
const HOME_EN = 'https://scrolly.live/en';

export const BRAND_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Scrolly',
} as const;

const HOME_COPY = {
  tr: {
    title: 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz',
    description:
      'Uzay, doğa, insan vücudu, tarih, bilim ve B1–C2 İngilizce kelime kartlarını kaydır; Hızlı Tahmin, 5 soruluk Quiz ve Scrolla 1v1 düellosunda yarış!',
  },
  en: {
    title: 'Scrolly — Scroll, Learn, Wonder | Micro-Learning & Quiz',
    description:
      'Explore verified space, nature, body, history, science, and B1–C2 Word Lab cards. Play Quick Guess sliders, 5-card quizzes, and Scrolla 1v1 duels.',
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
