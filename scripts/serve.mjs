// Tiny static dev server. Rebuilds piixpal.js on every request for it.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { createRequire } from 'node:module';
/* the serverless functions in api/, as on Vercel (vercel.json rewrites /readme and /p/:ref to them) */
const need = createRequire(import.meta.url), api = name => need(`../api/${name}.js`);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = +process.env.PORT || 5173;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/readme') return api('readme')(req, res);
  if (p.startsWith('/p/')) { req.url = '/api/p?ref=' + encodeURIComponent(p.slice(3)); return api('p')(req, res); }
  const fn = /^\/api\/([a-z]+)$/.exec(p);
  if (fn) { try { return await api(fn[1])(req, res); } catch (e) { res.writeHead(404).end(String(e.message)); return; } }
  if (!extname(p) && !p.endsWith('/')) p += '.html';
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    if (p === '/piixpal.js') build();
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + p + (e.code === 'ENOENT' ? '' : '\n' + e.message));
  }
}).listen(port, () => console.log(`piixpal dev → http://localhost:${port}`));
