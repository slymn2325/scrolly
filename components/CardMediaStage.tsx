'use client';

import React, { useEffect, useRef } from 'react';

function badgeLabel(mediaType?: string | null, mediaSource?: string | null): string | null {
  const source = (mediaSource || '').toLowerCase();
  const type = (mediaType || '').toLowerCase();
  if (source === 'giphy') return 'POWERED BY GIPHY';
  if (source === 'wikimedia') return 'COMMONS · WIKIMEDIA';
  if (source === 'pexels' && type === 'image') return 'PHOTO · PEXELS';
  if (source === 'pexels') return 'VIDEO · PEXELS';
  if (source === 'pixabay') return 'VIDEO · PIXABAY';
  return null;
}

export default function CardMediaStage({
  url,
  posterUrl,
  mediaType,
  mediaSource,
  isActive,
  title,
  failed = false,
  empty = false,
  onFailed,
}: {
  url?: string | null;
  posterUrl?: string | null;
  mediaType?: string | null;
  mediaSource?: string | null;
  isActive: boolean;
  title: string;
  failed?: boolean;
  empty?: boolean;
  onFailed?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo =
    Boolean(url) &&
    (mediaType === 'video' || /\.mp4(\?|$)/i.test(url || '') || (mediaSource === 'pexels' && mediaType !== 'image') || mediaSource === 'pixabay');
  const showMedia = Boolean(url) && !failed;
  const showFallback = !showMedia && (failed || empty);
  const badge = badgeLabel(isVideo ? 'video' : mediaType, mediaSource);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !isVideo) return;
    const playIfReady = (visible: boolean) => {
      if (visible && isActive) {
        void node.play().catch(() => undefined);
      } else {
        node.pause();
      }
    };
    playIfReady(true);
    const observer = new IntersectionObserver(
      ([entry]) => playIfReady(Boolean(entry?.isIntersecting)),
      { threshold: 0.55 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isActive, isVideo, url]);

  return (
    <>
      {showMedia && isVideo ? (
        <video
          ref={videoRef}
          src={url || undefined}
          poster={posterUrl || undefined}
          autoPlay={isActive}
          loop
          muted
          playsInline
          preload="metadata"
          data-testid="card-topic-video"
          onError={() => onFailed?.()}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
        />
      ) : null}
      {showMedia && !isVideo ? (
        <img
          src={url || undefined}
          alt={title}
          data-testid="card-topic-gif"
          onError={() => onFailed?.()}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
        />
      ) : null}
      {showFallback ? (
        <div
          data-testid="card-media-fallback"
          className="absolute inset-0 z-[2] flex items-end bg-gradient-to-br from-indigo-700 via-violet-700 to-indigo-950 p-5"
        >
          <p className="font-display text-2xl font-semibold leading-tight text-white line-clamp-3">{title}</p>
        </div>
      ) : null}
      {badge ? (
        <span className="absolute bottom-3 left-3 z-[6] rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold tracking-wide text-white">
          {badge}
        </span>
      ) : null}
    </>
  );
}
