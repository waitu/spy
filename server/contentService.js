import { query } from './db.js';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function storyPath(storyId) {
  return `/story/${storyId}`;
}

function sectionPath(sectionKey) {
  return `/section/${sectionKey}`;
}

function topicPath(sectionKey, topicSlug) {
  return `/section/${sectionKey}/${topicSlug}`;
}

function formatStory(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    author: row.author,
    date: formatDate(row.publish_date),
    excerpt: row.excerpt,
    image: row.image,
    body: row.body,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    isExternal: row.is_external,
    readMinutes: row.read_minutes,
    sectionKey: row.section_key,
    sectionLabel: row.section_label,
    topicSlug: row.topic_slug,
    topicLabel: row.topic_label,
    path: storyPath(row.id),
    publishDate: row.publish_date,
    featureRank: row.feature_rank,
    recentRank: row.recent_rank,
    popularRank: row.popular_rank,
    isHomeLead: row.is_home_lead,
  };
}

function groupTopics(sections, topics) {
  return sections.map((section) => ({
    ...section,
    path: sectionPath(section.key),
    items: topics
      .filter((topic) => topic.section_id === section.id)
      .map((topic) => ({
        id: topic.id,
        label: topic.label,
        slug: topic.slug,
        description: topic.description,
        path: topicPath(section.key, topic.slug),
      })),
  }));
}

async function loadBaseData() {
  const [sectionsResult, topicsResult, storiesResult] = await Promise.all([
    query('select id, key, label, description, position from sections order by position asc, label asc'),
    query(
      `select id, section_id, slug, label, description, position
       from topics
       order by section_id asc, position asc, label asc`
    ),
    query(
      `select stories.id, stories.title, stories.category, stories.author, stories.publish_date,
              stories.excerpt, stories.image, stories.body,
              stories.source_name, stories.source_url, stories.is_external, stories.read_minutes,
              stories.feature_rank, stories.recent_rank, stories.popular_rank, stories.is_home_lead,
              sections.key as section_key, sections.label as section_label,
              topics.slug as topic_slug, topics.label as topic_label
       from stories
       join sections on sections.id = stories.section_id
       left join topics on topics.id = stories.topic_id
       order by stories.publish_date desc, stories.id asc`
    ),
  ]);

  const sections = sectionsResult.rows;
  const topics = topicsResult.rows;
  const stories = storiesResult.rows.map(formatStory);
  const navigation = groupTopics(sections, topics);

  return { sections, topics, stories, navigation };
}

function sortByRank(items, rankKey, fallbackKey = 'publishDate') {
  return [...items].sort((left, right) => {
    const leftRank = left[rankKey];
    const rightRank = right[rankKey];

    if (leftRank == null && rightRank != null) {
      return 1;
    }

    if (leftRank != null && rightRank == null) {
      return -1;
    }

    if (leftRank != null && rightRank != null && leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return String(right[fallbackKey]).localeCompare(String(left[fallbackKey]));
  });
}

function take(items, count, excludeIds = []) {
  const excluded = new Set(excludeIds);
  return items.filter((item) => !excluded.has(item.id)).slice(0, count);
}

export async function getNavigationData() {
  const { navigation, topics } = await loadBaseData();

  return {
    navSections: navigation,
    topics: topics.slice(0, 8).map((topic) => {
      const section = navigation.find((item) => item.id === topic.section_id);
      return {
        id: topic.id,
        label: topic.label,
        path: topicPath(section.key, topic.slug),
      };
    }),
  };
}

export async function getHomePageData() {
  const { navigation, stories } = await loadBaseData();
  const lead = stories.find((story) => story.isHomeLead) ?? stories[0] ?? null;
  const featured = take(sortByRank(stories.filter((story) => story.featureRank != null), 'featureRank'), 3, lead ? [lead.id] : []);
  const recent = take(sortByRank(stories.filter((story) => story.recentRank != null), 'recentRank'), 4, lead ? [lead.id] : []);
  const popular = take(sortByRank(stories.filter((story) => story.popularRank != null), 'popularRank'), 3, lead ? [lead.id] : []);

  return {
    masthead: {
      eyebrow: 'Latest Stories',
      title: 'Fresh stories organized by section and topic',
      description: 'The homepage now reflects live editorial metadata grouped across every channel and subtopic.',
    },
    lead,
    featured,
    recent,
    popular,
    editorNote: {
      title: 'Live feed-backed content',
      text: 'Stories are served from Postgres through the Express API, with source attribution preserved for external articles.',
    },
    navSections: navigation,
  };
}

export async function getSectionPageData(sectionKey) {
  const { navigation, stories } = await loadBaseData();
  const section = navigation.find((item) => item.key === sectionKey);

  if (!section) {
    return null;
  }

  const sectionStories = stories.filter((story) => story.sectionKey === sectionKey);
  const ordered = sortByRank(sectionStories, 'featureRank');
  const lead = ordered[0] ?? sectionStories[0] ?? null;
  const secondary = take(ordered, 3, lead ? [lead.id] : []);
  const featured = take(ordered, 4, lead ? [lead.id] : []);
  const recent = take(sortByRank(sectionStories, 'recentRank'), 4, lead ? [lead.id] : []);
  const popular = take(sortByRank(sectionStories, 'popularRank'), 3, lead ? [lead.id] : []);

  return {
    section,
    lead,
    secondary,
    featured,
    recent,
    popular,
    editorNote: {
      title: `${section.label} channel`,
      text: `Stories in the ${section.label} channel are queried directly from the database using section, topic, and display rank.` ,
    },
  };
}

export async function getTopicPageData(sectionKey, topicSlug) {
  const { navigation, stories } = await loadBaseData();
  const section = navigation.find((item) => item.key === sectionKey);

  if (!section) {
    return null;
  }

  const topic = section.items.find((item) => item.slug === topicSlug);
  if (!topic) {
    return null;
  }

  const topicStories = stories.filter((story) => story.sectionKey === sectionKey && story.topicSlug === topicSlug);
  const ordered = sortByRank(topicStories, 'featureRank');
  const lead = ordered[0] ?? topicStories[0] ?? null;
  const secondary = take(ordered, 3, lead ? [lead.id] : []);
  const featured = take(ordered, 3, lead ? [lead.id] : []);
  const recent = take(sortByRank(topicStories, 'recentRank'), 4, lead ? [lead.id] : []);
  const popular = take(sortByRank(topicStories, 'popularRank'), 3, lead ? [lead.id] : []);

  return {
    section,
    topic,
    lead,
    secondary,
    featured,
    recent,
    popular,
  };
}

export async function getStoryPageData(storyId) {
  const { stories } = await loadBaseData();
  const story = stories.find((item) => item.id === storyId);

  if (!story) {
    return null;
  }

  const related = take(
    sortByRank(
      stories.filter(
        (item) => item.id !== storyId && (item.topicSlug === story.topicSlug || item.sectionKey === story.sectionKey)
      ),
      'recentRank'
    ),
    3
  );

  return { story, related };
}

export async function getAdminDashboard() {
  const { sections, topics, stories, navigation } = await loadBaseData();

  return {
    sections: navigation,
    topics: topics.map((topic) => ({
      ...topic,
      sectionKey: sections.find((section) => section.id === topic.section_id)?.key ?? null,
    })),
    stories,
  };
}

export async function createSection(payload) {
  const result = await query(
    `insert into sections (key, label, description, position)
     values ($1, $2, $3, $4)
     returning id, key, label, description, position`,
    [payload.key, payload.label, payload.description, Number(payload.position ?? 0)]
  );

  return result.rows[0];
}

export async function updateSection(sectionId, payload) {
  const result = await query(
    `update sections
     set key = $2, label = $3, description = $4, position = $5
     where id = $1
     returning id, key, label, description, position`,
    [sectionId, payload.key, payload.label, payload.description, Number(payload.position ?? 0)]
  );

  return result.rows[0] ?? null;
}

export async function deleteSection(sectionId) {
  await query('delete from sections where id = $1', [sectionId]);
}

export async function createTopic(payload) {
  const result = await query(
    `insert into topics (section_id, slug, label, description, position)
     values ($1, $2, $3, $4, $5)
     returning id, section_id, slug, label, description, position`,
    [Number(payload.sectionId), payload.slug, payload.label, payload.description, Number(payload.position ?? 0)]
  );

  return result.rows[0];
}

export async function updateTopic(topicId, payload) {
  const result = await query(
    `update topics
     set section_id = $2, slug = $3, label = $4, description = $5, position = $6
     where id = $1
     returning id, section_id, slug, label, description, position`,
    [topicId, Number(payload.sectionId), payload.slug, payload.label, payload.description, Number(payload.position ?? 0)]
  );

  return result.rows[0] ?? null;
}

export async function deleteTopic(topicId) {
  await query('delete from topics where id = $1', [topicId]);
}

function normalizeNullableNumber(value) {
  if (value === '' || value == null) {
    return null;
  }

  return Number(value);
}

function assertPublishDateIsNotPast(publishDate) {
  const normalizedDate = String(publishDate ?? '').trim();
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (!normalizedDate || normalizedDate < todayValue) {
    const error = new Error('Publish date must be today or later.');
    error.status = 400;
    throw error;
  }
}

export async function createStory(payload) {
  assertPublishDateIsNotPast(payload.publishDate);

  const result = await query(
    `insert into stories (
      id, section_id, topic_id, title, category, author, publish_date, excerpt, image, body,
      read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     returning id`,
    [
      payload.id,
      Number(payload.sectionId),
      normalizeNullableNumber(payload.topicId),
      payload.title,
      payload.category,
      payload.author,
      payload.publishDate,
      payload.excerpt,
      payload.image,
      payload.body,
      Number(payload.readMinutes ?? 8),
      normalizeNullableNumber(payload.featureRank),
      normalizeNullableNumber(payload.recentRank),
      normalizeNullableNumber(payload.popularRank),
      Boolean(payload.isHomeLead),
    ]
  );

  return result.rows[0];
}

export async function updateStory(storyId, payload) {
  assertPublishDateIsNotPast(payload.publishDate);

  const result = await query(
    `update stories
     set section_id = $2,
         topic_id = $3,
         title = $4,
         category = $5,
         author = $6,
         publish_date = $7,
         excerpt = $8,
         image = $9,
         body = $10,
         read_minutes = $11,
         feature_rank = $12,
         recent_rank = $13,
         popular_rank = $14,
         is_home_lead = $15,
         updated_at = now()
     where id = $1
     returning id`,
    [
      storyId,
      Number(payload.sectionId),
      normalizeNullableNumber(payload.topicId),
      payload.title,
      payload.category,
      payload.author,
      payload.publishDate,
      payload.excerpt,
      payload.image,
      payload.body,
      Number(payload.readMinutes ?? 8),
      normalizeNullableNumber(payload.featureRank),
      normalizeNullableNumber(payload.recentRank),
      normalizeNullableNumber(payload.popularRank),
      Boolean(payload.isHomeLead),
    ]
  );

  return result.rows[0] ?? null;
}

export async function deleteStory(storyId) {
  await query('delete from stories where id = $1', [storyId]);
}
