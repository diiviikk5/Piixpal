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

export async function browser({ port = 9341, width = 1920, height = 1080 } = {}) {
  const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'piixvid-'))}`,
    '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
  let t;
  for (let i = 0; i < 60; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (t.length) break; } catch {} await sleep(250); }
  const ws = new WebSocket(t.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.error('page error:', m.params.exceptionDetails.exception?.description); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type !== 'debug') console.log('page:', m.params.args.map(a => a.value ?? a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result.result.value;
  };
  const shot = async (format = 'png') => Buffer.from((await send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? 95 : undefined })).result.data, 'base64');
  const close = () => { ws.close(); edge.kill(); };
  return { send, evaluate, shot, close };
}
