const MOTION_IMAGE = /\/(?:200|giphy|giphy-downsized(?:-medium)?)\.(?:webp|gif)(?:$|[?#])/i;

function isGiphyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'giphy.com' || host.endsWith('.giphy.com');
}

export function giphyIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !isGiphyHost(parsed.hostname)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'media') {
      const next = parts[1] || '';
      if (next.startsWith('v1.')) return parts[2] || null;
      return next || null;
    }
    if (!parts[0] || parts[0].includes('.')) return null;
    return parts[0];
  } catch {
    return null;
  }
}

export function isMotionImageUrl(url: string): boolean {
  return /\.gif(?:$|[?#])/i.test(url) || MOTION_IMAGE.test(url);
}

/** Still WebP/AVIF (or an already-static photo) for the first paint. */
export function staticPosterUrl(url?: string | null, posterUrl?: string | null): string | null {
  const poster = (posterUrl || '').trim();
  if (poster.startsWith('https://') && !isMotionImageUrl(poster)) return poster;
  const src = (url || '').trim();
  if (!src.startsWith('https://')) return null;
  const id = giphyIdFromUrl(src);
  if (id) return `https://media.giphy.com/media/${id}/giphy_s.webp`;
  if (!isMotionImageUrl(src) && /\.(?:webp|avif|jpe?g|png)(?:$|[?#])/i.test(src)) return src;
  return null;
}

/** Looping MP4 for motion. Animated WebP and GIF URLs are not returned. */
export function motionVideoUrl(url?: string | null, mediaType?: string | null): string | null {
  const src = (url || '').trim();
  if (!src.startsWith('https://') || mediaType === 'image') return null;
  if (/\.mp4(?:$|[?#])/i.test(src)) return src;
  const id = giphyIdFromUrl(src);
  if (id && isMotionImageUrl(src)) return `https://media.giphy.com/media/${id}/giphy.mp4`;
  return null;
}
