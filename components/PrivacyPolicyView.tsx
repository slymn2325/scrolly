'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, Database, ShieldCheck } from 'lucide-react';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import { type Language } from '@/i18n/translations';
import { loadUserMemory } from '@/utils/userMemory';

const POLICY_COPY = {
  tr: {
    backLabel: 'Scrolly Akışına Dön',
    badge: 'Gizlilik ve Çerez Politikası',
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: Kasım 2026 • scrolly.live',
    intro:
      'Scrolly (https://scrolly.live), kullanıcılarından kayıt veya kişisel hesap oluşturma talep etmeden iki dilli bilimsel mikro keşif deneyimi sunar. Bu sayfa anonim tarayıcı depolamasının, temel işlevsel çerezlerin, Google Analytics/Tag Manager ölçümlerinin ve Google AdSense reklam teknolojilerinin nasıl çalıştığını şeffaf biçimde açıklar.',
    sections: [
      {
        heading: '1. Kişisel Hesap Olmadan Anonim Yerel Depolama',
        body: 'Scrolly ad, soyad, e-posta adresi veya şifre toplamaz. Okuduğunuz kartlar, günlük seri puanınız, XP seviyeniz, dil seçiminiz (TR/EN) ve favorileriniz yalnızca cihazınızdaki tarayıcı hafızasında (localStorage anahtarları: merak_user_state_v1, scrolly_device_id, scrolly_offline_events) ve küçük bir işlevsel özet çerezinde (merak_user_summary) saklanır. İstediğiniz zaman Diploma ekranındaki "Hafızayı Sıfırla" butonuyla tüm yerel verilerinizi anında temizleyebilirsiniz.',
      },
      {
        heading: '2. Çevrimdışı PWA Önbelleği',
        body: 'Uygulamanın internet olmadan da çalışabilmesi için Service Worker yalnızca herkese açık bilgi veri paketlerini ve yerel görsel varlıkları cihazınızda önbelleğe alır. Çevrimdışı modda reklam ağlarına istek gönderilmez ve /ads.txt, /sitemap.xml, /robots.txt gibi politika dosyaları asla önbellekten bozulmaz.',
      },
      {
        heading: '3. Google AdSense, DoubleClick DART Çerezleri ve Üçüncü Taraf Reklamları',
        body: 'Scrolly, ücretsiz bilimsel içerik erişimini sürdürebilmek amacıyla Google AdSense (Yayıncı Kimliği: ca-pub-1368005726792126) hizmetini kullanır. Google ve iş ortakları dahil üçüncü taraf satıcılar, scrolly.live veya internet üzerindeki diğer web sitelerine yaptığınız önceki ziyaretlere dayalı olarak ilgi alanlarınıza uygun reklamlar sunmak için DoubleClick / DART reklam çerezleri kullanabilir.',
      },
      {
        heading: '4. Analitik Ölçümleri (Google Tag Manager)',
        body: 'Sayfa performansı ve anonim kullanım metriklerini değerlendirmek amacıyla Google Etiket Yöneticisi (GTM-TQ6VVKM7) kullanılmaktadır. Kişisel kimlik belirleyici bilgiler (ad, e-posta vb.) analitik katmanına aktarılmaz.',
      },
      {
        heading: '5. Reklam Tercihlerini Yönetme ve Çıkış (Opt-Out) Hakkı',
        body: 'Kullanıcılar Google Reklam Ayarları (adssettings.google.com) veya Dijital Reklam İttifakı (aboutads.info/choices) üzerinden kişiselleştirilmiş reklam çerezlerini diledikleri zaman devre dışı bırakabilir ya da tarayıcı ayarlarından tüm çerezleri silebilir/engelleyebilir.',
      },
      {
        heading: '6. İletişim ve Veri Talepleri',
        body: 'Gizlilik politikamız, çerez kullanımımız veya kaynak düzeltmeleri hakkındaki sorularınız için contact@scrolly.live e-posta adresinden veya İletişim sayfamızdan bize ulaşabilirsiniz.',
      },
    ],
    adSettingsLabel: 'Google Reklam Ayarlarını Yönet ↗',
    aboutAdsLabel: 'aboutads.info Tercihleri ↗',
    contactLinkLabel: 'İletişim Sayfası',
  },
  en: {
    backLabel: 'Back to Scrolly Feed',
    badge: 'Privacy & Cookie Policy',
    title: 'Privacy Policy',
    updated: 'Last updated: November 2026 • scrolly.live',
    intro:
      'Scrolly (https://scrolly.live) delivers an interactive bilingual micro-discovery experience without requiring registration or personal user accounts. This policy transparently explains how anonymous local browser storage, functional cookies, analytics measurement, and Google AdSense advertising cookies operate on our platform.',
    sections: [
      {
        heading: '1. Registration-Free Anonymous Local Storage',
        body: 'Scrolly does not collect names, email addresses, or passwords. Your read card history, daily streak, XP score, language preference (TR/EN), and favorites remain strictly on your device using browser localStorage keys (merak_user_state_v1, scrolly_device_id, scrolly_offline_events) and a lightweight functional summary cookie (merak_user_summary). You can erase all local data at any time using "Reset Memory" inside the Explorer Diploma modal.',
      },
      {
        heading: '2. Offline PWA Caching',
        body: 'To support offline reading as a Progressive Web App, our Service Worker caches only public fact JSON datasets and local visual assets on your device. No third-party ad requests are dispatched while offline, and crawler files such as /ads.txt, /robots.txt, and /sitemap.xml bypass Service Worker caching completely.',
      },
      {
        heading: '3. Google AdSense, DoubleClick DART Cookies & Third-Party Vendors',
        body: 'Scrolly uses Google AdSense (Publisher ID: ca-pub-1368005726792126) to keep educational discovery free. Third-party vendors, including Google, use cookies (such as the DoubleClick DART cookie) to serve ads based on a user’s prior visits to scrolly.live or other websites across the Internet.',
      },
      {
        heading: '4. Analytics Measurement (Google Tag Manager)',
        body: 'We use Google Tag Manager (GTM-TQ6VVKM7) to evaluate aggregate page performance and interaction quality. No personally identifiable information (such as names, emails, or account credentials) is transmitted to analytics tags.',
      },
      {
        heading: '5. Managing Ad Preferences & Opt-Out Rights',
        body: 'Users may opt out of personalized advertising at any time by visiting Google Ad Settings (adssettings.google.com) or the Digital Advertising Alliance opt-out portal (aboutads.info/choices), or control and clear cookies directly through browser privacy settings.',
      },
      {
        heading: '6. Contact & Privacy Inquiries',
        body: 'For any questions regarding this Privacy Policy, cookies, or editorial corrections, please reach us at contact@scrolly.live or via our Contact page.',
      },
    ],
    adSettingsLabel: 'Manage Google Ad Settings ↗',
    aboutAdsLabel: 'aboutads.info Choices ↗',
    contactLinkLabel: 'Contact Page',
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
    <div className="min-h-screen bg-[#FFFDF9] text-ink dark:bg-[#0D0A19] dark:text-white">
      <main className="px-4 pt-8 pb-6 sm:px-6 sm:pt-12">
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
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
                >
                  {copy.adSettingsLabel}
                </a>
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
                >
                  {copy.aboutAdsLabel}
                </a>
              </div>
              <Link
                href={lang === 'en' ? '/contact?lang=en' : '/contact'}
                className="rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90 dark:bg-violet-600"
              >
                {copy.contactLinkLabel}
              </Link>
            </div>
          </article>
        </div>
      </main>

      <SiteTrustFooter lang={lang} />
    </div>
  );
}
