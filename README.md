# Scrolly

[Scrolly](https://scrolly.live) dikey akışta kısa bilgi kartları sunar. Marka adı Scrolly'dir. Site Türkçe açılır. İngilizce kartlar `/en/fact/...`, kategoriler `/en/category/...` altındadır.

## Yerel çalıştırma

CI Node.js 22 kullanır.

```bash
npm ci
npm run dev
npm run lint
npm run build
```

`npm run dev` uygulamayı `http://localhost:3000` adresinde açar. `lint` ve `build`, `.github/workflows/ci.yml` içinde de çalışır.

## Ortam değişkenleri

Yalnızca adlar. Değerleri repoya koymayın. Yerelde `.env.local` kullanın; bu dosya git'e girmez.

**Site**

- `DATABASE_URL` — canlı kart, kelime, profil ve düello verisi. Tanımsızsa uygulama `public/data/facts` altındaki seed JSON ile açılır.
- `AUTH_SECRET` — üretimde oturum ve OTP. Geliştirmede boşsa yerel bir pepper kullanılır.
- `GIPHY_API_KEY` — sitedeki GIF araması (`/api/gif`). Anahtar yoksa bu kaynak atlanır.

**Kart üretimi**

- `DATABASE_URL` — yoksa `npm run generate-facts` çıkar.
- `GEMINI_API_KEY` — kart metni. Betik bu ad boşsa `AI_API_KEY` veya `OPENAI_API_KEY` ile de devam eder; hiçbiri yoksa çıkar.
- `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `GIPHY_API_KEY` — medya araması. Eksik anahtar o kaynağı atlar.

**Posta**

- `RESEND_API_KEY` — üretimde e-posta gönderimi. Yoksa üretimde gönderim olmaz; geliştirmede önizleme yeterlidir.
- `EMAIL_FROM` — gönderen adres. Boşsa `Scrolly <no-reply@scrolly.live>`.
- `CONTACT_RECEIVER_EMAIL` — iletişim kutusu. Boşsa `contact@scrolly.live`.

## Kart üretimi

```bash
npm run generate-facts
```

Heroku Scheduler bu komutu çalıştırır. Yeni kartlar Postgres'e yazılır. Üretim çıktısı repoya JSON olarak girmez. Repodaki JSON dosyaları boş veritabanı için tohumdur.

Medya sırası: Pexels video, Pixabay video, Giphy, Pexels fotoğraf, Wikimedia Commons. Wikimedia anahtar istemez.

## Lisans

[MIT](./LICENSE)
