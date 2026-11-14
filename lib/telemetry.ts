'use client';

import type { FactCard } from '@/types/fact';
import { cryptoRandomUuid } from '@/utils/cryptoRandom';

export type TelemetryEventType =
  | 'like'
  | 'unlike'
  | 'quick_guess'
  | 'detail_open'
  | 'card_dwell'
  | 'share'
  | 'duel'
  | 'profile_sync';

export interface ProfileSyncPayload {
  xp?: number;
  streak?: number;
  username?: string;
}

export interface TelemetryEventRecord {
  device_id: string;
  fact_slug: string;
  category: string;
  event_type: TelemetryEventType;
  meta: Record<string, unknown>;
  xp?: number;
  streak?: number;
  username?: string;
  queued_at: string;
}

const DEVICE_ID_STORAGE_KEY = 'scrolly_device_id';
const OFFLINE_QUEUE_STORAGE_KEY = 'scrolly_offline_events';
const CACHED_FACTS_STORAGE_KEY = 'scrolly_cached_facts_v1';
const MAX_OFFLINE_QUEUE_LENGTH = 200;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown> | unknown[]>;
    gtag?: (...args: unknown[]) => void;
  }
}

let syncListenersRegistered = false;
let isFlushingQueue = false;

function generateUuid(): string {
  return cryptoRandomUuid();
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
    const created = generateUuid();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateUuid();
  }
}

function readOfflineQueue(): TelemetryEventRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelemetryEventRecord[]) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: TelemetryEventRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed =
      queue.length > MAX_OFFLINE_QUEUE_LENGTH
        ? queue.slice(queue.length - MAX_OFFLINE_QUEUE_LENGTH)
        : queue;
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota errors in restricted storage environments
  }
}

function enqueueOfflineEvent(record: TelemetryEventRecord): void {
  const queue = readOfflineQueue();
  queue.push(record);
  writeOfflineQueue(queue);
}

export async function flushOfflineEvents(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (isFlushingQueue) return;

  const queue = readOfflineQueue();
  if (queue.length === 0) return;

  isFlushingQueue = true;
  try {
    const deviceId = getOrCreateDeviceId();
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        events: queue,
      }),
      keepalive: true,
    });

    if (res.ok) {
      // Preserve any events queued concurrently while the flush request was in flight
      const latestQueue = readOfflineQueue();
      const remaining = latestQueue.slice(queue.length);
      writeOfflineQueue(remaining);
    }
  } catch {
    // Keep queue intact so the next online trigger retries cleanly
  } finally {
    isFlushingQueue = false;
  }
}

export function initTelemetrySync(): void {
  if (typeof window === 'undefined') return;

  if (!syncListenersRegistered) {
    syncListenersRegistered = true;
    window.addEventListener('online', () => {
      void flushOfflineEvents();
    });
  }

  if (typeof navigator === 'undefined' || navigator.onLine) {
    void flushOfflineEvents();
  }
}

export async function trackEvent(
  factSlug: string,
  category: string,
  eventType: TelemetryEventType,
  meta: Record<string, unknown> = {},
  profileSync?: ProfileSyncPayload
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: `scrolly_${eventType}`,
      fact_slug: factSlug,
      category,
      ...meta,
    });
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventType, {
        fact_slug: factSlug,
        event_category: category,
        ...meta,
      });
    }
  } catch {
    // Ignore third-party tag layer errors cleanly
  }

  const deviceId = getOrCreateDeviceId();
  const record: TelemetryEventRecord = {
    device_id: deviceId,
    fact_slug: factSlug,
    category,
    event_type: eventType,
    meta,
    ...(typeof profileSync?.xp === 'number' ? { xp: profileSync.xp } : {}),
    ...(typeof profileSync?.streak === 'number' ? { streak: profileSync.streak } : {}),
    ...(profileSync?.username ? { username: profileSync.username } : {}),
    queued_at: new Date().toISOString(),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineEvent(record);
    return;
  }

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
    });

    if (!res.ok) {
      enqueueOfflineEvent(record);
      return;
    }

    if (readOfflineQueue().length > 0) {
      void flushOfflineEvents();
    }
  } catch {
    enqueueOfflineEvent(record);
  }
}

export async function fetchFactsFromApiWithCache(): Promise<FactCard[] | null> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/facts', {
      method: 'GET',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { facts?: FactCard[] };
      if (Array.isArray(data.facts) && data.facts.length > 0) {
        try {
          window.localStorage.setItem(CACHED_FACTS_STORAGE_KEY, JSON.stringify(data.facts));
        } catch {
          // Ignore storage quota errors
        }
        return data.facts;
      }
    }
  } catch {
    // Fall through to cached offline facts
  }

  try {
    const cachedRaw = window.localStorage.getItem(CACHED_FACTS_STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as FactCard[];
      }
    }
  } catch {
    // Ignore malformed cache
  }

  return null;
}
