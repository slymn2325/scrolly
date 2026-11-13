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
        cream: '#FFFDF9',
        midnight: '#0F0D1A',
        ink: '#1E1B2E',
        pastel: {
          lavender: '#EFEAFF',
          mint: '#E6FAF5',
          coral: '#FFEAE5',
          sun: '#FEF6D8',
          sky: '#E5F6FF',
          rose: '#FCE8F3',
        },
      },
      boxShadow: {
        cozy: '0 16px 40px -12px rgba(30, 27, 46, 0.10), 0 4px 12px -2px rgba(30, 27, 46, 0.05)',
        'cozy-lg': '0 24px 56px -14px rgba(30, 27, 46, 0.14), 0 8px 20px -4px rgba(30, 27, 46, 0.06)',
        pill: '0 4px 14px -2px rgba(30, 27, 46, 0.08)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Fredoka"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
