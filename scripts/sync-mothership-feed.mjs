import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../server/uploads/rss-images');
const UPLOADS_URL_PREFIX = '/api/uploads/rss-images';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const FEED_URL = 'https://mothership.sg/feed/?posts_per_page=100';
const DEFAULT_IMAGE = 'linear-gradient(135deg, #d0e8f5 0%, #b3d4e8 50%, #90bcd6 100%)';
const SOURCE_DOMAIN = 'mothership.sg';

// Sections added/merged into existing structure
const SECTION_DEFINITIONS = [
  ['singapore', 'Singapore', 'Local Singapore news, society, and community stories.', 11],
  ['tech', 'Tech', 'Technology news, gadgets, and digital culture.', 12],
  ['world', 'World', 'International news and global affairs.', 13],
];

const TOPIC_DEFINITIONS = {
  singapore: [
    ['singapore-news', 'Singapore News'],
    ['society', 'Society'],
    ['housing', 'Housing'],
  ],
  tech: [
    ['tech-news', 'Tech News'],
  ],
  world: [
    ['world-news', 'World News'],
    ['asia', 'Asia'],
  ],
};

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

function extractRawTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].trim() : '';
}

function extractPrimaryImage(block) {
  // mothership uses <img class="type:primaryImage" src="..."/> in description
  const rawDesc = extractRawTag(block, 'description');
  const primaryMatch = rawDesc.match(/<img[^>]*class="type:primaryImage"[^>]*src="([^"]+)"/i)
    ?? rawDesc.match(/<img[^>]*src="([^"]+)"[^>]*class="type:primaryImage"/i);
  if (primaryMatch) return decodeEntities(primaryMatch[1]).trim();

  // media:content / media:thumbnail
  const mediaMatch = block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (mediaMatch) return decodeEntities(mediaMatch[1]).trim();

  const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (thumbMatch) return decodeEntities(thumbMatch[1]).trim();

  // fallback: first img in description
  const imgMatch = rawDesc.match(/<img[^>]*src="([^"]+)"/i);
  if (imgMatch) return decodeEntities(imgMatch[1]).trim();

  return '';
}

function extractCategories(block) {
  return Array.from(
    block.matchAll(/<category>([\s\S]*?)<\/category>/gi),
    (m) => decodeEntities(m[1]).trim()
  ).filter(Boolean);
}

function toDateOnly(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function slugFromUrl(link) {
  try {
    const pathname = new URL(link).pathname.replace(/\/+$/, '');
    return pathname.split('/').filter(Boolean).pop() ?? `story-${Date.now()}`;
  } catch {
    return `story-${Date.now()}`;
  }
}

function isMothership(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return host === SOURCE_DOMAIN;
  } catch {
    return false;
  }
}

function parseFeed(xml) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => {
    const block = match[1];
    const link = decodeEntities(extractTag(block, 'link') || extractTag(block, 'guid')).trim();

    // Skip articles that link outside mothership.sg
    if (!isMothership(link)) return null;

    const rawDescription = extractRawTag(block, 'description');

    return {
      id: `ms-${slugFromUrl(link)}`,
      title: extractTag(block, 'title'),
      link,
      author: extractTag(block, 'dc:creator') || 'Mothership',
      publishDate: toDateOnly(extractTag(block, 'pubDate')),
      categories: extractCategories(block),
      image: extractPrimaryImage(block) || DEFAULT_IMAGE,
      description: stripHtml(rawDescription),
      rawHtml: rawDescription,
    };
  }).filter((item) => item && item.title && item.link && item.publishDate);
}

function hasAny(values, candidates) {
  return candidates.some((c) => values.includes(c));
}

function hasAnyPartial(values, candidates) {
  return candidates.some((c) => values.some((v) => v.includes(c)));
}

function resolvePlacement(item) {
  const cats = item.categories.map((v) => v.toLowerCase().trim());
  const title = item.title.toLowerCase();
  const id = item.id.toLowerCase();

  // Food
  if (hasAny(cats, ['food', 'food & drink', 'food and drink', 'restaurants', 'hawker', 'recipe', 'dessert', 'bubble tea', 'cafe', 'cafes'])) {
    if (hasAny(cats, ['dessert', 'desserts', 'bubble tea', 'boba'])) return ['food', 'desserts'];
    if (hasAny(cats, ['recipe', 'recipes'])) return ['food', 'recipes'];
    return ['food', 'food-news-and-menu-updates'];
  }
  if (hasAnyPartial([title, id], ['food', 'restaurant', 'hawker', 'eat', 'cafe', 'dessert', 'coffee', 'drink'])) {
    return ['food', 'food-news-and-menu-updates'];
  }

  // Travel
  if (hasAny(cats, ['travel', 'overseas', 'tourism'])) return ['travel', 'travel'];
  if (hasAnyPartial([title], ['travel', 'flight', 'airport', 'hotel', 'cruise', 'holiday', 'visa', 'batam', 'johor', 'bali'])) {
    return ['travel', 'travel'];
  }

  // Entertainment
  if (hasAny(cats, ['entertainment', 'k-pop', 'kpop', 'music', 'movies', 'movie', 'netflix', 'disney', 'tv', 'streaming', 'celebrity', 'celebrities'])) {
    if (hasAny(cats, ['k-pop', 'kpop', 'music'])) return ['entertainment', 'music'];
    if (hasAny(cats, ['movie', 'movies', 'netflix', 'disney', 'streaming'])) return ['entertainment', 'movies'];
    if (hasAny(cats, ['celebrity', 'celebrities'])) return ['celebrity', 'celebrity-news'];
    return ['entertainment', 'tv-shows'];
  }

  // Tech
  if (hasAny(cats, ['tech', 'technology', 'ai', 'gadgets', 'cybersecurity', 'startup', 'apps'])) {
    return ['tech', 'tech-news'];
  }
  if (hasAnyPartial([title], ['ai ', 'chatgpt', 'iphone', 'android', 'app ', 'crypto', 'bitcoin'])) {
    return ['tech', 'tech-news'];
  }

  // Relationships / parenting
  if (hasAny(cats, ['parenting', 'pregnancy', 'motherhood', 'relationships', 'mental health', 'wellness'])) {
    return ['relationships-parenting', 'relationships-and-parenting'];
  }
  if (hasAnyPartial([title], ['pregnan', 'mum', 'mom', 'parent', 'baby', 'child', 'mental health'])) {
    return ['relationships-parenting', 'relationships-and-parenting'];
  }

  // World news
  if (hasAny(cats, ['world', 'international', 'global', 'us', 'china', 'india', 'malaysia', 'indonesia'])) {
    const asiaKeywords = ['malaysia', 'indonesia', 'china', 'japan', 'korea', 'india', 'thailand', 'vietnam', 'philippines'];
    if (hasAnyPartial([...cats, title], asiaKeywords)) return ['world', 'asia'];
    return ['world', 'world-news'];
  }

  // Singapore local (default for mothership)
  if (hasAny(cats, ['singapore', 'singapore news', 'local'])) {
    if (hasAnyPartial([title, id], ['hdb', 'flat', 'condo', 'property', 'housing', 'mall', 'mrt', 'lrt'])) {
      return ['singapore', 'housing'];
    }
    return ['singapore', 'singapore-news'];
  }

  // Default: Singapore news (mothership is primarily a Singapore site)
  return ['singapore', 'singapore-news'];
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
      if (!response.ok) return url;
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    }
    return `${UPLOADS_URL_PREFIX}/${filename}`;
  } catch {
    return url;
  }
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

function buildExcerpt(item) {
  const text = item.description.replace(/\s+/g, ' ').trim();
  return text.length > 220 ? text.slice(0, 220).replace(/\s+\S+$/, '') + '\u2026' : text;
}

function buildBody(item) {
  let html = item.rawHtml || '';

  // Remove Telegram / WhatsApp CTA blocks (bit.ly links with the button images)
  html = html.replace(/<a[^>]*href="https:\/\/bit\.ly\/[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

  // Remove social button images (telegram-button, whatsapp-button, wa-button)
  html = html.replace(/<img[^>]*(telegram-button|whatsapp-button|wa-button)[^>]*\/?>/gi, '');

  // Remove embedded iframes (related story embeds, Facebook plugins)
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // Remove Facebook plugin embeds (fallback)
  html = html.replace(/<p[^>]*>[\s\S]*?facebook\.com\/plugins[\s\S]*?<\/p>/gi, '');

  // Remove paragraphs that only reference "Mothership" as publication
  html = html.replace(/<p[^>]*>((?:(?!<\/p>)[\s\S])*?<em>Mothership<\/em>[\s\S]*?)<\/p>/gi, (_, inner) => {
    // Keep if it contains actual images or meaningful content beyond the attribution
    const imgs = inner.match(/<img[^>]*>/gi) ?? [];
    const stripped = stripHtml(inner).replace(/Mothership\.?\s*/gi, '').trim();
    if (stripped.length > 30) return `<p>${inner}</p>`;
    return imgs.join('');
  });

  // Remove "Related story" heading blocks
  html = html.replace(/<h[1-6][^>]*>[\s\S]*?[Rr]elated\s+stor[yi][\s\S]*?<\/h[1-6]>/gi, '');

  // Clean up empty tags and extra whitespace
  html = html
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<strong>\s*<\/strong>/gi, '')
    .replace(/<a[^>]*>\s*<\/a>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return html || `<p>${item.description}</p>`;
}

async function ensureStructure() {
  await query(`alter table if exists stories add column if not exists source_name text`);
  await query(`alter table if exists stories add column if not exists source_url text`);
  await query(`alter table if exists stories add column if not exists is_external boolean not null default false`);

  for (const [key, label, description, position] of SECTION_DEFINITIONS) {
    await query(
      `insert into sections (key, label, description, position)
       values ($1, $2, $3, $4)
       on conflict (key) do update set label = $2, description = $3, position = $4`,
      [key, label, description, position]
    );
  }

  for (const [sectionKey, topics] of Object.entries(TOPIC_DEFINITIONS)) {
    const sectionResult = await query('select id from sections where key = $1', [sectionKey]);
    const sectionId = sectionResult.rows[0]?.id;
    if (!sectionId) continue;

    for (const [index, [slug, label]] of topics.entries()) {
      await query(
        `insert into topics (section_id, slug, label, description, position)
         values ($1, $2, $3, $4, $5)
         on conflict (section_id, slug) do update set label = $3, position = $5`,
        [sectionId, slug, label, `${label} coverage from Mothership.sg.`, index + 1]
      );
    }
  }
}

async function loadTopicLookup() {
  const result = await query(
    `select topics.id, topics.slug, topics.label, sections.id as section_id, sections.key as section_key
     from topics join sections on sections.id = topics.section_id`
  );
  return new Map(result.rows.map((row) => [`${row.section_key}:${row.slug}`, row]));
}

function selectImportableItems(feedItems) {
  const selected = [];
  const perTopicCounts = new Map();

  for (const item of feedItems) {
    const placement = resolvePlacement(item);
    if (!placement) continue;

    const key = placement.join(':');
    const count = perTopicCounts.get(key) ?? 0;
    if (count >= 8) continue;

    perTopicCounts.set(key, count + 1);
    selected.push({ ...item, sectionKey: placement[0], topicSlug: placement[1] });

    if (selected.length >= 80) break;
  }

  return selected;
}

async function syncFeed({ dryRun = false } = {}) {
  const response = await fetch(FEED_URL, {
    headers: {
      'user-agent': 'SponbitFeedSync/1.0 (+https://mothership.sg)',
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const items = selectImportableItems(parseFeed(xml));

  if (dryRun) {
    console.log(`Parsed ${items.length} importable stories from ${FEED_URL}`);
    console.table(items.slice(0, 15).map((item) => ({
      id: item.id,
      section: item.sectionKey,
      topic: item.topicSlug,
      title: item.title.slice(0, 60),
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
      const featureRank = index < 4 ? index + 1 : null;
      const recentRank = index < 12 ? index + 1 : null;
      const popularRank = index < 6 ? index + 1 : null;

      const image = await downloadImage(item.image);
      const body = await localizeBodyImages(buildBody(item));

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
          topic?.id ?? null,
          item.title,
          topic?.label ?? item.categories[0] ?? 'Singapore',
          item.author,
          item.publishDate,
          buildExcerpt(item),
          image,
          body,
          'Mothership',
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
