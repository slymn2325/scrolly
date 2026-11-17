#!/usr/bin/env node
/**
 * Report HTTP status codes for every URL in a sitemap.
 *
 * Usage: node scripts/check-sitemap.mjs [sitemap-url]
 * Default sitemap: https://scrolly.live/sitemap.xml
 *
 * Exit 0 when every URL returns 200.
 * Exit 1 when any URL does not.
 * Exit 2 when the sitemap cannot be read.
 */

const sitemapUrl = process.argv[2] || 'https://scrolly.live/sitemap.xml';
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let match = re.exec(xml);
  while (match) {
    locs.push(match[1].trim());
    match = re.exec(xml);
  }
  return locs;
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': BROWSER_UA,
      accept: 'application/xml,text/xml,text/plain,*/*',
    },
  });
  const text = await response.text();
  return { status: response.status, text, finalUrl: response.url };
}

async function collectPageUrls(url, seenSitemaps = new Set()) {
  if (seenSitemaps.has(url)) return [];
  seenSitemaps.add(url);
  const loaded = await fetchText(url);
  if (loaded.status !== 200) {
    const blocked = /cloudflare|just a moment|cf-ray/i.test(loaded.text);
    const error = new Error(
      blocked
        ? `sitemap ${url} returned ${loaded.status} because the edge blocked this client. That is not an origin status.`
        : `sitemap ${url} returned ${loaded.status}`
    );
    error.code = 'SITEMAP';
    throw error;
  }
  const locs = extractLocs(loaded.text);
  const isIndex = /<sitemapindex[\s>]/i.test(loaded.text);
  if (!isIndex) return locs;
  const nested = [];
  for (const child of locs) {
    nested.push(...(await collectPageUrls(child, seenSitemaps)));
  }
  return nested;
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': BROWSER_UA,
        accept: 'text/html,application/xhtml+xml,*/*',
      },
    });
    await response.arrayBuffer().catch(() => {});
    return {
      url,
      status: response.status,
      location: response.headers.get('location') || '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      url,
      status: 0,
      location: '',
      error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

const counts = new Map();

try {
  const urls = [...new Set(await collectPageUrls(sitemapUrl))];
  if (urls.length === 0) {
    console.error(`No <loc> URLs found in ${sitemapUrl}`);
    process.exit(2);
  }
  console.log(`Sitemap ${sitemapUrl}`);
  console.log(`URLs ${urls.length}`);
  const rows = await mapPool(urls, CONCURRENCY, probe);
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) || 0) + 1);
    const extra = row.location ? ` -> ${row.location}` : row.error ? ` (${row.error})` : '';
    console.log(`${row.status}\t${row.url}${extra}`);
  }
  const summary = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => `${status}:${count}`)
    .join(' ');
  console.log(`Summary ${summary}`);
  const failed = rows.filter((row) => row.status !== 200);
  process.exit(failed.length === 0 ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
