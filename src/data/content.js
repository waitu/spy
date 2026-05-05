export const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const sectionPath = (sectionKey) => `/section/${sectionKey}`;
export const topicPath = (sectionKey, topicSlug) => `/section/${sectionKey}/${topicSlug}`;
export const storyPath = (storyId) => `/story/${storyId}`;

const createTopic = (label) => ({
  label,
  slug: slugify(label),
});

const createSection = (key, label, description, items) => ({
  key,
  label,
  description,
  path: sectionPath(key),
  items: items.map(createTopic),
});

const gradient = (value) => `linear-gradient(${value})`;
const withStoryPath = (story) => ({ ...story, path: storyPath(story.id) });

export const navSections = [
  createSection('shopping', 'Shopping', 'Trend-driven shopping guides and curated product picks.', [
    'Style News',
    'Trends & Inspo',
    'Shoes & Accessories',
    'Best Beauty Products',
    'Home Decor',
    'Gift Guides',
  ]),
  createSection('self-care', 'Self Care', 'Wellness, beauty and better-living content in one channel.', [
    'Beauty & Skincare',
    'Nails',
    'Hair',
    'Makeup',
    'Health',
    'Organization & Cleaning',
    'Financial Wellness',
    'A Better Work Life',
    'Creativity & DIY',
  ]),
  createSection('celebrity', 'Celebrity', 'Style moments, red carpet looks and celebrity culture.', [
    'Celeb Style',
    'Red Carpet',
    'Celebrity Couples',
  ]),
  createSection('entertainment', 'Entertainment', 'Screen, sound and reading lists worth following.', [
    'TV Shows',
    'Movies',
    'Books',
    'Music',
  ]),
  createSection('horoscopes', 'Horoscopes', 'Astrology content organized as a proper sub-channel.', [
    'Horoscopes',
    'Ask An Astrologer',
    'Zodiac Signs',
  ]),
  createSection('food', 'Food', 'Editorial food coverage with news, recipes and seasonal inspiration.', [
    'Food News & Menu Updates',
    'Recipes',
    'Healthy Eating',
    'Appetizers',
    'Desserts',
    'Cocktails',
  ]),
  createSection('more', 'More', 'Additional editorial channels and extended sections.', [
    'Travel',
    'Holidays',
    'Relationships & Parenting',
    'Games',
  ]),
];

export const homeLead = withStoryPath({
  id: 'lead-story',
  title: 'A smarter homepage now fans out into every editorial channel instead of stopping at one food page',
  category: 'Site Home',
  author: 'Le Giang Studio',
  date: 'Apr 29, 2026',
  excerpt:
    'The new homepage fans out into every editorial channel with a clean magazine structure — from top-level sections to subcategory landing pages.',

  image: gradient('135deg, #efb36d 0%, #ff7a7d 46%, #865cff 100%'),
});

export const featuredStories = [
  {
    id: 'feature-1',
    title: 'Style news hits harder when the homepage points cleanly into each channel and subcategory',
    category: 'Shopping',
    author: 'Mai Anh',
    date: 'Apr 28, 2026',
    excerpt: 'A strong editorial homepage behaves like a launchpad for the rest of the site.',
    image: gradient('135deg, #ffcf71 0%, #ff9770 45%, #ff5f8f 100%'),
  },
  {
    id: 'feature-2',
    title: 'Beauty, celebrity and entertainment pages work better when every menu item becomes a real route',
    category: 'Self Care',
    author: 'Nhật Hạ',
    date: 'Apr 27, 2026',
    excerpt: 'The site map now expands from top-level channels to subcategory landing pages.',
    image: gradient('135deg, #ffe079 0%, #ff966f 48%, #fe4d85 100%'),
  },
  {
    id: 'feature-3',
    title: 'Food, horoscopes and more now behave like a full publishing structure instead of sample screens',
    category: 'Food',
    author: 'Khánh Linh',
    date: 'Apr 27, 2026',
    excerpt: 'Routes, navigation and content templates now scale across the whole site structure.',
    image: gradient('135deg, #8fd4ff 0%, #7f95ff 45%, #b46eff 100%'),
  },
  {
    id: 'feature-4',
    title: 'A complete channel system makes the homepage feel much closer to a real magazine portal',
    category: 'Entertainment',
    author: 'Minh Châu',
    date: 'Apr 25, 2026',
    excerpt: 'The parent/child information architecture is now visible in both UI and routing.',
    image: gradient('135deg, #ffcaa3 0%, #ff8d88 52%, #865cff 100%'),
  },
].map(withStoryPath);

export const recentStories = [
  {
    id: 'recent-1',
    title: 'Shopping pages now split into style news, trend reports, accessories, decor and gift guides',
    category: 'Shopping',
    author: 'Editorial Desk',
    date: 'Apr 22, 2026',
    excerpt: 'Mỗi mục con giờ có route riêng để bạn phát triển tiếp thành chuyên mục thật.',
    image: gradient('135deg, #ffb279 0%, #ff7079 45%, #8a5bff 100%'),
  },
  {
    id: 'recent-2',
    title: 'Self care expands into skincare, nails, hair, makeup, health and life organization topics',
    category: 'Self Care',
    author: 'Editorial Desk',
    date: 'Apr 21, 2026',
    excerpt: 'Không còn chỉ là menu hiển thị; từng mục bây giờ dẫn đến trang nội dung riêng.',
    image: gradient('135deg, #ffd76f 0%, #ff996e 44%, #ff5b88 100%'),
  },
  {
    id: 'recent-3',
    title: 'Celebrity, entertainment and horoscope sections now have real landing pages and subpages',
    category: 'Celebrity',
    author: 'Editorial Desk',
    date: 'Apr 21, 2026',
    excerpt: 'Điều này giúp homepage đóng vai trò cổng nội dung tổng giống trang tham chiếu hơn nhiều.',
    image: gradient('135deg, #90dfc6 0%, #73a5ff 42%, #8c63ff 100%'),
  },
  {
    id: 'recent-4',
    title: 'Food now branches into news, recipes, healthy eating, appetizers, desserts and cocktails',
    category: 'Food',
    author: 'Feature Team',
    date: 'Apr 20, 2026',
    excerpt: 'Menu đa cấp hiện được gắn trực tiếp với router nên bạn có thể mở rộng nội dung rất nhanh.',
    image: gradient('135deg, #7acbff 0%, #638eff 46%, #845cff 100%'),
  },
  {
    id: 'recent-5',
    title: 'The “More” bucket now groups travel, holidays, relationships and games into separate pages',
    category: 'More',
    author: 'Feature Team',
    date: 'Apr 20, 2026',
    excerpt: 'Các đầu mục phụ vẫn có route riêng nhưng được gom trong một nhóm tổng như cấu trúc magazine portal.',
    image: gradient('135deg, #ffad8d 0%, #ff6e86 48%, #7e61ff 100%'),
  },
].map(withStoryPath);

export const popularStories = [
  {
    id: 'popular-1',
    title: 'The homepage now acts like a directory for every subject area',
    category: 'Site Architecture',
    author: 'Thu Hoài',
    date: 'Dec 02, 2025',
  },
  {
    id: 'popular-2',
    title: 'Each top-level channel leads to a dedicated page instead of a placeholder section',
    category: 'Navigation',
    author: 'Bảo Trân',
    date: 'Aug 15, 2025',
  },
  {
    id: 'popular-3',
    title: 'Each submenu item now resolves to its own page template',
    category: 'Routing',
    author: 'Tú An',
    date: 'Apr 16, 2026',
  },
].map(withStoryPath);

export const categoryGroups = [
  {
    slug: 'shopping-and-style',
    title: 'Shopping & Style',
    stories: [featuredStories[0], recentStories[0], featuredStories[1], recentStories[1]],
  },
  {
    slug: 'culture-and-entertainment',
    title: 'Culture & Entertainment',
    stories: [recentStories[2], featuredStories[3], featuredStories[2], recentStories[4]],
  },
  {
    slug: 'food-and-lifestyle',
    title: 'Food & Lifestyle',
    stories: [recentStories[3], homeLead, featuredStories[2], recentStories[1]],
  },
];

export const editorNote = {
  title: 'From demo to publishing map',
  text: 'Site hiện đã có cấu trúc gần một tạp chí thật hơn: homepage tổng, channel pages, subcategory pages và article pages được liên kết với nhau.',
};

export const topics = [
  { label: 'Style News', path: topicPath('shopping', 'style-news') },
  { label: 'Beauty & Skincare', path: topicPath('self-care', 'beauty-and-skincare') },
  { label: 'Celeb Style', path: topicPath('celebrity', 'celeb-style') },
  { label: 'Movies', path: topicPath('entertainment', 'movies') },
  { label: 'Food News & Menu Updates', path: topicPath('food', 'food-news-and-menu-updates') },
  { label: 'Travel', path: topicPath('more', 'travel') },
];

export const allStories = [homeLead, ...featuredStories, ...recentStories, ...popularStories];
