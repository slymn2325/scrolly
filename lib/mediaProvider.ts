export type MediaProviderId =
  | 'giphy'
  | 'pexels'
  | 'pixabay'
  | 'wikimedia'
  | 'unsplash'
  | 'nasa';

export interface MediaProvider {
  id: MediaProviderId;
  label: string;
}

export interface DetectableMediaCard {
  videoUrl?: string | null;
  mediaUrl?: string | null;
  imageUrl?: string | null;
  gifUrl?: string | null;
  posterUrl?: string | null;
  mediaProvider?: string | null;
  videoProvider?: string | null;
  mediaSource?: string | null;
}

const PROVIDER_LABEL: Record<MediaProviderId, string> = {
  giphy: 'Giphy',
  pexels: 'Pexels',
  pixabay: 'Pixabay',
  wikimedia: 'Wikimedia Commons',
  unsplash: 'Unsplash',
  nasa: 'NASA',
};

function providerFromHost(hostname: string): MediaProviderId | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'giphy.com' || host.endsWith('.giphy.com') || host.includes('giphy')) return 'giphy';
  if (host === 'pexels.com' || host.endsWith('.pexels.com')) return 'pexels';
  if (host === 'pixabay.com' || host.endsWith('.pixabay.com')) return 'pixabay';
  if (
    host === 'wikimedia.org' ||
    host.endsWith('.wikimedia.org') ||
    host === 'wikipedia.org' ||
    host.endsWith('.wikipedia.org')
  ) {
    return 'wikimedia';
  }
  if (host === 'unsplash.com' || host.endsWith('.unsplash.com')) return 'unsplash';
  if (host === 'nasa.gov' || host.endsWith('.nasa.gov')) return 'nasa';
  return null;
}

function providerFromUrl(raw: string | null | undefined): MediaProviderId | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return providerFromHost(parsed.hostname);
  } catch {
    return providerFromHost(trimmed);
  }
}

function providerFromDeclared(raw: string | null | undefined): MediaProviderId | null {
  const token = (raw || '').trim().toLowerCase();
  if (!token) return null;
  if (token === 'giphy' || token.includes('giphy')) return 'giphy';
  if (token === 'pexels' || token.includes('pexels')) return 'pexels';
  if (token === 'pixabay' || token.includes('pixabay')) return 'pixabay';
  if (token === 'wikimedia' || token === 'commons' || token.includes('wikimedia') || token.includes('wikipedia')) {
    return 'wikimedia';
  }
  if (token === 'unsplash' || token.includes('unsplash')) return 'unsplash';
  if (token === 'nasa' || token.includes('nasa')) return 'nasa';
  return null;
}

function toProvider(id: MediaProviderId): MediaProvider {
  return { id, label: PROVIDER_LABEL[id] };
}

/**
 * Resolves the media host actually used by a card.
 * A URL match always wins over a declared provider that disagrees with it.
 * Unknown or missing media returns null — never a Giphy default.
 */
export function detectMediaProvider(card: DetectableMediaCard | null | undefined): MediaProvider | null {
  if (!card) return null;
  const urls = [card.videoUrl, card.mediaUrl, card.imageUrl, card.gifUrl, card.posterUrl];
  let fromUrl: MediaProviderId | null = null;
  for (const url of urls) {
    const found = providerFromUrl(url);
    if (found) {
      fromUrl = found;
      break;
    }
  }
  const declared =
    providerFromDeclared(card.mediaProvider) ||
    providerFromDeclared(card.videoProvider) ||
    providerFromDeclared(card.mediaSource);
  if (fromUrl && declared && declared !== fromUrl) return toProvider(fromUrl);
  if (fromUrl) return toProvider(fromUrl);
  if (declared) return toProvider(declared);
  return null;
}

export function mediaCreditLine(provider: MediaProvider | null, lang: 'tr' | 'en'): string | null {
  if (!provider) return null;
  if (provider.id === 'giphy') {
    return lang === 'tr' ? 'Medya: Giphy (Powered by Giphy)' : 'Media: Giphy (Powered by Giphy)';
  }
  return lang === 'tr' ? `Medya: ${provider.label}` : `Media: ${provider.label}`;
}
