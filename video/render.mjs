// node video/render.mjs                 -> video/out/piixpal-launch.mp4 (with the soundtrack from music.mjs)
// node video/render.mjs --stills 4,8.5  -> video/out/still-4.png, still-8.5.png
// node video/render.mjs --cues          -> video/out/cues.json only (the sound effects' timings, for music.mjs)
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { serve, browser, sleep } from './edge.mjs';

const OUT = join(import.meta.dirname, 'out'), FPS = +(process.env.FPS || 30);
mkdirSync(OUT, { recursive: true });
const arg = process.argv.indexOf('--stills');
const stills = arg > 0 ? process.argv[arg + 1].split(',').map(Number) : null;

const srv = await serve(8812), b = await browser({ port: 9342 });
await b.send('Page.navigate', { url: 'http://127.0.0.1:8812/video/launch.html?render' });
await sleep(1500);
await b.evaluate('window.__film.ready.then(() => true)');
const DUR = await b.evaluate('window.__film.DUR');
const { writeFileSync } = await import('node:fs');
writeFileSync(join(OUT, 'cues.json'), JSON.stringify(await b.evaluate('window.__film.cues()')));
if (process.argv.includes('--cues')) { console.log('wrote cues.json'); b.close(); srv.close(); process.exit(0); }

