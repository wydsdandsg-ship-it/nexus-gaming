const express = require('express');
const Parser = require('rss-parser');
const parser = new Parser({ timeout: 10000 });
const app = express();
const PORT = process.env.PORT || 3000;
const TTL = 10 * 60 * 1000; // تحديث كل 10 دقائق

const q = s => `https://news.google.com/rss/search?q=${encodeURIComponent(s)}&hl=ar&gl=SA&ceid=SA:ar`;
const FEEDS = [
  { p: 'PlayStation', url: q('بلايستيشن ألعاب') },
  { p: 'Xbox', url: q('إكس بوكس ألعاب') },
  { p: 'Nintendo', url: q('نينتندو ألعاب') },
  { p: 'PC', url: q('ألعاب الكمبيوتر PC') },
  { p: 'PC', url: q('أخبار الألعاب GTA') },
];
const COLORS = {
  PlayStation: ['#2b6bff', '#25e8ff'], Xbox: ['#1fd67a', '#0b6b4a'],
  Nintendo: ['#ff5a3d', '#ffb02b'], PC: ['#ff3d8b', '#7a2bff'],
};
function ago(d) {
  const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 60000));
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  return h < 24 ? `منذ ${h} ساعة` : `منذ ${Math.round(h / 24)} يوم`;
}
let cache = { at: 0, data: [] };
async function fetchNews() {
  const out = await Promise.allSettled(FEEDS.map(f => parser.parseURL(f.url).then(r => ({ f, r }))));
  const seen = new Set(), items = [];
  for (const o of out) {
    if (o.status !== 'fulfilled') continue;
    for (const it of o.value.r.items.slice(0, 8)) {
      if (seen.has(it.title)) continue;
      seen.add(it.title);
      const p = o.value.f.p;
      items.push({
        t: it.title, p, l: it.link, d: it.isoDate || it.pubDate,
        a: ago(it.isoDate || it.pubDate), c: COLORS[p],
        s: (it.contentSnippet || it.title).slice(0, 200),
      });
    }
  }
  return items.sort((a, b) => new Date(b.d) - new Date(a.d)).slice(0, 30);
}
app.get('/api/news', async (req, res) => {
  try {
    if (Date.now() - cache.at > TTL || !cache.data.length) {
      const data = await fetchNews();
      if (data.length) cache = { at: Date.now(), data };
    }
    res.json(cache.data.map(n => ({ ...n, a: ago(n.d) })));
  } catch (e) { res.status(502).json({ error: 'تعذّر جلب الأخبار' }); }
});
app.use(express.static('public'));
app.listen(PORT, () => console.log(`NEXUS GAMING يعمل على http://localhost:${PORT}`));
