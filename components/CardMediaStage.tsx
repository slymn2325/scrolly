'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motionVideoUrl, staticPosterUrl } from '@/utils/cardMediaUrl';

/** Card stage widths: phone, tablet, lg 520, xl 560. Not 100vw. */
const CARD_IMAGE_SIZES =
  '(min-width: 1280px) 560px, (min-width: 1024px) 520px, (min-width: 768px) 720px, 390px';
const VISIBLE_BEFORE_VIDEO_MS = 600;

type NetworkConnection = EventTarget & { saveData?: boolean };

function networkConnection(): NetworkConnection | null {
  if (typeof navigator === 'undefined') return null;
  const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
  return connection ?? null;
}

function shouldSkipMotion(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return networkConnection()?.saveData === true;
}

export default function CardMediaStage({
  url,
  posterUrl,
  mediaType,
  isActive,
  title,
  failed = false,
  empty = false,
  priority = false,
  testId = 'card-topic-gif',
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
  /** First card: preload the still poster. Next.js 16 name for the old priority prop. */
  priority?: boolean;
  testId?: string;
  onFailed?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [allowMotion, setAllowMotion] = useState(false);
  const poster = failed ? null : staticPosterUrl(url, posterUrl);
  const videoUrl = failed || videoFailed ? null : motionVideoUrl(url, mediaType);
  const showPoster = Boolean(poster) && !posterFailed;
  const preloadPoster = priority && !poster?.includes('magnifying-glass');
  const showVideo = Boolean(videoUrl) && allowMotion && isActive && !shouldSkipMotion();
  const showFallback = !showPoster && !showVideo && (failed || empty || posterFailed);

  useEffect(() => {
    setPosterFailed(false);
    setVideoFailed(false);
  }, [url, posterUrl]);

  useEffect(() => {
    const root = rootRef.current;
    let timerId = 0;
    let cancelled = false;
    setAllowMotion(false);

    const clearTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = 0;
      }
    };
    const stop = () => {
      clearTimer();
      if (!cancelled) setAllowMotion(false);
    };
    const arm = () => {
      clearTimer();
      if (shouldSkipMotion()) {
        stop();
        return;
      }
      timerId = window.setTimeout(() => {
        if (!cancelled && !shouldSkipMotion()) setAllowMotion(true);
      }, VISIBLE_BEFORE_VIDEO_MS);
    };

    if (!isActive || !videoUrl || !root || shouldSkipMotion()) {
      return () => {
        cancelled = true;
        clearTimer();
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.55);
        if (visible) arm();
        else stop();
      },
      { threshold: [0, 0.55, 1] }
    );
    observer.observe(root);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      if (shouldSkipMotion()) stop();
    };
    motionQuery.addEventListener('change', onPreference);
    const connection = networkConnection();
    connection?.addEventListener('change', onPreference);

    return () => {
      cancelled = true;
      clearTimer();
      observer.disconnect();
      motionQuery.removeEventListener('change', onPreference);
      connection?.removeEventListener('change', onPreference);
    };
  }, [isActive, videoUrl]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !showVideo) return;
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
  }, [isActive, showVideo, videoUrl]);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      {showPoster && poster ? (
        <Image
          src={poster}
          alt={title}
          fill
          preload={preloadPoster}
          fetchPriority={preloadPoster ? 'high' : 'auto'}
          loading={preloadPoster ? undefined : 'lazy'}
          sizes={CARD_IMAGE_SIZES}
          data-testid={testId}
          onError={() => {
            setPosterFailed(true);
            if (!videoUrl) onFailed?.();
          }}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full rounded-none object-cover lg:rounded-t-[28px]"
        />
      ) : null}
      {showVideo ? (
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          poster={poster || undefined}
          autoPlay={isActive}
          loop
          muted
          playsInline
          preload="none"
          data-testid="card-topic-video"
          onError={() => setVideoFailed(true)}
          className="pointer-events-none absolute inset-0 z-[3] h-full w-full rounded-none object-cover lg:rounded-t-[28px]"
        />
      ) : null}
      {showFallback ? (
        <div
          data-testid="card-media-fallback"
          className="absolute inset-0 z-[2] flex items-end bg-gradient-to-br from-cik-pink/90 via-cik-surface-2/85 to-cik-bg/95 p-5"
        >
          <p className="font-display text-2xl font-semibold leading-tight text-cik-text line-clamp-3">{title}</p>
        </div>
      ) : null}
    </div>
  );
}
