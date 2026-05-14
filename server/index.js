import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import {
  authenticateUser,
  buildAuthPayload,
  createHttpError,
  createUser,
  getBearerToken,
  getUserById,
  verifyAuthToken,
} from './authService.js';
import { ensureBootstrap } from './bootstrap.js';
import {
  createSection,
  createStory,
  createTopic,
  deleteSection,
  deleteStory,
  deleteTopic,
  getAdminDashboard,
  getHomePageData,
  getNavigationData,
  getSectionPageData,
  getStoryPageData,
  getTopicPageData,
  updateSection,
  updateStory,
  updateTopic,
} from './contentService.js';
import { pool } from './db.js';
import {
  buildOAuthUrl,
  createPin,
  deletePin,
  ensurePinterestSchema,
  getAccountForUser,
  getBoards,
  listPins,
  postPinNow,
  processScheduledPins,
  saveAccount,
  updatePin,
  exchangeCodeForToken,
} from './pinterestService.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const uploadsDir = path.resolve(process.cwd(), 'server/uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api/uploads', express.static(uploadsDir));

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadsDir),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const baseName = path.basename(file.originalname || 'image', extension)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'image';

      callback(null, `${Date.now()}-${baseName}${extension || '.png'}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(createHttpError(400, 'Only image uploads are allowed'));
      return;
    }

    callback(null, true);
  },
});

function requireAuth() {
  return asyncRoute(async (request, _response, next) => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) {
      throw createHttpError(401, 'Authentication required');
    }

    const payload = verifyAuthToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      throw createHttpError(401, 'User no longer exists');
    }

    request.user = user;
    next();
  });
}

function requireRole(role) {
  return (request, _response, next) => {
    if (!request.user) {
      next(createHttpError(401, 'Authentication required'));
      return;
    }

    if (request.user.role !== role) {
      next(createHttpError(403, 'You do not have permission to access admin tools'));
      return;
    }

    next();
  };
}

function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

app.get('/api/health', asyncRoute(async (_request, response) => {
  await pool.query('select 1');
  response.json({ ok: true });
}));

app.get('/api/navigation', asyncRoute(async (_request, response) => {
  response.json(await getNavigationData());
}));

app.get('/api/home', asyncRoute(async (_request, response) => {
  response.json(await getHomePageData());
}));

app.get('/api/sections/:sectionKey', asyncRoute(async (request, response) => {
  const payload = await getSectionPageData(request.params.sectionKey);
  if (!payload) {
    response.status(404).json({ message: 'Section not found' });
    return;
  }

  response.json(payload);
}));

app.get('/api/sections/:sectionKey/topics/:topicSlug', asyncRoute(async (request, response) => {
  const payload = await getTopicPageData(request.params.sectionKey, request.params.topicSlug);
  if (!payload) {
    response.status(404).json({ message: 'Topic not found' });
    return;
  }

  response.json(payload);
}));

app.get('/api/search', asyncRoute(async (request, response) => {
  const results = await searchStories(request.query.q);
  response.json({ results });
}));

app.get('/api/stories/:storyId', asyncRoute(async (request, response) => {
  const payload = await getStoryPageData(request.params.storyId);
  if (!payload) {
    response.status(404).json({ message: 'Story not found' });
    return;
  }

  response.json(payload);
}));

app.post('/api/auth/signup', asyncRoute(async (request, response) => {
  const user = await createUser(request.body);
  response.status(201).json(buildAuthPayload(user));
}));

app.post('/api/auth/signin', asyncRoute(async (request, response) => {
  const user = await authenticateUser(request.body);
  response.json(buildAuthPayload(user));
}));

app.get('/api/auth/me', requireAuth(), asyncRoute(async (request, response) => {
  response.json({ user: request.user });
}));

app.post('/api/auth/signout', requireAuth(), asyncRoute(async (_request, response) => {
  response.status(204).end();
}));

app.get('/api/pinterest/callback', asyncRoute(async (request, response) => {
  const { code, state } = request.query;
  if (!code || !state) {
    response.redirect('/admin?pinterest=error');
    return;
  }

  const userId = Number(Buffer.from(String(state), 'base64').toString());
  const tokenData = await exchangeCodeForToken(String(code));
  await saveAccount(userId, tokenData);

  response.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pinterest connected</title>
  </head>
  <body>
    <script>
      if (window.opener && !window.opener.closed) {
        window.opener.location.href = '/admin?pinterest=connected&tab=pinterest';
        window.close();
      } else {
        window.location.replace('/admin?pinterest=connected&tab=pinterest');
      }
    </script>
  </body>
</html>`);
}));

app.use('/api/admin', requireAuth(), requireRole('admin'));

app.get('/api/admin/dashboard', asyncRoute(async (_request, response) => {
  response.json(await getAdminDashboard());
}));

app.post('/api/admin/uploads/image', imageUpload.single('image'), asyncRoute(async (request, response) => {
  if (!request.file) {
    throw createHttpError(400, 'Image file is required');
  }

  response.status(201).json({
    url: `/api/uploads/${request.file.filename}`,
    filename: request.file.filename,
  });
}));

app.post('/api/admin/sections', asyncRoute(async (request, response) => {
  response.status(201).json(await createSection(request.body));
}));

app.put('/api/admin/sections/:sectionId', asyncRoute(async (request, response) => {
  const payload = await updateSection(Number(request.params.sectionId), request.body);
  if (!payload) {
    response.status(404).json({ message: 'Section not found' });
    return;
  }

  response.json(payload);
}));

app.delete('/api/admin/sections/:sectionId', asyncRoute(async (request, response) => {
  await deleteSection(Number(request.params.sectionId));
  response.status(204).end();
}));

app.post('/api/admin/topics', asyncRoute(async (request, response) => {
  response.status(201).json(await createTopic(request.body));
}));

app.put('/api/admin/topics/:topicId', asyncRoute(async (request, response) => {
  const payload = await updateTopic(Number(request.params.topicId), request.body);
  if (!payload) {
    response.status(404).json({ message: 'Topic not found' });
    return;
  }

  response.json(payload);
}));

app.delete('/api/admin/topics/:topicId', asyncRoute(async (request, response) => {
  await deleteTopic(Number(request.params.topicId));
  response.status(204).end();
}));

app.post('/api/admin/stories', asyncRoute(async (request, response) => {
  response.status(201).json(await createStory(request.body));
}));

app.put('/api/admin/stories/:storyId', asyncRoute(async (request, response) => {
  const payload = await updateStory(request.params.storyId, request.body);
  if (!payload) {
    response.status(404).json({ message: 'Story not found' });
    return;
  }

  response.json(payload);
}));

app.delete('/api/admin/stories/:storyId', asyncRoute(async (request, response) => {
  await deleteStory(request.params.storyId);
  response.status(204).end();
}));

// ─── Pinterest routes ─────────────────────────────────────────────────────────

app.get('/api/admin/pinterest/connect', asyncRoute(async (request, response) => {
  const state = Buffer.from(String(request.user.id)).toString('base64');
  response.json({ url: buildOAuthUrl(state) });
}));

app.get('/api/admin/pinterest/account', asyncRoute(async (request, response) => {
  const account = await getAccountForUser(request.user.id);
  response.json({ account });
}));

app.get('/api/admin/pinterest/boards', asyncRoute(async (request, response) => {
  const boards = await getBoards(request.user.id);
  response.json({ boards });
}));

app.get('/api/admin/pinterest/pins', asyncRoute(async (request, response) => {
  const { storyId, status, limit, offset } = request.query;
  const pins = await listPins({
    storyId: storyId || undefined,
    status: status || undefined,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  });
  response.json({ pins });
}));

app.post('/api/admin/pinterest/pins', asyncRoute(async (request, response) => {
  const account = await getAccountForUser(request.user.id);
  if (!account) throw createHttpError(400, 'Pinterest account not connected');
  const pin = await createPin({ ...request.body, accountId: account.id });
  response.status(201).json(pin);
}));

app.put('/api/admin/pinterest/pins/:pinId', asyncRoute(async (request, response) => {
  const pin = await updatePin(Number(request.params.pinId), request.body);
  if (!pin) response.status(404).json({ message: 'Pin not found' });
  else response.json(pin);
}));

app.delete('/api/admin/pinterest/pins/:pinId', asyncRoute(async (request, response) => {
  await deletePin(Number(request.params.pinId));
  response.status(204).end();
}));

app.post('/api/admin/pinterest/pins/:pinId/post', asyncRoute(async (request, response) => {
  const result = await postPinNow(Number(request.params.pinId));
  response.json(result);
}));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status ?? 500).json({
    message: error.message ?? 'Internal server error',
    detail: error.status ? undefined : error.message,
  });
});

async function start() {
  await ensureBootstrap();
  await ensurePinterestSchema();

  // Cron: check scheduled pins every 5 minutes
  setInterval(async () => {
    try { await processScheduledPins(); } catch (e) { console.error('Pinterest cron:', e.message); }
  }, 5 * 60 * 1000);

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
