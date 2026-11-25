import { NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import { generateStoryDraft } from '@/lib/storyGenerator';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const CLIENT_INPUT_ERRORS = new Set([
  'invalid_url',
  'unsupported_protocol',
  'credentials_not_allowed',
  'port_not_allowed',
  'blocked_private_host',
  'blocked_private_ip',
  'dns_resolution_failed',
  'content_too_short',
]);

export async function POST(request: Request) {
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_generate:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonBodyWithLimit<Record<string, unknown>>(request, 128 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }

  const body = parsed.data;
  const inputType = body.inputType === 'url' ? 'url' : body.inputType === 'text' ? 'text' : null;
  if (!inputType) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input_type' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return NextResponse.json(
      { ok: false, error: 'empty_content' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const language = body.language === 'en' ? 'en' : 'tr';
  const rawCount = Number(body.cardCount);
  const cardCount = Number.isFinite(rawCount) ? Math.max(5, Math.min(7, Math.floor(rawCount))) : 5;

  try {
    const generated = await generateStoryDraft({
      inputType,
      content,
      language,
      cardCount,
    });
    return NextResponse.json(
      {
        ok: true,
        mode: generated.mode,
        draft: generated.draft,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    const code = err instanceof Error ? err.message : 'generation_failed';
    const status = CLIENT_INPUT_ERRORS.has(code) ? 400 : 422;
    return NextResponse.json(
      { ok: false, error: code },
      { status, headers: NO_STORE_HEADERS }
    );
  }
}
