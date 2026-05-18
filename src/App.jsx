import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSite } from './context/SiteContext';
import { AdminShell } from './components/AdminShell';
import { Layout } from './components/Layout';
import { HeroSection, PageMasthead } from './components/HeroSection';
import { FeatureRow, PopularList, RecentList, StoryGrid, StoryMiniList } from './components/StoryCards';
import { NewsletterCard, SidebarBox, TopicCloud } from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { useApiResource } from './lib/useApiResource';
import { fetchJson } from './lib/api';
import { parseStoryBody, sectionPath, storyPath, toStoryImageBackground, topicPath } from './lib/content';
import { AdminPage } from './pages/AdminPage';
import { PinterestDashboardPage } from './pages/PinterestDashboardPage';
import { SignInPage, SignUpPage } from './pages/AuthPage';

function Breadcrumbs({ items }) {
  return (
    <nav className="site-width breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="breadcrumbs__item">
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            {!isLast ? <span className="breadcrumbs__separator">&gt;</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

function PageState({ title, description }) {
  return (
    <section className="site-width page-state story-surface">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

function GuestOnlyRoute({ children }) {
  const { authReady, user } = useAuth();

  if (!authReady) {
    return <PageState title="Checking session…" />;
  }

  if (user) {
    return <Navigate replace to={user.role === 'admin' ? '/admin' : '/'} />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { authReady, user } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <PageState title="Loading admin session…" />;
  }

  if (!user) {
    return <Navigate replace to="/signin" state={{ from: location.pathname }} />;
  }

  if (user.role !== 'admin') {
    return <PageState title="Admin only" description="Your account is signed in, but it does not have access to the admin workspace." />;
  }

  return children;
}

function ChannelDirectory({ navSections }) {
  return (
    <section className="channel-directory site-width">
      <div className="section-heading section-heading--channels">
        <div className="section-heading__copy">
          <span className="eyebrow">All Channels</span>
          <h2>Browse every subject</h2>
          <p>Move through every editorial lane from food and culture to travel, holidays, and more.</p>
        </div>
        <div className="section-heading__meta">
          <strong>{navSections.length}</strong>
          <span>live channels</span>
        </div>
      </div>
      <div className="channel-card-grid">
        {navSections.map((section) => (
          <article key={section.key} className="channel-card story-surface">
            <div className="channel-card__top">
              <span className="eyebrow">{section.label}</span>
              <span className="channel-card__count">{section.items.length} topics</span>
            </div>
            <div className="channel-card__copy">
              <h3>{section.label}</h3>
              <p>{section.description}</p>
            </div>
            <div className="channel-card__topics">
              {section.items.slice(0, 4).map((item) => (
                <Link key={item.slug} to={`/section/${section.key}/${item.slug}`}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="channel-card__footer">
              <Link className="channel-card__link" to={section.path}>
                Explore channel
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TopicDirectory({ section }) {
  return (
    <section className="channel-directory site-width">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Subcategories</span>
          <h2>{section.label} topics</h2>
        </div>
        <Link className="section-link" to="/">
          Back home
        </Link>
      </div>
      <div className="subtopic-grid">
        {section.items.map((item) => (
          <Link key={item.slug} className="subtopic-card story-surface" to={`/section/${section.key}/${item.slug}`}>
            <span className="eyebrow">{section.label}</span>
            <h3>{item.label}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  const { navSections } = useSite();
  const { data, loading, error } = useApiResource('/api/home', []);

  if (loading) {
    return <PageState title="Loading homepage…" />;
  }

  if (error) {
    return <PageState title="Unable to load the homepage" description={error.message} />;
  }

  if (!data?.lead) {
    return <PageState title="No homepage content yet" description="Add a story in the admin workspace to populate the site." />;
  }

  return (
    <>
      <PageMasthead
        variant="home"
        eyebrow={data.masthead.eyebrow}
        title={data.masthead.title}
        description={data.masthead.description}
      />
      <HeroSection lead={data.lead} secondary={data.featured} />
      <ChannelDirectory navSections={navSections} />
      <section className="editor-picks site-width" aria-label="Editor picks">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Editor Picks</span>
            <h2>Highlights across the site</h2>
          </div>
        </div>
        <FeatureRow stories={data.featured} />
      </section>
      <section className="content-layout site-width" id="content">
        <div className="content-main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recent</span>
              <h2>Latest across all channels</h2>
            </div>
          </div>
          <RecentList stories={data.recent} />
        </div>
        <aside className="content-sidebar">
          <NewsletterCard />
          <SidebarBox title="Popular" id="popular">
            <PopularList stories={data.popular} />
          </SidebarBox>
          <TopicCloud />
        </aside>
      </section>
    </>
  );
}

function SectionPage() {
  const { sectionKey } = useParams();
  const { data, loading, error } = useApiResource(`/api/sections/${sectionKey}`, [sectionKey]);

  if (loading) {
    return <PageState title="Loading section…" />;
  }

  if (error) {
    return <PageState title="Section unavailable" description={error.message} />;
  }

  if (!data?.section) {
    return <PageState title="Section not found" description="This section does not exist or has been removed." />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: data.section.label }]} />
      <PageMasthead
        eyebrow={data.section.label}
        title={data.section.label}
        description={data.section.description}
      />
      {data.lead ? <HeroSection lead={data.lead} secondary={data.secondary} /> : (
        <div className="site-width"><PageState title="No stories yet" description="Stories will appear here once content is published in this section." /></div>
      )}
      <TopicDirectory section={data.section} />
      <section className="content-layout site-width">
        <div className="content-main wide">
          <section className="category-block">
              <div className="section-heading compact">
                <div>
                  <span className="eyebrow">Featured</span>
                  <h2>{data.section.label} highlights</h2>
                </div>
              </div>
              <StoryGrid stories={data.featured} />
            </section>
            <section className="category-block">
              <div className="section-heading compact">
                <div>
                  <span className="eyebrow">Recent</span>
                  <h2>Latest in {data.section.label}</h2>
                </div>
              </div>
              <RecentList stories={data.recent} />
            </section>
        </div>
        <aside className="content-sidebar">
          <SidebarBox title="Editor Note">
            <div className="editor-note">
              <h3>{data.editorNote.title}</h3>
              <p>{data.editorNote.text}</p>
            </div>
          </SidebarBox>
          <SidebarBox title="Popular Right Now">
            <PopularList stories={data.popular} />
          </SidebarBox>
        </aside>
      </section>
    </>
  );
}

function TopicPage() {
  const { sectionKey, topicSlug } = useParams();
  const { data, loading, error } = useApiResource(`/api/sections/${sectionKey}/topics/${topicSlug}`, [sectionKey, topicSlug]);

  if (loading) {
    return <PageState title="Loading topic…" />;
  }

  if (error) {
    return <PageState title="Topic unavailable" description={error.message} />;
  }

  if (!data?.topic) {
    return <PageState title="Topic not found" description="This topic does not exist or has been removed." />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: data.section.label, to: sectionPath(data.section.key) }, { label: data.topic.label }]} />
      <PageMasthead
        eyebrow={data.section.label}
        title={data.topic.label}
        description={`${data.topic.label} is a live topic page inside the ${data.section.label} channel.`}
      />
      {data.lead ? <HeroSection lead={data.lead} secondary={data.secondary} /> : (
        <div className="site-width"><PageState title="No stories yet" description="Stories will appear here once content is published in this topic." /></div>
      )}
      <section className="category-hero site-width">
        <div className="category-hero__main story-surface">
          <span className="eyebrow">Inside {data.section.label}</span>
          <h2>{data.topic.label}</h2>
          <p>
            This page is queried by `section + topic` from Postgres, so each subcategory can be managed as a real
            destination instead of a static dropdown label.
          </p>
          <div className="meta-row">
            <span>{data.section.label} channel</span>
            <span>{data.section.items.length} subtopics</span>
          </div>
        </div>
        <div className="category-hero__side">
          <StoryMiniList stories={data.featured} />
        </div>
      </section>
      <section className="content-layout site-width">
        <div className="content-main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recent</span>
              <h2>{data.topic.label} stories</h2>
            </div>
            <Link className="section-link" to={sectionPath(data.section.key)}>
              View {data.section.label}
            </Link>
          </div>
          <RecentList stories={data.recent} />
        </div>
        <aside className="content-sidebar">
          <SidebarBox title="More in this channel">
            <div className="topic-link-list">
              {data.section.items.map((item) => (
                <Link key={item.slug} to={topicPath(data.section.key, item.slug)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </SidebarBox>
          <SidebarBox title="Popular Right Now">
            <PopularList stories={data.popular} />
          </SidebarBox>
        </aside>
      </section>
    </>
  );
}

function isExternalHref(value) {
  return /^https?:\/\//i.test(String(value ?? '').trim());
}

function absolutizeUrl(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized || typeof window === 'undefined') {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return new URL(normalized, window.location.origin).toString();
}

function ShareGlyph({ kind }) {
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.7-1.6H16V4.9c-.4-.1-1.3-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.3V11H7v3h2.5v7h4Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === 'x') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M17.2 3H21l-8.3 9.5L22 21h-7.2l-5.6-6.6L3.4 21H.9l8.9-10.1L1 3h7.3l5 6 3.9-6ZM16 19h2l-11-14H5l11 14Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === 'pinterest') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3a9 9 0 0 0-3.2 17.4c0-.8 0-2 .2-2.8l1.3-5.4s-.3-.7-.3-1.8c0-1.7 1-3 2.3-3 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.8-1.1 4.4-.3 1.3.7 2.3 1.9 2.3 2.3 0 3.8-2.9 3.8-6.3 0-2.6-1.8-4.6-5-4.6-3.6 0-5.8 2.7-5.8 5.7 0 1 .3 1.8.8 2.4.2.2.2.3.1.6l-.3 1.1c-.1.4-.4.5-.7.3-1.8-.7-2.7-2.7-2.7-4.8 0-3.6 3-7.9 9.1-7.9 4.9 0 8.2 3.5 8.2 7.3 0 5-2.8 8.7-7 8.7-1.4 0-2.7-.7-3.1-1.5l-.9 3.3c-.3 1.1-.9 2.3-1.5 3.1.9.3 1.8.5 2.8.5a9 9 0 1 0 0-18Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 .5v.2l6 4.5 6-4.5V7h-12Zm12 2.7-5.4 4a1 1 0 0 1-1.2 0L6 9.7V17h12V9.7Z" fill="currentColor" />
    </svg>
  );
}

function StoryShareActions({ story }) {
  const storyUrl = absolutizeUrl(story.path);
  const storyImage = absolutizeUrl(story.image);
  const title = String(story.title ?? '').trim();
  const shareText = [title, story.excerpt].filter(Boolean).join(' - ');
  const encodedUrl = encodeURIComponent(storyUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(shareText);
  const encodedImage = encodeURIComponent(storyImage);

  const links = [
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'pinterest',
      label: 'Pinterest',
      href: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  return (
    <div className="story-share" aria-label="Share this story">
      <span className="story-share__label">Share</span>
      <div className="story-share__actions">
        {links.map((item) => (
          <a
            key={item.key}
            className={`story-share__link story-share__link--${item.key}`}
            href={item.href}
            target={item.key === 'email' ? undefined : '_blank'}
            rel={item.key === 'email' ? undefined : 'noreferrer'}
            aria-label={`Share on ${item.label}`}
            title={`Share on ${item.label}`}
          >
            <span className="story-share__icon">
              <ShareGlyph kind={item.key} />
            </span>
            <span className="story-share__text">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function looksLikeRichHtml(value) {
  return /<\/?(p|h2|h3|ul|ol|li|blockquote|a|img|strong|em)\b/i.test(String(value ?? ''));
}

function normalizeComparableImageUrl(value) {
  return String(value ?? '')
    .trim()
    .replace(/^url\(["']?/, '')
    .replace(/["']?\)$/, '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

function removeDuplicateLeadingCoverImage(value, coverImage) {
  const html = String(value ?? '').trim();
  const normalizedCover = normalizeComparableImageUrl(coverImage);

  if (!html || !normalizedCover) {
    return html;
  }

  const leadingImageMatch = html.match(/^\s*<img[^>]*src="([^"]+)"[^>]*>\s*(?:<br\s*\/?>\s*){0,2}/i);
  if (!leadingImageMatch) {
    return html;
  }

  const normalizedLeadingImage = normalizeComparableImageUrl(leadingImageMatch[1]);
  if (!normalizedLeadingImage || normalizedLeadingImage !== normalizedCover) {
    return html;
  }

  return html.slice(leadingImageMatch[0].length).trimStart();
}

function sanitizeStoryHtml(value, coverImage) {
  return DOMPurify.sanitize(removeDuplicateLeadingCoverImage(value, coverImage), {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
  });
}

function StoryBodyBlocks({ body, coverImage }) {
  if (looksLikeRichHtml(body)) {
    return <div className="article-rich-html" dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(body, coverImage) }} />;
  }

  const blocks = parseStoryBody(body);

  if (!blocks.length) {
    return null;
  }

  return (
    <div className="article-rich-content">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === 'heading') {
          return <h2 key={key}>{block.content}</h2>;
        }

        if (block.type === 'image') {
          return (
            <figure key={key} className="article-inline-media">
              <div
                className="article-inline-media__image"
                style={{ '--story-image': toStoryImageBackground(block.source) }}
                role="img"
                aria-label={block.alt || block.caption || 'Article image'}
              />
              {block.caption || block.credit ? (
                <figcaption>
                  {block.caption ? <span>{block.caption}</span> : null}
                  {block.credit ? <strong>{block.credit}</strong> : null}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === 'product') {
          const isExternal = isExternalHref(block.url);

          return (
            <article key={key} className="article-product-card">
              {block.image ? (
                <div
                  className="article-product-card__image"
                  style={{ '--story-image': toStoryImageBackground(block.image) }}
                  role="img"
                  aria-label={block.title || block.merchant || 'Product image'}
                />
              ) : null}
              <div className="article-product-card__body">
                {block.merchant ? <span className="eyebrow">{block.merchant}</span> : null}
                {block.title ? <h3>{block.title}</h3> : null}
                {block.description ? <p>{block.description}</p> : null}
                {block.url ? (
                  <a
                    className="article-shop-link"
                    href={block.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer' : undefined}
                  >
                    {block.ctaLabel || 'Shop now'}
                  </a>
                ) : null}
              </div>
            </article>
          );
        }

        if (block.type === 'button') {
          const isExternal = isExternalHref(block.url);

          return (
            <div key={key} className="article-button-row">
              <a
                className="article-shop-link"
                href={block.url}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              >
                {block.label}
              </a>
            </div>
          );
        }

        if (block.type === 'quote') {
          return <blockquote key={key}>{block.content}</blockquote>;
        }

        return <p key={key}>{block.content}</p>;
      })}
    </div>
  );
}

function StoryPage() {
  const { storyId } = useParams();
  const { data, loading, error } = useApiResource(`/api/stories/${storyId}`, [storyId]);

  if (loading) {
    return <PageState title="Loading story…" />;
  }

  if (error) {
    return <PageState title="Story unavailable" description={error.message} />;
  }

  if (!data?.story) {
    return <Navigate replace to="/" />;
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: data.story.sectionLabel, to: sectionPath(data.story.sectionKey) },
          ...(data.story.topicSlug
            ? [{ label: data.story.topicLabel, to: topicPath(data.story.sectionKey, data.story.topicSlug) }]
            : []),
          { label: data.story.title },
        ]}
      />
      <section className="article-shell site-width">
        <article className="article-header">
          <span className="eyebrow">{data.story.category}</span>
          <h1>{data.story.title}</h1>
          <div className="meta-row">
            <span>By {data.story.author}</span>
            <span>{data.story.date}</span>
            <span>{data.story.readMinutes} min read</span>
          </div>
          <p className="article-lead">{data.story.excerpt}</p>
          <StoryShareActions story={data.story} />
        </article>
        <div className="article-visual" style={{ '--story-image': toStoryImageBackground(data.story.image) }} />
      </section>
      <section className="article-layout site-width">
        <article className="article-body story-surface">
          <StoryBodyBlocks body={data.story.body} coverImage={data.story.image} />
        </article>
        <aside className="content-sidebar">
          <SidebarBox title="Related Stories">
            <PopularList stories={data.related} />
          </SidebarBox>
          <NewsletterCard compact />
        </aside>
      </section>
    </>
  );
}

function SearchPage() {
  const location = useLocation();
  const q = new URLSearchParams(location.search).get('q') ?? '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    setLoading(true);
    fetchJson(`/api/search?q=${encodeURIComponent(q)}`)
      .then((data) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <>
      <PageMasthead
        eyebrow="Search"
        title={q ? `Results for "${q}"` : 'Search'}
        description={loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''} found.`}
      />
      <section className="site-width topic-layout">
        <div className="topic-main">
          {results.length > 0 ? (
            <StoryGrid stories={results} />
          ) : !loading && q ? (
            <PageState title="No results" description={`Nothing matched "${q}". Try a different term.`} />
          ) : null}
        </div>
      </section>
    </>
  );
}

function PrivacyPolicyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Privacy Policy' }]} />
      <PageMasthead
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Sponbit collects, uses, and protects information across the website and connected publishing tools."
      />
      <section className="site-width topic-layout">
        <article className="topic-main page-state story-surface">
          <p><strong>Effective date:</strong> May 14, 2026</p>
          <p>
            Sponbit.com collects limited information needed to operate the website, measure traffic, manage accounts,
            and publish content to connected services such as Pinterest.
          </p>

          <h2>Information We Collect</h2>
          <p>
            We may collect basic usage data such as browser type, pages viewed, referring pages, approximate location,
            and device information through analytics tools. If you create an account or contact us, we may also collect
            your name, email address, and the information you provide directly.
          </p>

          <h2>How We Use Information</h2>
          <p>We use information to operate the website, improve content, maintain security, manage admin access, and understand site performance.</p>
          <p>
            If you authorize a third-party connection such as Pinterest, we use the granted access only to support content publishing,
            scheduling, board selection, and related reporting inside the Sponbit admin tools.
          </p>

          <h2>Pinterest API Data</h2>
          <p>
            When Sponbit is connected to Pinterest, the site may access account profile details, boards, pins, and related metadata
            required to create, schedule, publish, or review pins. This access is used solely for operating Sponbit-owned publishing workflows.
          </p>
          <p>
            We do not sell Pinterest data or use it for unrelated advertising purposes. Connected account access can be revoked at any time
            through Pinterest account settings or by contacting us.
          </p>

          <h2>Cookies and Analytics</h2>
          <p>
            Sponbit uses cookies and similar technologies for analytics, site performance measurement, and tag management. These tools help us
            understand how visitors use the website and improve the experience.
          </p>

          <h2>Sharing of Information</h2>
          <p>
            We do not sell personal information. We may share limited data with service providers that help operate the website,
            such as hosting, analytics, authentication, database, and publishing platform providers, only as needed to run the service.
          </p>

          <h2>Data Retention and Security</h2>
          <p>
            We retain information only for as long as necessary to operate the website, maintain records, comply with legal obligations,
            and secure the service. We use reasonable administrative and technical measures to protect data, but no system is completely secure.
          </p>

          <h2>Your Choices</h2>
          <p>
            You may limit analytics through browser settings, request removal of account-related information where applicable,
            and revoke third-party app permissions directly from the connected platform.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy questions, contact Sponbit at <a href="mailto:privacy@sponbit.com">privacy@sponbit.com</a>.
          </p>
        </article>
      </section>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

  if (isAdminArea) {
    return (
      <AdminShell>
        <Routes>
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/admin/pinterest" element={<AdminRoute><PinterestDashboardPage /></AdminRoute>} />
          <Route path="*" element={<Navigate replace to="/admin" />} />
        </Routes>
      </AdminShell>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/section/:sectionKey" element={<SectionPage />} />
        <Route path="/section/:sectionKey/:topicSlug" element={<TopicPage />} />
        <Route path="/story/:storyId" element={<StoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/signin" element={<GuestOnlyRoute><SignInPage /></GuestOnlyRoute>} />
        <Route path="/signup" element={<GuestOnlyRoute><SignUpPage /></GuestOnlyRoute>} />
        <Route path="/category" element={<Navigate replace to={sectionPath('food')} />} />
        <Route path="/article" element={<Navigate replace to={storyPath('lead-story')} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Layout>
  );
}
