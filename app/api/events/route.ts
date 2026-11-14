import { NextResponse } from 'next/server';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { checkRateLimit, extractClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_BATCH_EVENTS = 50;
const MAX_META_BYTES = 2048;
const MAX_XP_PER_BATCH = 250;

const EVENT_XP_WEIGHTS: Record<string, number> = {
  like: 5,
  unlike: 0,
  quick_guess: 20,
  detail_open: 5,
  card_dwell: 2,
  share: 15,
  duel: 25,
  profile_sync: 0,
};

const ALLOWED_EVENT_TYPES = new Set(Object.keys(EVENT_XP_WEIGHTS));

interface IncomingEventItem {
  device_id?: string;
  fact_slug?: string;
  category?: string;
  event_type?: string;
  meta?: Record<string, unknown>;
  xp?: number;
  streak?: number;
  username?: string;
}

interface IncomingEventsPayload {
  device_id?: string;
  fact_slug?: string;
  category?: string;
  event_type?: string;
  meta?: Record<string, unknown>;
  xp?: number;
  streak?: number;
  username?: string;
  events?: IncomingEventItem[];
}

function sanitizeEventMeta(raw: unknown): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return '{}';
  }
  const serialized = JSON.stringify(raw);
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_META_BYTES) {
    return serialized;
  }
  return JSON.stringify({ truncated: true });
}

export async function POST(request: Request) {
  const clientIp = extractClientIp(request);
  const limitResult = checkRateLimit(`events:${clientIp}`, 120, 60_000);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many event requests. Please slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limitResult.retryAfterSec) },
      }
    );
  }

  let body: IncomingEventsPayload;
  try {
    body = (await request.json()) as IncomingEventsPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const rawList: IncomingEventItem[] = (
    Array.isArray(body.events)
      ? body.events
      : [
          {
            device_id: body.device_id,
            fact_slug: body.fact_slug,
            category: body.category,
            event_type: body.event_type,
            meta: body.meta,
            xp: body.xp,
            streak: body.streak,
            username: body.username,
          },
        ]
  ).slice(0, MAX_BATCH_EVENTS);

  const validEvents = rawList
    .map((item) => ({
      device_id: String(item.device_id || body.device_id || '').trim().slice(0, 128),
      fact_slug: String(item.fact_slug || '').trim().slice(0, 200),
      category: String(item.category || 'general').trim().slice(0, 64),
      event_type: String(item.event_type || '').trim(),
      metaJson: sanitizeEventMeta(item.meta),
      streak:
        typeof item.streak === 'number' && Number.isFinite(item.streak)
          ? Math.min(3650, Math.max(0, Math.floor(item.streak)))
          : undefined,
      username: typeof item.username === 'string' ? item.username.trim().slice(0, 64) : undefined,
    }))
    .filter((ev) => ev.device_id.length > 0 && ALLOWED_EVENT_TYPES.has(ev.event_type));

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ok: true,
      mode: 'local_noop',
      processed: validEvents.length,
      likesMap: {},
    });
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const likesMap: Record<string, number> = {};
    let processed = 0;
    let computedXpDelta = 0;

    let latestDeviceId = String(body.device_id || '').trim().slice(0, 128);
    let latestUsername =
      typeof body.username === 'string' && body.username.trim()
        ? body.username.trim().slice(0, 64)
        : undefined;
    let latestStreak =
      typeof body.streak === 'number' && Number.isFinite(body.streak)
        ? Math.min(3650, Math.max(0, Math.floor(body.streak)))
        : undefined;

    for (const ev of validEvents) {
      if (!latestDeviceId) latestDeviceId = ev.device_id;
      if (typeof ev.streak === 'number') latestStreak = Math.max(latestStreak ?? 0, ev.streak);
      if (ev.username) latestUsername = ev.username;

      if (ev.event_type !== 'profile_sync' && ev.fact_slug) {
        await pool.query(
          `INSERT INTO fact_events (device_id, fact_slug, category, event_type, meta)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [ev.device_id, ev.fact_slug, ev.category, ev.event_type, ev.metaJson]
        );
        processed += 1;

        if (ev.event_type === 'like') {
          const inserted = await pool.query<{ id: number }>(
            `INSERT INTO fact_likes (fact_slug, device_id)
             VALUES ($1, $2)
             ON CONFLICT (fact_slug, device_id) DO NOTHING
             RETURNING id`,
            [ev.fact_slug, ev.device_id]
          );

          if ((inserted.rowCount ?? 0) > 0) {
            computedXpDelta += EVENT_XP_WEIGHTS.like;
            const res = await pool.query<{ slug: string; likes_count: number }>(
              `UPDATE facts
               SET likes_count = COALESCE(likes_count, 0) + 1
               WHERE slug = $1 OR sketch_type = $1
               RETURNING slug, likes_count`,
              [ev.fact_slug]
            );
            if (res.rows[0]) {
              const count = Number(res.rows[0].likes_count ?? 0);
              likesMap[ev.fact_slug] = count;
              likesMap[res.rows[0].slug] = count;
            }
          }
        } else if (ev.event_type === 'unlike') {
          const deleted = await pool.query<{ id: number }>(
            `DELETE FROM fact_likes
             WHERE fact_slug = $1 AND device_id = $2
             RETURNING id`,
            [ev.fact_slug, ev.device_id]
          );

          if ((deleted.rowCount ?? 0) > 0) {
            const res = await pool.query<{ slug: string; likes_count: number }>(
              `UPDATE facts
               SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
               WHERE slug = $1 OR sketch_type = $1
               RETURNING slug, likes_count`,
              [ev.fact_slug]
            );
            if (res.rows[0]) {
              const count = Number(res.rows[0].likes_count ?? 0);
              likesMap[ev.fact_slug] = count;
              likesMap[res.rows[0].slug] = count;
            }
          }
        } else {
          computedXpDelta += EVENT_XP_WEIGHTS[ev.event_type] ?? 0;
        }
      }
    }

    const boundedXpDelta = Math.min(MAX_XP_PER_BATCH, Math.max(0, computedXpDelta));

    if (
      latestDeviceId &&
      (boundedXpDelta > 0 || typeof latestStreak === 'number' || Boolean(latestUsername))
    ) {
      await pool.query(
        `INSERT INTO profiles (device_id, username, xp, weekly_xp, streak, last_active_date, updated_at)
         VALUES ($1, COALESCE($2, 'Merak Kâşifi'), $3, $3, GREATEST($4, 1), CURRENT_DATE, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           username = COALESCE($2, NULLIF(TRIM(profiles.username), ''), 'Merak Kâşifi'),
           xp = COALESCE(profiles.xp, 0) + $3,
           weekly_xp = COALESCE(profiles.weekly_xp, 0) + $3,
           streak = GREATEST(COALESCE(profiles.streak, 1), $4, 1),
           last_active_date = CURRENT_DATE,
           updated_at = NOW()`,
        [latestDeviceId, latestUsername || null, boundedXpDelta, latestStreak ?? 1]
      );
    }

    return NextResponse.json({
      ok: true,
      mode: 'postgres',
      processed,
      likesMap,
      xpAwarded: boundedXpDelta,
    });
  } catch (err) {
    console.error('[POST /api/events] Error recording events:', err);
    return NextResponse.json(
      { ok: false, error: 'Database event write failed.' },
      { status: 500 }
    );
  }
}
