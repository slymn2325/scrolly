import { lookup } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import {
  ALLOWED_MEDIA_HOSTS,
  buildSafeMediaUrlString,
  isBadMediaUrlRequest,
  isBlockedMediaHost,
} from '@/lib/mediaProxyPolicy';
import { isAllowedOriginUrl } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const MAX_PROXY_MEDIA_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_CONCURRENT_PROXY_STREAMS = 20;
const MAX_REDIRECT_HOPS = 3;
const UPSTREAM_TIMEOUT_MS = 8000;

let activeProxyStreams = 0;

const ALLOWED_MEDIA_MIME_PREFIXES = [
  'image/gif',
  'image/webp',
  'image/png',
  'image/jpeg',
  'video/mp4',
] as const;

function safeMediaFetchUrl(parsed: URL): string | null {
  if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  return buildSafeMediaUrlString(parsed);
}

async function verifyResolvedHostIsPublic(hostname: string): Promise<boolean> {
  if (isBlockedMediaHost(hostname)) return false;
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!Array.isArray(records) || records.length === 0) return false;
    return records.every((entry) => Boolean(entry.address) && !isBlockedMediaHost(entry.address));
  } catch {
    return false;
  }
}

function buildCorsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Cross-Origin-Resource-Policy': 'same-origin',
    Vary: 'Origin',
  };
  const origin = request.headers.get('origin');
  if (origin && isAllowedOriginUrl(origin, request)) {
    try {
      headers['Access-Control-Allow-Origin'] = new URL(origin).origin;
    } catch {
      // Omit ACAO if origin parsing unexpectedly fails
    }
  }
  return headers;
}

function createByteLimitedStream(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  onRelease: () => void
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let totalBytes = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            onRelease();
            controller.close();
            return;
          }
          if (!value || value.byteLength === 0) continue;

          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            onRelease();
            controller.error(new Error('payload_too_large'));
            return;
          }

          controller.enqueue(value);
          return;
        }
      } catch (err) {
        onRelease();
        controller.error(err);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => {});
      onRelease();
    },
  });
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

async function fetchWithSafeRedirects(
  initialUrl: URL
): Promise<
  | { ok: true; response: Response; finalUrl: URL }
  | { ok: false; status: number; error: string }
> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const safeUrl = safeMediaFetchUrl(currentUrl);
    if (!safeUrl) {
      return { ok: false, status: 403, error: 'forbidden_url' };
    }

    const hostIsPublic = await verifyResolvedHostIsPublic(currentUrl.hostname);
    if (!hostIsPublic) {
      return { ok: false, status: 403, error: 'forbidden_url' };
    }

    const res = await fetch(safeUrl, {
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
        redirectedUrl = new URL(location, safeUrl);
      } catch {
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }

      if (!safeMediaFetchUrl(redirectedUrl)) {
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }

      currentUrl = redirectedUrl;
      continue;
    }

    if (res.url) {
      try {
        const resolvedUrl = new URL(res.url);
        if (!safeMediaFetchUrl(resolvedUrl)) {
          await res.body?.cancel().catch(() => {});
          return { ok: false, status: 403, error: 'forbidden_redirect_target' };
        }
      } catch {
        await res.body?.cancel().catch(() => {});
        return { ok: false, status: 403, error: 'forbidden_redirect_target' };
      }
    }

    return { ok: true, response: res, finalUrl: new URL(safeUrl) };
  }

  return { ok: false, status: 502, error: 'too_many_redirects' };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...buildCorsHeaders(request),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function GET(request: Request) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`media_proxy:${ip}`, 60, 60_000);
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

  if (isBadMediaUrlRequest(targetUrl)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_url' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!safeMediaFetchUrl(targetUrl)) {
    return NextResponse.json(
      { ok: false, error: 'forbidden_url' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  if (activeProxyStreams >= MAX_CONCURRENT_PROXY_STREAMS) {
    return NextResponse.json(
      { ok: false, error: 'proxy_busy' },
      { status: 503, headers: { ...NO_STORE_HEADERS, 'Retry-After': '5' } }
    );
  }

  activeProxyStreams += 1;
  let slotReleased = false;
  const releaseSlot = () => {
    if (!slotReleased) {
      slotReleased = true;
      activeProxyStreams = Math.max(0, activeProxyStreams - 1);
    }
  };

  try {
    const fetchResult = await fetchWithSafeRedirects(targetUrl);
    if (!fetchResult.ok) {
      releaseSlot();
      return NextResponse.json(
        { ok: false, error: fetchResult.error },
        { status: fetchResult.status, headers: NO_STORE_HEADERS }
      );
    }

    const upstream = fetchResult.response;
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      releaseSlot();
      return NextResponse.json(
        { ok: false, error: 'upstream_failed' },
        { status: upstream.status === 404 ? 404 : 502, headers: NO_STORE_HEADERS }
      );
    }

    const declaredLength = Number(upstream.headers.get('content-length') || '');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_MEDIA_BYTES) {
      await upstream.body?.cancel().catch(() => {});
      releaseSlot();
      return NextResponse.json(
        { ok: false, error: 'payload_too_large' },
        { status: 413, headers: NO_STORE_HEADERS }
      );
    }

    const rawContentType = (upstream.headers.get('content-type') || '').trim().toLowerCase();
    const resolvedContentType = rawContentType.split(';')[0].trim();

    if (
      !resolvedContentType ||
      !ALLOWED_MEDIA_MIME_PREFIXES.some((prefix) => resolvedContentType.startsWith(prefix))
    ) {
      await upstream.body?.cancel().catch(() => {});
      releaseSlot();
      return NextResponse.json(
        { ok: false, error: 'unsupported_media_type' },
        { status: 415, headers: NO_STORE_HEADERS }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': resolvedContentType,
      ...buildCorsHeaders(request),
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

    if (upstream.body) {
      const limitedStream = createByteLimitedStream(
        upstream.body,
        MAX_PROXY_MEDIA_BYTES,
        releaseSlot
      );
      return new NextResponse(limitedStream, { status: 200, headers });
    }

    try {
      const mediaBuffer = await upstream.arrayBuffer();
      if (mediaBuffer.byteLength > MAX_PROXY_MEDIA_BYTES) {
        return NextResponse.json(
          { ok: false, error: 'payload_too_large' },
          { status: 413, headers: NO_STORE_HEADERS }
        );
      }
      return new NextResponse(mediaBuffer, { status: 200, headers });
    } finally {
      releaseSlot();
    }
  } catch (err) {
    releaseSlot();
    console.error('[API /api/media-proxy] Upstream error:', err);
    return NextResponse.json(
      { ok: false, error: 'proxy_fetch_failed' },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
