import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../server/uploads/rss-images');
const UPLOADS_URL_PREFIX = '/api/uploads/rss-images';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// CNN RSS feeds to sync (world-focused)
const FEED_URLS = [
  'http://rss.cnn.com/rss/edition_world.rss',
  'http://rss.cnn.com/rss/edition_asia.rss',
  'http://rss.cnn.com/rss/edition_technology.rss',
  'http://rss.cnn.com/rss/edition_entertainment.rss',
  'http://rss.cnn.com/rss/edition_travel.rss',
];

const DEFAULT_IMAGE = 'linear-gradient(135deg, #cc0000 0%, #a00000 50%, #800000 100%)';
const SOURCE_NAME = 'CNN';
const CNN_DOMAINS = new Set(['cnn.com', 'edition.cnn.com', 'www.cnn.com']);

// Reuse existing sections/topics — map CNN URL paths to them
// CNN has no <category> tags, so we use the URL path segments
const URL_SECTION_MAP = [
  [/\/travel\//i,                          'travel',                  'travel'],
  [/\/style\//i,                           'shopping',                'style-news'],
  [/\/health\//i,                          'self-care',               'health'],
  [/\/entertainment\//i,                   'entertainment',           'tv-shows'],
  [/\/business\/tech|\/technology\//i,     'tech',                    'tech-news'],
  [/\/business\//i,                        'world',                   'world-news'],
  [/\/world\/asia\//i,                     'world',                   'asia'],
  [/\/world\//i,                           'world',                   'world-news'],
  [/\/us\//i,                              'world',                   'world-news'],
  [/\/politics\//i,                        'world',                   'world-news'],
  [/\/sport|\/sports\//i,                  'entertainment',           'tv-shows'],
  [/\/videos?\//i,                         null,                      null], // skip video-only
];

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripHtml(value) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function isCnn(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return CNN_DOMAINS.has(host) || host.endsWith('.cnn.com');
  } catch {
    return false;
  }
}

function resolvePlacement(link) {
  for (const [pattern, sectionKey, topicSlug] of URL_SECTION_MAP) {
    if (pattern.test(link)) {
      if (!sectionKey) return null;
      return [sectionKey, topicSlug];
    }
  }
  return ['world', 'world-news']; // default
}

function slugFromUrl(link) {
  try {
    const url = new URL(link);
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    // CNN URLs: /2026/05/12/world/some-story-slug/index.html
    // Take last meaningful segment (not 'index.html' or 'index')
    const slug = parts.filter(p => !['index.html', 'index', ''].includes(p)).pop()
      ?? `cnn-${Date.now()}`;
    return slug;
  } catch {
    return `cnn-${Date.now()}`;
  }
}

function toDateOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractCnnImage(block) {
  // CNN uses <media:group><media:content medium="image" url="...">
  // First entry is the largest (super-169)
  const mediaMatch = block.match(/<media:content[^>]*medium="image"[^>]*url="([^"]+)"/i)
    ?? block.match(/<media:content[^>]*url="([^"]+)"[^>]*medium="image"/i)
    ?? block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (mediaMatch) return decodeEntities(mediaMatch[1]).trim();

  // fallback enclosure
  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"/i);
  if (enclosure) return decodeEntities(enclosure[1]).trim();

  return '';
}

function buildBody(description) {
  // CNN RSS only has short excerpt — build a clean article teaser
  const text = description
    .replace(/\bCNN\b/g, '')
    .replace(/\bCNN['']s\b/gi, '')
    .replace(/^[—–-]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text ? `<p>${text}</p>` : '';
}

function parseFeed(xml) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => {
    const block = match[1];
    const link = decodeEntities(
      extractTag(block, 'link') || extractTag(block, 'guid')
    ).trim();

    if (!isCnn(link)) return null;

    const description = extractTag(block, 'description');
    const title = extractTag(block, 'title');
    const author = extractTag(block, 'dc:creator') || SOURCE_NAME;
    const pubDate = toDateOnly(extractTag(block, 'pubDate'));

    if (!title || !link || !pubDate) return null;

    const placement = resolvePlacement(link);
    if (!placement) return null; // skip video-only

    return {
      id: `cnn-${slugFromUrl(link)}`,
      title,
      link,
      author: author.replace(/\bCNN\b/g, SOURCE_NAME).trim() || SOURCE_NAME,
      publishDate: pubDate,
      image: extractCnnImage(block),
      description: stripHtml(description),
      rawBody: buildBody(description),
      sectionKey: placement[0],
      topicSlug: placement[1],
    };
  }).filter(Boolean);
}

async function downloadImage(url) {
  if (!url || !url.startsWith('http')) return url;
  try {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    const ext = (url.match(/\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i) ?? [])[1] ?? 'jpg';
    const filename = `${hash}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      const response = await fetch(url, {
        headers: { 'user-agent': 'SponbitFeedSync/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return DEFAULT_IMAGE;
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    }
    return `${UPLOADS_URL_PREFIX}/${filename}`;
  } catch {
    return DEFAULT_IMAGE;
  }
}

async function ensureStructure() {
  await query(`alter table if exists stories add column if not exists source_name text`);
  await query(`alter table if exists stories add column if not exists source_url text`);
  await query(`alter table if exists stories add column if not exists is_external boolean not null default false`);
}

async function loadTopicLookup() {
  const result = await query(
    `select topics.id, topics.slug, topics.label, sections.id as section_id, sections.key as section_key
     from topics join sections on sections.id = topics.section_id`
  );
  return new Map(result.rows.map((row) => [`${row.section_key}:${row.slug}`, row]));
}

function deduplicateItems(items) {
  const seen = new Set();
  const perTopicCounts = new Map();
  const result = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const key = `${item.sectionKey}:${item.topicSlug}`;
    const count = perTopicCounts.get(key) ?? 0;
    if (count >= 8) continue;
    perTopicCounts.set(key, count + 1);

    result.push(item);
    if (result.length >= 80) break;
  }

  return result;
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'SponbitFeedSync/1.0',
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

async function syncFeed({ dryRun = false } = {}) {
  // Fetch all feeds in parallel
  const xmlResults = await Promise.allSettled(FEED_URLS.map(fetchFeed));

  const allItems = [];
  for (const [i, result] of xmlResults.entries()) {
    if (result.status === 'rejected') {
      console.warn(`Failed to fetch ${FEED_URLS[i]}:`, result.reason.message);
      continue;
    }
    allItems.push(...parseFeed(result.value));
  }

  const items = deduplicateItems(allItems);

  if (dryRun) {
    console.log(`Parsed ${items.length} importable stories from CNN feeds`);
    console.table(items.slice(0, 15).map((item) => ({
      id: item.id.slice(0, 40),
      section: item.sectionKey,
      topic: item.topicSlug,
      title: item.title.slice(0, 50),
      date: item.publishDate,
    })));
    return;
  }

  await query('begin');
  try {
    await ensureStructure();
    const topicLookup = await loadTopicLookup();

    let inserted = 0;
    for (const [index, item] of items.entries()) {
      const topic = topicLookup.get(`${item.sectionKey}:${item.topicSlug}`);
      if (!topic) {
        console.warn(`Topic not found: ${item.sectionKey}:${item.topicSlug} — skipping`);
        continue;
      }

      const featureRank = index < 4 ? index + 1 : null;
      const recentRank = index < 12 ? index + 1 : null;
      const popularRank = index < 6 ? index + 1 : null;

      const image = item.image ? await downloadImage(item.image) : DEFAULT_IMAGE;

      const result = await query(
        `insert into stories (
          id, section_id, topic_id, title, category, author, publish_date, excerpt, image, body,
          source_name, source_url, is_external,
          read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
        )
        values (
          $1, (select id from sections where key = $2), $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16, $17, $18
        )
        on conflict (id) do nothing`,
        [
          item.id,
          item.sectionKey,
          topic.id,
          item.title,
          topic.label,
          item.author,
          item.publishDate,
          item.description.slice(0, 280) || item.title,
          image,
          item.rawBody,
          SOURCE_NAME,
          item.link,
          true,
          3,
          featureRank,
          recentRank,
          popularRank,
          false,
        ]
      );
      if (result.rowCount > 0) inserted++;
    }

    await query('commit');
    console.log(`Sync complete: ${inserted} new stories added (${items.length - inserted} already existed).`);
  } catch (error) {
    await query('rollback');
    throw error;
  }
}

const dryRun = process.argv.includes('--dry-run');

syncFeed({ dryRun })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
