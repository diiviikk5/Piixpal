/* Eight new Pixel UI components in 21 seconds, cut to video/beat-new8.mjs (140 BPM). No intro: the
 * first frame is already the first component. One bar each, two for the games, then the outro.
 * Every component is the real thing: the film only feeds it input (a brush stroke, a click, keys,
 * typing) at set times on the film's clock, so every render is the same. */
const B = 60 / 140, BR = B * 4, at = (bar, beat = 0) => bar * BR + beat * B, DUR = 21, WARM = 60000;
const $ = s => document.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const SHOTS = [
  ['#s-sand', 0, at(1)], ['#s-quake', at(1), at(2)], ['#s-liquid', at(2), at(3)], ['#s-rewind', at(3), at(4)],
  ['#s-breakout', at(4), at(6)], ['#s-handheld', at(6), at(8)],
  ['#s-rpg', at(8), at(9)], ['#s-chip', at(9), at(10)], ['#s-outro', at(10), DUR]
].map(([s, a, b]) => [$(s), a, b]);
const setShots = T => { for (const [el, a, b] of SHOTS) el.classList.toggle('on', T >= a && T < b); };
const rect = el => el.getBoundingClientRect();
const ptr = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, composed: true, pointerType: 'mouse', isPrimary: true, button: 0 }));

/* ---------- what happens when: [film time, action] ---------- */
const CUES = [];
const cue = (t, fn) => CUES.push({ t, fn });

/* the RPG box says its line */
cue(at(8) + .02, () => $('#rpg').restart());

/* sand: one brush stroke through the heading and the line under it */
for (let i = 0; i <= 22; i++) cue(.05 + i / 30, () => {
  const r = rect($('#sand')), k = i / 22;
  ptr($('#sand'), 'pointermove', r.left + 60 + k * (r.width - 200), r.top + 70 + Math.sin(k * 9) * 60 + k * 90);
});
cue(.8, () => $('#sand').dispatchEvent(new PointerEvent('pointerleave')));

/* quake: down it goes */
cue(at(1) + .05, () => $('#quake').quake());

/* liquid: two splashes, on the beat */
cue(at(2, .3), () => $('#liquid').splash(560, 1.7));
cue(at(2, 2), () => $('#liquid').splash(1380, 1.5));

/* rewind: type a task, then rewind it */
const TASK = 'Ship the new video';
[...TASK].forEach((ch, i) => cue(at(3) + .03 + i * .035, () => { const f = $('#rwText'); f.value += ch; f.dispatchEvent(new Event('input', { bubbles: true })); }));
cue(at(3) + .8, () => $('#rewind').rewind());

/* breakout: play, launch, and the paddle follows the ball */
cue(at(4) + .02, () => $('#breakout').play());
cue(at(4) + .18, () => { const b = $('#breakout'); b._launch(); b._vx = -300; b._vy = -620; });

/* handheld: it boots just before its shot, then the D-pad scrolls and Select changes the screen */
cue(at(6) - .85, () => { const h = $('#hh'); h.removeAttribute('boot'); h._boot(true); });
[[1.5, 'down'], [1.8, 'down'], [2.1, 'right'], [2.4, 'select'], [2.75, 'select'], [3.1, 'select']].forEach(([t, b]) => cue(at(6) + t, () => $('#hh').press(b)));

/* chiptune: a sound name lands on each beat */
$$('#s-chip .sounds span').forEach((s, i) => cue(at(9, i * .5 + .01), () => s.classList.add('on')));
CUES.sort((a, b) => a.t - b.t);

/* ---------- every frame ---------- */
function hooks(T) {
  /* the paddle keeps under the ball, with a little sway so the angles vary */
  if (T > at(4) + .18 && T < at(6)) {
    const b = $('#breakout');
    if (b._state === 'serve') b._launch();
    b._tx = b._bx + Math.sin(T * 3) * b._pw * .22; b._keys = 0;
  }
  /* the speaker thumps on every beat of the lift */
  if (T >= at(9) && T < at(10)) { const since = (T - at(9)) % (B / 2); $('#s-chip .spk').style.transform = `scale(${4.2 + Math.exp(-since * 14) * .5})`; }
  /* the end: dither to black */
  $('#fade').style.opacity = String(Math.floor(cl((T - (DUR - .8)) / .7) * 6) / 6);
}
function shadowRoots(root, out = []) { for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { out.push(el.shadowRoot); shadowRoots(el.shadowRoot, out); } return out; }
/* CSS animations (the boot slide, the tape's tracking band, the blinking cursor) follow the film clock */
function syncAnims() {
  for (const r of [document, ...shadowRoots(document)]) for (const a of r.getAnimations ? r.getAnimations() : []) {
    if (a.__t0 == null) a.__t0 = __clock.ms - (a.currentTime || 0);
    a.pause(); a.currentTime = Math.max(0, __clock.ms - a.__t0);
  }
}
let fired = 0;
/* the clock runs one animation frame per step: move it a frame at a time, so a jump simulates every frame in between */
const stepTo = ms => { while (ms - __clock.ms > .01) { hooks((__clock.ms - WARM) / 1000); __clock.step(Math.min(1000 / 30, ms - __clock.ms)); } };
function frame(T) {
  setShots(T);
  /* fire each cue at its own moment, not the frame's */
  while (fired < CUES.length && CUES[fired].t <= T) { stepTo(WARM + CUES[fired].t * 1000); CUES[fired++].fn(); }
  stepTo(WARM + T * 1000);
  hooks(T);
  syncAnims();
}

/* warm up: fonts in, every component built and settled before the film starts */
const realWait = ms => new Promise(r => { const id = __realSetInterval(() => { __realClearInterval(id); r(); }, ms); });
async function warm() {
  for (const [el] of SHOTS) el.classList.add('on');
  for (let i = 0; i < 120; i++) { __clock.step(WARM / 120); await realWait(8); }
  for (const [el] of SHOTS) el.classList.remove('on');
  stepTo(WARM);
}
const ready = document.fonts.ready.then(() => Promise.all(['800 100px "Bricolage Grotesque"', '400 30px Silkscreen', '400 30px "JetBrains Mono"'].map(f => document.fonts.load(f)))).then(warm);
window.__film = { DUR, ready, frame, cues: () => [] };

/* live preview: open video/new8.html in a browser (plays once) */
if (!location.search.includes('render')) ready.then(() => { const t0 = __realNow(); const id = __realSetInterval(() => { const T = (__realNow() - t0) / 1000; if (T >= DUR) __realClearInterval(id); else frame(T); }, 1000 / 30); });
