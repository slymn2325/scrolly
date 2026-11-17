import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
    './i18n/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cik: {
          bg: '#FFF4F7',
          surface: '#FFFFFF',
          text: '#5B2A43',
          muted: '#8A5670',
          pink: '#FFD6E6',
          berry: '#FF8DB8',
          cta: '#C44569',
          mint: '#CFF5E7',
          butter: '#FFE8A3',
          line: '#F3C5D6',
        },
        'cik-dark': {
          bg: '#2A1B2F',
          surface: '#3A2741',
          text: '#FFEFF6',
          muted: '#C9A3B5',
          primary: '#FF9EC4',
        },
        cream: '#FFF6EC',
        midnight: '#14111C',
        ink: '#1C1730',
        mute: '#5E5770',
        brand: '#6B4BFF',
        'violet-soft': '#EDE8FF',
        peach: '#FF7A59',
        gold: '#E8B43A',
        mint: '#1AAE8F',
        night: '#14111C',
        'night-2': '#1E1A29',
        surface: '#FFFCF8',
        pastel: {
          lavender: '#EDE8FF',
          mint: '#DFF6EE',
          coral: '#FCE8F3',
          sun: '#FDEED8',
          sky: '#E5F3FF',
          rose: '#FCE8F3',
        },
      },
      boxShadow: {
        sticker: '0 3px 0 #FF8DB8, 0 8px 16px rgba(196, 69, 105, 0.18)',
        'sticker-press': '0 1px 0 #FF8DB8, 0 3px 8px rgba(196, 69, 105, 0.16)',
        cozy: '0 16px 40px -12px rgba(30, 27, 46, 0.10), 0 4px 12px -2px rgba(30, 27, 46, 0.05)',
        'cozy-lg': '0 24px 56px -14px rgba(30, 27, 46, 0.14), 0 8px 20px -4px rgba(30, 27, 46, 0.06)',
        pill: '0 6px 16px -6px rgba(28,23,48,0.16)',
        dock: '0 10px 30px -12px rgba(20,17,28,0.45)',
      },
      borderRadius: {
        card: '28px',
        nest: '22px',
        ctl: '16px',
        sticker: '28px',
        sheet: '32px',
        pill: '999px',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        lumen: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        'lumen-display': ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
