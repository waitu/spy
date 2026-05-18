import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../lib/api';

const SITE_ORIGIN = window.location.origin;

const emptyPin = {
  storyId: '',
  boardId: '',
  boardName: '',
  title: '',
  description: '',
  link: '',
  imageUrl: '',
  altText: '',
  scheduledAt: '',
};

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function absoluteUrl(value) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${SITE_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
}

function storyDestination(story) {
  if (!story) return '';
  return absoluteUrl(story.path ?? `/story/${story.id}`);
}

function storyImage(story) {
  return absoluteUrl(story?.image ?? '');
}

function createPinFromStory(story, boardState = {}) {
  if (!story) {
    return {
      ...emptyPin,
      boardId: boardState.boardId ?? '',
      boardName: boardState.boardName ?? '',
    };
  }

  return {
    ...emptyPin,
    boardId: boardState.boardId ?? '',
    boardName: boardState.boardName ?? '',
    storyId: story.id,
    title: story.title ?? '',
    description: story.excerpt ?? '',
    link: storyDestination(story),
    imageUrl: storyImage(story),
    altText: story.title ?? '',
  };
}

function truncateText(value, limit = 140) {
  const text = String(value ?? '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function hasValidBoardSelection(boardId) {
  return /^\d+$/.test(String(boardId ?? '').trim());
}

function buildStorySummary(story, pins) {
  const storyPins = pins.filter((pin) => pin.story_id === story.id);
  const postedCount = storyPins.filter((pin) => pin.status === 'posted').length;
  const scheduledCount = storyPins.filter((pin) => pin.status === 'scheduled').length;
  const draftCount = storyPins.filter((pin) => pin.status === 'draft').length;
  const failedCount = storyPins.filter((pin) => pin.status === 'failed').length;
  const latestPin = [...storyPins].sort((left, right) => new Date(right.updated_at ?? right.created_at ?? 0) - new Date(left.updated_at ?? left.created_at ?? 0))[0] ?? null;
  const boards = [...new Set(storyPins.map((pin) => pin.board_name).filter(Boolean))];

  return {
    story,
    pins: storyPins,
    pinCount: storyPins.length,
    postedCount,
    scheduledCount,
    draftCount,
    failedCount,
    boards,
    latestPin,
    hasAnyPin: storyPins.length > 0,
    hasPostedPin: postedCount > 0,
    hasQueuedPin: scheduledCount > 0 || draftCount > 0 || failedCount > 0,
  };
}

function statusBadge(status) {
  const map = {
    draft: '#8a8175',
    scheduled: '#2867d0',
    posted: '#1f8c45',
    failed: '#c54535',
  };

  return (
    <span
      style={{
        background: map[status] ?? '#8a8175',
        color: '#fff',
        fontSize: '0.72rem',
        padding: '5px 10px',
        borderRadius: 999,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {status}
    </span>
  );
}

function MetricCard({ value, label, note }) {
  return (
    <article className="admin-overview-card story-surface">
      <strong>{value}</strong>
      <p>{label}</p>
      {note ? <span className="pinterest-admin__metric-note">{note}</span> : null}
    </article>
  );
}

export function PinterestAdminTab({ stories }) {
  const [account, setAccount] = useState(null);
  const [boards, setBoards] = useState([]);
  const [pins, setPins] = useState([]);
  const [form, setForm] = useState(emptyPin);
  const [editingPinId, setEditingPinId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyPinId, setBusyPinId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStoryId, setFilterStoryId] = useState('all');
  const [filterBoardId, setFilterBoardId] = useState('all');
  const [filterCoverage, setFilterCoverage] = useState('all');
  const [pinSearch, setPinSearch] = useState('');
  const [storySearch, setStorySearch] = useState('');
  const [storySectionFilter, setStorySectionFilter] = useState('all');
  const [storyStatusSort, setStoryStatusSort] = useState('attention');
  const [coverageVisibleCount, setCoverageVisibleCount] = useState(12);
  const [composerStorySearch, setComposerStorySearch] = useState('');
  const [composerCoverage, setComposerCoverage] = useState('all');
  const [composerVisibleCount, setComposerVisibleCount] = useState(8);
  const [sortBy, setSortBy] = useState('recent');
  const [activeStoryId, setActiveStoryId] = useState('');

  const loadAccount = useCallback(async () => {
    try {
      const data = await fetchJson('/api/admin/pinterest/account');
      setAccount(data.account ?? null);
    } catch {
      setAccount(null);
    }
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      const data = await fetchJson('/api/admin/pinterest/boards');
      setBoards(data.boards ?? []);
    } catch {
      setBoards([]);
    }
  }, []);

  const loadPins = useCallback(async () => {
    const data = await fetchJson('/api/admin/pinterest/pins?limit=500');
    setPins(data.pins ?? []);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadAccount(), loadPins()]);
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }, [loadAccount, loadPins]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (account) {
      loadBoards();
      return;
    }

    setBoards([]);
  }, [account, loadBoards]);

  useEffect(() => {
    function handleFocus() {
      refreshData();
    }

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshData]);

  const availableBoards = boards.length > 0
    ? boards
    : [...new Map(
      pins
        .filter((pin) => pin.board_id)
        .map((pin) => [pin.board_id, { id: pin.board_id, name: pin.board_name ?? pin.board_id }]),
    ).values()];

  const storySummaries = stories.map((story) => buildStorySummary(story, pins));
  const storySummaryMap = Object.fromEntries(storySummaries.map((summary) => [summary.story.id, summary]));
  const selectedStory = stories.find((story) => story.id === form.storyId) ?? null;
  const selectedStorySummary = selectedStory ? storySummaryMap[selectedStory.id] ?? null : null;

  const totalPosted = pins.filter((pin) => pin.status === 'posted').length;
  const totalScheduled = pins.filter((pin) => pin.status === 'scheduled').length;
  const totalFailed = pins.filter((pin) => pin.status === 'failed').length;
  const storiesWithPins = storySummaries.filter((summary) => summary.hasAnyPin).length;
  const storiesPosted = storySummaries.filter((summary) => summary.hasPostedPin).length;
  const storiesPending = storySummaries.filter((summary) => summary.hasQueuedPin && !summary.hasPostedPin).length;
  const storiesWithoutPins = storySummaries.filter((summary) => !summary.hasAnyPin).length;
  const storySections = [...new Set(storySummaries.map((summary) => summary.story.sectionLabel).filter(Boolean))]
    .sort((left, right) => String(left).localeCompare(String(right)));

  const normalizedPinSearch = normalizeText(pinSearch);
  const filteredPins = [...pins]
    .filter((pin) => (filterStatus === 'all' ? true : pin.status === filterStatus))
    .filter((pin) => (filterStoryId === 'all' ? true : pin.story_id === filterStoryId))
    .filter((pin) => (filterBoardId === 'all' ? true : pin.board_id === filterBoardId))
    .filter((pin) => {
      if (!normalizedPinSearch) return true;
      const haystack = [pin.title, pin.description, pin.story_title, pin.board_name, pin.link].map(normalizeText).join(' ');
      return haystack.includes(normalizedPinSearch);
    })
    .sort((left, right) => {
      if (sortBy === 'title') {
        return String(left.title ?? '').localeCompare(String(right.title ?? ''));
      }

      if (sortBy === 'status') {
        return String(left.status ?? '').localeCompare(String(right.status ?? ''));
      }

      if (sortBy === 'oldest') {
        return new Date(left.created_at ?? 0) - new Date(right.created_at ?? 0);
      }

      return new Date(right.scheduled_at ?? right.posted_at ?? right.updated_at ?? right.created_at ?? 0)
        - new Date(left.scheduled_at ?? left.posted_at ?? left.updated_at ?? left.created_at ?? 0);
    });

  const normalizedStorySearch = normalizeText(storySearch);
  const filteredStories = [...storySummaries]
    .filter((summary) => {
      if (filterCoverage === 'posted') return summary.hasPostedPin;
      if (filterCoverage === 'queued') return summary.hasQueuedPin;
      if (filterCoverage === 'unpinned') return !summary.hasAnyPin;
      return true;
    })
    .filter((summary) => (storySectionFilter === 'all' ? true : summary.story.sectionLabel === storySectionFilter))
    .filter((summary) => {
      if (!normalizedStorySearch) return true;
      const haystack = [summary.story.title, summary.story.excerpt, summary.story.sectionLabel, summary.story.topicLabel]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(normalizedStorySearch);
    })
    .sort((left, right) => {
      if (storyStatusSort === 'attention') {
        const leftAttention = (left.failedCount * 20) + (left.hasAnyPin ? 0 : 10) + left.scheduledCount + left.draftCount;
        const rightAttention = (right.failedCount * 20) + (right.hasAnyPin ? 0 : 10) + right.scheduledCount + right.draftCount;
        if (rightAttention !== leftAttention) return rightAttention - leftAttention;
      }

      if (storyStatusSort === 'recent') {
        const leftTime = new Date(left.latestPin?.updated_at ?? left.latestPin?.created_at ?? 0).getTime();
        const rightTime = new Date(right.latestPin?.updated_at ?? right.latestPin?.created_at ?? 0).getTime();
        if (rightTime !== leftTime) return rightTime - leftTime;
      }

      if (storyStatusSort === 'title') {
        return String(left.story.title ?? '').localeCompare(String(right.story.title ?? ''));
      }

      const activeDelta = Number(right.story.id === activeStoryId) - Number(left.story.id === activeStoryId);
      if (activeDelta) return activeDelta;
      if (right.pinCount !== left.pinCount) return right.pinCount - left.pinCount;
      if (right.postedCount !== left.postedCount) return right.postedCount - left.postedCount;
      return String(left.story.title ?? '').localeCompare(String(right.story.title ?? ''));
    });
  const visibleFilteredStories = filteredStories.slice(0, coverageVisibleCount);

  useEffect(() => {
    setCoverageVisibleCount(12);
  }, [storySearch, filterCoverage, storySectionFilter, storyStatusSort]);

  const normalizedComposerStorySearch = normalizeText(composerStorySearch);
  const composerStories = [...storySummaries]
    .filter((summary) => {
      if (composerCoverage === 'unpinned') return !summary.hasAnyPin;
      if (composerCoverage === 'queued') return summary.hasQueuedPin;
      if (composerCoverage === 'posted') return summary.hasPostedPin;
      return true;
    })
    .filter((summary) => {
      if (!normalizedComposerStorySearch) return true;
      const haystack = [
        summary.story.title,
        summary.story.excerpt,
        summary.story.sectionLabel,
        summary.story.topicLabel,
      ].map(normalizeText).join(' ');
      return haystack.includes(normalizedComposerStorySearch);
    })
    .sort((left, right) => {
      const activeDelta = Number(right.story.id === form.storyId) - Number(left.story.id === form.storyId);
      if (activeDelta) return activeDelta;
      const unpinnedDelta = Number(!left.hasAnyPin) - Number(!right.hasAnyPin);
      if (unpinnedDelta) return unpinnedDelta;
      if (left.hasPostedPin !== right.hasPostedPin) return Number(left.hasPostedPin) - Number(right.hasPostedPin);
      return String(left.story.title ?? '').localeCompare(String(right.story.title ?? ''));
    });
  const visibleComposerStories = composerStories.slice(0, composerVisibleCount);

  useEffect(() => {
    setComposerVisibleCount(8);
  }, [composerStorySearch, composerCoverage]);

  function scrollToComposer() {
    document.getElementById('pinterest-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setBoardSelection(boardId) {
    const board = availableBoards.find((item) => item.id === boardId);
    setForm((current) => ({
      ...current,
      boardId,
      boardName: board?.name ?? '',
    }));
  }

  function chooseStory(storyId) {
    const story = stories.find((item) => item.id === storyId) ?? null;
    setActiveStoryId(storyId || '');
    setEditingPinId(null);
    setForm((current) => createPinFromStory(story, current));
  }

  function startPinForStory(story) {
    setNotice(null);
    setActiveStoryId(story.id);
    setEditingPinId(null);
    setForm((current) => createPinFromStory(story, current));
    scrollToComposer();
  }

  function duplicatePin(pin) {
    setNotice(null);
    setEditingPinId(null);
    setActiveStoryId(pin.story_id ?? '');
    setForm({
      storyId: pin.story_id ?? '',
      boardId: pin.board_id ?? '',
      boardName: pin.board_name ?? '',
      title: pin.title ?? '',
      description: pin.description ?? '',
      link: pin.link ?? '',
      imageUrl: pin.image_url ?? '',
      altText: pin.alt_text ?? '',
      scheduledAt: '',
    });
    scrollToComposer();
  }

  function editPin(pin) {
    setNotice(null);
    setEditingPinId(pin.id);
    setActiveStoryId(pin.story_id ?? '');
    setForm({
      storyId: pin.story_id ?? '',
      boardId: pin.board_id ?? '',
      boardName: pin.board_name ?? '',
      title: pin.title ?? '',
      description: pin.description ?? '',
      link: pin.link ?? '',
      imageUrl: pin.image_url ?? '',
      altText: pin.alt_text ?? '',
      scheduledAt: pin.scheduled_at ? new Date(pin.scheduled_at).toISOString().slice(0, 16) : '',
    });
    scrollToComposer();
  }

  function resetComposer() {
    setEditingPinId(null);
    setActiveStoryId('');
    setForm(emptyPin);
  }

  async function connectPinterest() {
    try {
      const data = await fetchJson('/api/admin/pinterest/connect');
      window.open(data.url, '_blank', 'width=760,height=820');
      setNotice({
        kind: 'info',
        message: 'Pinterest authorization opened in a new window. Finish the approval flow, then return here and this dashboard will refresh.',
      });
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
    }
  }

  async function submitPin(event) {
    event.preventDefault();
    setNotice({ kind: 'info', message: editingPinId ? 'Updating pin...' : 'Saving pin...' });

    try {
      const body = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      };

      if (editingPinId) {
        await fetchJson(`/api/admin/pinterest/pins/${editingPinId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await fetchJson('/api/admin/pinterest/pins', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }

      await loadPins();
      setNotice({ kind: 'success', message: editingPinId ? 'Pin updated.' : form.scheduledAt ? 'Pin scheduled.' : 'Draft saved.' });
      setEditingPinId(null);
      setForm(createPinFromStory(selectedStory, form));
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
    }
  }

  async function postNow(pinId) {
    setBusyPinId(pinId);
    setNotice({ kind: 'info', message: 'Posting to Pinterest...' });

    try {
      await fetchJson(`/api/admin/pinterest/pins/${pinId}/post`, {
        method: 'POST',
      });
      await loadPins();
      setNotice({ kind: 'success', message: 'Pin posted successfully.' });
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
    } finally {
      setBusyPinId(null);
    }
  }

  async function removePin(pinId) {
    if (!window.confirm('Delete this pin?')) return;
    setBusyPinId(pinId);

    try {
      await fetchJson(`/api/admin/pinterest/pins/${pinId}`, {
        method: 'DELETE',
      });
      await loadPins();
      setNotice({ kind: 'success', message: 'Pin deleted.' });
    } catch (error) {
      setNotice({ kind: 'error', message: error.message });
    } finally {
      setBusyPinId(null);
    }
  }

  function focusStory(summary) {
    setActiveStoryId(summary.story.id);
    setFilterStoryId(summary.story.id);
  }

  function clearLibraryFilters() {
    setPinSearch('');
    setFilterStatus('all');
    setFilterStoryId('all');
    setFilterBoardId('all');
    setSortBy('recent');
  }

  return (
    <div className="site-width pinterest-admin">
      <section className="admin-overview-grid pinterest-admin__stats">
        <MetricCard value={pins.length} label="Pins in library" note={`${totalScheduled} scheduled, ${totalFailed} failed`} />
        <MetricCard value={storiesWithPins} label="Stories with Pinterest coverage" note={`${storiesWithoutPins} stories still not pinned`} />
        <MetricCard value={totalPosted} label="Pins already published" note={`${storiesPosted} stories already live on Pinterest`} />
        <MetricCard value={storiesPending} label="Stories waiting in queue" note={account ? `Connected as @${account.pinner_username ?? 'unknown'}` : 'Connect Pinterest to publish'} />
      </section>

      <div className="pinterest-admin__layout">
        <section id="pinterest-composer" className="story-surface admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span className="eyebrow">Pinterest</span>
              <h2>{editingPinId ? 'Edit pin' : 'Create a new pin'}</h2>
            </div>
            <div className="admin-panel__heading-meta">
              <p>{account ? 'Choose a story, adjust SEO copy, then draft, schedule, or post.' : 'Connect Pinterest first, then start building pins from any story.'}</p>
            </div>
          </div>

          {notice ? (
            <div className={`pinterest-admin__notice pinterest-admin__notice--${notice.kind ?? 'info'}`}>
              <p>{notice.message}</p>
            </div>
          ) : null}

          {selectedStorySummary ? (
            <div className="pinterest-admin__story-preview">
              <div className="admin-record-card__header">
                <div>
                  <span className="eyebrow">Selected story</span>
                  <h3>{selectedStorySummary.story.title}</h3>
                </div>
                <div className="admin-badge-list">
                  <span className="admin-badge">{selectedStorySummary.pinCount} total pins</span>
                  <span className="admin-badge admin-badge--soft">{selectedStorySummary.postedCount} posted</span>
                  {selectedStorySummary.scheduledCount ? <span className="admin-badge admin-badge--soft">{selectedStorySummary.scheduledCount} scheduled</span> : null}
                </div>
              </div>
              <p>{truncateText(selectedStorySummary.story.excerpt || 'No excerpt available for this story yet.', 180)}</p>
              <div className="admin-record-card__meta">
                {selectedStorySummary.boards.length ? <span>Boards: {selectedStorySummary.boards.join(', ')}</span> : <span>No board used yet</span>}
                {selectedStorySummary.latestPin ? <span>Latest activity: {formatDateTime(selectedStorySummary.latestPin.updated_at ?? selectedStorySummary.latestPin.created_at)}</span> : <span>No Pinterest activity yet</span>}
              </div>
              {selectedStorySummary.pins.length ? (
                <div className="pinterest-admin__mini-list">
                  {selectedStorySummary.pins.slice(0, 3).map((pin) => (
                    <article key={pin.id} className="pinterest-admin__mini-item">
                      <div className="admin-record-card__header">
                        <div>
                          <h4>{pin.title}</h4>
                          <p>{truncateText(pin.description || 'No description', 110)}</p>
                        </div>
                        <div className="admin-badge-list">{statusBadge(pin.status)}</div>
                      </div>
                      <div className="admin-record-card__actions">
                        {pin.status !== 'posted' ? (
                          <button type="button" className="button-secondary" onClick={() => editPin(pin)}>
                            Edit
                          </button>
                        ) : null}
                        <button type="button" className="button-secondary" onClick={() => duplicatePin(pin)}>
                          Duplicate
                        </button>
                        <button type="button" className="button-secondary" onClick={() => focusStory(selectedStorySummary)}>
                          Show in library
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <form className="admin-form" onSubmit={submitPin}>
            <section className="pinterest-admin__story-picker">
              <div className="admin-panel__heading pinterest-admin__story-picker-heading">
                <div>
                  <span className="eyebrow">Story picker</span>
                  <h3>Pick a story visually</h3>
                </div>
                <div className="admin-panel__heading-meta">
                  <p>Search by title or topic, then choose from cards with cover image and pin status.</p>
                </div>
              </div>

              <div className="pinterest-admin__filters pinterest-admin__filters--picker">
                <label className="admin-search-field admin-search-field--wide">
                  <span>Search stories</span>
                  <input
                    value={composerStorySearch}
                    onChange={(event) => setComposerStorySearch(event.target.value)}
                    placeholder="Search title, excerpt, section..."
                  />
                </label>
                <label className="admin-inline-field">
                  <span>Show</span>
                  <select value={composerCoverage} onChange={(event) => setComposerCoverage(event.target.value)}>
                    <option value="all">All stories</option>
                    <option value="unpinned">Needs first pin</option>
                    <option value="queued">Queued or draft</option>
                    <option value="posted">Already pinned</option>
                  </select>
                </label>
              </div>

              {visibleComposerStories.length ? (
                <div className="pinterest-admin__story-picker-grid">
                  {visibleComposerStories.map((summary) => (
                    <article
                      key={summary.story.id}
                      className={`pinterest-admin__story-option ${form.storyId === summary.story.id ? 'pinterest-admin__story-option--active' : ''}`}
                    >
                      {summary.story.image ? (
                        <img
                          className="pinterest-admin__story-option-image"
                          src={storyImage(summary.story)}
                          alt={summary.story.title}
                        />
                      ) : (
                        <div className="pinterest-admin__story-option-image pinterest-admin__story-option-image--empty" />
                      )}
                      <div className="pinterest-admin__story-option-body">
                        <div className="admin-badge-list admin-badge-list--start">
                          {summary.hasPostedPin ? <span className="admin-badge admin-badge--accent">Pinned</span> : null}
                          {!summary.hasAnyPin ? <span className="admin-badge">New</span> : null}
                          <span className="admin-badge admin-badge--soft">{summary.pinCount} pins</span>
                        </div>
                        <h4>{summary.story.title}</h4>
                        <p>{truncateText(summary.story.excerpt || 'No excerpt available yet.', 110)}</p>
                        <div className="admin-record-card__meta">
                          <span>{summary.story.sectionLabel ?? 'Story'}</span>
                          {summary.story.topicLabel ? <span>{summary.story.topicLabel}</span> : null}
                        </div>
                        <div className="admin-record-card__actions">
                          <button type="button" className="button-secondary" onClick={() => chooseStory(summary.story.id)}>
                            {form.storyId === summary.story.id ? 'Selected' : 'Use this story'}
                          </button>
                          <a className="button-secondary" href={storyDestination(summary.story)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            Preview
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-library-empty">
                  <h3>No stories found</h3>
                  <p>Try a different keyword or broaden the picker filter.</p>
                </div>
              )}

              {composerStories.length > composerVisibleCount ? (
                <div className="pinterest-admin__actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setComposerVisibleCount((count) => count + 8)}
                  >
                    Load 8 more stories
                  </button>
                </div>
              ) : null}
            </section>

            <label>
              Pin title *
              <input
                required
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Write the on-Pinterest headline"
              />
            </label>

            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add SEO-friendly copy and a clear reason to click"
              />
            </label>

            <label>
              Destination link *
              <input
                required
                value={form.link}
                onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
                placeholder="https://sponbit.com/story/..."
              />
            </label>

            <label>
              Image URL *
              <input
                required
                value={form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            {form.imageUrl ? (
              <img className="pinterest-admin__pin-media" src={absoluteUrl(form.imageUrl)} alt="Pin preview" />
            ) : null}

            <label>
              Alt text
              <input
                value={form.altText}
                onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
                placeholder="Describe the image for accessibility"
              />
            </label>

            <label>
              Board
              {availableBoards.length ? (
                <select value={form.boardId} onChange={(event) => setBoardSelection(event.target.value)}>
                  <option value="">- select board -</option>
                  {availableBoards.map((board) => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.boardId}
                  onChange={(event) => setForm((current) => ({ ...current, boardId: event.target.value, boardName: '' }))}
                  placeholder="Connect Pinterest to load boards"
                />
              )}
            </label>

            <label>
              Schedule
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
              />
            </label>

            <div className="pinterest-admin__actions">
              <button type="submit" className="button-primary" disabled={!account}>
                {editingPinId ? 'Update pin' : form.scheduledAt ? 'Schedule pin' : 'Save draft'}
              </button>
              <button type="button" className="button-secondary" onClick={resetComposer}>
                Reset form
              </button>
              {!account ? (
                <button type="button" className="button-secondary" onClick={connectPinterest}>
                  Connect Pinterest
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <div className="pinterest-admin__main">
          <section className="story-surface admin-panel">
            <div className="admin-panel__heading">
              <div>
                <span className="eyebrow">Connection</span>
                <h2>Pinterest account and workflow</h2>
              </div>
              <div className="admin-panel__actions">
                <button type="button" className="button-secondary" onClick={refreshData}>
                  Refresh data
                </button>
                {!account ? (
                  <button type="button" className="button-primary" onClick={connectPinterest}>
                    Connect Pinterest
                  </button>
                ) : null}
              </div>
            </div>
            <div className="pinterest-admin__account">
              {account ? (
                <>
                  <div className="admin-badge-list admin-badge-list--start">
                    <span className="admin-badge admin-badge--accent">Connected</span>
                    <span className="admin-badge">@{account.pinner_username ?? 'unknown'}</span>
                    <span className="admin-badge">{availableBoards.length} boards loaded</span>
                  </div>
                  <p>Draft pins, schedule them for later, or publish immediately from the library below.</p>
                </>
              ) : (
                <p>No Pinterest account is connected yet. Connect an account to load boards, save pins, and publish from the admin dashboard.</p>
              )}
            </div>
          </section>

          <section className="story-surface admin-panel">
            <div className="admin-panel__heading">
              <div>
                <span className="eyebrow">Coverage</span>
                <h2>Story-by-story Pinterest status</h2>
              </div>
              <div className="admin-panel__heading-meta">
                <p>See which stories are already covered, what is scheduled, and what still needs a first pin.</p>
              </div>
            </div>

            <div className="pinterest-admin__filters">
              <label className="admin-search-field admin-search-field--wide">
                <span>Search stories</span>
                <input value={storySearch} onChange={(event) => setStorySearch(event.target.value)} placeholder="Search by title, excerpt, section..." />
              </label>
              <label className="admin-inline-field">
                <span>Section</span>
                <select value={storySectionFilter} onChange={(event) => setStorySectionFilter(event.target.value)}>
                  <option value="all">All sections</option>
                  {storySections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </label>
              <label className="admin-inline-field">
                <span>Coverage</span>
                <select value={filterCoverage} onChange={(event) => setFilterCoverage(event.target.value)}>
                  <option value="all">All stories</option>
                  <option value="posted">Already posted</option>
                  <option value="queued">Queued or draft</option>
                  <option value="unpinned">No pins yet</option>
                </select>
              </label>
              <label className="admin-inline-field">
                <span>Sort</span>
                <select value={storyStatusSort} onChange={(event) => setStoryStatusSort(event.target.value)}>
                  <option value="attention">Needs attention first</option>
                  <option value="recent">Latest activity</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
            </div>

            <div className="admin-record-card__meta">
              <span>Showing {Math.min(coverageVisibleCount, filteredStories.length)} of {filteredStories.length} stories</span>
              {filterCoverage !== 'all' ? <span>Filter: {filterCoverage}</span> : null}
              {storySectionFilter !== 'all' ? <span>Section: {storySectionFilter}</span> : null}
            </div>

            {!loading && filteredStories.length === 0 ? (
              <div className="admin-library-empty">
                <h3>No stories match this view</h3>
                <p>Try a broader search or switch the coverage filter.</p>
              </div>
            ) : null}

            <div className="admin-record-list admin-record-list--stories pinterest-admin__story-grid">
              {visibleFilteredStories.map((summary) => (
                <article
                  key={summary.story.id}
                  className={`admin-record-card admin-record-card--story ${summary.story.id === activeStoryId ? 'admin-record-card--active' : ''}`}
                >
                  <div className="admin-record-card__header">
                    <div className="pinterest-admin__story-card-body">
                      <span className="eyebrow">{summary.story.sectionLabel ?? 'Story'}</span>
                      <h3>{summary.story.title}</h3>
                    </div>
                    <div className="admin-badge-list">
                      {summary.hasPostedPin ? <span className="admin-badge admin-badge--accent">Pinned live</span> : null}
                      {!summary.hasAnyPin ? <span className="admin-badge">Needs first pin</span> : null}
                      <span className="admin-badge admin-badge--soft">{summary.pinCount} pins</span>
                    </div>
                  </div>
                  <p>{truncateText(summary.story.excerpt || 'No excerpt available for this story yet.', 150)}</p>
                  <div className="admin-record-card__meta">
                    <span>{summary.postedCount} posted</span>
                    <span>{summary.scheduledCount} scheduled</span>
                    <span>{summary.draftCount} drafts</span>
                    {summary.failedCount ? <span>{summary.failedCount} failed</span> : null}
                  </div>
                  <div className="admin-record-card__meta">
                    {summary.latestPin ? <span>Latest pin: {formatDateTime(summary.latestPin.updated_at ?? summary.latestPin.created_at)}</span> : <span>No pin created yet</span>}
                    {summary.boards.length ? <span>Boards: {summary.boards.join(', ')}</span> : null}
                  </div>
                  <div className="admin-record-card__actions pinterest-admin__story-actions">
                    <button type="button" className="button-primary" onClick={() => startPinForStory(summary.story)}>
                      {summary.hasAnyPin ? 'Create another pin' : 'Create first pin'}
                    </button>
                    <button type="button" className="button-secondary" onClick={() => focusStory(summary)}>
                      Show pins
                    </button>
                    {summary.latestPin && summary.latestPin.status !== 'posted' ? (
                      <button type="button" className="button-secondary" onClick={() => editPin(summary.latestPin)}>
                        Edit latest draft
                      </button>
                    ) : null}
                    <a className="button-secondary" href={storyDestination(summary.story)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      Open story
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {filteredStories.length > coverageVisibleCount ? (
              <div className="pinterest-admin__actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setCoverageVisibleCount((count) => count + 12)}
                >
                  Load 12 more stories
                </button>
              </div>
            ) : null}

            {filteredStories.length > 12 && coverageVisibleCount > 12 ? (
              <div className="pinterest-admin__actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setCoverageVisibleCount(12)}
                >
                  Collapse list
                </button>
              </div>
            ) : null}
          </section>

          <section className="story-surface admin-panel">
            <div className="admin-panel__heading">
              <div>
                <span className="eyebrow">Library</span>
                <h2>Pin queue and publishing history</h2>
              </div>
              <div className="admin-panel__heading-meta">
                <p>Filter by status, board, story, or search text to manage the queue quickly.</p>
              </div>
            </div>

            <div className="pinterest-admin__filters">
              <label className="admin-search-field admin-search-field--wide">
                <span>Search pins</span>
                <input value={pinSearch} onChange={(event) => setPinSearch(event.target.value)} placeholder="Search title, board, story, link..." />
              </label>
              <label className="admin-inline-field">
                <span>Status</span>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label className="admin-inline-field">
                <span>Story</span>
                <select value={filterStoryId} onChange={(event) => setFilterStoryId(event.target.value)}>
                  <option value="all">All stories</option>
                  {stories.map((story) => (
                    <option key={story.id} value={story.id}>{story.title}</option>
                  ))}
                </select>
              </label>
              <label className="admin-inline-field">
                <span>Board</span>
                <select value={filterBoardId} onChange={(event) => setFilterBoardId(event.target.value)}>
                  <option value="all">All boards</option>
                  {availableBoards.map((board) => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-inline-field">
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="recent">Latest activity</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <div className="pinterest-admin__pin-tools">
                <button type="button" className="button-secondary" onClick={clearLibraryFilters}>
                  Reset filters
                </button>
                <button type="button" className="button-secondary" onClick={refreshData}>
                  Reload pins
                </button>
              </div>
            </div>

            {loading ? <p>Loading Pinterest data...</p> : null}

            {!loading && filteredPins.length === 0 ? (
              <div className="admin-library-empty">
                <h3>No pins match these filters</h3>
                <p>Reset the filters or create a new pin from a story card above.</p>
              </div>
            ) : null}

            <div className="admin-record-list">
              {filteredPins.map((pin) => (
                <article key={pin.id} className="admin-record-card pinterest-admin__pin-card">
                  {pin.image_url ? (
                    <img className="pinterest-admin__pin-media" src={absoluteUrl(pin.image_url)} alt={pin.alt_text || pin.title} />
                  ) : (
                    <div className="pinterest-admin__pin-media" />
                  )}
                  <div className="pinterest-admin__pin-body">
                    <div className="admin-record-card__header">
                      <div>
                        <h3 style={{ marginBottom: 8 }}>{pin.title}</h3>
                        <div className="admin-badge-list admin-badge-list--start">
                          {statusBadge(pin.status)}
                          {pin.board_name ? <span className="admin-badge">{pin.board_name}</span> : null}
                          {pin.story_title ? <span className="admin-badge admin-badge--soft">{pin.story_title}</span> : null}
                        </div>
                      </div>
                    </div>

                    <p className="pinterest-admin__pin-description">{truncateText(pin.description || 'No description added yet.', 220)}</p>

                    <div className="admin-record-card__meta pinterest-admin__pin-meta">
                      <span>Created: {formatDateTime(pin.created_at)}</span>
                      {pin.status === 'scheduled' ? <span>Scheduled: {formatDateTime(pin.scheduled_at)}</span> : null}
                      {pin.status === 'posted' ? <span>Posted: {formatDateTime(pin.posted_at)}</span> : null}
                      {pin.status === 'failed' && pin.error_message ? <span style={{ color: '#c54535' }}>Error: {pin.error_message}</span> : null}
                    </div>

                    <div className="admin-record-card__actions">
                      {pin.status !== 'posted' && account ? (
                        <button
                          type="button"
                          className="button-primary"
                          disabled={busyPinId === pin.id || !hasValidBoardSelection(pin.board_id)}
                          title={hasValidBoardSelection(pin.board_id) ? '' : 'Select a Pinterest board before posting'}
                          onClick={() => postNow(pin.id)}
                        >
                          {busyPinId === pin.id ? 'Posting...' : 'Post now'}
                        </button>
                      ) : null}
                      {pin.status !== 'posted' ? (
                        <button type="button" className="button-secondary" onClick={() => editPin(pin)}>
                          Edit
                        </button>
                      ) : null}
                      <button type="button" className="button-secondary" onClick={() => duplicatePin(pin)}>
                        Duplicate
                      </button>
                      {pin.story_id ? (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => {
                            setActiveStoryId(pin.story_id);
                            setFilterStoryId(pin.story_id);
                          }}
                        >
                          Related story
                        </button>
                      ) : null}
                      {pin.pinterest_pin_id ? (
                        <a className="button-secondary" href={`https://pinterest.com/pin/${pin.pinterest_pin_id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          View on Pinterest
                        </a>
                      ) : null}
                      {pin.link ? (
                        <a className="button-secondary" href={absoluteUrl(pin.link)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          Open destination
                        </a>
                      ) : null}
                      <button type="button" className="button-danger" disabled={busyPinId === pin.id} onClick={() => removePin(pin.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
