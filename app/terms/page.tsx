import type { Metadata } from 'next';
import Link from 'next/link';
import TrustPageShell from '@/components/TrustPageShell';
import type { Language } from '@/i18n/translations';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

function resolveLang(langParam?: string): Language {
  return langParam === 'en' ? 'en' : 'tr';
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const canonicalUrl = 'https://scrolly.live/terms';

  return {
    title:
      lang === 'en'
        ? 'Terms of Use & Disclaimer | Scrolly'
        : 'Kullanım Koşulları ve Sorumluluk Reddi | Scrolly',
    description:
      lang === 'en'
        ? 'Terms of service, educational content disclaimer, intellectual property notice, and advertising guidelines for Scrolly (scrolly.live).'
        : 'Scrolly (scrolly.live) hizmet kullanım koşulları, eğitim amaçlı içerik sorumluluk reddi, fikri mülkiyet ve üçüncü taraf bağlantılar politikası.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: `${canonicalUrl}?lang=tr`,
        en: `${canonicalUrl}?lang=en`,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      title: lang === 'en' ? 'Terms of Use | Scrolly' : 'Kullanım Koşulları | Scrolly',
      description:
        lang === 'en'
          ? 'Usage guidelines, educational disclaimer, and service terms for Scrolly.'
          : 'Scrolly kullanım koşulları, eğitim içeriği bildirimi ve hizmet kuralları.',
      url: canonicalUrl,
      siteName: 'Scrolly',
      type: 'website',
    },
  };
}

export default async function TermsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const lang = resolveLang(query?.lang);
  const isEn = lang === 'en';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://scrolly.live/terms#page',
        name: isEn ? 'Terms of Use — Scrolly' : 'Kullanım Koşulları — Scrolly',
        url: 'https://scrolly.live/terms',
        inLanguage: ['tr', 'en'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isEn ? 'Home' : 'Ana Sayfa',
            item: 'https://scrolly.live',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isEn ? 'Terms of Use' : 'Kullanım Koşulları',
            item: 'https://scrolly.live/terms',
          },
        ],
      },
    ],
  };

  const sections = isEn
    ? [
        {
          heading: '1. Acceptance of Terms',
          body: 'By accessing or using Scrolly (https://scrolly.live), including our web application, Progressive Web App (PWA), topic pages, and quizzes, you agree to comply with these Terms of Use and our Privacy Policy. If you do not agree with these terms, please discontinue use of the service.',
        },
        {
          heading: '2. Educational & Informational Purpose Disclaimer',
          body: 'All discovery cards, diagrams, statistics, and quiz explanations published on Scrolly are provided strictly for general cultural enrichment and educational curiosity. Nothing on scrolly.live — particularly within Human Body, Science, or Records categories — constitutes medical, clinical, legal, or financial advice. Always consult qualified professionals for medical or personal health decisions.',
        },
        {
          heading: '3. Accuracy of Information & Primary Sources',
          body: 'While Scrolly endeavors to cite authoritative institutions (such as NASA, Nature, NIH/PubMed, Smithsonian, and academic journals) and review facts regularly, scientific knowledge evolves continuously. Scrolly provides content "as is" without warranties regarding absolute completeness or real-time updates.',
        },
        {
          heading: '4. Intellectual Property & Attribution',
          body: 'The Scrolly name, user interface design, custom bilingual editorial summaries, quiz questions, and interactive sketch components belong to Scrolly. Third-party scientific institutions and external sources retain all rights to their underlying publications referenced via citation links.',
        },
        {
          heading: '5. Fair Use, Leaderboards & Service Integrity',
          body: 'Users may participate freely in Quick Guesses, Daily Sprints, Weekly Marathons, and 1v1 Duels without account registration. Automated scraping of API endpoints for abuse, artificially inflating telemetry/XP scores, or attempting to bypass security protections is prohibited.',
        },
        {
          heading: '6. Third-Party Links & Advertising',
          body: 'Scrolly links to external verified scientific publishers for citation purposes and uses Google AdSense to keep educational access free. We are not responsible for the content, availability, or privacy practices of external third-party websites.',
        },
        {
          heading: '7. Copyright, Content Use & Legal Notices',
          body: 'For any copyright notices, intellectual property inquiries, content usage permissions, or official legal correspondence regarding Scrolly (scrolly.live), please contact our sole official email channel at contact@scrolly.live.',
        },
      ]
    : [
        {
          heading: '1. Koşulların Kabulü',
          body: 'Scrolly (https://scrolly.live) web platformuna, PWA uygulamasına, kategori merkezlerine, tekil kart sayfalarına ve quiz modlarına erişerek bu Kullanım Koşullarını ve Gizlilik Politikamızı kabul etmiş olursunuz.',
        },
        {
          heading: '2. Eğitim Amaçlı İçerik ve Sorumluluk Reddi',
          body: 'Scrolly platformunda yayımlanan tüm bilgi kartları, eskiz diyagramları, istatistikler ve quiz açıklamaları yalnızca genel kültür ve eğitim amaçlıdır. Özellikle İnsan Vücudu ve Bilim kategorilerindeki hiçbir içerik tıbbi tanı, tedavi, hukuki danışmanlık veya finansal tavsiye niteliği taşımaz; sağlık konularında daima yetkili uzmanlara danışılmalıdır.',
        },
        {
          heading: '3. Bilimsel Doğruluk ve Kaynak Atıfları',
          body: 'İçerikler NASA, Nature, NIH/PubMed, Smithsonian ve hakemli akademik yayınlar referans alınarak hazırlanmaktadır. Bununla birlikte bilimsel bulgular zaman içinde güncellenebilir; Scrolly içerikleri "olduğu gibi" sunar ve mutlak hatasızlık garantisi vermez.',
        },
        {
          heading: '4. Fikri Mülkiyet Hakları',
          body: 'Scrolly markası, arayüz tasarımı, özgün iki dilli özet metinleri, quiz kurguları ve interaktif görsel bileşenler Scrolly’ye aittir. Kaynak bağlantısıyla atıf yapılan dış kurumların yayın hakları ilgili kuruluşlara aittir.',
        },
        {
          heading: '5. Adil Kullanım ve Sıralama Bütünlüğü',
          body: 'Kullanıcılar kayıt gerektirmeden Hızlı Tahmin, Günlük Sprint ve 1v1 Düello modlarına katılabilir. API uç noktalarının kötüye kullanımı, telemetri veya XP puanlarının otomatik botlarla manipüle edilmesi yasaktır.',
        },
        {
          heading: '6. Üçüncü Taraf Bağlantılar ve Reklamlar',
          body: 'Platformumuz doğrulama amaçlı dış bilimsel kaynaklara bağlantılar içerir ve ücretsiz erişimi sürdürmek için Google AdSense kullanır. Dış bağlantı verilen web sitelerinin içerik veya gizlilik uygulamalarından Scrolly sorumlu değildir.',
        },
        {
          heading: '7. Telif, İçerik Kullanımı ve Hukuki Bildirimler',
          body: 'Telif hakları, içerik kullanımı, fikri mülkiyet bildirimleri ve resmi hukuki yazışmalar için tek yetkili iletişim kanalımız olan contact@scrolly.live adresi üzerinden bizimle iletişime geçebilirsiniz.',
        },
      ];

  return (
    <TrustPageShell
      routePath="/terms"
      lang={lang}
      badge={isEn ? 'Service Guidelines' : 'Hizmet Kuralları'}
      title={
        isEn
          ? 'Terms of Use & Educational Disclaimer'
          : 'Kullanım Koşulları ve Sorumluluk Reddi'
      }
      updatedLabel={
        isEn
          ? 'Effective: November 2026 • scrolly.live • contact@scrolly.live'
          : 'Yürürlük: Kasım 2026 • scrolly.live • contact@scrolly.live'
      }
      breadcrumbLabel={isEn ? 'Terms of Use' : 'Kullanım Koşulları'}
      jsonLd={jsonLd}
    >
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-1.5">
            <h2 className="font-display text-base font-bold text-ink dark:text-white sm:text-lg">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-ink/80 dark:text-violet-100/80">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-amber-100 pt-5 dark:border-white/10">
        <Link
          href="/privacy"
          className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
        >
          {isEn ? 'Read Privacy Policy →' : 'Gizlilik Politikasını İncele →'}
        </Link>
        <Link
          href={isEn ? '/contact?lang=en' : '/contact'}
          className="text-xs font-extrabold text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300"
        >
          {isEn ? 'Contact Scrolly →' : 'İletişime Geç →'}
        </Link>
        <a
          href="mailto:contact@scrolly.live"
          className="text-xs font-extrabold text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-300"
        >
          contact@scrolly.live
        </a>
      </div>
    </TrustPageShell>
  );
}
