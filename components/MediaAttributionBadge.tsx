'use client';

import React from 'react';
import { BookOpen, Clapperboard, ImageIcon } from 'lucide-react';
import PoweredByGiphyBadge from '@/components/PoweredByGiphyBadge';
import { detectMediaProvider, type DetectableMediaCard, type MediaProviderId } from '@/lib/mediaProvider';
import type { Language } from '@/i18n/translations';

export interface MediaAttributionInput extends DetectableMediaCard {
  mediaCredit?: string | null;
  author?: string | null;
  license?: string | null;
}

const GENERIC_CREDIT = new Set([
  'giphy',
  'pexels',
  'pixabay',
  'wikimedia',
  'wikimedia commons',
  'nasa',
  'unsplash',
]);

function firstHttps(...urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = (raw || '').trim();
    if (value.startsWith('https://')) return value;
  }
  return null;
}

function namedCredit(credit: string | null | undefined, providerId: MediaProviderId): string {
  const value = (credit || '').trim();
  if (!value || GENERIC_CREDIT.has(value.toLowerCase())) return '';
  if (value.toLowerCase() === providerId) return '';
  return value;
}

function AttributionRow({
  provider,
  children,
  className = '',
}: {
  provider: MediaProviderId;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-testid="media-attribution-badge"
      data-provider={provider}
      className={`flex min-w-0 flex-wrap items-center gap-2 text-cik-text-2 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default function MediaAttributionBadge({
  card,
  lang = 'tr',
  className = '',
}: {
  card: MediaAttributionInput | null | undefined;
  lang?: Language;
  className?: string;
}) {
  const provider = detectMediaProvider(card);
  if (!provider || !card) return null;

  const mediaHref = firstHttps(card.videoUrl, card.mediaUrl, card.gifUrl, card.imageUrl, card.posterUrl);
  const author = (card.author || '').trim() || namedCredit(card.mediaCredit, provider.id);
  const license = (card.license || '').trim();
  const uiLang = lang === 'en' ? 'en' : 'tr';

  switch (provider.id) {
    case 'giphy':
      return (
        <AttributionRow provider="giphy" className={className}>
          <PoweredByGiphyBadge compact lang={uiLang} />
        </AttributionRow>
      );
    case 'pexels':
      return (
        <AttributionRow provider="pexels" className={className}>
          <span className="cik-caption-2 inline-flex h-6 shrink-0 items-center rounded-pill bg-cik-cta px-2 text-cik-on-cta">
            Pexels
          </span>
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cik-caption-2 min-w-0 text-cik-cta underline"
          >
            Photos & Videos provided by Pexels
          </a>
          {author ? <span className="cik-caption-2 min-w-0">{author}</span> : null}
          {mediaHref ? (
            <a href={mediaHref} target="_blank" rel="noopener noreferrer" className="cik-caption-2 text-cik-cta underline">
              {uiLang === 'tr' ? 'Medya' : 'Media'}
            </a>
          ) : null}
        </AttributionRow>
      );
    case 'pixabay':
      return (
        <AttributionRow provider="pixabay" className={className}>
          <ImageIcon className="h-4 w-4 shrink-0 text-cik-cta" aria-hidden="true" />
          <a
            href="https://pixabay.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cik-caption-2 text-cik-cta underline"
          >
            Media via Pixabay
          </a>
        </AttributionRow>
      );
    case 'wikimedia':
      return (
        <AttributionRow provider="wikimedia" className={className}>
          <BookOpen className="h-4 w-4 shrink-0 text-cik-cta" aria-hidden="true" />
          <a
            href={mediaHref || 'https://commons.wikimedia.org'}
            target="_blank"
            rel="noopener noreferrer"
            className="cik-caption-2 text-cik-cta underline"
          >
            Wikimedia Commons
          </a>
          {author ? <span className="cik-caption-2 min-w-0">{author}</span> : null}
          {license ? <span className="cik-caption-2 min-w-0">{license}</span> : null}
        </AttributionRow>
      );
    case 'nasa':
      return (
        <AttributionRow provider="nasa" className={className}>
          <Clapperboard className="h-4 w-4 shrink-0 text-cik-cta" aria-hidden="true" />
          <a
            href={mediaHref || 'https://www.nasa.gov'}
            target="_blank"
            rel="noopener noreferrer"
            className="cik-caption-2 text-cik-cta underline"
          >
            NASA
          </a>
        </AttributionRow>
      );
    case 'unsplash':
      return null;
    default: {
      const unreachable: never = provider.id;
      return unreachable;
    }
  }
}
