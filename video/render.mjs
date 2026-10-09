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

if (stills) {
  for (const t of stills) { await b.evaluate(`window.__film.frame(${t})`); writeFileSync(join(OUT, `still-${t}.png`), await b.shot('png')); console.log('still', t); }
} else {
  const ffmpeg = (await import('../.git/tmp/vid/node_modules/ffmpeg-static/index.js').catch(() => null))?.default || 'ffmpeg';
  const wav = join(OUT, 'music.wav');
  const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (existsSync(wav)) args.push('-i', wav, '-c:a', 'aac', '-b:a', '256k', '-shortest');
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, 'piixpal-launch.mp4'));
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'inherit'] });
  const n = Math.round(DUR * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await b.evaluate(`window.__film.frame(${i / FPS})`);
    const jpg = await b.shot('jpeg');
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', join(OUT, 'piixpal-launch.mp4'));
}
b.close(); srv.close();
