'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, UserCheck, X } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import BrandLogo from '@/components/BrandLogo';
import Button from '@/components/cikartma/Button';
import { motionTiming } from '@/lib/motion';
import { isGenericDefaultNickname } from '@/utils/userMemory';

export const WELCOME_DISMISS_KEY = 'scrolly_welcome_dismissed_v1';
export const NICKNAME_ASKED_KEY = 'scrolly_nickname_asked_v1';
export const VALUE_PROP_DISMISSED_KEY = 'scrolly_value_prop_dismissed_v1';

export const VALUE_PROP_TR =
  'Beyin çürütmeyen kaydırma: her gün 5 kaynaklı bilgi, istersen İngilizcesiyle.';
export const VALUE_PROP_EN =
  'Scrolling that doesn’t rot your brain: 5 sourced facts a day, in English when you want.';

export function valuePropLine(lang: Language): string {
  return lang === 'tr' ? VALUE_PROP_TR : VALUE_PROP_EN;
}

const SYSTEM_NICKNAMES_TR = [
  'Kozmik Tilki',
  'Veri Kâşifi',
  'Kuantum Baykuş',
  'Merak Avcısı',
  'Yıldız Gezgini',
  'Süpernova Zihin',
  'Bilgi Kartalı',
  'Zaman Yolcusu',
];

const SYSTEM_NICKNAMES_EN = [
  'Cosmic Fox',
  'Data Explorer',
  'Quantum Owl',
  'Wonder Hunter',
  'Star Voyager',
  'Nova Mind',
  'Fact Falcon',
  'Time Traveler',
];

export function generateSystemNickname(lang: Language): string {
  const pool = lang === 'tr' ? SYSTEM_NICKNAMES_TR : SYSTEM_NICKNAMES_EN;
  const base = pool[Math.floor(Math.random() * pool.length)];
  const code = Math.floor(10 + Math.random() * 89);
  return `${base} #${code}`;
}

interface WelcomeExploreModalProps {
  open: boolean;
  lang: Language;
  initialNickname?: string;
  onStart: (chosenNickname: string) => void;
}

export default function WelcomeExploreModal({
  open,
  lang,
  initialNickname,
  onStart,
}: WelcomeExploreModalProps) {
  const hasCustomInitial =
    Boolean(initialNickname?.trim()) && !isGenericDefaultNickname(initialNickname);

  const [systemSuggested, setSystemSuggested] = useState<string>(() =>
    hasCustomInitial ? initialNickname!.trim() : generateSystemNickname(lang)
  );
  const [nicknameInput, setNicknameInput] = useState<string>(() =>
    hasCustomInitial ? initialNickname!.trim() : ''
  );

  useEffect(() => {
    if (!open) return;
    if (initialNickname?.trim() && !isGenericDefaultNickname(initialNickname)) {
      const custom = initialNickname.trim();
      setSystemSuggested(custom);
      setNicknameInput((prev) => prev || custom);
      return;
    }
    setSystemSuggested((prev) => prev || generateSystemNickname(lang));
  }, [open, initialNickname, lang]);

  const title = lang === 'tr' ? 'Skoruna bir ad koy' : 'Put a name on your score';
  const body = valuePropLine(lang);
  const cta = lang === 'tr' ? 'Bu adla devam et' : 'Continue with this name';

  const resolvedNickname = nicknameInput.trim() || systemSuggested;

  const handleRollNew = () => {
    const rolled = generateSystemNickname(lang);
    setSystemSuggested(rolled);
    setNicknameInput(rolled);
  };

  const handleSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onStart(resolvedNickname.slice(0, 24));
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          aria-label={title}
          data-testid="welcome-explore-modal"
          data-presentation="page"
          className="absolute inset-0 z-modal flex min-h-full w-full flex-col overflow-y-auto bg-cik-bg text-cik-text"
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTiming.reducedFade}
            className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-8"
          >
            <div className="mb-4 flex items-center gap-3">
              <BrandLogo size={40} id="welcome-brand" />
              <div>
                <p className="cik-title-2 text-cik-text">Scrolly</p>
                <p className="cik-caption-2 text-cik-text-2">
                  {lang === 'tr' ? 'Kaydır · Öğren · Şaşır' : 'Scroll · Learn · Wonder'}
                </p>
              </div>
            </div>

            <h2 className="cik-title-3 text-cik-text">{title}</h2>
            <p className="cik-body mt-2 text-cik-text-2">{body}</p>

            <div className="mt-4 rounded-cik-lg border border-cik-line bg-cik-surface p-4 shadow-e1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="welcome-nickname-input"
                  className="cik-footnote inline-flex items-center gap-2 text-cik-text"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'tr' ? 'Takma adın' : 'Your nickname'}</span>
                </label>
                <button
                  type="button"
                  data-testid="welcome-roll-nickname-btn"
                  onClick={handleRollNew}
                  className="cik-caption-1 inline-flex h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface-2 px-3 text-cik-text"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'tr' ? 'Rastgele' : 'Roll'}</span>
                </button>
              </div>

              <input
                id="welcome-nickname-input"
                data-testid="welcome-nickname-input"
                type="text"
                maxLength={24}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={systemSuggested}
                className="cik-body mt-3 h-11 w-full rounded-cik-sm border border-cik-line bg-cik-surface-2 px-3 text-cik-text placeholder:text-cik-text-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cik-focus"
              />

              <p className="cik-caption-1 mt-2 text-cik-text-2">
                {nicknameInput.trim()
                  ? lang === 'tr'
                    ? `Bu adla devam: ${nicknameInput.trim()}`
                    : `Continuing as ${nicknameInput.trim()}`
                  : lang === 'tr'
                    ? `Boş bırakırsan: ${systemSuggested}`
                    : `Leave blank for ${systemSuggested}`}
              </p>
            </div>

            <Button type="submit" data-testid="welcome-start-btn" className="relative z-10 mt-5 w-full">
              {cta}
            </Button>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

export function readWelcomeDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(WELCOME_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistWelcomeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WELCOME_DISMISS_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearWelcomeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WELCOME_DISMISS_KEY);
  } catch {
    // ignore quota / private mode
  }
}

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // ignore quota / private mode
  }
}

function removeFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore quota / private mode
  }
}

export function readNicknameAsked(): boolean {
  return readFlag(NICKNAME_ASKED_KEY);
}

export function persistNicknameAsked(): void {
  writeFlag(NICKNAME_ASKED_KEY);
}

export function clearNicknameAsked(): void {
  removeFlag(NICKNAME_ASKED_KEY);
}

export function consumeNicknamePrompt(nickname: string, isGeneric: boolean): boolean {
  if (readNicknameAsked()) return false;
  persistNicknameAsked();
  return isGeneric;
}

export function readValuePropDismissed(): boolean {
  return readFlag(VALUE_PROP_DISMISSED_KEY);
}

export function persistValuePropDismissed(): void {
  writeFlag(VALUE_PROP_DISMISSED_KEY);
}

export function clearValuePropDismissed(): void {
  removeFlag(VALUE_PROP_DISMISSED_KEY);
}

interface ValuePropBannerProps {
  visible: boolean;
  lang: Language;
  onDismiss: () => void;
}

export function ValuePropBanner({ visible, lang, onDismiss }: ValuePropBannerProps) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+64px)] z-toast flex justify-center">
      <div
        data-testid="value-prop-line"
        className="material-thick pointer-events-auto flex max-w-md items-start gap-2 rounded-cik-lg border border-cik-line px-3 py-2 text-cik-text shadow-e1"
      >
        <p className="cik-footnote">{valuePropLine(lang)}</p>
        <button
          type="button"
          data-testid="value-prop-dismiss"
          onClick={onDismiss}
          aria-label={lang === 'tr' ? 'Kapat' : 'Dismiss'}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-cik-text"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
