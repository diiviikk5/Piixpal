/* HATCH: a pet that belongs to one visitor. Every visitor finds a speckled egg; it hatches
 * after a few visits (or a few taps) into a creature made from that visitor's own random
 * seed: its shape, colours, ears, eyes, mouth, markings, tail and name are theirs alone.
 * It remembers them, grows as they keep coming back, and says hello after time away.
 *
 *   <piix-pal pal="hatch"></piix-pal>
 *   visits="3"    visits before it hatches (tapping the egg speeds things up)
 *   el.ctl.hatch()   el.ctl.reset()      Events: piix:hatch { name }
 *
 * The same creatures, from any word: <piix-avatar seed="someone@example.com" size="48">
 * makes a little animated avatar that's always the same for the same seed.   @component avatar */

/* a seeded random number generator: the same seed always gives the same pet */
const hatchRng = seed => {
  let h = 2166136261 >>> 0;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6D2B79F5) | 0; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

/* colour sets: body, shade, light, belly, accent */
const HATCH_COLORS = [
  ['#7bd6b8', '#4fa98c', '#c4f2e2', '#effff9', '#ff6b4a'], ['#ff8a7a', '#d9604f', '#ffc4ba', '#fff0ea', '#58c8ff'],
  ['#b9a3ff', '#8c72e0', '#e2d8ff', '#f6f2ff', '#ffd23f'], ['#7cc8ff', '#4f97d1', '#c6e8ff', '#eef8ff', '#ff6b9a'],
  ['#ffd25c', '#d9a52a', '#fff0b8', '#fffbe8', '#ff6b4a'], ['#ffb38a', '#de8558', '#ffd9c4', '#fff4ec', '#6b4cff'],
  ['#b8e05c', '#89b12f', '#e1f7ad', '#f8ffe6', '#ff4d6d'], ['#ff9fc6', '#d9709c', '#ffd2e4', '#fff1f7', '#3fb8a0'],
  ['#9aa8bf', '#6f7d96', '#c9d2e2', '#f0f3f8', '#ffd23f'], ['#c49a74', '#9a7250', '#e3c7ab', '#f7ece1', '#7bd6b8']
];

/* body shapes */
const HATCH_SHAPES = {
  round: (x, y) => art.ellipse(x, y, 8, 9.6, 6, 5.2),
  tall: (x, y) => art.ellipse(x, y, 8, 9.2, 4.8, 6),
  bean: (x, y) => art.ellipse(x, y, 8, 10.2, 6.6, 4.4),
  blob: (x, y) => art.rrect(x, y, 2, 5, 13, 14, 4),
  pear: (x, y) => art.ellipse(x, y, 8, 7.6, 4.2, 3.6) || art.ellipse(x, y, 8, 11.2, 6, 3.6)
};

/* what grows on top: ears, horns, an antenna, a leaf, a crest, or nothing */
const HATCH_TOPS = {
  none: () => null,
  cat: (x, y) => ((x >= 3 && x <= 5 && y >= 2 && y <= 5 && y - 2 >= Math.abs(x - 4)) || (x >= 10 && x <= 12 && y >= 2 && y <= 5 && y - 2 >= Math.abs(x - 11))) ? 'b' : null,
  bunny: (x, y) => (art.ellipse(x, y, 5.5, 3, 1.3, 3) || art.ellipse(x, y, 10.5, 3, 1.3, 3)) ? 'b' : null,
  bear: (x, y) => (art.ellipse(x, y, 4, 4.6, 1.8, 1.8) || art.ellipse(x, y, 12, 4.6, 1.8, 1.8)) ? 'b' : null,
  horns: (x, y) => ((x === 4 && y >= 2 && y <= 4) || (x === 5 && y === 4) || (x === 11 && y >= 2 && y <= 4) || (x === 10 && y === 4)) ? 'a' : null,
  antenna: (x, y) => (x === 8 && y >= 2 && y <= 4) ? 'k' : art.ellipse(x, y, 8.5, 1.5, 1.2, 1.2) ? 'a' : null,
  leaf: (x, y) => (x === 8 && y >= 3 && y <= 4) ? 'g' : ((x === 9 || x === 10) && y === 2) || (x === 9 && y === 3) ? 'g' : null,
  crest: (x, y) => ((x === 6 || x === 8 || x === 10) && y >= 3 && y <= 4) ? 'a' : null
};

/* everything a pet is, decided once from its seed */
const hatchGenes = seed => {
  const r = hatchRng(seed), pickR = list => list[Math.floor(r() * list.length)];
  const syl = ['mo', 'bi', 'pu', 'ka', 'lu', 'zi', 'to', 'ne', 'ri', 'fa', 'po', 'gu', 'yo', 'ta', 'mi', 'ba', 'ko', 'su', 'pi', 'do', 'chi', 'wa'];
  const name = pickR(syl) + pickR(syl) + pickR(['', '', 'n', 'x', 'o', 'y']);
  return {
    name: name[0].toUpperCase() + name.slice(1),
    colors: pickR(HATCH_COLORS),
    shape: pickR(Object.keys(HATCH_SHAPES)),
    top: pickR(Object.keys(HATCH_TOPS)),
    eyeGap: pickR([2, 3, 3]), eyeY: pickR([8, 9, 9]), bigEyes: r() < .35,
    mouth: pickR(['smile', 'cat', 'fang', 'o', 'none']),
    mark: pickR(['belly', 'spots', 'stripes', 'blush', 'blush', 'none']),
    tail: pickR(['none', 'curl', 'puff', 'spike']),
    spots: [0, 1, 2].map(() => [Math.floor(3 + r() * 10), Math.floor(10 + r() * 4)])
  };
};

/* paint one pose: body, top, markings, tail, face, feet */
const hatchPaint = (G, { eyes = 'open', by = 0, step = 0, whites = false }) => {
  const shape = HATCH_SHAPES[G.shape], top = HATCH_TOPS[G.top];
  let rows = art.paint(16, 17, (x, y) => {
    const yy = y - by;
    if (yy > 15) return null;
    if (shape(x, yy)) {
      if (G.mark === 'belly' && art.ellipse(x, yy, 8, 12.4, 3.4, 2.3)) return 'c';
      if (G.mark === 'stripes' && (yy === 5 || yy === 7) && x > 5 && x < 11) return 'd';
      return 'b';
    }
    const tp = top(x, yy);
    if (tp) return tp;
    if (G.tail === 'curl' && ((x === 14 && yy >= 9 && yy <= 11) || (x === 15 && yy === 9))) return 'b';
    if (G.tail === 'puff' && art.ellipse(x, yy, 14.5, 11.5, 1.4, 1.4)) return 'c';
    if (G.tail === 'spike' && x >= 14 && yy >= 10 && yy <= 12 && x - 14 <= 12 - yy) return 'a';
    return null;
  });
  rows = art.outline(art.volume(rows));
  if (G.mark === 'spots') rows = art.compose(rows, ...G.spots.map(([sx, sy]) => [sx, sy + by, ['a']]).filter(([sx]) => sx > 2 && sx < 13));
  /* the face */
  const ey = G.eyeY + by, l = 8 - G.eyeGap - 1, rx = 8 + G.eyeGap - 1;
  const eh = G.bigEyes ? 2 : 1;
  if (whites) rows = art.compose(rows, [l, ey, ['ww', 'ww'].slice(0, 2)], [rx, ey, ['ww', 'ww'].slice(0, 2)]);
  else if (eyes === 'open') rows = art.compose(rows, [l, ey, G.bigEyes ? ['we', 'ee'] : ['e', 'e']], [rx + (G.bigEyes ? 0 : 1), ey, G.bigEyes ? ['we', 'ee'] : ['e', 'e']]);
  else if (eyes === 'shut') rows = art.compose(rows, [l, ey + eh, ['ee']], [rx, ey + eh, ['ee']]);
  else if (eyes === 'happy') rows = art.compose(rows, [l, ey, ['.e.', 'e.e'].map(s => s.slice(0, 3))].map((v, i) => i === 0 ? l - 0 : v), [rx, ey, ['.e.', 'e.e']]);
  const my = ey + 2 + (G.bigEyes ? 1 : 0);
  const M = { smile: [[7, my, ['e..e', '.ee.']]], cat: [[6, my, ['e.e.e', '.e.e.']]], fang: [[7, my, ['eeee', '.w..']]], o: [[7, my, ['.e', 'e.e'.slice(0, 2)]]], none: [] }[G.mouth];
  rows = art.compose(rows, ...M);
  if (G.mark === 'blush' || G.mark === 'belly') rows = art.compose(rows, [l - 1, my, ['p']], [rx + 2, my, ['p']]);
  /* feet: together, or one lifted for a step */
  const F = [[[5, 15], [10, 15]], [[4, 14], [10, 15]], [[5, 15], [11, 14]]][step];
  for (const [fx, fy] of F) rows = art.put(rows, fx, fy + (fy === 15 ? 0 : by), ['kk']);
  return rows;
};
const hatchPalette = G => ({ k: '#17121f', b: G.colors[0], d: G.colors[1], B: G.colors[2], c: G.colors[3], a: G.colors[4], w: '#ffffff', e: '#17121f', p: '#ff9fb5', g: '#5cbf45' });

/* a whole pal, ready to live on the page */
const hatchSprite = seed => {
  const G = hatchGenes(seed);
  return defineSprite('_pet-' + seed, {
    w: 16, h: 17, scale: 3, palette: hatchPalette(G), petName: G.name,
    frames: {
      idle: [hatchPaint(G, {}), hatchPaint(G, { by: -1 }), hatchPaint(G, { eyes: 'shut' }), hatchPaint(G, { by: -1 })],
      walk: [hatchPaint(G, { step: 1, by: -1 }), hatchPaint(G, { step: 2 })],
      happy: [hatchPaint(G, { eyes: 'happy' }), hatchPaint(G, { eyes: 'happy', by: -1 })],
      sleep: [hatchPaint(G, { eyes: 'shut' })]
    },
    fps: { idle: 1.6, walk: 6, happy: 6 }
  });
};

/* the same creature as a figure: white eyes the cursor can steer, lids that blink */
const hatchFigure = seed => {
  const G = hatchGenes(seed);
  const ey = G.eyeY, l = 8 - G.eyeGap - 1, r = 8 + G.eyeGap - 1;
  return {
    w: 16, h: 17, scale: 4, palette: hatchPalette(G), petName: G.name,
    frames: [hatchPaint(G, { whites: true }), hatchPaint(G, { whites: true })],
    fps: 1, eyes: [{ x: l, y: ey, w: 2, h: 2 }, { x: r, y: ey, w: 2, h: 2 }], pupil: { w: 1, h: G.bigEyes ? 2 : 1 }, lid: 'b'
  };
};

/* the egg: cream with speckles, cracking a little more each time */
const hatchEgg = cracks => {
  let rows = art.outline(art.paint(13, 15, (x, y) => art.ellipse(x, y, 6.5, 8, 4.8, 6.2) ? ((x * 7 + y * 3) % 11 === 0 ? 's' : 'w') : null));
  const C = [[], [[5, 6, ['k', '_k']]], [[5, 6, ['k', '_k', 'k']], [8, 9, ['_k', 'k']]], [[3, 7, ['kk_k', '__k_k']], [8, 9, ['_k', 'k', '_k']]]][cracks];
  return art.compose(rows, ...C);
};

/* Hatch, before it hatches: an egg that wobbles and cracks */
defineSprite('hatch', {
  w: 13, h: 15, scale: 3, does: 'pet',
  palette: { k: '#17121f', w: '#fff7ec', s: '#7bd6b8' },
  frames: { egg0: [hatchEgg(0)], egg1: [hatchEgg(1)], egg2: [hatchEgg(2)], egg3: [hatchEgg(3)] }
});

/* its eggshell, flying off in two halves (crew only) */
defineSprite('_shell', {
  w: 7, h: 6, scale: 3,
  palette: { k: '#17121f', w: '#fff7ec', s: '#7bd6b8' },
  frames: { l: [['.kkk...', 'kwwwk..', 'kwswwk.', 'kwwwwk.', 'kwwk.k.', '.k..k..']], r: [['...kkk.', '..kwwwk', '.kwwswk', '.kwwwwk', '.k.kwwk', '..k..k.']] }
});

/* turn an actor into a different sprite, keeping its place */
const hatchBecome = (a, spec, s) => {
  a.spec = spec; a.frames = baked(spec); if (s) a.s = s;
  a.cv.width = spec.w; a.cv.height = spec.h;
  a.cv.style.width = spec.w * a.s + 'px'; a.cv.style.height = spec.h * a.s + 'px';
  a._drawn = null; a.clip = null; a.play(Object.keys(spec.frames)[0]);
};

/* the pet's memory: its seed, visits, taps, when it hatched and when you were last here */
const HATCH_KEY = 'piix-hatch';
const hatchLoad = () => { try { return JSON.parse(localStorage.getItem(HATCH_KEY)) || null; } catch (_) { return null; } };
const hatchSave = st => { try { localStorage.setItem(HATCH_KEY, JSON.stringify(st)); } catch (_) { /* private mode */ } };

/* pet: be an egg until it's time, then live on the page as this visitor's own pet */
defineBehavior('pet', (a, [el], host) => {
  const S = a.s / 3;
  const need = clamp(Math.round(+host.getAttribute('visits') || 3), 1, 99);
  let st = hatchLoad() || { seed: Math.random().toString(36).slice(2, 10), visits: 0, taps: 0, born: 0, last: 0 };
  const daysAway = st.last ? (Date.now() - st.last) / 864e5 : 0;
  st.visits++; st.last = Date.now(); hatchSave(st);
  const shells = [recruit(a, '_shell'), recruit(a, '_shell')];
  shells.forEach(s => { s.node.style.opacity = '0'; });
  let pet = null, x = null, goal = null, wait = rnd(1, 3), wobble = 0, flight = -1, card = null, moodT = 0;
  const grow = () => st.visits < 6 ? 2 : st.visits < 15 ? 3 : 4;
  const become = () => { pet = hatchSprite(st.seed); hatchBecome(a, pet, grow()); };
  const hatch = () => {
    if (pet) return;
    st.born = Date.now(); hatchSave(st);
    become();
    flight = 0; shells[0].play('l'); shells[1].play('r');
    a.say('heart', 1600); moodT = 1.6;
    card = uiCard({ tip: true, width: 250, attrs: { role: 'dialog', 'aria-label': 'It hatched' } });
    card.append(uiEl('h4', { text: 'It hatched!' }), uiEl('p', { text: `Meet ${pet.petName}. Nobody else has one quite like it. It will grow as you keep visiting.` }),
      uiEl('div', { cls: 'row' }, uiEl('button', { text: `Hi, ${pet.petName}!`, attrs: { type: 'button' }, on: { click: () => { uiClose(card); card = null; } } })));
    uiAnnounce(`Your egg hatched. Meet ${pet.petName}.`);
    host.dispatchEvent(new CustomEvent('piix:hatch', { bubbles: true, detail: { name: pet.petName, seed: st.seed } }));
  };
  if (st.born || st.visits >= need) { if (!st.born) { st.born = Date.now(); hatchSave(st); } become(); if (daysAway > .5) { a.say('hi', 1400); setTimeout(() => a.say('#' + Math.max(1, Math.round(daysAway)), 1400), 1500); } }

  return {
    crew: shells,
    hatch,
    reset() { try { localStorage.removeItem(HATCH_KEY); } catch (_) { /* private mode */ } st = { seed: Math.random().toString(36).slice(2, 10), visits: 1, taps: 0, born: 0, last: Date.now() }; hatchSave(st); pet = null; hatchBecome(a, SPRITES.hatch, 3); },
    get name() { return pet ? pet.petName : null; },
    tick(dt) {
      const r = surfaceOf(el) || rectOf(el);
      const lo = r.l + a.w / 2, hi = Math.max(lo, r.r - a.w / 2);
      if (x == null) x = lerp(lo, hi, host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5);
      if (!pet) {
        /* the egg: cracks show how close it is; tapping wobbles it */
        const p = Math.max(st.taps / 5, (st.visits - 1) / Math.max(1, need - 1));
        a.play('egg' + Math.min(3, Math.floor(p * 3.99)));
        wobble = Math.max(0, wobble - dt * 2.2);
        a.rot = Math.sin(wobble * 26) * wobble * 14;
        a.cv.style.transformOrigin = '50% 100%';
      } else {
        a.rot = 0;
        if (moodT > 0) { moodT -= dt; a.play('happy'); }
        else if (goal == null) {
          a.play('idle'); wait -= dt;
          if (ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 120 * S) a.face = ptr.x < a.x ? -1 : 1;
          if (wait <= 0 && !reduced()) { goal = rnd(lo, hi); wait = rnd(2, 6); }
        } else {
          const d = goal - x;
          x += Math.sign(d) * Math.min(Math.abs(d), 26 * S * dt);
          a.face = d < 0 ? -1 : 1; a.play('walk');
          if (Math.abs(d) < 1) goal = null;
        }
      }
      x = clamp(x, lo, hi);
      a.x = x; a.y = r.t;
      /* the shell halves fly apart and fade */
      if (flight >= 0) {
        flight += dt;
        shells.forEach((s, i) => {
          const k = flight, side = i ? 1 : -1;
          s.x = a.x + side * (8 + 70 * k) * S; s.y = a.y - (60 * k - 140 * k * k) * S; s.rot = side * k * 300;
          s.node.style.opacity = Math.max(0, 1 - k / .9).toFixed(2);
        });
        if (flight > 1) flight = -1;
      }
      if (card) uiPlace(card, a.x, a.y - a.h - 4, { under: a.y + 4, area: boxOf(host) ? rectOf(boxOf(host)) : undefined });
    },
    poke() {
      if (!pet) { st.taps++; hatchSave(st); wobble = 1; if (st.taps >= 5) hatch(); else a.say(st.taps >= 3 ? '!' : '?', 500); }
      else { moodT = 1.2; a.say('heart', 900); a.oy = 0; }
    },
    destroy() { if (card) card.remove(); }
  };
});

/* <piix-avatar seed="…">: the same creatures, inline like an image, from any word */
class PiixAvatarElement extends PiixSpriteElement {
  static get observedAttributes() { return ['seed', 'size', 'scale', 'hue', 'render', 'depth']; }
  _figureName() {
    const seed = this.getAttribute('seed') || 'piixpal', name = 'seed:' + seed;
    if (!FIGURES[name]) defineFigure(name, hatchFigure(seed));
    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-hidden')) this.setAttribute('aria-label', FIGURES[name].petName);
    return name;
  }
}
define('piix-avatar', PiixAvatarElement);
ELEMENTS.avatar = 'piix-avatar';
