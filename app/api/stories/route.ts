import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isLocalHostname } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import {
  buildStoryEmbedArtifacts,
  createStory,
  getStoryQuotaSummary,
  listStoriesByOwner,
} from '@/lib/stories';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function resolveLocalStoryOrigin(request: Request): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  try {
    const parsed = new URL(request.url);
    if (isLocalHostname(parsed.hostname)) {
      return parsed.origin;
    }
  } catch {
    // Fall back to PUBLIC_SITE_ORIGIN
  }
  return undefined;
}

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_list:${user.id}:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const [stories, quota] = await Promise.all([
      listStoriesByOwner(user.id),
      getStoryQuotaSummary(user.id),
    ]);
    return NextResponse.json({ ok: true, stories, quota }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[GET /api/stories] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'stories_fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_create:${user.id}:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 256 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }

  const body = parsed.data;
  try {
    const result = await createStory({
      ownerUserId: user.id,
      title: body.title,
      sourceUrl: body.sourceUrl,
      language: body.language,
      theme: body.theme,
      cards: body.cards,
    });

    if (!result.ok) {
      const quota = await getStoryQuotaSummary(user.id);
      const status = result.error === 'story_limit_reached' ? 403 : 400;
      return NextResponse.json(
        { ok: false, error: result.error, quota },
        { status, headers: NO_STORE_HEADERS }
      );
    }

    const quota = await getStoryQuotaSummary(user.id);
    const { embedUrl, iframeCode } = buildStoryEmbedArtifacts(
      result.story.id,
      result.story.title,
      resolveLocalStoryOrigin(request)
    );

    return NextResponse.json(
      {
        ok: true,
        id: result.story.id,
        embedUrl,
        iframeCode,
        story: result.story,
        quota,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[POST /api/stories] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_create_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
