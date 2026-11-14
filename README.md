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

**Scrolly**, kullanıcıların kayıt olmadan tek saniyede giriş yapabildiği; Türkçe (`TR`) ve İngilizce (`EN`) dil desteği sunan, TikTok/Reels akıcılığında tam ekran dikey keşif akışı, kategori seçici, **Dil Öğrenme (Language Lab)** modu, akıllı 5 kartlık DOM sanallaştırma ve çevrimdışı PWA desteği sunan mikro öğrenme web uygulamasıdır.

### Öne Çıkan Özellikler
- **Tam Ekran Dikey Keşif Akışı (`TikTokFeed` & `TikTokFactSlide`):** Kenardan kenara `100dvh` Reels sahneleri, masaüstü/tablette ortalanmış `9:16` sahne + ortam bulanıklığı, `activeIndex ± 2` (5 kart) DOM sanallaştırması ve `?fact=<slug>` senkronizasyonu.
- **Üst Gezinme & Kategori Seçici:** Üst HUD üzerindeki **"Tümü (Genel)"** ve **"Kategori Seç ▾"** çekmecesi ile anında kategori filtreleme (`Uzay`, `Doğa`, `Bilim`, `Tarih`, `İnsan Vücudu`, `Garip Rekorlar`, `Dil Öğrenme`).
- **Etkileşimli Dil Öğrenme Modu (`LanguageLabOverlay`):** Hem **Dil Öğrenme** filtresinde hem de her kartın sağ rayındaki **TR/EN Öğren** butonuyla açılan iki dilli hizalama, etkileşimli kelime rozetleri, **Web Speech API** telaffuz dinleme (`en-US`/`tr-TR`), kelime defteri (`localStorage`) ve 3 seçenekli boşluk doldurma etkileşimi.
- **Akıllı Etkileşim & İnteraktif Diyagramlar (`GuessWidget`, `InteractiveSketchArt`):** Spoiler korumalı tahmin slider'ı, çift dokunuşla beğeni patlaması, alttan açılan Bilimsel Açıklama/Kaynak paneli (Bottom Sheet) ve Web Audio + titreşim (haptics) geri bildirimi.
- **Sadeleştirilmiş 3 Sekmeli Dock (`IosFloatingIslandDock`):** `Keşfet`, `Quiz` ve `Profil/Seri` sekmeleriyle hızlı erişim, 13 kartta bir gelen Hafıza Quizi, Liderlik/Başarı Diploması ve Story görsel üreticisi (`storyCanvasGenerator.ts`, `diplomaCanvasGenerator.ts`).
- **Çok Dilli Programatik SEO & GEO:** Postgres + JSON destekli ISR sayfaları (`/fact/[slug]`, `/en/fact/[slug]`, `/category/[category]`, `/en/category/[category]`), karşılıklı `hreflang` bağlantıları, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` ve `/opengraph-image`.
- **AdSense, Consent Mode v2 & API Güvenliği:** `/ads.txt`, GTM + Google Consent Mode v2 (`Kabul Et` / `Reddet`), IP tabanlı hız sınırlaması (`lib/rateLimit.ts`), sunucu tarafında doğrulanan XP/beğeni telemetrisi ve iletişim formu honeypot koruması.

---

## English

**Scrolly** is a bilingual (`TR` / `EN`), motion-first micro-discovery PWA built with Next.js 16 (App Router) and React 19. Designed for instant exploration with zero sign-up required, it features a full-screen `100dvh` Reels discovery feed, an interactive **Choose Category** drawer, an interactive **Language Lab** bilingual learning overlay, smart DOM virtualization, and offline-ready PWA capabilities.

### Key Features
- **Full-Screen Vertical Reels Feed:** `100dvh` snap-scrolling scenes with a centered `9:16` stage on tablet/desktop, ambient color backdrop, 5-slide DOM virtualization (`activeIndex ± 2`), and automatic `?fact=<slug>` URL syncing.
- **Category Selector & Round-Robin Discovery:** Switch seamlessly between `All (Genel)`, `Space`, `Nature`, `Science`, `History`, `Human Body`, `Weird Records`, and `Language Lab`.
- **Interactive Language Lab (`LanguageLabOverlay`):** Aligned EN/TR study view accessible per card or via the Language Lab filter, featuring interactive vocabulary chips, **Web Speech API** pronunciation (`en-US` / `tr-TR`), personal wordbook saving (`localStorage`), and a 3-choice fill-in-the-blank challenge.
- **Spoiler-Protected Guess Widget & Tactile Micro-Interactions:** Wide touch slider with reveal feedback, double-tap burst likes, Bottom Sheet source/explanation panel, Web Audio synth sound effects, and haptic feedback.
- **Streamlined 3-Tab Floating Dock (`IosFloatingIslandDock`):** Clean `Discover`, `Quiz`, and `Profile/Streak` navigation, spaced memory checkpoints, downloadable Canvas 2D Story & Diploma generators.
- **Multilingual SEO & AI Readability (GEO):** ISR-backed pages at `/fact/[slug]`, `/en/fact/[slug]`, `/category/[category]`, `/en/category/[category]` with reciprocal `hreflang` tags, `sitemap.xml`, `llms.txt`, `llms-full.txt`, and dynamic OpenGraph images.
- **Privacy, Consent Mode v2 & API Hardening:** Default-denied Consent Mode v2 until user action (`Accept` / `Decline`), slot-guarded AdSense integration, IP rate limiting, deduplicated Postgres likes/telemetry, and honeypot-protected contact submissions.

---

## Teknoloji Yığını / Tech Stack

| Katman / Layer | Teknoloji / Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, ISR/SSG/SSR), React 19, TypeScript 5.6 |
| Styling & Motion | Tailwind CSS 3.4, Framer Motion 11 |
| Icons & Assets | Lucide React, Local `3d-fluency` PNGs & custom interactive SVGs |
| Audio & Graphics | Web Audio API, Web Speech API (`speechSynthesis`), HTML5 Canvas 2D |
| Database & Cache | PostgreSQL (`pg`) with optional `DATABASE_CA_CERT` + JSON fallback & `React.cache()` |
| Automation & CI | GitHub Actions CI (`ci.yml`), OpenAI-compatible fact generator (`auto-generate-facts.yml`) |
| Deployment | Heroku (`Procfile`) or any Node.js `22+` host |

---

## Proje Yapısı / Project Structure

```text
scrolly/
├── app/
│   ├── page.tsx                       # SSR giriş katmanı + tam ekran Reels akışı
│   ├── layout.tsx                     # Root layout, viewport ve metadata
│   ├── not-found.tsx / error.tsx      # Markalı 404 ve hata kurtarma ekranları
│   ├── manifest.ts                    # PWA Web App Manifest
│   ├── robots.ts / sitemap.ts         # Arama motoru tarama ve çok dilli sitemap
│   ├── llms-full.txt/route.ts         # Yapay zekâ dizinleme (GEO) metin uç noktası
│   ├── fact/[slug]/page.tsx           # Türkçe bilgi detay sayfası (ISR)
│   ├── en/fact/[slug]/page.tsx        # İngilizce bilgi detay sayfası (ISR)
│   ├── category/[category]/page.tsx   # Türkçe kategori arşivi (ISR)
│   ├── en/category/[category]/page.tsx# İngilizce kategori arşivi (ISR)
│   └── api/                           # `/api/facts`, `/api/events`, `/api/contact`
├── components/                        # Reels akışı, Dil Öğrenme, Tahmin, Quiz, Reklam & Güven sayfaları
├── i18n/translations.ts               # TR / EN çeviri sözlüğü
├── lib/                               # Postgres havuzu (`db.ts`), hız sınırlama (`rateLimit.ts`), yardımcılar
├── scripts/                           # Yapay zekâ tabanlı kart üretim ve doğrulama betikleri
├── public/
│   ├── data/facts/                    # 6 kategori + birleşik JSON bilgi veri setleri
│   ├── assets/                        # Yerel 3B ikon ve sahne görselleri
│   ├── sw.js                          # Ağ/önbellek stratejili Service Worker
│   └── ads.txt                        # Google AdSense doğrulama dosyası
├── supabase/schema.sql                # Postgres tablo şeması (`facts`, `events`, `contact_messages`, `fact_likes`)
└── eslint.config.mjs                  # ESLint flat yapılandırması
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

Tarayıcıda `http://localhost:3000` adresini açın. (Mobil tam ekran deneyimini test etmek için Geliştirici Araçları'ndan `390×844` mobil görünümü seçebilirsiniz.)

### Doğrulama & Derleme / Verification & Build

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run start
```

---

## Ortam Değişkenleri / Environment Variables

Uygulama `DATABASE_URL` olmadan da yerel JSON veri setiyle çalışır; Postgres ve harici servis entegrasyonları için `.env.local` (veya Heroku Config Vars / GitHub Secrets) içinde aşağıdaki değişkenleri tanımlayabilirsiniz:

```env
# PostgreSQL Bağlantısı / Postgres Database
DATABASE_URL=postgres://user:password@host:5432/scrolly
DATABASE_CA_CERT=                          # Opsiyonel: Üretim Postgres sunucusu için PEM CA sertifikası (reddedilmeyen TLS doğrulama)

# Günlük Otomatik Kart Üretimi (scripts/generateFacts.mjs & GitHub Actions)
OPENAI_API_KEY=                            # Veya AI_API_KEY / GEMINI_API_KEY
AI_API_KEY=                                # Alternatif API anahtarı (OPENAI_API_KEY yerine kullanılabilir)
GEMINI_API_KEY=                            # Google Gemini OpenAI-uyumlu uç nokta için alternatif anahtar
AI_MODELS_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_MODEL_NAME=gemini-4-hydrogen

# Google Tag Manager & AdSense (Consent Mode v2 uyumlu)
NEXT_PUBLIC_GTM_ID=GTM-N746KK52
NEXT_PUBLIC_ADSENSE_SLOT_ID=               # Akış içi doğal reklam slot ID
NEXT_PUBLIC_ADSENSE_STICKY_SLOT_ID=        # Alt sabit reklam bandı slot ID (tanımsızsa bant gizlenir)

# Opsiyonel: Supabase Global Liderlik Tablosu
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Not:** `.env` ve `.env*.local` dosyaları `.gitignore` ile hariç tutulmuştur; gizli anahtarları (`DATABASE_URL`, `DATABASE_CA_CERT`, `OPENAI_API_KEY`, `AI_API_KEY`, `GEMINI_API_KEY`) asla `NEXT_PUBLIC_*` önekli istemci değişkenlerine koymayın.

---

## Dağıtım (Heroku) / Deployment (Heroku)

Depo kökündeki `Procfile` ve `package.json` (`"start": "next start -p $PORT"`) Heroku ile doğrudan uyumludur:

```bash
heroku create your-scrolly-app
git push heroku main
```

Ortam değişkenlerini Heroku Config Vars üzerinden (`heroku config:set ...`) ekleyebilirsiniz.

---

## Lisans / License

Bu proje [MIT Lisansı](./LICENSE) altında lisanslanmıştır.
