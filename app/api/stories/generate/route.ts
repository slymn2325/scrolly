import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/auth';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';
import { enforceSameOrigin, readJsonBodyWithLimit } from '@/lib/requestSecurity';
import { checkAiGenerationAllowed, consumeAiGenerationCredit } from '@/lib/stories';
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

  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const ip = extractClientIp(request);
  const rl = checkRateLimit(`stories_generate:${user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const quotaCheck = await checkAiGenerationAllowed(user.id);
  if (!quotaCheck.ok) {
    const isCircuitBreaker = quotaCheck.error === 'daily_circuit_breaker';
    return NextResponse.json(
      {
        ok: false,
        error: quotaCheck.error,
        quota: quotaCheck.quota,
        messageTr: isCircuitBreaker
          ? 'Günlük AI kapasitesi doldu, manuel editörle devam edebilirsin.'
          : 'Starter plan aylık 2 AI üretim hakkın doldu. Manuel kart ekleyerek ücretsiz devam edebilirsin.',
        messageEn: isCircuitBreaker
          ? 'Daily AI capacity is full — you can continue creating cards manually.'
          : 'Monthly Starter limit (2 AI generations) reached. Continue creating cards manually for free.',
      },
      { status: 429, headers: NO_STORE_HEADERS }
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
    const updatedQuota = await consumeAiGenerationCredit(user.id);
    return NextResponse.json(
      {
        ok: true,
        mode: generated.mode,
        draft: generated.draft,
        quota: updatedQuota,
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
