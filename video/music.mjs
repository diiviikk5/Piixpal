// node video/music.mjs -> video/out/music.wav
// The soundtrack, synthesised from nothing: a 120 BPM chiptune score plus sound effects placed
// on the film's own cues (video/out/cues.json, written by render.mjs --cues).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');
const SR = 44100, DUR = 36, N = SR * DUR, BEAT = .5;
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
/* a soft felt-key pluck, for the quiet parts */
function pluck(t0, note, g = 1, pan = 0) { voice(t0, 1.4, t => (Math.sin(t * hz(note) * 6.283) + tri(t * hz(note) * 2) * .25) * env(t, .003, .35), .11 * g, pan); }
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
  card: (t, i) => { const f = lp(.08 + i * .01); voice(t, .35, u => f(noise()) * env(u, .08, .1), .3, (i % 3 - 1) * .5); },
  suck: t => { const f = lp(.06); voice(t, .6, u => { const k = u / .6; return f(noise()) * k * k * 1.5 + Math.sin(u * lerpExp(200, 1600, k) * 6.283) * .15 * k; }, .4); },
  blip: t => { sweep(t, .1, 2000, 2600, p => Math.sin(p * 6.283), .12); },
  logo: t => { crash(t, .5); sub(t, .9); [m('C5'), m('G5'), m('E6')].forEach((n, i) => voice(t + i * .03, 1.6, u => Math.sin(u * hz(n) * 6.283) * env(u, .004, .5), .12, (i - 1) * .4)); },
  click: t => { voice(t, .04, u => noise() * env(u, .0005, .005), .5); sweep(t, .05, 900, 600, p => pulse(p, .5), .06); },
  heat: t => { const f = lp(.04); voice(t, .9, u => { const k = u / .9; return (f(noise()) * (.4 + k * 2) + saw(u * lerpExp(80, 640, k)) * .1) * k * k; }, .4); },
  whoosh: t => { const f = lp(.12); voice(t - .1, .45, u => f(noise()) * Math.sin(Math.min(1, u / .45) * Math.PI), .45, .2); },
  tick: (t, i) => { voice(t, .06, u => Math.sin(u * hz(m('C6') + [0, 2, 4, 7, 9][i % 5]) * 6.283) * env(u, .001, .03), .1, .3); },
  style: (t, i) => { const n = [m('C6'), m('D6'), m('E6'), m('G6'), m('A6'), m('C7')][i % 6]; voice(t, .3, u => pulse(u * hz(n), .25) * env(u, .002, .09), .07); FX.whoosh(t); },
  swish: (t, i) => { const f = lp(.2); voice(t, .3, u => f(noise()) * env(u, .01, .06), .35, .6 - i * .3); },
  select: t => { sweep(t, .12, 600, 1200, p => tri(p), .14); },
  tile: (t, i) => { voice(t, .12, u => Math.sin(u * hz(m('G5') + i * 2) * 6.283) * env(u, .002, .05), .08, (i % 2 ? .4 : -.4)); },
  step: (t, i) => { sweep(t, .06, 400 + i * 40, 250, p => tri(p), .14); },
  bigpop: (t, i) => { sweep(t, .22, 200 + i * 60, 900 + i * 120, p => pulse(p, .5), .1); sub(t, .25); }
};

/* ---------- the score ---------- */
const CH = { C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'] };
const ROOT = { C: m('C2'), G: m('G1'), Am: m('A1'), F: m('F1') };
const chordAt = t => ['C', 'G', 'Am', 'F'][Math.floor(t / 2) % 4];
const tones = (c, oct) => CH[c].map(n => m(n + oct)).map((n, i, a) => n < a[0] ? n + 12 : n);
const MEL = {
  C: ['E5', 0, 'G5', 'E5', 'C6', 0, 'G5', 0],
  G: ['D5', 0, 'G5', 'D5', 'B5', 0, 'A5', 'G5'],
  Am: ['C5', 0, 'E5', 'A5', 'C6', 0, 'B5', 'A5'],
  F: ['A5', 0, 'G5', 'F5', 'E5', 0, 'D5', 0]
};
/* sections, by time */
const parts = t => {
  if (t < 3.6) return { pad: 1.6, pluck: 1 };
  if (t < 7) return { pad: 1.4, pluck: 1, bass: .6, kick: t >= 4 ? .55 : 0, tick: .8 };
  if (t < 8.75) return { pad: 1.2, pluck: 1, hats: .6, bass: .5 };
  if (t < 9.6) return { pad: 1 };
  if (t < 13.6) return { pad: 1.2, bass: 1, kick: 1, snare: .8, hats: .8 };
  if (t < 26.2) return { pad: 1, bass: 1, kick: 1, snare: 1, hats: 1, arp: 1, lead: 1 };
  if (t < 29.6) return { pad: 1.1, half: 1, hats: .6, arp: .8, bass: .6 };
  if (t < 32.6) return { pad: 1, bass: 1, kick: 1, snare: 1, hats: 1, arp: 1, lead: 1.1 };
  return {};
};
for (let bar = 0; bar < 17; bar++) {
  const t0 = bar * 2, c = chordAt(t0);
  if (parts(t0 + .01).pad) pad(t0, 2, tones(c, 4).concat(m(CH[c][0] + 3)), parts(t0 + .01).pad);
  for (let s = 0; s < 16; s++) {                                     /* sixteenths */
    const t = t0 + s * BEAT / 4, Q = parts(t + .001);
    if (Q.kick && s % 4 === 0) kick(t, Q.kick);
    if (Q.half && s === 0) { kick(t, .9); sub(t, .6); }
    if (Q.half && s === 8) { snare(t, .7); clap(t, .7); }
    if (Q.snare && (s === 4 || s === 12)) { snare(t, Q.snare); clap(t, .6 * Q.snare); }
    if (Q.hats) hat(t, (s % 2 ? .55 : 1) * Q.hats * (s % 4 === 2 ? 1.3 : 1), s % 8 === 6);
    if (Q.tick && s % 2 === 0) hat(t, .35 * Q.tick);
    if (Q.bass && s % 2 === 0) bass(t, BEAT / 2, ROOT[c] + (s % 4 === 2 ? 12 : 0), Q.bass);
    if (Q.pluck && s % 2 === 0) { const tn = tones(c, 5); pluck(t, tn[[0, 2, 1, 2, 0, 2, 1, 2][s / 2]] - (s >= 8 ? 0 : 12), Q.pluck, s % 4 ? .35 : -.35); }
    if (Q.arp) { const tn = tones(c, 5); arp(t, .12, tn[[0, 1, 2, 1][s % 4]] + (s >= 8 ? 12 : 0), Q.arp); }
    if (Q.lead && s % 2 === 0) { const n = MEL[c][s / 2]; if (n) lead(t, BEAT / 2 * .9, m(n), Q.lead); }
  }
}
/* the drop out of the heat map: a beat of silence, then everything */
crash(9.6, 1.1); sub(9.6, 1.3); kick(9.6, 1.3); stab(9.6, tones('Am', 4).concat(m('A4')), 1);
/* the lead arrives with the site shot, the finale gets its own crash */
crash(13.6, .7); crash(29.6, 1.1); sub(29.6, 1);
/* fills into each new section */
[13.1, 25.7, 29.1].forEach(t0 => { for (let k = 0; k < 8; k++) snare(t0 + k * BEAT / 8, .3 + k * .07); });
/* the end: one held chord and a little sign-off */
crash(32.6, 1); kick(32.6, 1.2); sub(32.6, 1.2);
stab(32.6, tones('C', 4).concat(m('C5'), m('G5')), 1.2);
pad(32.6, 2.8, tones('C', 4).concat(m('C3'), m('E5')), 1.6);
['C6', 'E6', 'G6', 'C7'].forEach((n, i) => pluck(33.4 + i * .25, m(n), 1.2, i % 2 ? .3 : -.3));

/* every sound effect, on its cue */
const seen = {};
for (const [t, kind] of cues) { const i = (seen[kind] = (seen[kind] ?? -1) + 1); FX[kind]?.(t, i); }

/* ---------- master: gentle glue, soft clip, fade, normalise ---------- */
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = t > DUR - .8 ? Math.max(0, (DUR - t) / .8) : 1;
  L[i] = Math.tanh(L[i] * 1.25) * fade; R[i] = Math.tanh(R[i] * 1.25) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = .89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4); }
writeFileSync(join(OUT, 'music.wav'), buf);
console.log(`wrote music.wav  ${DUR}s  ${cues.length} cues`);
