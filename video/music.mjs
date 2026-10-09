// node video/music.mjs -> video/out/music.wav
// The soundtrack, synthesised from nothing: a 120 BPM electronic score with a chiptune hook,
// plus sound effects placed on the film's own cues (video/out/cues.json, written by render.mjs --cues).
// Band-limited oscillators, state-variable filters, a sidechain pump, a stereo reverb and a soft master.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');
const SR = 44100, DUR = 37, N = SR * DUR, BEAT = .5, BAR = 2;
const cues = existsSync(join(OUT, 'cues.json')) ? JSON.parse(readFileSync(join(OUT, 'cues.json'), 'utf8')) : [];

/* ---------- buses: dry, pumped (ducked by the kick), and the reverb send ---------- */
const bus = () => [new Float32Array(N), new Float32Array(N)];
const DRY = bus(), PUMP = bus(), SEND = bus();
let seed = 3;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
const rand = () => (noise() + 1) / 2;
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const m = s => (+s.slice(-1) + 1) * 12 + NOTE[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);
/* write a voice: fn(t) -> sample. o: { pan, rev (send amount), pump (true = ducked bus) } */
function voice(start, len, fn, gain = 1, o = {}) {
  const pan = o.pan || 0, a = Math.max(0, Math.floor(start * SR)), b = Math.min(N, Math.floor((start + len) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  const T = o.pump ? PUMP : DRY, rv = o.rev || 0;
  for (let i = a; i < b; i++) {
    const v = fn((i - a) / SR);
    T[0][i] += v * gl; T[1][i] += v * gr;
    if (rv) { SEND[0][i] += v * gl * rv; SEND[1][i] += v * gr * rv; }
  }
}

/* ---------- oscillators that don't alias (polyBLEP) ---------- */
const blep = (p, dt) => p < dt ? (p /= dt, p + p - p * p - 1) : p > 1 - dt ? (p = (p - 1) / dt, p * p + p + p + 1) : 0;
function osc(shape, detune = 0) {
  let p = rand();
  return f => {
    f *= Math.pow(2, detune / 1200);
    const dt = f / SR; p += dt; if (p >= 1) p -= 1;
    if (shape === 'saw') return 2 * p - 1 - blep(p, dt);
    if (shape === 'sq') { let q = p + .5; if (q >= 1) q -= 1; return (2 * p - 1 - blep(p, dt)) - (2 * q - 1 - blep(q, dt)); }
    if (shape === 'tri') return 1 - 4 * Math.abs(p - .5);
    return Math.sin(p * 2 * Math.PI);
  };
}
/* state-variable filter: low / high / band */
function svf(q = .8) {
  let lo = 0, bp = 0;
  return (x, cut, mode = 'lp') => {
    const f = 2 * Math.sin(Math.PI * clamp(cut, 20, SR / 6.5) / SR);
    lo += f * bp; const hi = x - lo - bp / q; bp += f * hi;
    return mode === 'lp' ? lo : mode === 'hp' ? hi : bp;
  };
}

/* ---------- drums ---------- */
const KICKS = [];
function kick(t0, g = 1) {
  KICKS.push(t0);
  const o = osc('sine'), hp = svf(.7);
  voice(t0, .5, t => {
    const body = o(48 + 130 * Math.exp(-t * 38)) * env(t, .001, .22);
    const click = hp(noise(), 2500, 'hp') * env(t, .0005, .004) * .6;
    return Math.tanh((body + click) * 1.6) * .9;
  }, .9 * g);
}
function clap(t0, g = 1) {
  const f = svf(1.2);
  voice(t0, .4, t => { const e = env(t, .0005, .01) + env(Math.max(0, t - .011), .0005, .01) * .8 + env(Math.max(0, t - .022), .0005, .09); return f(noise(), 1400, 'bp') * e; }, .5 * g, { pan: .05, rev: .35 });
}
function hat(t0, g = 1, open = false) {
  const f = svf(.7);
  voice(t0, open ? .35 : .08, t => f(noise(), 9000, 'hp') * env(t, .0005, open ? .11 : .022), .14 * g, { pan: .3, rev: open ? .1 : 0 });
}
function crash(t0, g = 1) { const f = svf(.6); voice(t0, 3, t => f(noise(), 6000, 'hp') * env(t, .002, .9), .11 * g, { pan: -.2, rev: .4 }); }
function snare(t0, g = 1) {
  const f = svf(.9), o = osc('tri');
  voice(t0, .3, t => f(noise(), 3000, 'bp') * env(t, .001, .08) + o(185) * env(t, .001, .04) * .5, .35 * g, { rev: .2 });
}

/* ---------- instruments ---------- */
/* sub bass, on the pumped bus */
function subBass(t0, len, note, g = 1) {
  const o = osc('sine'), o2 = osc('tri');
  voice(t0, len, t => (o(hz(note)) + o2(hz(note) * 2) * .12) * Math.min(1, t / .005) * Math.min(1, (len - t) / .02), .42 * g, { pump: true });
}
/* a wide supersaw chord, filtered; the cutoff can sweep over the note */
function chord(t0, len, notes, g = 1, cut = 2400, cutTo = cut) {
  notes.forEach(n => [-14, -6, 0, 6, 14].forEach((dt, v) => {
    const o = osc('saw', dt), f = svf(.9);
    voice(t0, len + .3, t => f(o(hz(n)), lerp(cut, cutTo, clamp(t / len, 0, 1))) * Math.min(1, t / .02) * (t > len ? Math.max(0, 1 - (t - len) / .3) : 1),
      .028 * g, { pan: (v - 2) * .35, pump: true, rev: .25 });
  }));
}
/* electric piano: two-operator FM */
function keys(t0, notes, g = 1, len = 1.8) {
  notes.forEach((n, j) => {
    const mo = osc('sine');
    voice(t0 + j * .012, len, t => Math.sin(2 * Math.PI * hz(n) * t + (1.4 * Math.exp(-t * 5) + .15) * mo(hz(n))) * env(t, .004, .8) * (1 + .15 * Math.sin(t * 2 * Math.PI * 4.5)),
      .07 * g, { pan: j % 2 ? .3 : -.3, rev: .45 });
  });
}
function pluck(t0, note, g = 1, pan = 0) {
  const o = osc('saw'), f = svf(.7);
  voice(t0, .9, t => f(o(hz(note)), 300 + 3500 * Math.exp(-t * 18)) * env(t, .002, .25), .09 * g, { pan, rev: .4 });
}
/* the hook: a band-limited square, filtered, with dotted-eighth echoes */
function lead(t0, len, note, g = 1) {
  const draw = (dl, gg, pan) => { const o = osc('sq'), f = svf(1); voice(t0 + dl, len + .05, t => f(o(hz(note) * (1 + Math.sin(t * 2 * Math.PI * 5.5) * .005 * Math.min(1, t * 3))), 3200) * Math.min(1, t / .006) * env(Math.max(0, t - len * .6), .001, .05), gg, { pan, rev: .3 }); };
  draw(0, .085 * g, 0); draw(.375, .035 * g, .45); draw(.75, .018 * g, -.45);
}
function arp(t0, note, g = 1) { const o = osc('sq'), f = svf(.8); voice(t0, .14, t => f(o(hz(note)), 2400) * env(t, .002, .05), .03 * g, { pan: -.35, rev: .2 }); }
function bell(t0, note, g = 1, pan = 0) {
  const mo = osc('sine');
  voice(t0, 2.4, t => Math.sin(2 * Math.PI * hz(note) * t + 2 * Math.exp(-t * 3) * mo(hz(note) * 3.5)) * env(t, .002, .7), .08 * g, { pan, rev: .5 });
}
function boom(t0, g = 1) { const o = osc('sine'); voice(t0, 1.6, t => o(34 + 60 * Math.exp(-t * 7)) * env(t, .004, .6), .6 * g); }
function riser(t0, len, g = 1) {
  const f = svf(2), o = osc('saw'), o2 = osc('saw', 9);
  voice(t0, len, t => { const k = t / len; return (f(noise(), 300 + k * k * 9000, 'bp') * 1.2 + (o(lerp(110, 880, k * k)) + o2(lerp(110, 880, k * k))) * .1) * k * k; }, .3 * g, { rev: .3 });
}
function swell(t0, len, g = 1) { const f = svf(.7); voice(t0, len, t => f(noise(), 200 + Math.pow(t / len, 2) * 6000) * Math.pow(t / len, 2.5), .35 * g, { rev: .3 }); }

/* ---------- sound effects: small, soft, modern ---------- */
const FX = {
  word: t => voice(t, .25, u => Math.sin(u * 2 * Math.PI * 1320) * env(u, .002, .05), .05, { rev: .5 }),
  pop: t => { const o = osc('sine'); voice(t, .25, u => o(lerp(320, 980, Math.min(1, u * 9))) * env(u, .002, .07), .14, { rev: .3 }); },
  card: (t, i) => { const f = svf(1.5); voice(t, .4, u => f(noise(), 600 + u * 5000, 'bp') * env(u, .1, .08), .1, { pan: (i % 3 - 1) * .6, rev: .2 }); },
  suck: t => swell(t, .55, .8),
  blip: t => voice(t, .3, u => Math.sin(u * 2 * Math.PI * 1760) * env(u, .002, .07), .06, { rev: .4 }),
  logo: t => { boom(t, .8); [m('A5'), m('E6'), m('C#7')].forEach((n, i) => bell(t + i * .02, n, .8, (i - 1) * .4)); },
  key: t => { const f = svf(.7); voice(t, .03, u => f(noise(), 4000, 'hp') * env(u, .0004, .005), .1 + noise() * .02, { pan: noise() * .4 }); },
  click: t => { const f = svf(.7); voice(t, .05, u => f(noise(), 2000, 'bp') * env(u, .0005, .008), .35); },
  whoosh: t => { const f = svf(1.4); voice(t - .15, .5, u => f(noise(), 300 + Math.sin(u / .5 * Math.PI) * 3500, 'bp') * Math.sin(Math.min(1, u / .5) * Math.PI), .22, { rev: .15 }); },
  style: (t, i) => voice(t, .3, u => Math.sin(u * 2 * Math.PI * hz(m('A5') + [0, 2, 4, 7, 9, 12][i % 6])) * env(u, .002, .08), .06, { rev: .3 }),
  swish: (t, i) => { const f = svf(1.2); voice(t, .3, u => f(noise(), 4000 - u * 8000, 'bp') * env(u, .02, .05), .12, { pan: .6 - i * .3 }); },
  coin: t => { const o = osc('sq'), o2 = osc('sq'), f = svf(.8); voice(t, .06, () => f(o(hz(m('B5'))), 3000), .035); voice(t + .06, .3, u => f(o2(hz(m('E6'))), 3000) * env(u, .002, .1), .035, { rev: .25 }); },
  select: t => voice(t, .2, u => Math.sin(u * 2 * Math.PI * lerp(600, 1200, Math.min(1, u * 8))) * env(u, .002, .06), .08, { rev: .3 }),
  tile: (t, i) => voice(t, .2, u => (Math.sin(u * 2 * Math.PI * hz(m('E6') + [0, 3, 5, 7, 10, 12][i % 6])) + Math.sin(u * 2 * Math.PI * hz(m('E6')) * 4) * .2 * Math.exp(-u * 40)) * env(u, .001, .06), .05, { pan: i % 2 ? .4 : -.4, rev: .3 }),
  step: (t, i) => { const o = osc('sine'); voice(t, .1, u => o(lerp(260, 140, u * 10)) * env(u, .001, .03), .1, { pan: i % 2 ? .3 : -.3 }); },
  swarm: t => { const f = svf(.6); voice(t, 1.6, u => f(noise(), 2500, 'bp') * (.5 + .5 * Math.sin(u * 37)) * Math.sin(Math.min(1, u / 1.6) * Math.PI), .07, { rev: .3 }); },
  form: t => [m('A4'), m('C5'), m('E5'), m('A5')].forEach((n, i) => bell(t + i * .04, n, .7, (i - 1.5) * .3)),
  scatter: t => FX.whoosh(t + .1)
};

/* ---------- the score ---------- */
/* Am F C G, a bar each, lined up so the first drop (10s, bar 5) lands on Am */
const PROG = ['Am', 'F', 'C', 'G'];
const chordOf = bar => PROG[((bar - 5) % 4 + 4) % 4];
const CHORD = { Am: ['A3', 'C4', 'E4', 'A4'], F: ['F3', 'A3', 'C4', 'F4'], C: ['C4', 'E4', 'G4', 'C5'], G: ['G3', 'B3', 'D4', 'G4'] };
const ROOT = { Am: m('A1'), F: m('F1'), C: m('C2'), G: m('G1') };
const HOOK = {
  Am: ['E5', 0, 'A5', 0, 'C6', 'B5', 'A5', 0],
  F: ['C6', 0, 'A5', 0, 'F5', 0, 'A5', 'C6'],
  C: ['E6', 0, 'D6', 'C6', 'G5', 0, 'E5', 0],
  G: ['D6', 0, 'B5', 0, 'G5', 'A5', 'B5', 0]
};
const sect = t =>
  t < 4 ? 'intro' : t < 7 ? 'build' : t < 9 ? 'prompt' : t < 10 ? 'dive' :
  t < 14 ? 'drop' : t < 26 ? 'main' : t < 30 ? 'dark' : t < 32.5 ? 'final' : 'outro';
const ARP8 = [0, 2, 1, 3, 2, 1, 3, 2];

for (let bar = 0; bar < Math.ceil(DUR / BAR); bar++) {
  const t0 = bar * BAR, c = chordOf(bar), S = sect(t0 + .01), notes = CHORD[c].map(m);
  if (S === 'intro' || S === 'build' || S === 'prompt') { keys(t0, notes, S === 'intro' ? 1.7 : 1.1, 1.9); keys(t0 + 1.25, notes.slice(1), .6, 1); }
  if (S === 'build' || S === 'prompt') chord(t0, BAR, notes, .5, 500, 1100);
  if (S === 'drop' || S === 'main' || S === 'final') chord(t0, BAR, notes, S === 'drop' ? 1 : .85, S === 'final' ? 3600 : 2600);
  if (S === 'dark') { chord(t0, BAR, notes, .8, 420, 700); keys(t0, notes, .6, 1.9); }
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * BEAT / 4, Q = sect(t + .001), groove = Q === 'drop' || Q === 'main' || Q === 'final';
    if ((Q === 'intro' || Q === 'build' || Q === 'prompt') && s % 2 === 0) pluck(t, notes[ARP8[s / 2]] + 12, Q === 'intro' ? .95 : .8, s % 4 ? .4 : -.4);
    if ((Q === 'build' || Q === 'prompt') && s % 4 === 0 && t >= 4.5) kick(t, .55);
    if (Q === 'prompt' && s % 4 === 2) hat(t, .7);
    if (groove) {
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) clap(t);
      if (s % 4 === 2) hat(t, 1.1, true); else if (s % 2 === 1) hat(t, .5);
      if (s % 2 === 0) subBass(t, BEAT / 2 - .02, ROOT[c] + (s % 4 === 2 ? 12 : 0));
      const n = HOOK[c][s / 2];
      if (s % 2 === 0 && n && (Q !== 'drop' || t >= 12)) lead(t, BEAT / 2 * .85, m(n) + (Q === 'final' ? 12 : 0), Q === 'final' ? .8 : 1);
      if (Q === 'main' || Q === 'final') arp(t, notes[[1, 2, 3, 2][s % 4]] + 12, .9);
    }
    if (Q === 'dark') {
      if (s === 0 || s === 10) kick(t, .9);
      if (s === 8) clap(t, .9);
      if (s % 2 === 0) subBass(t, BEAT / 2 - .02, ROOT[c], .8);
      if (s % 4 === 2) hat(t, .6);
      if (s % 2 === 0) pluck(t, notes[ARP8[s / 2] % 4] + 12, .5, s % 4 ? .3 : -.3);
    }
  }
}
/* into the first drop: the chords open up, a riser, a snare roll, a beat of nothing, then everything */
chord(9, .875, CHORD.G.map(m), .7, 600, 5000);
riser(8.6, 1.3, 1.1);
for (let i = 0; i < 12; i++) snare(9 + i * .07, .2 + i * .05);
[10, 30].forEach(t => { crash(t, 1.2); boom(t, 1.1); });
crash(14, .6); crash(22, .5);
/* out of the dark section */
riser(28.9, 1.0, 1); for (let i = 0; i < 14; i++) snare(29 + i * .064, .15 + i * .045);
/* the end: one held chord that closes down, keys, a bell, ring out */
crash(32.5, .9); boom(32.5, .9);
chord(32.5, 3.4, CHORD.Am.map(m), .9, 2600, 500);
keys(32.5, CHORD.Am.map(m), 1, 3);
keys(34.0, [m('C5'), m('E5'), m('A5')], .9, 3);

/* every sound effect, on its cue */
const seen = {};
for (const [t, kind] of cues) { const i = (seen[kind] = (seen[kind] ?? -1) + 1); FX[kind]?.(t, i); }

/* ---------- mix ---------- */
/* sidechain: the pumped bus ducks under every kick */
const duck = new Float32Array(N).fill(1);
for (const k of KICKS) { const a = Math.floor(k * SR); for (let i = 0; i < SR * .35 && a + i < N; i++) { const t = i / SR, d = 1 - .72 * Math.exp(-t / .1) * Math.min(1, t / .004 + .3); duck[a + i] = Math.min(duck[a + i], d); } }
/* reverb: Freeverb-style combs and allpasses on the send */
function reverb(inp, spread) {
  const out = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(n + spread), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map(n => ({ b: new Float32Array(n + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = inp[n] * .015; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.s = o * .8 + c.s * .2; c.b[c.i] = x + c.s * .86; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * .5; y = o - y; a.i = (a.i + 1) % a.b.length; }
    out[n] = y;
  }
  return out;
}
const RL = reverb(SEND[0], 0), RR = reverb(SEND[1], 23);
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) { L[i] = DRY[0][i] + PUMP[0][i] * duck[i] + RL[i] * 1.6; R[i] = DRY[1][i] + PUMP[1][i] * duck[i] + RR[i] * 1.6; }
/* master: high-pass the rumble, gentle compression, soft clip, fade, normalise */
const hpL = svf(.7), hpR = svf(.7);
let lev = 0, peak = 0;
for (let i = 0; i < N; i++) {
  const l = hpL(L[i], 28, 'hp'), r = hpR(R[i], 28, 'hp');
  const v = Math.max(Math.abs(l), Math.abs(r)); lev = v > lev ? lev + (v - lev) * .01 : lev + (v - lev) * .0002;
  const gr = lev > .5 ? Math.pow(.5 / lev, .5) : 1;
  const t = i / SR, fade = t > DUR - 1 ? Math.max(0, DUR - t) : 1;
  L[i] = Math.tanh(l * gr * 1.1) * fade; R[i] = Math.tanh(r * gr * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = .89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4); }
writeFileSync(join(OUT, 'music.wav'), buf);
console.log(`wrote music.wav  ${DUR}s  ${cues.length} cues`);
