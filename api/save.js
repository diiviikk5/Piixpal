/* POST a pal code, get a short id for it: { id }. 501 when no store is connected (see _store.js). */
const store = require('./_store.js');
const RIG = require('./_rig.js');
const MAKER = require('./_maker.js');

const body = req => new Promise((ok, no) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 64 * 1024) { no(new Error('too big')); req.destroy(); } });
  req.on('end', () => ok(s));
  req.on('error', no);
});

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"POST a pal code"}'); }
  if (!store.enabled()) { res.statusCode = 501; return res.end('{"error":"no store connected"}'); }
  try {
    const code = String(typeof req.body === 'string' ? req.body : await body(req)).trim();
    if (!store.isCode(code)) throw new Error('not a pal code');
    /* only real pals: it has to decode */
    if (RIG.smooth(code)) await RIG.decode(code); else MAKER.decode(code);
    res.end(JSON.stringify({ id: await store.save(code) }));
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
