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

