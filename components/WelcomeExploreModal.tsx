'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, Sparkles, UserCheck } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import { isGenericDefaultNickname } from '@/utils/userMemory';

export const WELCOME_DISMISS_KEY = 'scrolly_welcome_dismissed_v1';

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

  const title = lang === 'tr' ? 'Scrolly’ye hoş geldin' : 'Welcome to Scrolly';
  const body =
    lang === 'tr'
      ? 'Her kaydırmada şaşırtıcı bir keşif. Kendi takma adını seç ya da sistemin senin için seçtiği kimlikle başla!'
      : 'A wonder in every swipe. Pick your explorer nickname or jump straight in with our suggested identity!';
  const cta = lang === 'tr' ? 'Keşfetmeye Başla' : 'Start Exploring';

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
          role="dialog"
          aria-modal="true"
          aria-label={title}
          data-testid="welcome-explore-modal"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 px-4 backdrop-blur-md"
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative w-full max-w-[400px] overflow-hidden rounded-3xl border border-white/15 bg-[#121218] p-6 text-white shadow-2xl dark:border-violet-500/25"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl"
            />
            <div className="flex items-center justify-between">
              <p className="font-display text-3xl font-black tracking-tight">Scrolly</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">
                <Sparkles className="h-3 w-3" />
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
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white placeholder:text-white/45 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
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
