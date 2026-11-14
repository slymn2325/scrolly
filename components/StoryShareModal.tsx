'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, Loader2, Share2, Sparkles, X } from 'lucide-react';
import { type Language, translations } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { getFactUrl } from '@/utils/factsData';
import {
  type GeneratedCanvasAsset,
  generateStoryCardImage,
} from '@/utils/storyCanvasGenerator';

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

  const t = translations[lang];

  useEffect(() => {
    if (!open || !fact) {
      setAsset(null);
      return;
    }

    let cancelled = false;
    setGenerating(true);

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

  const triggerDownload = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadedFeedback(true);
    setTimeout(() => setDownloadedFeedback(false), 2400);
  };

  const handleNativeShare = async () => {
    if (!asset || !fact) return;
    onButtonPop();

    const localized = fact[lang];
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    const shareUrl = `${origin}${getFactUrl(fact, lang)}`;

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
          text: `${localized.title} — ${t.brandName}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or file-share blocked; fallback gracefully to download
      }
    }

    triggerDownload(asset.dataUrl, `scrolly-story-${fact.id}.png`);
  };

  const handleDownloadPng = () => {
    if (!asset || !fact) return;
    onButtonPop();
    triggerDownload(asset.dataUrl, `scrolly-story-${fact.id}.png`);
  };

  const handleCopyLink = async () => {
    if (!fact) return;
    onButtonPop();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://scrolly.live';
    const url = `${origin}${getFactUrl(fact, lang)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2400);
  };

  return (
    <AnimatePresence>
      {open && fact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.storyModalTitle}
          data-testid="story-share-modal"
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-center justify-center bg-ink/60 px-3 pt-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative mb-[92px] flex max-h-[84dvh] w-full flex-col overflow-y-auto no-scrollbar rounded-3xl border-2 border-violet-200 bg-[#FFFDF9] p-5 shadow-2xl dark:border-violet-700/60 dark:bg-[#171228]"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                onButtonPop();
                onClose();
              }}
              aria-label="Close"
              data-testid="story-close-btn"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-ink/60 hover:bg-slate-200 dark:bg-white/10 dark:text-violet-200"
            >
              <X className="h-4 w-4" />
            </motion.button>

            <div className="flex items-center gap-2.5 pr-8">
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
            <div className="mt-4 flex justify-center">
              <div className="relative aspect-[9/16] w-48 overflow-hidden rounded-2xl border-2 border-white/80 bg-neutral-900 shadow-xl dark:border-white/20 sm:w-52">
                {generating || !asset ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs font-bold text-white/80">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                    <span className="px-4">{t.storyGenerating}</span>
                  </div>
                ) : (
                  <img
                    src={asset.dataUrl}
                    alt={fact[lang].title}
                    data-testid="story-preview-img"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            {downloadedFeedback && (
              <p className="mt-2.5 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {t.storyDownloadSavedToast}
              </p>
            )}

            {/* 3 Story Action Buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={!asset}
                onClick={handleNativeShare}
                data-testid="story-share-native-btn"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 py-3 text-sm font-extrabold text-white shadow-cozy disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                <span>{t.storyShareNativeBtn}</span>
              </motion.button>

              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={!asset}
                  onClick={handleDownloadPng}
                  data-testid="story-download-btn"
                  className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-white py-2.5 text-xs font-extrabold text-ink hover:bg-slate-50 disabled:opacity-50 dark:border-violet-400 dark:bg-white/10 dark:text-white"
                >
                  <Download className="h-4 w-4" />
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
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? t.copiedLink : t.storyCopyLinkBtn}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
