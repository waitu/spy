const url = 'https://edition.cnn.com/2023/04/14/economy/march-retail-sales/index.html';
const r = await fetch(url, {
  headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  redirect: 'follow',
  signal: AbortSignal.timeout(15000),
});
const html = await r.text();
console.log('Status:', r.status, '| Size:', html.length);

// Try JSON-LD
const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
for (const m of jsonLdMatches) {
  try {
    const d = JSON.parse(m[1]);
    if (d.articleBody || d['@graph']) {
      console.log('Found articleBody in JSON-LD:', JSON.stringify(d).slice(0, 3000));
    } else {
      console.log('JSON-LD type:', d['@type'], '| keys:', Object.keys(d).join(', '));
    }
  } catch {}
}

// Try __NEXT_DATA__ or window.__data
const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
if (nextData) {
  console.log('Has __NEXT_DATA__, size:', nextData[1].length);
  const d = JSON.parse(nextData[1]);
  console.log('NEXT_DATA keys:', JSON.stringify(d).slice(0, 500));
}

// Check for plain article paragraphs in static HTML
const paras = html.match(/<p[^>]*class="[^"]*paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/gi);
if (paras) {
  console.log('Found', paras.length, 'paragraphs:', paras.slice(0, 3).map(p => p.replace(/<[^>]+>/g, '').slice(0, 100)));
} else {
  console.log('No paragraph elements found');
}
