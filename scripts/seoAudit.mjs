#!/usr/bin/env node
/**
 * Live / staging SEO & GEO audit script for Scrolly (https://scrolly.live).
 *
 * Usage:
 *   node scripts/seoAudit.mjs
 *   node scripts/seoAudit.mjs --base-url=http://127.0.0.1:3199
 */

const CANONICAL_ORIGIN = 'https://scrolly.live';
const BOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const TIMEOUT_MS = 20000;

function resolveBaseUrl() {
  const arg = process.argv.find((item) => item.startsWith('--base-url='));
  const raw = arg
    ? arg.slice('--base-url='.length)
    : process.env.SEO_AUDIT_BASE_URL || CANONICAL_ORIGIN;
  return raw.replace(/\/+$/, '');
}

const BASE_URL = resolveBaseUrl();
const results = [];

function record(section, check, status, detail) {
  results.push({ section, check, status, detail });
  const tag =
    status === 'PASS' ? '[PASS]' : status === 'WARN' ? '[WARN]' : '[FAIL]';
  console.log(`${tag} [${section}] ${check} — ${detail}`);
}

function mapTargetUrl(urlOrPath) {
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    if (urlOrPath.startsWith(CANONICAL_ORIGIN)) {
      return `${BASE_URL}${urlOrPath.slice(CANONICAL_ORIGIN.length) || '/'}`;
    }
    return urlOrPath;
  }
  const normalizedPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${BASE_URL}${normalizedPath}`;
}

async function fetchUrl(urlOrPath, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const target = mapTargetUrl(urlOrPath);
  try {
    const response = await fetch(target, {
      method: opts.method || 'GET',
      redirect: opts.redirect || 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': BOT_UA,
        ...(opts.headers || {}),
      },
    });
    let text = '';
    if (!opts.skipBody) {
      text = await response.text();
    } else {
      await response.arrayBuffer().catch(() => {});
    }
    const headers = Object.fromEntries(response.headers.entries());
    return {
      ok: true,
      url: target,
      status: response.status,
      headers,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      url: target,
      status: 0,
      headers: {},
      text: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(input) {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function getAttr(tag, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = re.exec(tag);
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? '') : '';
}

function parseMetaAndLinks(html) {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = decodeHtmlEntities((titleMatch?.[1] || '').trim());

  let description = '';
  let robotsMeta = '';
  let ogImage = '';
  let twitterCard = '';

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = getAttr(tag, 'name').toLowerCase();
    const property = getAttr(tag, 'property').toLowerCase();
    const content = getAttr(tag, 'content').trim();
    if (name === 'description' && !description) description = content;
    if (name === 'robots') robotsMeta = `${robotsMeta} ${content}`.trim();
    if (property === 'og:image' && !ogImage) ogImage = content;
    if (name === 'twitter:card' && !twitterCard) twitterCard = content;
  }

  let canonical = '';
  const hreflangs = {};
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttr(tag, 'rel').toLowerCase().split(/\s+/);
    const href = getAttr(tag, 'href').trim();
    if (rel.includes('canonical') && href && !canonical) {
      canonical = href;
    }
    if (rel.includes('alternate') && href) {
      const hl = getAttr(tag, 'hrefLang') || getAttr(tag, 'hreflang');
      if (hl) {
        hreflangs[hl.toLowerCase()] = href;
      }
    }
  }

  const jsonLdBlocks = [];
  const jsonLdErrors = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      jsonLdBlocks.push(JSON.parse(match[1]));
    } catch (error) {
      jsonLdErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    title,
    description,
    robotsMeta,
    canonical,
    hreflangs,
    ogImage,
    twitterCard,
    jsonLdBlocks,
    jsonLdErrors,
  };
}

function flattenJsonLdNodes(blocks) {
  const nodes = [];
  const visit = (item) => {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (Array.isArray(item['@graph'])) {
      item['@graph'].forEach(visit);
    }
    if (item['@type']) {
      nodes.push(item);
    }
  };
  blocks.forEach(visit);
  return nodes;
}

function nodeHasType(node, expectedType) {
  const types = Array.isArray(node?.['@type'])
    ? node['@type']
    : node?.['@type']
      ? [node['@type']]
      : [];
  return types.includes(expectedType);
}

function normalizeUrlForCompare(url) {
  return url === CANONICAL_ORIGIN ? `${CANONICAL_ORIGIN}/` : url;
}

function parseCspDirectives(cspHeader) {
  const map = new Map();
  for (const rawDirective of (cspHeader || '').split(';')) {
    const trimmed = rawDirective.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const name = parts[0].toLowerCase();
    map.set(name, new Set(parts.slice(1)));
  }
  return map;
}

function shuffleFisherYates(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function validateLengthMetric(section, label, text, minLen, maxLen, hardMax = 75) {
  const len = text.length;
  if (!len) {
    record(section, label, 'FAIL', 'Missing value (0 chars)');
    return;
  }
  if (len >= minLen && len <= maxLen) {
    record(section, label, 'PASS', `${len} chars (${minLen}–${maxLen})`);
    return;
  }
  if (label.includes('title') && len > hardMax) {
    record(section, label, 'FAIL', `${len} chars exceeds hard max ${hardMax}: "${text}"`);
    return;
  }
  record(
    section,
    label,
    'WARN',
    `${len} chars (expected ${minLen}–${maxLen}): "${text}"`
  );
}

async function runAudit() {
  console.log(`\nScrolly SEO + GEO Audit Target: ${BASE_URL}`);
  console.log(`Canonical Origin: ${CANONICAL_ORIGIN}\n`);

  const pageCache = new Map();
  async function getCachedPage(path) {
    if (!pageCache.has(path)) {
      pageCache.set(path, await fetchUrl(path));
    }
    return pageCache.get(path);
  }

  // 0) Microsoft Clarity & CSP Verification
  const homeRes = await getCachedPage('/');
  if (!homeRes.ok || homeRes.status !== 200) {
    record(
      'Clarity & CSP',
      'Homepage HTML for Clarity check',
      'FAIL',
      `status=${homeRes.status} ${homeRes.error || ''}`
    );
  } else {
    const clarityIdMatch = homeRes.text.includes('zh55547w0a');
    const clarityTagMatch =
      homeRes.text.includes('ms-clarity') && homeRes.text.includes('clarity.ms/tag/');
    if (clarityIdMatch && clarityTagMatch) {
      record(
        'Clarity & CSP',
        'Microsoft Clarity script (zh55547w0a)',
        'PASS',
        'ms-clarity & clarity.ms/tag/zh55547w0a present in HTML'
      );
    } else {
      record(
        'Clarity & CSP',
        'Microsoft Clarity script (zh55547w0a)',
        'FAIL',
        `ms-clarity=${homeRes.text.includes('ms-clarity')}, clarity.ms=${homeRes.text.includes('clarity.ms')}, zh55547w0a=${clarityIdMatch}`
      );
    }

    const csp = parseCspDirectives(homeRes.headers['content-security-policy'] || '');
    const requiredCsp = [
      ['script-src', 'https://www.clarity.ms'],
      ['script-src', 'https://scripts.clarity.ms'],
      ['connect-src', 'https://*.clarity.ms'],
      ['connect-src', 'https://c.bing.com'],
      ['img-src', 'https://*.clarity.ms'],
      ['img-src', 'https://c.bing.com'],
    ];
    const missingCsp = requiredCsp
      .filter(([dir, origin]) => !(csp.get(dir)?.has(origin)))
      .map(([dir, origin]) => `${dir}:${origin}`);
    if (missingCsp.length === 0) {
      record(
        'Clarity & CSP',
        'CSP Clarity directives',
        'PASS',
        'script-src, connect-src, img-src include all Clarity/Bing origins'
      );
    } else {
      record(
        'Clarity & CSP',
        'CSP Clarity directives',
        'FAIL',
        `Missing: ${missingCsp.join(', ')}`
      );
    }
  }

  // 1) Core Endpoints (200 OK & Header - NO NOARCHIVE/NOCACHE)
  const corePaths = [
    '/',
    '/en',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
  ];

  for (const path of corePaths) {
    const res = await getCachedPage(path);
    const xRobots = res.headers['x-robots-tag'] || '';
    const parsed = path.endsWith('.txt') || path.endsWith('.xml') ? null : parseMetaAndLinks(res.text);
    const metaRobots = parsed?.robotsMeta || '';
    const hasBlockedArchive = /noarchive|nocache/i.test(`${xRobots} ${metaRobots}`);

    if (!res.ok || res.status !== 200) {
      record(
        'Core Endpoints',
        `GET ${path}`,
        'FAIL',
        `Expected 200, got ${res.status} ${res.headers.location || res.error || ''}`
      );
    } else if (hasBlockedArchive) {
      record(
        'Core Endpoints',
        `GET ${path}`,
        'FAIL',
        `200 OK but NOARCHIVE/NOCACHE found (X-Robots-Tag="${xRobots}", meta="${metaRobots}")`
      );
    } else {
      record(
        'Core Endpoints',
        `GET ${path}`,
        'PASS',
        `200 OK, no NOARCHIVE/NOCACHE (${res.text.length} bytes)`
      );
    }
  }

  // Parse Sitemap URLs for Sections 2, 3, 4
  const sitemapRes = await getCachedPage('/sitemap.xml');
  const sitemapLocs = [
    ...sitemapRes.text.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi),
  ].map((m) => decodeHtmlEntities(m[1].trim()));
  const uniqueSitemapLocs = [...new Set(sitemapLocs)];
  const trFactLocs = uniqueSitemapLocs.filter((u) =>
    u.startsWith(`${CANONICAL_ORIGIN}/fact/`)
  );
  const enFactSet = new Set(
    uniqueSitemapLocs.filter((u) => u.startsWith(`${CANONICAL_ORIGIN}/en/fact/`))
  );
  const pairedSlugs = trFactLocs
    .map((u) => u.slice(`${CANONICAL_ORIGIN}/fact/`.length))
    .filter((slug) => enFactSet.has(`${CANONICAL_ORIGIN}/en/fact/${slug}`));

  const factPairsToCheck = pairedSlugs.slice(0, 2);

  if (factPairsToCheck.length < 2) {
    record(
      'Sitemap',
      'Bilingual fact URLs',
      'FAIL',
      `Found only ${factPairsToCheck.length} paired TR/EN fact URLs in sitemap.xml`
    );
  } else {
    record(
      'Sitemap',
      'Bilingual fact URLs',
      'PASS',
      `${uniqueSitemapLocs.length} total URLs, ${trFactLocs.length} TR facts, ${enFactSet.size} EN facts`
    );
  }

  // 2) Multilingual SEO (canonical, hreflang, title 50-60, description 140-155)
  const ogImagesToCheck = new Set();
  const parsedCache = new Map();

  async function inspectSeoPage(path, expectedCanonical) {
    const res = await getCachedPage(path);
    if (!res.ok || res.status !== 200) {
      record('Multilingual SEO', `Load ${path}`, 'FAIL', `status=${res.status}`);
      return null;
    }
    const parsed = parseMetaAndLinks(res.text);
    parsedCache.set(path, parsed);

    if (parsed.ogImage) ogImagesToCheck.add(parsed.ogImage);

    if (parsed.twitterCard === 'summary_large_image') {
      record('OG & Favicon', `twitter:card on ${path}`, 'PASS', parsed.twitterCard);
    } else {
      record(
        'OG & Favicon',
        `twitter:card on ${path}`,
        parsed.twitterCard ? 'WARN' : 'FAIL',
        `got "${parsed.twitterCard}"`
      );
    }

    const gotCanon = normalizeUrlForCompare(parsed.canonical);
    const expCanon = normalizeUrlForCompare(expectedCanonical);
    if (gotCanon === expCanon) {
      record('Multilingual SEO', `canonical ${path}`, 'PASS', parsed.canonical);
    } else {
      record(
        'Multilingual SEO',
        `canonical ${path}`,
        'FAIL',
        `expected "${expectedCanonical}", got "${parsed.canonical}"`
      );
    }

    validateLengthMetric('Multilingual SEO', `title ${path}`, parsed.title, 50, 60);
    validateLengthMetric(
      'Multilingual SEO',
      `description ${path}`,
      parsed.description,
      140,
      155
    );
    return parsed;
  }

  const bilingualPairs = [
    {
      label: 'Home',
      trPath: '/',
      enPath: '/en',
      trHreflang: CANONICAL_ORIGIN,
      enHreflang: `${CANONICAL_ORIGIN}/en`,
      xDefault: CANONICAL_ORIGIN,
    },
    {
      label: 'Category space',
      trPath: '/category/space',
      enPath: '/en/category/space',
      trHreflang: `${CANONICAL_ORIGIN}/category/space`,
      enHreflang: `${CANONICAL_ORIGIN}/en/category/space`,
      xDefault: `${CANONICAL_ORIGIN}/category/space`,
    },
    {
      label: 'Category records',
      trPath: '/category/records',
      enPath: '/en/category/records',
      trHreflang: `${CANONICAL_ORIGIN}/category/records`,
      enHreflang: `${CANONICAL_ORIGIN}/en/category/records`,
      xDefault: `${CANONICAL_ORIGIN}/category/records`,
    },
    ...factPairsToCheck.map((slug, idx) => ({
      label: `Fact #${idx + 1} (${slug})`,
      trPath: `/fact/${slug}`,
      enPath: `/en/fact/${slug}`,
      trHreflang: `${CANONICAL_ORIGIN}/fact/${slug}`,
      enHreflang: `${CANONICAL_ORIGIN}/en/fact/${slug}`,
      xDefault: `${CANONICAL_ORIGIN}/fact/${slug}`,
    })),
  ];

  for (const pair of bilingualPairs) {
    const trMeta = await inspectSeoPage(pair.trPath, pair.trHreflang);
    const enMeta = await inspectSeoPage(pair.enPath, pair.enHreflang);

    if (trMeta && enMeta) {
      const trHl = trMeta.hreflangs;
      const enHl = enMeta.hreflangs;
      const reciprocalOk =
        normalizeUrlForCompare(trHl.tr || '') === normalizeUrlForCompare(pair.trHreflang) &&
        normalizeUrlForCompare(trHl.en || '') === normalizeUrlForCompare(pair.enHreflang) &&
        normalizeUrlForCompare(trHl['x-default'] || '') ===
          normalizeUrlForCompare(pair.xDefault) &&
        normalizeUrlForCompare(enHl.tr || '') === normalizeUrlForCompare(pair.trHreflang) &&
        normalizeUrlForCompare(enHl.en || '') === normalizeUrlForCompare(pair.enHreflang) &&
        normalizeUrlForCompare(enHl['x-default'] || '') ===
          normalizeUrlForCompare(pair.xDefault);

      if (reciprocalOk) {
        record(
          'Multilingual SEO',
          `Reciprocal hreflang (${pair.label})`,
          'PASS',
          `tr=${trHl.tr}, en=${trHl.en}, x-default=${trHl['x-default']}`
        );
      } else {
        record(
          'Multilingual SEO',
          `Reciprocal hreflang (${pair.label})`,
          'FAIL',
          `TR=${JSON.stringify(trHl)} vs EN=${JSON.stringify(enHl)}`
        );
      }
    }
  }

  // Trust pages metadata checks (canonical + title + description + hreflang presence)
  for (const trustPath of ['/about', '/contact', '/privacy', '/terms']) {
    const meta = await inspectSeoPage(trustPath, `${CANONICAL_ORIGIN}${trustPath}`);
    if (meta) {
      const hl = meta.hreflangs;
      const hasAll = Boolean(hl.tr && hl.en && hl['x-default']);
      record(
        'Multilingual SEO',
        `hreflang tags ${trustPath}`,
        hasAll ? 'PASS' : 'FAIL',
        JSON.stringify(hl)
      );
    }
  }

  // 3) GEO & JSON-LD + llms.txt & llms-full.txt Freshness
  for (const path of ['/', '/en']) {
    const parsed = parsedCache.get(path);
    if (!parsed) continue;
    if (parsed.jsonLdErrors.length > 0) {
      record(
        'GEO & JSON-LD',
        `Valid JSON-LD syntax (${path})`,
        'FAIL',
        parsed.jsonLdErrors.join('; ')
      );
      continue;
    }
    const nodes = flattenJsonLdNodes(parsed.jsonLdBlocks);
    const hasWebSite = nodes.some((n) => nodeHasType(n, 'WebSite'));
    const webSiteCount = nodes.filter((n) => nodeHasType(n, 'WebSite')).length;
    const hasOrg = nodes.some((n) => nodeHasType(n, 'Organization'));
    const hasWebApp = nodes.some((n) => nodeHasType(n, 'WebApplication'));

    if (!hasWebSite || !hasOrg || !hasWebApp) {
      record(
        'GEO & JSON-LD',
        `Home schema types (${path})`,
        'FAIL',
        `WebSite=${hasWebSite}, Organization=${hasOrg}, WebApplication=${hasWebApp}`
      );
    } else if (webSiteCount > 1) {
      record(
        'GEO & JSON-LD',
        `Home schema types (${path})`,
        'WARN',
        `Duplicate WebSite JSON-LD nodes (${webSiteCount}) alongside Organization & WebApplication`
      );
    } else {
      record(
        'GEO & JSON-LD',
        `Home schema types (${path})`,
        'PASS',
        'WebSite, Organization, WebApplication valid (no duplicate WebSite)'
      );
    }
  }

  // /about and /about?lang=en FAQPage + 40-60 word BLUF answer check
  for (const aboutPath of ['/about', '/about?lang=en']) {
    const res = await getCachedPage(aboutPath);
    const parsed = parseMetaAndLinks(res.text);
    if (parsed.jsonLdErrors.length > 0) {
      record(
        'GEO & JSON-LD',
        `About FAQPage JSON-LD (${aboutPath})`,
        'FAIL',
        parsed.jsonLdErrors.join('; ')
      );
      continue;
    }
    const nodes = flattenJsonLdNodes(parsed.jsonLdBlocks);
    const faqNode = nodes.find((n) => nodeHasType(n, 'FAQPage'));
    const questions = Array.isArray(faqNode?.mainEntity) ? faqNode.mainEntity : [];
    if (!faqNode || questions.length === 0) {
      record(
        'GEO & JSON-LD',
        `About FAQPage (${aboutPath})`,
        'FAIL',
        'FAQPage or mainEntity missing'
      );
    } else {
      const counts = questions.map((q) => ({
        name: q.name,
        words: countWords(q.acceptedAnswer?.text || ''),
      }));
      const outOfRange = counts.filter((c) => c.words < 40 || c.words > 60);
      if (outOfRange.length === 0) {
        record(
          'GEO & JSON-LD',
          `About FAQPage 40–60 word BLUF (${aboutPath})`,
          'PASS',
          `${counts.length} answers all 40–60 words (${counts.map((c) => c.words).join(', ')})`
        );
      } else {
        record(
          'GEO & JSON-LD',
          `About FAQPage 40–60 word BLUF (${aboutPath})`,
          'WARN',
          `Out of [40–60]: ${outOfRange.map((c) => `"${c.name}"=${c.words}w`).join('; ')}`
        );
      }
    }
  }

  // Categories JSON-LD: CollectionPage + ItemList
  for (const catPath of ['/category/space', '/en/category/space']) {
    const parsed = parsedCache.get(catPath);
    if (!parsed) continue;
    const nodes = flattenJsonLdNodes(parsed.jsonLdBlocks);
    const hasCollection = nodes.some((n) => nodeHasType(n, 'CollectionPage'));
    const itemList = nodes.find((n) => nodeHasType(n, 'ItemList'));
    const hasItems =
      Boolean(itemList) &&
      Number(itemList.numberOfItems || 0) > 0 &&
      Array.isArray(itemList.itemListElement) &&
      itemList.itemListElement.length > 0;
    if (parsed.jsonLdErrors.length === 0 && hasCollection && hasItems) {
      record(
        'GEO & JSON-LD',
        `Category schema (${catPath})`,
        'PASS',
        `CollectionPage + ItemList (${itemList.numberOfItems} items)`
      );
    } else {
      record(
        'GEO & JSON-LD',
        `Category schema (${catPath})`,
        'FAIL',
        `errors=${parsed.jsonLdErrors.length}, CollectionPage=${hasCollection}, ItemList=${hasItems}`
      );
    }
  }

  // Fact pages JSON-LD: Article + LearningResource with citation & isBasedOn
  for (const slug of factPairsToCheck) {
    for (const prefix of ['', '/en']) {
      const factPath = `${prefix}/fact/${slug}`;
      const parsed = parsedCache.get(factPath);
      if (!parsed) continue;
      const nodes = flattenJsonLdNodes(parsed.jsonLdBlocks);
      const factNode = nodes.find(
        (n) => nodeHasType(n, 'Article') && nodeHasType(n, 'LearningResource')
      );
      const hasCitation = Boolean(factNode?.citation);
      const hasIsBasedOn = Boolean(factNode?.isBasedOn);
      if (parsed.jsonLdErrors.length === 0 && factNode && hasCitation && hasIsBasedOn) {
        record(
          'GEO & JSON-LD',
          `Fact schema (${factPath})`,
          'PASS',
          'Article + LearningResource with citation & isBasedOn'
        );
      } else {
        record(
          'GEO & JSON-LD',
          `Fact schema (${factPath})`,
          'FAIL',
          `errors=${parsed.jsonLdErrors.length}, Article+LearningResource=${Boolean(factNode)}, citation=${hasCitation}, isBasedOn=${hasIsBasedOn}`
        );
      }
    }
  }

  // /llms.txt freshness
  const llmsRes = await getCachedPage('/llms.txt');
  const llmsHasChallenge = /\/challenge\//i.test(llmsRes.text);
  const llmsHasLeague = /Friend League|Arkadaş Lig/i.test(llmsRes.text);
  const llmsHasDailyGuess = /Daily (?:Shared )?Guess|Günün Tahmini/i.test(llmsRes.text);
  const llmsHasUpdated = /Last-Updated:\s*2026/i.test(llmsRes.text);
  if (llmsHasChallenge && llmsHasLeague && llmsHasDailyGuess && llmsHasUpdated) {
    record(
      'GEO & JSON-LD',
      '/llms.txt freshness & coverage',
      'PASS',
      'Includes Last-Updated: 2026, /challenge/[code], Daily Guess & Friend Leagues'
    );
  } else {
    record(
      'GEO & JSON-LD',
      '/llms.txt freshness & coverage',
      'WARN',
      `Last-Updated=${llmsHasUpdated}, challenge=${llmsHasChallenge}, friendLeague=${llmsHasLeague}, dailyGuess=${llmsHasDailyGuess}`
    );
  }

  // /llms-full.txt freshness & canonical parity
  const llmsFullRes = await getCachedPage('/llms-full.txt');
  const fullHasChallenge = /\/challenge\//i.test(llmsFullRes.text);
  const fullHasLeague = /Friend League|Arkadaş Lig/i.test(llmsFullRes.text);
  const fullHasDailyGuess = /Daily (?:Shared )?Guess|Günün Tahmini/i.test(
    llmsFullRes.text
  );
  const snapshotMatch = /Snapshot Generated At:\s*(\S+)/i.exec(llmsFullRes.text);
  const countMatch = /Total Verified Fact Cards:\s*(\d+)/i.exec(llmsFullRes.text);
  const corpusCount = countMatch ? Number.parseInt(countMatch[1], 10) : 0;
  const countMatchesSitemap = corpusCount > 0 && corpusCount === trFactLocs.length;

  if (
    snapshotMatch?.[1]?.startsWith('2026-') &&
    countMatchesSitemap &&
    fullHasChallenge &&
    fullHasLeague &&
    fullHasDailyGuess
  ) {
    record(
      'GEO & JSON-LD',
      '/llms-full.txt freshness & corpus parity',
      'PASS',
      `Snapshot=${snapshotMatch[1]}, count=${corpusCount} (matches sitemap ${trFactLocs.length}), includes challenge/Daily Guess/Friend Leagues`
    );
  } else {
    record(
      'GEO & JSON-LD',
      '/llms-full.txt freshness & corpus parity',
      'WARN',
      `snapshot=${snapshotMatch?.[1] || 'none'}, corpusCount=${corpusCount} vs sitemapTR=${trFactLocs.length}, challenge=${fullHasChallenge}, league=${fullHasLeague}, dailyGuess=${fullHasDailyGuess}`
    );
  }

  // 4) Broken Links (15 random sitemap URLs) & IPA 301 Redirects
  const random15 = shuffleFisherYates(uniqueSitemapLocs).slice(0, 15);
  const brokenUrls = [];
  for (const url of random15) {
    const res = await fetchUrl(url, { skipBody: true });
    if (!res.ok || res.status !== 200) {
      brokenUrls.push(`${url} -> ${res.status}`);
    }
  }
  if (brokenUrls.length === 0 && random15.length === 15) {
    record(
      'Links & IPA 301',
      '15 random sitemap.xml URLs return 200 OK',
      'PASS',
      `15/15 returned HTTP 200 (e.g. ${random15.slice(0, 2).join(', ')})`
    );
  } else {
    record(
      'Links & IPA 301',
      '15 random sitemap.xml URLs return 200 OK',
      'FAIL',
      `Broken (${brokenUrls.length}): ${brokenUrls.join('; ')}`
    );
  }

  const ipaTests = [
    encodeURI('/ˈskruː.tə.ni'),
    encodeURI('/\u200bprɪˈkeə.ri.əs\u200b'),
  ];
  for (const ipaPath of ipaTests) {
    const res = await fetchUrl(ipaPath, { skipBody: true });
    const loc = res.headers.location || '';
    const locOk =
      loc === '/?category=vocabulary' || loc.endsWith('/?category=vocabulary');
    if (res.ok && res.status === 301 && locOk) {
      record('Links & IPA 301', `IPA 301 ${ipaPath}`, 'PASS', `301 -> ${loc}`);
    } else {
      record(
        'Links & IPA 301',
        `IPA 301 ${ipaPath}`,
        'FAIL',
        `Expected 301 -> /?category=vocabulary, got ${res.status} -> "${loc}"`
      );
    }
  }

  // 5) OG & Favicon
  const assetUrls = [
    ...ogImagesToCheck,
    `${CANONICAL_ORIGIN}/favicon.ico`,
    `${CANONICAL_ORIGIN}/icon-192.png`,
  ];
  for (const assetUrl of [...new Set(assetUrls)]) {
    const res = await fetchUrl(assetUrl, { skipBody: true });
    const contentType = res.headers['content-type'] || '';
    if (res.ok && res.status === 200 && contentType.startsWith('image/')) {
      record(
        'OG & Favicon',
        assetUrl.replace(CANONICAL_ORIGIN, ''),
        'PASS',
        `200 OK (${contentType})`
      );
    } else {
      record(
        'OG & Favicon',
        assetUrl.replace(CANONICAL_ORIGIN, ''),
        'FAIL',
        `status=${res.status}, content-type="${contentType}"`
      );
    }
  }

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n=== SEO & GEO AUDIT SUMMARY ===');
  console.log(`PASS: ${passCount} | WARN: ${warnCount} | FAIL: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

runAudit().catch((error) => {
  console.error('Fatal audit error:', error);
  process.exit(1);
});
