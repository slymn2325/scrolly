<div align="center">

# Scrolly

**Tek Saniyede Mikro Keşif Platformu · One-Second Micro-Discovery Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=flat-square)](https://scrolly.live)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](./LICENSE)

[Canlı Demo / Live Site (scrolly.live)](https://scrolly.live) · [Gizlilik Politikası / Privacy Policy](https://scrolly.live/privacy)

</div>

---

## Türkçe

**Scrolly**, kullanıcıların kayıt olmadan tek saniyede giriş yapabildiği; Türkçe (`TR`) ve İngilizce (`EN`) dil desteği sunan, TikTok/Reels akıcılığında tam ekran dikey keşif akışı, 3B kart çevirme, iOS Liquid Glass yüzen ada menüsü, süreli hafıza quizleri, 1v1 düello linkleri ve çevrimdışı (Offline PWA) desteği sunan hareket odaklı bir mikro öğrenme web uygulamasıdır.

### Öne Çıkan Özellikler
- **Tam Ekran Dikey Keşif Akışı (`TikTokFeed` & `TikTokFactSlide`):** Kenardan kenara `100dvh` sahneler, kategoriye özel canlı motion grafik arka planlar ve Icons8 `3d-fluency` yerel görsel varlıkları.
- **3B Kart Çevirme & Çift Dokunuşla Beğeni:** Tek dokunuşla kartın arkasına dönerek derinlemesine açıklamaya geçiş, çift dokunuşta dokunulan noktada kalp patlaması ve Web Audio + titreşim (haptics) geri bildirimi.
- **İnteraktif "Tahmin Et" Mikro Etkileşimi (`GuessWidget`):** Kartı çevirmeden önce kaydırıcı (slider) veya ikili seçim ile tahminde bulunarak anlık geri bildirim ve bonus XP kazanma.
- **iOS Şeffaf Ada Menüsü (`IosFloatingIslandDock`):** Arkadan kayan bilgi sahnelerini canlı biçimde bulanıklaştıran 5 sekmeli (`Liderlik`, `Quiz`, `Keşfet`, `Düello`, `Diploma`) Liquid Glass alt navigasyon barı.
- **Hafıza Quizi, Liderlik & 1v1 Düello:** Son okunan kartlardan anında quiz, 60 saniyelik hızlı sprint modu, lig rozetleri (Bronz → Elmas) ve URL kodlu 1v1 arkadaş düellosu (`DuelModal` / `duelCodec.ts`). Opsiyonel Supabase senkronizasyonu ve tam çevrimdışı yerel yedek desteği.
- **9:16 Story & Başarı Diploması Üreticisi:** İnternet bağlantısı olmadan da çalışan saf HTML5 `<canvas>` tabanlı `1080×1920` Story görseli (`storyCanvasGenerator.ts`), interaktif **Konu Takımyıldızı** (`TopicConstellation`) ve indirilebilir Başarı Diploması (`diplomaCanvasGenerator.ts`).
- **Offline-First PWA & Programatik SEO:** `public/sw.js` servis çalışanı ile önbelleğe alınan bilgi JSON'ları ve varlıklar; Türkçe (`/bilgi/[slug]`) ve İngilizce (`/en/fact/[slug]`) statik SEO bilgi sayfaları.
- **AdSense & Gizlilik Desteği:** `/ads.txt` doğrulaması, akış içi doğal/ödüllü reklam desteği (`NativeAdSlide`, `RewardedAdModal`) ve iki dilli `/privacy` sayfası.

---

## English

**Scrolly** is a bilingual (`TR` / `EN`), motion-first micro-discovery PWA built with Next.js App Router. Designed for instant exploration with zero sign-up required, it combines a full-bleed vertical discovery feed, 3D card flips, an iOS Liquid Glass floating dock, interactive prediction widgets, timed memory quizzes, shareable 1v1 duels, and offline HTML5 Canvas Story/Diploma generation.

### Key Features
- **Full-Bleed Vertical Discovery Feed:** Edge-to-edge `100dvh` scenes with category-themed animated motion backgrounds and local Icons8 `3d-fluency` iconography and illustrations.
- **3D Flip & Double-Tap Like:** Single tap to flip into deep-dive explanations; double tap anywhere on a slide for a burst animation accompanied by synthesized Web Audio sound effects (`soundEngine.ts`) and tactile haptics.
- **Interactive "Guess First" Widget (`GuessWidget`):** Predict numerical or binary answers before revealing the card to earn bonus XP.
- **iOS Liquid Glass Floating Island Dock (`IosFloatingIslandDock`):** Translucent 5-tab navigation dock (`Leaderboard`, `Quiz`, `Explore`, `Duel`, `Diploma`) blurring live feed content underneath.
- **Quizzes, Leagues & 1v1 Duels:** Instant memory quizzes from recently viewed facts, 60-second sprint challenges, progression leagues (`Bronze` to `Diamond`), and URL-encoded 1v1 challenge links (`duelCodec.ts`), backed by optional Supabase RPCs (`supabase/schema.sql`) with local fallback.
- **Offline HTML5 Canvas Generators:** Generate `1080×1920` (9:16) shareable Story cards (`storyCanvasGenerator.ts`) and downloadable Achievement Diplomas (`diplomaCanvasGenerator.ts`) plus an interactive Topic Constellation (`TopicConstellation.tsx`) completely client-side.
- **Offline-First PWA & Programmatic SEO:** Standalone installable PWA (`app/manifest.ts`, `public/sw.js`) with precached JSON datasets across 6 knowledge categories and static/SSG routes at `/bilgi/[slug]` (TR) and `/en/fact/[slug]` (EN).
- **AdSense & Privacy Ready:** Direct `public/ads.txt` serving (bypassing Service Worker cache), configurable native/rewarded ad slots (`NativeAdSlide.tsx`), and a bilingual Privacy & Cookie Policy at `/privacy`.

---

## Teknoloji Yığını / Tech Stack

| Katman / Layer | Teknoloji / Technology |
| --- | --- |
| Framework | Next.js 14 (App Router, SSG/SSR), React 18, TypeScript 5 |
| Styling & Motion | Tailwind CSS 3, Framer Motion 11 |
| Icons & Assets | Lucide React, Local Icons8 `3d-fluency` PNGs, Canvas Confetti |
| Audio & Graphics | Web Audio API (synthesized SFX), HTML5 Canvas 2D |
| Offline & PWA | Custom Service Worker (`public/sw.js`), Web App Manifest (`app/manifest.ts`) |
| Backend (Optional) | Supabase PostgreSQL (`supabase/schema.sql`) with `localStorage` fallback |
| Deployment | Heroku (`Procfile`) or any Node.js host |

---

## Proje Yapısı / Project Structure

```text
scrolly/
├── app/
│   ├── page.tsx                  # Ana tam ekran dikey keşif uygulaması
│   ├── layout.tsx                # Root layout, metadata, AdSense & tema desteği
│   ├── manifest.ts               # PWA Web App Manifest
│   ├── bilgi/[slug]/page.tsx     # Türkçe programatik SEO sayfaları
│   ├── en/fact/[slug]/page.tsx   # İngilizce programatik SEO sayfaları
│   └── privacy/page.tsx          # İki dilli Gizlilik ve Çerez Politikası (/privacy)
├── components/                   # Feed, 3D kartlar, Liquid Glass Dock, Quiz, Düello, Diploma ve Reklam bileşenleri
├── i18n/translations.ts          # TR / EN çeviri sözlüğü ve otomatik dil algılama
├── public/
│   ├── data/facts/               # 6 kategori + birleşik JSON bilgi veri setleri
│   ├── assets/icons8/            # Yerel Icons8 3d-fluency ikonları ve illüstrasyonları
│   ├── sw.js                     # Offline-first Service Worker
│   └── ads.txt                   # Google AdSense doğrulama dosyası
├── supabase/schema.sql           # Opsiyonel liderlik tablosu şeması ve RPC fonksiyonları
├── utils/                        # Canvas üreticileri, ses motoru, düello kodlayıcı, hafıza/öneri motoru
└── Procfile                      # Heroku web process tanımı (`web: npm run start`)
```

---

## Kurulum ve Çalıştırma / Getting Started

### Gereksinimler / Prerequisites
- Node.js `18+` (önerilen: `20+` LTS)
- npm

### Yerel Kurulum / Local Development

```bash
git clone https://github.com/slymn2325/scrolly.git
cd scrolly
npm install
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın. (Mobil tam ekran deneyimini test etmek için Geliştirici Araçları'ndan `390×844` mobil görünümü seçmeniz önerilir.)

### Derleme / Production Build

```bash
npm run build
npm run start
```

---

## Ortam Değişkenleri (Opsiyonel) / Environment Variables (Optional)

Uygulama hiçbir ortam değişkeni olmadan varsayılan çevrimdışı/yerel modda eksiksiz çalışır. İsteğe bağlı olarak kök dizinde `.env.local` oluşturabilirsiniz:

```env
# Opsiyonel: Canlı Global Liderlik Tablosu (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Opsiyonel: Google AdSense Akış İçi Reklam Slot ID
NEXT_PUBLIC_ADSENSE_SLOT_ID=1234567890
```

> **Not:** `.env` ve `.env*.local` dosyaları `.gitignore` ile hariç tutulmuştur; gizli anahtarları veya sunucu taraflı `service_role` anahtarlarını asla istemci tarafına eklemeyin.

---

## Dağıtım (Heroku) / Deployment (Heroku)

Depo kökündeki `Procfile` ve `package.json` (`"start": "next start -p $PORT"`) Heroku ile doğrudan uyumludur:

```bash
heroku create your-scrolly-app
git push heroku main
```

İsteğe bağlı ortam değişkenlerini Heroku Config Vars üzerinden (`heroku config:set ...`) ekleyebilirsiniz.

---

## Lisans / License

Bu proje [MIT Lisansı](./LICENSE) altında lisanslanmıştır.
