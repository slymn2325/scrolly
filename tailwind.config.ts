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
        cozy: '0 16px 40px -12px rgba(30, 27, 46, 0.10), 0 4px 12px -2px rgba(30, 27, 46, 0.05)',
        'cozy-lg': '0 24px 56px -14px rgba(30, 27, 46, 0.14), 0 8px 20px -4px rgba(30, 27, 46, 0.06)',
        pill: '0 6px 16px -6px rgba(28,23,48,0.16)',
        dock: '0 10px 30px -12px rgba(20,17,28,0.45)',
      },
      borderRadius: {
        card: '28px',
        nest: '22px',
        ctl: '16px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
