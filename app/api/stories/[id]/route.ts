import { NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin } from '@/lib/requestSecurity';
import { getStoryById, incrementStoryCompletions, isValidStoryId } from '@/lib/stories';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

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
    const story = await getStoryById(id, { incrementViews: viewDedupe.allowed });
    if (!story) {
      return NextResponse.json(
        { ok: false, error: 'not_found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json({ ok: true, story }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('[GET /api/stories/[id]] Failed:', err);
    return NextResponse.json(
      { ok: false, error: 'story_fetch_failed' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const { id } = await context.params;
  if (!isValidStoryId(id)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_complete:${ip}:${id.trim()}`, 10, 60_000);
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
