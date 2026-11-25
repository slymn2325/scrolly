'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  Code2,
  GraduationCap,
  Layers,
  Loader2,
  MailCheck,
  Newspaper,
  Send,
  Sparkles,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react';
import ScrollyStoryPlayer from '@/components/stories/ScrollyStoryPlayer';
import {
  DEFAULT_STORY_THEME,
  LANDING_DEMO_CARDS,
  type StoryLanguage,
} from '@/types/story';

interface StudioLandingViewProps {
  language: StoryLanguage;
  onChangeLanguage: (lang: StoryLanguage) => void;
  onOpenAuthModal: () => void;
}

export default function StudioLandingView({
  language,
  onChangeLanguage,
  onOpenAuthModal,
}: StudioLandingViewProps) {
  const isTr = language === 'tr';
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistOrg, setWaitlistOrg] = useState('');
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistDone, setWaitlistDone] = useState(false);

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWaitlistError(isTr ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.');
      return;
    }

    setWaitlistBusy(true);
    setWaitlistError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlistName.trim() || 'Pro Studio Lead',
          email,
          subject: isTr ? 'Reklam & İş Birliği' : 'Advertising & Partnership',
          message: `[Scrolly Studio Pro Waitlist]\nOrganization: ${
            waitlistOrg.trim() || '-'
          }\nLanguage: ${language}`,
          lang: language,
        }),
      });
      if (!res.ok) {
        setWaitlistError(
          isTr ? 'Kayıt gönderilemedi, lütfen tekrar dene.' : 'Could not submit waitlist request.'
        );
        return;
      }
      setWaitlistDone(true);
    } catch {
      setWaitlistError(
        isTr ? 'Ağ hatası oluştu, lütfen tekrar dene.' : 'Network error while submitting request.'
      );
    } finally {
      setWaitlistBusy(false);
    }
  };

  const useCases = [
    {
      icon: Newspaper,
      title: isTr ? 'Haber & Medya Siteleri' : 'News & Digital Media',
      stat: isTr ? '+2.8x Sayfada Kalma' : '+2.8x Dwell Time',
      desc: isTr
        ? 'Uzun haberlerin üstüne veya içine 5 kartlık GIF destekli mikro özetler gömün, okuyucuyu akışta tutun.'
        : 'Embed 5-card GIF-backed article recaps inside long-form news stories to dramatically lift reader retention.',
    },
    {
      icon: MailCheck,
      title: isTr ? 'Bültenler (Substack & Ghost)' : 'Newsletters (Substack & Ghost)',
      stat: isTr ? '%64+ Kart Tamamlama' : '64%+ Completion Rate',
      desc: isTr
        ? 'Statik bülten arşivlerinizi kaydırılabilir kart destelerine çevirin ve etkileşimli tahmin sorularıyla öne çıkın.'
        : 'Turn static archive issues into tactile, swipeable micro-decks with built-in Quick Guess knowledge checks.',
    },
    {
      icon: GraduationCap,
      title: isTr ? 'EdTech & Kurs Platformları' : 'EdTech & Online Courses',
      stat: isTr ? 'Aktif Pekiştirme' : 'Active Recall Built-In',
      desc: isTr
        ? 'Ders özetlerinin hemen ardından Quick Guess sorularıyla öğrencinin konuyu anında pekiştirmesini sağlayın.'
        : 'Pair bite-sized lesson takeaways with zero-friction Quick Guess prompts directly inside LMS lessons.',
    },
    {
      icon: TrendingUp,
      title: isTr ? 'Markalar & İçerik Pazarlama' : 'Brands & Growth Teams',
      stat: isTr ? 'Sıfır Kod · Tek Satır' : 'Zero Code · 1-Line Embed',
      desc: isTr
        ? 'Ürün hikayelerinizi Canva kalitesinde tasarlayın, her kartın altına tıklanabilir CTA bağlantısı ekleyin.'
        : 'Design Canva-grade branded stories with custom accent colors, gradient frames, and clickable end-card CTAs.',
    },
  ];

  const steps = [
    {
      num: '01',
      icon: Wand2,
      title: isTr ? 'Linki veya Metni Yapıştır' : 'Paste Article URL or Text',
      desc: isTr
        ? 'İster herkese açık bir makale linki girin ister ham ders/bülten metni yapıştırın; AI 5–7 kart ve otomatik konu GIF’i hazırlar.'
        : 'Paste a public article link or raw notes—or build manually card by card at zero AI cost.',
    },
    {
      num: '02',
      icon: Layers,
      title: isTr ? 'Canva Gibi Özelleştir' : 'Style Like Canva Studio',
      desc: isTr
        ? 'GIF değiştirin, 6 premium degrade, overlay koyuluğu, cam/opak kart yüzeyi, hizalama, font ve Quick Guess’i düzenleyin.'
        : 'Swap GIF backgrounds, pick from 6 curated gradients, tune overlay darkness, glass/solid surfaces, typography, and quizzes.',
    },
    {
      num: '03',
      icon: Code2,
      title: isTr ? 'Tek Satır <iframe> ile Göm' : 'Embed With 1-Line <iframe>',
      desc: isTr
        ? 'Hazır embed kodunu kopyalayın; Webflow, WordPress, Ghost veya özel sitenizde anında mobil uyumlu çalıştırın.'
        : 'Copy one responsive <iframe> snippet that runs seamlessly across Ghost, WordPress, Webflow, or custom apps.',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-cik-bg text-cik-text">
      {/* Top Navbar */}
      <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="scrolly-glass-pill scrolly-tactile inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-cik-surface px-3.5 text-xs font-extrabold text-cik-text hover:bg-cik-surface-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? 'Akışa Dön' : 'Back to Feed'}</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cik-pink text-cik-cta">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="cik-headline leading-tight text-cik-text">Scrolly Creator Studio</p>
                <p className="cik-caption-2 text-cik-text-2">
                  {isTr ? 'B2B Etkileşimli Hikâye Platformu' : 'B2B Interactive Scrollytelling'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="scrolly-glass-pill inline-flex rounded-pill bg-cik-surface p-0.5">
              <button
                type="button"
                onClick={() => onChangeLanguage('tr')}
                className={`rounded-pill px-3 py-1.5 text-xs font-extrabold transition ${
                  isTr ? 'bg-cik-cta text-cik-on-cta' : 'text-cik-text-2 hover:text-cik-text'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`rounded-pill px-3 py-1.5 text-xs font-extrabold transition ${
                  !isTr ? 'bg-cik-cta text-cik-on-cta' : 'text-cik-text-2 hover:text-cik-text'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              data-testid="landing-nav-login-btn"
              onClick={onOpenAuthModal}
              className="scrolly-tactile inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-cik-cta px-4 text-xs font-extrabold text-cik-on-cta shadow-sticker"
            >
              <span>{isTr ? 'Ücretsiz Stüdyoya Gir' : 'Enter Free Studio'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 lg:py-14">
        {/* 1. Hero Section + Live Interactive Player */}
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_420px]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-pill border border-cik-line bg-cik-pink px-3.5 py-1.5 text-xs font-extrabold text-cik-cta">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isTr
                  ? 'Yayıncılar, Bültenler & EdTech Ekipleri İçin'
                  : 'For Publishers, Newsletters & EdTech Teams'}
              </span>
            </span>

            <h1 className="cik-large-title text-cik-text sm:text-[2.65rem] sm:leading-[3.1rem]">
              {isTr
                ? "Durağan makaleleri 30 saniyede kaydırılabilir, GIF'li interaktif hikâyelere dönüştür — sitene tek satırla göm."
                : 'Turn static articles into swipeable, GIF-backed interactive stories in 30 seconds — embed anywhere in 1 line.'}
            </h1>

            <p className="max-w-2xl text-base font-semibold leading-relaxed text-cik-text-2">
              {isTr
                ? 'Uzun yazıları okunması keyifli dikey kartlara, anlık Quick Guess sorularına ve marka uyumlu embed oynatıcıya çevirin. Ücretsiz Starter planında kredi kartı gerekmez.'
                : 'Convert long reads into tactile vertical story decks with auto-matched GIF scenes, Quick Guess checks, and clean embeddable players.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="landing-hero-cta-btn"
                onClick={onOpenAuthModal}
                className="scrolly-tactile inline-flex min-h-12 items-center gap-2 rounded-pill bg-cik-cta px-6 text-sm font-extrabold text-cik-on-cta shadow-sticker"
              >
                <span>{isTr ? 'Ücretsiz Stüdyoya Gir' : 'Enter Free Studio'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <a
                href="#pricing"
                className="scrolly-glass-pill scrolly-tactile inline-flex min-h-12 items-center gap-2 rounded-pill bg-cik-surface px-5 text-sm font-extrabold text-cik-text hover:bg-cik-surface-2"
              >
                <span>{isTr ? 'Planları Gör ($0 Starter)' : 'View Pricing ($0 Starter)'}</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs font-bold text-cik-text-2">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cik-mint-text" aria-hidden="true" />
                <span>{isTr ? 'Ayda 2 Ücretsiz AI Hikâye' : '2 Free AI Stories / Month'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cik-mint-text" aria-hidden="true" />
                <span>{isTr ? 'Sınırsız Manuel Kart Düzenleme' : 'Unlimited Manual Card Editing'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-cik-mint-text" aria-hidden="true" />
                <span>{isTr ? '30 Sn E-posta OTP Girişi' : 'Passwordless Email OTP'}</span>
              </span>
            </div>
          </div>

          {/* Interactive Live Demo Player */}
          <div className="scrolly-glass-surface rounded-[30px] p-3.5">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cik-text">
                <BookOpenCheck className="h-3.5 w-3.5 text-cik-cta" aria-hidden="true" />
                <span>{isTr ? 'Canlı İnteraktif Demo (Tıkla & Kaydır)' : 'Live Interactive Demo'}</span>
              </span>
              <span className="rounded-pill bg-cik-pink px-2.5 py-0.5 text-[11px] font-extrabold text-cik-cta">
                {isTr ? '3 Kart · GIF + Tahmin' : '3 Cards · GIF + Guess'}
              </span>
            </div>
            <div data-testid="landing-live-demo" className="h-[540px] w-full">
              <ScrollyStoryPlayer
                storyId={`landing-demo-${language}`}
                title={
                  isTr
                    ? 'Demo: Kozmik Zaman & İnteraktif Medya'
                    : 'Demo: Cosmic Time & Interactive Media'
                }
                sourceUrl="https://scrolly.live"
                language={language}
                theme={DEFAULT_STORY_THEME}
                cards={LANDING_DEMO_CARDS[language]}
              />
            </div>
          </div>
        </section>

        {/* 2. B2B Use Cases */}
        <section className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="cik-caption-1 uppercase tracking-wider text-cik-cta">
              {isTr ? 'Kullanım Senaryoları' : 'Built For Modern Publishers'}
            </p>
            <h2 className="cik-title-1 text-cik-text">
              {isTr
                ? 'Her içerik ekibi için daha yüksek etkileşim'
                : 'Built for higher engagement across every format'}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((item) => {
              const IconComp = item.icon;
              return (
                <article
                  key={item.title}
                  className="scrolly-glass-surface flex flex-col justify-between gap-4 rounded-3xl p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cik-pink text-cik-cta">
                        <IconComp className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="rounded-pill bg-cik-mint px-2.5 py-1 text-[11px] font-extrabold text-cik-mint-text">
                        {item.stat}
                      </span>
                    </div>
                    <h3 className="cik-headline text-cik-text">{item.title}</h3>
                    <p className="cik-subhead text-cik-text-2">{item.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 3. How It Works (3 Steps + Embed Snippet) */}
        <section className="scrolly-glass-surface space-y-6 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="cik-caption-1 uppercase tracking-wider text-cik-cta">
                {isTr ? 'Nasıl Çalışır?' : 'How It Works'}
              </p>
              <h2 className="cik-title-1 text-cik-text">
                {isTr ? '3 adımda yayına alın' : 'Publish your first story in 3 steps'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="scrolly-tactile inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-4 text-xs font-extrabold text-cik-cta hover:bg-cik-pink"
            >
              <span>{isTr ? 'Hemen Dene' : 'Try It Free'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-2xl border border-cik-line bg-cik-surface-2 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-cik-cta">
                      {step.num}
                    </span>
                    <StepIcon className="h-4 w-4 text-cik-text-2" aria-hidden="true" />
                  </div>
                  <h3 className="cik-headline mt-3 text-cik-text">{step.title}</h3>
                  <p className="cik-subhead mt-1.5 text-cik-text-2">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Transparent Pricing */}
        <section id="pricing" className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="cik-caption-1 uppercase tracking-wider text-cik-cta">
              {isTr ? 'Şeffaf Fiyatlandırma' : 'Transparent Pricing'}
            </p>
            <h2 className="cik-title-1 text-cik-text">
              {isTr ? 'Ücretsiz başla, ihtiyacın büyüdükçe geç' : 'Start free, scale when ready'}
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            {/* Starter Plan */}
            <div className="scrolly-glass-surface flex flex-col justify-between rounded-3xl border-2 border-cik-cta/50 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-pill bg-cik-pink px-3 py-1 text-xs font-extrabold text-cik-cta">
                    Starter
                  </span>
                  <span className="rounded-pill bg-cik-mint px-2.5 py-1 text-[11px] font-extrabold text-cik-mint-text">
                    {isTr ? 'Aktif' : 'Available Now'}
                  </span>
                </div>
                <div>
                  <p className="cik-large-title text-cik-text">
                    $0{' '}
                    <span className="text-base font-bold text-cik-text-2">
                      / {isTr ? 'ay' : 'month'}
                    </span>
                  </p>
                  <p className="cik-subhead mt-1 text-cik-text-2">
                    {isTr
                      ? 'Bloglar, bağımsız yazarlar ve yeni projeler için.'
                      : 'For independent writers, newsletters, and side projects.'}
                  </p>
                </div>
                <ul className="space-y-2.5 pt-2 text-sm font-semibold text-cik-text">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Ayda 2 adet AI hikâye üretimi' : '2 AI story generations / month'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Maksimum 3 yayında hikâye' : 'Up to 3 active published embeds'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Sınırsız manuel kart ekleme & Canva stili editör' : 'Unlimited manual editing & Canva-style design'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Dahili GIF arama + 6 degrade + Quick Guess' : 'Built-in GIF search + 6 gradients + Quick Guess'}</span>
                  </li>
                  <li className="flex items-center gap-2 text-cik-text-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-cik-cta" aria-hidden="true" />
                    <span>{isTr ? 'Alt kısımda “Powered by Scrolly.live” rozeti' : 'Includes “Powered by Scrolly.live” badge'}</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                data-testid="pricing-starter-btn"
                onClick={onOpenAuthModal}
                className="scrolly-tactile mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-5 text-sm font-extrabold text-cik-on-cta shadow-sticker"
              >
                <span>{isTr ? 'Ücretsiz Stüdyoya Gir' : 'Start Free With Email OTP'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Pro Plan */}
            <div className="scrolly-glass-surface flex flex-col justify-between rounded-3xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-pill bg-cik-surface-2 px-3 py-1 text-xs font-extrabold text-cik-text">
                    Pro
                  </span>
                  <span className="rounded-pill bg-cik-butter px-2.5 py-1 text-[11px] font-extrabold text-cik-butter-text">
                    {isTr ? 'Yakında · Waitlist' : 'Coming Soon · Waitlist'}
                  </span>
                </div>
                <div>
                  <p className="cik-large-title text-cik-text">
                    $19{' '}
                    <span className="text-base font-bold text-cik-text-2">
                      / {isTr ? 'ay' : 'month'}
                    </span>
                  </p>
                  <p className="cik-subhead mt-1 text-cik-text-2">
                    {isTr
                      ? 'Medya ekipleri, EdTech şirketleri ve ajanslar için.'
                      : 'For media teams, course platforms, and high-traffic brands.'}
                  </p>
                </div>
                <ul className="space-y-2.5 pt-2 text-sm font-semibold text-cik-text">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Sınırsız AI hikâye üretimi' : 'Unlimited AI story generations'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Sınırsız yayında embed & alan adı kontrolü' : 'Unlimited active embeds & domain controls'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'White-label oynatıcı (Scrolly rozetini kaldır)' : 'White-label player (no Scrolly badge)'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-cik-mint-text" aria-hidden="true" />
                    <span>{isTr ? 'Özel marka logosu, renk teması & gelişmiş analitik' : 'Custom logo, palette & completion analytics'}</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                data-testid="pricing-pro-waitlist-btn"
                onClick={() => {
                  setWaitlistDone(false);
                  setWaitlistError(null);
                  setWaitlistOpen(true);
                }}
                className="scrolly-tactile mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-5 text-sm font-extrabold text-cik-text hover:bg-cik-pink hover:text-cik-cta"
              >
                <span>{isTr ? 'Pro Bekleme Listesine Katıl' : 'Join Pro Waitlist'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Pro Waitlist Modal */}
      {waitlistOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isTr ? 'Pro Bekleme Listesi' : 'Pro Waitlist'}
          className="cik-scrim fixed inset-0 z-modal flex items-center justify-center p-4"
          onClick={() => setWaitlistOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-cik-line bg-cik-bg-elevated p-6 text-cik-text shadow-e3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={isTr ? 'Kapat' : 'Close'}
              onClick={() => setWaitlistOpen(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-pill bg-cik-surface-2 text-cik-text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <h3 className="cik-title-2 pr-10 text-cik-text">
              {isTr ? 'Pro Plan ($19/ay) Bekleme Listesi' : 'Join the Pro ($19/mo) Waitlist'}
            </h3>
            <p className="cik-subhead mt-1 text-cik-text-2">
              {isTr
                ? 'White-label oynatıcı ve sınırsız AI erişimi açıldığında ilk haberi alın.'
                : 'Get early access when white-label players and unlimited AI open.'}
            </p>

            {waitlistDone ? (
              <div className="mt-5 space-y-3 rounded-2xl bg-cik-mint p-4 text-cik-mint-text">
                <p className="text-sm font-extrabold">
                  {isTr
                    ? 'Talebin alındı! Pro plan açıldığında seninle iletişime geçeceğiz.'
                    : "You're on the waitlist! We will reach out as soon as Pro launches."}
                </p>
                <button
                  type="button"
                  onClick={() => setWaitlistOpen(false)}
                  className="inline-flex min-h-10 items-center rounded-pill bg-cik-bg-elevated px-4 text-xs font-extrabold text-cik-text"
                >
                  {isTr ? 'Tamam' : 'Done'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitWaitlist} className="mt-4 space-y-3">
                {waitlistError ? (
                  <p className="rounded-xl bg-cik-rose px-3 py-2 text-xs font-bold text-cik-rose-text">
                    {waitlistError}
                  </p>
                ) : null}
                <input
                  type="text"
                  required
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder={isTr ? 'Adınız' : 'Your name'}
                  className="w-full rounded-xl border border-cik-line bg-cik-surface-2 px-3.5 py-2.5 text-sm font-semibold text-cik-text placeholder:text-cik-text-3"
                />
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-cik-line bg-cik-surface-2 px-3.5 py-2.5 text-sm font-semibold text-cik-text placeholder:text-cik-text-3"
                />
                <input
                  type="text"
                  value={waitlistOrg}
                  onChange={(e) => setWaitlistOrg(e.target.value)}
                  placeholder={isTr ? 'Yayın / Site / Şirket (opsiyonel)' : 'Publication / Website (optional)'}
                  className="w-full rounded-xl border border-cik-line bg-cik-surface-2 px-3.5 py-2.5 text-sm font-semibold text-cik-text placeholder:text-cik-text-3"
                />
                <button
                  type="submit"
                  disabled={waitlistBusy}
                  className="scrolly-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-5 text-sm font-extrabold text-cik-on-cta shadow-sticker disabled:opacity-50"
                >
                  {waitlistBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{isTr ? 'Listeye Katıl' : 'Join Waitlist'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
