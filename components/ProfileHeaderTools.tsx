'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import type { Language } from '@/i18n/translations';

export default function ProfileHeaderTools({ lang }: { lang: Language }) {
  const [dark, setDark] = useState(true);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  return (
    <div className="mb-3 flex items-start justify-end gap-2">
      <button
        type="button"
        data-testid="profile-theme-btn"
        title={dark ? (lang === 'tr' ? 'Açık tema' : 'Light theme') : lang === 'tr' ? 'Koyu tema' : 'Dark theme'}
        aria-label={dark ? 'Light theme' : 'Dark theme'}
        onClick={() => {
          setDark((prev) => !prev);
          window.dispatchEvent(new CustomEvent('scrolly-toggle-theme'));
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-cik-line bg-white text-cik-text"
      >
        {dark ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
      </button>
      <button
        type="button"
        data-testid="profile-sound-btn"
        title={sound ? (lang === 'tr' ? 'Sesi kapat' : 'Mute') : lang === 'tr' ? 'Sesi aç' : 'Sound on'}
        aria-label={sound ? 'Mute' : 'Sound'}
        onClick={() => {
          setSound((prev) => !prev);
          window.dispatchEvent(new CustomEvent('scrolly-toggle-sound'));
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-cik-line bg-white text-cik-text"
      >
        {sound ? <Volume2 className="h-5 w-5" strokeWidth={2} /> : <VolumeX className="h-5 w-5" strokeWidth={2} />}
      </button>
    </div>
  );
}
