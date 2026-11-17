'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { requestEmailOtp, verifyEmailOtp } from '@/lib/authClient';
import type { AuthUserDto } from '@/types/auth';
import { useEscapeClose } from '@/utils/useEscapeClose';

export const AUTH_NUDGE_DISMISS_KEY = 'scrolly_auth_nudge_dismissed_until';
export const AUTH_NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function isAuthNudgeCoolingDown(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(AUTH_NUDGE_DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function persistAuthNudgeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      AUTH_NUDGE_DISMISS_KEY,
      String(Date.now() + AUTH_NUDGE_COOLDOWN_MS)
    );
  } catch {
    // Ignore storage failures
  }
}

export function clearAuthNudgeDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_NUDGE_DISMISS_KEY);
  } catch {
    // Ignore storage failures
  }
}

export type AuthTriggerSource =
  | 'quiz'
  | 'save'
  | 'leaderboard'
  | 'duel'
  | 'profile'
  | 'manual';

interface LazyAuthPromptProps {
  open: boolean;
  nudgeOpen: boolean;
  /** Mobile Profile/Leaderboard tops only — never a sticky desktop overlay */
  nudgePlacement?: 'page-top' | 'hidden';
  trigger?: AuthTriggerSource | string;
  lang: Language;
  darkMode?: boolean;
  currentXp: number;
  onCloseModal: () => void;
  onDismissNudge: () => void;
  onOpenModalFromNudge: () => void;
  onAuthenticated: (user: AuthUserDto) => void;
}

function getContextualReason(trigger: string | undefined, lang: Language): string {
  if (trigger === 'quiz') {
    return lang === 'tr'
      ? 'Quiz skorun ve XP ilerlemen tüm cihazlarında saklansın.'
      : 'Keep your quiz scores and XP synced across all your devices.';
  }
  if (trigger === 'save') {
    return lang === 'tr'
      ? 'Kaydettiğin kartları ve kelime defterini kaybetmemek için bağla.'
      : 'Link an email so your saved facts and word notebook stay backed up.';
  }
  if (trigger === 'leaderboard' || trigger === 'duel') {
    return lang === 'tr'
      ? 'Lig sıralamanı ve 1v1 geçmişini e-posta ile güvenceye al.'
      : 'Protect your league rank and 1v1 duel progress with your email.';
  }
  return lang === 'tr'
    ? 'Misafir ilerlemeni (XP, seri, kayıtlar ve kelimeler) sıfır kayıpla hesabına aktar.'
    : 'Sync your guest XP, streak, saved cards, and word notebook with one code.';
}

function getNudgeHeadline(trigger: string | undefined, lang: Language): string {
  if (trigger === 'quiz') {
    return lang === 'tr' ? 'Quiz XP puanını kaydet!' : 'Save your quiz XP!';
  }
  if (trigger === 'save') {
    return lang === 'tr' ? 'Kayıtlarını bulutta sakla' : 'Back up your saves';
  }
  if (trigger === 'leaderboard' || trigger === 'duel') {
    return lang === 'tr' ? 'Sıralama kimliğini koru' : 'Protect your rank';
  }
  return lang === 'tr' ? 'İlerlemeni hesabına bağla' : 'Link your progress';
}

function mapOtpError(code: string | undefined, lang: Language, cooldownSec?: number): string {
  switch (code) {
    case 'invalid_email':
      return lang === 'tr'
        ? 'Lütfen geçerli bir e-posta adresi gir.'
        : 'Please enter a valid email address.';
    case 'disposable_email':
      return lang === 'tr'
        ? 'Geçici/tek kullanımlık e-posta adresleri kabul edilmiyor.'
        : 'Disposable or temporary email domains are not allowed.';
    case 'cooldown':
    case 'rate_limited':
      return lang === 'tr'
        ? `Çok sık deneme yapıldı. ${cooldownSec ? `${cooldownSec} sn` : 'Biraz'} sonra tekrar dene.`
        : `Please wait ${cooldownSec ? `${cooldownSec}s` : 'a moment'} before trying again.`;
    case 'invalid_code':
    case 'code_mismatch':
      return lang === 'tr'
        ? 'Kod hatalı. Lütfen 6 haneli kodu kontrol et.'
        : 'Incorrect code. Please check the 6-digit code and try again.';
    case 'code_expired':
      return lang === 'tr'
        ? 'Bu kodun süresi doldu. Yeni kod isteyebilirsin.'
        : 'This code has expired. Request a fresh one.';
    case 'too_many_attempts':
      return lang === 'tr'
        ? 'Çok fazla hatalı deneme. Yeni bir doğrulama kodu iste.'
        : 'Too many invalid attempts. Please request a new code.';
    case 'mail_unavailable':
    case 'delivery_failed':
      return lang === 'tr'
        ? 'E-posta servisi şu anda yanıt vermiyor. Lütfen biraz sonra tekrar dene.'
        : 'Email delivery is temporarily unavailable. Please try again shortly.';
    case 'network_error':
      return lang === 'tr'
        ? 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.'
        : 'Could not reach server. Check your connection and try again.';
    case 'verification_failed':
    case undefined:
      return lang === 'tr'
        ? 'İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.'
        : 'Could not complete request. Check your connection and try again.';
    default:
      return code;
  }
}

export default function LazyAuthPrompt({
  open,
  nudgeOpen,
  nudgePlacement = 'page-top',
  trigger = 'manual',
  lang,
  darkMode = true,
  currentXp,
  onCloseModal,
  onDismissNudge,
  onOpenModalFromNudge,
  onAuthenticated,
}: LazyAuthPromptProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEscapeClose(open, onCloseModal);

  useEffect(() => {
    if (!open) {
      setErrorMsg(null);
      return;
    }
    setErrorMsg(null);
  }, [open]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg(mapOtpError('invalid_email', lang));
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    const res = await requestEmailOtp({ email: cleanEmail, lang });
    setBusy(false);

    if (!res.ok) {
      if (res.cooldownSec > 0) {
        setCooldownSec(res.cooldownSec);
      }
      setErrorMsg(mapOtpError(res.error, lang, res.cooldownSec));
      return;
    }

    setEmail(cleanEmail);
    setCooldownSec(res.cooldownSec > 0 ? res.cooldownSec : 60);
    setDevOtpCode(res.devOtpCode ?? null);
    setCode('');
    setStep('code');
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setErrorMsg(
        lang === 'tr'
          ? '6 haneli sayısal kodu eksiksiz gir.'
          : 'Enter the full 6-digit numeric code.'
      );
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    const res = await verifyEmailOtp({ email: email.trim().toLowerCase(), code: cleanCode, lang });
    setBusy(false);

    if (!res.ok || !res.authenticated || !res.user) {
      setErrorMsg(mapOtpError(res.error, lang));
      return;
    }

    setStep('email');
    setCode('');
    setDevOtpCode(null);
    onAuthenticated(res.user);
  };

  const surfaceClass = darkMode
    ? 'border-white/15 bg-[#141122] text-white'
    : 'border-[#1E1B2E]/15 bg-[#FFFDF9] text-[#1E1B2E]';
  const inputClass = darkMode
    ? 'border-white/20 bg-black/40 text-white placeholder:text-white/45 focus-visible:border-violet-400'
    : 'border-[#1E1B2E]/20 bg-white text-[#1E1B2E] placeholder:text-[#1E1B2E]/45 focus-visible:border-violet-600';

  return (
    <>
      <AnimatePresence>
        {nudgeOpen && !open && nudgePlacement === 'page-top' && (
          <motion.div
            key="lazy-auth-nudge"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            data-testid="lazy-auth-nudge"
            className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top,12px)+12px)] z-50 mx-auto flex max-w-md justify-center md:hidden"
          >
            <div
              className={`pointer-events-auto flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-2xl ${
                darkMode
                  ? 'border-violet-400/35 bg-[#151226]/95 text-white'
                  : 'border-violet-300 bg-white/95 text-[#1E1B2E]'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold leading-tight">
                  {getNudgeHeadline(trigger, lang)}
                  {currentXp > 0 ? ` (${currentXp} XP)` : ''}
                </p>
                <p
                  className={`mt-0.5 text-[11px] font-medium leading-snug ${
                    darkMode ? 'text-white/75' : 'text-[#1E1B2E]/75'
                  }`}
                >
                  {getContextualReason(trigger, lang)}
                </p>
              </div>
              <button
                type="button"
                data-testid="lazy-auth-nudge-cta"
                onClick={onOpenModalFromNudge}
                className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {lang === 'tr' ? 'Bağla' : 'Connect'}
              </button>
              <button
                type="button"
                data-testid="lazy-auth-nudge-dismiss"
                onClick={onDismissNudge}
                aria-label={lang === 'tr' ? 'Şimdi değil' : 'Not now'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  darkMode ? 'text-white/65 hover:bg-white/10' : 'text-[#1E1B2E]/65 hover:bg-slate-100'
                }`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lazy-auth-title"
            data-testid="lazy-auth-prompt"
            className="fixed inset-0 z-[90] flex items-end justify-center bg-night/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={onCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md rounded-t-3xl border p-5 pb-[calc(env(safe-area-inset-bottom,16px)+20px)] shadow-2xl sm:rounded-3xl sm:p-6 ${surfaceClass}`}
            >
              <button
                type="button"
                data-testid="lazy-auth-close-btn"
                onClick={onCloseModal}
                aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
                className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  darkMode
                    ? 'bg-white/10 text-white/80 hover:bg-white/20'
                    : 'bg-slate-100 text-[#1E1B2E]/75 hover:bg-slate-200'
                }`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-3 pr-10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md">
                  {step === 'email' ? (
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h2 id="lazy-auth-title" className="font-display text-lg font-extrabold leading-snug">
                    {step === 'email'
                      ? lang === 'tr'
                        ? 'E-posta ile Hesabını Bağla'
                        : 'Link Your Account via Email'
                      : lang === 'tr'
                        ? '6 Haneli Doğrulama Kodu'
                        : 'Enter 6-Digit Code'}
                  </h2>
                  <p
                    className={`mt-0.5 text-xs font-medium ${
                      darkMode ? 'text-white/70' : 'text-[#1E1B2E]/70'
                    }`}
                  >
                    {step === 'email'
                      ? getContextualReason(trigger, lang)
                      : lang === 'tr'
                        ? `${email} adresine gönderilen kodu gir.`
                        : `Enter the code sent to ${email}.`}
                  </p>
                </div>
              </div>

              {currentXp > 0 && (
                <div
                  className={`mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${
                    darkMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {lang === 'tr'
                      ? `Mevcut ${currentXp.toLocaleString()} XP ve kayıtların otomatik birleştirilecek.`
                      : `Your current ${currentXp.toLocaleString()} XP and saves will merge automatically.`}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  data-testid="lazy-auth-error"
                  className={`mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-bold ${
                    darkMode
                      ? 'border-rose-500/40 bg-rose-950/50 text-rose-200'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {step === 'email' ? (
                <form onSubmit={handleRequestOtp} className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="lazy-auth-email"
                      className={`mb-1.5 block text-[11px] font-extrabold uppercase tracking-wider ${
                        darkMode ? 'text-violet-200' : 'text-violet-800'
                      }`}
                    >
                      {lang === 'tr' ? 'E-posta Adresi' : 'Email Address'}
                    </label>
                    <input
                      id="lazy-auth-email"
                      data-testid="lazy-auth-email-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={lang === 'tr' ? 'ornek@eposta.com' : 'you@example.com'}
                      className={`w-full rounded-2xl border px-3.5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="lazy-auth-send-otp-btn"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-black text-white shadow-lg transition-opacity hover:opacity-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {busy ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {lang === 'tr' ? '6 Haneli Kod Gönder' : 'Send 6-Digit Code'}
                    </span>
                  </button>

                  <p
                    className={`text-center text-[11px] font-medium ${
                      darkMode ? 'text-white/55' : 'text-[#1E1B2E]/60'
                    }`}
                  >
                    {lang === 'tr'
                      ? 'Şifre yok, spam yok. Sadece tek kullanımlık doğrulama kodu.'
                      : 'No password needed. Single-use verification code only.'}
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
                  {devOtpCode && (
                    <button
                      type="button"
                      data-testid="lazy-auth-dev-otp"
                      onClick={() => setCode(devOtpCode)}
                      className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        darkMode
                          ? 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                          : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      <span>
                        {lang === 'tr' ? 'Geliştirici Önizleme Kodu:' : 'Dev Preview Code:'}{' '}
                        <strong className="tracking-widest">{devOtpCode}</strong>
                      </span>
                      <span className="underline">
                        {lang === 'tr' ? 'Doldur' : 'Fill'}
                      </span>
                    </button>
                  )}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="lazy-auth-code"
                        className={`text-[11px] font-extrabold uppercase tracking-wider ${
                          darkMode ? 'text-violet-200' : 'text-violet-800'
                        }`}
                      >
                        {lang === 'tr' ? '6 Haneli Kod' : '6-Digit Code'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setErrorMsg(null);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'tr' ? 'E-postayı değiştir' : 'Change email'}</span>
                      </button>
                    </div>
                    <input
                      id="lazy-auth-code"
                      data-testid="lazy-auth-code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className={`w-full rounded-2xl border px-3.5 py-3 text-center text-lg font-black tracking-[0.35em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || code.replace(/\D/g, '').length !== 6}
                    data-testid="lazy-auth-verify-btn"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-sm font-black text-white shadow-lg transition-opacity hover:opacity-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    {busy ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {lang === 'tr' ? 'Doğrula ve Senkronize Et' : 'Verify & Sync'}
                    </span>
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs font-semibold">
                    <span className={darkMode ? 'text-white/60' : 'text-[#1E1B2E]/60'}>
                      {cooldownSec > 0
                        ? lang === 'tr'
                          ? `Tekrar gönder: ${cooldownSec} sn`
                          : `Resend in ${cooldownSec}s`
                        : lang === 'tr'
                          ? 'Kod gelmedi mi?'
                          : "Didn't receive a code?"}
                    </span>
                    <button
                      type="button"
                      disabled={busy || cooldownSec > 0}
                      data-testid="lazy-auth-resend-btn"
                      onClick={() => void handleRequestOtp()}
                      className="font-extrabold text-violet-400 hover:underline disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    >
                      {lang === 'tr' ? 'Yeni Kod Gönder' : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
