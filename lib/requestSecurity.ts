import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { shouldUseSecureCookie } from '@/lib/auth';
import { verifySameOriginRequest } from '@/lib/originPolicy';

export const DEVICE_COOKIE_NAME = 'scrolly_device';
export const DUEL_ACTOR_COOKIE_NAME = 'scrolly_actor';
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days
export const DUEL_ACTOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

let weakSecretWarned = false;

export function getSigningSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || '';
  if (secret) {
    if (process.env.NODE_ENV === 'production' && secret.length < 32 && !weakSecretWarned) {
      weakSecretWarned = true;
      console.error(
        '[lib/requestSecurity] AUTH_SECRET/SESSION_SECRET is shorter than 32 characters in production.'
      );
    }
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET (or SESSION_SECRET) must be set in production — refusing insecure signing key.'
    );
  }
  return 'scrolly-dev-otp-pepper';
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

export function signScopedToken(scope: 'device' | 'actor', value: string): string {
  const sig = createHmac('sha256', getSigningSecret())
    .update(`scrolly:${scope}:${value}`)
    .digest('base64url');
  return `${value}.${sig}`;
}

export function verifyScopedToken(
  scope: 'device' | 'actor',
  cookieValue: string | null | undefined
): string | null {
  const raw = String(cookieValue || '').trim();
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!value || !sig) return null;

  const expected = createHmac('sha256', getSigningSecret())
    .update(`scrolly:${scope}:${value}`)
    .digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length === 0 || a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? value : null;
  } catch {
    return null;
  }
}

export function readCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    let raw = trimmed.slice(prefix.length).trim();
    if (!raw) return null;
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Keep raw cookie value if URI decoding fails
    }
    return raw;
  }
  return null;
}

export function readSignedDeviceIdFromRequest(request: Request): string | null {
  const raw = readCookieValue(request, DEVICE_COOKIE_NAME);
  if (!raw) return null;
  const verified = verifyScopedToken('device', raw);
  if (!verified) return null;
  const clean = verified.trim();
  if (clean.length < 4 || clean.length > 128) return null;
  return clean;
}

export function setSignedDeviceCookie(
  response: NextResponse,
  deviceId: string,
  request: Request
): void {
  const clean = deviceId.trim().slice(0, 128);
  if (clean.length < 4) return;
  response.cookies.set(DEVICE_COOKIE_NAME, signScopedToken('device', clean), {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

export function readSignedDuelActorFromRequest(request: Request): string | null {
  const raw = readCookieValue(request, DUEL_ACTOR_COOKIE_NAME);
  if (!raw) return null;
  const verified = verifyScopedToken('actor', raw);
  if (!verified) return null;
  const clean = verified.trim();
  if (clean.length < 8 || clean.length > 128) return null;
  return clean;
}

export function mintDuelActorId(): string {
  return randomBytes(16).toString('base64url');
}

export function setSignedDuelActorCookie(
  response: NextResponse,
  actorId: string,
  request: Request
): void {
  const clean = actorId.trim().slice(0, 128);
  if (clean.length < 8) return;
  response.cookies.set(DUEL_ACTOR_COOKIE_NAME, signScopedToken('actor', clean), {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request),
    path: '/',
    maxAge: DUEL_ACTOR_COOKIE_MAX_AGE,
  });
}

export function computeOpaquePublicLeaderboardId(deviceId: string): string {
  const digest = createHmac('sha256', getSigningSecret())
    .update(`leaderboard-public:${deviceId}`)
    .digest('hex')
    .slice(0, 16);
  return `lb_${digest}`;
}

export function enforceSameOrigin(request: Request): NextResponse | null {
  const verdict = verifySameOriginRequest(request);
  if (verdict.ok) return null;
  return NextResponse.json(
    { ok: false, error: 'forbidden_origin' },
    { status: 403, headers: NO_STORE_HEADERS }
  );
}

export async function readJsonBodyWithLimit<T extends object = Record<string, unknown>>(
  request: Request,
  maxBytes: number,
  options?: { allowEmpty?: boolean }
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: 400 | 413; error: 'invalid_json' | 'payload_too_large' }
> {
  const declaredLen = Number(request.headers.get('content-length') || '');
  if (Number.isFinite(declaredLen) && declaredLen > maxBytes) {
    return { ok: false, status: 413, error: 'payload_too_large' };
  }

  let rawText: string;
  try {
    if (!request.body) {
      rawText = await request.text();
      if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
        return { ok: false, status: 413, error: 'payload_too_large' };
      }
    } else {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.byteLength === 0) continue;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          return { ok: false, status: 413, error: 'payload_too_large' };
        }
        chunks.push(value);
      }

      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      rawText = new TextDecoder('utf-8').decode(combined);
    }
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }

  if (!rawText.trim()) {
    if (options?.allowEmpty) {
      return { ok: true, data: {} as T };
    }
    return { ok: false, status: 400, error: 'invalid_json' };
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'invalid_json' };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }
}

export function verifyAdminBearerSecret(request: Request): boolean {
  const secret =
    process.env.ADMIN_API_SECRET?.trim() || process.env.CRON_SECRET?.trim() || '';
  if (!secret) return false;
  const authHeader = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match?.[1]) return false;
  return timingSafeStringEqual(match[1].trim(), secret);
}
