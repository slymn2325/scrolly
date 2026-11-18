interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_STORE_ENTRIES = 20_000;
const PURGE_THRESHOLD = 5_000;
const XP_BUDGET_10M_CAP = 600;
const XP_BUDGET_10M_WINDOW_MS = 10 * 60_000;
const XP_BUDGET_24H_CAP = 2_500;
const XP_BUDGET_24H_WINDOW_MS = 24 * 60 * 60_000;

declare global {
  var __scrollyRateLimitStore: Map<string, Bucket> | undefined;
  var __scrollyXpBudgetStore: Map<string, Bucket> | undefined;
}

function getRateLimitStore(): Map<string, Bucket> {
  if (!globalThis.__scrollyRateLimitStore) {
    globalThis.__scrollyRateLimitStore = new Map<string, Bucket>();
  }
  return globalThis.__scrollyRateLimitStore;
}

function getXpBudgetStore(): Map<string, Bucket> {
  if (!globalThis.__scrollyXpBudgetStore) {
    globalThis.__scrollyXpBudgetStore = new Map<string, Bucket>();
  }
  return globalThis.__scrollyXpBudgetStore;
}

function normalizeIp(raw: string): string {
  let cleaned = raw.trim().slice(0, 128);
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.toLowerCase().startsWith('::ffff:')) {
    cleaned = cleaned.slice(7);
  }
  return cleaned;
}

function isIPv4(candidate: string): boolean {
  const parts = candidate.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIPv6(candidate: string): boolean {
  if (!candidate.includes(':') || candidate.length > 45) return false;
  const doubleColons = candidate.match(/::/g);
  if (doubleColons && doubleColons.length > 1) return false;
  return /^[0-9a-f:]+(?:\.\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})?$/i.test(candidate);
}

export function isValidIpAddress(raw: string): boolean {
  const cleaned = normalizeIp(raw);
  if (!cleaned || cleaned.length > 45 || /\s/.test(cleaned)) return false;
  return isIPv4(cleaned) || isIPv6(cleaned);
}

export function extractClientIp(request: Request): string {
  const cfRay = (request.headers.get('cf-ray') || '').trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (
    cfIp &&
    process.env.TRUST_CF_CONNECTING_IP !== 'false' &&
    /^[0-9a-f]{16}-[A-Z]{3}$/i.test(cfRay)
  ) {
    const normalizedCf = normalizeIp(cfIp);
    if (isValidIpAddress(normalizedCf)) {
      return normalizedCf;
    }
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const validIps = forwarded
      .split(',')
      .map((entry) => normalizeIp(entry))
      .filter((entry) => isValidIpAddress(entry));
    if (validIps.length > 0) {
      // Rightmost IP is appended by the trusted reverse proxy (e.g., Heroku Router).
      return validIps[validIps.length - 1];
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    const normalizedReal = normalizeIp(realIp);
    if (isValidIpAddress(normalizedReal)) {
      return normalizedReal;
    }
  }

  return 'unknown';
}

function pruneAndCapStore(store: Map<string, Bucket>, now: number): void {
  if (store.size > PURGE_THRESHOLD) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }
  while (store.size >= MAX_STORE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
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
    pruneAndCapStore(store, now);
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

function readOrInitBudgetBucket(
  store: Map<string, Bucket>,
  key: string,
  windowMs: number,
  now: number
): Bucket {
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    pruneAndCapStore(store, now);
    const fresh: Bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, fresh);
    return fresh;
  }
  return existing;
}

export function consumeXpBudget(deviceId: string, requestedXp: number): number {
  const cleanRequest = Math.max(0, Math.floor(requestedXp));
  if (cleanRequest <= 0) return 0;

  const cleanId = deviceId.trim().slice(0, 128);
  if (!cleanId) return 0;

  const store = getXpBudgetStore();
  const now = Date.now();
  const bucket10m = readOrInitBudgetBucket(
    store,
    `xp_10m:${cleanId}`,
    XP_BUDGET_10M_WINDOW_MS,
    now
  );
  const bucket24h = readOrInitBudgetBucket(
    store,
    `xp_24h:${cleanId}`,
    XP_BUDGET_24H_WINDOW_MS,
    now
  );

  const rem10m = Math.max(0, XP_BUDGET_10M_CAP - bucket10m.count);
  const rem24h = Math.max(0, XP_BUDGET_24H_CAP - bucket24h.count);
  const granted = Math.min(cleanRequest, rem10m, rem24h);

  if (granted > 0) {
    bucket10m.count += granted;
    bucket24h.count += granted;
  }

  return granted;
}
