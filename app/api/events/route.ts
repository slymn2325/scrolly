import { NextResponse } from 'next/server';
import { getVocabularyFacts } from '@/data/vocabularyFacts';
import { getSessionUserFromRequest, syncAuthenticatedUserFromEvents } from '@/lib/auth';
import { ensureSchema, getPool, hasDatabaseUrl, loadSeedFactsFromDisk } from '@/lib/db';
import { getProfileByDeviceId, isValidDeviceId } from '@/lib/dbActions';
import { sanitizeDisplayText } from '@/lib/originPolicy';
import { checkRateLimit, consumeXpBudget, extractClientIp } from '@/lib/rateLimit';
import {
  enforceSameOrigin,
  readJsonBodyWithLimit,
  readSignedDeviceIdFromRequest,
  setSignedDeviceCookie,
} from '@/lib/requestSecurity';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const MAX_BATCH_EVENTS = 50;
const MAX_META_BYTES = 2048;
const MAX_XP_PER_BATCH = 150;

let cachedStaticSlugs: Set<string> | null = null;

function getStaticKnownSlugs(): Set<string> {
  if (cachedStaticSlugs) return cachedStaticSlugs;
  const out = new Set<string>();
  for (const fact of loadSeedFactsFromDisk()) {
    if (fact.id) out.add(fact.id);
    if (fact.slug) out.add(fact.slug);
    if (fact.sketchType) out.add(fact.sketchType);
    if (fact.tr?.slug) out.add(fact.tr.slug);
    if (fact.en?.slug) out.add(fact.en.slug);
  }
  for (const vocab of getVocabularyFacts()) {
    if (vocab.id) out.add(vocab.id);
    if (vocab.word) out.add(vocab.word);
  }
  cachedStaticSlugs = out;
  return out;
}

const EVENT_XP_WEIGHTS: Record<string, number> = {
  view: 15,
  card_dwell: 15,
  like: 5,
  unlike: 0,
  save: 10,
  unsave: 0,
  expand: 0,
  quick_guess: 20,
  guess: 20,
  quiz_answer: 15,
  detail_open: 5,
  share: 15,
  duel: 25,
  profile_sync: 0,
};

/** Event types that award XP at most once per (device, fact_slug, type). */
const XP_ONCE_EVENT_TYPES = new Set([
  'view',
  'card_dwell',
  'save',
  'quick_guess',
  'guess',
  'quiz_answer',
  'detail_open',
  'share',
  'duel',
]);

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
  const originErr = enforceSameOrigin(request);
  if (originErr) return originErr;

  const clientIp = extractClientIp(request);
  const limitResult = checkRateLimit(`events:${clientIp}`, 120, 60_000);
  if (!limitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many event requests. Please slow down.' },
      {
        status: 429,
        headers: { ...NO_STORE_HEADERS, 'Retry-After': String(limitResult.retryAfterSec) },
      }
    );
  }

  const parsed = await readJsonBodyWithLimit<IncomingEventsPayload>(request, 64 * 1024);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.status === 413 ? 'Events payload too large.' : 'Invalid JSON request body.',
      },
      { status: parsed.status, headers: NO_STORE_HEADERS }
    );
  }
  const body = parsed.data;

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
            username: body.username,
          },
        ]
  ).slice(0, MAX_BATCH_EVENTS);

  const bodyDeviceId = isValidDeviceId(body.device_id)
    ? body.device_id.trim().slice(0, 128)
    : '';
  const firstItemDeviceId =
    rawList
      .map((item) => (typeof item.device_id === 'string' ? item.device_id.trim().slice(0, 128) : ''))
      .find((id) => isValidDeviceId(id)) || '';
  const targetDeviceId = bodyDeviceId || firstItemDeviceId;

  if (!isValidDeviceId(targetDeviceId)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_device_id' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const boundDeviceId = readSignedDeviceIdFromRequest(request);
  const sessionUser = await getSessionUserFromRequest(request).catch(() => null);
  const existing = await getProfileByDeviceId(targetDeviceId).catch(() => ({
    persisted: false,
    profile: null,
  }));

  if (
    (existing.profile?.userId && sessionUser?.id !== existing.profile.userId) ||
    (boundDeviceId &&
      boundDeviceId !== targetDeviceId &&
      !(
        sessionUser &&
        (existing.profile?.userId === sessionUser.id ||
          sessionUser.linkedDeviceIds.includes(targetDeviceId))
      ))
  ) {
    return NextResponse.json(
      { ok: false, error: 'forbidden' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const shouldBindCookie =
    !boundDeviceId && (!existing.profile?.userId || existing.profile.userId === sessionUser?.id);

  const validEvents = rawList
    .filter((item) => {
      if (typeof item.device_id === 'string' && item.device_id.trim().length > 0) {
        return item.device_id.trim().slice(0, 128) === targetDeviceId;
      }
      return true;
    })
    .map((item) => ({
      device_id: targetDeviceId,
      fact_slug: String(item.fact_slug || '').trim().slice(0, 200),
      category: String(item.category || 'general').trim().slice(0, 64),
      event_type: String(item.event_type || '').trim(),
      rawMeta:
        item.meta && typeof item.meta === 'object' && !Array.isArray(item.meta)
          ? (item.meta as Record<string, unknown>)
          : undefined,
      metaJson: sanitizeEventMeta(item.meta),
      username:
        typeof item.username === 'string'
          ? sanitizeDisplayText(item.username, 28) || undefined
          : undefined,
    }))
    .filter((ev) => ALLOWED_EVENT_TYPES.has(ev.event_type));

  let latestUsername =
    typeof body.username === 'string'
      ? sanitizeDisplayText(body.username, 28) || undefined
      : undefined;

  const resolvedUserId = sessionUser?.id ?? existing.profile?.userId ?? null;
  const knownSlugs = new Set<string>(getStaticKnownSlugs());
  const addedLikes: string[] = [];
  const removedLikes: string[] = [];
  const addedSaves: string[] = [];
  const removedSaves: string[] = [];
  const viewedSlugs: string[] = [];

  if (!hasDatabaseUrl()) {
    let memXpDelta = 0;
    const seenInBatch = new Set<string>();
    for (const ev of validEvents) {
      if (ev.username) latestUsername = ev.username;
      const isKnownSlug = Boolean(ev.fact_slug && knownSlugs.has(ev.fact_slug));
      if (!isKnownSlug) continue;

      if (ev.event_type === 'like') {
        addedLikes.push(ev.fact_slug);
        if (!seenInBatch.has(`like:${ev.fact_slug}`)) {
          seenInBatch.add(`like:${ev.fact_slug}`);
          memXpDelta += EVENT_XP_WEIGHTS.like ?? 0;
        }
      } else if (ev.event_type === 'unlike') {
        removedLikes.push(ev.fact_slug);
      } else if (ev.event_type === 'save') {
        addedSaves.push(ev.fact_slug);
        if (!seenInBatch.has(`save:${ev.fact_slug}`)) {
          seenInBatch.add(`save:${ev.fact_slug}`);
          memXpDelta += EVENT_XP_WEIGHTS.save ?? 0;
        }
      } else if (ev.event_type === 'unsave') {
        removedSaves.push(ev.fact_slug);
      } else if (ev.event_type === 'view' || ev.event_type === 'card_dwell') {
        viewedSlugs.push(ev.fact_slug);
        if (!seenInBatch.has(`view:${ev.fact_slug}`)) {
          seenInBatch.add(`view:${ev.fact_slug}`);
          memXpDelta += EVENT_XP_WEIGHTS.view ?? 0;
        }
      } else if (ev.event_type === 'quiz_answer') {
        const shouldAward =
          ev.rawMeta?.correct === true && ev.rawMeta?.award_xp === true;
        if (shouldAward && !seenInBatch.has(`quiz_answer:${ev.fact_slug}`)) {
          seenInBatch.add(`quiz_answer:${ev.fact_slug}`);
          memXpDelta += EVENT_XP_WEIGHTS.quiz_answer ?? 0;
        }
      } else if (ev.event_type === 'quick_guess' || ev.event_type === 'guess') {
        if (!seenInBatch.has(`guess:${ev.fact_slug}`)) {
          seenInBatch.add(`guess:${ev.fact_slug}`);
          const rawAward = Number(ev.rawMeta?.xp_awarded);
          const guessXp =
            Number.isFinite(rawAward) && rawAward >= 0
              ? Math.min(20, Math.floor(rawAward))
              : EVENT_XP_WEIGHTS.quick_guess;
          memXpDelta += guessXp;
        }
      } else if (ev.event_type !== 'profile_sync' && ev.event_type !== 'expand') {
        const key = `${ev.event_type}:${ev.fact_slug}`;
        if (!XP_ONCE_EVENT_TYPES.has(ev.event_type) || !seenInBatch.has(key)) {
          seenInBatch.add(key);
          memXpDelta += EVENT_XP_WEIGHTS[ev.event_type] ?? 0;
        }
      }
    }
    const boundedMemXp = Math.min(MAX_XP_PER_BATCH, consumeXpBudget(targetDeviceId, memXpDelta));

    if (
      sessionUser &&
      (boundedMemXp > 0 ||
        addedLikes.length > 0 ||
        removedLikes.length > 0 ||
        addedSaves.length > 0 ||
        removedSaves.length > 0 ||
        viewedSlugs.length > 0 ||
        Boolean(latestUsername))
    ) {
      await syncAuthenticatedUserFromEvents({
        userId: sessionUser.id,
        deviceId: targetDeviceId,
        xpDelta: boundedMemXp,
        username: latestUsername,
        addedLikes,
        removedLikes,
        addedFavorites: addedSaves,
        removedFavorites: removedSaves,
        addedSeenIds: viewedSlugs,
      }).catch(() => {});
    }

    const response = NextResponse.json(
      {
        ok: true,
        processed: validEvents.length,
        likesMap: {},
        xpAwarded: boundedMemXp,
      },
      { headers: NO_STORE_HEADERS }
    );
    if (shouldBindCookie) {
      setSignedDeviceCookie(response, targetDeviceId, request);
    }
    return response;
  }

  try {
    await ensureSchema();
    const pool = getPool();

    const unknownSlugs = Array.from(
      new Set(
        validEvents
          .map((ev) => ev.fact_slug)
          .filter((slug) => Boolean(slug) && !knownSlugs.has(slug))
      )
    );
    if (unknownSlugs.length > 0) {
      const [dbFacts, dbVocab] = await Promise.all([
        pool.query<{ matched: string }>(
          `SELECT slug AS matched FROM facts WHERE slug = ANY($1::text[])
           UNION
           SELECT sketch_type AS matched FROM facts WHERE sketch_type = ANY($1::text[])
           UNION
           SELECT id::text AS matched FROM facts WHERE id::text = ANY($1::text[])`,
          [unknownSlugs]
        ),
        pool.query<{ matched: string }>(
          `SELECT id AS matched FROM vocabulary_cards WHERE id = ANY($1::text[])
           UNION
           SELECT word AS matched FROM vocabulary_cards WHERE word = ANY($1::text[])`,
          [unknownSlugs]
        ),
      ]);
      for (const row of [...dbFacts.rows, ...dbVocab.rows]) {
        if (row.matched) knownSlugs.add(row.matched);
      }
    }

    const likesMap: Record<string, number> = {};
    let processed = 0;
    let computedXpDelta = 0;

    for (const ev of validEvents) {
      if (ev.username) latestUsername = ev.username;

      if (ev.event_type !== 'profile_sync' && ev.fact_slug) {
        const isKnownSlug = knownSlugs.has(ev.fact_slug);
        if (!isKnownSlug) continue;

        let alreadyLikedBefore = false;
        if (ev.event_type === 'like') {
          const prevLike = await pool.query<{ id: number }>(
            `SELECT id FROM fact_events
             WHERE device_id = $1 AND fact_slug = $2 AND event_type = 'like'
             LIMIT 1`,
            [ev.device_id, ev.fact_slug]
          );
          alreadyLikedBefore = (prevLike.rowCount ?? 0) > 0;
        }

        let alreadySavedBefore = false;
        if (ev.event_type === 'save') {
          const prevSave = await pool.query<{ id: number }>(
            `SELECT id FROM fact_events
             WHERE device_id = $1 AND fact_slug = $2 AND event_type = 'save'
             LIMIT 1`,
            [ev.device_id, ev.fact_slug]
          );
          alreadySavedBefore = (prevSave.rowCount ?? 0) > 0;
        }

        let alreadyViewedBefore = false;
        if (ev.event_type === 'view' || ev.event_type === 'card_dwell') {
          const prevView = await pool.query<{ id: number }>(
            `SELECT id FROM fact_events
             WHERE device_id = $1 AND fact_slug = $2 AND event_type IN ('view', 'card_dwell')
             LIMIT 1`,
            [ev.device_id, ev.fact_slug]
          );
          alreadyViewedBefore = (prevView.rowCount ?? 0) > 0;
        }

        let eventInserted = true;
        if (XP_ONCE_EVENT_TYPES.has(ev.event_type) && ev.event_type !== 'quiz_answer') {
          const insertedEv = await pool.query<{ id: number }>(
            `INSERT INTO fact_events (device_id, user_id, fact_slug, category, event_type, meta)
             SELECT $1, $2, $3, $4, $5, $6::jsonb
             WHERE NOT EXISTS (
               SELECT 1 FROM fact_events
               WHERE device_id = $1 AND fact_slug = $3 AND event_type = $5
             )
             RETURNING id`,
            [ev.device_id, resolvedUserId, ev.fact_slug, ev.category, ev.event_type, ev.metaJson]
          );
          eventInserted = (insertedEv.rowCount ?? 0) > 0;
        } else {
          await pool.query(
            `INSERT INTO fact_events (device_id, user_id, fact_slug, category, event_type, meta)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            [ev.device_id, resolvedUserId, ev.fact_slug, ev.category, ev.event_type, ev.metaJson]
          );
        }
        if (eventInserted) processed += 1;

        if (ev.event_type === 'like') {
          addedLikes.push(ev.fact_slug);
          const inserted = await pool.query<{ id: number }>(
            `INSERT INTO fact_likes (fact_slug, device_id)
             VALUES ($1, $2)
             ON CONFLICT (fact_slug, device_id) DO NOTHING
             RETURNING id`,
            [ev.fact_slug, ev.device_id]
          );

          if ((inserted.rowCount ?? 0) > 0) {
            if (!alreadyLikedBefore) {
              computedXpDelta += EVENT_XP_WEIGHTS.like;
            }
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
          removedLikes.push(ev.fact_slug);
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
        } else if (ev.event_type === 'save') {
          addedSaves.push(ev.fact_slug);
          if (!alreadySavedBefore && eventInserted) {
            computedXpDelta += EVENT_XP_WEIGHTS.save;
          }
        } else if (ev.event_type === 'unsave') {
          removedSaves.push(ev.fact_slug);
        } else if (ev.event_type === 'view' || ev.event_type === 'card_dwell') {
          viewedSlugs.push(ev.fact_slug);
          if (!alreadyViewedBefore && eventInserted) {
            computedXpDelta += EVENT_XP_WEIGHTS.view;
          }
        } else if (ev.event_type === 'quiz_answer') {
          const shouldAward =
            ev.rawMeta?.correct === true && ev.rawMeta?.award_xp === true;
          if (shouldAward) {
            const prevQuizXp = await pool.query<{ id: number }>(
              `SELECT id FROM fact_events
               WHERE device_id = $1
                 AND fact_slug = $2
                 AND event_type = 'quiz_answer'
                 AND (meta->>'correct') = 'true'
                 AND (meta->>'award_xp') = 'true'
               LIMIT 2`,
              [ev.device_id, ev.fact_slug]
            );
            if ((prevQuizXp.rowCount ?? 0) <= 1) {
              computedXpDelta += EVENT_XP_WEIGHTS.quiz_answer;
            }
          }
        } else if (ev.event_type === 'quick_guess' || ev.event_type === 'guess') {
          if (eventInserted) {
            const rawAward = Number(ev.rawMeta?.xp_awarded);
            const guessXp =
              Number.isFinite(rawAward) && rawAward >= 0
                ? Math.min(20, Math.floor(rawAward))
                : EVENT_XP_WEIGHTS.quick_guess;
            computedXpDelta += guessXp;
          }
        } else if (eventInserted && ev.event_type !== 'expand') {
          // Anti-replay: only award XP when the once-per-card event row was newly inserted.
          computedXpDelta += EVENT_XP_WEIGHTS[ev.event_type] ?? 0;
        }
      }
    }

    const boundedXpDelta = Math.min(MAX_XP_PER_BATCH, consumeXpBudget(targetDeviceId, computedXpDelta));
    const hasStateMutations =
      boundedXpDelta > 0 ||
      Boolean(latestUsername) ||
      addedLikes.length > 0 ||
      removedLikes.length > 0 ||
      addedSaves.length > 0 ||
      removedSaves.length > 0 ||
      viewedSlugs.length > 0 ||
      validEvents.length > 0;

    if (hasStateMutations) {
      const nextSeenIds = Array.from(
        new Set([...(existing.profile?.seenIds ?? []), ...viewedSlugs])
      ).slice(-2500);
      const removedLikeSet = new Set(removedLikes);
      const nextLikedIds = Array.from(
        new Set([
          ...(existing.profile?.likedIds ?? []).filter((id) => !removedLikeSet.has(id)),
          ...addedLikes,
        ])
      ).slice(-500);
      const removedSaveSet = new Set(removedSaves);
      const nextFavoriteIds = Array.from(
        new Set([
          ...(existing.profile?.favoriteIds ?? []).filter((id) => !removedSaveSet.has(id)),
          ...addedSaves,
        ])
      ).slice(-500);

      await pool.query(
        `INSERT INTO profiles (
           device_id, user_id, username, xp, weekly_xp, streak,
           last_visit_date, last_active_date, seen_ids, favorite_ids, liked_ids, updated_at
         )
         VALUES (
           $1,
           $2,
           COALESCE($3, 'Merak Kâşifi'),
           $4,
           $4,
           CASE WHEN $4 > 0 THEN 1 ELSE 0 END,
           TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
           CASE WHEN $4 > 0 THEN CURRENT_DATE ELSE NULL END,
           $5::jsonb,
           $6::jsonb,
           $7::jsonb,
           NOW()
         )
         ON CONFLICT (device_id) DO UPDATE SET
           user_id = COALESCE(profiles.user_id, EXCLUDED.user_id),
           username = COALESCE($3, NULLIF(TRIM(profiles.username), ''), 'Merak Kâşifi'),
           xp = COALESCE(profiles.xp, 0) + $4,
           weekly_xp = COALESCE(profiles.weekly_xp, 0) + $4,
           streak = CASE
             WHEN $4 <= 0 THEN COALESCE(profiles.streak, 0)
             WHEN profiles.last_active_date = CURRENT_DATE THEN GREATEST(COALESCE(profiles.streak, 0), 1)
             WHEN profiles.last_active_date = (CURRENT_DATE - 1) THEN COALESCE(profiles.streak, 0) + 1
             ELSE 1
           END,
           last_visit_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'),
           last_active_date = CASE
             WHEN $4 > 0 THEN CURRENT_DATE
             ELSE profiles.last_active_date
           END,
           seen_ids = $5::jsonb,
           favorite_ids = $6::jsonb,
           liked_ids = $7::jsonb,
           updated_at = NOW()`,
        [
          targetDeviceId,
          resolvedUserId,
          latestUsername || null,
          boundedXpDelta,
          JSON.stringify(nextSeenIds),
          JSON.stringify(nextFavoriteIds),
          JSON.stringify(nextLikedIds),
        ]
      );
    }

    if (
      sessionUser &&
      (boundedXpDelta > 0 ||
        addedLikes.length > 0 ||
        removedLikes.length > 0 ||
        addedSaves.length > 0 ||
        removedSaves.length > 0 ||
        viewedSlugs.length > 0 ||
        Boolean(latestUsername))
    ) {
      await syncAuthenticatedUserFromEvents({
        userId: sessionUser.id,
        deviceId: targetDeviceId,
        xpDelta: boundedXpDelta,
        username: latestUsername,
        addedLikes,
        removedLikes,
        addedFavorites: addedSaves,
        removedFavorites: removedSaves,
        addedSeenIds: viewedSlugs,
      }).catch((err) => {
        console.warn('[POST /api/events] User session sync skipped:', err);
      });
    }

    const response = NextResponse.json(
      {
        ok: true,
        processed,
        likesMap,
        xpAwarded: boundedXpDelta,
      },
      { headers: NO_STORE_HEADERS }
    );
    if (shouldBindCookie) {
      setSignedDeviceCookie(response, targetDeviceId, request);
    }
    return response;
  } catch (err) {
    console.error('[POST /api/events] Error recording events:', err);
    return NextResponse.json(
      { ok: false, error: 'Database event write failed.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
