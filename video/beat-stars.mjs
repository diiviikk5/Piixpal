// node video/beat-stars.mjs [stars] -> video/out/stars.wav: a blip per star climbing a scale, then a chord.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const N = +(process.argv[2] || 54), SR = 44100, DUR = 5, L = new Float32Array(SR * DUR);
/* the same timing as the film: slow at first, then faster and faster */
const T0 = .45, T1 = 3.2, arrive = k => T0 + (T1 - T0) * Math.pow(k / N, .6);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
/* a soft square-ish blip: the first three odd harmonics */
const blip = (t0, f, len, g) => {
  const a = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR && a + i < L.length; i++) {
    const t = i / SR, e = Math.min(1, t / .002) * Math.exp(-t / (len * .35));
    L[a + i] += (Math.sin(2 * Math.PI * f * t) + Math.sin(6 * Math.PI * f * t) / 3 + Math.sin(10 * Math.PI * f * t) / 5) * e * g;
  }
};
/* one blip per star, up a pentatonic scale */
const scale = [0, 2, 4, 7, 9];
for (let k = 1; k <= N; k++) { const step = Math.floor((k - 1) * 18 / N); blip(arrive(k), hz(60 + scale[step % 5] + 12 * Math.floor(step / 5)), .09, .16); }
/* the landing: a chord, a quick arpeggio on top, and a soft kick under it */
for (const m of [60, 64, 67, 72]) blip(3.5, hz(m), 1.4, .12);
[72, 76, 79, 84].forEach((m, i) => blip(3.5 + i * .07, hz(m), .5, .1));
const a = Math.floor(3.5 * SR);
for (let i = 0; i < SR * .4; i++) { const t = i / SR; L[a + i] += Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-t * 30)) * t) * Math.exp(-t * 9) * .6; }

/* normalise and write a 16-bit stereo WAV */
let peak = 0;
for (const v of L) peak = Math.max(peak, Math.abs(v));
const buf = Buffer.alloc(44 + L.length * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + L.length * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(L.length * 4, 40);
for (let i = 0; i < L.length; i++) { const v = Math.round(Math.max(-1, Math.min(1, L[i] / peak * .89)) * 32767); buf.writeInt16LE(v, 44 + i * 4); buf.writeInt16LE(v, 46 + i * 4); }
writeFileSync(join(import.meta.dirname, 'out', 'stars.wav'), buf);
console.log(`wrote stars.wav  ${N} stars, ${DUR}s`);
