import { useEffect, useState, useCallback } from 'react';
import { fetchJson, getAuthToken } from '../lib/api';

const SITE_ORIGIN = window.location.origin;

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const map = { draft: '#888', scheduled: '#0070f3', posted: '#22a34a', failed: '#d0342c' };
  return (
    <span style={{
      background: map[status] ?? '#888',
      color: '#fff',
      fontSize: '0.7rem',
      padding: '2px 8px',
      borderRadius: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}

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

export function PinterestAdminTab({ stories }) {
  const [account, setAccount] = useState(null);
  const [boards, setBoards] = useState([]);
  const [pins, setPins] = useState([]);
  const [form, setForm] = useState(emptyPin);
  const [editingPinId, setEditingPinId] = useState(null);
  const [status, setStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStoryId, setFilterStoryId] = useState('all');
  const [loading, setLoading] = useState(true);

  const authHeader = () => ({ Authorization: `Bearer ${getAuthToken()}` });

  const loadAccount = useCallback(async () => {
    try {
      const data = await fetchJson('/api/admin/pinterest/account');
      setAccount(data.account);
    } catch { setAccount(null); }
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      const data = await fetchJson('/api/admin/pinterest/boards');
      setBoards(data.boards ?? []);
    } catch { setBoards([]); }
  }, []);

  const loadPins = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterStoryId !== 'all') params.set('storyId', filterStoryId);
      const data = await fetchJson(`/api/admin/pinterest/pins?${params}`);
      setPins(data.pins ?? []);
    } catch { setPins([]); }
    setLoading(false);
  }, [filterStatus, filterStoryId]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (account) loadBoards();
  }, [account, loadBoards]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  // Pre-fill form when a story is selected
  useEffect(() => {
    if (!form.storyId) return;
    const story = stories.find(s => s.id === form.storyId);
    if (!story) return;
    setForm(prev => ({
      ...prev,
      title: prev.title || story.title || '',
      description: prev.description || story.excerpt || '',
      link: prev.link || `${SITE_ORIGIN}/story/${story.id}`,
      imageUrl: prev.imageUrl || (story.image?.startsWith('/') ? `${SITE_ORIGIN}${story.image}` : story.image || ''),
      altText: prev.altText || story.title || '',
    }));
  }, [form.storyId, stories]);

  async function connectPinterest() {
    const data = await fetchJson('/api/admin/pinterest/connect');
    window.open(data.url, '_blank', 'width=700,height=700');
  }

  async function submitPin(e) {
    e.preventDefault();
    setStatus('Saving…');
    try {
      const body = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      };
      if (editingPinId) {
        await fetchJson(`/api/admin/pinterest/pins/${editingPinId}`, {
          method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setStatus('Pin updated.');
      } else {
        await fetchJson('/api/admin/pinterest/pins', {
          method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setStatus('Pin created.');
      }
      setForm(emptyPin);
      setEditingPinId(null);
      loadPins();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  async function postNow(pinId) {
    setStatus('Posting to Pinterest…');
    try {
      await fetchJson(`/api/admin/pinterest/pins/${pinId}/post`, {
        method: 'POST', headers: authHeader(),
      });
      setStatus('Posted!');
      loadPins();
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
  }

  async function removePin(pinId) {
    if (!window.confirm('Delete this pin?')) return;
    await fetchJson(`/api/admin/pinterest/pins/${pinId}`, {
      method: 'DELETE', headers: authHeader(),
    });
    loadPins();
  }

  function editPin(pin) {
    setEditingPinId(pin.id);
    setForm({
      storyId: pin.story_id ?? '',
      boardId: pin.board_id ?? '',
      boardName: pin.board_name ?? '',
      title: pin.title,
      description: pin.description,
      link: pin.link,
      imageUrl: pin.image_url,
      altText: pin.alt_text,
      scheduledAt: pin.scheduled_at ? new Date(pin.scheduled_at).toISOString().slice(0, 16) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyPin);
    setEditingPinId(null);
  }

  const filteredPins = pins;

  return (
    <div className="site-width pinterest-admin" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', padding: '2rem 0' }}>
      {/* ── Left: Form ── */}
      <section className="story-surface admin-panel" style={{ flex: '0 0 420px', minWidth: 0 }}>
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Pinterest</span>
            <h2>{editingPinId ? 'Edit pin' : 'Create pin'}</h2>
          </div>
          <div className="admin-panel__heading-meta">
            {account
              ? <p>Connected as <strong>@{account.pinner_username ?? 'unknown'}</strong></p>
              : (
                <p style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  Not connected.{' '}
                  <button type="button" className="button-secondary" onClick={connectPinterest}>
                    Connect Pinterest
                  </button>
                </p>
              )
            }
          </div>
        </div>

        {status && <div className="admin-status">{status}</div>}

        <form className="admin-form" onSubmit={submitPin}>
          <label>
            Story (optional — auto-fills fields)
            <select value={form.storyId} onChange={e => setForm({ ...emptyPin, storyId: e.target.value })}>
              <option value="">— none —</option>
              {stories.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>

          <label>
            Pin title *
            <input
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 10 Best Hair Trends for Summer 2026"
            />
          </label>

          <label>
            Description (SEO)
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the pin content with keywords. Pinterest uses this for search."
            />
          </label>

          <label>
            Destination link *
            <input
              required
              value={form.link}
              onChange={e => setForm({ ...form, link: e.target.value })}
              placeholder="https://sponbit.com/story/..."
            />
          </label>

          <label>
            Image URL *
            <input
              required
              value={form.imageUrl}
              onChange={e => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt="preview"
                style={{ marginTop: 8, maxWidth: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              />
            )}
          </label>

          <label>
            Alt text
            <input
              value={form.altText}
              onChange={e => setForm({ ...form, altText: e.target.value })}
              placeholder="Describe the image for accessibility and SEO"
            />
          </label>

          <label>
            Board
            {boards.length ? (
              <select
                value={form.boardId}
                onChange={e => {
                  const board = boards.find(b => b.id === e.target.value);
                  setForm({ ...form, boardId: e.target.value, boardName: board?.name ?? '' });
                }}
              >
                <option value="">— select board —</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : (
              <input
                value={form.boardId}
                onChange={e => setForm({ ...form, boardId: e.target.value })}
                placeholder="Board ID (connect Pinterest to load boards)"
              />
            )}
          </label>

          <label>
            Schedule (leave empty to save as draft)
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="button-primary">
              {editingPinId ? 'Update pin' : form.scheduledAt ? 'Schedule pin' : 'Save draft'}
            </button>
            {editingPinId && (
              <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </section>

      {/* ── Right: Pin list ── */}
      <section className="story-surface admin-panel" style={{ flex: 1, minWidth: 0 }}>
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Queue</span>
            <h2>Pin library</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="posted">Posted</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterStoryId}
              onChange={e => setFilterStoryId(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">All stories</option>
              {stories.map(s => <option key={s.id} value={s.id}>{s.title.slice(0, 40)}</option>)}
            </select>
          </div>
        </div>

        {loading && <p style={{ padding: '1rem' }}>Loading pins…</p>}

        {!loading && filteredPins.length === 0 && (
          <div className="admin-library-empty" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3>No pins yet</h3>
            <p>Create your first pin using the form on the left.</p>
          </div>
        )}

        <div className="admin-record-list">
          {filteredPins.map(pin => (
            <article key={pin.id} className="admin-record-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {pin.image_url && (
                <img
                  src={pin.image_url}
                  alt={pin.alt_text || pin.title}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="admin-record-card__header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{pin.title}</h3>
                    {pin.story_title && (
                      <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Story: {pin.story_title}</span>
                    )}
                  </div>
                  <div className="admin-badge-list">
                    {statusBadge(pin.status)}
                    {pin.board_name && <span className="admin-badge">{pin.board_name}</span>}
                  </div>
                </div>
                {pin.description && (
                  <p style={{ margin: '4px 0', fontSize: '0.8rem', color: 'var(--text-muted, #666)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pin.description}
                  </p>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)', marginTop: 4 }}>
                  {pin.status === 'scheduled' && <>Scheduled: {formatDateTime(pin.scheduled_at)}</>}
                  {pin.status === 'posted' && <>Posted: {formatDateTime(pin.posted_at)}</>}
                  {pin.status === 'failed' && <span style={{ color: '#d0342c' }}>Error: {pin.error_message}</span>}
                  {pin.status === 'draft' && <>Created: {formatDateTime(pin.created_at)}</>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {pin.status !== 'posted' && account && (
                    <button
                      type="button"
                      className="button-primary"
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                      onClick={() => postNow(pin.id)}
                    >
                      Post now
                    </button>
                  )}
                  {pin.status !== 'posted' && (
                    <button
                      type="button"
                      className="button-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                      onClick={() => editPin(pin)}
                    >
                      Edit
                    </button>
                  )}
                  {pin.pinterest_pin_id && (
                    <a
                      href={`https://pinterest.com/pin/${pin.pinterest_pin_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="button-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 12px', textDecoration: 'none' }}
                    >
                      View on Pinterest
                    </a>
                  )}
                  <button
                    type="button"
                    style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'none', border: 'none', color: '#d0342c', cursor: 'pointer' }}
                    onClick={() => removePin(pin.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
