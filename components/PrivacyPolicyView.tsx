'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Cookie, Database, Home, ShieldCheck } from 'lucide-react';
import HtmlLangSync from '@/components/HtmlLangSync';
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
      'Scrolly (https://scrolly.live) iki dilli bilimsel mikro keşif deneyimi sunar. Misafir olarak anonim tarayıcı depolamasıyla ilerleyebilir; isteğe bağlı olarak şifresiz e-posta OTP ile ilerlemenizi cihazlar arasında senkronize edebilirsiniz. Bu sayfa yerel depolamayı, isteğe bağlı hesap bağlamayı, çerezleri, analitiği ve AdSense kullanımını açıklar.',
    sections: [
      {
        heading: '1. Misafir Depolama ve İsteğe Bağlı E-posta OTP',
        body: 'Varsayılan olarak Scrolly ad-soyad veya şifre toplamaz. Okuduğunuz kartlar, seri, XP, dil (TR/EN) ve favoriler cihazınızdaki localStorage (merak_user_state_v1, scrolly_device_id, scrolly_offline_events) ve işlevsel özet çerezinde (merak_user_summary) kalır. İsterseniz “E-posta Bağla” ile tek kullanımlık 6 haneli OTP kodu alarak ilerlemenizi hesabınıza taşıyabilirsiniz — kalıcı şifre tutulmaz. Diploma ekranındaki “Hafızayı Sıfırla” yerel veriyi temizler.',
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
        heading: '6. Veri Sorumlusu İletişim Adresi ve Veri Talepleri',
        body: 'Çerez kullanımı, Google AdSense (ca-pub-1368005726792126) kişiselleştirilmiş reklam tercihleri, Google Analytics / Tag Manager (GTM-TQ6VVKM7) ölçümleri, gizlilik hakları ve tüm veri talepleri için tek resmi veri sorumlusu iletişim adresimiz olan contact@scrolly.live üzerinden veya İletişim sayfamızdan bize ulaşabilirsiniz.',
      },
    ],
    controllerLabel: 'Veri Sorumlusu İletişimi:',
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
      'Scrolly (https://scrolly.live) delivers bilingual micro-discovery. You can explore as a guest with anonymous local storage, or optionally link a passwordless email OTP account to sync progress across devices. This policy explains local storage, optional account linking, cookies, analytics, and AdSense.',
    sections: [
      {
        heading: '1. Guest Storage & Optional Email OTP',
        body: 'By default Scrolly does not collect names or passwords. Card history, streak, XP, language (TR/EN), and favorites stay on-device via localStorage (merak_user_state_v1, scrolly_device_id, scrolly_offline_events) and a functional summary cookie (merak_user_summary). You may optionally use “Link Email” to receive a one-time 6-digit OTP and merge progress into an account — no permanent password is stored. “Reset Memory” in the Explorer Diploma clears local data.',
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
        heading: '6. Data Controller Contact & Data Requests',
        body: 'For any questions regarding cookies, Google AdSense (ca-pub-1368005726792126), Google Analytics / Tag Manager (GTM-TQ6VVKM7) measurements, or data subject inquiries, please contact our sole official data controller address at contact@scrolly.live or via our Contact page.',
      },
    ],
    controllerLabel: 'Data Controller Contact:',
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
  const isEn = lang === 'en';

  return (
    <>
      <HtmlLangSync lang={lang} />
      <div lang={isEn ? 'en-US' : 'tr-TR'} className="min-h-dvh w-full overflow-x-clip bg-cik-bg text-cik-text">
        <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
          <div className="mx-auto flex max-w-[42.5rem] items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              data-testid="privacy-back-link"
              className="cik-footnote inline-flex h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span>{copy.backLabel}</span>
            </Link>

            <div
              role="group"
              aria-label={isEn ? 'Language' : 'Dil'}
              className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface p-1"
            >
              <button
                type="button"
                onClick={() => setLang('tr')}
                data-testid="privacy-lang-tr"
                aria-pressed={lang === 'tr'}
                className={`cik-footnote inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 ${
                  lang === 'tr' ? 'bg-cik-berry text-cik-on-berry' : 'text-cik-text-2'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                data-testid="privacy-lang-en"
                aria-pressed={lang === 'en'}
                className={`cik-footnote inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 ${
                  lang === 'en' ? 'bg-cik-berry text-cik-on-berry' : 'text-cik-text-2'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[42.5rem] px-4 pb-8 pt-6">
          <nav aria-label="Breadcrumb" className="cik-footnote mb-4 flex items-center gap-2 text-cik-text-2">
            <Link href="/" className="inline-flex items-center gap-1 text-cik-text">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{isEn ? 'Home' : 'Ana sayfa'}</span>
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-cik-text">{isEn ? 'Privacy' : 'Gizlilik'}</span>
          </nav>

          <article className="rounded-sticker border border-cik-line bg-cik-surface p-5 shadow-e1">
            <p className="cik-footnote inline-flex items-center gap-2 rounded-pill bg-cik-pink px-3 py-1 text-cik-text">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>{copy.badge}</span>
            </p>
            <h1 className="cik-title-1 mt-3 text-cik-text">{copy.title}</h1>
            <p className="cik-caption-1 mt-2 text-cik-text-2">{copy.updated}</p>

            <div className="cik-body mt-6 space-y-6 text-cik-text">
              <p>{copy.intro}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-cik-lg border border-cik-line bg-cik-surface-2 p-4">
                  <Database className="mt-1 h-4 w-4 shrink-0 text-cik-butter-text" aria-hidden="true" />
                  <span className="cik-footnote">localStorage &amp; merak_user_summary</span>
                </div>
                <div className="flex items-start gap-3 rounded-cik-lg border border-cik-line bg-cik-surface-2 p-4">
                  <Cookie className="mt-1 h-4 w-4 shrink-0 text-cik-cta" aria-hidden="true" />
                  <span className="cik-footnote">Google AdSense (ca-pub-1368005726792126)</span>
                </div>
              </div>

              <div className="space-y-5">
                {copy.sections.map((section) => (
                  <section key={section.heading} className="space-y-2">
                    <h2 className="cik-headline text-cik-text">{section.heading}</h2>
                    <p className="text-cik-text-2">{section.body}</p>
                  </section>
                ))}
              </div>

              <div className="rounded-cik-lg border border-cik-line bg-cik-mint px-4 py-3 text-cik-mint-text">
                <span className="cik-footnote">{copy.controllerLabel} </span>
                <a
                  href="mailto:contact@scrolly.live"
                  data-testid="privacy-contact-email"
                  className="cik-footnote underline decoration-cik-line underline-offset-4"
                >
                  contact@scrolly.live
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cik-line pt-5">
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="https://adssettings.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cik-footnote text-cik-cta underline decoration-cik-line underline-offset-4"
                  >
                    {copy.adSettingsLabel}
                  </a>
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cik-footnote text-cik-cta underline decoration-cik-line underline-offset-4"
                  >
                    {copy.aboutAdsLabel}
                  </a>
                </div>
                <Link
                  href={lang === 'en' ? '/contact?lang=en' : '/contact'}
                  className="cik-footnote inline-flex h-11 items-center rounded-pill bg-cik-cta px-4 text-cik-on-cta"
                >
                  {copy.contactLinkLabel}
                </Link>
              </div>
            </div>
          </article>
        </main>

        <SiteTrustFooter lang={lang} />
      </div>
    </>
  );
}
