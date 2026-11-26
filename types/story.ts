export type StoryLanguage = 'tr' | 'en';
export type StoryThemeMode = 'dark' | 'light';
export type StorySurfaceStyle = 'glass' | 'solid' | 'editorial';
export type StoryTextAlign = 'left' | 'center';
export type StoryFontStyle = 'modern' | 'editorial' | 'rounded';

export interface StoryTheme {
  mode: StoryThemeMode;
  accent: string;
  surfaceStyle?: StorySurfaceStyle;
  overlayOpacity?: number;
  textAlign?: StoryTextAlign;
  fontStyle?: StoryFontStyle;
}

export interface StoryCardItem {
  id: string;
  headline: string;
  body: string;
  question: string;
  options: string[];
  correctIndex: number;
  sourceLabel: string;
  mediaUrl: string;
  gradientId?: string;
  quizEnabled?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface StoryRecord {
  id: string;
  ownerUserId?: string | null;
  title: string;
  sourceUrl: string | null;
  language: StoryLanguage;
  theme: StoryTheme;
  cards: StoryCardItem[];
  isPublic?: boolean;
  allowEmbed?: boolean;
  allowedEmbedDomains?: string[];
  viewsCount: number;
  completionsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StoryDraft {
  title: string;
  sourceUrl: string | null;
  language: StoryLanguage;
  cards: StoryCardItem[];
}

export interface StoryQuotaSummary {
  plan: 'starter';
  aiMonthlyLimit: number;
  aiMonthlyUsed: number;
  aiMonthlyRemaining: number;
  activeStoriesLimit: number;
  activeStoriesCount: number;
  dailyGlobalRemaining: number;
}

export const STORY_ACCENT_PRESETS: ReadonlyArray<{ id: string; label: string; hex: string }> = [
  { id: 'violet', label: 'Violet', hex: '#7C3AED' },
  { id: 'rose', label: 'Berry Rose', hex: '#C44569' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'sky', label: 'Sky Blue', hex: '#0284C7' },
  { id: 'amber', label: 'Amber', hex: '#D97706' },
  { id: 'indigo', label: 'Indigo', hex: '#6366F1' },
];

export interface StoryGradientPreset {
  id: string;
  labelTr: string;
  labelEn: string;
  css: string;
}

export const STORY_GRADIENT_PRESETS: ReadonlyArray<StoryGradientPreset> = [
  {
    id: 'cosmic-plum',
    labelTr: 'Kozmik Erik',
    labelEn: 'Cosmic Plum',
    css: 'linear-gradient(155deg, #2E1065 0%, #5B21B6 48%, #0F172A 100%)',
  },
  {
    id: 'midnight-aurora',
    labelTr: 'Gece Aurorası',
    labelEn: 'Midnight Aurora',
    css: 'linear-gradient(155deg, #0F172A 0%, #1E3A8A 50%, #312E81 100%)',
  },
  {
    id: 'berry-velvet',
    labelTr: 'Böğürtlen Kadife',
    labelEn: 'Berry Velvet',
    css: 'linear-gradient(155deg, #4C0519 0%, #9D174D 52%, #2A1228 100%)',
  },
  {
    id: 'deep-ocean',
    labelTr: 'Derin Okyanus',
    labelEn: 'Deep Ocean',
    css: 'linear-gradient(155deg, #042F2E 0%, #0E7490 50%, #0B192C 100%)',
  },
  {
    id: 'amber-editorial',
    labelTr: 'Kehribar Editöryal',
    labelEn: 'Amber Editorial',
    css: 'linear-gradient(155deg, #451A03 0%, #B45309 50%, #1E1422 100%)',
  },
  {
    id: 'emerald-noir',
    labelTr: 'Zümrüt Gece',
    labelEn: 'Emerald Noir',
    css: 'linear-gradient(155deg, #064E3B 0%, #047857 46%, #111827 100%)',
  },
];

export function getStoryGradientCss(gradientId?: string, index = 0): string {
  const matched = STORY_GRADIENT_PRESETS.find((g) => g.id === gradientId);
  if (matched) return matched.css;
  return STORY_GRADIENT_PRESETS[Math.abs(index) % STORY_GRADIENT_PRESETS.length].css;
}

export const DEFAULT_STORY_THEME: StoryTheme = {
  mode: 'dark',
  accent: '#C44569',
  surfaceStyle: 'glass',
  overlayOpacity: 58,
  textAlign: 'left',
  fontStyle: 'modern',
};

export const LANDING_DEMO_CARDS: Record<StoryLanguage, StoryCardItem[]> = {
  tr: [
    {
      id: 'demo-1',
      headline: 'Venüs’te Bir Gün, Bir Yıldan Uzundur',
      body: 'Venüs kendi ekseni etrafında ters yönde o kadar yavaş döner ki Güneş etrafındaki 225 günlük yılı, 243 Dünya günü süren kendi gününden kısadır.',
      question: 'Hızlı Tahmin: Venüs’ün kendi eksenindeki 1 tam günü kaç Dünya günü sürer?',
      options: ['243 Dünya günü', '24 saat', '88 Dünya günü'],
      correctIndex: 0,
      sourceLabel: 'NASA Solar System',
      mediaUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
      gradientId: 'cosmic-plum',
      quizEnabled: true,
    },
    {
      id: 'demo-2',
      headline: 'Okyanus Planktonları Oksijenin %50–80’ini Üretir',
      body: 'Mikroskobik fitoplanktonlar, güneş alan yüzey sularında fotosentez yaparak Dünya atmosferindeki oksijenin yarıdan fazlasını sağlar.',
      question: 'Hızlı Tahmin: Gezegendeki oksijenin ana denizel üreticisi hangisidir?',
      options: ['Mercan kayalıkları', 'Fitoplanktonlar', 'Derin deniz bacaları'],
      correctIndex: 1,
      sourceLabel: 'NOAA Ocean Service',
      mediaUrl: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif',
      gradientId: 'deep-ocean',
      quizEnabled: true,
    },
    {
      id: 'demo-3',
      headline: 'Okuyucuyu Pasif Ziyaretçiden Aktif Katılımcıya Çevirin',
      body: 'Statik blog yazılarının altına tek satır <iframe> gömün; GIF arka planlı kartlar ve Quick Guess ile sayfada kalma süresini katlayın.',
      question: 'Scrolly embed oynatıcıyı sitenize eklemek kaç satır kod gerektirir?',
      options: ['Tek satır <iframe>', '10+ dosya kurulumu', 'Özel backend API'],
      correctIndex: 0,
      sourceLabel: 'Scrolly Creator Studio',
      mediaUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
      gradientId: 'berry-velvet',
      quizEnabled: true,
      ctaLabel: 'Scrolly Akışını Keşfet',
      ctaUrl: 'https://scrolly.live',
    },
  ],
  en: [
    {
      id: 'demo-1',
      headline: 'A Day on Venus Lasts Longer Than Its Year',
      body: 'Venus rotates backward so slowly that one full spin takes 243 Earth days—longer than its 225-day orbit around the Sun.',
      question: 'Quick Guess: Roughly how many Earth days is one full spin on Venus?',
      options: ['243 Earth days', '24 hours', '88 Earth days'],
      correctIndex: 0,
      sourceLabel: 'NASA Solar System',
      mediaUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
      gradientId: 'cosmic-plum',
      quizEnabled: true,
    },
    {
      id: 'demo-2',
      headline: 'Ocean Plankton Generate 50–80% of Earth’s Oxygen',
      body: 'Photosynthetic phytoplankton drifting across sunlit ocean layers quietly supply more oxygen than every rainforest combined.',
      question: 'Quick Guess: Which ocean organisms produce most of our oxygen?',
      options: ['Deep sea vents', 'Phytoplankton', 'Coral reefs'],
      correctIndex: 1,
      sourceLabel: 'NOAA Ocean Service',
      mediaUrl: 'https://media.giphy.com/media/3o7btNa0RUYa5E7iiQ/giphy.gif',
      gradientId: 'deep-ocean',
      quizEnabled: true,
    },
    {
      id: 'demo-3',
      headline: 'Turn Passive Readers Into Active Participants',
      body: 'Embed a responsive <iframe> inside any newsletter, news story, or course page—complete with GIF scenes and Quick Guess.',
      question: 'How much code does it take to embed a Scrolly deck on your site?',
      options: ['A single <iframe> line', 'Full SDK setup', 'Custom backend'],
      correctIndex: 0,
      sourceLabel: 'Scrolly Creator Studio',
      mediaUrl: 'https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif',
      gradientId: 'berry-velvet',
      quizEnabled: true,
      ctaLabel: 'Explore Scrolly Live',
      ctaUrl: 'https://scrolly.live/en',
    },
  ],
};
