/* Tiny glyphs for speech bubbles. Drawn, not typed: no fonts are loaded. */
const ICON_PAL = { k: '#1b1226', r: '#ff4d6d', b: '#3fc8ff', y: '#ffc93f', g: '#7bd63a' };
const ICONS = {
  '!': ['kk', 'kk', 'kk', 'kk', '..', 'kk'],
  '?': ['.kkkk.', 'kk..kk', '....kk', '..kkk.', '......', '..kk..'],
  '!?': ['kk..kkkk.', 'kk.kk..kk', 'kk....kk.', 'kk...kk..', '.........', 'kk...kk..'],
  '...': ['kk.kk.kk', 'kk.kk.kk'],
  heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  zz: ['kkkk.....', '..k......', '.k..kkk..', 'kkkk..k..', '.....k...', '....kkk..'],
  grr: ['.k.k..kkk..k', 'kkkkk.k.k..k', '.k.k..k.kk.k', 'kkkkk.k.....', '.k.k..kkk..k'],
  note: ['...kkk', '...k.k', '...k..', '.kkk..', 'kkkk..', '.kk...'],
  sweat: ['..b..', '.bbb.', 'bbbbb', 'bbbbb', '.bbb.'],
  star: ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '.yy.yy.', 'y.....y'],
  vein: ['.r...r.', 'rr...rr', '.......', 'rr...rr', '.r...r.'],
  hi: ['k..k.kk', 'k..k...', 'kkkk.kk', 'k..k.kk', 'k..k.kk'],
  eep: ['kkk.kkk.kkk.', 'k...k...k.k.', 'kk..kk..kkk.', 'k...k...k...', 'kkk.kkk.k...'],
  leaf: ['....gg', '..gggg', '.gggg.', 'gggg..', 'g.....']
};
const iconCache = {};
const iconPal = Object.fromEntries(Object.entries(ICON_PAL).map(([k, v]) => [k, hexRGBA(v)]));
const bakeIcon = name => {
  if (!iconCache[name]) {
    const rows = ICONS[name];
    const w = Math.max(...rows.map(r => r.length));
    iconCache[name] = bake(rows, iconPal, w, rows.length);
  }
  /* a fresh copy each time: a canvas can only live in one bubble */
  const src = iconCache[name], c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
};
Piixpal.icons = ICONS;
