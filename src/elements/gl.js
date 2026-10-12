/* GL: the GPU side of Piixpal. One shared WebGL canvas that every shader component borrows,
 * so a page can have dozens of them without running out of contexts (browsers allow about 16).
 * A component renders its shader at a low "pixel grid" resolution, then copies the result into
 * its own canvas, which the browser scales up crisp. That's the pixel look, and it's also why
 * these are cheap: a 1200 x 600 hero with 4 px pixels is only 300 x 150 shader pixels.
 *
 * Every shader gets the same toolkit: noise, fbm, an 8x8 Bayer matrix, and a palette with
 * ordered dithering, so gradients fall into the theme's colours in that crunchy pixel way. */

const GL = { cv: null, gl: null, ok: null, lost: false, buf: null, progs: {}, tex: new WeakMap() };

/* the theme's palettes, dark to light. Shaders read them as up to six colours */
const GL_PALETTES = {
  lime: ['#0b0a10', '#1b3410', '#4f7d10', '#a8d81c', '#c6f432', '#f2ffd6'],
  aurora: ['#06050c', '#0d2b3a', '#127a74', '#25d6a0', '#9ef5cf', '#e4dcff'],
  sunset: ['#160925', '#4d1650', '#b0285e', '#ff5a6e', '#ff9b45', '#ffe08a'],
  ocean: ['#030b18', '#0a2c55', '#1d6fb0', '#58c8ff', '#bfeaff', '#ffffff'],
  candy: ['#1c0b2e', '#5b2bd6', '#c43bd8', '#ff6bb5', '#ffd23f', '#fffbe6'],
  violet: ['#0c0718', '#221048', '#4a2bb0', '#6b4cff', '#a996ff', '#ece6ff'],
  fire: ['#050202', '#5a0b0b', '#c22a10', '#ff6b1f', '#ffc23a', '#fff4c8'],
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  paper: ['#f3eee3', '#e2d9c6', '#a99d88', '#6c6477', '#17121f'],
  mono: ['#0b0a10', '#3b3448', '#8e869c', '#f3eee3']
};
const glPalette = name => {
  const list = GL_PALETTES[name] || (name && name.includes('#') ? name.split(',').map(s => s.trim()).filter(Boolean) : null) || GL_PALETTES.lime;
  const arr = new Float32Array(18);
  list.slice(0, 6).forEach((c, i) => { const [r, g, b] = hexRGBA(c); arr[i * 3] = r / 255; arr[i * 3 + 1] = g / 255; arr[i * 3 + 2] = b / 255; });
  return { arr, n: Math.min(6, list.length), list };
};

