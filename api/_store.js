/* Somewhere to keep made pals, so a pal can have a short link (piixpal.dvkk.dev/p/k3x9a2q)
 * instead of its whole code. Uses an Upstash Redis store over REST when one is connected
 * (Vercel: Storage > Upstash for Redis sets these variables); without one, saving is off and
 * every pal travels as its full code, which works just the same, only longer. */
const crypto = require('crypto');
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const enabled = () => !!(URL_ && TOKEN);
const cmd = async args => {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('store ' + r.status);
  return (await r.json()).result;
};
/* the id is the code's own hash: the same pal always gets the same link, and ids can't be guessed into */
const idOf = code => {
  const h = crypto.createHash('sha256').update(code).digest();
  let n = 0n;
  for (let i = 0; i < 8; i++) n = (n << 8n) | BigInt(h[i]);
  return n.toString(36).slice(0, 9);
};
const isId = s => /^[a-z0-9]{5,12}$/.test(String(s || ''));
const isCode = s => /^A[A-Za-z0-9_-]{8,}$/.test(String(s || ''));

const save = async code => {
  const id = idOf(code);
  await cmd(['SET', 'pal:' + id, code, 'NX']);
  return id;
};
const load = async id => (enabled() && isId(id) ? cmd(['GET', 'pal:' + id]) : null);
/* a pals= entry, a make= value or a /p/ path: a code as it is, or an id looked up */
const resolve = async ref => (isCode(ref) ? ref : isId(ref) ? load(ref).catch(() => null) : null);

module.exports = { enabled, save, load, resolve, idOf, isId, isCode };
