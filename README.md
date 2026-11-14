<div align="center">

# Scrolly

**Tek Saniyede Mikro Keşif Platformu · One-Second Micro-Discovery Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=flat-square)](https://scrolly.live)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

[Canlı Demo / Live Site (scrolly.live)](https://scrolly.live) · [Gizlilik Politikası / Privacy Policy](https://scrolly.live/privacy)

</div>

---

## Türkçe

**Scrolly**, kullanıcıların kayıt zorunluluğu olmadan tek saniyede keşfe başlayabildiği; Türkçe (`TR`) ve İngilizce (`EN`) çift dilli, dikey `100dvh` Reels akıcılığında mikro öğrenme, etkileşimli görsel motoru, **Scrolla** gerçek zamanlı 1v1 bilgi düelloları, **İstatistik** dahil 7 bilimsel kategori ve **Dil Öğrenme (Language Lab)** modu sunan bir Next.js 16 + React 19 PWA uygulamasıdır.

### Öne Çıkan MVP Özellikleri
- **Keşfet (Explore) & Çift Platform Reels Akışı (`TikTokFeed`, `TikTokFactSlide`, `DesktopLeftNav`):** Mobilde kenardan kenara `100dvh` dikey akış + yüzen alt navigasyon (`IosFloatingIslandDock`), masaüstü/tablette sol navigasyon rayı, ortalanmış `9:16` sahne, ortam bulanıklığı, `activeIndex ± 2` DOM sanallaştırması ve `?fact=<slug>` senkronizasyonu.
- **7 Bilgi Kategorisi + İstatistik & Dil Öğrenme:** `Tümü (Genel)`, `Uzay`, `Doğa`, `Bilim`, `Tarih`, `İnsan Vücudu`, `Garip Rekorlar` ve yeni **İstatistik (`statistics`)** kategorisi (Doğum Günü Paradoksu, Hayatta Kalma Önyargısı, Monty Hall, Benford Yasası vb.) ile birlikte **Dil Öğrenme (`LanguageLabOverlay`)**.
- **GIF + Etkileşimli Canvas Görsel Motoru (`lib/gifService.ts`, `FullBleedReelsCanvas`, `InteractiveSketchArt`):** Her karttaki `visualQuery` alanından `/api/gif` üzerinden Giphy/Tenor destekli temiz GIF araması; API anahtarı yoksa veya ağ kesilirse sıfır kırık görüntü için Canvas 2D + SVG vektör sahne motoruna otomatik düşüş.
- **Etkileşimli Tahminler & Kavramsal Quizler (`GuessWidget`, `MemoryQuizCard`, `QuizHubModal`):** Her kartta sayısal/ikili tahmin etkileşimi ve neden-nasıl odaklı 3 seçenekli kavramsal quiz; 13 kartlık hafıza kontrol noktaları, XP/seri kazanımı ve Canvas 2D Story/Diploma görsel paylaşımı.
- **Scrolla 1v1 Gerçek Zamanlı Düello (`DuelModal`, `/api/duels`, `/api/duels/[code]`):** Oda koduyla (`duelStore.ts` + Postgres kalıcılığı) iki oyuncunun eşzamanlı soru seti üzerinde yarıştığı 1v1 bilgi düellosu.
- **Postgres Kalıcılığı & Küresel Liderlik Tablosu (`lib/db.ts`, `/api/profile`, `/api/leaderboard`, `/api/events`):** Çoklu cihaz profil senkronizasyonu, XP/seri/rozet kaydı, liderlik sıralaması ve `DATABASE_URL` tanımlı olmadığında yerel JSON (`public/data/facts/*.json`) geri dönüşü.
- **Çok Dilli SEO & GEO:** `/fact/[slug]`, `/en/fact/[slug]`, `/category/[category]`, `/en/category/[category]` ISR sayfaları, karşılıklı `hreflang` etiketleri, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` ve `/opengraph-image`.

---

## English

**Scrolly** is a bilingual (`TR` / `EN`) micro-discovery PWA built with **Next.js 16 (App Router)** and **React 19**. Built for instant zero-signup exploration, it combines a `100dvh` vertical Reels discovery experience, a hybrid **GIF + Canvas 2D** visual engine, **7 curated categories including Statistics**, **Language Lab**, real-time **Scrolla 1v1 Duels**, and PostgreSQL-backed profiles and leaderboards.

### Core MVP Features
- **Explore Feed & Adaptive Reels Stage:** Edge-to-edge `100dvh` snap scrolling with a floating bottom dock on mobile and a dedicated left navigation rail + centered `9:16` stage on desktop/tablet, 5-slide DOM virtualization, and automatic `?fact=<slug>` URL synchronization.
- **7 Curated Categories + Statistics & Language Lab:** Browse `All`, `Space`, `Nature`, `Science`, `History`, `Human Body`, `Weird Records`, and **Statistics** (Birthday Paradox, Survivorship Bias, Monty Hall, Benford's Law, Simpson's Paradox, etc.), plus interactive **Language Lab** vocabulary cards with Web Speech API pronunciation.
- **Hybrid GIF + Interactive Canvas Visual Engine (`lib/gifService.ts`, `/api/gif`):** Looks up clean, family-safe animated GIFs via Giphy/Tenor using each card's concrete English `visualQuery`, with zero-flicker fallback to bespoke procedural Canvas 2D & interactive SVG scenes.
- **Interactive Estimation & Conceptual Quizzes:** Spoiler-protected estimation sliders/binary challenges paired with conceptual 3-option "why/how" quizzes, spaced memory checkpoints, XP streaks, and downloadable Canvas 2D Story & Diploma cards.
- **Scrolla Real-Time 1v1 Duels (`/api/duels`, `/api/duels/[code]`):** Room-code 1v1 trivia duels backed by PostgreSQL (`lib/duelStore.ts`) with synchronized card rounds and instant scoreboards.
- **Postgres Persistence & Leaderboard (`/api/profile`, `/api/leaderboard`, `/api/events`):** Multi-device XP/streak persistence, event telemetry, and automatic graceful fallback to local JSON shards (`public/data/facts/*.json`) when `DATABASE_URL` is not configured.
- **Multilingual SEO & AI Readability (GEO):** ISR-backed pages at `/fact/[slug]`, `/en/fact/[slug]`, `/category/[category]`, `/en/category/[category]` with reciprocal `hreflang` links, `sitemap.xml`, `llms.txt`, `llms-full.txt`, and dynamic OpenGraph images.

---

## Teknoloji Yığını / Tech Stack

| Katman / Layer | Teknoloji / Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, ISR/SSG/SSR), React 19, TypeScript 5.6 |
| Styling & Motion | Tailwind CSS 3.4, Framer Motion 11 |
| Visuals & Audio | Giphy/Tenor GIF API (`/api/gif`), HTML5 Canvas 2D, SVG illustrations, Web Audio & Web Speech API |
| Database & Cache | PostgreSQL (`pg`) with optional `DATABASE_CA_CERT` + JSON fallback & `React.cache()` |
| Automation & CI | GitHub Actions CI (`ci.yml`), daily LLM + reservoir generator (`auto-generate-facts.yml`) |
| Deployment | Heroku (`Procfile`) or any Node.js `22+` host |

---

## Proje Yapısı / Project Structure

```text
scrolly/
├── app/
│   ├── page.tsx                       # SSR entry & Explore Reels experience
│   ├── layout.tsx                     # Root layout, viewport, GTM & metadata
│   ├── sitemap.ts / robots.ts         # Multilingual sitemap (7 categories + facts) & robots
│   ├── llms-full.txt/route.ts         # AI indexing (GEO) endpoint
│   ├── fact/[slug]/page.tsx           # TR fact detail page (ISR)
│   ├── en/fact/[slug]/page.tsx        # EN fact detail page (ISR)
│   ├── category/[category]/page.tsx   # TR category archive (ISR)
│   ├── en/category/[category]/page.tsx# EN category archive (ISR)
│   └── api/                           # `/facts`, `/gif`, `/duels`, `/duels/[code]`, `/profile`, `/leaderboard`, `/events`, `/contact`
├── components/                        # Reels feed, Canvas scenes, Language Lab, Quiz Hub, Scrolla Duel UI, Trust pages
├── data/                              # Vocabulary seed & generated vocabulary JSON
├── i18n/translations.ts               # TR / EN translations
├── lib/                               # Postgres pool (`db.ts`), duels (`duelStore.ts`), GIF service (`gifService.ts`), rate limiting
├── scripts/
│   ├── generateFacts.mjs              # Daily LLM fact + vocabulary generator & Postgres seeder
│   ├── scientificFactReservoir.mjs    # Curated 7-category fallback reservoir & parametric templates
│   └── seedVocabularyFacts.mjs        # Static vocabulary card generator (`data/vocabularyFacts.ts`)
├── public/
│   ├── data/facts/                    # 7 category shards (`space`, `nature`, `human_body`, `history`, `science`, `records`, `statistics`) + `facts.json`
│   ├── assets/                        # Local vector/illustration category assets & favicons
│   ├── sw.js                          # Offline-ready Service Worker
│   └── ads.txt                        # Google AdSense verification
├── supabase/schema.sql                # Postgres schema reference
└── next.config.mjs                    # Headers, redirects & image config
```

---

## Kurulum ve Çalıştırma / Getting Started

### Gereksinimler / Prerequisites
- Node.js `22+` (LTS)
- npm

### Yerel Kurulum / Local Development

```bash
git clone https://github.com/slymn2325/scrolly.git
cd scrolly
npm ci
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın. Uygulama `DATABASE_URL` olmadan da yerel JSON veri setiyle çalışır.

### Doğrulama & Betikler / Verification & Scripts

```bash
# Type check, ESLint & production build
npx tsc --noEmit
npm run lint
npm run build
npm run start

# Fact & vocabulary generation scripts
node scripts/generateFacts.mjs        # Requires DATABASE_URL + AI key (GEMINI_API_KEY / OPENAI_API_KEY / AI_API_KEY)
node scripts/seedVocabularyFacts.mjs  # Regenerates data/vocabularyFacts.ts
```

---

## Ortam Değişkenleri / Environment Variables

Üretim veya yerel tam entegrasyon için `.env.local` (veya Heroku Config Vars / GitHub Secrets) içinde şu değişkenleri tanımlayın:

```env
# PostgreSQL Bağlantısı / Postgres Persistence (Facts, Profiles, Duels, Leaderboard, Events)
DATABASE_URL=postgres://user:password@host:5432/scrolly
DATABASE_CA_CERT=                          # Opsiyonel: Üretim TLS için PEM CA sertifikası

# GIF Görsel Motoru / Animated GIF Engine (opsiyonel — yoksa yerel Canvas 2D sahneleri kullanılır)
GIPHY_API_KEY=                             # Tercih edilen Giphy v1 Search API anahtarı
TENOR_API_KEY=                             # Yedek Tenor v2 Search API anahtarı

# Günlük Otomatik Kart Üretimi / Automated Fact & Vocabulary Generation
GEMINI_API_KEY=                            # Veya OPENAI_API_KEY / AI_API_KEY
OPENAI_API_KEY=
AI_API_KEY=
AI_MODELS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_MODEL_NAME=gemini-4-hydrogen

# Google Tag Manager & AdSense (Consent Mode v2)
NEXT_PUBLIC_GTM_ID=GTM-N746KK52
NEXT_PUBLIC_ADSENSE_SLOT_ID=
NEXT_PUBLIC_ADSENSE_STICKY_SLOT_ID=

# Opsiyonel Harici Liderlik Tablosu / Optional External Leaderboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> **Güvenlik Notu:** `.env` ve `.env*.local` dosyaları `.gitignore` ile hariç tutulmuştur. `DATABASE_URL`, `DATABASE_CA_CERT`, `GIPHY_API_KEY`, `TENOR_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` ve `AI_API_KEY` gibi gizli anahtarları asla `NEXT_PUBLIC_` önekiyle paylaşmayın.

---

## Dağıtım (Heroku) / Deployment (Heroku)

Depo kökündeki `Procfile` (`web: npm run start`) ve `package.json` (`"start": "next start -p $PORT"`) Heroku ile doğrudan uyumludur:

```bash
heroku create your-scrolly-app
heroku config:set DATABASE_URL="..." GIPHY_API_KEY="..." GEMINI_API_KEY="..."
git push heroku main
```

---

## Lisans / License

Bu proje [MIT Lisansı](./LICENSE) altında lisanslanmıştır.
