import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useSite } from './context/SiteContext';
import { Layout } from './components/Layout';
import { HeroSection, PageMasthead } from './components/HeroSection';
import { FeatureRow, PopularList, RecentList, StoryGrid, StoryMiniList } from './components/StoryCards';
import { NewsletterCard, SidebarBox, TopicCloud } from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { useApiResource } from './lib/useApiResource';
import { fetchJson } from './lib/api';
import { parseStoryBody, sectionPath, storyPath, toStoryImageBackground, topicPath } from './lib/content';
import { AdminPage } from './pages/AdminPage';
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

function AdminRoute() {
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

  return <AdminPage />;
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

function looksLikeRichHtml(value) {
  return /<\/?(p|h2|h3|ul|ol|li|blockquote|a|img|strong|em)\b/i.test(String(value ?? ''));
}

function sanitizeStoryHtml(value) {
  return DOMPurify.sanitize(String(value ?? ''), {
    ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
  });
}

function StoryBodyBlocks({ body }) {
  if (looksLikeRichHtml(body)) {
    return <div className="article-rich-html" dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(body) }} />;
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
        </article>
        <div className="article-visual" style={{ '--story-image': toStoryImageBackground(data.story.image) }} />
      </section>
      <section className="article-layout site-width">
        <article className="article-body story-surface">
          <StoryBodyBlocks body={data.story.body} />
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/section/:sectionKey" element={<SectionPage />} />
        <Route path="/section/:sectionKey/:topicSlug" element={<TopicPage />} />
        <Route path="/story/:storyId" element={<StoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/signin" element={<GuestOnlyRoute><SignInPage /></GuestOnlyRoute>} />
        <Route path="/signup" element={<GuestOnlyRoute><SignUpPage /></GuestOnlyRoute>} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/category" element={<Navigate replace to={sectionPath('food')} />} />
        <Route path="/article" element={<Navigate replace to={storyPath('lead-story')} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Layout>
  );
}
