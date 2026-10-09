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

/* ---------- drums ---------- */
const kick = (t0, g = 1) => { let ph = 0; voice(t0, .45, t => { const f = 45 + 120 * Math.exp(-t * 28); ph += f / SR; return Math.sin(ph * 2 * Math.PI) * env(t, .002, .16) + (t < .004 ? .5 : 0); }, .95 * g); };
const snare = (t0, g = 1) => { const f = lp(.55); voice(t0, .3, t => (f(noise()) * .9 * env(t, .001, .09) + Math.sin(t * 2 * Math.PI * 190) * .5 * env(t, .001, .05)), .55 * g); };
const hat = (t0, g = 1, open = false) => { let p = 0; voice(t0, open ? .3 : .08, t => { const n = noise(), v = n - p; p = n; return v * env(t, .001, open ? .12 : .022); }, .16 * g, .25); };
const crash = (t0, g = 1) => { let p = 0; const f = lp(.7); voice(t0, 2.6, t => { const n = noise(), v = n - p; p = n; return f(v) * env(t, .002, .7); }, .3 * g, -.15); };
const clap = (t0, g = 1) => { const f = lp(.4); voice(t0, .25, t => f(noise()) * (env(t, .001, .012) + env(Math.max(0, t - .012), .001, .012) * .8 + env(Math.max(0, t - .025), .001, .08)), .4 * g, .1); };

/* ---------- tonal ---------- */
function bass(t0, len, note, g = 1) { const f = lp(.08); voice(t0, len, t => f(pulse(t * hz(note), .25)) * env(t, .004, len * .7), .42 * g); }
function lead(t0, len, note, g = 1, pan = 0) {
  const f = lp(.32);
  const draw = (dl, gg, pp) => voice(t0 + dl, len + .1, t => { const v = 1 + Math.sin(t * 2 * Math.PI * 6) * .004 * Math.min(1, t * 4); return f(pulse(t * hz(note) * v, .5)) * env(t, .006, len * .9) * (t > len ? Math.max(0, 1 - (t - len) * 12) : 1); }, gg, pp);
  draw(0, .2 * g, pan); draw(.375, .07 * g, .5); draw(.75, .035 * g, -.5);            /* dotted-eighth echoes */
}
function arp(t0, len, note, g = 1) { voice(t0, len, t => pulse(t * hz(note), .125) * env(t, .002, .06), .07 * g, -.3); }
function pad(t0, len, notes, g = 1) {
  notes.forEach((n, j) => { const f = lp(.035); voice(t0, len + .6, t => { const a = Math.min(1, t / .5) * (t > len ? Math.max(0, 1 - (t - len) / .6) : 1); return f(saw(t * hz(n) * 1.003) + saw(t * hz(n) * .997)) * a; }, .05 * g, j % 2 ? .4 : -.4); });
}
function stab(t0, notes, g = 1) { notes.forEach((n, j) => { const f = lp(.25); voice(t0, 1.2, t => f(saw(t * hz(n)) + pulse(t * hz(n) * 1.005, .5) * .5) * env(t, .003, .28), .09 * g, j % 2 ? .3 : -.3); }); }
function sub(t0, g = 1) { let ph = 0; voice(t0, 1.2, t => { ph += (38 + 30 * Math.exp(-t * 6)) / SR; return Math.sin(ph * 2 * Math.PI) * env(t, .005, .45); }, .7 * g); }

/* ---------- sound effects ---------- */
const sweep = (t0, len, f0, f1, shape, g, pan = 0) => { let ph = 0; voice(t0, len, t => { ph += lerpExp(f0, f1, t / len) / SR; return shape(ph) * env(t, .002, len * .4); }, g, pan); };
const lerpExp = (a, b, k) => a * Math.pow(b / a, Math.min(1, k));
const FX = {
  word: t => { sweep(t, .07, 1400, 1900, p => pulse(p, .5), .08); hat(t, .6); },
  pop: t => { sweep(t, .16, 500, 1500, p => pulse(p, .25), .12); sweep(t + .05, .12, 1000, 2400, p => tri(p), .1, .3); },
  land: t => { sweep(t, .12, 320, 110, p => tri(p), .3); },
  block: t => { sweep(t, .08, 180, 70, p => pulse(p, .5), .12, -.2); },
  cut: t => { const f = lp(.15); voice(t, .2, (u) => f(noise()) * env(u, .03, .05), .35); },
  wipe: t => { let k = 0; voice(t, .45, u => { k = Math.min(.9, .02 + u * 1.6); const n = noise(); return n * k * env(u, .25, .07); }, .22); },
  throw: t => { sweep(t, .18, 300, 900, p => saw(p), .07, .3); },
  ding: t => { [m('E6'), m('B6')].forEach((n, i) => voice(t + i * .07, .6, u => Math.sin(u * hz(n) * 2 * Math.PI) * env(u, .002, .18), .14)); },
  coin: t => { voice(t, .05, u => pulse(u * hz(m('B5')), .5) * .9, .09); voice(t + .05, .3, u => pulse(u * hz(m('E6')), .5) * env(u, .002, .12), .09); },
  slam: t => { kick(t, 1.2); sub(t); crash(t, .8); clap(t, 1); },
  key: t => { const f = lp(.6); voice(t, .03, u => f(noise()) * env(u, .0005, .006), .3 + noise() * .05, noise() * .4); },
  chip: (t, i) => { const n = [m('C6'), m('E6'), m('G6'), m('C7'), m('E7'), m('G7')][i % 6]; voice(t, .25, u => pulse(u * hz(n), .25) * env(u, .002, .08), .08); },
  bigpop: (t, i) => { sweep(t, .22, 200 + i * 60, 900 + i * 120, p => pulse(p, .5), .1); sub(t, .25); }
};

