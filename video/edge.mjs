// Headless Edge over the DevTools protocol, plus a tiny static server for the repo
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const serve = port => new Promise(ok => {
  const s = createServer(async (req, res) => {
    const file = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { const b = await readFile(file); res.writeHead(200, { 'content-type': (TYPES[extname(file)] || 'application/octet-stream') + (/text|json|svg/.test(TYPES[extname(file)] || '') ? '; charset=utf-8' : '') }); res.end(b); }
    catch { res.writeHead(404); res.end(); }
  });
  s.listen(port, '127.0.0.1', () => ok(s));
});

