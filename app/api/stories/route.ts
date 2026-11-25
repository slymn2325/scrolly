import { NextResponse } from 'next/server';
import { isLocalHostname } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import { buildStoryEmbedArtifacts, createStory } from '@/lib/stories';

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

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_create:${ip}`, 20, 60_000);
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
      title: body.title,
      sourceUrl: body.sourceUrl,
      language: body.language,
      theme: body.theme,
      cards: body.cards,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

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
