// node scripts/readme-data.mjs -> api/_pals.json
// The README endpoint draws pals as SVG on the server, where the library can't run, so this
// exports every pal's real pixel art: its palette and the frames of the clip it moves in.
// Runs the built piixpal.js in headless Edge (see video/edge.mjs) and reads the sprites it registers.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser, sleep } from '../video/edge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srv = await serve(8840), b = await browser({ port: 9390, width: 400, height: 300 });
await b.send('Page.navigate', { url: 'http://127.0.0.1:8840/404.html' });
await sleep(800);
await b.evaluate(`new Promise(r => { const s = document.createElement('script'); s.src = '/piixpal.js'; s.onload = r; document.head.appendChild(s); })`);
await sleep(600);
const data = await b.evaluate(`(() => {
  const S = Piixpal._k.SPRITES, out = {};
  /* how it gets about, in order of preference; fliers float, everyone else walks on the text */
  const MOVE = ['walk', 'run', 'crawl', 'fly', 'swim', 'roll', 'hop', 'idle'];
  /* a few look better doing something else in a README */
  const PICK = { tri: 'dance' };
  for (const name of Object.keys(S)) {
    if (name[0] === '_') continue;
    const sp = S[name], clips = Object.keys(sp.frames);
    const clip = (PICK[name] && clips.includes(PICK[name]) && PICK[name]) || MOVE.find(c => clips.includes(c)) || clips[0];
    const frames = sp.frames[clip].map(rows => rows.map(r => String(r).slice(0, sp.w)));
    if (!frames.length || !frames[0].length) continue;
    out[name] = { w: sp.w, h: sp.h, palette: sp.palette, clip, fps: (sp.fps && sp.fps[clip]) || 6, fly: clip === 'fly', moves: ['walk', 'run', 'crawl', 'fly', 'swim'].includes(clip), frames };
  }
  return JSON.stringify(out);
})()`);
writeFileSync(join(root, 'api', '_pals.json'), data);
const pals = JSON.parse(data);
console.log(`api/_pals.json  ${Object.keys(pals).length} pals  ${(data.length / 1024).toFixed(1)} KB`);
b.close(); srv.close();
