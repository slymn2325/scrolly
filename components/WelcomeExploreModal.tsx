'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, UserCheck } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import BrandLogo from '@/components/BrandLogo';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
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
          className="absolute inset-0 z-[70] flex min-h-full w-full flex-col overflow-y-auto no-scrollbar bg-[#0A0A0E] text-white"
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative mx-auto flex min-h-full w-full max-w-[460px] flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top,18px)+28px)] pb-[calc(env(safe-area-inset-bottom,18px)+28px)] text-white"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl"
            />
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandLogo size={56} id="welcome-brand" />
                <div>
                  <p className="font-display text-3xl font-black tracking-tight leading-none">Scrolly</p>
                  <p className="mt-1 text-[11px] font-semibold tracking-wide text-violet-200/75">
                    {lang === 'tr' ? 'Kaydır · Öğren · Merak Et' : 'Scroll · Learn · Wonder'}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">
                <img
                  src={UI_ICON_PATHS.xpSparkles}
                  alt=""
                  aria-hidden="true"
                  width={12}
                  height={12}
                  decoding="async"
                  className="h-3 w-3 object-contain"
                />
                <span>{lang === 'tr' ? 'Kâşif Modu' : 'Explorer Pass'}</span>
              </span>
            </div>

            <h2 className="mt-3 font-display text-xl font-bold leading-snug">{title}</h2>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/75">{body}</p>

            {/* Gamified Nickname Selector */}
            <div className="mt-4 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="welcome-nickname-input"
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-200"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{lang === 'tr' ? 'Kâşif Takma Adın' : 'Your Explorer Nickname'}</span>
                </label>
                <button
                  type="button"
                  data-testid="welcome-roll-nickname-btn"
                  onClick={handleRollNew}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90 transition hover:bg-white/20"
                >
                  <Dices className="h-3 w-3 text-amber-300" />
                  <span>{lang === 'tr' ? 'Rastgele Seç' : 'Roll'}</span>
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
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/60 focus:border-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              />

              <p className="mt-1.5 text-[11px] font-semibold text-white/55">
                {nicknameInput.trim()
                  ? lang === 'tr'
                    ? `Özel adınla devam edeceksin: ${nicknameInput.trim()}`
                    : `Joining as: ${nicknameInput.trim()}`
                  : lang === 'tr'
                    ? `Boş bırakırsan sistem seçimiyle başlarsın: "${systemSuggested}"`
                    : `Leave blank to continue with: "${systemSuggested}"`}
              </p>
            </div>

            <button
              type="submit"
              data-testid="welcome-start-btn"
              className="relative z-10 mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition active:scale-[0.98]"
            >
              <span>{cta}</span>
            </button>
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
    <div className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top,12px)+4.75rem)] z-[46] flex justify-center">
      <div
        data-testid="value-prop-line"
        className="pointer-events-auto flex max-w-[440px] items-start gap-2 rounded-2xl border border-white/15 bg-[#12121D]/92 px-3 py-2 text-[12px] font-semibold leading-snug text-white shadow-lg"
      >
        <p>{VALUE_PROP_TR}</p>
        <button
          type="button"
          data-testid="value-prop-dismiss"
          onClick={onDismiss}
          aria-label={lang === 'tr' ? 'Kapat' : 'Dismiss'}
          className="mt-0.5 shrink-0 rounded-full px-1 text-sm leading-none text-white/70"
        >
          ×
        </button>
      </div>
    </div>
  );
}
