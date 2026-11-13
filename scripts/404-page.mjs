// node scripts/404-page.mjs: writes 404.html, a short film starring the pals (scripts/404-film.html is the template).
// It exports the real pixel art of the cast from the built library, so the page needs no library at runtime.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser, sleep } from '../video/edge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAST = ['bitbug', 'kitty', 'pip', 'frog', 'boing', 'penguin', 'moss', 'gecko', 'bumble', 'shel'];
const srv = await serve(8851), b = await browser({ port: 9395, width: 400, height: 300 });
await b.send('Page.navigate', { url: 'http://127.0.0.1:8851/index.html' }); await sleep(1500);
const pals = JSON.parse(await b.evaluate(`(() => {
  const S = Piixpal._k.SPRITES, out = {}, g = document.createElement('canvas').getContext('2d');
  const hex = c => { g.fillStyle = '#000'; g.fillStyle = c; return g.fillStyle; };
  for (const name of ${JSON.stringify(CAST)}) { const sp = S[name]; if (!sp || !sp.frames) continue;
    const palette = {}; for (const k in sp.palette) palette[k] = hex(sp.palette[k]);
    const frames = {}; for (const c in sp.frames) frames[c] = sp.frames[c].map(rows => rows.map(r => String(r).slice(0, sp.w)));
    out[name] = { w: sp.w, h: sp.h, palette, frames, fps: sp.fps || {} }; }
  return JSON.stringify(out); })()`));
b.close(); srv.close();
if (process.argv.includes('--clips')) { for (const [n, p] of Object.entries(pals)) console.log(n, p.w + 'x' + p.h, Object.entries(p.frames).map(([c, f]) => c + ':' + f.length).join(' ')); process.exit(0); }
const html = readFileSync(join(root, 'scripts', '404-film.html'), 'utf8').replace('/*__PALS__*/null', JSON.stringify(pals));
writeFileSync(join(root, '404.html'), html);
console.log(`404.html  ${Object.keys(pals).length} pals  ${(html.length / 1024).toFixed(0)} KB`);
