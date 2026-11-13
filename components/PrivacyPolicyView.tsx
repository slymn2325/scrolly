'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, Database, ShieldCheck } from 'lucide-react';
import { type Language } from '@/i18n/translations';
import { loadUserMemory } from '@/utils/userMemory';

const POLICY_COPY = {
  tr: {
    backLabel: 'Scrolly Akışına Dön',
    badge: 'Gizlilik ve Çerez Politikası',
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: Kasım 2026 • scrolly.live',
    intro:
      'Scrolly (https://scrolly.live), kullanıcılarından kayıt veya kişisel hesap oluşturma talep etmeden mikro keşif deneyimi sunar. Bu sayfa yerel tarayıcı depolamasının, temel işlevsel çerezlerin ve Google AdSense reklam teknolojilerinin nasıl çalıştığını şeffaf biçimde açıklar.',
    sections: [
      {
        heading: '1. Kişisel Hesap Olmadan Anonim Yerel Depolama',
        body: 'Scrolly ad, e-posta adresi veya şifre toplamaz. Okuduğunuz kartlar, günlük seri puanınız, XP seviyeniz, seçtiğiniz dil (TR/EN) ve favorileriniz yalnızca cihazınızdaki tarayıcı hafızasında (localStorage) ve küçük bir işlevsel özet çerezinde (merak_user_summary) saklanır. İstediğiniz zaman Diploma ekranındaki "Hafızayı Sıfırla" butonuyla tüm yerel verilerinizi temizleyebilirsiniz.',
      },
      {
        heading: '2. Çevrimdışı PWA Önbelleği',
        body: 'Uygulamanın internet olmadan da çalışabilmesi için Service Worker yalnızca herkese açık bilgi veri paketlerini ve 3B görsel varlıkları cihazınızda önbelleğe alır. Çevrimdışı modda reklam ağlarına istek gönderilmez.',
      },
      {
        heading: '3. Google AdSense ve Reklam Çerezleri',
        body: 'Scrolly, sürdürülebilir ücretsiz içerik sunabilmek amacıyla Google AdSense (Yayıncı Kimliği: ca-pub-1368005726792126) reklam hizmetini kullanır. Google ve iş ortakları dahil üçüncü taraf satıcılar, scrolly.live veya internet üzerindeki diğer web sitelerine yaptığınız önceki ziyaretlere dayalı olarak ilgi alanlarınıza uygun reklamlar sunmak için çerezler (örneğin DoubleClick / Google reklam çerezleri) kullanabilir.',
      },
      {
        heading: '4. Reklam Tercihlerini Yönetme ve Çıkış Hakkı',
        body: 'Kullanıcılar Google Reklam Ayarları (adssettings.google.com) üzerinden kişiselleştirilmiş reklamları diledikleri zaman devre dışı bırakabilir veya tarayıcı ayarlarından üçüncü taraf çerezlerini silebilir/engelleyebilir.',
      },
      {
        heading: '5. İletişim',
        body: 'Gizlilik politikamız hakkında sorularınız için https://scrolly.live üzerinden bize ulaşabilirsiniz.',
      },
    ],
    adSettingsLabel: 'Google Reklam Ayarlarını Yönet ↗',
  },
  en: {
    backLabel: 'Back to Scrolly Feed',
    badge: 'Privacy & Cookie Policy',
    title: 'Privacy Policy',
    updated: 'Last updated: November 2026 • scrolly.live',
    intro:
      'Scrolly (https://scrolly.live) delivers a micro-discovery experience without requiring registration or personal user accounts. This page clearly explains how anonymous local browser memory, essential functional cookies, and Google AdSense advertising cookies operate on our platform.',
    sections: [
      {
        heading: '1. Registration-Free Anonymous Local Storage',
        body: 'Scrolly does not collect names, email addresses, or passwords. Your read card history, daily streak, XP score, language preference (TR/EN), and favorites remain strictly on your device using browser localStorage and a lightweight functional summary cookie (merak_user_summary). You can erase all local progress at any time using "Reset Memory" in the Diploma modal.',
      },
      {
        heading: '2. Offline PWA Caching',
        body: 'To support offline reading as a Progressive Web App, our Service Worker caches public fact JSON shards and local 3D visual assets on your device. No third-party ad requests are dispatched while offline.',
      },
      {
        heading: '3. Google AdSense & Advertising Cookies',
        body: 'Scrolly uses Google AdSense (Publisher ID: ca-pub-1368005726792126) to keep discovery free. Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to scrolly.live or other websites across the web. Google’s use of advertising cookies enables it and its partners to serve ads to users based on their visit history.',
      },
      {
        heading: '4. Opting Out of Personalized Advertising',
        body: 'You may opt out of personalized advertising at any time by visiting Google Ad Settings (adssettings.google.com), or control and clear cookies directly through your browser privacy settings.',
      },
      {
        heading: '5. Contact',
        body: 'For any questions regarding this Privacy Policy or data practices, please reach out via https://scrolly.live.',
      },
    ],
    adSettingsLabel: 'Manage Google Ad Settings ↗',
  },
} as const;

export default function PrivacyPolicyView() {
  const [lang, setLang] = useState<Language>('tr');

  useEffect(() => {
    const state = loadUserMemory();
    setLang(state.lang);
  }, []);

  const copy = POLICY_COPY[lang];

  return (
    <main className="min-h-screen bg-[#FFFDF9] px-4 py-8 text-ink dark:bg-[#0D0A19] dark:text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            data-testid="privacy-back-link"
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-extrabold text-ink shadow-sm transition hover:bg-amber-50 dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{copy.backLabel}</span>
          </Link>

          <div
            role="group"
            aria-label="Language switch"
            className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 text-xs font-black shadow-sm dark:border-white/15 dark:bg-white/10"
          >
            <button
              type="button"
              onClick={() => setLang('tr')}
              data-testid="privacy-lang-tr"
              className={`rounded-full px-3 py-1 transition ${
                lang === 'tr' ? 'bg-ink text-white dark:bg-violet-600' : 'text-ink/70 dark:text-white/70'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              data-testid="privacy-lang-en"
              className={`rounded-full px-3 py-1 transition ${
                lang === 'en' ? 'bg-ink text-white dark:bg-violet-600' : 'text-ink/70 dark:text-white/70'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Policy Card */}
        <article className="mt-6 rounded-3xl border-2 border-amber-200/90 bg-white p-6 shadow-xl dark:border-violet-800/40 dark:bg-[#171228] sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
            <ShieldCheck className="h-4 w-4" />
            <span>{copy.badge}</span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold text-ink dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-1 text-xs font-bold text-ink/55 dark:text-violet-200/65">{copy.updated}</p>

          <p className="mt-5 text-sm leading-relaxed text-ink/85 dark:text-violet-100/90">
            {copy.intro}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <span className="text-xs font-bold text-ink/80 dark:text-violet-100">
                localStorage &amp; merak_user_summary
              </span>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
              <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
              <span className="text-xs font-bold text-ink/80 dark:text-violet-100">
                Google AdSense (ca-pub-1368005726792126)
              </span>
            </div>
          </div>

          <div className="mt-7 space-y-5">
            {copy.sections.map((section) => (
              <section key={section.heading} className="space-y-1.5">
                <h2 className="font-display text-base font-bold text-ink dark:text-white">
                  {section.heading}
                </h2>
                <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 pt-5 dark:border-white/10">
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
            >
              {copy.adSettingsLabel}
            </a>
            <Link
              href="/"
              className="rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90 dark:bg-violet-600"
            >
              Scrolly (scrolly.live)
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
