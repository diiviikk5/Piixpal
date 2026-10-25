// node scripts/pet.mjs
// Builds the terminal pet for coding agents: pet/piixpal-pet.mjs, one file with no dependencies.
// It exports the real pixel art of the pets (every clip) from the built library in headless Edge,
// adds the Pal Maker's pixel decoder (so `--make CODE` works), and drops it into pet/src.mjs.
// A copy goes to ./pet.mjs so the site serves it: curl -fsSL https://piixpal.dvkk.dev/pet.mjs -o pet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser, sleep } from '../video/edge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PETS = ['bitbug', 'pip', 'boing', 'moss', 'kitty', 'penguin', 'gecko', 'tri', 'bumble', 'shibe', 'capy', 'frog', 'duckling', 'shel', 'roomba', 'hiss', 'termi', 'beep'];

const srv = await serve(8841), b = await browser({ port: 9391, width: 400, height: 300 });
await b.send('Page.navigate', { url: 'http://127.0.0.1:8841/404.html' });
await sleep(700);
await b.evaluate(`new Promise(r => { const s = document.createElement('script'); s.src = '/piixpal.js'; s.onload = r; document.head.appendChild(s); })`);
await sleep(500);
const pals = JSON.parse(await b.evaluate(`(() => {
  const S = Piixpal._k.SPRITES, out = {};
  /* any CSS colour to #rrggbb, through a canvas */
  const g = document.createElement('canvas').getContext('2d');
  const hex = c => { g.fillStyle = '#000'; g.fillStyle = c; return g.fillStyle; };
  for (const name of ${JSON.stringify(PETS)}) {
    const sp = S[name];
    if (!sp || !sp.frames) continue;
    const palette = {};
    for (const k in sp.palette) palette[k] = hex(sp.palette[k]);
    const frames = {};
    for (const clip in sp.frames) frames[clip] = sp.frames[clip].map(rows => rows.map(r => String(r).slice(0, sp.w)));
    out[name] = { w: sp.w, h: sp.h, palette, frames, fps: sp.fps || {} };
  }
  return JSON.stringify(out);
})()`));
b.close(); srv.close();

/* the Pal Maker's decoder and animator, minus the browser bits */
const maker = readFileSync(join(root, 'api', '_maker.js'), 'utf8').replace(/^\/\/.*\n/, '').replace(/module\.exports = MAKER;\s*$/, '');
const src = readFileSync(join(root, 'pet', 'src.mjs'), 'utf8')
  .replace('/*__PALS__*/null', JSON.stringify(pals))
  .replace('/*__MAKER__*/', maker);
writeFileSync(join(root, 'pet', 'piixpal-pet.mjs'), src);
writeFileSync(join(root, 'pet.mjs'), src);
console.log(`pet/piixpal-pet.mjs  ${Object.keys(pals).length} pets  ${(src.length / 1024).toFixed(0)} KB`);
