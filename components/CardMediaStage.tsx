'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motionVideoUrl, staticPosterUrl } from '@/utils/cardMediaUrl';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [allowMotion, setAllowMotion] = useState(false);
  const poster = failed ? null : staticPosterUrl(url, posterUrl);
  const videoUrl = failed || videoFailed ? null : motionVideoUrl(url, mediaType);
  const showPoster = Boolean(poster) && !posterFailed;
  const showVideo = Boolean(videoUrl) && allowMotion && isActive;
  const showFallback = !showPoster && !showVideo && (failed || empty || posterFailed);

  useEffect(() => {
    setPosterFailed(false);
    setVideoFailed(false);
  }, [url, posterUrl]);

  useEffect(() => {
    if (!isActive || !videoUrl) {
      setAllowMotion(false);
      return;
    }
    if (!priority) {
      setAllowMotion(true);
      return;
    }
    let cancelled = false;
    let idleId = 0;
    let timerId = 0;
    const arm = () => {
      if (!cancelled) setAllowMotion(true);
    };
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(arm, { timeout: 2000 });
      } else {
        timerId = window.setTimeout(arm, 1200);
      }
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [isActive, priority, videoUrl]);

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
    <>
      {showPoster && poster ? (
        <Image
          src={poster}
          alt={title}
          fill
          preload={priority}
          loading={priority ? undefined : 'lazy'}
          sizes="100vw"
          data-testid={testId}
          onError={() => {
            setPosterFailed(true);
            if (!videoUrl) onFailed?.();
          }}
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
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
          className="pointer-events-none absolute inset-0 z-[3] h-full w-full object-cover"
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
    </>
  );
}
