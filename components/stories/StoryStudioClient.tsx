'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlignCenter,
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  Code2,
  Copy,
  CopyPlus,
  ExternalLink,
  FolderKanban,
  Globe,
  HelpCircle,
  ImagePlus,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Wand2,
} from 'lucide-react';
import ScrollyStoryPlayer from '@/components/stories/ScrollyStoryPlayer';
import { logoutSession } from '@/lib/authClient';
import {
  DEFAULT_STORY_THEME,
  getStoryGradientCss,
  LANDING_DEMO_CARDS,
  STORY_ACCENT_PRESETS,
  STORY_GRADIENT_PRESETS,
  type StoryCardItem,
  type StoryFontStyle,
  type StoryLanguage,
  type StoryQuotaSummary,
  type StoryRecord,
  type StorySurfaceStyle,
  type StoryTheme,
} from '@/types/story';
import type { AuthUserDto } from '@/types/auth';
import { copyTextToClipboard } from '@/utils/clipboard';

interface StudioGifChoice {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

type InspectorTab = 'content' | 'media' | 'design' | 'stories';
type MobilePane = 'cards' | 'preview' | 'inspector' | 'stories';

const INITIAL_QUOTA: StoryQuotaSummary = {
  plan: 'starter',
  aiMonthlyLimit: 2,
  aiMonthlyUsed: 0,
  aiMonthlyRemaining: 2,
  activeStoriesLimit: 3,
  activeStoriesCount: 0,
  dailyGlobalRemaining: 50,
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
    gradientId: STORY_GRADIENT_PRESETS[idx % STORY_GRADIENT_PRESETS.length].id,
    quizEnabled: true,
  };
}

interface StoryStudioClientProps {
  user: AuthUserDto;
  initialLanguage?: StoryLanguage;
  onSignedOut?: () => void;
}

export default function StoryStudioClient({
  user,
  initialLanguage = 'tr',
  onSignedOut,
}: StoryStudioClientProps) {
  const [language, setLanguage] = useState<StoryLanguage>(initialLanguage);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [inputType, setInputType] = useState<'url' | 'text'>('text');
  const [inputContent, setInputContent] = useState('');
  const [cardCount, setCardCount] = useState<number>(5);
  const [title, setTitle] = useState<string>(
    initialLanguage === 'tr' ? 'Kozmik Zaman & Okyanuslar' : 'Cosmic Time & Ocean Biology'
  );
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [theme, setTheme] = useState<StoryTheme>({ ...DEFAULT_STORY_THEME });
  const [cards, setCards] = useState<StoryCardItem[]>(
    LANDING_DEMO_CARDS[initialLanguage].slice(0, 2)
  );
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);

  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('content');
  const [mobilePane, setMobilePane] = useState<MobilePane>('cards');
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(true);

  const [quota, setQuota] = useState<StoryQuotaSummary>(INITIAL_QUOTA);
  const [myStories, setMyStories] = useState<StoryRecord[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  const [gifQuery, setGifQuery] = useState<string>('space planet');
  const [gifResults, setGifResults] = useState<StudioGifChoice[]>([]);
  const [gifLoading, setGifLoading] = useState<boolean>(false);

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] = useState<{
    id: string;
    embedUrl: string;
    iframeCode: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isTr = language === 'tr';
  const activeCard = cards[activePreviewIndex] ?? cards[0] ?? null;

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        stories?: StoryRecord[];
        quota?: StoryQuotaSummary;
      };
      if (data.ok) {
        if (Array.isArray(data.stories)) setMyStories(data.stories);
        if (data.quota) setQuota(data.quota);
      }
    } catch {
      // Keep optimistic fallback UI
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const searchStudioGifChoices = useCallback(async (queryText: string) => {
    setGifLoading(true);
    try {
      const params = new URLSearchParams({
        mode: 'studio',
        query: queryText.trim(),
        limit: '8',
      });
      const res = await fetch(`/api/gif?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; gifs?: StudioGifChoice[] };
      if (data.ok && Array.isArray(data.gifs)) {
        setGifResults(data.gifs);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void searchStudioGifChoices('cosmos science');
  }, [loadDashboard, searchStudioGifChoices]);

  const handleLanguageSwitch = (nextLang: StoryLanguage) => {
    setLanguage(nextLang);
    if (!editingStoryId && cards.length === 2 && cards[0]?.id === 'demo-1') {
      setCards(LANDING_DEMO_CARDS[nextLang].slice(0, 2));
      setTitle(
        nextLang === 'tr' ? 'Kozmik Zaman & Okyanuslar' : 'Cosmic Time & Ocean Biology'
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
        messageTr?: string;
        messageEn?: string;
        mode?: 'llm' | 'structured_fallback';
        quota?: StoryQuotaSummary;
        draft?: {
          title: string;
          sourceUrl: string | null;
          cards: StoryCardItem[];
        };
      };

      if (data.quota) {
        setQuota(data.quota);
      }

      if (!res.ok || !data.ok || !data.draft) {
        const friendly = isTr ? data.messageTr : data.messageEn;
        setErrorMsg(
          friendly ||
            (isTr
              ? `Kartlar üretilemedi (${data.error || res.status}).`
              : `Failed to generate cards (${data.error || res.status}).`)
        );
        return;
      }

      setEditingStoryId(null);
      setTitle(data.draft.title);
      setSourceUrl(data.draft.sourceUrl || '');
      setCards(data.draft.cards);
      setActivePreviewIndex(0);
      setPublishedResult(null);
      setStatusMsg(
        isTr
          ? `${data.draft.cards.length} GIF destekli kart oluşturuldu (${data.mode === 'llm' ? 'AI' : 'Akıllı Çıkarım'}).`
          : `Generated ${data.draft.cards.length} GIF-backed cards (${data.mode === 'llm' ? 'AI' : 'Smart Extract'}).`
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
      const targetUrl = editingStoryId
        ? `/api/stories/${encodeURIComponent(editingStoryId)}`
        : '/api/stories';
      const method = editingStoryId ? 'PUT' : 'POST';

      const res = await fetch(targetUrl, {
        method,
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
        quota?: StoryQuotaSummary;
      };

      if (data.quota) {
        setQuota(data.quota);
      }

      if (!res.ok || !data.ok || !data.id || !data.embedUrl || !data.iframeCode) {
        if (data.error === 'story_limit_reached') {
          setErrorMsg(
            isTr
              ? 'Starter plan maksimum 3 yayında hikâye sınırına ulaştın. Hikâyelerim sekmesinden birini silebilir veya mevcut hikâyeni güncelleyebilirsin.'
              : 'Starter limit of 3 active stories reached. Delete an older story in My Stories or edit an existing one.'
          );
          setInspectorTab('stories');
          return;
        }
        setErrorMsg(
          isTr
            ? `Yayınlama başarısız (${data.error || res.status}).`
            : `Publish failed (${data.error || res.status}).`
        );
        return;
      }

      setEditingStoryId(data.id);
      setPublishedResult({
        id: data.id,
        embedUrl: data.embedUrl,
        iframeCode: data.iframeCode,
      });
      setStatusMsg(
        isTr
          ? 'Hikâye yayında! Embed URL ve <iframe> kodu güncellendi.'
          : 'Story saved! Embed URL and <iframe> code are ready.'
      );
      void loadDashboard();
    } catch {
      setErrorMsg(
        isTr ? 'Yayınlama sırasında ağ hatası.' : 'Network error while publishing.'
      );
    } finally {
      setPublishing(false);
    }
  };

  const handleLoadExistingStory = (story: StoryRecord) => {
    setEditingStoryId(story.id);
    setLanguage(story.language);
    setTitle(story.title);
    setSourceUrl(story.sourceUrl || '');
    setTheme({ ...DEFAULT_STORY_THEME, ...story.theme });
    setCards(story.cards);
    setActivePreviewIndex(0);
    setInspectorTab('content');
    setMobilePane('preview');

    const origin =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://scrolly.live';
    const embedUrl = `${origin}/embed/${encodeURIComponent(story.id)}`;
    const safeTitle = story.title.replace(/"/g, '&quot;');
    setPublishedResult({
      id: story.id,
      embedUrl,
      iframeCode: `<iframe src="${embedUrl}" title="${safeTitle}" width="100%" height="640" style="border:0;border-radius:20px;overflow:hidden;max-width:460px;" loading="lazy" allow="clipboard-write" allowfullscreen></iframe>`,
    });
    setErrorMsg(null);
    setStatusMsg(
      isTr
        ? `"${story.title}" düzenleme moduna yüklendi.`
        : `Loaded "${story.title}" for editing.`
    );
  };

  const handleDeleteExistingStory = async (storyId: string) => {
    setDeletingId(storyId);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = (await res.json()) as { ok?: boolean; quota?: StoryQuotaSummary };
      if (data.quota) setQuota(data.quota);
      if (res.ok && data.ok) {
        setMyStories((prev) => prev.filter((s) => s.id !== storyId));
        if (editingStoryId === storyId) {
          setEditingStoryId(null);
          setPublishedResult(null);
        }
        setStatusMsg(isTr ? 'Hikâye silindi.' : 'Story deleted.');
      }
    } catch {
      setErrorMsg(isTr ? 'Silme işlemi başarısız oldu.' : 'Failed to delete story.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetNewDraft = () => {
    setEditingStoryId(null);
    setPublishedResult(null);
    setTitle(isTr ? 'Yeni Etkileşimli Hikâye' : 'New Interactive Story');
    setSourceUrl('');
    setCards([makeEmptyCard(language, 0)]);
    setActivePreviewIndex(0);
    setInspectorTab('content');
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

  const addOptionToActiveCard = (cardIndex: number) => {
    setCards((prev) =>
      prev.map((card, i) => {
        if (i !== cardIndex || card.options.length >= 4) return card;
        return {
          ...card,
          options: [
            ...card.options,
            isTr ? `Seçenek ${card.options.length + 1}` : `Option ${card.options.length + 1}`,
          ],
        };
      })
    );
  };

  const removeOptionFromActiveCard = (cardIndex: number, optIndex: number) => {
    setCards((prev) =>
      prev.map((card, i) => {
        if (i !== cardIndex || card.options.length <= 2) return card;
        const nextOptions = card.options.filter((_, idx) => idx !== optIndex);
        const nextCorrect = Math.min(card.correctIndex, nextOptions.length - 1);
        return { ...card, options: nextOptions, correctIndex: nextCorrect };
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

  const duplicateCard = (index: number) => {
    if (cards.length >= 12) return;
    const source = cards[index];
    if (!source) return;
    const copy: StoryCardItem = {
      ...source,
      id: `card-${Date.now()}-copy`,
      options: [...source.options],
    };
    setCards((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
    setActivePreviewIndex(index + 1);
  };

  const deleteCard = (index: number) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, i) => i !== index));
    setActivePreviewIndex((curr) => Math.max(0, Math.min(curr, cards.length - 2)));
  };

  const addBlankCard = () => {
    if (cards.length >= 12) return;
    const nextIdx = cards.length;
    setCards((prev) => [...prev, makeEmptyCard(language, nextIdx)]);
    setActivePreviewIndex(nextIdx);
    setInspectorTab('content');
  };

  const handleCopy = async (key: string, value: string) => {
    const copied = await copyTextToClipboard(value);
    if (copied) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await logoutSession();
    setSigningOut(false);
    onSignedOut?.();
  };

  return (
    <div className="min-h-[100dvh] bg-cik-bg text-cik-text">
      {/* Studio Top Bar */}
      <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="scrolly-glass-pill scrolly-tactile inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-cik-surface px-3.5 text-xs font-extrabold text-cik-text hover:bg-cik-surface-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? 'Akışa Dön' : 'Feed'}</span>
            </Link>
            <div>
              <h1 className="cik-title-3 flex items-center gap-2 text-cik-text">
                <Sparkles className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                <span>Scrolly Creator Studio</span>
              </h1>
              <p className="cik-caption-2 text-cik-text-2">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              data-testid="studio-quota-pill"
              className="scrolly-glass-pill inline-flex items-center gap-2 rounded-pill bg-cik-surface px-3 py-1.5 text-xs font-extrabold text-cik-text"
            >
              <span className="text-cik-cta">
                {quota.aiMonthlyRemaining}/{quota.aiMonthlyLimit}{' '}
                {isTr ? 'AI Hakkı' : 'AI Left'}
              </span>
              <span className="text-cik-text-3">·</span>
              <span className="text-cik-text-2">
                {quota.activeStoriesCount}/{quota.activeStoriesLimit}{' '}
                {isTr ? 'Yayında' : 'Live'}
              </span>
            </div>

            <div className="scrolly-glass-pill inline-flex rounded-pill bg-cik-surface p-0.5">
              <button
                type="button"
                onClick={() => handleLanguageSwitch('tr')}
                className={`rounded-pill px-2.5 py-1 text-xs font-extrabold transition ${
                  isTr ? 'bg-cik-cta text-cik-on-cta' : 'text-cik-text-2 hover:text-cik-text'
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSwitch('en')}
                className={`rounded-pill px-2.5 py-1 text-xs font-extrabold transition ${
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
              <span>
                {editingStoryId
                  ? isTr
                    ? 'Değişiklikleri Kaydet'
                    : 'Save Changes'
                  : isTr
                    ? 'Yayınla & Embed Al'
                    : 'Publish & Get Embed'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              title={isTr ? 'Çıkış yap' : 'Sign out'}
              aria-label={isTr ? 'Çıkış yap' : 'Sign out'}
              className="scrolly-glass-pill scrolly-tactile flex h-10 w-10 items-center justify-center rounded-pill bg-cik-surface text-cik-text-2 hover:text-cik-text"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile Segmented Switcher */}
        <div className="mx-auto flex max-w-[1440px] gap-1 px-4 pb-2.5 lg:hidden">
          {(
            [
              { id: 'cards', label: isTr ? 'Kartlar' : 'Cards' },
              { id: 'preview', label: isTr ? 'Önizleme' : 'Preview' },
              { id: 'inspector', label: isTr ? 'Tasarım' : 'Design' },
              { id: 'stories', label: isTr ? `Hikâyelerim (${myStories.length})` : `Stories (${myStories.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'stories') {
                  setInspectorTab('stories');
                  setMobilePane('inspector');
                } else {
                  if (tab.id === 'inspector' && inspectorTab === 'stories') {
                    setInspectorTab('content');
                  }
                  setMobilePane(tab.id);
                }
              }}
              className={`flex-1 rounded-pill py-1.5 text-[11px] font-extrabold transition ${
                (tab.id === 'stories' && mobilePane === 'inspector' && inspectorTab === 'stories') ||
                (tab.id !== 'stories' && mobilePane === tab.id && !(mobilePane === 'inspector' && inspectorTab === 'stories'))
                  ? 'bg-cik-cta text-cik-on-cta'
                  : 'border border-cik-line bg-cik-surface text-cik-text-2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6">
        {errorMsg ? (
          <div
            role="alert"
            className="mb-3 rounded-2xl border border-cik-rose-text/20 bg-cik-rose px-4 py-3 text-xs font-bold text-cik-rose-text"
          >
            {errorMsg}
          </div>
        ) : null}
        {statusMsg ? (
          <div
            role="status"
            className="mb-3 rounded-2xl border border-cik-mint-text/20 bg-cik-mint px-4 py-3 text-xs font-bold text-cik-mint-text"
          >
            {statusMsg}
          </div>
        ) : null}
      </div>

      {/* Canva-Style 3-Panel Studio Workspace */}
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[330px_minmax(360px,430px)_minmax(340px,1fr)]">
        {/* LEFT PANEL: AI Generator + Card Deck List */}
        <section
          className={`space-y-4 ${
            mobilePane === 'cards' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Compact AI Source Generator */}
          <div className="scrolly-glass-surface rounded-3xl p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setAiPanelOpen((v) => !v)}
                className="flex items-center gap-2 text-left text-xs font-extrabold text-cik-text"
              >
                <Wand2 className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                <span>{isTr ? 'AI İçerik Oluşturucu' : 'AI Deck Generator'}</span>
              </button>
              <span className="rounded-pill bg-cik-pink px-2 py-0.5 text-[11px] font-extrabold text-cik-cta">
                {quota.aiMonthlyRemaining}/{quota.aiMonthlyLimit}
              </span>
            </div>

            {aiPanelOpen ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex rounded-pill border border-cik-line bg-cik-surface-2 p-0.5">
                    <button
                      type="button"
                      data-testid="studio-tab-text"
                      onClick={() => setInputType('text')}
                      className={`rounded-pill px-2.5 py-1 text-[11px] font-extrabold transition ${
                        inputType === 'text'
                          ? 'bg-cik-cta text-cik-on-cta'
                          : 'text-cik-text-2 hover:text-cik-text'
                      }`}
                    >
                      {isTr ? 'Metin' : 'Text'}
                    </button>
                    <button
                      type="button"
                      data-testid="studio-tab-url"
                      onClick={() => setInputType('url')}
                      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-extrabold transition ${
                        inputType === 'url'
                          ? 'bg-cik-cta text-cik-on-cta'
                          : 'text-cik-text-2 hover:text-cik-text'
                      }`}
                    >
                      <Globe className="h-3 w-3" aria-hidden="true" />
                      <span>URL</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFillSample}
                      className="text-[11px] font-extrabold text-cik-cta underline"
                    >
                      {isTr ? 'Örnek' : 'Sample'}
                    </button>
                    <select
                      aria-label={isTr ? 'Kart sayısı' : 'Card count'}
                      value={cardCount}
                      onChange={(e) => setCardCount(Number(e.target.value))}
                      className="rounded-lg border border-cik-line bg-cik-surface px-1.5 py-1 text-[11px] font-bold text-cik-text"
                    >
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                      <option value={7}>7</option>
                    </select>
                  </div>
                </div>

                {inputType === 'url' ? (
                  <input
                    type="url"
                    data-testid="studio-url-input"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder="https://science.nasa.gov/..."
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text placeholder:text-cik-text-3"
                  />
                ) : (
                  <textarea
                    rows={3}
                    data-testid="studio-text-input"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder={
                      isTr
                        ? 'Makale veya bülten metnini buraya yapıştırın...'
                        : 'Paste article or newsletter text...'
                    }
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text placeholder:text-cik-text-3"
                  />
                )}

                <button
                  type="button"
                  data-testid="studio-generate-btn"
                  disabled={generating || quota.aiMonthlyRemaining <= 0}
                  onClick={handleGenerate}
                  className="scrolly-tactile inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-pill bg-cik-text px-4 text-xs font-extrabold text-cik-bg-elevated disabled:opacity-45"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {quota.aiMonthlyRemaining <= 0
                      ? isTr
                        ? 'Aylık AI Hakkı Doldu (Manuel Devam Et)'
                        : 'Monthly AI Limit Reached'
                      : isTr
                        ? 'AI ile GIF’li Kart Üret (1 Hak)'
                        : 'Generate GIF Deck (1 Credit)'}
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {/* Card Stack Header + Add Blank Card (0 AI cost) */}
          <div className="scrolly-glass-surface space-y-3 rounded-3xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="cik-headline text-cik-text">
                  {isTr ? `Kartlar (${cards.length})` : `Cards (${cards.length})`}
                </h2>
                <p className="cik-caption-2 text-cik-text-2">
                  {isTr ? 'Manuel ekleme ücretsizdir (0 AI)' : 'Manual cards cost 0 AI credits'}
                </p>
              </div>
              <button
                type="button"
                data-testid="studio-add-card-btn"
                disabled={cards.length >= 12}
                onClick={addBlankCard}
                className="scrolly-tactile inline-flex min-h-9 items-center gap-1 rounded-pill border border-cik-line bg-cik-pink px-3 text-xs font-extrabold text-cik-cta disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTr ? 'Boş Kart' : 'Blank Card'}</span>
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-0.5">
              {cards.map((card, idx) => {
                const selected = idx === activePreviewIndex;
                return (
                  <div
                    key={card.id}
                    onClick={() => setActivePreviewIndex(idx)}
                    className={`group flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 transition ${
                      selected
                        ? 'border-cik-cta bg-cik-pink/50'
                        : 'border-cik-line bg-cik-surface-2 hover:bg-cik-surface'
                    }`}
                  >
                    <div
                      style={{ background: getStoryGradientCss(card.gradientId, idx) }}
                      className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xl border border-cik-line"
                    >
                      {card.mediaUrl ? (
                        <img
                          src={card.mediaUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="absolute left-1 top-1 rounded bg-cik-bg/85 px-1 text-[9px] font-extrabold text-cik-text">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-cik-text">
                        {card.headline}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-cik-text-2">
                        {card.mediaUrl
                          ? isTr
                            ? 'GIF / Medya'
                            : 'GIF / Media'
                          : isTr
                            ? 'Degrade'
                            : 'Gradient'}
                        {card.quizEnabled !== false ? ' · Quick Guess' : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={isTr ? 'Yukarı taşı' : 'Move up'}
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCard(idx, -1);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-cik-line bg-cik-surface text-cik-text disabled:opacity-35"
                      >
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={isTr ? 'Aşağı taşı' : 'Move down'}
                        disabled={idx >= cards.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCard(idx, 1);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-cik-line bg-cik-surface text-cik-text disabled:opacity-35"
                      >
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={isTr ? 'Kopyala' : 'Duplicate'}
                        disabled={cards.length >= 12}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateCard(idx);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-cik-line bg-cik-surface text-cik-text disabled:opacity-35"
                      >
                        <CopyPlus className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={isTr ? 'Kartı sil' : 'Delete card'}
                        disabled={cards.length <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(idx);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-cik-line bg-cik-rose text-cik-rose-text disabled:opacity-35"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CENTER PANEL: Live Interactive Phone Stage + Embed Box */}
        <section
          className={`space-y-4 ${
            mobilePane === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="scrolly-glass-surface rounded-[30px] p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="cik-caption-1 text-cik-text-2">
                {isTr ? 'Canlı Embed Önizleme' : 'Live Embed Stage'}
              </span>
              {editingStoryId ? (
                <button
                  type="button"
                  onClick={handleResetNewDraft}
                  className="text-[11px] font-extrabold text-cik-cta underline"
                >
                  {isTr ? '+ Yeni Taslak' : '+ New Draft'}
                </button>
              ) : (
                <span className="cik-caption-2 text-cik-text-3">
                  #{activePreviewIndex + 1} / {cards.length}
                </span>
              )}
            </div>
            <div className="h-[590px] w-full">
              <ScrollyStoryPlayer
                storyId={editingStoryId || undefined}
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
              className="scrolly-glass-surface space-y-2.5 rounded-3xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="cik-headline flex items-center gap-1.5 text-cik-text">
                  <Code2 className="h-4 w-4 text-cik-cta" aria-hidden="true" />
                  <span>{isTr ? 'Hazır <iframe> Kodu' : 'Ready <iframe> Code'}</span>
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
              <textarea
                readOnly
                rows={3}
                value={publishedResult.iframeCode}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated p-2.5 font-mono text-[11px] text-cik-text"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="studio-copy-iframe-btn"
                  onClick={() => handleCopy('iframe', publishedResult.iframeCode)}
                  className="scrolly-tactile inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-pill bg-cik-cta px-3 text-xs font-extrabold text-cik-on-cta"
                >
                  {copiedKey === 'iframe' ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {copiedKey === 'iframe'
                      ? isTr
                        ? 'Kopyalandı'
                        : 'Copied'
                      : isTr
                        ? '<iframe> Kopyala'
                        : 'Copy <iframe>'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('url', publishedResult.embedUrl)}
                  className="scrolly-tactile inline-flex min-h-9 items-center justify-center gap-1.5 rounded-pill border border-cik-line bg-cik-surface px-3 text-xs font-extrabold text-cik-text"
                >
                  {copiedKey === 'url' ? (
                    <Check className="h-3.5 w-3.5 text-cik-mint-text" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>URL</span>
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* RIGHT PANEL: Canva-Style Inspector + My Stories */}
        <aside
          className={`space-y-4 ${
            mobilePane === 'inspector' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="scrolly-glass-surface rounded-3xl p-4">
            {/* Inspector Tabs */}
            <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl border border-cik-line bg-cik-surface-2 p-1">
              {(
                [
                  { id: 'content', icon: Type, label: isTr ? 'İçerik' : 'Content' },
                  { id: 'media', icon: ImagePlus, label: isTr ? 'Medya' : 'Media' },
                  { id: 'design', icon: Palette, label: isTr ? 'Tasarım' : 'Style' },
                  {
                    id: 'stories',
                    icon: FolderKanban,
                    label: isTr ? `Hikâyeler (${myStories.length})` : `Mine (${myStories.length})`,
                  },
                ] as const
              ).map((tab) => {
                const TabIcon = tab.icon;
                const active = inspectorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`studio-inspector-tab-${tab.id}`}
                    onClick={() => setInspectorTab(tab.id)}
                    className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-extrabold transition ${
                      active
                        ? 'bg-cik-cta text-cik-on-cta shadow-e1'
                        : 'text-cik-text-2 hover:text-cik-text'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: CONTENT & QUIZ */}
            {inspectorTab === 'content' && activeCard ? (
              <div className="space-y-4">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="cik-caption-1 block text-cik-text-2">
                      {isTr ? 'Hikâye Başlığı' : 'Deck Title'}
                    </span>
                    <input
                      type="text"
                      data-testid="studio-title-input"
                      value={title}
                      maxLength={140}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-bold text-cik-text"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="cik-caption-1 block text-cik-text-2">
                      {isTr ? 'Kaynak Linki' : 'Source URL'}
                    </span>
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text"
                    />
                  </label>
                </div>

                <div className="space-y-2.5 border-t border-cik-line pt-3">
                  <p className="cik-caption-1 text-cik-cta">
                    {isTr
                      ? `Seçili Kart #${activePreviewIndex + 1}`
                      : `Selected Card #${activePreviewIndex + 1}`}
                  </p>
                  <input
                    type="text"
                    value={activeCard.headline}
                    maxLength={140}
                    placeholder={isTr ? 'Kart başlığı' : 'Card headline'}
                    onChange={(e) =>
                      updateCard(activePreviewIndex, { headline: e.target.value })
                    }
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-sm font-bold text-cik-text"
                  />
                  <textarea
                    rows={3}
                    value={activeCard.body}
                    maxLength={520}
                    placeholder={isTr ? 'Kısa açıklama metni' : 'Takeaway body copy'}
                    onChange={(e) =>
                      updateCard(activePreviewIndex, { body: e.target.value })
                    }
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text-2"
                  />
                  <input
                    type="text"
                    value={activeCard.sourceLabel}
                    maxLength={100}
                    placeholder={isTr ? 'Kaynak etiketi' : 'Source badge label'}
                    onChange={(e) =>
                      updateCard(activePreviewIndex, { sourceLabel: e.target.value })
                    }
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text-2"
                  />
                </div>

                {/* Quick Guess Toggle + Editor */}
                <div className="space-y-2.5 rounded-2xl border border-cik-line bg-cik-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cik-text">
                      <HelpCircle className="h-3.5 w-3.5 text-cik-cta" aria-hidden="true" />
                      <span>Quick Guess</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activeCard.quizEnabled !== false}
                      onClick={() =>
                        updateCard(activePreviewIndex, {
                          quizEnabled: activeCard.quizEnabled === false,
                        })
                      }
                      className={`rounded-pill px-3 py-1 text-[11px] font-extrabold transition ${
                        activeCard.quizEnabled !== false
                          ? 'bg-cik-mint text-cik-mint-text'
                          : 'border border-cik-line bg-cik-surface text-cik-text-2'
                      }`}
                    >
                      {activeCard.quizEnabled !== false
                        ? isTr
                          ? 'Açık'
                          : 'Enabled'
                        : isTr
                          ? 'Kapalı'
                          : 'Hidden'}
                    </button>
                  </div>

                  {activeCard.quizEnabled !== false ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={activeCard.question}
                        maxLength={220}
                        placeholder={isTr ? 'Soru metni' : 'Question text'}
                        onChange={(e) =>
                          updateCard(activePreviewIndex, { question: e.target.value })
                        }
                        className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-bold text-cik-text"
                      />
                      {activeCard.options.map((opt, optIdx) => (
                        <div key={`${activeCard.id}-opt-${optIdx}`} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${activeCard.id}`}
                            aria-label={`${isTr ? 'Doğru şık' : 'Correct'} ${optIdx + 1}`}
                            checked={activeCard.correctIndex === optIdx}
                            onChange={() =>
                              updateCard(activePreviewIndex, { correctIndex: optIdx })
                            }
                            className="h-4 w-4 accent-cik-cta"
                          />
                          <input
                            type="text"
                            value={opt}
                            maxLength={120}
                            onChange={(e) =>
                              updateOption(activePreviewIndex, optIdx, e.target.value)
                            }
                            className="flex-1 rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-1.5 text-xs font-semibold text-cik-text"
                          />
                          {activeCard.options.length > 2 ? (
                            <button
                              type="button"
                              aria-label={isTr ? 'Şıkkı sil' : 'Remove option'}
                              onClick={() =>
                                removeOptionFromActiveCard(activePreviewIndex, optIdx)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-cik-rose-text hover:bg-cik-rose"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {activeCard.options.length < 4 ? (
                        <button
                          type="button"
                          onClick={() => addOptionToActiveCard(activePreviewIndex)}
                          className="text-[11px] font-extrabold text-cik-cta underline"
                        >
                          {isTr ? '+ Şık Ekle' : '+ Add Option'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Optional CTA Button */}
                <div className="space-y-2 rounded-2xl border border-cik-line bg-cik-surface-2 p-3">
                  <p className="cik-caption-1 text-cik-text-2">
                    {isTr ? 'Kart Altı CTA Butonu (Opsiyonel)' : 'Card CTA Button (Optional)'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      maxLength={60}
                      value={activeCard.ctaLabel || ''}
                      onChange={(e) =>
                        updateCard(activePreviewIndex, { ctaLabel: e.target.value })
                      }
                      placeholder={isTr ? 'Örn: Makaleyi Oku' : 'e.g. Read Full Guide'}
                      className="rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-2 text-xs font-semibold text-cik-text"
                    />
                    <input
                      type="url"
                      value={activeCard.ctaUrl || ''}
                      onChange={(e) =>
                        updateCard(activePreviewIndex, { ctaUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="rounded-xl border border-cik-line bg-cik-bg-elevated px-2.5 py-2 text-xs font-semibold text-cik-text"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* TAB 2: MEDIA & GIF PICKER */}
            {inspectorTab === 'media' && activeCard ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="cik-caption-1 text-cik-text-2">
                    {isTr ? 'GIF Ara & Değiştir' : 'Search & Swap GIF'}
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void searchStudioGifChoices(gifQuery);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      data-testid="studio-gif-search-input"
                      value={gifQuery}
                      onChange={(e) => setGifQuery(e.target.value)}
                      placeholder={isTr ? 'Örn: space nebula, brain, ocean...' : 'e.g. space, ocean, science'}
                      className="min-w-0 flex-1 rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text"
                    />
                    <button
                      type="submit"
                      disabled={gifLoading}
                      className="scrolly-tactile inline-flex min-h-9 items-center gap-1 rounded-xl bg-cik-cta px-3 text-xs font-extrabold text-cik-on-cta"
                    >
                      {gifLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{isTr ? 'Ara' : 'Search'}</span>
                    </button>
                  </form>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {gifResults.map((item) => {
                      const activeMedia = activeCard.mediaUrl === item.url;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            updateCard(activePreviewIndex, { mediaUrl: item.url })
                          }
                          className={`group relative h-24 overflow-hidden rounded-xl border text-left transition ${
                            activeMedia
                              ? 'border-cik-cta ring-2 ring-cik-cta'
                              : 'border-cik-line hover:border-cik-cta/60'
                          }`}
                        >
                          <img
                            src={item.previewUrl || item.url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-cik-bg/85 px-2 py-1 text-[10px] font-bold text-cik-text backdrop-blur-sm">
                            {item.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-cik-line pt-3">
                  <div className="flex items-center justify-between">
                    <span className="cik-caption-1 text-cik-text-2">
                      {isTr ? 'Özel Görsel / GIF URL' : 'Custom Media URL (https)'}
                    </span>
                    {activeCard.mediaUrl ? (
                      <button
                        type="button"
                        onClick={() => updateCard(activePreviewIndex, { mediaUrl: '' })}
                        className="text-[11px] font-extrabold text-cik-rose-text underline"
                      >
                        {isTr ? 'Görseli Kaldır' : 'Remove Media'}
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="url"
                    value={activeCard.mediaUrl}
                    onChange={(e) =>
                      updateCard(activePreviewIndex, { mediaUrl: e.target.value })
                    }
                    placeholder="https://media.giphy.com/..."
                    className="w-full rounded-xl border border-cik-line bg-cik-bg-elevated px-3 py-2 text-xs font-semibold text-cik-text"
                  />
                </div>

                <div className="space-y-2 border-t border-cik-line pt-3">
                  <p className="cik-caption-1 text-cik-text-2">
                    {isTr ? 'Premium Arka Plan Degradeleri' : 'Premium Gradient Presets'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {STORY_GRADIENT_PRESETS.map((preset) => {
                      const activeGrad = activeCard.gradientId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            updateCard(activePreviewIndex, { gradientId: preset.id })
                          }
                          style={{ background: preset.css }}
                          className={`relative h-14 rounded-xl border transition ${
                            activeGrad
                              ? 'border-cik-cta ring-2 ring-cik-cta'
                              : 'border-cik-line opacity-90 hover:opacity-100'
                          }`}
                        >
                          <span className="absolute inset-x-1 bottom-1 truncate rounded bg-cik-bg/85 px-1.5 py-0.5 text-[10px] font-extrabold text-cik-text">
                            {isTr ? preset.labelTr : preset.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* TAB 3: CANVA-STYLE DESIGN & THEME */}
            {inspectorTab === 'design' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="cik-caption-1 text-cik-text-2">
                    {isTr ? 'Tema Modu' : 'Color Mode'}
                  </span>
                  <div className="flex items-center gap-2">
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
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-cik-text-2">
                    <span>{isTr ? 'Arka Plan Karartma (Overlay)' : 'Background Overlay'}</span>
                    <span className="font-mono text-cik-cta">
                      %{theme.overlayOpacity ?? 58}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={85}
                    value={theme.overlayOpacity ?? 58}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        overlayOpacity: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-cik-cta"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="cik-caption-1 block text-cik-text-2">
                    {isTr ? 'Kart Yüzeyi' : 'Card Surface'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'glass', label: isTr ? 'Cam (Glass)' : 'Glass' },
                        { id: 'solid', label: isTr ? 'Opak' : 'Solid' },
                        { id: 'editorial', label: isTr ? 'Editöryal' : 'Editorial' },
                      ] as ReadonlyArray<{ id: StorySurfaceStyle; label: string }>
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({ ...prev, surfaceStyle: opt.id }))
                        }
                        className={`rounded-xl border py-2 text-xs font-extrabold transition ${
                          (theme.surfaceStyle ?? 'glass') === opt.id
                            ? 'border-cik-cta bg-cik-pink text-cik-cta'
                            : 'border-cik-line bg-cik-surface text-cik-text-2'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <span className="cik-caption-1 block text-cik-text-2">
                      {isTr ? 'Metin Hizalama' : 'Alignment'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({ ...prev, textAlign: 'left' }))
                        }
                        className={`inline-flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold ${
                          (theme.textAlign ?? 'left') === 'left'
                            ? 'border-cik-cta bg-cik-pink text-cik-cta'
                            : 'border-cik-line bg-cik-surface text-cik-text-2'
                        }`}
                      >
                        <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isTr ? 'Sol' : 'Left'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({ ...prev, textAlign: 'center' }))
                        }
                        className={`inline-flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold ${
                          theme.textAlign === 'center'
                            ? 'border-cik-cta bg-cik-pink text-cik-cta'
                            : 'border-cik-line bg-cik-surface text-cik-text-2'
                        }`}
                      >
                        <AlignCenter className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isTr ? 'Orta' : 'Center'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="cik-caption-1 block text-cik-text-2">
                      {isTr ? 'Yazı Tipi' : 'Typography'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'modern', label: 'Modern' },
                          { id: 'editorial', label: 'Serif' },
                          { id: 'rounded', label: 'Round' },
                        ] as ReadonlyArray<{ id: StoryFontStyle; label: string }>
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            setTheme((prev) => ({ ...prev, fontStyle: f.id }))
                          }
                          className={`rounded-xl border py-2 text-[11px] font-bold ${
                            (theme.fontStyle ?? 'modern') === f.id
                              ? 'border-cik-cta bg-cik-pink text-cik-cta'
                              : 'border-cik-line bg-cik-surface text-cik-text-2'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-cik-line pt-3">
                  <span className="cik-caption-1 block text-cik-text-2">
                    {isTr ? 'Vurgu Rengi' : 'Accent Color'}
                  </span>
                  <div className="flex flex-wrap gap-2">
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
                          className={`h-8 w-8 rounded-pill border-2 transition ${
                            selected
                              ? 'scale-110 border-cik-text ring-2 ring-cik-focus'
                              : 'border-cik-bg-elevated opacity-85 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* TAB 4: MY STORIES DASHBOARD */}
            {inspectorTab === 'stories' ? (
              <div className="space-y-3" data-testid="studio-my-stories-list">
                <div className="flex items-center justify-between">
                  <p className="cik-caption-1 text-cik-text-2">
                    {isTr
                      ? `Yayınlanan Hikâyeler (${myStories.length}/${quota.activeStoriesLimit})`
                      : `Published Stories (${myStories.length}/${quota.activeStoriesLimit})`}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetNewDraft}
                    className="text-xs font-extrabold text-cik-cta underline"
                  >
                    {isTr ? '+ Yeni Oluştur' : '+ Create New'}
                  </button>
                </div>

                {loadingDashboard ? (
                  <div className="flex items-center justify-center py-8 text-xs font-bold text-cik-text-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{isTr ? 'Yükleniyor...' : 'Loading stories...'}</span>
                  </div>
                ) : myStories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-cik-line bg-cik-surface-2 p-5 text-center text-xs font-semibold text-cik-text-2">
                    {isTr
                      ? 'Henüz yayınlanmış hikâyen yok. Sağ üstteki “Yayınla & Embed Al” butonuyla ilk hikâyeni oluştur.'
                      : 'No published stories yet. Hit “Publish & Get Embed” to save your first deck.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myStories.map((story) => {
                      const origin =
                        typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
                      const iframeSnippet = `<iframe src="${origin}/embed/${encodeURIComponent(
                        story.id
                      )}" title="${story.title.replace(/"/g, '&quot;')}" width="100%" height="640" style="border:0;border-radius:20px;overflow:hidden;max-width:460px;" loading="lazy" allow="clipboard-write" allowfullscreen></iframe>`;
                      return (
                        <article
                          key={story.id}
                          className="space-y-2.5 rounded-2xl border border-cik-line bg-cik-surface-2 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-cik-text">
                                {story.title}
                              </p>
                              <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-cik-text-2">
                                <span className="inline-flex items-center gap-1">
                                  <BarChart3 className="h-3 w-3 text-cik-cta" aria-hidden="true" />
                                  {story.viewsCount} {isTr ? 'görüntülenme' : 'views'}
                                </span>
                                <span>·</span>
                                <span>
                                  {story.completionsCount} {isTr ? 'tamamlama' : 'completed'}
                                </span>
                              </p>
                            </div>
                            <span className="rounded-pill bg-cik-surface px-2 py-0.5 font-mono text-[10px] font-bold text-cik-text-2">
                              {story.cards.length} {isTr ? 'kart' : 'cards'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadExistingStory(story)}
                              className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 text-[11px] font-extrabold text-cik-text hover:bg-cik-pink"
                            >
                              <span>{isTr ? 'Düzenle' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(`story-${story.id}`, iframeSnippet)}
                              className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 text-[11px] font-extrabold text-cik-cta"
                            >
                              {copiedKey === `story-${story.id}` ? (
                                <Check className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <Copy className="h-3 w-3" aria-hidden="true" />
                              )}
                              <span>{isTr ? 'Embed Kopyala' : 'Copy Embed'}</span>
                            </button>
                            <a
                              href={`/embed/${encodeURIComponent(story.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface px-2.5 py-1 text-[11px] font-extrabold text-cik-text-2"
                            >
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              disabled={deletingId === story.id}
                              onClick={() => handleDeleteExistingStory(story.id)}
                              className="ml-auto inline-flex items-center gap-1 rounded-pill bg-cik-rose px-2.5 py-1 text-[11px] font-extrabold text-cik-rose-text disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              <span>{isTr ? 'Sil' : 'Delete'}</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
