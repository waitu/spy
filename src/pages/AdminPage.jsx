import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { PageMasthead } from '../components/HeroSection';
import { RichTextEditor } from '../components/RichTextEditor';
import { useSite } from '../context/SiteContext';
import { fetchJson, getAuthToken } from '../lib/api';
import { toDateInputValue } from '../lib/content';
import { useApiResource } from '../lib/useApiResource';

function exportStoriesToXlsx(stories) {
  const origin = window.location.origin;
  const rows = stories.map((story) => ({
    URL: `${origin}/story/${story.id}`,
    Section: story.sectionLabel ?? '',
    Category: story.category ?? '',
    'Publish Date': story.date ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stories');

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `stories-${date}.xlsx`);
}

const viewOptions = [
  { key: 'sections', label: 'Sections' },
  { key: 'topics', label: 'Topics' },
  { key: 'stories', label: 'Stories' },
];

const pageSizes = {
  sections: 10,
  topics: 12,
  stories: 14,
};

const emptySection = {
  id: null,
  key: '',
  label: '',
  description: '',
  position: 0,
};

const emptyTopic = {
  id: null,
  sectionId: '',
  slug: '',
  label: '',
  description: '',
  position: 0,
};

const emptyStory = {
  id: '',
  sectionId: '',
  topicId: '',
  title: '',
  category: '',
  author: '',
  publishDate: '',
  excerpt: '',
  image: '',
  body: '',
  readMinutes: 8,
  featureRank: '',
  recentRank: '',
  popularRank: '',
  isHomeLead: false,
};

const initialFilters = {
  sections: { query: '' },
  topics: { query: '', sectionId: 'all' },
  stories: { query: '', sectionId: 'all', topicId: 'all', spotlight: 'all' },
};

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function matchesQuery(values, query) {
  if (!query) {
    return true;
  }

  return values.some((value) => normalizeText(value).includes(query));
}

function clampPage(page, totalPages) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function slugifyStoryId(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildStoryIdBase({ category, title, publishDate }) {
  const categoryPart = slugifyStoryId(category);
  const titlePart = slugifyStoryId(title);
  const datePart = String(publishDate ?? '').trim();

  return [categoryPart, titlePart, datePart].filter(Boolean).join('-');
}

function getTodayDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stripRichText(value) {
  return String(value ?? '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function AdminPanel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`admin-panel story-surface ${className}`.trim()}>
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow">Studio</span>
          <h2>{title}</h2>
        </div>
        <div className="admin-panel__heading-meta">
          <p>{description}</p>
          {actions ? <div className="admin-panel__actions">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function AdminStatus({ status }) {
  if (!status) {
    return null;
  }

  return <div className="admin-status">{status}</div>;
}

function OverviewCard({ label, value, meta }) {
  return (
    <article className="admin-overview-card story-surface">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}

function ResourceTab({ active, onClick, children }) {
  return (
    <button type="button" className={active ? 'admin-tab active' : 'admin-tab'} onClick={onClick}>
      {children}
    </button>
  );
}

function PaginationControls({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="admin-pagination" aria-label="Pagination">
      <button type="button" className="button-secondary" onClick={() => onChange(page - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" className="button-secondary" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
        Next
      </button>
    </div>
  );
}

function LibraryEmpty({ title, description }) {
  return (
    <div className="admin-library-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function StoryFieldGroup({ title, description, children }) {
  return (
    <section className="admin-field-group">
      <div className="admin-field-group__heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="admin-field-group__body">{children}</div>
    </section>
  );
}

function StoryChecklist({ items, completeCount }) {
  return (
    <section className="admin-story-aside-card story-surface">
      <div className="admin-story-aside-card__header">
        <span className="eyebrow">Readiness</span>
        <h3>
          {completeCount}/{items.length} complete
        </h3>
      </div>
      <div className="admin-story-checklist">
        {items.map((item) => (
          <div key={item.label} className={item.complete ? 'admin-check-item complete' : 'admin-check-item'}>
            <span className="admin-check-item__dot" aria-hidden="true" />
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StorySnapshot({ title, summary, metadata, spotlight, readinessLabel }) {
  return (
    <section className="admin-story-aside-card story-surface">
      <div className="admin-story-aside-card__header">
        <span className="eyebrow">Story snapshot</span>
        <h3>{title}</h3>
      </div>
      <div className="admin-story-snapshot__meta">
        {metadata.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <p>{summary}</p>
      <div className="admin-badge-list admin-badge-list--start">
        <span className="admin-badge admin-badge--accent">{readinessLabel}</span>
        {spotlight.map((item) => (
          <span key={item} className="admin-badge">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function getStoryLibraryStatus(story) {
  if (story.isHomeLead) {
    return 'Homepage lead';
  }

  if (story.featureRank != null || story.recentRank != null || story.popularRank != null) {
    return 'Positioned';
  }

  if (story.topicLabel) {
    return 'Ready for review';
  }

  return 'Draft structure';
}

export function AdminPage() {
  const { refreshNavigation } = useSite();
  const { data, loading, error, refetch } = useApiResource('/api/admin/dashboard', []);
  const [activeView, setActiveView] = useState('stories');
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [storyForm, setStoryForm] = useState(emptyStory);
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState('');
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [pages, setPages] = useState({ sections: 1, topics: 1, stories: 1 });

  const sections = data?.sections ?? [];
  const topics = data?.topics ?? [];
  const stories = data?.stories ?? [];

  const sectionsById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);

  const sectionOptions = useMemo(
    () => sections.map((section) => ({ id: section.id, label: section.label, key: section.key })),
    [sections]
  );

  const sectionTopicCounts = useMemo(
    () =>
      topics.reduce((accumulator, topic) => {
        accumulator[topic.section_id] = (accumulator[topic.section_id] ?? 0) + 1;
        return accumulator;
      }, {}),
    [topics]
  );

  const leadStory = useMemo(() => stories.find((story) => story.isHomeLead) ?? null, [stories]);

  const topicOptions = useMemo(() => {
    const activeSectionId = Number(storyForm.sectionId || topicForm.sectionId || 0);
    if (!activeSectionId) {
      return topics;
    }

    return topics.filter((topic) => topic.section_id === activeSectionId);
  }, [storyForm.sectionId, topicForm.sectionId, topics]);

  const storyFilterTopicOptions = useMemo(() => {
    if (filters.stories.sectionId === 'all') {
      return topics;
    }

    return topics.filter((topic) => String(topic.section_id) === filters.stories.sectionId);
  }, [filters.stories.sectionId, topics]);

  useEffect(() => {
    if (!storyForm.sectionId && sections[0]) {
      setStoryForm((current) => ({ ...current, sectionId: String(sections[0].id) }));
    }

    if (!topicForm.sectionId && sections[0]) {
      setTopicForm((current) => ({ ...current, sectionId: String(sections[0].id) }));
    }
  }, [sections, storyForm.sectionId, topicForm.sectionId]);

  async function refreshAll(nextMessage) {
    await Promise.all([refetch(), refreshNavigation()]);
    setStatus(nextMessage);
  }

  function resetSectionForm() {
    setSectionForm(emptySection);
  }

  function resetTopicForm(nextSectionId = topicForm.sectionId || String(sections[0]?.id ?? '')) {
    setTopicForm({ ...emptyTopic, sectionId: nextSectionId });
  }

  function resetStoryForm(nextSectionId = storyForm.sectionId || String(sections[0]?.id ?? '')) {
    setEditingStoryId(null);
    setImageUploadMessage('');
    setStoryForm({ ...emptyStory, sectionId: nextSectionId });
  }

  function editSection(section) {
    setActiveView('sections');
    setSectionForm({
      id: section.id,
      key: section.key,
      label: section.label,
      description: section.description,
      position: section.position,
    });
  }

  function editTopic(topic) {
    setActiveView('topics');
    setTopicForm({
      id: topic.id,
      sectionId: String(topic.section_id),
      slug: topic.slug,
      label: topic.label,
      description: topic.description,
      position: topic.position,
    });
  }

  function editStory(story) {
    const sectionId = sections.find((section) => section.key === story.sectionKey)?.id ?? '';
    const topicId = topics.find(
      (topic) => topic.slug === story.topicSlug && topic.section_id === sectionId
    )?.id ?? '';

    setEditingStoryId(story.id);
    setActiveView('stories');
    setImageUploadMessage('');
    setStoryForm({
      id: story.id,
      sectionId: String(sectionId),
      topicId: String(topicId),
      title: story.title,
      category: story.category,
      author: story.author,
      publishDate: toDateInputValue(story.publishDate),
      excerpt: story.excerpt,
      image: story.image,
      body: story.body,
      readMinutes: story.readMinutes,
      featureRank: story.featureRank ?? '',
      recentRank: story.recentRank ?? '',
      popularRank: story.popularRank ?? '',
      isHomeLead: story.isHomeLead,
    });
  }

  const resolvedStoryId = useMemo(() => {
    if (editingStoryId) {
      return editingStoryId;
    }

    const baseId = buildStoryIdBase({
      category: storyForm.category,
      title: storyForm.title,
      publishDate: storyForm.publishDate,
    });

    if (!baseId) {
      return '';
    }

    const existingIds = new Set(stories.map((story) => story.id));
    let nextId = baseId;
    let suffix = 2;

    while (existingIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return nextId;
  }, [editingStoryId, storyForm.category, storyForm.publishDate, storyForm.title, stories]);

  async function submitSection(event) {
    event.preventDefault();
    const method = sectionForm.id ? 'PUT' : 'POST';
    const url = sectionForm.id ? `/api/admin/sections/${sectionForm.id}` : '/api/admin/sections';

    await fetchJson(url, {
      method,
      body: JSON.stringify({
        key: sectionForm.key,
        label: sectionForm.label,
        description: sectionForm.description,
        position: Number(sectionForm.position),
      }),
    });

    resetSectionForm();
    await refreshAll('Section saved.');
  }

  async function submitTopic(event) {
    event.preventDefault();
    const method = topicForm.id ? 'PUT' : 'POST';
    const url = topicForm.id ? `/api/admin/topics/${topicForm.id}` : '/api/admin/topics';

    await fetchJson(url, {
      method,
      body: JSON.stringify({
        sectionId: Number(topicForm.sectionId),
        slug: topicForm.slug,
        label: topicForm.label,
        description: topicForm.description,
        position: Number(topicForm.position),
      }),
    });

    resetTopicForm(topicForm.sectionId);
    await refreshAll('Topic saved.');
  }

  async function submitStory(event) {
    event.preventDefault();
    const storyId = editingStoryId || resolvedStoryId;
    const method = editingStoryId ? 'PUT' : 'POST';
    const url = method === 'PUT' ? `/api/admin/stories/${editingStoryId}` : '/api/admin/stories';

    await fetchJson(url, {
      method,
      body: JSON.stringify({
        ...storyForm,
        id: storyId,
        sectionId: Number(storyForm.sectionId),
        topicId: storyForm.topicId ? Number(storyForm.topicId) : null,
        readMinutes: Number(storyForm.readMinutes),
      }),
    });

    resetStoryForm(storyForm.sectionId || String(sections[0]?.id ?? ''));
    await refreshAll('Story saved.');
  }

  async function handleDelete(url, message) {
    await fetchJson(url, { method: 'DELETE' });
    await refreshAll(message);
  }

  async function uploadStoryImage(file, target = 'cover') {
    if (!file) {
      return '';
    }

    const authToken = getAuthToken();
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    setImageUploadMessage('Uploading image…');

    try {
      const response = await fetch('/api/admin/uploads/image', {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: 'Image upload failed' }));
        throw new Error(payload.message ?? 'Image upload failed');
      }

      const payload = await response.json();
      if (target === 'cover') {
        setStoryForm((current) => ({ ...current, image: payload.url }));
        setImageUploadMessage('Cover image uploaded and attached to this story.');
      } else {
        setImageUploadMessage('Inline image uploaded and ready to insert into the article body.');
      }

      return payload.url;
    } catch (error) {
      setImageUploadMessage(error.message);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  }

  function updateFilter(view, patch) {
    setFilters((current) => ({
      ...current,
      [view]: { ...current[view], ...patch },
    }));
    setPages((current) => ({ ...current, [view]: 1 }));
  }

  const filteredSections = useMemo(() => {
    const query = normalizeText(filters.sections.query);
    return sections.filter((section) => matchesQuery([section.label, section.key, section.description], query));
  }, [filters.sections.query, sections]);

  const filteredTopics = useMemo(() => {
    const query = normalizeText(filters.topics.query);
    return topics.filter((topic) => {
      const matchesSection =
        filters.topics.sectionId === 'all' || String(topic.section_id) === filters.topics.sectionId;

      return (
        matchesSection &&
        matchesQuery(
          [topic.label, topic.slug, topic.description, sectionsById.get(topic.section_id)?.label],
          query
        )
      );
    });
  }, [filters.topics.query, filters.topics.sectionId, sectionsById, topics]);

  const filteredStories = useMemo(() => {
    const query = normalizeText(filters.stories.query);

    return [...stories]
      .filter((story) => {
        const storySectionId = String(sections.find((section) => section.key === story.sectionKey)?.id ?? '');
        const storyTopicId = String(
          topics.find(
            (topic) =>
              topic.slug === story.topicSlug &&
              String(topic.section_id) === storySectionId
          )?.id ?? ''
        );

        const matchesSection =
          filters.stories.sectionId === 'all' || storySectionId === filters.stories.sectionId;
        const matchesTopic = filters.stories.topicId === 'all' || storyTopicId === filters.stories.topicId;
        const matchesSpotlight =
          filters.stories.spotlight === 'all' ||
          (filters.stories.spotlight === 'lead' && story.isHomeLead) ||
          (filters.stories.spotlight === 'ranked' &&
            (story.featureRank != null || story.recentRank != null || story.popularRank != null));

        return (
          matchesSection &&
          matchesTopic &&
          matchesSpotlight &&
          matchesQuery(
            [
              story.id,
              story.title,
              story.author,
              story.category,
              story.excerpt,
              story.sectionLabel,
              story.topicLabel,
            ],
            query
          )
        );
      })
      .sort(
        (first, second) =>
          new Date(second.publishDate).getTime() - new Date(first.publishDate).getTime()
      );
  }, [filters.stories, sections, stories, topics]);

  const totalPages = {
    sections: Math.max(1, Math.ceil(filteredSections.length / pageSizes.sections)),
    topics: Math.max(1, Math.ceil(filteredTopics.length / pageSizes.topics)),
    stories: Math.max(1, Math.ceil(filteredStories.length / pageSizes.stories)),
  };

  useEffect(() => {
    setPages((current) => ({
      sections: clampPage(current.sections, totalPages.sections),
      topics: clampPage(current.topics, totalPages.topics),
      stories: clampPage(current.stories, totalPages.stories),
    }));
  }, [totalPages.sections, totalPages.topics, totalPages.stories]);

  const paginatedSections = useMemo(() => {
    const start = (pages.sections - 1) * pageSizes.sections;
    return filteredSections.slice(start, start + pageSizes.sections);
  }, [filteredSections, pages.sections]);

  const paginatedTopics = useMemo(() => {
    const start = (pages.topics - 1) * pageSizes.topics;
    return filteredTopics.slice(start, start + pageSizes.topics);
  }, [filteredTopics, pages.topics]);

  const paginatedStories = useMemo(() => {
    const start = (pages.stories - 1) * pageSizes.stories;
    return filteredStories.slice(start, start + pageSizes.stories);
  }, [filteredStories, pages.stories]);

  const currentTotal =
    activeView === 'sections'
      ? filteredSections.length
      : activeView === 'topics'
        ? filteredTopics.length
        : filteredStories.length;

  const currentPage = pages[activeView];
  const currentPageSize = pageSizes[activeView];
  const currentRangeStart = currentTotal ? (currentPage - 1) * currentPageSize + 1 : 0;
  const currentRangeEnd = Math.min(currentPage * currentPageSize, currentTotal);
  const todayDate = getTodayDateInputValue();
  const selectedStorySection =
    sections.find((section) => String(section.id) === storyForm.sectionId)?.label ?? 'No section';
  const selectedStoryTopic =
    topics.find((topic) => String(topic.id) === storyForm.topicId)?.label ?? 'No topic';
  const storyBodyText = stripRichText(storyForm.body);
  const storyBodyWordCount = storyBodyText ? storyBodyText.split(/\s+/).length : 0;
  const storyExcerptLength = storyForm.excerpt.trim().length;
  const storyChecklist = [
    {
      label: 'Core publishing fields',
      complete: Boolean(resolvedStoryId && storyForm.title && storyForm.author && storyForm.publishDate),
      detail: 'Title, author, and publish date should be filled before publishing.',
    },
    {
      label: 'Placement is assigned',
      complete: Boolean(storyForm.sectionId),
      detail: 'Choose where the story lives so it can appear in the correct navigation path.',
    },
    {
      label: 'Summary is usable',
      complete: storyExcerptLength >= 90,
      detail: 'Keep the excerpt descriptive enough for cards, lists, and sharing surfaces.',
    },
    {
      label: 'Body is ready',
      complete: storyBodyWordCount >= 120,
      detail: 'The article body should be substantial enough to publish confidently.',
    },
    {
      label: 'Visual is present',
      complete: Boolean(storyForm.image.trim()),
      detail: 'Add an image or gradient string so the story looks complete on the site.',
    },
  ];
  const completedStoryChecklist = storyChecklist.filter((item) => item.complete).length;
  const storyReadinessLabel =
    completedStoryChecklist === storyChecklist.length
      ? 'Ready to publish'
      : completedStoryChecklist >= 3
        ? 'Needs a final review'
        : 'Draft in progress';
  const storySpotlight = [
    storyForm.isHomeLead ? 'Homepage lead' : null,
    storyForm.featureRank ? `Feature #${storyForm.featureRank}` : null,
    storyForm.recentRank ? `Recent #${storyForm.recentRank}` : null,
    storyForm.popularRank ? `Popular #${storyForm.popularRank}` : null,
  ].filter(Boolean);

  if (loading) {
    return (
      <section className="site-width page-state story-surface">
        <h2>Loading admin data…</h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="site-width page-state story-surface">
        <h2>Unable to load the admin workspace</h2>
        <p>{error.message}</p>
      </section>
    );
  }

  return (
    <>
      <PageMasthead
        eyebrow="Admin"
        title="Content studio"
        description="A clearer publishing workspace with search, filters, and a stronger editor area for the content you manage most."
      />

      <section className="site-width admin-overview-grid">
        <OverviewCard label="Sections" value={sections.length} meta="Top-level navigation groups." />
        <OverviewCard label="Topics" value={topics.length} meta="Subcategories linked to sections." />
        <OverviewCard label="Stories" value={stories.length} meta="Published records powering the site." />
        <OverviewCard
          label="Homepage lead"
          value={leadStory ? 'Set' : 'Missing'}
          meta={leadStory ? leadStory.title : 'Choose one story to anchor the homepage.'}
        />
      </section>

      <section className="site-width admin-toolbar">
        <div className="admin-toolbar__main">
          <div className="admin-tabs" role="tablist" aria-label="Admin resources">
            {viewOptions.map((view) => (
              <ResourceTab key={view.key} active={activeView === view.key} onClick={() => setActiveView(view.key)}>
                {view.label}
              </ResourceTab>
            ))}
          </div>
          <div className="admin-toolbar__actions">
            {activeView === 'sections' ? (
              <button type="button" className="button-secondary" onClick={resetSectionForm}>
                New section
              </button>
            ) : null}
            {activeView === 'topics' ? (
              <button type="button" className="button-secondary" onClick={() => resetTopicForm()}>
                New topic
              </button>
            ) : null}
            {activeView === 'stories' ? (
              <button type="button" className="button-secondary" onClick={() => resetStoryForm()}>
                New story
              </button>
            ) : null}
          </div>
        </div>
        <div className="admin-toolbar__meta">
          <div className="admin-summary-card story-surface">
            <strong>
              {currentRangeStart}-{currentRangeEnd}
            </strong>
            <span>
              of {currentTotal} {activeView}
            </span>
          </div>
          <AdminStatus status={status} />
        </div>
      </section>

      <section
        className={
          activeView === 'stories'
            ? 'site-width admin-workspace admin-workspace--stories'
            : 'site-width admin-workspace'
        }
      >
        <div className="admin-editor-column">
          {activeView === 'sections' ? (
            <AdminPanel
              title={sectionForm.id ? `Editing ${sectionForm.label}` : 'Section editor'}
              description="Keep primary navigation clean, ordered, and easy to scan. The editor stays visible while you review the library."
              actions={
                sectionForm.id ? (
                  <button type="button" className="button-secondary" onClick={resetSectionForm}>
                    Create new section
                  </button>
                ) : null
              }
            >
              <form className="admin-form" onSubmit={submitSection}>
                <div className="admin-form__grid two-up">
                  <label>
                    Key
                    <input
                      value={sectionForm.key}
                      placeholder="e.g. shopping"
                      onChange={(event) => setSectionForm({ ...sectionForm, key: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Position
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={sectionForm.position}
                      onChange={(event) => setSectionForm({ ...sectionForm, position: event.target.value })}
                      required
                    />
                  </label>
                </div>
                <label>
                  Label
                  <input
                    value={sectionForm.label}
                    placeholder="e.g. Shopping"
                    onChange={(event) => setSectionForm({ ...sectionForm, label: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    rows="4"
                    placeholder="Short summary explaining what this section covers."
                    value={sectionForm.description}
                    onChange={(event) => setSectionForm({ ...sectionForm, description: event.target.value })}
                    required
                  />
                </label>
                <div className="admin-form__actions">
                  <button type="submit">{sectionForm.id ? 'Save section' : 'Create section'}</button>
                  <button type="button" className="button-secondary" onClick={resetSectionForm}>
                    Clear form
                  </button>
                </div>
              </form>
            </AdminPanel>
          ) : null}

          {activeView === 'topics' ? (
            <AdminPanel
              title={topicForm.id ? `Editing ${topicForm.label}` : 'Topic editor'}
              description="Manage subcategory labels that appear inside section menus and topic landing pages."
              actions={
                topicForm.id ? (
                  <button type="button" className="button-secondary" onClick={() => resetTopicForm()}>
                    Create new topic
                  </button>
                ) : null
              }
            >
              <form className="admin-form" onSubmit={submitTopic}>
                <div className="admin-form__grid two-up">
                  <label>
                    Section
                    <select
                      value={topicForm.sectionId}
                      onChange={(event) => setTopicForm({ ...topicForm, sectionId: event.target.value })}
                      required
                    >
                      {sectionOptions.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Position
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={topicForm.position}
                      onChange={(event) => setTopicForm({ ...topicForm, position: event.target.value })}
                      required
                    />
                  </label>
                </div>
                <div className="admin-form__grid two-up">
                  <label>
                    Slug
                    <input
                      value={topicForm.slug}
                      placeholder="e.g. self-care"
                      onChange={(event) => setTopicForm({ ...topicForm, slug: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Label
                    <input
                      value={topicForm.label}
                      placeholder="e.g. Self Care"
                      onChange={(event) => setTopicForm({ ...topicForm, label: event.target.value })}
                      required
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    rows="4"
                    placeholder="Describe how this topic should appear inside the section and landing pages."
                    value={topicForm.description}
                    onChange={(event) => setTopicForm({ ...topicForm, description: event.target.value })}
                    required
                  />
                </label>
                <div className="admin-form__actions">
                  <button type="submit">{topicForm.id ? 'Save topic' : 'Create topic'}</button>
                  <button type="button" className="button-secondary" onClick={() => resetTopicForm()}>
                    Clear form
                  </button>
                </div>
              </form>
            </AdminPanel>
          ) : null}

          {activeView === 'stories' ? (
            <AdminPanel
              title={editingStoryId ? `Editing ${storyForm.title || 'draft'}` : 'Story editor'}
              description="Write, review, and publish from one place. The form is grouped by task, and the right rail keeps editorial status visible while you work."
              actions={
                editingStoryId ? (
                  <button type="button" className="button-secondary" onClick={() => resetStoryForm()}>
                    Create new story
                  </button>
                ) : null
              }
              className="admin-panel--editor"
            >
              <div className="admin-story-editor">
                <form className="admin-form admin-story-form" onSubmit={submitStory}>
                  <StoryFieldGroup
                    title="Publishing setup"
                    description="Set the essential publishing information first so the story can be routed and scheduled correctly."
                  >
                    <div className="admin-form__grid two-up">
                      <label>
                        Publish date
                        <input
                          type="date"
                          min={todayDate}
                          value={storyForm.publishDate}
                          onChange={(event) => setStoryForm({ ...storyForm, publishDate: event.target.value })}
                          required
                        />
                        <small>Choose today or a future date.</small>
                      </label>
                    </div>
                    <div className="admin-form__grid two-up">
                      <label>
                        Section
                        <select
                          value={storyForm.sectionId}
                          onChange={(event) =>
                            setStoryForm({ ...storyForm, sectionId: event.target.value, topicId: '' })
                          }
                          required
                        >
                          {sectionOptions.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Topic
                        <select
                          value={storyForm.topicId}
                          onChange={(event) => setStoryForm({ ...storyForm, topicId: event.target.value })}
                        >
                          <option value="">No topic</option>
                          {topicOptions.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="admin-form__grid two-up">
                      <label>
                        Category
                        <input
                          value={storyForm.category}
                          placeholder="e.g. Shopping"
                          onChange={(event) => setStoryForm({ ...storyForm, category: event.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Author
                        <input
                          value={storyForm.author}
                          placeholder="e.g. Mai Anh"
                          onChange={(event) => setStoryForm({ ...storyForm, author: event.target.value })}
                          required
                        />
                      </label>
                    </div>
                  </StoryFieldGroup>

                  <StoryFieldGroup
                    title="Story content"
                    description="Write the parts editors care about most: headline, summary, visual treatment, and the full article body."
                  >
                    <label>
                      Title
                      <input
                        value={storyForm.title}
                        placeholder="Write the headline readers will see on cards and article pages."
                        onChange={(event) => setStoryForm({ ...storyForm, title: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Excerpt
                      <textarea
                        rows="4"
                        placeholder="Write a short summary that sells the story in homepage and section listings."
                        value={storyForm.excerpt}
                        onChange={(event) => setStoryForm({ ...storyForm, excerpt: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Image URL or gradient
                      <input
                        value={storyForm.image}
                        placeholder="e.g. /api/uploads/hero.jpg or linear-gradient(135deg, #ffd36f, #ff5f8f)"
                        onChange={(event) => setStoryForm({ ...storyForm, image: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Upload cover image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => uploadStoryImage(event.target.files?.[0], 'cover')}
                        disabled={uploadingImage}
                      />
                      <small>Upload JPG, PNG, WebP, or GIF up to 5 MB. The uploaded image is attached automatically as the story cover.</small>
                    </label>
                    {imageUploadMessage ? <div className="admin-inline-note">{imageUploadMessage}</div> : null}
                    <label>
                      Body
                      <RichTextEditor
                        value={storyForm.body}
                        onChange={(nextBody) => setStoryForm((current) => ({ ...current, body: nextBody }))}
                        onUploadImage={(file) => uploadStoryImage(file, 'body')}
                        disabled={uploadingImage}
                      />
                      <small>Use the toolbar to format the article and upload real inline images directly into the editor.</small>
                    </label>
                    <div className="admin-story-format-guide">
                      <strong>Editor workflow</strong>
                      <p>Write normally in the editor, use the toolbar for headings and links, and use the image button to upload real images straight into the article body.</p>
                    </div>
                  </StoryFieldGroup>

                  <StoryFieldGroup
                    title="Homepage and list placement"
                    description="Control how the story surfaces across homepage modules and ranking blocks."
                  >
                    <div className="admin-form__grid admin-form__grid--story-meta">
                      <label>
                        Read minutes
                        <input
                          type="number"
                          placeholder="e.g. 8"
                          value={storyForm.readMinutes}
                          onChange={(event) => setStoryForm({ ...storyForm, readMinutes: event.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Feature rank
                        <input
                          type="number"
                          placeholder="Optional"
                          value={storyForm.featureRank}
                          onChange={(event) => setStoryForm({ ...storyForm, featureRank: event.target.value })}
                        />
                      </label>
                      <label>
                        Recent rank
                        <input
                          type="number"
                          placeholder="Optional"
                          value={storyForm.recentRank}
                          onChange={(event) => setStoryForm({ ...storyForm, recentRank: event.target.value })}
                        />
                      </label>
                      <label>
                        Popular rank
                        <input
                          type="number"
                          placeholder="Optional"
                          value={storyForm.popularRank}
                          onChange={(event) => setStoryForm({ ...storyForm, popularRank: event.target.value })}
                        />
                      </label>
                    </div>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={storyForm.isHomeLead}
                        onChange={(event) => setStoryForm({ ...storyForm, isHomeLead: event.target.checked })}
                      />
                      Use as homepage lead
                    </label>
                  </StoryFieldGroup>

                  <div className="admin-form__actions admin-form__actions--sticky">
                    <button type="submit">Save story</button>
                    <button type="button" className="button-secondary" onClick={() => resetStoryForm()}>
                      Clear form
                    </button>
                  </div>
                </form>

                <aside className="admin-story-aside">
                  <StorySnapshot
                    title={storyForm.title || 'Untitled draft'}
                    summary={
                      storyForm.excerpt ||
                      'Add an excerpt to help editors review how this story will appear in cards and listing pages.'
                    }
                    metadata={[
                      selectedStorySection,
                      selectedStoryTopic,
                      storyForm.author || 'No author',
                      storyForm.publishDate || 'No publish date',
                      `${storyBodyWordCount} words`,
                      `${storyForm.readMinutes || 0} min read`,
                    ]}
                    spotlight={storySpotlight}
                    readinessLabel={storyReadinessLabel}
                  />

                  <StoryChecklist items={storyChecklist} completeCount={completedStoryChecklist} />

                  <section className="admin-story-aside-card story-surface">
                    <div className="admin-story-aside-card__header">
                      <span className="eyebrow">Editorial notes</span>
                      <h3>Before you publish</h3>
                    </div>
                    <div className="admin-story-notes">
                      <p>Check the excerpt length, confirm the section/topic path, and make sure homepage placement is intentional.</p>
                      <p>If the story is a homepage lead, keep the headline concise and the visual treatment strong.</p>
                    </div>
                  </section>
                </aside>
              </div>
            </AdminPanel>
          ) : null}
        </div>

        <div className="admin-list-column">
          {activeView === 'sections' ? (
            <AdminPanel
              title="Section library"
              description="Search and scan the live section structure without pushing the editor out of the way."
              className="admin-panel--library"
            >
              <div className="admin-library-toolbar">
                <label className="admin-search-field">
                  <span>Search sections</span>
                  <input
                    type="search"
                    placeholder="Search by label, key, or description"
                    value={filters.sections.query}
                    onChange={(event) => updateFilter('sections', { query: event.target.value })}
                  />
                </label>
              </div>
              {paginatedSections.length ? (
                <div className="admin-record-list">
                  {paginatedSections.map((section) => (
                    <article
                      key={section.id}
                      className={
                        sectionForm.id === section.id
                          ? 'admin-record-card admin-record-card--active'
                          : 'admin-record-card'
                      }
                    >
                      <div className="admin-record-card__header">
                        <div>
                          <span className="eyebrow">{section.key}</span>
                          <h3>{section.label}</h3>
                        </div>
                        <div className="admin-badge-list">
                          <span className="admin-badge">Position {section.position}</span>
                          <span className="admin-badge">{sectionTopicCounts[section.id] ?? 0} topics</span>
                        </div>
                      </div>
                      <p>{section.description}</p>
                      <div className="admin-record-card__actions">
                        <button type="button" className="button-secondary" onClick={() => editSection(section)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleDelete(`/api/admin/sections/${section.id}`, 'Section deleted.')}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <LibraryEmpty
                  title="No sections found"
                  description="Try a broader search or create a new section from the editor."
                />
              )}
              <PaginationControls
                page={pages.sections}
                totalPages={totalPages.sections}
                onChange={(page) =>
                  setPages((current) => ({
                    ...current,
                    sections: clampPage(page, totalPages.sections),
                  }))
                }
              />
            </AdminPanel>
          ) : null}

          {activeView === 'topics' ? (
            <AdminPanel
              title="Topic library"
              description="Filter topics by parent section so the list stays manageable as content grows."
              className="admin-panel--library"
            >
              <div className="admin-library-toolbar admin-library-toolbar--filters admin-library-toolbar--topics">
                <label className="admin-search-field">
                  <span>Search topics</span>
                  <input
                    type="search"
                    placeholder="Search by label, slug, or description"
                    value={filters.topics.query}
                    onChange={(event) => updateFilter('topics', { query: event.target.value })}
                  />
                </label>
                <label className="admin-inline-field">
                  <span>Section</span>
                  <select
                    value={filters.topics.sectionId}
                    onChange={(event) => updateFilter('topics', { sectionId: event.target.value })}
                  >
                    <option value="all">All sections</option>
                    {sectionOptions.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {paginatedTopics.length ? (
                <div className="admin-record-list">
                  {paginatedTopics.map((topic) => (
                    <article
                      key={topic.id}
                      className={
                        topicForm.id === topic.id
                          ? 'admin-record-card admin-record-card--active'
                          : 'admin-record-card'
                      }
                    >
                      <div className="admin-record-card__header">
                        <div>
                          <span className="eyebrow">{sectionsById.get(topic.section_id)?.label ?? 'Section'}</span>
                          <h3>{topic.label}</h3>
                        </div>
                        <div className="admin-badge-list">
                          <span className="admin-badge">{topic.slug}</span>
                          <span className="admin-badge">Position {topic.position}</span>
                        </div>
                      </div>
                      <p>{topic.description}</p>
                      <div className="admin-record-card__actions">
                        <button type="button" className="button-secondary" onClick={() => editTopic(topic)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleDelete(`/api/admin/topics/${topic.id}`, 'Topic deleted.')}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <LibraryEmpty
                  title="No topics found"
                  description="Change the filters or create a new topic from the editor."
                />
              )}
              <PaginationControls
                page={pages.topics}
                totalPages={totalPages.topics}
                onChange={(page) =>
                  setPages((current) => ({
                    ...current,
                    topics: clampPage(page, totalPages.topics),
                  }))
                }
              />
            </AdminPanel>
          ) : null}

          {activeView === 'stories' ? (
            <AdminPanel
              title="Story library"
              description="Search by title, author, category, section, or topic. The list is paged so you never need to scroll through everything at once."
              actions={
                <button type="button" className="button-secondary" onClick={() => exportStoriesToXlsx(stories)}>
                  Download XLSX
                </button>
              }
              className="admin-panel--library"
            >
              <div className="admin-library-toolbar admin-library-toolbar--filters">
                <label className="admin-search-field admin-search-field--wide">
                  <span>Search stories</span>
                  <input
                    type="search"
                    placeholder="Search by title, author, ID, category, or excerpt"
                    value={filters.stories.query}
                    onChange={(event) => updateFilter('stories', { query: event.target.value })}
                  />
                </label>
                <label className="admin-inline-field">
                  <span>Section</span>
                  <select
                    value={filters.stories.sectionId}
                    onChange={(event) =>
                      updateFilter('stories', {
                        sectionId: event.target.value,
                        topicId: 'all',
                      })
                    }
                  >
                    <option value="all">All sections</option>
                    {sectionOptions.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-inline-field">
                  <span>Topic</span>
                  <select
                    value={filters.stories.topicId}
                    onChange={(event) => updateFilter('stories', { topicId: event.target.value })}
                  >
                    <option value="all">All topics</option>
                    {storyFilterTopicOptions.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-inline-field">
                  <span>Spotlight</span>
                  <select
                    value={filters.stories.spotlight}
                    onChange={(event) => updateFilter('stories', { spotlight: event.target.value })}
                  >
                    <option value="all">All stories</option>
                    <option value="lead">Homepage lead only</option>
                    <option value="ranked">Ranked stories only</option>
                  </select>
                </label>
              </div>
              {paginatedStories.length ? (
                <div className="admin-record-list admin-record-list--stories">
                  {paginatedStories.map((story) => (
                    <article
                      key={story.id}
                      className={
                        storyForm.id === story.id
                          ? 'admin-record-card admin-record-card--story admin-record-card--active'
                          : 'admin-record-card admin-record-card--story'
                      }
                    >
                      <div className="admin-record-card__header">
                        <div>
                          <span className="eyebrow">{story.category}</span>
                          <h3>{story.title}</h3>
                        </div>
                        <div className="admin-badge-list">
                          <span className="admin-badge admin-badge--soft">{getStoryLibraryStatus(story)}</span>
                          {story.isHomeLead ? (
                            <span className="admin-badge admin-badge--accent">Homepage lead</span>
                          ) : null}
                          {story.featureRank != null ? <span className="admin-badge">Feature #{story.featureRank}</span> : null}
                          {story.recentRank != null ? <span className="admin-badge">Recent #{story.recentRank}</span> : null}
                          {story.popularRank != null ? <span className="admin-badge">Popular #{story.popularRank}</span> : null}
                        </div>
                      </div>
                      <div className="admin-record-card__meta">
                        <span>{story.id}</span>
                        <span>{story.author}</span>
                        <span>{story.sectionLabel}</span>
                        {story.topicLabel ? <span>{story.topicLabel}</span> : null}
                        <span>{story.date}</span>
                      </div>
                      <p>{story.excerpt}</p>
                      <div className="admin-record-card__actions">
                        <button type="button" className="button-secondary" onClick={() => editStory(story)}>
                          Open editor
                        </button>
                        <a
                          href={`/story/${story.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="button-secondary"
                        >
                          View on site
                        </a>
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleDelete(`/api/admin/stories/${story.id}`, 'Story deleted.')}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <LibraryEmpty
                  title="No stories found"
                  description="Adjust the search or filters, or create a new story from the editor above."
                />
              )}
              <PaginationControls
                page={pages.stories}
                totalPages={totalPages.stories}
                onChange={(page) =>
                  setPages((current) => ({
                    ...current,
                    stories: clampPage(page, totalPages.stories),
                  }))
                }
              />
            </AdminPanel>
          ) : null}
        </div>
      </section>
    </>
  );
}
