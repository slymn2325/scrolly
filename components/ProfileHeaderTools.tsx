'use client';

import React from 'react';
import { Moon, Settings, Sun, Volume2, VolumeX } from 'lucide-react';
import IconButton from '@/components/cikartma/IconButton';
import { profileCopy } from '@/components/profile/copy';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';

interface ProfileHeaderToolsProps {
  lang: Language;
  dark: boolean;
  soundOn: boolean;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
}

export default function ProfileHeaderTools({
  lang,
  dark,
  soundOn,
  settingsOpen,
  onOpenSettings,
  onToggleTheme,
  onToggleSound,
}: ProfileHeaderToolsProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <IconButton
        data-testid="profile-theme-btn"
        label={dark ? copy.themeToLight : copy.themeToDark}
        onClick={onToggleTheme}
      >
        {dark ? <Sun size={20} strokeWidth={2} aria-hidden="true" /> : <Moon size={20} strokeWidth={2} aria-hidden="true" />}
      </IconButton>
      <IconButton
        data-testid="profile-sound-btn"
        label={soundOn ? copy.soundOn : copy.soundOff}
        onClick={onToggleSound}
      >
        {soundOn ? (
          <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
        ) : (
          <VolumeX size={20} strokeWidth={2} aria-hidden="true" />
        )}
      </IconButton>
      <IconButton
        data-testid="profile-settings-btn"
        label={t.profileSettings}
        aria-expanded={settingsOpen}
        onClick={onOpenSettings}
      >
        <Settings size={20} strokeWidth={2} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
