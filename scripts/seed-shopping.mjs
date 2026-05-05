/**
 * Seed extra Shopping stories so the /section/shopping page isn't empty.
 * Run: node scripts/seed-shopping.mjs
 */
import { pool, query } from '../server/db.js';

const stories = [
  {
    id: 'shopping-style-summer-edit',
    sectionKey: 'shopping',
    topicSlug: 'style-news',
    title: 'The Summer Edit: 12 Pieces Worth Adding to Your Wardrobe Right Now',
    category: 'Style News',
    author: 'Sponbit Editors',
    publishDate: '2026-05-04',
    excerpt: 'From lightweight linen sets to the flat sandal that goes with everything — the warm-weather pieces making our lists this week.',
    image: 'linear-gradient(135deg, #fde8d2 0%, #f4c39a 50%, #e8a070 100%)',
    body: `<p>Summer dressing doesn't need to be complicated. The pieces that hold up season after season tend to be simple in construction, confident in color, and easy to repeat.</p>
<p>This week's edit focuses on the wardrobe gaps worth closing: a good linen top, a reliable sandal, and one statement piece that doesn't need explanation.</p>
<h2>What we're looking at</h2>
<p>Lightweight separates in natural fabrics continue to lead — linen, cotton gauze, and bamboo blends are all performing well this season. The silhouettes are relaxed but intentional.</p>
<p>For footwear, the flat sandal is having a proper moment. Look for minimal strapping, a slightly cushioned footbed, and a neutral that works across both casual and dressed-up contexts.</p>`,
    readMinutes: 4,
    featureRank: 1,
    recentRank: 1,
    popularRank: 1,
    isHomeLead: false,
  },
  {
    id: 'shopping-home-refresh-spring',
    sectionKey: 'shopping',
    topicSlug: 'home-decor',
    title: '7 Home Decor Pieces That Make a Room Feel Finished Without a Full Redesign',
    category: 'Home Decor',
    author: 'Sponbit Editors',
    publishDate: '2026-05-03',
    excerpt: 'A good throw, the right lamp, and one piece of art can do more for a living room than a complete furniture overhaul.',
    image: 'linear-gradient(135deg, #e8f0e8 0%, #b8d4b8 50%, #88b488 100%)',
    body: `<p>Interior styling is largely about layering. Furniture sets the structure, but it's the smaller decisions — a textured cushion, a ceramic vase, a well-placed lamp — that make a space feel considered.</p>
<p>You don't need to replace what you have. You need to edit it.</p>
<h2>Start with light</h2>
<p>Lighting is the fastest way to change how a room feels. A single table lamp with a warm bulb and a fabric shade does more than a ceiling fixture in most living rooms.</p>
<h2>Add one piece of art</h2>
<p>It doesn't need to be expensive. A single large-format print, properly framed and hung at eye level, grounds a wall and signals intentionality in a way that a gallery cluster often doesn't.</p>`,
    readMinutes: 5,
    featureRank: 2,
    recentRank: 2,
    popularRank: 2,
    isHomeLead: false,
  },
  {
    id: 'shopping-gift-guide-host',
    sectionKey: 'shopping',
    topicSlug: 'gift-guides',
    title: 'The Host Gift Guide: 10 Things Worth Bringing to Any Dinner Party',
    category: 'Gift Guides',
    author: 'Sponbit Editors',
    publishDate: '2026-05-02',
    excerpt: 'Skip the wine and the last-minute flowers. These are the host gifts people actually keep — and remember.',
    image: 'linear-gradient(135deg, #f5e8f5 0%, #dbb8db 50%, #b888c4 100%)',
    body: `<p>A good host gift is specific enough to feel thoughtful but general enough to be useful. It says something about the giver without putting pressure on the receiver.</p>
<p>Wine is fine. These options are better.</p>
<h2>Things that last beyond the evening</h2>
<p>A high-quality olive oil, a beautiful candle with a long burn time, a set of linen napkins in a neutral — these are gifts that continue working after the table is cleared.</p>
<h2>Things that feel considered</h2>
<p>A small cookbook from a restaurant you both love, a cocktail bitters set, or a ceramic butter dish are specific enough to feel like you thought about it — because you did.</p>`,
    readMinutes: 4,
    featureRank: 3,
    recentRank: 3,
    popularRank: 3,
    isHomeLead: false,
  },
  {
    id: 'shopping-beauty-essentials-may',
    sectionKey: 'shopping',
    topicSlug: 'best-beauty-products',
    title: 'May Beauty Essentials: The Products Worth Adding to Your Routine This Month',
    category: 'Best Beauty Products',
    author: 'Sponbit Editors',
    publishDate: '2026-05-01',
    excerpt: 'A lightweight SPF that doesn\'t pill under makeup, a tinted lip balm that works for everyone, and a serum that actually does what it claims.',
    image: 'linear-gradient(135deg, #fce8e8 0%, #f4b8b8 50%, #e08888 100%)',
    body: `<p>The best beauty months are the transitional ones. Spring and early summer create real demand for lighter textures, better SPF habits, and products that carry through the heat without fading.</p>
<p>These are the products earning consistent praise right now.</p>
<h2>SPF that works with makeup</h2>
<p>The issue most people have with sunscreen is texture. This month's standout is a fluid SPF 50 that sinks into skin in under thirty seconds and doesn't pill under foundation or tinted moisturizer.</p>
<h2>The tinted lip balm moment</h2>
<p>Not gloss, not matte — a sheer, comfortable tint that adds color without commitment. The best versions right now offer a little plumping peptide action and smell like nothing.</p>`,
    readMinutes: 4,
    featureRank: 4,
    recentRank: 4,
    popularRank: 4,
    isHomeLead: false,
  },
  {
    id: 'shopping-linen-guide',
    sectionKey: 'shopping',
    topicSlug: 'style-news',
    title: 'How to Actually Shop for Linen (And Why Most of It Isn\'t Worth It)',
    category: 'Style News',
    author: 'Sponbit Editors',
    publishDate: '2026-04-30',
    excerpt: 'Weight, weave, and washing instructions will tell you more about a linen piece than any brand claim on the label.',
    image: 'linear-gradient(135deg, #f0ebe0 0%, #d9cdb0 50%, #c0af88 100%)',
    body: `<p>Linen is one of those fabrics that sounds simple but has a wide quality range. A cheap linen shirt feels scratchy and shapeless by the end of summer. A good one gets softer every wash.</p>
<p>Here's how to tell the difference before you buy.</p>
<h2>Check the weight</h2>
<p>Medium-weight linen — around 180–200 GSM — drapes better and holds its structure longer than the lightweight options often priced lower. Light linen wrinkles badly and can look cheap when worn for more than a few hours.</p>
<h2>Look at the weave</h2>
<p>A tighter weave means better durability and a cleaner appearance. Loosely woven linen can stretch unevenly and pill faster. Run a fingernail lightly across the surface — it should feel smooth and consistent.</p>`,
    readMinutes: 5,
    featureRank: null,
    recentRank: 5,
    popularRank: 5,
    isHomeLead: false,
  },
  {
    id: 'shopping-small-kitchen-upgrades',
    sectionKey: 'shopping',
    topicSlug: 'home-decor',
    title: 'Small Kitchen Upgrades That Make the Biggest Difference',
    category: 'Home Decor',
    author: 'Sponbit Editors',
    publishDate: '2026-04-28',
    excerpt: 'You don\'t need a renovation. A better cutting board, proper knife storage, and one quality pan change how the kitchen feels to use every day.',
    image: 'linear-gradient(135deg, #e8f0f5 0%, #a8c8d8 50%, #6898b0 100%)',
    body: `<p>Kitchen upgrades don't need to be structural. The biggest shifts in how a kitchen feels to use — both functionally and aesthetically — tend to come from a handful of well-chosen objects.</p>
<h2>A proper cutting board</h2>
<p>End-grain wood is the standard worth aiming for. It's gentler on knife edges, self-healing at the surface level, and beautiful in a way that earns its counter space. Size up: a board you can use comfortably for large vegetables is worth the footprint.</p>
<h2>Knife storage that's actually accessible</h2>
<p>Drawer storage dulls edges faster than most people realize. A magnetic wall strip or a proper knife block keeps blades protected and puts your knives in reach rather than buried in a drawer.</p>
<h2>One quality pan</h2>
<p>A 10-inch stainless or carbon steel pan, properly seasoned or cared for, outlasts most non-stick options by years. Learn to use it correctly once and it becomes the pan you reach for almost everything.</p>`,
    readMinutes: 5,
    featureRank: null,
    recentRank: 6,
    popularRank: null,
    isHomeLead: false,
  },
];

async function run() {
  for (const story of stories) {
    // Resolve section id
    const secRes = await query('SELECT id FROM sections WHERE key = $1', [story.sectionKey]);
    if (!secRes.rows.length) {
      console.warn(`Section not found: ${story.sectionKey}`);
      continue;
    }
    const sectionId = secRes.rows[0].id;

    // Resolve topic id
    const topRes = await query(
      'SELECT id FROM topics WHERE slug = $1 AND section_id = $2',
      [story.topicSlug, sectionId],
    );
    if (!topRes.rows.length) {
      console.warn(`Topic not found: ${story.topicSlug} in ${story.sectionKey}`);
      continue;
    }
    const topicId = topRes.rows[0].id;

    await query(
      `INSERT INTO stories
        (id, topic_id, title, category, author, publish_date, excerpt, image, body, read_minutes,
         feature_rank, recent_rank, popular_rank, is_home_lead)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         image = EXCLUDED.image,
         body = EXCLUDED.body,
         feature_rank = EXCLUDED.feature_rank,
         recent_rank = EXCLUDED.recent_rank,
         popular_rank = EXCLUDED.popular_rank`,
      [
        story.id, topicId, story.title, story.category, story.author,
        story.publishDate, story.excerpt, story.image, story.body,
        story.readMinutes, story.featureRank, story.recentRank, story.popularRank,
        story.isHomeLead,
      ],
    );
    console.log(`  ✓ ${story.title}`);
  }

  console.log(`\nDone — ${stories.length} Shopping stories seeded.`);
  await pool.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
