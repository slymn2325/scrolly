import { Baloo_2, Nunito } from 'next/font/google';

export const fontDisplay = Baloo_2({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-baloo',
  fallback: ['ui-rounded', 'SF Pro Rounded', 'system-ui', 'Segoe UI', 'sans-serif'],
  preload: true,
});

export const fontText = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  adjustFontFallback: true,
  variable: '--font-nunito',
  fallback: ['ui-rounded', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
  preload: true,
});

export const fontVariableClassName = `${fontDisplay.variable} ${fontText.variable}`;
