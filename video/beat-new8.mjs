// node video/beat-new8.mjs -> video/out/new8.wav  (the eight-new-components film)
// The Pixel UI launch track: 128 BPM, F minor, synthesised from nothing. Big-room drums, a sidechained
// sub and offbeat bass, supersaw stabs and a hook, two drops. The film (ui-film.js) cuts on its beats.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');
const SR = 44100, DUR = 21, N = SR * DUR;

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

/* ---------- eight new components: 140 BPM, A minor, straight in ----------
 *   bars 0-7   the drop from the first downbeat: four on the floor, offbeat bass, a square-wave hook
 *              with echoes, 16th blips; one bar per component (two for the games)
 *   bar  8     the RPG box: half-time, the hook alone over blips
 *   bar  9     chiptune: the library's own sounds, one per half beat (coin, jump, break, bounce, powerup, win)
 *   bars 10-11 the last hit, the hook once more, a bell tail */
const B = 60 / 140, Q = B / 4, BR = B * 4;
const at = (bar, beat = 0, six = 0) => bar * BR + beat * B + six * Q;
const PROG = [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']].map(c => c.map(m));
const ROOT = ['A1', 'F1', 'C2', 'G1'].map(m);
const HOOK = [
  [[0, 'E5'], [2, 'A5'], [4, 'C6'], [6, 'B5'], [8, 'A5'], [10, 'E5'], [12, 'G5'], [14, 'A5']],
  [[0, 'F5'], [2, 'A5'], [4, 'C6'], [6, 'A5'], [8, 'F5'], [11, 'E5'], [14, 'C5']],
  [[0, 'G5'], [2, 'C6'], [4, 'E6'], [6, 'D6'], [8, 'C6'], [10, 'G5'], [12, 'E5'], [14, 'G5']],
  [[0, 'D6'], [2, 'B5'], [4, 'G5'], [6, 'B5'], [8, 'D6'], [10, 'G6'], [12, 'F#6'], [14, 'D6']]
].map(b => b.map(([s, n]) => [s, m(n)]));

function bigKick(t0, g = 1) {
  KICKS.push(t0);
  const o = osc('sine'), hp = svf(.7), k2 = osc('sine');
  voice(t0, .5, t => {
    const body = o(46 + 170 * Math.exp(-t * 36)) * env(t, .0008, .26);
    const knock = k2(210 * Math.exp(-t * 22)) * env(t, .0005, .02) * .5;
    const click = hp(noise(), 3800, 'hp') * env(t, .0004, .003) * .7;
    return Math.tanh((body + knock + click) * 2.2) * .9;
  }, g);
}
function bigClap(t0, g = 1) { clap(t0, 1.1 * g); snare(t0 + .004, .8 * g); }
function offBass(t0, note, g = 1) {
  const o = osc('sq'), f = svf(1.3);
  voice(t0, Q * 1.7, t => Math.tanh(f(o(hz(note + 12)), 400 + 1800 * Math.exp(-t * 18)) * 1.5) * Math.min(1, (Q * 1.7 - t) / .01), .18 * g, { pump: true });
}
function blip(t0, note, g = 1, pan = 0) { const o = osc('sq'), f = svf(.9); voice(t0, .1, t => f(o(hz(note)), 5200) * env(t, .001, .03), .04 * g, { pan, rev: .2 }); }
/* the hook: a 25% pulse with a quick pitch drop at the start, very chiptune, with echoes */
function chip(t0, note, g = 1, len = Q * 1.8) {
  const draw = (dl, gg, pan) => {
    let p = 0;
    voice(t0 + dl, len + .02, t => {
      const f = hz(note) * (1 + .06 * Math.exp(-t * 60));
      p += f / SR; if (p >= 1) p -= 1;
      return (p < .25 ? 1 : -1) * Math.min(1, t / .003) * Math.min(1, (len - t) / .01) * .5;
    }, gg, { pan, rev: .25 });
  };
  draw(0, .09 * g, 0); draw(Q * 3, .035 * g, .5); draw(Q * 6, .016 * g, -.5);
}
function impact(t0, g = 1) { boom(t0, 1.1 * g); crash(t0, 1.3 * g); }
/* the library's own sounds, played as notes */
const SFX = {
  coin: t0 => { chip(t0, m('B5'), 1, .07); chip(t0 + .07, m('E6'), 1, .25); },
  jump: t0 => { let p = 0; voice(t0, .18, t => { const f = 220 * Math.pow(3, t / .18); p += f / SR; if (p >= 1) p -= 1; return (p < .5 ? 1 : -1) * env(t, .002, .12) * .5; }, .1, { rev: .2 }); },
  break: t0 => { const f = svf(.8); voice(t0, .15, t => f(noise(), 4200 * Math.exp(-t * 14), 'lp') * env(t, .001, .07), .5, { rev: .2 }); chip(t0, m('E4'), .8, .08); },
  bounce: t0 => { const o = osc('tri'); voice(t0, .1, t => o(330 * Math.pow(.58, t / .1)) * env(t, .002, .06), .35); },
  powerup: t0 => ['A5', 'C6', 'E6', 'A6'].forEach((n, i) => chip(t0 + i * .045, m(n), .9, .05)),
  win: t0 => ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => chip(t0 + i * .06, m(n), 1, i === 3 ? .3 : .06))
};

/* ---------- bars 0-7: straight in ---------- */
impact(at(0), 1.2);
for (let bar = 0; bar < 8; bar++) {
  const i = bar % 4, c = PROG[i], r = ROOT[i];
  for (let bt = 0; bt < 4; bt++) {
    bigKick(at(bar, bt));
    subBass(at(bar, bt), B - .01, r, .85);
    offBass(at(bar, bt, 2), r, 1);
    hat(at(bar, bt, 2), .9, true); hat(at(bar, bt, 0), .3); hat(at(bar, bt, 3), .3);
  }
  bigClap(at(bar, 1)); bigClap(at(bar, 3));
  [0, 6, 10].forEach(s => chord(at(bar, 0, s), Q * 1.4, c.map(n => n + 12), .8, 4000, 2000));
  HOOK[i].forEach(([s, n]) => chip(at(bar, 0, s), n, 1));
  for (let s = 0; s < 16; s++) blip(at(bar, 0, s), c[s % 3] + 24, .7, s % 2 ? .5 : -.5);
  if (bar === 4) crash(at(bar), .8);
}
for (let s = 12; s < 16; s++) snare(at(7, 0, s), .5 + (s - 12) * .15);

/* ---------- bar 8: half time, the hook alone ---------- */
kick(at(8), .9); kick(at(8, 2), .8); bigClap(at(8, 2), .8);
subBass(at(8), BR, ROOT[0], .7);
HOOK[0].forEach(([s, n]) => chip(at(8, 0, s), n, .9));
for (let s = 0; s < 16; s += 2) blip(at(8, 0, s), PROG[0][(s / 2) % 3] + 24, .6, s % 4 ? .5 : -.5);

/* ---------- bar 9: the sounds themselves, on the half beats the film shows them ---------- */
['coin', 'jump', 'break', 'bounce', 'powerup', 'win'].forEach((k, i) => SFX[k](at(9, i * .5)));
for (let b = 0; b < 4; b++) kick(at(9, b), .55);
subBass(at(9), BR, ROOT[3], .6);
riser(at(9, 2), B * 2 - B / 4, 1);

/* ---------- bars 10-11: the last hit and a tail ---------- */
impact(at(10), 1.5);
for (let b = 0; b < 4; b++) { bigKick(at(10, b), b ? .8 : 1); subBass(at(10, b), B - .01, ROOT[0], .8); offBass(at(10, b, 2), ROOT[0], .8); }
bigClap(at(10, 1)); bigClap(at(10, 3));
HOOK[0].forEach(([s, n]) => chip(at(10, 0, s), n, 1));
chord(at(11), BR * 1.4, PROG[0].map(n => n + 12), 1.2, 3800, 600);
keys(at(11), PROG[0], 1, 3.2); bell(at(11), m('E6'), 1, .3); bell(at(11, 1), m('A6'), .8, -.3); bell(at(11, 2), m('C7'), .6, 0);
subBass(at(11), BR * .9, ROOT[0], .8); crash(at(11), .6);

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
/* a phaser on the master: the psychedelic swirl, deep in bar 12 and the tail */
const phaseDepth = t => t >= at(8) && t < at(9) ? .7 : t >= at(11) ? .85 : .15;
function phaser(x, lfoHz, seedPh) {
  const st = [0, 0, 0, 0].map(() => ({ x1: 0, y1: 0 })); let fb = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, sw = .5 + .5 * Math.sin(2 * Math.PI * lfoHz * t + seedPh), fc = 300 * Math.pow(12, sw), w = Math.tan(Math.PI * fc / SR), a1 = (w - 1) / (w + 1);
    let y = x[i] + fb * .55;
    for (const s of st) { const o = a1 * y + s.x1 - a1 * s.y1; s.x1 = y; s.y1 = o; y = o; }
    fb = y; const d = phaseDepth(t); x[i] = x[i] * (1 - d * .5) + y * d * .5;
  }
}
phaser(L, .23, 0); phaser(R, .23, 1.3);
/* half a beat of silence before each drop, so the drop lands out of nothing */
const GAPS = [[at(10) - B / 4, at(10)]];
const gapGain = t => { for (const [a, b] of GAPS) { if (t >= a + .006 && t < b - .002) return 0; if (t >= a && t < a + .006) return 1 - (t - a) / .006; } return 1; };
/* master: high-pass the rumble, gentle compression, soft clip, fade, normalise */
const hpL = svf(.7), hpR = svf(.7);
let lev = 0, peak = 0;
for (let i = 0; i < N; i++) {
  const l = hpL(L[i], 28, 'hp'), r = hpR(R[i], 28, 'hp');
  const v = Math.max(Math.abs(l), Math.abs(r)); lev = v > lev ? lev + (v - lev) * .01 : lev + (v - lev) * .0002;
  const gr = lev > .5 ? Math.pow(.5 / lev, .5) : 1;
  const t = i / SR, fade = t > DUR - 1.5 ? Math.max(0, (DUR - t) / 1.5) : 1;
  const gg = gapGain(t);
  L[i] = Math.tanh(l * gr * 1.1) * fade * gg; R[i] = Math.tanh(r * gr * 1.1) * fade * gg;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = .89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4); }
writeFileSync(join(OUT, 'new8.wav'), buf);
console.log(`wrote new8.wav  ${DUR}s`);
