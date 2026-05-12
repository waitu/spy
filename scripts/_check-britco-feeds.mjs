const pages = [
  'https://www.brit.co/self-care/beauty-skin-care/hair/',
  'https://www.brit.co/self-care/beauty-skin-care/',
  'https://www.brit.co/self-care/makeup/',
  'https://www.brit.co/self-care/health/',
  'https://www.brit.co/entertainment/',
  'https://www.brit.co/travel/',
];
for (const url of pages) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; SponbitBot/1.0)' }, signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!r?.ok) { console.log('FAIL', url); continue; }
  const html = await r.text();
  const altFeeds = Array.from(html.matchAll(/<link[^>]*type="application\/rss\+xml"[^>]*href="([^"]+)"/gi), m => m[1]);
  console.log(altFeeds[0] ?? 'none', '-', url);
}

// Check how many items in the hair feed
const feedRes = await fetch('https://www.brit.co/feeds/self-care/beauty-skin-care/hair.rss', {
  headers: { 'user-agent': 'SponbitFeedSync/1.0' }, signal: AbortSignal.timeout(15000),
});
const xml = await feedRes.text();
const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));
console.log('\nHair feed item count:', items.length);
if (items[0]) {
  const cats = Array.from(items[0][1].matchAll(/<category>([\s\S]*?)<\/category>/gi), m => m[1]);
  console.log('First item categories:', cats);
}

