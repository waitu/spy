import { pool, query } from '../server/db.js';

const DEFAULT_IMAGE = 'linear-gradient(135deg, #f2d1b3 0%, #ecb497 45%, #d98b78 100%)';

const SECTION_DEFINITIONS = [
  {
    key: 'shopping',
    label: 'Shopping',
    description: 'Trend-led picks, smart buys, and polished shopping stories for everyday style.',
    position: 1,
    topics: [
      ['style-news', 'Style News', 'Fast-moving shopping and wardrobe updates.'],
      ['home-decor', 'Home Decor', 'Design pieces, room refreshes, and elevated living ideas.'],
      ['gift-guides', 'Gift Guides', 'Curated gift selections for seasons, hosts, and milestones.'],
    ],
  },
  {
    key: 'self-care',
    label: 'Self-Care',
    description: 'Beauty, wellness, and practical routines that make everyday life feel better.',
    position: 2,
    topics: [
      ['beauty-and-skincare', 'Beauty & Skincare', 'Routines, launches, and texture-first beauty notes.'],
      ['hair', 'Hair', 'Hair ideas, color direction, and easy styling inspiration.'],
      ['health', 'Health', 'Well-being, rituals, and sustainable habits.'],
    ],
  },
  {
    key: 'celebrity',
    label: 'Celebrity',
    description: 'Culture, fashion moments, and headline-driven celebrity coverage.',
    position: 3,
    topics: [
      ['celebrity-news', 'Celebrity News', 'What people are talking about right now.'],
      ['red-carpet', 'Red Carpet', 'Looks, beauty moments, and standout event style.'],
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    description: 'What to watch, what to read, and the stories moving through pop culture.',
    position: 4,
    topics: [
      ['tv-shows', 'TV Shows', 'Series picks, cast updates, and streaming watchlists.'],
      ['movies', 'Movies', 'New releases and movie-night conversation starters.'],
      ['books', 'Books', 'Reading lists and buzzy page-turners.'],
    ],
  },
  {
    key: 'food',
    label: 'Food',
    description: 'Food news, easy recipes, and hosting ideas built for real routines.',
    position: 5,
    topics: [
      ['food-news-and-menu-updates', 'Food News & Menu Updates', 'Restaurant moves, launches, and seasonal menu notes.'],
      ['recipes', 'Recipes', 'Simple dishes and smart meal ideas.'],
      ['cocktails', 'Cocktails', 'Drinks worth making at home.'],
    ],
  },
  {
    key: 'travel',
    label: 'Travel',
    description: 'Getaways, destination notes, and city guides with a lifestyle lens.',
    position: 6,
    topics: [
      ['travel', 'Travel', 'Shortlist-worthy escapes and city stays.'],
    ],
  },
];

const STORY_DEFINITIONS = [
  {
    id: 'starter-home-lead',
    sectionKey: 'shopping',
    topicSlug: 'style-news',
    title: 'The New Shape of Smart Shopping Is Fewer, Better Pieces',
    category: 'Shopping',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-05',
    excerpt: 'A sharper wardrobe starts with pieces that work harder, layer better, and still feel current next month.',
    image: 'linear-gradient(135deg, #f0cfb6 0%, #df9f8d 48%, #c17d74 100%)',
    body: `
      <h2>Buy less, wear more</h2>
      <p>Starter content matters because an empty homepage makes even a well-built CMS feel unfinished. This piece sets the tone with a simple editorial idea: smart shopping is less about chasing every drop and more about building a tighter rotation of pieces you actually wear.</p>
      <p>That means leaning into strong basics, one or two directional accents, and enough versatility to move from weekday routines into weekend plans without rethinking the whole look.</p>
      <h2>What this approach looks like</h2>
      <p>A useful shopping story should help readers make faster decisions. Focus on silhouette, repeat wear, seasonless color, and easy styling. Those are the signals that make a recommendation feel practical instead of disposable.</p>
    `,
    readMinutes: 4,
    featureRank: 1,
    recentRank: 1,
    popularRank: 1,
    isHomeLead: true,
  },
  {
    id: 'starter-home-decor-refresh',
    sectionKey: 'shopping',
    topicSlug: 'home-decor',
    title: 'Five Living Room Updates That Make a Space Feel Finished Fast',
    category: 'Home Decor',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-04',
    excerpt: 'Texture, lighting, and one strong vintage note can completely reset the mood of a room without a full redesign.',
    image: 'linear-gradient(135deg, #ead9c7 0%, #d8b7a4 52%, #b38979 100%)',
    body: `
      <p>A room rarely needs a total overhaul to feel better. More often, it needs contrast, a more intentional light source, and one object that gives the eye a place to land.</p>
      <p>For starter editorial content, a home story like this gives the homepage breadth while still feeling useful. It signals range without needing a giant feature package on day one.</p>
    `,
    readMinutes: 3,
    featureRank: 2,
    recentRank: 2,
    popularRank: 2,
    isHomeLead: false,
  },
  {
    id: 'starter-selfcare-beauty-routine',
    sectionKey: 'self-care',
    topicSlug: 'beauty-and-skincare',
    title: 'A Four-Step Evening Routine That Feels Calm, Not Overbuilt',
    category: 'Beauty & Skincare',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-04',
    excerpt: 'The best routines are the ones you can repeat: cleanse well, add hydration, seal it in, and keep it consistent.',
    image: 'linear-gradient(135deg, #f5d6cf 0%, #ebb9b0 50%, #d98e8a 100%)',
    body: `
      <p>When a site is just getting started, dependable beauty content helps anchor the self-care category. Readers know what they’re getting, and editors get a strong evergreen foundation they can build on later.</p>
      <p>This kind of story works best when it is clear, low-friction, and realistic about what people will actually do after a long day.</p>
    `,
    readMinutes: 3,
    featureRank: 3,
    recentRank: 3,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-celeb-red-carpet-notes',
    sectionKey: 'celebrity',
    topicSlug: 'red-carpet',
    title: 'Why the Best Red Carpet Looks Work Long Before the Photos Hit Social',
    category: 'Red Carpet',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-03',
    excerpt: 'Great event style reads clearly from across the carpet: shape, texture, and one memorable detail do most of the work.',
    image: 'linear-gradient(135deg, #dbc4cb 0%, #c58f9c 52%, #8d6d86 100%)',
    body: `
      <p>Celebrity coverage gives the homepage energy. Even if the site is early, one or two polished culture stories can make the front page feel timely rather than empty.</p>
      <p>The most compelling style moments are usually the cleanest ones to describe. Readers remember one silhouette, one beauty detail, and one reason the look stood out.</p>
    `,
    readMinutes: 4,
    featureRank: 4,
    recentRank: 4,
    popularRank: 3,
    isHomeLead: false,
  },
  {
    id: 'starter-entertainment-watchlist',
    sectionKey: 'entertainment',
    topicSlug: 'tv-shows',
    title: 'A Better Weekly Watchlist Starts With Mood, Not Genre',
    category: 'TV Shows',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-02',
    excerpt: 'Instead of asking what is new, ask what kind of evening you want: easy, sharp, comforting, or all-consuming.',
    image: 'linear-gradient(135deg, #d9d6e8 0%, #b1a6d6 50%, #7f7eae 100%)',
    body: `
      <p>Entertainment stories help a homepage feel rounded. They also give the site a place to sound conversational and current without depending on breaking news every day.</p>
      <p>A mood-based watchlist is an easy format because it feels personal but still scales cleanly for future coverage.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: 5,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-food-menu-notes',
    sectionKey: 'food',
    topicSlug: 'food-news-and-menu-updates',
    title: 'What Makes a Seasonal Menu Update Actually Worth Talking About',
    category: 'Food News & Menu Updates',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-02',
    excerpt: 'The updates that stick are the ones that feel tied to a real craving, a specific season, or a new routine.',
    image: 'linear-gradient(135deg, #f1d6a5 0%, #e7b573 48%, #cd8c57 100%)',
    body: `
      <p>Food coverage is one of the easiest ways to make a homepage feel alive. Readers immediately understand menu notes, easy recipes, and hosting angles.</p>
      <p>For launch content, a story like this gives the section a clean editorial voice while leaving space for more service-driven posts later.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: 6,
    popularRank: 4,
    isHomeLead: false,
  },
  {
    id: 'starter-food-weekend-pasta',
    sectionKey: 'food',
    topicSlug: 'recipes',
    title: 'The Kind of Weekend Pasta That Feels Impressive but Stays Low Effort',
    category: 'Recipes',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-01',
    excerpt: 'A short ingredient list, a bright finish, and one rich element is usually all it takes to make dinner feel special.',
    image: 'linear-gradient(135deg, #f3d7b8 0%, #e6a97f 46%, #ca7c5f 100%)',
    body: `
      <p>Recipe content gives the site practical depth. Even one or two strong utility stories can make the food section feel credible while you build out the rest of the archive.</p>
      <p>The best starter recipe stories focus on confidence, not complexity. People want something that sounds good and feels achievable tonight.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: 7,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-travel-short-stay',
    sectionKey: 'travel',
    topicSlug: 'travel',
    title: 'How to Plan a Two-Night City Escape Without Overpacking the Agenda',
    category: 'Travel',
    author: 'Sponbit Editorial',
    publishDate: '2026-05-01',
    excerpt: 'The best short trips leave room for one great meal, one long walk, and one thing you did not over-research first.',
    image: 'linear-gradient(135deg, #d7e3df 0%, #a9c5bc 48%, #6f998f 100%)',
    body: `
      <p>Travel helps expand the site beyond daily lifestyle coverage. It gives you a way to bring aspiration into the mix without losing the practical tone the rest of the homepage sets up.</p>
      <p>Short-stay stories work especially well because they feel realistic. Not every reader is planning a major trip, but many will save a smart weekend guide.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: 8,
    popularRank: null,
    isHomeLead: false,
  },
];

async function ensureSchemaColumns() {
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
}

async function upsertStructure() {
  for (const section of SECTION_DEFINITIONS) {
    await query(
      `insert into sections (key, label, description, position)
       values ($1, $2, $3, $4)
       on conflict (key)
       do update set label = excluded.label, description = excluded.description, position = excluded.position`,
      [section.key, section.label, section.description, section.position]
    );

    const sectionResult = await query('select id from sections where key = $1', [section.key]);
    const sectionId = sectionResult.rows[0].id;

    for (const [index, topic] of section.topics.entries()) {
      const [slug, label, description] = topic;

      await query(
        `insert into topics (section_id, slug, label, description, position)
         values ($1, $2, $3, $4, $5)
         on conflict (section_id, slug)
         do update set label = excluded.label, description = excluded.description, position = excluded.position`,
        [sectionId, slug, label, description, index + 1]
      );
    }
  }
}

async function replaceStarterStories() {
  await query(`delete from stories where id = any($1::text[])`, [STORY_DEFINITIONS.map((story) => story.id)]);

  for (const story of STORY_DEFINITIONS) {
    const topicResult = await query(
      `select topics.id as topic_id, sections.id as section_id
       from sections
       left join topics on topics.section_id = sections.id and topics.slug = $2
       where sections.key = $1`,
      [story.sectionKey, story.topicSlug]
    );

    const match = topicResult.rows[0];

    await query(
      `insert into stories (
        id, section_id, topic_id, title, category, author, publish_date, excerpt, image, body,
        source_name, source_url, is_external,
        read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17, $18
      )`,
      [
        story.id,
        match.section_id,
        match.topic_id,
        story.title,
        story.category,
        story.author,
        story.publishDate,
        story.excerpt,
        story.image || DEFAULT_IMAGE,
        story.body,
        null,
        null,
        false,
        story.readMinutes,
        story.featureRank,
        story.recentRank,
        story.popularRank,
        story.isHomeLead,
      ]
    );
  }
}

async function seedStarterContent() {
  await query('begin');

  try {
    await ensureSchemaColumns();
    await upsertStructure();
    await replaceStarterStories();
    await query('commit');

    const counts = await query(
      `select (select count(*) from sections) as sections_count,
              (select count(*) from topics) as topics_count,
              (select count(*) from stories) as stories_count`
    );

    console.log('Starter content ready.');
    console.log(JSON.stringify(counts.rows[0], null, 2));
  } catch (error) {
    await query('rollback');
    throw error;
  }
}

seedStarterContent()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });