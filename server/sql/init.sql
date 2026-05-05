drop table if exists stories;
drop table if exists topics;
drop table if exists sections;
drop table if exists users;

create table users (
  id serial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamp not null default now()
);

create table sections (
  id serial primary key,
  key text not null unique,
  label text not null,
  description text not null,
  position integer not null default 0
);

create table topics (
  id serial primary key,
  section_id integer not null references sections(id) on delete cascade,
  slug text not null,
  label text not null,
  description text not null default '',
  position integer not null default 0,
  unique (section_id, slug)
);

create table stories (
  id text primary key,
  section_id integer not null references sections(id) on delete cascade,
  topic_id integer references topics(id) on delete set null,
  title text not null,
  category text not null,
  author text not null,
  publish_date date not null,
  excerpt text not null,
  image text not null,
  body text not null,
  read_minutes integer not null default 8,
  feature_rank integer,
  recent_rank integer,
  popular_rank integer,
  is_home_lead boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

insert into sections (key, label, description, position) values
  ('shopping', 'Shopping', 'Trend-driven shopping guides and curated product picks.', 1),
  ('self-care', 'Self Care', 'Wellness, beauty and better-living content in one channel.', 2),
  ('celebrity', 'Celebrity', 'Style moments, red carpet looks and celebrity culture.', 3),
  ('entertainment', 'Entertainment', 'Screen, sound and reading lists worth following.', 4),
  ('horoscopes', 'Horoscopes', 'Astrology content organized as a proper sub-channel.', 5),
  ('food', 'Food', 'Editorial food coverage with news, recipes and seasonal inspiration.', 6),
  ('more', 'More', 'Additional editorial channels and extended sections.', 7);

insert into topics (section_id, slug, label, description, position)
select sections.id, topic.slug, topic.label, topic.description, topic.position
from sections
join (
  values
    ('shopping', 'style-news', 'Style News', 'Daily shopping and style updates.', 1),
    ('shopping', 'trends-and-inspo', 'Trends & Inspo', 'Trend reports and moodboards.', 2),
    ('shopping', 'shoes-and-accessories', 'Shoes & Accessories', 'Accessories, shoes and finishing touches.', 3),
    ('shopping', 'best-beauty-products', 'Best Beauty Products', 'Top-rated beauty product roundups.', 4),
    ('shopping', 'home-decor', 'Home Decor', 'Home styling and decor ideas.', 5),
    ('shopping', 'gift-guides', 'Gift Guides', 'Gift picks by season and budget.', 6),
    ('self-care', 'beauty-and-skincare', 'Beauty & Skincare', 'Skin, glow and routine essentials.', 1),
    ('self-care', 'nails', 'Nails', 'Nail looks and care ideas.', 2),
    ('self-care', 'hair', 'Hair', 'Cuts, color and hair-care inspiration.', 3),
    ('self-care', 'makeup', 'Makeup', 'Makeup looks, tutorials and products.', 4),
    ('self-care', 'health', 'Health', 'Wellness and healthy routines.', 5),
    ('self-care', 'organization-and-cleaning', 'Organization & Cleaning', 'Cleaner and calmer living spaces.', 6),
    ('self-care', 'financial-wellness', 'Financial Wellness', 'Money habits and practical planning.', 7),
    ('self-care', 'a-better-work-life', 'A Better Work Life', 'Career and work-life balance.', 8),
    ('self-care', 'creativity-and-diy', 'Creativity & DIY', 'Creative projects and personal making.', 9),
    ('celebrity', 'celeb-style', 'Celeb Style', 'Celebrity outfits and styling moments.', 1),
    ('celebrity', 'red-carpet', 'Red Carpet', 'Premiere and award show coverage.', 2),
    ('celebrity', 'celebrity-couples', 'Celebrity Couples', 'Relationship and culture coverage.', 3),
    ('entertainment', 'tv-shows', 'TV Shows', 'Binge-worthy shows and recaps.', 1),
    ('entertainment', 'movies', 'Movies', 'New releases and film culture.', 2),
    ('entertainment', 'books', 'Books', 'Book lists and literary picks.', 3),
    ('entertainment', 'music', 'Music', 'Artists, playlists and trends.', 4),
    ('horoscopes', 'horoscopes', 'Horoscopes', 'Daily and weekly astrology.', 1),
    ('horoscopes', 'ask-an-astrologer', 'Ask An Astrologer', 'Advice from an astrology lens.', 2),
    ('horoscopes', 'zodiac-signs', 'Zodiac Signs', 'Traits and sign guides.', 3),
    ('food', 'food-news-and-menu-updates', 'Food News & Menu Updates', 'Restaurant, product and menu news.', 1),
    ('food', 'recipes', 'Recipes', 'Kitchen ideas and cooking guides.', 2),
    ('food', 'healthy-eating', 'Healthy Eating', 'Nutritious and balanced meals.', 3),
    ('food', 'appetizers', 'Appetizers', 'Small bites and snack tables.', 4),
    ('food', 'desserts', 'Desserts', 'Sweet treats and baking ideas.', 5),
    ('food', 'cocktails', 'Cocktails', 'Drinks, mocktails and hosting menus.', 6),
    ('more', 'travel', 'Travel', 'Trips, places and getaways.', 1),
    ('more', 'holidays', 'Holidays', 'Seasonal celebrations and hosting.', 2),
    ('more', 'relationships-and-parenting', 'Relationships & Parenting', 'Family and relationship stories.', 3),
    ('more', 'games', 'Games', 'Light culture and game nights.', 4)
) as topic(section_key, slug, label, description, position)
  on sections.key = topic.section_key;

insert into stories (
  id, section_id, topic_id, title, category, author, publish_date, excerpt, image, body,
  read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
)
select
  story.id,
  sections.id,
  topics.id,
  story.title,
  story.category,
  story.author,
  story.publish_date::date,
  story.excerpt,
  story.image,
  story.body,
  story.read_minutes,
  story.feature_rank,
  story.recent_rank,
  story.popular_rank,
  story.is_home_lead
from (
  values
    (
      'lead-story', 'food', 'food-news-and-menu-updates',
      'A smarter homepage now fans out into every editorial channel instead of stopping at one food page',
      'Site Home', 'Le Giang Studio', '2026-04-29',
      'Trang chủ mới hoạt động như một magazine hub thật và giờ lấy dữ liệu trực tiếp từ Postgres.',
      'linear-gradient(135deg, #efb36d 0%, #ff7a7d 46%, #865cff 100%)',
      'Mỗi khối nội dung trên homepage hiện được cấp dữ liệu từ API. Bạn có thể đổi tiêu đề, excerpt, vị trí hiển thị hoặc lead story ngay trong trang quản trị và frontend sẽ phản ánh lại. Cấu trúc này giúp dự án chuyển từ demo tĩnh sang một editorial stack thật sự có dữ liệu sống.',
      8, 1, 1, 1, true
    ),
    (
      'feature-1', 'shopping', 'style-news',
      'Style news hits harder when the homepage points cleanly into each channel and subcategory',
      'Shopping', 'Mai Anh', '2026-04-28',
      'A strong editorial homepage behaves like a launchpad for the rest of the site.',
      'linear-gradient(135deg, #ffcf71 0%, #ff9770 45%, #ff5f8f 100%)',
      'Channel Shopping giờ không còn là mục trang trí ở nav. Nó có dữ liệu riêng, topics riêng và bài viết riêng trong database, giúp team biên tập có thể duy trì luồng nội dung rõ ràng theo chuyên mục.',
      6, 2, 2, 2, false
    ),
    (
      'feature-2', 'self-care', 'beauty-and-skincare',
      'Beauty, celebrity and entertainment pages work better when every menu item becomes a real route',
      'Self Care', 'Nhật Hạ', '2026-04-27',
      'The site map now expands from top-level channels to subcategory landing pages.',
      'linear-gradient(135deg, #ffe079 0%, #ff966f 48%, #fe4d85 100%)',
      'Route thật cộng với dữ liệu thật giúp team nội dung theo dõi hiệu quả từng landing page. Khi mỗi topic là một record riêng, bạn có thể sắp xếp, ẩn, thêm hoặc đổi mô tả mà không phải sửa code JSX thủ công.',
      7, 3, 3, null, false
    ),
    (
      'feature-3', 'food', 'recipes',
      'Food, horoscopes and more now behave like a full publishing structure instead of sample screens',
      'Food', 'Khánh Linh', '2026-04-27',
      'Routes, navigation and content templates now scale across the whole site structure.',
      'linear-gradient(135deg, #8fd4ff 0%, #7f95ff 45%, #b46eff 100%)',
      'Từ stories đến sections và topics, toàn bộ hệ nội dung đã được normalize đủ để dùng cho homepage, section page, topic page và article page. Đây là nền tốt để mở rộng sang tag, author profile hoặc search sau này.',
      7, 4, 4, 3, false
    ),
    (
      'feature-4', 'entertainment', 'movies',
      'A complete channel system makes the homepage feel much closer to a real magazine portal',
      'Entertainment', 'Minh Châu', '2026-04-25',
      'The parent and child information architecture is now visible in both UI and routing.',
      'linear-gradient(135deg, #ffcaa3 0%, #ff8d88 52%, #865cff 100%)',
      'Khi header menu, page routing và database dùng cùng một cấu trúc section/topic, việc quản trị hệ thống trở nên nhất quán hơn. Mỗi thay đổi trong admin đều có đường đi rõ ràng ra giao diện người dùng.',
      5, 5, null, null, false
    ),
    (
      'recent-1', 'shopping', 'gift-guides',
      'Shopping pages now split into style news, trend reports, accessories, decor and gift guides',
      'Shopping', 'Editorial Desk', '2026-04-22',
      'Mỗi mục con giờ có route riêng để bạn phát triển tiếp thành chuyên mục thật.',
      'linear-gradient(135deg, #ffb279 0%, #ff7079 45%, #8a5bff 100%)',
      'Database cho phép từng story gắn với cả section lẫn topic. Vì vậy, cùng một channel lớn vẫn có thể chia nội dung rất cụ thể mà không làm rối navigation hoặc code phía frontend.',
      5, null, 6, null, false
    ),
    (
      'recent-2', 'self-care', 'health',
      'Self care expands into skincare, nails, hair, makeup, health and life organization topics',
      'Self Care', 'Editorial Desk', '2026-04-21',
      'Không còn chỉ là menu hiển thị; từng mục bây giờ dẫn đến trang nội dung riêng.',
      'linear-gradient(135deg, #ffd76f 0%, #ff996e 44%, #ff5b88 100%)',
      'Ở góc nhìn biên tập, việc có topic page riêng giúp bạn lên kế hoạch nội dung theo funnel và seasonality. Cùng lúc, admin chỉ cần thao tác CRUD thay vì sửa trực tiếp trong file mock.',
      5, null, 7, null, false
    ),
    (
      'recent-3', 'celebrity', 'celeb-style',
      'Celebrity, entertainment and horoscope sections now have real landing pages and subpages',
      'Celebrity', 'Editorial Desk', '2026-04-21',
      'Điều này giúp homepage đóng vai trò cổng nội dung tổng giống trang tham chiếu hơn nhiều.',
      'linear-gradient(135deg, #90dfc6 0%, #73a5ff 42%, #8c63ff 100%)',
      'Landing page cho từng channel không chỉ đẹp hơn mà còn có giá trị SEO và điều hướng rõ ràng hơn. Hệ thống dữ liệu hiện tại hỗ trợ điều đó bằng những endpoint riêng cho section và topic.',
      5, null, 8, null, false
    ),
    (
      'recent-4', 'food', 'healthy-eating',
      'Food now branches into news, recipes, healthy eating, appetizers, desserts and cocktails',
      'Food', 'Feature Team', '2026-04-20',
      'Menu đa cấp hiện được gắn trực tiếp với router nên bạn có thể mở rộng nội dung rất nhanh.',
      'linear-gradient(135deg, #7acbff 0%, #638eff 46%, #845cff 100%)',
      'Phần Food là ví dụ tốt nhất cho kiến trúc mới: nhiều topic, nhiều article type và một section page có thể được biên tập như một mini-homepage. Mọi thứ đều đang đi từ dữ liệu thay vì hard-code.',
      6, null, 9, null, false
    ),
    (
      'recent-5', 'more', 'travel',
      'The More bucket now groups travel, holidays, relationships and games into separate pages',
      'More', 'Feature Team', '2026-04-20',
      'Các đầu mục phụ vẫn có route riêng nhưng được gom trong một nhóm tổng như cấu trúc magazine portal.',
      'linear-gradient(135deg, #ffad8d 0%, #ff6e86 48%, #7e61ff 100%)',
      'Những section mở rộng như Travel hay Holidays thường bị nhồi vào một menu chung. Giờ chúng đã có cấu trúc rõ ràng trong database nên việc mở rộng sau này sẽ gọn gàng hơn nhiều.',
      5, null, 10, null, false
    ),
    (
      'popular-1', 'horoscopes', 'horoscopes',
      'The homepage now acts like a directory for every subject area',
      'Site Architecture', 'Thu Hoài', '2025-12-02',
      'Một homepage tốt không chỉ đẹp mà còn phải đưa người đọc tới đúng chuyên mục họ đang tìm.',
      'linear-gradient(135deg, #6db9ff 0%, #8f74ff 100%)',
      'Story dạng popular có thể không cần xuất hiện ở block feature nhưng vẫn có chỗ đứng riêng trên giao diện. Các cột rank cho phép điều khiển từng vị trí hiển thị độc lập.',
      4, null, null, 4, false
    ),
    (
      'popular-2', 'shopping', 'home-decor',
      'Each top-level channel leads to a dedicated page instead of a placeholder section',
      'Navigation', 'Bảo Trân', '2025-08-15',
      'Sự nhất quán giữa nav, route và DB giúp website giữ được cảm giác chuyên nghiệp khi mở rộng.',
      'linear-gradient(135deg, #f6ba7a 0%, #ff7a83 100%)',
      'Trong mô hình này, mỗi top-level item trong nav là một entity thật. Điều đó biến navigation thành phần có thể quản trị, đo lường và tối ưu, thay vì chỉ là code giao diện.',
      4, null, null, 5, false
    ),
    (
      'popular-3', 'entertainment', 'tv-shows',
      'Each submenu item now resolves to its own page template',
      'Routing', 'Tú An', '2026-04-16',
      'Submenu item giờ là một topic page thật với dữ liệu riêng của nó.',
      'linear-gradient(135deg, #8ae2c7 0%, #6c88ff 100%)',
      'Topic-level template rất hợp cho những chuyên mục có tần suất xuất bản cao. Với admin page hiện tại, bạn có thể thêm topic mới và bơm bài viết vào mà không cần đụng tới router code.',
      4, null, null, 6, false
    )
) as story(
  id, section_key, topic_slug, title, category, author, publish_date, excerpt, image, body,
  read_minutes, feature_rank, recent_rank, popular_rank, is_home_lead
)
join sections on sections.key = story.section_key
left join topics on topics.section_id = sections.id and topics.slug = story.topic_slug;
