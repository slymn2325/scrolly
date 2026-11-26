import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { isLocalHostname } from '@/lib/originPolicy';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import {
  buildStoryEmbedArtifacts,
  deleteStory,
  getStoryById,
  getStoryQuotaSummary,
  incrementStoryCompletions,
  isValidStoryId,
  updateStory,
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_get:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const { id } = await context.params;
  if (!isValidStoryId(id)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const viewDedupe = checkRateLimit(`stories_view:${ip}:${id.trim()}`, 1, 5 * 60_000);

  try {
    const story = await getStoryById(id, { incrementViews: false });
    if (!story) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    if (story.isPublic === false) {
      const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
      if (!sessionUser || sessionUser.id !== story.ownerUserId) {
        return NextResponse.json(
          { ok: false, error: 'not_found' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json({ ok: true, story }, { headers: NO_STORE_HEADERS });
    }
    const publishedStory = viewDedupe.allowed
      ? (await getStoryById(id, { incrementViews: true, publicOnly: true })) ?? story
      : story;
    return NextResponse.json({ ok: true, story: publishedStory }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[GET /api/stories/[id]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

/**
 * Public iframe completion ping — intentionally exempt from same-origin enforcement
 * so 3rd-party `<iframe>` embeds can record story completions without 403 errors.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidStoryId(id)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_complete:${ip}:${id.trim()}`, 6, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const updated = await incrementStoryCompletions(id);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[POST /api/stories/[id]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_complete_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { id } = await context.params;
  if (!isValidStoryId(id)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_update:${user.id}:${ip}`, 30, 60_000);
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
    const result = await updateStory(id, user.id, {
      title: body.title,
      sourceUrl: body.sourceUrl,
      language: body.language,
      theme: body.theme,
      cards: body.cards,
      isPublic: body.isPublic,
      allowEmbed: body.allowEmbed,
      allowedEmbedDomains: body.allowedEmbedDomains,
    });

    if (!result.ok) {
      const status =
        result.error === 'not_found' ? 404 : result.error === 'forbidden' ? 403 : 400;
      return NextResponse.json(
        { ok: false, error: result.error },
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
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('[PUT /api/stories/[id]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_update_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { id } = await context.params;
  if (!isValidStoryId(id)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_delete:${user.id}:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  try {
    const result = await deleteStory(id, user.id);
    if (!result.ok) {
      const status = result.error === 'not_found' ? 404 : 403;
      return NextResponse.json(
        { ok: false, error: result.error },
        { status, headers: NO_STORE_HEADERS }
      );
    }
    const quota = await getStoryQuotaSummary(user.id);
    return NextResponse.json({ ok: true, quota }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[DELETE /api/stories/[id]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_delete_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
