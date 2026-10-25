// node video/beat-stars2.mjs -> video/out/stars2.wav: a soft tick as each stargazer arrives (rising
// as the rush builds), a whoosh under the scroll, and a bright chord when the count lands.
//
// Fetch the stargazers first (the API needs a login, so it goes through the gh CLI):
//   gh api "repos/diiviikk5/Piixpal/stargazers?per_page=100" --paginate -H "Accept: application/vnd.github.star+json" \
//     --jq '[.[] | {login: .user.login, avatar: .user.avatar_url}]' > video/out/stargazers/list.json
// then download the avatars into video/out/stargazers and write data.js (window.STARGAZERS, window.OWNER).
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const here = import.meta.dirname;
const STARS_TIME = createRequire(import.meta.url)('./stars2-time.js');
const N = JSON.parse(readFileSync(join(here, 'out', 'stargazers', 'list.json'), 'utf8')).length;
const T = STARS_TIME(N), SR = 44100, DUR = 5, L = new Float32Array(SR * DUR);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const tone = (t0, f, len, g, harm = [1, 0, 1 / 3, 0, 1 / 5]) => {
  const a = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR && a + i < L.length; i++) {
    const t = i / SR, e = Math.min(1, t / .002) * Math.exp(-t / (len * .3));
    let v = 0;
    harm.forEach((h, j) => { if (h) v += Math.sin(2 * Math.PI * f * (j + 1) * t) * h; });
    L[a + i] += v * e * g;
  }
};
/* a tick per arrival, climbing a pentatonic scale over the whole run */
const scale = [0, 2, 4, 7, 9];
for (let k = 0; k < N; k++) {
  const step = Math.floor(k * 15 / N), m = 67 + scale[step % 5] + 12 * Math.floor(step / 5);
  tone(T.when(k), hz(m), .07, .1, [1, 0, .25]);
}
/* a filtered-noise whoosh that follows the scroll speed */
let seed = 7, lp = 0;
for (let i = 0; i < L.length; i++) {
  const t = i / SR, v = (T.scroll(t + .01) - T.scroll(t)) / .01 / T.S;
  seed = (seed * 1664525 + 1013904223) >>> 0;
  lp += ((seed / 4294967296 - .5) - lp) * .08;
  L[i] += lp * v * .55;
}
/* the landing, the moment the last one arrives: a chord, a sparkle on top, a soft kick */
const LAND = T.when(N - 1);
for (const m of [60, 64, 67, 72, 76]) tone(LAND, hz(m), 1.3, .09);
[84, 88, 91, 96].forEach((m, i) => tone(LAND + .05 + i * .06, hz(m), .35, .06, [1]));
const a = Math.floor(LAND * SR);
for (let i = 0; i < SR * .4; i++) { const t = i / SR; L[a + i] += Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9) * .55; }

let peak = 0;
for (const v of L) peak = Math.max(peak, Math.abs(v));
const buf = Buffer.alloc(44 + L.length * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + L.length * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(L.length * 4, 40);
for (let i = 0; i < L.length; i++) { const v = Math.round(Math.max(-1, Math.min(1, L[i] / peak * .89)) * 32767); buf.writeInt16LE(v, 44 + i * 4); buf.writeInt16LE(v, 46 + i * 4); }
writeFileSync(join(here, 'out', 'stars2.wav'), buf);
console.log(`wrote stars2.wav  ${N} stargazers, last one at ${T.when(N - 1).toFixed(2)}s`);
