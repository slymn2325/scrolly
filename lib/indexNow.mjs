const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITE_HOST = 'scrolly.live';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const VALID_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const REWRITTEN_KEY_FILE_PATTERN = /^[a-zA-Z0-9-]{16,128}$/;

/**
 * Resolves and validates the configured INDEXNOW_KEY environment variable.
 * Returns null when unset or invalid so callers can skip silently.
 * @param {string | undefined} [rawKey]
 * @returns {string | null}
 */
export function getConfiguredIndexNowKey(rawKey = process.env.INDEXNOW_KEY) {
  const key = String(rawKey || '').trim();
  if (!key || !VALID_KEY_PATTERN.test(key)) {
    return null;
  }
  return key;
}

/**
 * Returns the public verification URL for the active IndexNow key.
 * @param {string} key
 * @returns {string}
 */
export function getIndexNowKeyLocation(key) {
  if (REWRITTEN_KEY_FILE_PATTERN.test(key)) {
    return `${SITE_ORIGIN}/${key}.txt`;
  }
  return `${SITE_ORIGIN}/indexnow-key.txt`;
}

/**
 * Builds canonical TR and EN fact URLs for a list of newly generated fact slugs.
 * @param {string[]} slugs
 * @returns {string[]}
 */
export function buildIndexNowFactUrls(slugs) {
  if (!Array.isArray(slugs) || slugs.length === 0) return [];
  const seen = new Set();
  const urls = [];

  for (const raw of slugs) {
    const slug = String(raw || '').trim().replace(/^\/+|\/+$/g, '');
    if (!slug || slug.includes('/')) continue;
    const encoded = encodeURIComponent(slug);
    for (const candidate of [
      `${SITE_ORIGIN}/fact/${encoded}`,
      `${SITE_ORIGIN}/en/fact/${encoded}`,
    ]) {
      if (!seen.has(candidate)) {
        seen.add(candidate);
        urls.push(candidate);
      }
    }
  }

  return urls;
}

/**
 * Normalizes mixed URLs or slugs into valid https://scrolly.live URLs.
 * @param {string[]} rawUrls
 * @returns {string[]}
 */
export function normalizeIndexNowUrlList(rawUrls) {
  if (!Array.isArray(rawUrls) || rawUrls.length === 0) return [];
  const seen = new Set();
  const out = [];

  for (const item of rawUrls) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      const slug = trimmed.replace(/^\/+|\/+$/g, '');
      if (!slug) continue;
      if (slug.startsWith('fact/') || slug.startsWith('en/fact/')) {
        const full = `${SITE_ORIGIN}/${slug}`;
        if (!seen.has(full)) {
          seen.add(full);
          out.push(full);
        }
      } else {
        for (const built of buildIndexNowFactUrls([slug])) {
          if (!seen.has(built)) {
            seen.add(built);
            out.push(built);
          }
        }
      }
      continue;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname === SITE_HOST && parsed.protocol === 'https:') {
        const href = parsed.toString();
        if (!seen.has(href)) {
          seen.add(href);
          out.push(href);
        }
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return out.slice(0, 10000);
}

/**
 * Submits newly created or updated URLs to IndexNow (Bing, Copilot, ChatGPT/Perplexity).
 * Silently skips if INDEXNOW_KEY is not configured or if network errors occur.
 *
 * @param {string[]} urlsOrSlugs
 * @param {{ key?: string; timeoutMs?: number }} [options]
 */
export async function notifyIndexNow(urlsOrSlugs, options = {}) {
  const key = getConfiguredIndexNowKey(options.key);
  if (!key) {
    return {
      ok: false,
      skipped: true,
      reason: 'missing_indexnow_key',
      submittedCount: 0,
      status: 0,
    };
  }

  const urlList = normalizeIndexNowUrlList(urlsOrSlugs);
  if (urlList.length === 0) {
    return {
      ok: false,
      skipped: true,
      reason: 'empty_url_list',
      submittedCount: 0,
      status: 0,
    };
  }

  const keyLocation = getIndexNowKeyLocation(key);
  const timeoutMs =
    typeof options.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : 8000;

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key,
        keyLocation,
        urlList,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const ok = response.status === 200 || response.status === 202;
    return {
      ok,
      skipped: false,
      reason: ok ? null : `http_${response.status}`,
      submittedCount: urlList.length,
      status: response.status,
      keyLocation,
      urlList,
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      reason: err instanceof Error ? err.message : 'network_error',
      submittedCount: 0,
      status: 0,
    };
  }
}
