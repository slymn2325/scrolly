'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { Check, Copy, Download, Film, MessageCircle, Share2, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import IconButton from '@/components/cikartma/IconButton';
import Skeleton from '@/components/cikartma/Skeleton';
import { type Language, translations } from '@/i18n/translations';
import { detectMediaProvider } from '@/lib/mediaProvider';
import { sheetDismiss, sheetTransition } from '@/lib/motion';
import type { FactCard } from '@/types/fact';
import { motionVideoUrl, staticPosterUrl } from '@/utils/cardMediaUrl';
import { getFactPrimarySlug, getFactUrl } from '@/utils/factsData';
import { canonicalFactShareUrl } from '@/utils/viralShare';
import {
  fetchProxiedMediaFile,
  type GeneratedCanvasAsset,
  generateStoryCardImage,
} from '@/utils/storyCanvasGenerator';
import { useEscapeClose } from '@/utils/useEscapeClose';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function StoryPreviewMedia({ fact, onReady }: { fact: FactCard; onReady: (ok: boolean) => void }) {
  const poster = staticPosterUrl(fact.gifUrl, fact.posterUrl);
  const video = motionVideoUrl(fact.gifUrl, fact.mediaType);
  if (poster) {
    return (
      <img
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) onReady(true);
        }}
        src={poster}
        alt=""
        data-testid="story-preview-img"
        onLoad={() => onReady(true)}
        onError={() => onReady(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (video) {
    return (
      <video
        src={video}
        muted
        playsInline
        preload="metadata"
        data-testid="story-preview-img"
        onLoadedData={() => onReady(true)}
        onError={() => onReady(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  if (fact.gifUrl && !/\.mp4(?:\?|$)/i.test(fact.gifUrl)) {
    return (
      <img
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) onReady(true);
        }}
        src={fact.gifUrl}
        alt=""
        data-testid="story-preview-img"
        onLoad={() => onReady(true)}
        onError={() => onReady(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return null;
}

interface StoryShareModalProps {
  open: boolean;
  fact: FactCard | null;
  lang: Language;
  onClose: () => void;
  onButtonPop: () => void;
}

export default function StoryShareModal({
  open,
  fact,
  lang,
  onClose,
  onButtonPop,
}: StoryShareModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduced = useReducedMotion() === true;
  const [mounted, setMounted] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewHasImage, setPreviewHasImage] = useState(false);
  const [asset, setAsset] = useState<GeneratedCanvasAsset | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadedFeedback, setDownloadedFeedback] = useState(false);
  const [downloadingGif, setDownloadingGif] = useState(false);
  const [gifStatusMsg, setGifStatusMsg] = useState<string | null>(null);
  const [showQuickShareMenu, setShowQuickShareMenu] = useState(false);

  const t = translations[lang];

  useEscapeClose(open, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPreviewReady(false);
    setPreviewHasImage(false);
  }, [fact, open]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('scrolly-chrome-block', { detail: { open: false } }));
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const backdrop = document.querySelector<HTMLElement>('[data-testid="story-share-backdrop"]');
    if (!backdrop) return;
    const previous = backdrop.style.visibility;
    backdrop.style.visibility = 'hidden';
    return () => {
      backdrop.style.visibility = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const layer = layerRef.current;
    const changed: HTMLElement[] = [];
    Array.from(document.body.children).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (layer && node === layer) return;
      if (node.hasAttribute('inert')) return;
      node.setAttribute('inert', '');
      changed.push(node);
    });
    return () => {
      changed.forEach((node) => node.removeAttribute('inert'));
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !fact) {
      setAsset(null);
      setShowQuickShareMenu(false);
      setGifStatusMsg(null);
      return;
    }

    let cancelled = false;
    setGenerating(true);
    setShowQuickShareMenu(false);
    setGifStatusMsg(null);

    generateStoryCardImage(fact, lang)
      .then((res) => {
        if (!cancelled) {
          setAsset(res);
        }
      })
      .catch(() => {
        if (!cancelled) setAsset(null);
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, fact, lang]);

  const triggerDownload = (dataUrl: string, fileName: string, showPngToast = true) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showPngToast) {
      setDownloadedFeedback(true);
      setTimeout(() => setDownloadedFeedback(false), 2400);
    }
  };

  const buildSharePayload = (targetFact: FactCard) => {
    const localized = targetFact[lang];
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    const shareUrl = `${origin}${getFactUrl(targetFact, lang)}`;
    const shareText = `${localized.title} · ${t.brandName}`;
    return { localized, shareUrl, shareText };
  };

  const handleNativeShare = async () => {
    if (!asset || !fact) return;
    onButtonPop();

    const { localized, shareUrl, shareText } = buildSharePayload(fact);

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function' &&
      navigator.canShare({ files: [asset.file] })
    ) {
      try {
        await navigator.share({
          files: [asset.file],
          title: localized.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    triggerDownload(asset.dataUrl, `scrolly-story-${getFactPrimarySlug(fact)}.png`);
    setShowQuickShareMenu(true);
  };

  const handleDownloadPng = () => {
    if (!asset || !fact) return;
    onButtonPop();
    triggerDownload(asset.dataUrl, `scrolly-story-${getFactPrimarySlug(fact)}.png`);
  };

  const handleShareOrDownloadAnimatedGif = async () => {
    if (!fact?.gifUrl || downloadingGif) return;
    onButtonPop();
    setDownloadingGif(true);
    setGifStatusMsg(null);
    const { localized, shareUrl, shareText } = buildSharePayload(fact);
    const slug = getFactPrimarySlug(fact);

    try {
      const media = await fetchProxiedMediaFile(fact.gifUrl, slug);
      try {
        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          typeof navigator.share === 'function' &&
          navigator.canShare({ files: [media.file] })
        ) {
          try {
            await navigator.share({
              files: [media.file],
              title: localized.title,
              text: shareText,
              url: shareUrl,
            });
            setGifStatusMsg(lang === 'tr' ? 'Hareketli GIF paylaşıldı' : 'Animated GIF shared');
            return;
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              return;
            }
          }
        }

        triggerDownload(media.objectUrl, media.filename, false);
        setGifStatusMsg(
          lang === 'tr' ? `İndirildi: ${media.filename}` : `Downloaded: ${media.filename}`,
        );
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(media.objectUrl), 1500);
      }
    } catch {
      setGifStatusMsg(
        lang === 'tr'
          ? 'GIF indirilemedi. Hikaye kartını PNG olarak paylaşabilirsin.'
          : 'Could not fetch the GIF. Share the story card as a PNG.',
      );
    } finally {
      setDownloadingGif(false);
    }
  };

  const canonicalCopyUrl = fact
    ? canonicalFactShareUrl(getFactPrimarySlug(fact), lang === 'en' ? 'en' : 'tr')
    : '';

  const handleCopyLink = async () => {
    if (!fact || !canonicalCopyUrl) return;
    onButtonPop();
    try {
      await navigator.clipboard.writeText(canonicalCopyUrl);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const hasVisual = Boolean(
    fact &&
      (staticPosterUrl(fact.gifUrl, fact.posterUrl) ||
        motionVideoUrl(fact.gifUrl, fact.mediaType) ||
        (fact.gifUrl && !/\.mp4(?:\?|$)/i.test(fact.gifUrl))),
  );

  useEffect(() => {
    if (open && fact && !hasVisual) {
      setPreviewHasImage(false);
      setPreviewReady(true);
    }
  }, [open, fact, hasVisual]);

  if (!mounted || !open || !fact) return null;

  const { shareUrl, shareText } = buildSharePayload(fact);
  const provider = detectMediaProvider({
    gifUrl: fact.gifUrl,
    posterUrl: fact.posterUrl,
    videoUrl: fact.gifUrl,
  });
  const providerLabel = provider?.id === 'wikimedia' ? 'Wikimedia' : provider?.label;
  const animatedGifBtnLabel = lang === 'tr' ? 'GIF paylaş' : 'Share GIF';

  return createPortal(
    <AnimatePresence>
      <div
        ref={layerRef}
        data-cik-layer="sheet"
        className="fixed inset-0 z-sheet flex items-end justify-center"
        role="presentation"
      >
        <motion.div
          className="cik-scrim absolute inset-0"
          aria-hidden="true"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: sheetTransition(reduced, 'close') }}
          transition={sheetTransition(reduced, 'open')}
        />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-testid="story-share-modal"
          drag={reduced ? false : 'y'}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            const height = panelRef.current?.getBoundingClientRect().height ?? 1;
            const pulled = info.offset.y > height * sheetDismiss.distanceRatio;
            const flung = info.velocity.y > sheetDismiss.velocityPxPerSec;
            if (pulled || flung) onClose();
          }}
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={
            reduced
              ? { opacity: 0, transition: sheetTransition(true, 'close') }
              : { y: '100%', transition: sheetTransition(false, 'close') }
          }
          transition={sheetTransition(reduced, 'open')}
          className="cik-sheet relative flex max-h-[calc(100dvh-64px)] w-full max-w-lg flex-col bg-cik-surface text-cik-text"
        >
          <div
            className="flex h-11 w-full items-center justify-center"
            style={{ touchAction: 'none' }}
            onPointerDown={(event) => {
              if (reduced) return;
              dragControls.start(event);
            }}
          >
            <span aria-hidden="true" className="h-1 w-8 rounded-pill bg-cik-line" />
          </div>
          <div className="flex items-center gap-2 px-4 pb-2">
            <h2 id={titleId} className="cik-title-3 min-w-0 flex-1 truncate text-cik-text">
              {t.storyModalTitle}
            </h2>
            <span className="cik-footnote inline-flex h-8 shrink-0 items-center rounded-pill bg-cik-pink px-3 text-cik-text">
              9:16
            </span>
            <IconButton label={t.sheetClose} data-testid="story-close-btn" onClick={onClose} className="shrink-0">
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
            <div className="flex items-center gap-3">
              <BrandLogo size={40} id="story-share-brand" />
              <p className="cik-subhead text-cik-text-2">{t.storyModalSubtitle}</p>
            </div>

            <div className="relative mx-auto mt-4 aspect-[9/16] w-40 overflow-hidden rounded-cik-lg bg-cik-pink">
              {!previewReady && <Skeleton className="absolute inset-0 h-full w-full rounded-cik-lg" />}
              <div className={previewHasImage ? 'opacity-100' : 'opacity-0'}>
                <StoryPreviewMedia
                  fact={fact}
                  onReady={(ok) => {
                    setPreviewHasImage(ok);
                    setPreviewReady(true);
                  }}
                />
              </div>
              {previewReady && previewHasImage && (
                <div className="absolute inset-x-0 bottom-0 bg-cik-text px-3 py-3">
                  <p className="cik-caption-2 line-clamp-4 text-cik-bg">{fact[lang].title}</p>
                  <p className="cik-caption-2 mt-1 text-cik-bg">scrolly.live</p>
                  {providerLabel ? <p className="cik-caption-2 mt-1 text-cik-bg">{providerLabel}</p> : null}
                </div>
              )}
              {previewReady && !previewHasImage && (
                <p className="cik-footnote absolute inset-x-3 bottom-4 line-clamp-4 text-cik-text">{fact[lang].title}</p>
              )}
            </div>

            {generating && !asset ? (
              <p className="cik-caption-2 mt-3 text-center text-cik-text-2">{t.storyGenerating}</p>
            ) : null}

            {downloadedFeedback && (
              <p className="cik-footnote mt-3 text-center text-cik-mint-text">{t.storyDownloadSavedToast}</p>
            )}

            {gifStatusMsg && (
              <p data-testid="story-gif-status" className="cik-footnote mt-2 text-center text-cik-text-2">
                {gifStatusMsg}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <motion.button
                type="button"
                whileTap={reduced ? undefined : { scale: 0.96 }}
                disabled={!asset}
                onClick={handleNativeShare}
                data-testid="story-share-native-btn"
                className="cik-headline flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta disabled:opacity-40"
              >
                <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t.storyShareNativeBtn}</span>
              </motion.button>

              {fact.gifUrl && (
                <motion.button
                  type="button"
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  disabled={downloadingGif}
                  onClick={() => void handleShareOrDownloadAnimatedGif()}
                  data-testid="story-animated-gif-btn"
                  className="cik-footnote flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface-2 px-4 text-cik-text disabled:opacity-40"
                >
                  <Film size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{downloadingGif ? (lang === 'tr' ? 'Hazırlanıyor' : 'Preparing') : animatedGifBtnLabel}</span>
                </motion.button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  disabled={!asset}
                  onClick={handleDownloadPng}
                  data-testid="story-download-btn"
                  className="cik-footnote flex h-11 items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-3 text-cik-text disabled:opacity-40"
                >
                  <Download size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t.storyDownloadBtn}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  onClick={handleCopyLink}
                  data-testid="story-copy-link-btn"
                  data-share-url={canonicalCopyUrl}
                  className={`cik-footnote flex h-11 items-center justify-center gap-2 rounded-pill px-3 ${
                    copiedLink ? 'bg-cik-mint text-cik-mint-text' : 'bg-cik-surface-2 text-cik-text'
                  }`}
                >
                  {copiedLink ? (
                    <Check size={16} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Copy size={16} strokeWidth={2} aria-hidden="true" />
                  )}
                  <span>{copiedLink ? t.copiedLink : t.storyCopyLinkBtn}</span>
                </motion.button>
              </div>

              {showQuickShareMenu && (
                <div data-testid="story-quick-share-menu" className="rounded-cik-lg bg-cik-pink p-3">
                  <p className="cik-footnote mb-2 text-center text-cik-text">
                    {lang === 'tr' ? 'Görsel indi. Paylaş:' : 'Image saved. Share it:'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onButtonPop}
                      data-testid="story-quick-whatsapp"
                      className="cik-caption-1 flex h-11 items-center justify-center gap-1 rounded-pill bg-cik-mint px-2 text-cik-mint-text"
                    >
                      <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onButtonPop}
                      data-testid="story-quick-x"
                      className="cik-caption-1 flex h-11 items-center justify-center gap-1 rounded-pill bg-cik-text px-2 text-cik-bg"
                    >
                      <Share2 size={16} strokeWidth={2} aria-hidden="true" />
                      <span>X</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      data-testid="story-quick-copy"
                      className="cik-caption-1 flex h-11 items-center justify-center gap-1 rounded-pill bg-cik-cta px-2 text-cik-on-cta"
                    >
                      <Copy size={16} strokeWidth={2} aria-hidden="true" />
                      <span>{copiedLink ? (lang === 'tr' ? 'Kopya' : 'Copied') : lang === 'tr' ? 'Kopyala' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
