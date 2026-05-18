import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? process.env.WEB_PORT ?? 4173);
const apiOrigin = String(process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/$/, '');
const distDir = path.resolve(process.cwd(), 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

app.set('trust proxy', true);

function readIndexTemplate() {
  return fs.readFileSync(indexHtmlPath, 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(origin, value, fallback = '/og-cover.jpg') {
  if (!value) return `${origin}${fallback}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
}

function truncateText(value, limit = 180) {
  const text = stripHtml(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function injectJsonLd(html, payload) {
  const script = `\n    <script type="application/ld+json">${JSON.stringify(payload)}</script>`;
  return html.replace('</head>', `${script}\n  </head>`);
}

function applyMetaTags(template, meta) {
  let html = template;
  const author = escapeHtml(meta.author ?? 'Sponbit');

  html = replaceTag(html, /<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);
  html = replaceTag(html, /<meta name="description" content=".*?"\s*\/>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`);
  html = replaceTag(html, /<meta name="author" content=".*?"\s*\/>/i, `<meta name="author" content="${author}" />`);
  html = replaceTag(html, /<link rel="canonical" href=".*?"\s*\/>/i, `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  html = replaceTag(html, /<meta name="robots" content=".*?"\s*\/>/i, `<meta name="robots" content="${escapeHtml(meta.robots ?? 'index, follow')}" />`);
  html = replaceTag(html, /<meta property="og:type" content=".*?"\s*\/>/i, `<meta property="og:type" content="${escapeHtml(meta.ogType ?? 'website')}" />`);
  html = replaceTag(html, /<meta property="og:url" content=".*?"\s*\/>/i, `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  html = replaceTag(html, /<meta property="og:title" content=".*?"\s*\/>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  html = replaceTag(html, /<meta property="og:description" content=".*?"\s*\/>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  html = replaceTag(html, /<meta property="og:image" content=".*?"\s*\/>/i, `<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content=".*?"\s*\/>/i, `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content=".*?"\s*\/>/i, `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  html = replaceTag(html, /<meta name="twitter:image" content=".*?"\s*\/>/i, `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`);

  html = html.replace(/<meta property="article:published_time" content=".*?"\s*\/>\n?/i, '');
  html = html.replace(/<meta property="article:author" content=".*?"\s*\/>\n?/i, '');

  if (meta.publishedTime) {
    html = html.replace('</head>', `    <meta property="article:published_time" content="${escapeHtml(meta.publishedTime)}" />\n    <meta property="article:author" content="${author}" />\n  </head>`);
  }

  if (meta.jsonLd) {
    html = injectJsonLd(html, meta.jsonLd);
  }

  return html;
}

async function fetchApiJson(apiPath) {
  const response = await fetch(`${apiOrigin}${apiPath}`);
  if (!response.ok) {
    const error = new Error(`API ${apiPath} failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function buildDefaultMeta(origin, requestPath) {
  const canonical = new URL(requestPath || '/', origin).toString();

  return {
    title: 'Sponbit - Food, Culture & Modern Lifestyle',
    description: 'Sponbit is your guide to food, beauty, home, DIY and modern culture. Discover inspiring stories, recipes, and lifestyle ideas every day.',
    canonical,
    image: `${origin}/og-cover.jpg`,
    ogType: 'website',
    robots: 'index, follow',
  };
}

function buildStoryMeta(origin, story) {
  const canonical = new URL(story.path ?? `/story/${story.id}`, origin).toString();
  const image = absoluteUrl(origin, story.image);
  const description = truncateText(story.excerpt || story.title);

  return {
    title: `${story.title} | Sponbit`,
    description,
    canonical,
    image,
    author: story.author,
    ogType: 'article',
    robots: 'index, follow',
    publishedTime: story.publishDate,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: story.title,
      description,
      image: [image],
      author: story.author ? [{ '@type': 'Person', name: story.author }] : [{ '@type': 'Organization', name: 'Sponbit' }],
      publisher: {
        '@type': 'Organization',
        name: 'Sponbit',
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/favicon.svg`,
        },
      },
      mainEntityOfPage: canonical,
      datePublished: story.publishDate,
      dateModified: story.publishDate,
    },
  };
}

app.use(express.static(distDir, { index: false }));

app.get(/.*/, async (request, response) => {
  const origin = `${request.protocol}://${request.get('host')}`;
  const template = readIndexTemplate();
  const storyMatch = request.path.match(/^\/story\/([^/]+)$/);

  let meta = buildDefaultMeta(origin, request.originalUrl);

  if (storyMatch) {
    try {
      const payload = await fetchApiJson(`/api/stories/${encodeURIComponent(storyMatch[1])}`);
      if (payload?.story) {
        meta = buildStoryMeta(origin, payload.story);
      } else {
        response.status(404);
        meta = {
          ...meta,
          title: 'Story unavailable | Sponbit',
          description: 'This story does not exist or is no longer available.',
          robots: 'noindex, nofollow',
        };
      }
    } catch (error) {
      if (error.status === 404) {
        response.status(404);
        meta = {
          ...meta,
          title: 'Story unavailable | Sponbit',
          description: 'This story does not exist or is no longer available.',
          robots: 'noindex, nofollow',
        };
      }
    }
  }

  response.type('html').send(applyMetaTags(template, meta));
});

app.listen(port, () => {
  console.log(`Web listening on http://0.0.0.0:${port}`);
});