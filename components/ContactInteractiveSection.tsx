'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookCheck,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  Send,
} from 'lucide-react';
import type { Language } from '@/i18n/translations';

interface ContactInteractiveSectionProps {
  lang: Language;
}

const SUBJECT_OPTIONS: Record<Language, readonly string[]> = {
  tr: [
    'Genel Soru',
    'Bilimsel Kaynak Düzeltmesi',
    'Reklam & İş Birliği',
    'Teknik Destek',
  ],
  en: [
    'General Inquiry',
    'Scientific Source Correction',
    'Advertising & Partnership',
    'Technical Support',
  ],
};

const OFFICIAL_EMAIL = 'contact@scrolly.live';

export default function ContactInteractiveSection({ lang }: ContactInteractiveSectionProps) {
  const isEn = lang === 'en';
  const subjects = SUBJECT_OPTIONS[lang];

  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState<string>(subjects[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedInfo, setSubmittedInfo] = useState<{
    subject: string;
    mailtoHref: string;
  } | null>(null);

  const activeSubject = subjects.includes(subject) ? subject : subjects[0];

  const directMailtoHref = useMemo(() => {
    const mailSubject = encodeURIComponent(`[Scrolly] ${activeSubject}`);
    const bodyLines = [
      name ? `${isEn ? 'Name' : 'Ad Soyad'}: ${name}` : '',
      email ? `${isEn ? 'Reply Email' : 'Yanıt E-postası'}: ${email}` : '',
      message ? `\n${message}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const mailBody = encodeURIComponent(bodyLines);
    return `mailto:${OFFICIAL_EMAIL}?subject=${mailSubject}${mailBody ? `&body=${mailBody}` : ''}`;
  }, [activeSubject, email, isEn, message, name]);

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(OFFICIAL_EMAIL);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = OFFICIAL_EMAIL;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmittedInfo(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setErrorMsg(
        isEn ? 'Please enter your full name.' : 'Lütfen adınızı ve soyadınızı girin.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setErrorMsg(
        isEn ? 'Please enter a valid email address.' : 'Lütfen geçerli bir e-posta adresi girin.'
      );
      return;
    }

    if (trimmedMessage.length < 5) {
      setErrorMsg(
        isEn
          ? 'Please write a message of at least 5 characters.'
          : 'Lütfen en az 5 karakterlik bir mesaj yazın.'
      );
      return;
    }

    const fallbackMailto = directMailtoHref;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: activeSubject,
          message: trimmedMessage,
          lang,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setErrorMsg(
          data.error ||
            (isEn
              ? 'Could not send message. You can write directly to contact@scrolly.live.'
              : 'Mesaj gönderilemedi. Doğrudan contact@scrolly.live adresine yazabilirsiniz.')
        );
        return;
      }

      setSubmittedInfo({
        subject: activeSubject,
        mailtoHref: fallbackMailto,
      });
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setErrorMsg(
        isEn
          ? 'Network error occurred. Please try again or email contact@scrolly.live directly.'
          : 'Bağlantı hatası oluştu. Lütfen tekrar deneyin veya doğrudan contact@scrolly.live adresine e-posta gönderin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Email Card & Editorial Guidance */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-amber-50/50 p-4 shadow-sm dark:border-violet-700/50 dark:from-violet-950/50 dark:via-[#1B1530] dark:to-violet-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-violet-800 dark:text-violet-300">
              <Mail className="h-4 w-4" />
              <span>{isEn ? 'Official Email' : 'Resmi Kurumsal E-posta'}</span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              {isEn ? '24–48h Reply' : '24–48 Saat Yanıt'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
            <a
              href={`mailto:${OFFICIAL_EMAIL}`}
              data-testid="contact-email-link"
              className="text-sm font-extrabold text-violet-700 underline underline-offset-4 transition hover:text-violet-900 dark:text-violet-200"
            >
              {OFFICIAL_EMAIL}
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              data-testid="contact-copy-email-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-extrabold text-violet-800 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-900/50 dark:text-violet-100"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  <span>{isEn ? 'Copied!' : 'Kopyalandı!'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{isEn ? 'Copy' : 'Kopyala'}</span>
                </>
              )}
            </button>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-ink/75 dark:text-violet-100/75">
            {isEn
              ? 'Single official contact channel for editorial review, scientific source updates, AdSense/advertising compliance, privacy requests, and legal notices.'
              : 'Editöryal geri bildirimler, bilimsel kaynak güncellemeleri, reklam ve iş birlikleri, gizlilik talepleri ve yasal bildirimler için tek resmi iletişim adresimizdir.'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            <BookCheck className="h-4 w-4" />
            <span>{isEn ? 'Source & Citation Review' : 'Kaynak ve Atıf İncelemesi'}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/80 dark:text-violet-100/85">
            {isEn
              ? 'When reporting a factual issue, please include the card URL (e.g., https://scrolly.live/fact/...) and a link to the updated peer-reviewed paper or official agency source.'
              : 'Bir bilgi kartında düzeltme önerirken lütfen kart bağlantısını (ör. https://scrolly.live/fact/...) ve güncel akademik veya kurumsal referans bağlantısını paylaşın.'}
          </p>
          <a
            href={`mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(
              isEn ? '[Scrolly] Scientific Source Correction' : '[Scrolly] Bilimsel Kaynak Düzeltmesi'
            )}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 underline underline-offset-4 hover:text-amber-950 dark:text-amber-200"
          >
            <span>
              {isEn ? 'Open Email Client for Source Report' : 'Kaynak Bildirimi İçin E-posta Aç'}
            </span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive Contact Form */}
      <section className="rounded-2xl border border-slate-200/90 bg-[#FFFDF9] p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-4 space-y-1">
          <h2 className="font-display text-lg font-bold text-ink dark:text-white">
            {isEn ? 'Send a Direct Message' : 'Doğrudan Mesaj Gönderin'}
          </h2>
          <p className="text-xs text-ink/70 dark:text-violet-200/75">
            {isEn
              ? 'Messages submitted below are routed to our editorial desk and replied to via contact@scrolly.live.'
              : 'Aşağıdaki form üzerinden gönderilen tüm mesajlar editöryal ekibimize ulaşır ve contact@scrolly.live üzerinden yanıtlanır.'}
          </p>
        </div>

        {submittedInfo && (
          <div
            role="status"
            data-testid="contact-success-banner"
            className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-100"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <div className="space-y-1.5">
                <p className="font-extrabold leading-relaxed">
                  {isEn
                    ? 'Your message has been received. We will get back to you shortly via contact@scrolly.live.'
                    : 'Mesajınız alındı, en kısa sürede contact@scrolly.live üzerinden dönüş yapılacaktır.'}
                </p>
                <a
                  href={submittedInfo.mailtoHref}
                  className="inline-flex items-center gap-1 font-bold text-emerald-800 underline underline-offset-4 dark:text-emerald-200"
                >
                  <span>
                    {isEn
                      ? `Send an email copy directly to ${OFFICIAL_EMAIL}`
                      : `İsterseniz e-posta uygulamanızla ${OFFICIAL_EMAIL} adresine kopya gönderin`}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            data-testid="contact-error-banner"
            className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="contact-form" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-extrabold text-ink/85 dark:text-violet-100">
                {isEn ? 'Full Name' : 'Ad / Soyad'}
              </span>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="contact-name-input"
                placeholder={isEn ? 'e.g. Alex Taylor' : 'Örn. Deniz Yılmaz'}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-white/15 dark:bg-[#171228] dark:text-white dark:focus:ring-violet-800"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-extrabold text-ink/85 dark:text-violet-100">
                {isEn ? 'Your Email Address' : 'E-posta Adresiniz'}
              </span>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="contact-email-input"
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-white/15 dark:bg-[#171228] dark:text-white dark:focus:ring-violet-800"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold text-ink/85 dark:text-violet-100">
              {isEn ? 'Topic' : 'Konu'}
            </span>
            <select
              name="subject"
              value={activeSubject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="contact-subject-select"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-white/15 dark:bg-[#171228] dark:text-white dark:focus:ring-violet-800"
            >
              {subjects.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold text-ink/85 dark:text-violet-100">
              {isEn ? 'Message' : 'Mesajınız'}
            </span>
            <textarea
              name="message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="contact-message-input"
              placeholder={
                isEn
                  ? 'Write your question, source URL, or partnership details...'
                  : 'Sorunuzu, bilimsel kaynak bağlantısını veya iş birliği detaylarını yazın...'
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-white/15 dark:bg-[#171228] dark:text-white dark:focus:ring-violet-800"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <a
              href={directMailtoHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>
                {isEn
                  ? `Or open mail client (${OFFICIAL_EMAIL})`
                  : `Veya e-posta uygulamasıyla gönder (${OFFICIAL_EMAIL})`}
              </span>
            </a>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="contact-submit-btn"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-600"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? isEn
                    ? 'Sending...'
                    : 'Gönderiliyor...'
                  : isEn
                    ? 'Send Message'
                    : 'Mesajı Gönder'}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
