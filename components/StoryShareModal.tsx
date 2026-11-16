'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Download, Film, Loader2, MessageCircle, Share2, Sparkles } from 'lucide-react';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { getFactPrimarySlug, getFactUrl } from '@/utils/factsData';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';
import {
  fetchProxiedMediaFile,
  type GeneratedCanvasAsset,
  generateStoryCardImage,
} from '@/utils/storyCanvasGenerator';
import { useEscapeClose } from '@/utils/useEscapeClose';

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
        // Non-abort share rejection falls through to PNG download + quick-share menu
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
            setGifStatusMsg(
              lang === 'tr' ? 'Hareketli GIF paylaşıldı ✓' : 'Animated GIF shared ✓'
            );
            return;
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              return;
            }
          }
        }

        triggerDownload(media.objectUrl, media.filename, false);
        setGifStatusMsg(
          lang === 'tr'
            ? `İndirildi: ${media.filename} ✓`
            : `Downloaded: ${media.filename} ✓`
        );
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(media.objectUrl), 1500);
      }
    } catch {
      setGifStatusMsg(
        lang === 'tr'
          ? 'GIF indirilemedi, hikaye kartı PNG ile paylaşabilirsin.'
          : 'Could not fetch animated GIF; use Story PNG share above.'
      );
    } finally {
      setDownloadingGif(false);
    }
  };

  const handleCopyLink = async () => {
    if (!fact) return;
    onButtonPop();
    const { shareUrl } = buildSharePayload(fact);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const { shareUrl, shareText } = fact
    ? buildSharePayload(fact)
    : { shareUrl: 'https://scrolly.live', shareText: t.brandName };
  const primaryShareLabel =
    lang === 'tr'
      ? "GIF'li Hikaye Kartını Paylaş / İndir"
      : 'Share / Download GIF Story Card';
  const animatedGifBtnLabel =
    lang === 'tr' ? "Hareketli GIF'i İndir / Paylaş" : 'Download / Share Animated GIF';

  if (!open || !fact) return null;

  return (
    <motion.div
      aria-label={t.storyModalTitle}
      data-testid="story-share-modal"
      data-presentation="page"
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0.96, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
      className="backface-hidden absolute inset-0 z-30 flex h-full w-full flex-col overflow-hidden bg-[#FFFDF9] text-[#1E1B2E] dark:bg-[#0B0B11] dark:text-white"
    >
      <div className="no-scrollbar flex h-full w-full flex-col overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top,14px)+14px)] pb-[calc(env(safe-area-inset-bottom,16px)+24px)] sm:px-5 lg:pt-5">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-ink/10 pb-3 dark:border-white/10">
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onButtonPop();
                  onClose();
                }}
                aria-label="Close"
                data-testid="story-close-btn"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-xs font-extrabold text-ink transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{lang === 'tr' ? 'Karta Dön' : 'Back to Card'}</span>
              </motion.button>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                <img src={UI_ICON_PATHS.xpSparkles} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                <span>9:16 Story</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink dark:text-white">
                  {t.storyModalTitle}
                </h2>
                <p className="text-[11px] font-medium text-ink/65 dark:text-violet-200/75">
                  {t.storyModalSubtitle}
                </p>
              </div>
            </div>

            {/* 9:16 Live Story Preview */}
            <div className="mt-3.5 flex flex-col items-center">
              <div className="relative aspect-[9/16] w-44 overflow-hidden rounded-2xl border-2 border-white/80 bg-[#0A0A0E] shadow-xl dark:border-white/20 sm:w-48">
                {generating || !asset ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs font-bold text-white/80">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                    <span className="px-4">{t.storyGenerating}</span>
                  </div>
                ) : (
                  <img
                    src={asset.dataUrl}
                    alt={fact[lang].title}
                    loading="lazy"
                    data-testid="story-preview-img"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              {fact.gifUrl && (
                <div className="mt-2 flex justify-center">
                  <PoweredByGiphyBadge compact lang={lang} />
                </div>
              )}
            </div>

            {downloadedFeedback && (
              <p className="mt-2 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {t.storyDownloadSavedToast}
              </p>
            )}

            {gifStatusMsg && (
              <p
                data-testid="story-gif-status"
                className="mt-1.5 text-center text-[11px] font-extrabold text-violet-700 dark:text-violet-300"
              >
                {gifStatusMsg}
              </p>
            )}

            {/* Primary Story CTA + GIF Download + PNG / Copy Actions */}
            <div className="mt-3.5 flex flex-col gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={!asset}
                onClick={handleNativeShare}
                data-testid="story-share-native-btn"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-3 text-xs font-extrabold text-white shadow-cozy disabled:opacity-50 sm:text-sm"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span>{primaryShareLabel}</span>
              </motion.button>

              {fact.gifUrl && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={downloadingGif}
                  onClick={() => void handleShareOrDownloadAnimatedGif()}
                  data-testid="story-animated-gif-btn"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/60 bg-violet-100/80 px-3 py-2.5 text-xs font-extrabold text-violet-950 transition hover:bg-violet-200/80 disabled:opacity-60 dark:border-violet-500/45 dark:bg-violet-950/60 dark:text-violet-100"
                >
                  {downloadingGif ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4 shrink-0" />
                  )}
                  <span>{animatedGifBtnLabel}</span>
                </motion.button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={!asset}
                  onClick={handleDownloadPng}
                  data-testid="story-download-btn"
                  className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-white py-2.5 text-xs font-extrabold text-ink hover:bg-slate-50 disabled:opacity-50 dark:border-violet-400 dark:bg-white/10 dark:text-white"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>{t.storyDownloadBtn}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyLink}
                  data-testid="story-copy-link-btn"
                  className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-extrabold transition-colors ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'border border-amber-300 bg-amber-50 text-amber-950 dark:border-white/20 dark:bg-white/10 dark:text-violet-100'
                  }`}
                >
                  {copiedLink ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                  <span>{copiedLink ? t.copiedLink : t.storyCopyLinkBtn}</span>
                </motion.button>
              </div>

              {showQuickShareMenu && (
                <div
                  data-testid="story-quick-share-menu"
                  className="mt-1 rounded-2xl border border-violet-300/80 bg-violet-50/90 p-2.5 dark:border-violet-500/40 dark:bg-violet-950/50"
                >
                  <p className="mb-2 text-center text-[11px] font-black text-violet-900 dark:text-violet-200">
                    {lang === 'tr'
                      ? 'Görsel indirildi! Hemen paylaş:'
                      : 'Story image saved! Quick share:'}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onButtonPop}
                      data-testid="story-quick-whatsapp"
                      className="flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-[#25D366] px-2 text-[11px] font-extrabold text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onButtonPop}
                      data-testid="story-quick-x"
                      className="flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-[#111827] px-2 text-[11px] font-extrabold text-white"
                    >
                      <Share2 className="h-3.5 w-3.5 shrink-0" />
                      <span>X</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      data-testid="story-quick-copy"
                      className="flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-violet-600 px-2 text-[11px] font-extrabold text-white"
                    >
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                      <span>{copiedLink ? '✓' : lang === 'tr' ? 'Kopyala' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
  );
}
