interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  var __scrollyRateLimitStore: Map<string, Bucket> | undefined;
}

function getRateLimitStore(): Map<string, Bucket> {
  if (!globalThis.__scrollyRateLimitStore) {
    globalThis.__scrollyRateLimitStore = new Map<string, Bucket>();
  }
  return globalThis.__scrollyRateLimitStore;
}

function normalizeIp(raw: string): string {
  const cleaned = raw.trim().slice(0, 128);
  if (cleaned.startsWith('::ffff:')) {
    return cleaned.slice(7);
  }
  return cleaned;
}

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) {
    return normalizeIp(cfIp);
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return normalizeIp(realIp);
  }
  return 'unknown';
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const store = getRateLimitStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    if (store.size > 5000) {
      for (const [k, v] of store) {
        if (now >= v.resetAt) store.delete(k);
      }
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
