import { pool, query } from '../server/db.js';

const FEED_URL = 'https://www.brit.co/feed';
const DEFAULT_IMAGE = 'linear-gradient(135deg, #efe3d5 0%, #e0c5aa 50%, #d2b39c 100%)';

const SECTION_DEFINITIONS = [
  ['shopping', 'Shopping', 'Style, decor, beauty picks, and gift-focused coverage.', 1],
  ['self-care', 'Self-Care', 'Beauty, wellness, and better-living updates.', 2],
  ['celebrity', 'Celebrity', 'Celebrity news, style moments, and red carpet coverage.', 3],
  ['entertainment', 'Entertainment', 'TV, movies, books, and streaming coverage.', 4],
  ['horoscopes', 'Horoscopes', 'Astrology and zodiac coverage.', 5],
  ['food', 'Food', 'Food news, recipes, desserts, and drinks.', 6],
  ['travel', 'Travel', 'Destinations, itineraries, and travel inspiration.', 7],
  ['holidays', 'Holidays', 'Seasonal celebrations and holiday ideas.', 8],
  ['relationships-parenting', 'Relationships & Parenting', 'Relationships, parenting, and family-focused stories.', 9],
  ['games', 'Games', 'Games and playful culture picks.', 10],
];

const TOPIC_DEFINITIONS = {
  shopping: [
    ['style-news', 'Style News'],
    ['home-decor', 'Home Decor'],
    ['gift-guides', 'Gift Guides'],
    ['best-beauty-products', 'Best Beauty Products'],
  ],
  'self-care': [
    ['beauty-and-skincare', 'Beauty & Skincare'],
    ['hair', 'Hair'],
    ['makeup', 'Makeup'],
    ['health', 'Health'],
  ],
  celebrity: [
    ['celebrity-news', 'Celebrity News'],
    ['red-carpet', 'Red Carpet'],
    ['celebrity-couples', 'Celebrity Couples'],
  ],
  entertainment: [
    ['tv-shows', 'TV Shows'],
    ['movies', 'Movies'],
    ['books', 'Books'],
    ['music', 'Music'],
  ],
  horoscopes: [
    ['horoscopes', 'Horoscopes'],
    ['zodiac-signs', 'Zodiac Signs'],
  ],
  food: [
    ['food-news-and-menu-updates', 'Food News & Menu Updates'],
    ['recipes', 'Recipes'],
    ['desserts', 'Desserts'],
    ['cocktails', 'Cocktails'],
  ],
  travel: [['travel', 'Travel']],
  holidays: [
    ['holidays', 'Holidays'],
    ['mothers-day', "Mother's Day"],
  ],
  'relationships-parenting': [['relationships-and-parenting', 'Relationships & Parenting']],
  games: [['games', 'Games']],
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
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#8230;/g, '…')
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
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractMediaUrl(block) {
  const match = block.match(/<media:content[^>]*url="([^"]+)"/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

function extractCategories(block) {
  return Array.from(block.matchAll(/<category>([\s\S]*?)<\/category>/gi), (match) => decodeEntities(match[1]).trim()).filter(Boolean);
}

function toDateOnly(value) {
  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    return null;
  }

  return normalized.toISOString().slice(0, 10);
}

function slugFromUrl(link) {
  try {
    const pathname = new URL(link).pathname.replace(/\/+$/, '');
    return pathname.split('/').filter(Boolean).pop() ?? `story-${Date.now()}`;
  } catch {
    return `story-${Date.now()}`;
  }
}

function parseFeed(xml) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => {
    const block = match[1];
    const link = extractTag(block, 'link') || extractTag(block, 'guid');

    const rawDescription = extractTag(block, 'description');
    return {
      id: slugFromUrl(link),
      title: extractTag(block, 'title'),
      link,
      author: extractTag(block, 'dc:creator') || 'Editorial Desk',
      publishDate: toDateOnly(extractTag(block, 'pubDate')),
      categories: extractCategories(block),
      image: extractMediaUrl(block) || DEFAULT_IMAGE,
      description: stripHtml(rawDescription),
      rawHtml: rawDescription,
    };
  }).filter((item) => item.title && item.link && item.publishDate);
}

function hasAny(values, candidates) {
  return candidates.some((candidate) => values.includes(candidate));
}

function resolvePlacement(item) {
  const categories = item.categories.map((value) => value.toLowerCase().trim());
  const title = item.title.toLowerCase();

  // Shopping rules first — gift guides and home decor should win over other signals
  if (hasAny(categories, ['home decor', 'interior design', 'home decor ideas', 'home decor inspiration', 'homedecor'])) {
    return ['shopping', 'home-decor'];
  }

  if (hasAny(categories, ['gift guide', 'gift ideas', 'gifts', 'gifts for her', 'gifts for moms', "mother's day gifts", 'editecom'])) {
    return ['shopping', 'gift-guides'];
  }

  if (hasAny(categories, ['cocktail', 'cocktail recipe', 'cocktail recipes', 'drink', 'drink recipes']) || title.includes('cocktail')) {
    return ['food', 'cocktails'];
  }

  if (hasAny(categories, ['dessert', 'desserts', 'dessert recipes']) || title.includes('dessert')) {
    return ['food', 'desserts'];
  }

  if (hasAny(categories, ['food', 'food news', 'food deals', 'deals', 'freebies', 'matcha'])) {
    return ['food', 'food-news-and-menu-updates'];
  }

  if (hasAny(categories, ['recipes', 'recipe', 'cinco de mayo recipes'])) {
    return ['food', 'recipes'];
  }

  if (hasAny(categories, ['hair'])) {
    return ['self-care', 'hair'];
  }

  if (hasAny(categories, ['makeup'])) {
    return ['self-care', 'makeup'];
  }

  if (hasAny(categories, ['beauty', 'wellness', 'health', 'womens health'])) {
    return [hasAny(categories, ['wellness', 'health', 'womens health']) ? 'self-care' : 'self-care', hasAny(categories, ['wellness', 'health', 'womens health']) ? 'health' : 'beauty-and-skincare'];
  }

  if (hasAny(categories, ['travel'])) {
    return ['travel', 'travel'];
  }

  if (hasAny(categories, ['motherhood', 'pregnancy', 'new moms', 'parenting'])) {
    return ['relationships-parenting', 'relationships-and-parenting'];
  }

  if (hasAny(categories, ['relationships']) && hasAny(categories, ['celebrity', 'celebrities', 'pop culture'])) {
    return ['celebrity', 'celebrity-couples'];
  }

  if (hasAny(categories, ['red carpet', 'met gala', 'fashion'])) {
    return ['celebrity', 'red-carpet'];
  }

  if (hasAny(categories, ['celebrity', 'celebrities', 'pop culture'])) {
    return ['celebrity', 'celebrity-news'];
  }

  if (hasAny(categories, ['movie', 'movies'])) {
    return ['entertainment', 'movies'];
  }

  if (hasAny(categories, ['book', 'books', 'booktok'])) {
    return ['entertainment', 'books'];
  }

  if (hasAny(categories, ['music'])) {
    return ['entertainment', 'music'];
  }

  if (hasAny(categories, ['entertainment', 'tv', 'apple tv', 'prime video', 'hulu', 'peacock', 'britbox'])) {
    return ['entertainment', 'tv-shows'];
  }

  if (hasAny(categories, ["mother's day", 'holidays'])) {
    return ['holidays', title.includes("mother's day") ? 'mothers-day' : 'holidays'];
  }

  if (hasAny(categories, ['style', 'fashion'])) {
    return ['shopping', 'style-news'];
  }

  return null;
}

function buildExcerpt(item) {
  const text = item.description.replace(/\s+/g, ' ').trim();
  return text.length > 220 ? text.slice(0, 220).replace(/\s+\S+$/, '') + '…' : text;
}

function buildBody(item) {
  // Strip brit.co injected promo content and leading thumbnail
  const cleaned = (item.rawHtml || '')
    .replace(/^\s*<img[^>]*>\s*(<br\s*\/?> *){0,2}\s*/i, '')
    .replace(/Free Trial for 120\+[^<]*/gi, '')
    .replace(/<a[^>]*learn\.brit\.co[^>]*>.*?<\/a>/gi, '')
    .replace(/## We value your privacy[\s\S]*?AGREE/gi, '')
    // Remove paragraphs containing Brit+Co or brit.co (including nested tags, dotAll)
    .replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?(?:Brit\s*\+?\s*Co|brit\.co)[\s\S]*?<\/p>/gi, '')
    // Remove "Keep up with all ... can't miss" trailing CTAs (with curly or straight apostrophe)
    .replace(/Keep up with all[\s\S]*?can\u2019t miss\.?/gi, '')
    .replace(/Keep up with all[\s\S]*?can't miss\.?/gi, '')
    // Remove "follow us on Facebook/Instagram/..." sentences
    .replace(/[^<]*follow us on (?:Facebook|Instagram|Twitter|social media)[^<]*/gi, '')
    // Remove standalone brand mentions remaining in text nodes
    .replace(/Brit\s*\+\s*Co(?:[\u2019']s)?/gi, '')
    .replace(/brit\.co/gi, '')
    // Clean up empty tags and extra whitespace
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<strong>\s*<\/strong>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const body = cleaned || `<p>${item.description.replace(/Brit\s*\+\s*Co(?:'s)?/gi, '').replace(/brit\.co/gi, '')}</p>`;
  return body;
}

async function ensureStructure() {
  await query(`
    alter table if exists stories
    add column if not exists source_name text
  `);

  await query(`
    alter table if exists stories
    add column if not exists source_url text
  `);

  await query(`
    alter table if exists stories
    add column if not exists is_external boolean not null default false
  `);

  await query('delete from stories where is_external = true');
  await query('delete from topics');
  await query('delete from sections');

  for (const [key, label, description, position] of SECTION_DEFINITIONS) {
    await query(
      `insert into sections (key, label, description, position)
       values ($1, $2, $3, $4)`,
      [key, label, description, position]
    );
  }

  for (const [sectionKey, topics] of Object.entries(TOPIC_DEFINITIONS)) {
    const sectionResult = await query('select id from sections where key = $1', [sectionKey]);
    const sectionId = sectionResult.rows[0]?.id;

    for (const [index, [slug, label]] of topics.entries()) {
      await query(
        `insert into topics (section_id, slug, label, description, position)
         values ($1, $2, $3, $4, $5)`,
        [sectionId, slug, label, `${label} coverage imported from external source metadata.`, index + 1]
      );
    }
  }
}

async function loadTopicLookup() {
  const result = await query(
    `select topics.id, topics.slug, topics.label, sections.id as section_id, sections.key as section_key
     from topics
     join sections on sections.id = topics.section_id`
  );

  return new Map(result.rows.map((row) => [`${row.section_key}:${row.slug}`, row]));
}

function selectImportableItems(feedItems) {
  const selected = [];
  const perTopicCounts = new Map();

  for (const item of feedItems) {
    const placement = resolvePlacement(item);
    if (!placement) {
      continue;
    }

    const key = placement.join(':');
    const count = perTopicCounts.get(key) ?? 0;
    if (count >= 4) {
      continue;
    }

    perTopicCounts.set(key, count + 1);
    selected.push({ ...item, sectionKey: placement[0], topicSlug: placement[1] });

    if (selected.length >= 28) {
      break;
    }
  }

  return selected;
}

async function syncFeed({ dryRun = false } = {}) {
  const response = await fetch(FEED_URL, {
    headers: {
      'user-agent': 'SponbitFeedSync/1.0 (+https://www.brit.co/feed)',
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
    console.table(items.slice(0, 10).map((item) => ({
      id: item.id,
      section: item.sectionKey,
      topic: item.topicSlug,
      title: item.title,
      date: item.publishDate,
    })));
    return;
  }

  await query('begin');

  try {
    await ensureStructure();
    const topicLookup = await loadTopicLookup();

    for (const [index, item] of items.entries()) {
      const topic = topicLookup.get(`${item.sectionKey}:${item.topicSlug}`);
      const featureRank = index < 4 ? index + 1 : null;
      const recentRank = index < 12 ? index + 1 : null;
      const popularRank = index < 6 ? index + 1 : null;

      await query(
        `insert into stories (
          id, section_id, topic_id, title, category, author, publish_date, excerpt, image, body,
          source_url, is_external,
          read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
        )
        values (
          $1, (select id from sections where key = $2), $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12,
          $13, $14, $15, $16, $17
        )
        on conflict (id) do nothing`,
        [
          item.id,
          item.sectionKey,
          topic?.id ?? null,
          item.title,
          topic?.label ?? item.categories[0] ?? 'Editorial',
          item.author,
          item.publishDate,
          buildExcerpt(item),
          item.image,
          buildBody(item),
          item.link,
          true,
          4,
          featureRank,
          recentRank,
          popularRank,
          index === 0,
        ]
      );
    }

    await query('commit');
    console.log(`Imported ${items.length} stories.`);
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