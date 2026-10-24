/* GET /api/pal?id=k3x9a2q -> the pal's code, as text. Ids are content hashes, so it never changes. */
const store = require('./_store.js');

module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://x').searchParams.get('id');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const code = await store.load(id).catch(() => null);
  if (!code) { res.statusCode = 404; res.setHeader('Cache-Control', 'public, max-age=60'); return res.end('no pal by that id'); }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(code);
};
