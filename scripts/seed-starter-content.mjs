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
  {
    id: 'starter-shopping-carryall-edit',
    sectionKey: 'shopping',
    topicSlug: 'style-news',
    title: 'The New Carryall Edit Is About Structure, Not Size',
    category: 'Style News',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-30',
    excerpt: 'A good everyday bag earns its place with clean lines, a practical opening, and just enough polish to sharpen basics.',
    image: 'linear-gradient(135deg, #ecd3c6 0%, #d7a69a 50%, #b67a74 100%)',
    body: `
      <p>Shopping coverage should feel useful at first glance. A story about bags, shoes, or outerwear works especially well in a starter archive because readers instantly understand the use case.</p>
      <p>The strongest picks usually balance shape and function. When something looks refined and still works during a packed weekday, it stays in rotation longer.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: 9,
    popularRank: 5,
    isHomeLead: false,
  },
  {
    id: 'starter-shopping-host-gifts',
    sectionKey: 'shopping',
    topicSlug: 'gift-guides',
    title: 'Host Gifts That Feel Considered Without Looking Predictable',
    category: 'Gift Guides',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-29',
    excerpt: 'The best host gifts are practical enough to use immediately and stylish enough to feel like a real treat.',
    image: 'linear-gradient(135deg, #f3dfcb 0%, #ddb798 50%, #c68f77 100%)',
    body: `
      <p>Gift-guide content brings a helpful service layer to the site. It also gives the shopping section a softer, more seasonal rhythm than pure trend coverage.</p>
      <p>The easiest way to make this format strong is to lead with usefulness, then add one design detail that makes the recommendation feel more personal.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: 10,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-shopping-bedroom-lighting',
    sectionKey: 'shopping',
    topicSlug: 'home-decor',
    title: 'Bedroom Lighting Looks Better When Every Layer Does a Different Job',
    category: 'Home Decor',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-28',
    excerpt: 'A room feels calmer when overhead light, bedside light, and accent glow each handle their own mood.',
    image: 'linear-gradient(135deg, #e6d7d0 0%, #ccb7af 50%, #a88f88 100%)',
    body: `
      <p>Home stories are especially strong in a starter library because they age well. Readers can land on them weeks later and still get something practical out of the piece.</p>
      <p>Lighting is a useful entry point because it changes the feeling of a room faster than most furniture decisions ever will.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: 11,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-selfcare-scalp-reset',
    sectionKey: 'self-care',
    topicSlug: 'hair',
    title: 'Why a Weekly Scalp Reset Can Make the Rest of Your Hair Routine Easier',
    category: 'Hair',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-28',
    excerpt: 'Healthy-looking hair often starts with less buildup, gentler washing, and one ritual you can actually keep up.',
    image: 'linear-gradient(135deg, #efd4cc 0%, #dca6a2 50%, #bc7f87 100%)',
    body: `
      <p>Hair coverage works best when it sounds practical instead of preachy. People want routines that reduce effort, not product stacks that create more of it.</p>
      <p>A scalp-first story is a simple way to make the category feel grounded and useful right away.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: 12,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-selfcare-morning-walks',
    sectionKey: 'self-care',
    topicSlug: 'health',
    title: 'The Case for Morning Walks That Do Not Turn Into Productivity Theater',
    category: 'Health',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-27',
    excerpt: 'A short walk works best when it clears your head, resets your posture, and asks almost nothing from the rest of your day.',
    image: 'linear-gradient(135deg, #dde8df 0%, #b9d0bf 48%, #7ca087 100%)',
    body: `
      <p>Self-care content should not feel over-engineered. The strongest health stories usually describe a habit in a way that makes it feel approachable instead of aspirational.</p>
      <p>That is especially useful in a starter archive, where every story needs to signal the tone of the whole section quickly.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: 6,
    isHomeLead: false,
  },
  {
    id: 'starter-selfcare-soft-glow',
    sectionKey: 'self-care',
    topicSlug: 'beauty-and-skincare',
    title: 'Soft-Glow Makeup Works Best When Skin Still Looks Like Skin',
    category: 'Beauty & Skincare',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-26',
    excerpt: 'The prettiest finish usually comes from strategic coverage, brushed-up texture, and one tone that wakes up the face.',
    image: 'linear-gradient(135deg, #f4ddd7 0%, #e9b8b3 50%, #cb8c8a 100%)',
    body: `
      <p>Beauty stories help a new homepage feel polished. They also let the editorial voice sound light, specific, and advice-driven without being too technical.</p>
      <p>A story about soft-glow makeup fits because it is easy to imagine, easy to click, and easy to build on later.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-celeb-press-tour',
    sectionKey: 'celebrity',
    topicSlug: 'celebrity-news',
    title: 'Why Press-Tour Style Still Matters in a Feed-First Celebrity Cycle',
    category: 'Celebrity News',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-25',
    excerpt: 'A great press tour builds momentum through repetition, point of view, and one visual theme people can follow from stop to stop.',
    image: 'linear-gradient(135deg, #ddd1df 0%, #b799c0 48%, #866f98 100%)',
    body: `
      <p>Celebrity coverage makes a front page feel current, but it works best when it has a clear angle. A press-tour story is useful because it lets fashion, publicity, and internet reaction all meet in one place.</p>
      <p>That mix gives the category energy without needing daily breaking-news volume.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-celeb-friendship-era',
    sectionKey: 'celebrity',
    topicSlug: 'celebrity-news',
    title: 'Why Celebrity Friendship Stories Travel Faster Than Official Announcements',
    category: 'Celebrity News',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-24',
    excerpt: 'People respond to chemistry, recurring cameos, and small details that make public relationships feel less managed.',
    image: 'linear-gradient(135deg, #e5d7dc 0%, #cdb1bb 50%, #a27d90 100%)',
    body: `
      <p>Not every culture story needs a giant event attached to it. Sometimes the strongest celebrity content is about why a small narrative catches on so quickly.</p>
      <p>That kind of framing gives the category more shape than a plain recap ever could.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-celeb-event-beauty',
    sectionKey: 'celebrity',
    topicSlug: 'red-carpet',
    title: 'The Beauty Detail That Keeps a Formal Look From Feeling Too Safe',
    category: 'Red Carpet',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-23',
    excerpt: 'When the dress is controlled, beauty can carry the surprise through texture, shine, or one deliberately sharp contrast.',
    image: 'linear-gradient(135deg, #ead9de 0%, #cda6b2 50%, #956f86 100%)',
    body: `
      <p>Event-style coverage should say something clear quickly. One of the easiest ways to do that is to isolate the detail that made a polished look feel modern.</p>
      <p>That keeps the read focused and makes the category easier to scan.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-entertainment-cozy-series',
    sectionKey: 'entertainment',
    topicSlug: 'tv-shows',
    title: 'What Makes a Cozy Series Feel Worth Starting on a Busy Weeknight',
    category: 'TV Shows',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-22',
    excerpt: 'Low-stakes momentum, strong side characters, and a world that feels easy to re-enter can carry a whole season.',
    image: 'linear-gradient(135deg, #dfe0ef 0%, #b9bbdf 48%, #898db8 100%)',
    body: `
      <p>TV coverage is strongest when it speaks to the rhythm of real watching habits. Most people are not choosing only by genre; they are choosing by energy level.</p>
      <p>A story like this helps the entertainment section feel friendly and current without needing a giant release calendar.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-entertainment-movie-night',
    sectionKey: 'entertainment',
    topicSlug: 'movies',
    title: 'The Best Movie Nights Start With One Strong Theme and Zero Overplanning',
    category: 'Movies',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-21',
    excerpt: 'Pick one mood, one snack direction, and one reason the movie matches the night, and the rest usually falls into place.',
    image: 'linear-gradient(135deg, #e7ddd3 0%, #c9b29e 50%, #947d71 100%)',
    body: `
      <p>Movie stories give the site another easy-entry format that can be both service-driven and atmospheric. They make the entertainment section feel lived in.</p>
      <p>That balance is useful on a new site, where every section needs enough depth to invite people back.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-entertainment-book-club',
    sectionKey: 'entertainment',
    topicSlug: 'books',
    title: 'A Better Book-Club Pick Balances Discussion Potential With Pure Readability',
    category: 'Books',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-20',
    excerpt: 'The strongest picks are the ones people can finish, argue about, and still recommend to someone outside the group.',
    image: 'linear-gradient(135deg, #ece4d5 0%, #d5c0a4 48%, #aa8d72 100%)',
    body: `
      <p>Books coverage helps round out the culture mix. It signals that the site is not only chasing immediacy, but also making space for slower recommendations and richer discussion.</p>
      <p>That gives the entertainment section longer shelf life overall.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-entertainment-backlist-books',
    sectionKey: 'entertainment',
    topicSlug: 'books',
    title: 'Why Backlist Books Sometimes Hit Harder Than the New-Release Table',
    category: 'Books',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-19',
    excerpt: 'A strong older title arrives without hype pressure, which can make the reading experience feel more personal and lasting.',
    image: 'linear-gradient(135deg, #ebe1da 0%, #ccb7aa 50%, #9f8376 100%)',
    body: `
      <p>Backlist coverage is useful in a starter archive because it immediately broadens the tone of the section. It tells readers the site can recommend, not only react.</p>
      <p>That makes the books category feel more intentional from the start.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-food-dinner-party-flow',
    sectionKey: 'food',
    topicSlug: 'recipes',
    title: 'The Best Dinner Parties Move on a Simple Three-Course Rhythm',
    category: 'Recipes',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-18',
    excerpt: 'One bright starter, one generous main, and one low-stress dessert is usually enough to make the night feel complete.',
    image: 'linear-gradient(135deg, #f2dbb4 0%, #ddb07b 48%, #b97d5d 100%)',
    body: `
      <p>Food content gets stronger fast when it starts to reflect real-life hosting. Not everything has to be a recipe card; some of the most useful reads are about sequencing and confidence.</p>
      <p>That kind of framing adds range to the section right away.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-food-drinks-cart',
    sectionKey: 'food',
    topicSlug: 'cocktails',
    title: 'A Drinks Cart Feels Better When It Is Edited Like a Small Menu',
    category: 'Cocktails',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-17',
    excerpt: 'Three reliable pours, one bright mixer, and one bottle that sparks conversation is usually all you need.',
    image: 'linear-gradient(135deg, #f2d7c3 0%, #db9f7a 48%, #ae715a 100%)',
    body: `
      <p>Cocktail stories add a different energy to the food section. They feel social, visual, and easy to revisit ahead of weekends or small gatherings.</p>
      <p>That makes them a strong fit for a starter archive meant to feel broad without becoming noisy.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-food-lunch-reset',
    sectionKey: 'food',
    topicSlug: 'food-news-and-menu-updates',
    title: 'Why Midday Food Coverage Works Best When It Solves the 1 PM Slump',
    category: 'Food News & Menu Updates',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-16',
    excerpt: 'The most useful lunch ideas balance speed, texture, and enough flavor to stop the afternoon from flattening out.',
    image: 'linear-gradient(135deg, #f1dbb7 0%, #e0b17f 46%, #bd815c 100%)',
    body: `
      <p>Stories about quick meals and midday resets are easy wins because they map directly onto everyday reader behavior. They also keep food coverage from leaning too far into occasion-only content.</p>
      <p>That balance matters on a homepage that wants to feel active all week long.</p>
    `,
    readMinutes: 3,
    featureRank: null,
    recentRank: null,
    popularRank: null,
    isHomeLead: false,
  },
  {
    id: 'starter-travel-neighborhood-hotel',
    sectionKey: 'travel',
    topicSlug: 'travel',
    title: 'The Best City Hotels Make You Want to Spend Time in the Neighborhood Too',
    category: 'Travel',
    author: 'Sponbit Editorial',
    publishDate: '2026-04-15',
    excerpt: 'A stay feels more memorable when the hotel is part retreat, part launchpad, and not a sealed-off bubble.',
    image: 'linear-gradient(135deg, #d8e4e1 0%, #acc4bc 48%, #6f9289 100%)',
    body: `
      <p>Travel stories do their best work when they suggest a whole rhythm rather than a checklist. Readers want to imagine how a stay will feel, not just where they will sleep.</p>
      <p>That makes neighborhood-focused travel coverage especially effective in a starter archive.</p>
    `,
    readMinutes: 4,
    featureRank: null,
    recentRank: null,
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