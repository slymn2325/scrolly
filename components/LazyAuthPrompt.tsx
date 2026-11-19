'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { mergeGuestToUser, requestEmailOtp, verifyEmailOtp } from '@/lib/authClient';
import type { AccountProgressSummary, AuthUserDto, GuestMergeMode } from '@/types/auth';
import { useEscapeClose } from '@/utils/useEscapeClose';

export const AUTH_NUDGE_DISMISS_KEY = 'scrolly_auth_nudge_dismissed_until';
export const AUTH_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

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
  onAuthenticated: (user: AuthUserDto, mode?: GuestMergeMode) => void;
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
    return lang === 'tr' ? 'Quiz XP puanını kaydet' : 'Save your quiz XP';
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

function findNudgeHeader(): HTMLElement | null {
  const settings = document.querySelector('[data-testid="profile-settings-btn"]');
  const leaderboardTitle = document.querySelector('[data-testid="leaderboard-modal"] h2');
  const start = settings ?? leaderboardTitle;
  if (!(start instanceof HTMLElement)) return null;
  let node: HTMLElement | null = start;
  while (node) {
    if (node.classList.contains('justify-between')) return node;
    node = node.parentElement;
  }
  return null;
}

export default function LazyAuthPrompt({
  open,
  nudgeOpen,
  nudgePlacement = 'page-top',
  trigger = 'manual',
  lang,
  darkMode: _darkMode = true,
  currentXp,
  onCloseModal,
  onDismissNudge,
  onOpenModalFromNudge,
  onAuthenticated,
}: LazyAuthPromptProps) {
  const reduced = useReducedMotion() === true;
  const [nudgeHost, setNudgeHost] = useState<HTMLElement | null>(null);
  const [step, setStep] = useState<'email' | 'code' | 'merge-choice'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<AuthUserDto | null>(null);
  const [existingSummary, setExistingSummary] = useState<AccountProgressSummary | null>(null);
  const [guestSummary, setGuestSummary] = useState<AccountProgressSummary | null>(null);

  useEscapeClose(open, onCloseModal);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    if (!nudgeOpen || open || nudgePlacement !== 'page-top') return;
    let frame = 0;
    let attempts = 0;
    let host: HTMLElement | null = null;
    const tick = () => {
      const header = findNudgeHeader();
      if (!header) {
        attempts += 1;
        if (attempts < 20) frame = window.requestAnimationFrame(tick);
        return;
      }
      const existing = header.nextElementSibling;
      if (existing instanceof HTMLElement && existing.dataset.authNudgeHost === 'true') {
        host = existing;
      } else {
        host = document.createElement('div');
        host.dataset.authNudgeHost = 'true';
        host.className = 'px-4 pt-3';
        header.insertAdjacentElement('afterend', host);
      }
      setNudgeHost(host);
    };
    tick();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      host?.remove();
      setNudgeHost(null);
    };
  }, [nudgeOpen, open, nudgePlacement]);

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

    if (res.needsMergeChoice && res.existingAccountSummary && res.guestSummary) {
      setPendingUser(res.user);
      setExistingSummary(res.existingAccountSummary);
      setGuestSummary(res.guestSummary);
      setStep('merge-choice');
      return;
    }

    setStep('email');
    setCode('');
    setDevOtpCode(null);
    onAuthenticated(res.user, 'merge');
  };

  const handleResolveMergeChoice = async (mode: GuestMergeMode) => {
    setBusy(true);
    setErrorMsg(null);
    const res = await mergeGuestToUser({ mode });
    setBusy(false);

    const finalUser = res.ok && res.user ? res.user : pendingUser;
    if (!finalUser) {
      setErrorMsg(mapOtpError(res.error, lang));
      return;
    }

    setStep('email');
    setCode('');
    setDevOtpCode(null);
    setPendingUser(null);
    setExistingSummary(null);
    setGuestSummary(null);
    onAuthenticated(finalUser, mode);
  };

  const surfaceClass = 'border border-cik-line bg-cik-surface text-cik-text';
  const inputClass =
    'border border-cik-line bg-cik-surface-2 text-cik-text placeholder:text-cik-text-3';

  const nudge =
    nudgeOpen && !open && nudgePlacement === 'page-top' && nudgeHost
      ? createPortal(
          <motion.div
            key="lazy-auth-nudge"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0.15 : 0.2 }}
            data-testid="lazy-auth-nudge"
            className="flex items-center gap-2 rounded-cik-lg bg-cik-surface px-3 py-2 text-cik-text shadow-e1"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-cik-md bg-cik-pink text-cik-cta">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="cik-footnote text-cik-text">
                {getNudgeHeadline(trigger, lang)}
                {currentXp > 0 ? ` (${currentXp} XP)` : ''}
              </p>
              <p className="cik-caption-2 mt-1 text-cik-text-2">{getContextualReason(trigger, lang)}</p>
            </div>
            <button
              type="button"
              data-testid="lazy-auth-nudge-cta"
              onClick={onOpenModalFromNudge}
              className="cik-caption-1 inline-flex h-11 shrink-0 items-center rounded-pill bg-cik-cta px-3 text-cik-on-cta"
            >
              {lang === 'tr' ? 'Bağla' : 'Connect'}
            </button>
            <button
              type="button"
              data-testid="lazy-auth-nudge-dismiss"
              onClick={onDismissNudge}
              aria-label={lang === 'tr' ? 'Şimdi değil' : 'Not now'}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-cik-text-2"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </motion.div>,
          nudgeHost,
        )
      : null;

  return (
    <>
      <AnimatePresence>{nudge}</AnimatePresence>

      <AnimatePresence>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lazy-auth-title"
            data-testid="lazy-auth-prompt"
            className="cik-scrim fixed inset-0 z-modal flex items-end justify-center sm:items-center sm:p-4"
            onClick={onCloseModal}
          >
            <motion.div
              initial={reduced ? { opacity: 0 } : { y: '100%' }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: '100%' }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 38 }}
              onClick={(e) => e.stopPropagation()}
              className={`cik-sheet relative w-full max-w-md p-5 shadow-e3 ${surfaceClass}`}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
            >
              <button
                type="button"
                data-testid="lazy-auth-close-btn"
                onClick={onCloseModal}
                aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
                className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-pill bg-cik-surface-2 text-cik-text"
              >
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-cik-md bg-cik-pink text-cik-cta">
                  {step === 'email' ? (
                    <Mail size={20} strokeWidth={2} aria-hidden="true" />
                  ) : step === 'code' ? (
                    <KeyRound size={20} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 id="lazy-auth-title" className="cik-title-3 text-cik-text">
                    {step === 'email'
                      ? lang === 'tr'
                        ? 'E-posta ile hesabını bağla'
                        : 'Link your account'
                      : step === 'code'
                        ? lang === 'tr'
                          ? '6 haneli kod'
                          : '6-digit code'
                        : lang === 'tr'
                          ? 'Bu e-postada zaten bir hesap var'
                          : 'An account already exists for this email'}
                  </h2>
                  <p className="cik-caption-2 mt-1 text-cik-text-2">
                    {step === 'email'
                      ? getContextualReason(trigger, lang)
                      : step === 'code'
                        ? lang === 'tr'
                          ? `${email} adresine gönderilen kodu gir.`
                          : `Enter the code sent to ${email}.`
                        : lang === 'tr'
                          ? 'Mevcut bulut hesabınla mı devam etmek istersin, yoksa bu cihazdaki misafir ilerlemeni hesaba eklemek mi?'
                          : 'Would you like to continue with your existing cloud account or merge the guest progress on this device?'}
                  </p>
                </div>
              </div>

              {step !== 'merge-choice' && currentXp > 0 && (
                <div className="cik-footnote mt-3 flex items-center gap-2 rounded-cik-md bg-cik-mint px-3 py-2 text-cik-mint-text">
                  <Sparkles size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />
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
                  className="cik-footnote mt-3 flex items-start gap-2 rounded-cik-md bg-cik-rose px-3 py-3 text-cik-rose-text"
                >
                  <AlertCircle size={16} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {step === 'merge-choice' && existingSummary && guestSummary ? (
                <div data-testid="lazy-auth-merge-choice" className="mt-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div
                      data-testid="auth-existing-account-summary"
                      className="rounded-cik-md border border-cik-line bg-cik-surface-2 p-3"
                    >
                      <p className="cik-caption-2 font-extrabold uppercase tracking-wider text-cik-cta">
                        {lang === 'tr' ? 'Kayıtlı Hesabın' : 'Your Existing Account'}
                      </p>
                      <p className="cik-headline mt-1 truncate text-cik-text">
                        {existingSummary.nickname}
                      </p>
                      <p className="cik-caption-1 cik-tabular mt-1 text-cik-text-2">
                        {existingSummary.xp.toLocaleString()} XP · {existingSummary.streak}{' '}
                        {lang === 'tr' ? 'gün seri' : 'day streak'}
                      </p>
                      <p className="cik-caption-2 cik-tabular mt-0.5 text-cik-text-3">
                        {existingSummary.savedCount}{' '}
                        {lang === 'tr' ? 'kaydedilen / beğenilen' : 'saved / liked'}
                      </p>
                    </div>

                    <div
                      data-testid="auth-guest-device-summary"
                      className="rounded-cik-md border border-cik-line bg-cik-pink p-3"
                    >
                      <p className="cik-caption-2 font-extrabold uppercase tracking-wider text-cik-text-2">
                        {lang === 'tr'
                          ? 'Bu Cihazdaki Misafir İlerlemen'
                          : 'Guest Progress on This Device'}
                      </p>
                      <p className="cik-headline mt-1 truncate text-cik-text">
                        {guestSummary.nickname}
                      </p>
                      <p className="cik-caption-1 cik-tabular mt-1 text-cik-text-2">
                        {guestSummary.xp.toLocaleString()} XP · {guestSummary.streak}{' '}
                        {lang === 'tr' ? 'gün seri' : 'day streak'}
                      </p>
                      <p className="cik-caption-2 cik-tabular mt-0.5 text-cik-text-3">
                        {guestSummary.savedCount}{' '}
                        {lang === 'tr' ? 'kaydedilen / beğenilen' : 'saved / liked'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      data-testid="auth-choice-merge-both"
                      onClick={() => void handleResolveMergeChoice('merge')}
                      className="cik-headline flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta disabled:opacity-60"
                    >
                      <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
                      <span>
                        {lang === 'tr' ? 'İkisini birleştir' : 'Merge both'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      data-testid="auth-choice-keep-existing"
                      onClick={() => void handleResolveMergeChoice('keep_existing')}
                      className="cik-headline flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface-2 px-4 text-cik-text disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                      <span>
                        {lang === 'tr'
                          ? 'Mevcut hesabımla devam et'
                          : 'Continue with my existing account'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : step === 'email' ? (
                <form onSubmit={handleRequestOtp} className="mt-4 flex flex-col gap-3">
                  <div>
                    <label htmlFor="lazy-auth-email" className="cik-caption-2 mb-2 block text-cik-text-2">
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
                      className={`cik-subhead w-full rounded-cik-md px-4 py-3 ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="lazy-auth-send-otp-btn"
                    className="cik-headline flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta disabled:opacity-60"
                  >
                    <Mail size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{busy ? (lang === 'tr' ? 'Gönderiliyor' : 'Sending') : lang === 'tr' ? 'Kodu gönder' : 'Send code'}</span>
                  </button>

                  <p className="cik-caption-2 text-center text-cik-text-3">
                    {lang === 'tr'
                      ? 'Şifre yok. Tek kullanımlık doğrulama kodu.'
                      : 'No password. A single-use verification code.'}
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="mt-4 flex flex-col gap-3">
                  {devOtpCode && (
                    <button
                      type="button"
                      data-testid="lazy-auth-dev-otp"
                      onClick={() => setCode(devOtpCode)}
                      className="cik-footnote flex h-11 w-full items-center justify-between gap-2 rounded-cik-md bg-cik-butter px-3 text-cik-butter-text"
                    >
                      <span>
                        {lang === 'tr' ? 'Geliştirici kodu:' : 'Dev code:'}{' '}
                        <strong className="cik-tabular tracking-widest">{devOtpCode}</strong>
                      </span>
                      <span className="underline">{lang === 'tr' ? 'Doldur' : 'Fill'}</span>
                    </button>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor="lazy-auth-code" className="cik-caption-2 text-cik-text-2">
                        {lang === 'tr' ? '6 Haneli Kod' : '6-Digit Code'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setErrorMsg(null);
                        }}
                        className="cik-caption-2 inline-flex h-11 items-center gap-1 text-cik-cta"
                      >
                        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
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
                      className={`cik-title-3 cik-tabular w-full rounded-cik-md px-4 py-3 text-center tracking-widest ${inputClass}`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || code.replace(/\D/g, '').length !== 6}
                    data-testid="lazy-auth-verify-btn"
                    className="cik-headline flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{busy ? (lang === 'tr' ? 'Doğrulanıyor' : 'Checking') : lang === 'tr' ? 'Doğrula' : 'Verify'}</span>
                  </button>

                  <div className="cik-footnote flex items-center justify-between text-cik-text-2">
                    <span>
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
                      className="cik-footnote inline-flex h-11 items-center text-cik-cta disabled:opacity-40"
                    >
                      {lang === 'tr' ? 'Yeni kod' : 'Resend'}
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
