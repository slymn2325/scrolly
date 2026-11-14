import { NextResponse } from 'next/server';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENT_TYPES = new Set([
  'like',
  'unlike',
  'quick_guess',
  'detail_open',
  'card_dwell',
  'share',
  'duel',
  'profile_sync',
]);

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

export async function POST(request: Request) {
  let body: IncomingEventsPayload;
  try {
    body = (await request.json()) as IncomingEventsPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const rawList: IncomingEventItem[] = Array.isArray(body.events)
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
      ];

  const validEvents = rawList
    .map((item) => ({
      device_id: String(item.device_id || body.device_id || '').trim().slice(0, 128),
      fact_slug: String(item.fact_slug || '').trim().slice(0, 200),
      category: String(item.category || 'general').trim().slice(0, 64),
      event_type: String(item.event_type || '').trim(),
      meta:
        item.meta && typeof item.meta === 'object' && !Array.isArray(item.meta)
          ? item.meta
          : {},
      xp: typeof item.xp === 'number' && Number.isFinite(item.xp) ? Math.max(0, Math.floor(item.xp)) : undefined,
      streak:
        typeof item.streak === 'number' && Number.isFinite(item.streak)
          ? Math.max(0, Math.floor(item.streak))
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

    let latestDeviceId = String(body.device_id || '').trim().slice(0, 128);
    let latestUsername =
      typeof body.username === 'string' && body.username.trim()
        ? body.username.trim().slice(0, 64)
        : undefined;
    let latestXp =
      typeof body.xp === 'number' && Number.isFinite(body.xp)
        ? Math.max(0, Math.floor(body.xp))
        : undefined;
    let latestStreak =
      typeof body.streak === 'number' && Number.isFinite(body.streak)
        ? Math.max(0, Math.floor(body.streak))
        : undefined;

    for (const ev of validEvents) {
      if (!latestDeviceId) latestDeviceId = ev.device_id;
      if (typeof ev.xp === 'number') latestXp = Math.max(latestXp ?? 0, ev.xp);
      if (typeof ev.streak === 'number') latestStreak = Math.max(latestStreak ?? 0, ev.streak);
      if (ev.username) latestUsername = ev.username;

      if (ev.event_type !== 'profile_sync' && ev.fact_slug) {
        await pool.query(
          `INSERT INTO fact_events (device_id, fact_slug, category, event_type, meta)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [ev.device_id, ev.fact_slug, ev.category, ev.event_type, JSON.stringify(ev.meta)]
        );
        processed += 1;

        if (ev.event_type === 'like') {
          const res = await pool.query<{ slug: string; likes_count: number }>(
            `UPDATE facts
             SET likes_count = COALESCE(likes_count, 0) + 1
             WHERE slug = $1
             RETURNING slug, likes_count`,
            [ev.fact_slug]
          );
          if (res.rows[0]) {
            likesMap[res.rows[0].slug] = Number(res.rows[0].likes_count ?? 0);
          }
        } else if (ev.event_type === 'unlike') {
          const res = await pool.query<{ slug: string; likes_count: number }>(
            `UPDATE facts
             SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
             WHERE slug = $1
             RETURNING slug, likes_count`,
            [ev.fact_slug]
          );
          if (res.rows[0]) {
            likesMap[res.rows[0].slug] = Number(res.rows[0].likes_count ?? 0);
          }
        }
      }
    }

    if (
      latestDeviceId &&
      (typeof latestXp === 'number' || typeof latestStreak === 'number')
    ) {
      await pool.query(
        `INSERT INTO profiles (device_id, username, xp, streak, last_active_date, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW())
         ON CONFLICT (device_id) DO UPDATE SET
           username = COALESCE(EXCLUDED.username, profiles.username),
           xp = GREATEST(profiles.xp, EXCLUDED.xp),
           streak = EXCLUDED.streak,
           last_active_date = CURRENT_DATE,
           updated_at = NOW()`,
        [
          latestDeviceId,
          latestUsername || null,
          latestXp ?? 0,
          latestStreak ?? 0,
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      mode: 'postgres',
      processed,
      likesMap,
    });
  } catch (err) {
    console.error('[POST /api/events] Error recording events:', err);
    return NextResponse.json(
      { ok: false, error: 'Database event write failed.' },
      { status: 500 }
    );
  }
}
