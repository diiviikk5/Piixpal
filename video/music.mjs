// node video/music.mjs -> video/out/music.wav
// The soundtrack, synthesised from nothing: a 120 BPM chiptune score plus sound effects placed
// on the film's own cues (video/out/cues.json, written by render.mjs --cues).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');
const SR = 44100, DUR = 38, N = SR * DUR, BEAT = .5;
const L = new Float32Array(N), R = new Float32Array(N);
const cues = existsSync(join(OUT, 'cues.json')) ? JSON.parse(readFileSync(join(OUT, 'cues.json'), 'utf8')) : [];

/* ---------- tiny synth ---------- */
let seed = 3;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
const hz = n => 440 * Math.pow(2, (n - 69) / 12);                 /* midi note -> Hz */
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const m = s => (+s.slice(-1) + 1) * 12 + NOTE[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);
/* write a voice into the mix: fn(t, i) returns a sample, pan -1..1 */
function voice(start, len, fn, gain = 1, pan = 0) {
  const a = Math.max(0, Math.floor(start * SR)), b = Math.min(N, Math.floor((start + len) * SR));
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = a; i < b; i++) { const v = fn((i - a) / SR, i); L[i] += v * gl; R[i] += v * gr; }
}
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);
const pulse = (ph, duty) => (ph % 1) < duty ? 1 : -1;
const tri = ph => 1 - 4 * Math.abs((ph % 1) - .5);
const saw = ph => 2 * (ph % 1) - 1;
/* one-pole lowpass held per voice */
const lp = k => { let y = 0; return x => (y += k * (x - y)); };

