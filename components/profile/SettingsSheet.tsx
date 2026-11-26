'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AlertTriangle, Bell, BellOff, LogOut, Mail, MailCheck } from 'lucide-react';
import Button from '@/components/cikartma/Button';
import Sheet from '@/components/cikartma/Sheet';
import { profileCopy } from '@/components/profile/copy';
import type { AppearanceMode } from '@/lib/theme';
import type { Language } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import type { UserMemoryState } from '@/utils/userMemory';

const APP_VERSION = '1.0.0';

interface SettingsSheetProps {
  open: boolean;
  lang: Language;
  memory: UserMemoryState;
  appearance: AppearanceMode;
  hapticsOn: boolean;
  cookieChoice: 'granted' | 'denied' | 'unknown';
  authEmail: string | null;
  signingOut: boolean;
  isStandalone: boolean;
  showPwa: boolean;
  justReset: boolean;
  onClose: () => void;
  onAppearance: (mode: AppearanceMode) => void;
  onLanguage: (lang: Language) => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onToggleNotifications: () => void;
  onCookie: (choice: 'granted' | 'denied') => void;
  onConnect: () => void;
  onLogout: () => void;
  onEditNickname: () => void;
  onReset: () => void;
  onPwa: () => void;
  onNavigate: () => void;
}

function Segment({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const look = selected
    ? 'bg-cik-berry text-cik-on-berry shadow-sticker'
    : 'bg-cik-surface-2 text-cik-text-2';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`cik-footnote inline-flex h-11 min-w-11 flex-1 items-center justify-center rounded-pill px-3 ${look}`}
    >
      {label}
    </button>
  );
}

function SwitchRow({
  label,
  on,
  onClick,
  testId,
  icon,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  testId?: string;
  icon?: React.ReactNode;
}) {
  const copyOn = on;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={copyOn}
      data-testid={testId}
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2 text-left"
    >
      <span className="cik-headline inline-flex items-center gap-2 text-cik-text">
        {icon}
        {label}
      </span>
      <span className={`relative h-8 w-12 shrink-0 rounded-pill ${copyOn ? 'bg-cik-cta' : 'bg-cik-line'}`}>
        <span
          className={`absolute top-1 h-6 w-6 rounded-pill bg-cik-surface shadow-e1 ${copyOn ? 'right-1' : 'left-1'}`}
        />
      </span>
    </button>
  );
}

export default function SettingsSheet({
  open,
  lang,
  memory,
  appearance,
  hapticsOn,
  cookieChoice,
  authEmail,
  signingOut,
  isStandalone,
  showPwa,
  justReset,
  onClose,
  onAppearance,
  onLanguage,
  onToggleSound,
  onToggleHaptics,
  onToggleNotifications,
  onCookie,
  onConnect,
  onLogout,
  onEditNickname,
  onReset,
  onPwa,
  onNavigate,
}: SettingsSheetProps) {
  const t = translations[lang];
  const copy = profileCopy(lang);
  const [confirmReset, setConfirmReset] = useState(false);
  const [mounted, setMounted] = useState(false);
  const privacyHref = lang === 'en' ? '/privacy?lang=en&from=profile' : '/privacy?from=profile';
  const contactHref = lang === 'en' ? '/contact?lang=en&from=profile' : '/contact?from=profile';
  const aboutHref = lang === 'en' ? '/about?lang=en&from=profile' : '/about?from=profile';
  const termsHref = lang === 'en' ? '/terms?lang=en&from=profile' : '/terms?from=profile';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !confirmReset) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmReset(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, confirmReset]);

  const closeAll = () => {
    setConfirmReset(false);
    onClose();
  };

  return (
    <>
    <Sheet open={open && !confirmReset} title={t.profileSettings} onClose={closeAll}>
        <div className="flex flex-col gap-4 pb-4">
          {justReset ? (
            <p
              role="status"
              data-testid="reset-done-banner"
              className="cik-footnote rounded-cik-md bg-cik-mint px-3.5 py-2.5 text-cik-mint-text"
            >
              {t.drawerResetConfirm}
            </p>
          ) : null}
          <section className="overflow-hidden rounded-cik-lg bg-cik-surface shadow-e1">
            <div className="flex flex-col gap-2 px-4 py-3">
              <p className="cik-headline text-cik-text">{copy.appearance}</p>
              <div className="flex gap-2">
                <Segment label={copy.light} selected={appearance === 'light'} onClick={() => onAppearance('light')} />
                <Segment label={copy.dark} selected={appearance === 'dark'} onClick={() => onAppearance('dark')} />
                <Segment label={copy.system} selected={appearance === 'system'} onClick={() => onAppearance('system')} />
              </div>
            </div>
            <div className="border-t border-cik-line px-4 py-3">
              <p className="cik-headline text-cik-text">{copy.language}</p>
              <div className="mt-2 flex gap-2">
                <Segment label={copy.turkish} selected={lang === 'tr'} onClick={() => onLanguage('tr')} />
                <Segment label={copy.english} selected={lang === 'en'} onClick={() => onLanguage('en')} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-cik-lg bg-cik-surface shadow-e1">
            <SwitchRow label={copy.sound} on={memory.soundEnabled} onClick={onToggleSound} />
            <div className="border-t border-cik-line">
              <SwitchRow label={copy.haptics} on={hapticsOn} onClick={onToggleHaptics} />
            </div>
            <div className="border-t border-cik-line">
              <SwitchRow
                label={t.diplomaNotificationsLabel}
                on={memory.notificationsEnabled}
                onClick={onToggleNotifications}
                testId="diploma-notifications-btn"
                icon={
                  memory.notificationsEnabled ? (
                    <Bell size={20} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <BellOff size={20} strokeWidth={2} aria-hidden="true" />
                  )
                }
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-cik-lg bg-cik-surface px-4 py-3 shadow-e1">
            <p className="cik-headline text-cik-text">{copy.cookies}</p>
            <p className="cik-footnote mt-1 text-cik-text-2">
              {cookieChoice === 'granted' ? copy.cookiesOn : cookieChoice === 'denied' ? copy.cookiesOff : t.cookieText}
            </p>
            <div className="mt-2 flex gap-2">
              <Segment label={t.cookieAccept} selected={cookieChoice === 'granted'} onClick={() => onCookie('granted')} />
              <Segment label={t.cookieDecline} selected={cookieChoice === 'denied'} onClick={() => onCookie('denied')} />
            </div>
          </section>

          <section className="overflow-hidden rounded-cik-lg bg-cik-surface shadow-e1">
            <div className="px-4 py-3">
              <p className="cik-headline text-cik-text">{copy.account}</p>
              {authEmail ? (
                <div data-testid="diploma-auth-connected" className="mt-3 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <MailCheck size={20} strokeWidth={2} aria-hidden="true" className="text-cik-mint-text" />
                    <div className="min-w-0">
                      <p className="cik-caption-2 text-cik-mint-text">{copy.connected}</p>
                      <p data-testid="diploma-auth-email" className="cik-footnote truncate text-cik-text">
                        {authEmail}
                      </p>
                    </div>
                  </div>
                  <Button data-testid="diploma-logout-btn" tone="ghost" disabled={signingOut} onClick={onLogout} className="w-full text-cik-rose-text">
                    <LogOut size={20} strokeWidth={2} aria-hidden="true" />
                    <span>{copy.signOut}</span>
                  </Button>
                </div>
              ) : (
                <div data-testid="diploma-auth-cta" className="mt-3 flex flex-col gap-3">
                  <p className="cik-footnote text-cik-text-2">{copy.connectBody}</p>
                  <Button
                    data-testid="diploma-connect-email-btn"
                    onClick={() => {
                      closeAll();
                      onConnect();
                    }}
                    className="w-full"
                  >
                    <Mail size={20} strokeWidth={2} aria-hidden="true" />
                    <span>{copy.connect}</span>
                  </Button>
                </div>
              )}
            </div>
            <div className="border-t border-cik-line">
              <button
                type="button"
                onClick={() => {
                  closeAll();
                  onEditNickname();
                }}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left"
              >
                <span className="cik-headline text-cik-text">{t.diplomaNickLabel}</span>
                <span className="cik-footnote truncate text-cik-text-2">{memory.nickname}</span>
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-cik-lg bg-cik-surface shadow-e1">
            <button
              type="button"
              data-testid="settings-reset-memory-trigger"
              onClick={() => setConfirmReset(true)}
              className="cik-headline flex min-h-[52px] w-full items-center px-4 text-left text-cik-rose-text"
            >
              {t.drawerReset}
            </button>
          </section>

          <section className="overflow-hidden rounded-cik-lg bg-cik-surface shadow-e1">
            <p className="cik-footnote px-4 pt-3 text-cik-text-2">{copy.legal}</p>
            <div className="flex flex-col">
              <Link
                data-testid="diploma-privacy-link"
                href={privacyHref}
                onClick={onNavigate}
                className="flex min-h-11 items-center px-4 py-2.5 text-sm font-semibold text-cik-text hover:bg-cik-surface-2"
              >
                {copy.privacy}
              </Link>
              <div className="flex min-h-11 items-center justify-between gap-3 border-t border-cik-line px-4 py-2.5">
                <Link
                  data-testid="diploma-contact-link"
                  href={contactHref}
                  onClick={onNavigate}
                  className="flex min-h-9 flex-1 items-center text-sm text-cik-text"
                >
                  {copy.contact}
                </Link>
                <a
                  data-testid="diploma-contact-email"
                  href="mailto:contact@scrolly.live"
                  className="shrink-0 text-xs font-semibold text-cik-cta"
                >
                  contact@scrolly.live
                </a>
              </div>
              <Link
                href={aboutHref}
                onClick={onNavigate}
                className="flex min-h-11 items-center border-t border-cik-line px-4 py-2.5 text-sm text-cik-text hover:bg-cik-surface-2"
              >
                {copy.about}
              </Link>
              <Link
                href={termsHref}
                onClick={onNavigate}
                className="flex min-h-11 items-center border-t border-cik-line px-4 py-2.5 text-sm text-cik-text hover:bg-cik-surface-2"
              >
                {copy.terms}
              </Link>
              {showPwa ? (
                <button
                  type="button"
                  data-testid="diploma-pwa-install-link"
                  onClick={onPwa}
                  className="flex min-h-11 items-center border-t border-cik-line px-4 py-2.5 text-left text-sm text-cik-text hover:bg-cik-surface-2"
                >
                  {isStandalone ? t.pwaInstalledBtn : t.pwaManualInstallLink}
                </button>
              ) : null}
            </div>
            <p className="cik-caption-1 border-t border-cik-line px-4 py-3 text-cik-text-3">
              {copy.version} {APP_VERSION}
            </p>
          </section>
        </div>
    </Sheet>
    {mounted && open && confirmReset
      ? createPortal(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-memory-modal-title"
            data-testid="reset-memory-confirm-modal"
            onClick={() => setConfirmReset(false)}
            className="cik-scrim fixed inset-0 z-modal flex items-center justify-center p-4"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-sticker border border-cik-line bg-cik-bg-elevated p-5 text-cik-text shadow-e3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-cik-rose text-cik-rose-text">
                  <AlertTriangle size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 id="reset-memory-modal-title" className="cik-title-3 text-cik-text">
                  {copy.resetTitle}
                </h2>
              </div>
              <p className="cik-body mt-3 text-cik-text-2">{copy.resetBody}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  data-testid="diploma-reset-btn"
                  onClick={() => {
                    onReset();
                    setConfirmReset(false);
                  }}
                  className="cik-headline inline-flex min-h-11 flex-1 items-center justify-center rounded-pill bg-cik-rose px-4 text-cik-rose-text"
                >
                  {copy.resetConfirm}
                </button>
                <Button
                  type="button"
                  tone="ghost"
                  data-testid="diploma-reset-cancel-btn"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-11 flex-1 border border-cik-line"
                >
                  {copy.cancel}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
}
