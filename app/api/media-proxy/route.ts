import { NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const MAX_PROXY_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_REDIRECT_HOPS = 3;
const UPSTREAM_TIMEOUT_MS = 8000;

const ALLOWED_MEDIA_MIME_PREFIXES = [
  'image/gif',
  'image/webp',
  'image/png',
  'image/jpeg',
  'video/mp4',
] as const;

function isAllowedGiphyProxyUrl(parsed: URL): boolean {
  if (parsed.protocol !== 'https:') return false;
  if (parsed.port !== '') return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (!host || host.includes('..') || !/^[a-z0-9.-]+$/.test(host)) {
    return false;
  }
  return (
    host === 'giphy.com' ||
    (host.endsWith('.giphy.com') && host.length > '.giphy.com'.length)
  );
}

function resolveExtensionFromMime(mimeType: string): string {
  if (mimeType.startsWith('image/webp')) return '.webp';
  if (mimeType.startsWith('image/png')) return '.png';
  if (mimeType.startsWith('image/jpeg')) return '.jpg';
  if (mimeType.startsWith('video/mp4')) return '.mp4';
  return '.gif';
}

function buildDownloadFilename(
  rawFilename: string | null,
  targetUrl: URL,
  mimeType: string
): string {
  const ext = resolveExtensionFromMime(mimeType);
  const candidate = (rawFilename || '')
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  if (candidate) {
    return `${candidate}${ext}`;
  }

  const segments = targetUrl.pathname.split('/').filter(Boolean);
  const mediaSegment = segments.length >= 2 && segments[0] === 'media' ? segments[1] : '';
  const cleanSegment = mediaSegment
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  return cleanSegment ? `scrolly-${cleanSegment}${ext}` : `scrolly-gif${ext}`;
}

async function readResponseBufferWithLimit(
  response: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  if (!response.body) {
    const ab = await response.arrayBuffer();
    return ab.byteLength <= maxBytes ? ab : null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const buffer = new ArrayBuffer(totalBytes);
  const combined = new Uint8Array(buffer);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

async function fetchWithSafeRedirects(
  initialUrl: URL
): Promise<
  | { ok: true; response: Response; finalUrl: URL }
  | { ok: false; status: number; error: string }
> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const res = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        Accept: 'image/gif,image/webp,image/png,image/jpeg,video/mp4,*/*;q=0.8',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel().catch(() => {});
      const location = res.headers.get('location');
      if (!location) {
        return { ok: false, status: 502, error: 'invalid_redirect' };
      }

      let redirectedUrl: URL;
      try {
        redirectedUrl = new URL(location, currentUrl);
      } catch {
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }

      if (!isAllowedGiphyProxyUrl(redirectedUrl)) {
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }

      currentUrl = redirectedUrl;
      continue;
    }

    if (res.url) {
      try {
        const resolvedUrl = new URL(res.url);
        if (!isAllowedGiphyProxyUrl(resolvedUrl)) {
          await res.body?.cancel().catch(() => {});
          return { ok: false, status: 403, error: 'forbidden_redirect_target' };
        }
        return { ok: true, response: res, finalUrl: resolvedUrl };
      } catch {
        await res.body?.cancel().catch(() => {});
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }
    }

    return { ok: true, response: res, finalUrl: currentUrl };
  }

  return { ok: false, status: 502, error: 'too_many_redirects' };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`media_proxy:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const reqUrl = new URL(request.url);
  const rawTarget = (reqUrl.searchParams.get('url') || '').trim();
  if (!rawTarget) {
    return NextResponse.json(
      { ok: false, error: 'missing_url' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawTarget);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_url' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!isAllowedGiphyProxyUrl(targetUrl)) {
    return NextResponse.json(
      { ok: false, error: 'forbidden_url' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const fetchResult = await fetchWithSafeRedirects(targetUrl);
    if (!fetchResult.ok) {
      return NextResponse.json(
        { ok: false, error: fetchResult.error },
        { status: fetchResult.status, headers: NO_STORE_HEADERS }
      );
    }

    const upstream = fetchResult.response;
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'upstream_failed', upstreamStatus: upstream.status },
        { status: upstream.status === 404 ? 404 : 502, headers: NO_STORE_HEADERS }
      );
    }

    const declaredLength = Number(upstream.headers.get('content-length') || '');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_MEDIA_BYTES) {
      await upstream.body?.cancel().catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'payload_too_large' },
        { status: 413, headers: NO_STORE_HEADERS }
      );
    }

    const rawContentType = (upstream.headers.get('content-type') || '').trim().toLowerCase();
    const cleanContentType = rawContentType.split(';')[0].trim();
    const resolvedContentType = cleanContentType || 'image/gif';

    if (
      !ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => resolvedContentType.startsWith(prefix))
    ) {
      await upstream.body?.cancel().catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'unsupported_media_type' },
        { status: 415, headers: NO_STORE_HEADERS }
      );
    }

    const mediaBuffer = await readResponseBufferWithLimit(upstream, MAX_PROXY_MEDIA_BYTES);
    if (!mediaBuffer) {
      return NextResponse.json(
        { ok: false, error: 'payload_too_large' },
        { status: 413, headers: NO_STORE_HEADERS }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': resolvedContentType,
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
    };

    const downloadParam = reqUrl.searchParams.get('download');
    if (downloadParam === '1' || downloadParam === 'true') {
      const filename = buildDownloadFilename(
        reqUrl.searchParams.get('filename'),
        fetchResult.finalUrl,
        resolvedContentType
      );
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(mediaBuffer, { status: 200, headers });
  } catch (err) {
    console.error('[API /api/media-proxy] Upstream error:', err);
    return NextResponse.json(
      { ok: false, error: 'proxy_fetch_failed' },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
