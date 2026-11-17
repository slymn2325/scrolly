/**
 * One search path for card media: Pexels video, Pixabay video, Giphy, Pexels photo, Wikimedia.
 * Callers persist `url` onto gif_url and the media_* columns immediately.
 */

const WIKIMEDIA_UA = 'ScrollyBot/1.0 (https://scrolly.live; contact@scrolly.live)';

let giphyAuthStreak = 0;

export function giphyCircuitOpen() {
  return giphyAuthStreak >= 3;
}

function noteGiphyStatus(status) {
  if (status === 429 || status === 401 || status === 403) {
    giphyAuthStreak += 1;
    return;
  }
  if (status >= 200 && status < 300) giphyAuthStreak = 0;
}

export function emptyCardMedia() {
  return {
    url: null,
    posterUrl: null,
    mediaType: null,
    mediaSource: null,
    mediaCredit: null,
  };
}

function cleanQuery(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function pickPexelsMp4(video) {
  const files = Array.isArray(video?.video_files) ? video.video_files : [];
  const mp4s = files.filter((file) => {
    const type = String(file?.file_type || '');
    const link = String(file?.link || '');
    return type === 'video/mp4' || /\.mp4(\?|$)/i.test(link);
  });
  const sized = mp4s.find((file) => {
    const width = Number(file?.width || 0);
    return width >= 720 && width <= 1280;
  });
  const chosen = sized || mp4s[0];
  return chosen?.link ? String(chosen.link) : '';
}

async function searchPexelsVideo(query, apiKey) {
  const params = new URLSearchParams({
    query,
    per_page: '5',
    orientation: 'landscape',
  });
  const res = await fetch(`https://api.pexels.com/videos/search?${params.toString()}`, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const videos = Array.isArray(json?.videos) ? json.videos : [];
  if (videos.length === 0) return null;
  const short = videos.find((video) => Number(video?.duration || 99) <= 25);
  const video = short || videos[0];
  const url = pickPexelsMp4(video);
  if (!url) return null;
  const credit = String(video?.user?.name || '').trim() || 'Pexels';
  return {
    url,
    posterUrl: video?.image ? String(video.image) : null,
    mediaType: 'video',
    mediaSource: 'pexels',
    mediaCredit: credit,
  };
}

async function searchPixabayVideo(query, apiKey) {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    per_page: '5',
    safesearch: 'true',
  });
  const res = await fetch(`https://pixabay.com/api/videos/?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const hit = Array.isArray(json?.hits) ? json.hits[0] : null;
  if (!hit) return null;
  const videos = hit.videos || {};
  const url = videos.medium?.url || videos.small?.url || '';
  if (!url) return null;
  return {
    url: String(url),
    posterUrl: videos.small?.thumbnail ? String(videos.small.thumbnail) : null,
    mediaType: 'video',
    mediaSource: 'pixabay',
    mediaCredit: String(hit.user || 'Pixabay'),
  };
}

function giphyFileUrl(images) {
  const mp4 = images?.original?.mp4 || images?.fixed_height?.mp4 || '';
  if (mp4) return { url: String(mp4), mediaType: 'video' };
  const gif =
    images?.original?.url ||
    images?.fixed_height?.url ||
    images?.downsized_medium?.url ||
    '';
  if (!gif) return null;
  return { url: String(gif), mediaType: 'gif' };
}

async function searchGiphy(query, apiKey) {
  if (giphyCircuitOpen()) return null;
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    limit: '5',
    rating: 'pg',
    lang: 'en',
  });
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    noteGiphyStatus(res.status);
    if (!res.ok) return null;
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    for (const row of rows) {
      const picked = giphyFileUrl(row?.images);
      if (!picked?.url?.startsWith('https://')) continue;
      return {
        url: picked.url,
        posterUrl: row?.images?.fixed_height_still?.url || row?.images?.original_still?.url || null,
        mediaType: picked.mediaType,
        mediaSource: 'giphy',
        mediaCredit: 'GIPHY',
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function searchPexelsPhoto(query, apiKey) {
  const params = new URLSearchParams({ query, per_page: '5' });
  const res = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const photo = Array.isArray(json?.photos) ? json.photos[0] : null;
  const src = photo?.src || {};
  const url = src.large2x || src.large || '';
  if (!url) return null;
  return {
    url: String(url),
    posterUrl: src.medium ? String(src.medium) : null,
    mediaType: 'image',
    mediaSource: 'pexels',
    mediaCredit: String(photo?.photographer || 'Pexels'),
  };
}

function wikimediaOk(info) {
  const mime = String(info?.mime || '').toLowerCase();
  const width = Number(info?.width || info?.thumbwidth || 0);
  const url = String(info?.thumburl || info?.url || '');
  if (!url.startsWith('https://')) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return null;
  if (width < 600) return null;
  return url;
}

async function searchWikimedia(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { 'User-Agent': WIKIMEDIA_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json?.query?.pages || {};
  for (const page of Object.values(pages)) {
    const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
    const url = wikimediaOk(info);
    if (!url) continue;
    return {
      url,
      posterUrl: null,
      mediaType: 'image',
      mediaSource: 'wikimedia',
      mediaCredit: 'Wikimedia Commons',
    };
  }
  return null;
}

/**
 * @param {{ query?: string, category?: string, slug?: string, isVocab?: boolean }} input
 */
export async function resolveCardMedia(input = {}) {
  const query = cleanQuery(input.query);
  if (!query) return emptyCardMedia();

  const pexelsKey = String(process.env.PEXELS_API_KEY || '').trim();
  const pixabayKey = String(process.env.PIXABAY_API_KEY || '').trim();
  const giphyKey = String(process.env.GIPHY_API_KEY || '').trim();

  try {
    if (pexelsKey) {
      const video = await searchPexelsVideo(query, pexelsKey);
      if (video) return video;
    }
  } catch (err) {
    console.warn('[resolveCardMedia] pexels video:', err instanceof Error ? err.message : err);
  }

  try {
    if (pixabayKey) {
      const video = await searchPixabayVideo(query, pixabayKey);
      if (video) return video;
    }
  } catch (err) {
    console.warn('[resolveCardMedia] pixabay:', err instanceof Error ? err.message : err);
  }

  try {
    if (giphyKey) {
      const gif = await searchGiphy(query, giphyKey);
      if (gif) return gif;
    }
  } catch (err) {
    console.warn('[resolveCardMedia] giphy:', err instanceof Error ? err.message : err);
  }

  try {
    if (pexelsKey) {
      const photo = await searchPexelsPhoto(query, pexelsKey);
      if (photo) return photo;
    }
  } catch (err) {
    console.warn('[resolveCardMedia] pexels photo:', err instanceof Error ? err.message : err);
  }

  try {
    const commons = await searchWikimedia(query);
    if (commons) return commons;
  } catch (err) {
    console.warn('[resolveCardMedia] wikimedia:', err instanceof Error ? err.message : err);
  }

  return emptyCardMedia();
}
