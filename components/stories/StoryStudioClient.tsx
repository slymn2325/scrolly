'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Moon,
  Plus,
  Rocket,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import ScrollyStoryPlayer from '@/components/stories/ScrollyStoryPlayer';
import {
  STORY_ACCENT_PRESETS,
  type StoryCardItem,
  type StoryLanguage,
  type StoryTheme,
} from '@/types/story';
import { copyTextToClipboard } from '@/utils/clipboard';

const INITIAL_SAMPLE_CARDS: Record<StoryLanguage, StoryCardItem[]> = {
  tr: [
    {
      id: 'sample-1',
      headline: 'Venüs’te Bir Gün, Bir Yıldan Uzundur',
      body: 'Venüs kendi ekseni etrafında ters yönde o kadar yavaş döner ki Güneş etrafındaki bir tam turu (225 gün) kendi gününden (243 Dünya günü) daha kısa sürer.',
      question: 'Hızlı Tahmin: Venüs’ün kendi ekseni etrafında dönmesi kaç Dünya günü sürer?',
      options: ['243 Dünya günü', '24 saat', '88 Dünya günü'],
      correctIndex: 0,
      sourceLabel: 'NASA Solar System',
      mediaUrl: '',
    },
    {
      id: 'sample-2',
      headline: 'Okyanuslar Yeryüzü Oksijeninin Yarısından Fazlasını Üretir',
      body: 'Mikroskobik fitoplanktonlar, kelp ormanları ve deniz bakterileri fotosentez yaparak soluduğumuz oksijenin yaklaşık %50–80’ini üretir.',
      question: 'Hızlı Tahmin: Dünya atmosferindeki oksijenin ana denizel kaynağı nedir?',
      options: ['Mercan kayalıkları', 'Fitoplanktonlar', 'Derin deniz bacaları'],
      correctIndex: 1,
      sourceLabel: 'NOAA Ocean Service',
      mediaUrl: '',
    },
  ],
  en: [
    {
      id: 'sample-1',
      headline: 'A Day on Venus Lasts Longer Than Its Year',
      body: 'Venus spins backward on its axis so slowly that one full rotation takes 243 Earth days, while orbiting the Sun takes 225 Earth days.',
      question: 'Quick Guess: Roughly how many Earth days is one rotation of Venus?',
      options: ['243 Earth days', '24 hours', '88 Earth days'],
      correctIndex: 0,
      sourceLabel: 'NASA Solar System',
      mediaUrl: '',
    },
    {
      id: 'sample-2',
      headline: 'Ocean Plankton Supply Over Half of Earth’s Oxygen',
      body: 'Photosynthetic phytoplankton drifting in sunlit surface waters generate an estimated 50% to 80% of global oxygen production.',
      question: 'Quick Guess: Which ocean organisms produce most of our oxygen?',
      options: ['Deep sea vents', 'Phytoplankton', 'Coral reefs'],
      correctIndex: 1,
      sourceLabel: 'NOAA Ocean Service',
      mediaUrl: '',
    },
  ],
};

function makeEmptyCard(lang: StoryLanguage, idx: number): StoryCardItem {
  return {
    id: `card-${Date.now()}-${idx}`,
    headline: lang === 'tr' ? `Yeni Kart ${idx + 1}` : `New Card ${idx + 1}`,
    body:
      lang === 'tr'
        ? 'Buraya kısa, net ve birincil kaynaklı mikro bilgi özetini yazın.'
        : 'Write a crisp, verified micro-learning takeaway here.',
    question:
      lang === 'tr'
        ? 'Hızlı Tahmin: Okuyucuyu düşündüren bir soru ekleyin?'
        : 'Quick Guess: Add a question that checks comprehension?',
    options:
      lang === 'tr'
        ? ['Doğru Seçenek', 'Çeldirici 1', 'Çeldirici 2']
        : ['Correct Answer', 'Distractor 1', 'Distractor 2'],
    correctIndex: 0,
    sourceLabel: 'Scrolly Studio',
    mediaUrl: '',
  };
}

export default function StoryStudioClient() {
  const [language, setLanguage] = useState<StoryLanguage>('tr');
  const [inputType, setInputType] = useState<'url' | 'text'>('text');
  const [inputContent, setInputContent] = useState('');
  const [cardCount, setCardCount] = useState<number>(5);
  const [title, setTitle] = useState<string>('Kozmik Zaman & Okyanuslar');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [theme, setTheme] = useState<StoryTheme>({
    mode: 'dark',
    accent: STORY_ACCENT_PRESETS[0].hex,
  });
  const [cards, setCards] = useState<StoryCardItem[]>(INITIAL_SAMPLE_CARDS.tr);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] = useState<{
    id: string;
    embedUrl: string;
    iframeCode: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'iframe' | 'url' | null>(null);

  const isTr = language === 'tr';

  const handleLanguageSwitch = (nextLang: StoryLanguage) => {
    setLanguage(nextLang);
    if (
      cards.length === 2 &&
      cards[0]?.id === 'sample-1' &&
      cards[1]?.id === 'sample-2'
    ) {
      setCards(INITIAL_SAMPLE_CARDS[nextLang]);
      setTitle(
        nextLang === 'tr'
          ? 'Kozmik Zaman & Okyanuslar'
          : 'Cosmic Time & Ocean Biology'
      );
    }
  };

  const handleFillSample = () => {
    setInputType('text');
    setInputContent(
      isTr
        ? 'Venüs kendi ekseni etrafında 243 Dünya gününde dönerken Güneş çevresindeki yörüngesini 225 günde tamamlar. Nötron yıldızları saniyede 700 defaya kadar dönebilir. Denizel fitoplanktonlar Dünya oksijeninin yaklaşık %50-80 oranındaki kısmını üretir. Antik Roma betonu sönmemiş kireç sayesinde suyla temas ettiğinde çatlaklarını kendi kendine onarabilir. İnsan korneası damarsız tek şeffaf dokudur ve oksijeni doğrudan havadan alır.'
        : 'Venus takes 243 Earth days to rotate once on its axis, making its day longer than its 225-day orbit. Millisecond pulsars can spin up to 700 times per second. Oceanic phytoplankton produce roughly 50 to 80 percent of Earth’s oxygen. Ancient Roman marine concrete self-heals hairline cracks through hot-mixed lime clasts. The human cornea contains no blood vessels and absorbs oxygen directly from air.'
    );
    setErrorMsg(null);
  };

  const handleGenerate = async () => {
    const cleanInput = inputContent.trim();
    if (!cleanInput) {
      setErrorMsg(
        isTr
          ? 'Lütfen bir makale URL’si veya ham metin girin.'
          : 'Please enter a public article URL or paste raw text.'
      );
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/stories/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType,
          content: cleanInput,
          language,
          cardCount,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        mode?: 'llm' | 'structured_fallback';
        draft?: {
          title: string;
          sourceUrl: string | null;
          cards: StoryCardItem[];
        };
      };

      if (!res.ok || !data.ok || !data.draft) {
        setErrorMsg(
          isTr
            ? `Kartlar üretilemedi (${data.error || res.status}).`
            : `Failed to generate cards (${data.error || res.status}).`
        );
        return;
      }

      setTitle(data.draft.title);
      setSourceUrl(data.draft.sourceUrl || '');
      setCards(data.draft.cards);
      setActivePreviewIndex(0);
      setPublishedResult(null);
      setStatusMsg(
        isTr
          ? `${data.draft.cards.length} etkileşimli kart oluşturuldu (${data.mode === 'llm' ? 'AI' : 'Akıllı Çıkarım'}).`
          : `Generated ${data.draft.cards.length} interactive cards (${data.mode === 'llm' ? 'AI' : 'Smart Extract'}).`
      );
    } catch {
      setErrorMsg(
        isTr
          ? 'Bağlantı hatası: kartlar oluşturulamadı.'
          : 'Network error while generating story cards.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || cards.length === 0) {
      setErrorMsg(
        isTr
          ? 'Yayınlamak için başlık ve en az 1 geçerli kart gereklidir.'
          : 'Title and at least 1 valid card are required to publish.'
      );
      return;
    }

    setPublishing(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceUrl: sourceUrl.trim() || null,
          language,
          theme,
          cards,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        id?: string;
        embedUrl?: string;
        iframeCode?: string;
      };

      if (!res.ok || !data.ok || !data.id || !data.embedUrl || !data.iframeCode) {
        setErrorMsg(
          isTr
            ? `Yayınlama başarısız (${data.error || res.status}).`
            : `Publish failed (${data.error || res.status}).`
        );
        return;
      }

      setPublishedResult({
        id: data.id,
        embedUrl: data.embedUrl,
        iframeCode: data.iframeCode,
      });
      setStatusMsg(
        isTr
          ? 'Hikâye yayınlandı! Embed bağlantısı ve <iframe> kodu hazır.'
          : 'Story published! Embed URL and <iframe> code are ready.'
      );
    } catch {
      setErrorMsg(
        isTr ? 'Yayınlama sırasında ağ hatası.' : 'Network error while publishing.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const updateCard = (index: number, patch: Partial<StoryCardItem>) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const updateOption = (cardIndex: number, optIndex: number, value: string) => {
    setCards((prev) =>
      prev.map((card, i) => {
        if (i !== cardIndex) return card;
        const nextOptions = [...card.options];
        nextOptions[optIndex] = value;
        return { ...card, options: nextOptions };
      })
    );
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= cards.length) return;
    setCards((prev) => {
      const copy = [...prev];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
    setActivePreviewIndex(nextIndex);
  };

  const deleteCard = (index: number) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
    setActivePreviewIndex((curr) => Math.max(0, Math.min(curr, cards.length - 2)));
  };

  const addCard = () => {
    if (cards.length >= 12) return;
    const nextIdx = cards.length;
    setCards((prev) => [...prev, makeEmptyCard(language, nextIdx)]);
    setActivePreviewIndex(nextIdx);
  };

  const handleCopy = async (key: 'iframe' | 'url', value: string) => {
    const copied = await copyTextToClipboard(value);
    if (copied) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cik-bg text-cik-text">
      {/* Studio Top Bar */}
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
            <div>
              <h1 className="cik-title-3 flex items-center gap-2 text-cik-text">
                <Sparkles className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                <span>Scrollytelling Studio</span>
              </h1>
              <p className="cik-caption-2 text-cik-text-2">
                {isTr
                  ? 'URL veya metni gömülebilir interaktif karta dönüştür'
                  : 'Turn any URL or text into an embeddable interactive deck'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="scrolly-glass-pill inline-flex rounded-pill bg-cik-surface p-0.5">
              <button
                type="button"
                onClick={() => handleLanguageSwitch('tr')}
                className={`rounded-pill px-3 py-1.5 text-xs font-extrabold transition ${
                  isTr ? 'bg-cik-cta text-cik-on-cta' : 'text-cik-text-2 hover:text-cik-text'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSwitch('en')}
                className={`rounded-pill px-3 py-1.5 text-xs font-extrabold transition ${
                  !isTr ? 'bg-cik-cta text-cik-on-cta' : 'text-cik-text-2 hover:text-cik-text'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              data-testid="studio-publish-btn"
              disabled={publishing || cards.length === 0}
              onClick={handlePublish}
              className="scrolly-tactile inline-flex min-h-10 items-center gap-2 rounded-pill bg-cik-cta px-4 text-xs font-extrabold text-cik-on-cta shadow-sticker disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isTr ? 'Yayınla & Embed Al' : 'Publish & Get Embed'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_430px]">
        {/* Left Panel: Generator + Theme + Card Editor */}
        <div className="space-y-5">
          {errorMsg ? (
            <div
              role="alert"
              className="rounded-2xl border border-cik-rose-text/20 bg-cik-rose px-4 py-3 text-xs font-bold text-cik-rose-text"
            >
              {errorMsg}
            </div>
          ) : null}
          {statusMsg ? (
            <div
              role="status"
              className="rounded-2xl border border-cik-mint-text/20 bg-cik-mint px-4 py-3 text-xs font-bold text-cik-mint-text"
            >
              {statusMsg}
            </div>
          ) : null}

          {/* 1. Source Generator Card */}
          <section className="scrolly-glass-surface space-y-4 rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-pill border border-cik-line bg-cik-surface-2 p-1">
                <button
                  type="button"
                  data-testid="studio-tab-text"
                  onClick={() => setInputType('text')}
                  className={`rounded-pill px-3.5 py-1.5 text-xs font-extrabold transition ${
                    inputType === 'text'
                      ? 'bg-cik-cta text-cik-on-cta'
                      : 'text-cik-text-2 hover:text-cik-text'
                  }`}
                >
                  {isTr ? 'Ham Metin' : 'Paste Text'}
                </button>
                <button
                  type="button"
                  data-testid="studio-tab-url"
                  onClick={() => setInputType('url')}
                  className={`inline-flex items-center gap-1 rounded-pill px-3.5 py-1.5 text-xs font-extrabold transition ${
                    inputType === 'url'
                      ? 'bg-cik-cta text-cik-on-cta'
                      : 'text-cik-text-2 hover:text-cik-text'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isTr ? 'Makale URL’si' : 'Article URL'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="text-xs font-extrabold text-cik-cta underline underline-offset-4"
                >
                  {isTr ? 'Örnek Metin Doldur' : 'Load Sample Text'}
                </button>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-cik-text-2">
                  <span>{isTr ? 'Kart:' : 'Cards:'}</span>
                  <select
                    aria-label={isTr ? 'Kart sayısı' : 'Card count'}
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="rounded-xl border border-cik-line bg-cik-surface px-2 py-1 text-xs font-bold text-cik-text"
                  >
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={7}>7</option>
                  </select>
                </label>
              </div>
            </div>

            {inputType === 'url' ? (
              <input
                type="url"
                data-testid="studio-url-input"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="https://science.nasa.gov/..."
                className="w-full rounded-2xl border border-cik-line bg-cik-bg-elevated px-4 py-3 text-sm font-semibold text-cik-text placeholder:text-cik-text-3"
              />
            ) : (
              <textarea
                rows={4}
                data-testid="studio-text-input"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder={
                  isTr
                    ? 'Makale, ders notu veya araştırma metnini buraya yapıştırın...'
                    : 'Paste your article, research summary, or lecture notes here...'
                }
                className="w-full rounded-2xl border border-cik-line bg-cik-bg-elevated px-4 py-3 text-sm font-semibold text-cik-text placeholder:text-cik-text-3"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="cik-caption-2 text-cik-text-2">
                {isTr
                  ? 'Her kartta otomatik 1 adet Quick Guess pekiştirme sorusu üretilir.'
                  : 'Generates 5–7 micro-cards with 1 Quick Guess question per card.'}
              </p>
              <button
                type="button"
                data-testid="studio-generate-btn"
                disabled={generating}
                onClick={handleGenerate}
                className="scrolly-tactile inline-flex min-h-10 items-center gap-2 rounded-pill bg-cik-text px-5 text-xs font-extrabold text-cik-bg-elevated disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isTr ? 'Generate (Kart Üret)' : 'Generate Deck'}</span>
              </button>
            </div>
          </section>

          {/* 2. Deck Title & Theme Customization */}
          <section className="scrolly-glass-surface space-y-4 rounded-3xl p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="cik-caption-1 block text-cik-text-2">
                  {isTr ? 'Hikâye Başlığı' : 'Story Title'}
                </span>
                <input
                  type="text"
                  data-testid="studio-title-input"
                  value={title}
                  maxLength={140}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3.5 py-2.5 text-sm font-bold text-cik-text"
                />
              </label>
              <label className="space-y-1.5">
                <span className="cik-caption-1 block text-cik-text-2">
                  {isTr ? 'Kaynak URL (Opsiyonel)' : 'Source URL (Optional)'}
                </span>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3.5 py-2.5 text-sm font-semibold text-cik-text"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cik-line pt-3">
              <div className="flex items-center gap-2">
                <span className="cik-caption-1 text-cik-text-2">
                  {isTr ? 'Tema:' : 'Theme:'}
                </span>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => ({ ...prev, mode: 'dark' }))}
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-bold transition ${
                    theme.mode === 'dark'
                      ? 'border-cik-cta bg-cik-pink text-cik-cta'
                      : 'border-cik-line bg-cik-surface text-cik-text-2'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => ({ ...prev, mode: 'light' }))}
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-bold transition ${
                    theme.mode === 'light'
                      ? 'border-cik-cta bg-cik-pink text-cik-cta'
                      : 'border-cik-line bg-cik-surface text-cik-text-2'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Light</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="cik-caption-1 text-cik-text-2">
                  {isTr ? 'Vurgu:' : 'Accent:'}
                </span>
                {STORY_ACCENT_PRESETS.map((preset) => {
                  const selected =
                    theme.accent.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-label={preset.label}
                      title={preset.label}
                      onClick={() =>
                        setTheme((prev) => ({ ...prev, accent: preset.hex }))
                      }
                      style={{ backgroundColor: preset.hex }}
                      className={`h-7 w-7 rounded-pill border-2 transition ${
                        selected
                          ? 'scale-110 border-cik-text ring-2 ring-cik-focus'
                          : 'border-cik-bg-elevated opacity-85 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Card-by-Card Editor */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="cik-headline text-cik-text">
                {isTr
                  ? `Kart Editörü (${cards.length})`
                  : `Card Editor (${cards.length})`}
              </h2>
              <button
                type="button"
                data-testid="studio-add-card-btn"
                disabled={cards.length >= 12}
                onClick={addCard}
                className="scrolly-tactile inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-3.5 text-xs font-extrabold text-cik-cta disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTr ? 'Kart Ekle' : 'Add Card'}</span>
              </button>
            </div>

            {cards.map((card, idx) => {
              const isSelected = idx === activePreviewIndex;
              return (
                <article
                  key={card.id}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`scrolly-glass-surface space-y-3 rounded-3xl p-4 transition ${
                    isSelected ? 'ring-2 ring-cik-cta' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-cik-pink px-2.5 py-0.5 text-xs font-extrabold text-cik-cta">
                      #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={isTr ? 'Yukarı taşı' : 'Move up'}
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCard(idx, -1);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={isTr ? 'Aşağı taşı' : 'Move down'}
                        disabled={idx >= cards.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCard(idx, 1);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-pill border border-cik-line bg-cik-surface-2 text-cik-text disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={isTr ? 'Kartı sil' : 'Delete card'}
                        disabled={cards.length <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(idx);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-pill border border-cik-line bg-cik-rose text-cik-rose-text disabled:opacity-35"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={card.headline}
                    maxLength={140}
                    placeholder={isTr ? 'Kart başlığı' : 'Card headline'}
                    onChange={(e) => updateCard(idx, { headline: e.target.value })}
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-sm font-bold text-cik-text"
                  />

                  <textarea
                    rows={2}
                    value={card.body}
                    maxLength={520}
                    placeholder={isTr ? 'Kısa açıklama metni' : 'Card takeaway text'}
                    onChange={(e) => updateCard(idx, { body: e.target.value })}
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text-2"
                  />

                  <div className="space-y-2 rounded-2xl border border-cik-line bg-cik-surface-2 p-3">
                    <input
                      type="text"
                      value={card.question}
                      maxLength={220}
                      placeholder={isTr ? 'Quick Guess sorusu' : 'Quick Guess question'}
                      onChange={(e) => updateCard(idx, { question: e.target.value })}
                      className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-bold text-cik-text"
                    />

                    <div className="grid gap-1.5">
                      {card.options.map((opt, optIdx) => (
                        <div key={`${card.id}-opt-${optIdx}`} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${card.id}`}
                            aria-label={`${isTr ? 'Doğru şık' : 'Correct option'} ${optIdx + 1}`}
                            checked={card.correctIndex === optIdx}
                            onChange={() => updateCard(idx, { correctIndex: optIdx })}
                            className="h-4 w-4 accent-cik-cta"
                          />
                          <input
                            type="text"
                            value={opt}
                            maxLength={120}
                            onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                            className="flex-1 rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-1.5 text-xs font-semibold text-cik-text"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-2 pt-1 sm:grid-cols-2">
                      <input
                        type="text"
                        value={card.sourceLabel}
                        maxLength={100}
                        placeholder={isTr ? 'Kaynak etiketi' : 'Source label'}
                        onChange={(e) => updateCard(idx, { sourceLabel: e.target.value })}
                        className="rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-1.5 text-xs font-semibold text-cik-text-2"
                      />
                      <input
                        type="url"
                        value={card.mediaUrl}
                        placeholder={
                          isTr ? 'Görsel URL (https:// opsiyonel)' : 'Image URL (https:// optional)'
                        }
                        onChange={(e) => updateCard(idx, { mediaUrl: e.target.value })}
                        className="rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-1.5 text-xs font-semibold text-cik-text-2"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {/* Right Panel: Sticky Phone Preview & Embed Output */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="scrolly-glass-surface rounded-3xl p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="cik-caption-1 text-cik-text-2">
                {isTr ? 'Canlı İnteraktif Önizleme' : 'Live Interactive Preview'}
              </span>
              <span className="cik-caption-2 text-cik-text-3">
                {cards.length} {isTr ? 'kart' : 'cards'}
              </span>
            </div>
            <div className="h-[580px] w-full">
              <ScrollyStoryPlayer
                title={title}
                sourceUrl={sourceUrl || null}
                language={language}
                theme={theme}
                cards={cards}
                activeCardIndex={activePreviewIndex}
                onActiveCardChange={setActivePreviewIndex}
              />
            </div>
          </div>

          {publishedResult ? (
            <div
              data-testid="studio-embed-output"
              className="scrolly-glass-surface space-y-3 rounded-3xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="cik-headline flex items-center gap-1.5 text-cik-text">
                  <Code2 className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                  <span>{isTr ? 'Hazır Embed Kodu' : 'Ready Embed Code'}</span>
                </h3>
                <a
                  href={publishedResult.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-cik-cta underline"
                >
                  <span>{isTr ? 'Önizle' : 'Open'}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-cik-line bg-cik-surface-2 px-3 py-2">
                <input
                  type="text"
                  readOnly
                  aria-label="Embed URL"
                  value={publishedResult.embedUrl}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-cik-text"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('url', publishedResult.embedUrl)}
                  className="inline-flex items-center gap-1 rounded-pill bg-cik-surface px-2.5 py-1 text-[11px] font-bold text-cik-text"
                >
                  {copiedKey === 'url' ? (
                    <Check className="h-3 w-3 text-cik-mint-text" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{copiedKey === 'url' ? (isTr ? 'Kopyalandı' : 'Copied') : 'URL'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={3}
                aria-label="Iframe embed code"
                value={publishedResult.iframeCode}
                className="w-full rounded-xl border border-cik-line bg-cik-surface-2 p-2.5 font-mono text-[11px] text-cik-text-2"
              />

              <button
                type="button"
                data-testid="studio-copy-iframe-btn"
                onClick={() => handleCopy('iframe', publishedResult.iframeCode)}
                className="scrolly-tactile flex min-h-10 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-xs font-extrabold text-cik-on-cta shadow-sticker"
              >
                {copiedKey === 'iframe' ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {copiedKey === 'iframe'
                    ? isTr
                      ? '<iframe> Kodu Kopyalandı!'
                      : 'Copied <iframe> Code!'
                    : isTr
                      ? '<iframe> Kodunu Kopyala'
                      : 'Copy <iframe> Code'}
                </span>
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
