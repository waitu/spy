import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../server/uploads/rss-images');
const UPLOADS_URL_PREFIX = '/api/uploads/rss-images';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const FEED_URLS = [
  'https://moxie.foxnews.com/google-publisher/world.xml',
  'https://moxie.foxnews.com/google-publisher/travel.xml',
  'https://moxie.foxnews.com/google-publisher/entertainment.xml',
  'https://moxie.foxnews.com/google-publisher/health.xml',
  'https://moxie.foxnews.com/google-publisher/tech.xml',
];

const DEFAULT_IMAGE = 'linear-gradient(135deg, #003087 0%, #001f5b 100%)';
const SOURCE_NAME = 'Fox News';

// Map Fox News taxonomy categories → our sections/topics
const TAXONOMY_SECTION_MAP = [
  ['fox-news/travel',                   'travel',        'travel'],
  ['fox-news/health',                   'self-care',     'health'],
  ['fox-news/tech',                     'tech',          'tech-news'],
  ['fox-news/science',                  'tech',          'tech-news'],
  ['fox-news/entertainment',            'entertainment', 'tv-shows'],
  ['fox-news/sports',                   'entertainment', 'tv-shows'],
  ['fox-news/world',                    'world',         'world-news'],
  ['fox-news/politics',                 'world',         'world-news'],
  ['fox-news/us',                       'world',         'world-news'],
  ['fox-news/outkick/outkick-culture',  'entertainment', 'tv-shows'],
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
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(re);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractAllTags(block, tagName, attr, attrName = 'domain') {
  const re = new RegExp(`<${tagName}[^>]*${attrName}="${attr.replace(/\//g, '\\/')}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  return Array.from(block.matchAll(re), m => decodeEntities(m[1]).trim());
}

function isFoxNews(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return host === 'foxnews.com' || host.endsWith('.foxnews.com') || host === 'outkick.com';
  } catch {
    return false;
  }
}

function resolvePlacement(taxonomyCategories) {
  for (const cat of taxonomyCategories) {
    for (const [prefix, sectionKey, topicSlug] of TAXONOMY_SECTION_MAP) {
      if (cat.startsWith(prefix)) {
        return [sectionKey, topicSlug];
      }
    }
  }
  return ['world', 'world-news'];
}

function slugFromUrl(link) {
  try {
    const parts = new URL(link).pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const slug = parts.filter(p => !['index.html', 'index', ''].includes(p)).pop()
      ?? `fn-${Date.now()}`;
    return slug;
  } catch {
    return `fn-${Date.now()}`;
  }
}

function toDateOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractImage(block) {
  // Fox News uses <media:content url="..."> (single, not grouped)
  const match = block.match(/<media:content[^>]+url="([^"]+)"/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

// CTA patterns to strip from Fox News body
const FN_CTA_PATTERNS = [
  // All-caps "CLICK HERE" paragraphs (internal cross-links used as CTAs)
  /<p[^>]*>\s*<a[^>]*>\s*<strong>[A-Z0-9 ''"":,!?&;.#\-\/\\*@$%^()\[\]_+~`=<>|{}]+<\/strong>\s*<\/a>\s*<\/p>/gi,
  // "CLICK HERE FOR MORE..." style strong-only paragraphs
  /<p[^>]*>\s*<a[^>]*><strong>CLICK HERE[^<]*<\/strong><\/a>\s*<\/p>/gi,
  // "GET BREAKING NEWS BY EMAIL" etc
  /<p[^>]*>\s*<a[^>]*><strong>GET [A-Z ]+<\/strong><\/a>\s*<\/p>/gi,
  // "SIGN UP..." calls
  /<p[^>]*>\s*<a[^>]*><strong>SIGN UP[^<]*<\/strong><\/a>\s*<\/p>/gi,
  // "LIKE WHAT YOU'RE READING?" 
  /<p[^>]*>\s*<a[^>]*><strong>LIKE WHAT YOU['']RE[^<]*<\/strong><\/a>\s*<\/p>/gi,
  // "CLICK HERE TO DOWNLOAD THE FOX NEWS APP"
  /<[^>]+>CLICK HERE TO DOWNLOAD THE FOX NEWS APP<\/[^>]+>/gi,
  // Fox News app download strong spans
  /<strong><span[^>]*>CLICK HERE TO DOWNLOAD THE FOX NEWS APP<\/span><\/strong>/gi,
  // "GOT A TIP?" paragraph
  /<p[^>]*>\s*<a[^>]*><strong>GOT A TIP\?<\/strong><\/a>\s*<\/p>/gi,
  // "SEND US A TIP" paragraph
  /<p[^>]*>\s*<a[^>]*><strong>SEND US A TIP[^<]*<\/strong><\/a>\s*<\/p>/gi,
  // "FOLLOW THE FOX TRUE CRIME TEAM ON X" etc
  /<p[^>]*>\s*<a[^>]*><strong>FOLLOW [^<]+<\/strong><\/a>\s*<\/p>/gi,
  // Fox News attribution paragraphs at the end: "Fox News Digital's X contributed..."
  /<p[^>]*>\s*<i>Fox News(?:'s| Digital's)?[^<]*contributed to this report[^<]*<\/i>\s*<\/p>/gi,
  // Outkick email/follow lines
  /<p[^>]*>[^<]*@outkick\.com[^<]*<\/p>/gi,
  /\s*\/\s*Follow along on X:[^<]*/gi,
  // "Fox News' X contributed" without italic
  /<p[^>]*>Fox News(?:'s| Digital's)?[^<]*contributed to this report[^<]*<\/p>/gi,
  // "ZERO BS. JUST DAKICH..." outkick podcast promos
  /<p[^>]*>\s*<a[^>]*><strong>ZERO BS[^<]*<\/strong><\/a>\s*<\/p>/gi,
  // Empty paragraphs
  /<p[^>]*>\s*<\/p>/gi,
];

function buildBody(rawHtml) {
  let html = rawHtml;

  // Strip all CTA/promo patterns
  for (const pattern of FN_CTA_PATTERNS) {
    html = html.replace(pattern, '');
  }

  // Remove internal Fox News cross-link paragraphs (standalone <strong> all-caps CTA links)
  // Pattern: <p> containing only an <a><strong>ALL CAPS...</strong></a>
  html = html.replace(/<p[^>]*>\s*(<a[^>]*>\s*)?<strong>[A-Z0-9][A-Z0-9 ''"":,!?&;.\-\/\\*@$%^()\[\]_+~`=<>|{}]{20,}<\/strong>(\s*<\/a>)?\s*<\/p>/g, '');

  // Remove Fox News "suggestion" spans (editor artifacts in their CMS)
  html = html.replace(/<span[^>]*class="[^"]*suggestion[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  html = html.replace(/\bsuggestionid="[^"]*"\s*/gi, '');
  html = html.replace(/\bhighlighted="[^"]*"\s*/gi, '');
  html = html.replace(/\bsuggestiontype="[^"]*"\s*/gi, '');
  html = html.replace(/\bisinsertion="[^"]*"\s*/gi, '');
  html = html.replace(/\bdata-suggestion-id="[^"]*"\s*/gi, '');
  html = html.replace(/\bdata-is-insertion="[^"]*"\s*/gi, '');
  html = html.replace(/\bdata-suggestion-type="[^"]*"\s*/gi, '');
  html = html.replace(/\bdata-highlighted="[^"]*"\s*/gi, '');
  html = html.replace(/\bcontenteditable="[^"]*"\s*/gi, '');

  // Clean up href attributes that have broken/split URLs (Fox CMS quirk)
  html = html.replace(/\shref\s*=\s*"\s*\n\s*/g, ' href="');

  // Strip target/rel on external links to Fox News itself
  // (we'll keep other external links as-is)

  // Remove links back to foxnews.com (keep link text, strip <a> wrapper)
  html = html.replace(/<a[^>]*href="[^"]*foxnews\.com[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  html = html.replace(/<a[^>]*href="[^"]*outkick\.com[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // Clean up excessive whitespace
  html = html.replace(/\n{3,}/g, '\n\n').replace(/\s{2,}/g, ' ').trim();

  return html;
}

async function localizeBodyImages(html) {
  const srcPattern = /<img([^>]*)src="([^"]+)"([^>]*)>/gi;
  const matches = [...html.matchAll(srcPattern)];
  for (const match of matches) {
    const [full, before, src, after] = match;
    const localSrc = await downloadImage(src);
    if (localSrc !== src) {
      html = html.replace(full, `<img${before}src="${localSrc}"${after}>`);
    }
  }
  return html;
}

// Fox News categories come as multiple <category domain="foxnews.com/taxonomy">VALUE</category>
function extractTaxonomyCategories(block) {
  const re = /<category[^>]*domain="foxnews\.com\/taxonomy"[^>]*>([^<]+)<\/category>/gi;
  return Array.from(block.matchAll(re), m => decodeEntities(m[1]).trim());
}

function parseFeed(xml) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => {
    const block = match[1];
    const link = decodeEntities(
      extractTag(block, 'link') || extractTag(block, 'guid')
    ).trim();

    if (!isFoxNews(link)) return null;

    // Skip video-only articles
    if (link.includes('/videos/') || link.endsWith('.cnn')) return null;

    const title = extractTag(block, 'title');
    const description = extractTag(block, 'description');
    const pubDate = toDateOnly(extractTag(block, 'pubDate'));
    const rawHtml = extractTag(block, 'content:encoded');
    const taxonomyCategories = extractTaxonomyCategories(block);

    if (!title || !link || !pubDate) return null;

    const placement = resolvePlacement(taxonomyCategories);

    return {
      id: `fn-${slugFromUrl(link)}`,
      title,
      link,
      author: SOURCE_NAME,
      publishDate: pubDate,
      image: extractImage(block),
      description: stripHtml(description).slice(0, 280),
      rawBody: buildBody(rawHtml || `<p>${description}</p>`),
      sectionKey: placement[0],
      topicSlug: placement[1],
    };
  }).filter(Boolean);
}

async function downloadImage(url) {
  if (!url || !url.startsWith('http')) return url;
  try {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    const ext = (url.match(/\.(jpe?g|png|gif|webp|avif|svg|png)(\?|$)/i) ?? [])[1] ?? 'jpg';
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
    console.log(`Parsed ${items.length} importable stories from Fox News feeds`);
    console.table(items.slice(0, 15).map((item) => ({
      id: item.id.slice(0, 40),
      section: item.sectionKey,
      topic: item.topicSlug,
      title: item.title.slice(0, 50),
      date: item.publishDate,
      bodyLen: item.rawBody.length,
    })));
    // Show sample cleaned body
    if (items[0]) {
      console.log('\nSample body (first item):\n', items[0].rawBody.slice(0, 800));
    }
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
      let body = await localizeBodyImages(item.rawBody);
      // Inject featured image at top of body (Fox News content:encoded has no inline images)
      if (image && image.startsWith('/')) {
        body = `<img src="${image}" alt="${item.title.replace(/"/g, '&quot;')}" style="width:100%;height:auto;display:block;margin-bottom:1.25em;">` + body;
      }

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
          item.description || item.title,
          image,
          body,
          SOURCE_NAME,
          item.link,
          true,
          4,
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
