import { pool } from './db.js';

const PINTEREST_API = 'https://api.pinterest.com/v5';
const CLIENT_ID = process.env.PINTEREST_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET ?? '';
const REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI ?? 'https://sponbit.com/api/pinterest/callback';
const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://sponbit.com';

function normalizeOptionalText(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function createBadRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getSiteUrl() {
  try {
    return new URL(SITE_ORIGIN);
  } catch {
    return new URL('https://sponbit.com');
  }
}

function normalizePinUrl(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw createBadRequest('Add a destination link before posting this pin');
  }

  const siteUrl = getSiteUrl();
  const url = normalized.startsWith('http://') || normalized.startsWith('https://')
    ? new URL(normalized)
    : new URL(normalized.startsWith('/') ? normalized : `/${normalized}`, siteUrl);

  if (url.protocol !== 'https:') {
    throw createBadRequest('Pinterest pins must use an https destination URL');
  }

  if (url.host !== siteUrl.host) {
    throw createBadRequest(`Pinterest destination links must stay on ${siteUrl.host}`);
  }

  return url;
}

function normalizePinImageUrl(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw createBadRequest('Add a public image URL before posting this pin');
  }

  const siteUrl = getSiteUrl();
  const url = normalized.startsWith('http://') || normalized.startsWith('https://')
    ? new URL(normalized)
    : new URL(normalized.startsWith('/') ? normalized : `/${normalized}`, siteUrl);

  if (!/^https?:$/.test(url.protocol)) {
    throw createBadRequest('Pin images must use an http or https URL');
  }

  return url;
}

function validatePostingCopy(pin) {
  const title = String(pin.title ?? '').trim();
  const description = String(pin.description ?? '').trim();

  if (title.length < 20) {
    throw createBadRequest('Use a more specific Pinterest title with at least 20 characters');
  }

  if (description.length < 60) {
    throw createBadRequest('Add a more detailed pin description with at least 60 characters before posting');
  }
}

function validateDestinationPath(url) {
  const blockedPaths = new Set(['/', '/about', '/contact', '/editorial-policy', '/privacy', '/signin', '/signup', '/admin', '/search']);

  if (blockedPaths.has(url.pathname)) {
    throw createBadRequest('Use a public story URL for Pinterest, not the homepage or utility pages');
  }

  if (!url.pathname.startsWith('/story/')) {
    throw createBadRequest('Use a story URL under /story/... for Pinterest posts');
  }
}

async function assertDestinationPageLooksPublishable(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SponbitPinValidator/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw createBadRequest(`Destination page returned ${response.status}. Publish the story page successfully before posting to Pinterest.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw createBadRequest('Destination link must load a public HTML page');
  }

  const html = await response.text();
  const compact = html.replace(/\s+/g, ' ');

  if (/content="noindex/i.test(compact)) {
    throw createBadRequest('Destination page is marked noindex, which is risky for Pinterest distribution');
  }

  if (!/<meta property="og:type" content="article"\s*\/>/i.test(compact)) {
    throw createBadRequest('Destination page is missing article metadata. Deploy the web metadata changes before posting this pin.');
  }

  if (!/<link rel="canonical" href="https?:\/\/[^\"]+\/story\//i.test(compact)) {
    throw createBadRequest('Destination page is missing a story canonical tag. Use a published story URL instead of a generic page.');
  }

  if (!/<title>[^<]+\| Sponbit<\/title>/i.test(compact)) {
    throw createBadRequest('Destination page title still looks generic. Confirm the story page metadata is live before posting.');
  }
}

async function assertImageUrlIsReachable(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SponbitPinValidator/1.0',
      Accept: 'image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw createBadRequest(`Pin image returned ${response.status}. Use a publicly reachable image URL before posting.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw createBadRequest('Pin image URL must return an image content-type');
  }
}

async function assertNoRecentBoardDuplicate(pinId, boardId, absoluteLink, relativeLink) {
  const { rows } = await pool.query(
    `select id, posted_at
     from pinterest_pins
     where id <> $1
       and board_id = $2
       and status = 'posted'
       and posted_at >= now() - interval '30 days'
       and (link = $3 or link = $4)
     order by posted_at desc
     limit 1`,
    [pinId, boardId, absoluteLink, relativeLink]
  );

  if (rows[0]) {
    throw createBadRequest('A pin with this same destination URL was already posted to this board recently. Change the story or board before posting again.');
  }
}

async function runPinPostingPreflight(pinId, pin) {
  validatePostingCopy(pin);

  const destinationUrl = normalizePinUrl(pin.link);
  validateDestinationPath(destinationUrl);

  const imageUrl = normalizePinImageUrl(pin.image_url);
  const relativeLink = `${destinationUrl.pathname}${destinationUrl.search}`;

  await Promise.all([
    assertDestinationPageLooksPublishable(destinationUrl),
    assertImageUrlIsReachable(imageUrl),
    assertNoRecentBoardDuplicate(pinId, pin.board_id, destinationUrl.toString(), relativeLink),
  ]);

  return {
    destinationUrl: destinationUrl.toString(),
    imageUrl: imageUrl.toString(),
  };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export function buildOAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'boards:read,boards:write,pins:read,pins:write',
    state,
  });
  return `https://www.pinterest.com/oauth/?${params}`;
}

export async function exchangeCodeForToken(code) {
  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Pinterest token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshAccessToken(accountId) {
  const { rows } = await pool.query(
    'select refresh_token from pinterest_accounts where id = $1',
    [accountId]
  );
  if (!rows[0]?.refresh_token) throw new Error('No refresh token');

  const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: rows[0].refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Pinterest refresh failed: ${res.status}`);
  const data = await res.json();

  await pool.query(
    `update pinterest_accounts
     set access_token = $1, refresh_token = coalesce($2, refresh_token),
         token_expires_at = now() + interval '1 second' * $3, updated_at = now()
     where id = $4`,
    [data.access_token, data.refresh_token ?? null, data.expires_in ?? 2592000, accountId]
  );
  return data.access_token;
}

async function getAccessToken(accountId) {
  const { rows } = await pool.query(
    'select access_token, token_expires_at from pinterest_accounts where id = $1',
    [accountId]
  );
  if (!rows[0]) throw new Error('Pinterest account not found');
  if (rows[0].token_expires_at && new Date(rows[0].token_expires_at) < new Date(Date.now() + 60000)) {
    return refreshAccessToken(accountId);
  }
  return rows[0].access_token;
}

// ─── Pinterest API helpers ────────────────────────────────────────────────────

async function pinterestGet(path, accountId) {
  const token = await getAccessToken(accountId);
  const res = await fetch(`${PINTEREST_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Pinterest API ${path}: ${res.status}`);
  return res.json();
}

async function pinterestPost(path, body, accountId) {
  const token = await getAccessToken(accountId);
  const res = await fetch(`${PINTEREST_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinterest API ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

export async function ensurePinterestSchema() {
  await pool.query(`
    create table if not exists pinterest_accounts (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      access_token text not null,
      refresh_token text,
      token_expires_at timestamp,
      pinner_username text,
      pinner_id text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now(),
      unique (user_id)
    )
  `);
  await pool.query(`
    create table if not exists pinterest_pins (
      id serial primary key,
      story_id text references stories(id) on delete set null,
      account_id integer references pinterest_accounts(id) on delete cascade,
      board_id text,
      board_name text,
      title text not null,
      description text not null default '',
      link text not null,
      image_url text not null,
      alt_text text not null default '',
      scheduled_at timestamp,
      posted_at timestamp,
      pinterest_pin_id text,
      status text not null default 'draft' check (status in ('draft','scheduled','posted','failed')),
      error_message text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    )
  `);
  await pool.query(`create index if not exists pinterest_pins_status_scheduled on pinterest_pins(status, scheduled_at)`);
  await pool.query(`create index if not exists pinterest_pins_story_id on pinterest_pins(story_id)`);
}

export async function saveAccount(userId, tokenData) {
  const { rows } = await pool.query(
    `insert into pinterest_accounts (user_id, access_token, refresh_token, token_expires_at)
     values ($1, $2, $3, now() + interval '1 second' * $4)
     on conflict (user_id) do update
       set access_token = excluded.access_token,
           refresh_token = coalesce(excluded.refresh_token, pinterest_accounts.refresh_token),
           token_expires_at = excluded.token_expires_at,
           updated_at = now()
     returning id`,
    [userId, tokenData.access_token, tokenData.refresh_token ?? null, tokenData.expires_in ?? 2592000]
  );
  const accountId = rows[0].id;

  // Fetch pinner info
  try {
    const me = await pinterestGet('/user_account', accountId);
    await pool.query(
      'update pinterest_accounts set pinner_username = $1, pinner_id = $2 where id = $3',
      [me.username, me.id ?? null, accountId]
    );
  } catch { /* non-fatal */ }

  return rows[0];
}

export async function getAccountForUser(userId) {
  const { rows } = await pool.query(
    'select id, pinner_username, pinner_id, token_expires_at from pinterest_accounts where user_id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

// ─── Boards ──────────────────────────────────────────────────────────────────

export async function getBoards(userId) {
  const account = await getAccountForUser(userId);
  if (!account) throw new Error('Pinterest not connected');
  const data = await pinterestGet('/boards?page_size=50', account.id);
  return (data.items ?? []).map(b => ({ id: b.id, name: b.name }));
}

// ─── Pins CRUD ───────────────────────────────────────────────────────────────

export async function listPins({ storyId, status, limit = 50, offset = 0 } = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (storyId) { conditions.push(`pp.story_id = $${params.push(storyId)}`); }
  if (status) { conditions.push(`pp.status = $${params.push(status)}`); }
  params.push(limit, offset);

  const { rows } = await pool.query(
    `select pp.*, s.title as story_title, s.image as story_image
     from pinterest_pins pp
     left join stories s on s.id = pp.story_id
     where ${conditions.join(' and ')}
     order by coalesce(pp.scheduled_at, pp.created_at) desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );
  return rows;
}

export async function createPin(data) {
  const boardId = normalizeOptionalText(data.boardId);
  const boardName = normalizeOptionalText(data.boardName);

  const { rows } = await pool.query(
    `insert into pinterest_pins
       (story_id, account_id, board_id, board_name, title, description, link, image_url, alt_text, scheduled_at, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning *`,
    [
      data.storyId ?? null,
      data.accountId,
      boardId,
      boardName,
      data.title,
      data.description ?? '',
      data.link,
      data.imageUrl,
      data.altText ?? data.title,
      data.scheduledAt ?? null,
      data.scheduledAt ? 'scheduled' : 'draft',
    ]
  );
  return rows[0];
}

export async function updatePin(pinId, data) {
  const fields = [];
  const params = [];

  if ('title' in data) { fields.push(`title = $${params.push(data.title)}`); }
  if ('description' in data) { fields.push(`description = $${params.push(data.description)}`); }
  if ('boardId' in data) {
    const boardId = normalizeOptionalText(data.boardId);
    fields.push(`board_id = $${params.push(boardId)}`);

    if (boardId == null && !('boardName' in data)) {
      fields.push(`board_name = $${params.push(null)}`);
    }
  }
  if ('boardName' in data) { fields.push(`board_name = $${params.push(normalizeOptionalText(data.boardName))}`); }
  if ('imageUrl' in data) { fields.push(`image_url = $${params.push(data.imageUrl)}`); }
  if ('altText' in data) { fields.push(`alt_text = $${params.push(data.altText)}`); }
  if ('link' in data) { fields.push(`link = $${params.push(data.link)}`); }
  if ('scheduledAt' in data) {
    fields.push(`scheduled_at = $${params.push(data.scheduledAt ?? null)}`);
    fields.push(`status = $${params.push(data.scheduledAt ? 'scheduled' : 'draft')}`);
  }
  if ('status' in data) { fields.push(`status = $${params.push(data.status)}`); }

  if (!fields.length) return null;
  fields.push(`updated_at = now()`);
  params.push(pinId);

  const { rows } = await pool.query(
    `update pinterest_pins set ${fields.join(', ')} where id = $${params.length} returning *`,
    params
  );
  return rows[0] ?? null;
}

export async function deletePin(pinId) {
  await pool.query('delete from pinterest_pins where id = $1', [pinId]);
}

// ─── Post to Pinterest ───────────────────────────────────────────────────────

export async function postPinNow(pinId) {
  const { rows } = await pool.query(
    'select * from pinterest_pins where id = $1',
    [pinId]
  );
  const pin = rows[0];
  if (!pin) throw new Error('Pin not found');
  if (!pin.account_id) throw new Error('Pin has no associated Pinterest account');
  if (!pin.board_id) throw createBadRequest('Select a Pinterest board before posting this pin');
  if (!/^\d+$/.test(String(pin.board_id))) {
    throw createBadRequest('Pin has an invalid Pinterest board id. Re-select the board and save the pin before posting.');
  }

  try {
    const { destinationUrl, imageUrl } = await runPinPostingPreflight(pinId, pin);

    const result = await pinterestPost('/pins', {
      board_id: pin.board_id,
      title: pin.title,
      description: pin.description,
      link: destinationUrl,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
      alt_text: pin.alt_text || pin.title,
    }, pin.account_id);

    await pool.query(
      `update pinterest_pins
       set status = 'posted', posted_at = now(), pinterest_pin_id = $1, error_message = null, updated_at = now()
       where id = $2`,
      [result.id, pinId]
    );
    return { ok: true, pinterestPinId: result.id };
  } catch (err) {
    await pool.query(
      `update pinterest_pins set status = 'failed', error_message = $1, updated_at = now() where id = $2`,
      [err.message, pinId]
    );
    throw err;
  }
}

// ─── Cron: process scheduled pins ────────────────────────────────────────────

export async function processScheduledPins() {
  const { rows } = await pool.query(
    `select id from pinterest_pins
     where status = 'scheduled' and scheduled_at <= now()
     order by scheduled_at
     limit 20`
  );
  const results = { posted: 0, failed: 0 };
  for (const row of rows) {
    try {
      await postPinNow(row.id);
      results.posted++;
    } catch {
      results.failed++;
    }
  }
  return results;
}
