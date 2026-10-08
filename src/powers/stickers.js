/* STICKERS: a sheet of pixel stickers your visitors can peel off and slap anywhere on the
 * page. Drag one off the sheet, drop it on a heading, a photo, the footer; it stays there
 * (in that visitor's browser) the next time they come back. Drag a stuck sticker to move
 * it, double-click to peel it off.   @component stickers
 *
 *   <piix-stickers></piix-stickers>
 *   names="heart,star,bolt,mochi,ufo"   which stickers (built-ins, or any sprite's name)
 *   el.clear()                          peel every sticker off this page */

/* the built-in stickers: little pieces of pixel art (a = fill, b = shade, k = ink) */
const STICKER_ART = {
  heart: { pal: { a: '#ff4d6d', b: '#c92a4b', w: '#ffc4cf' }, rows: ['.kk...kk.', 'kawk.kaak', 'kwaakaaak', 'kaaaaaaak', '.kaaaaak.', '..kaabk..', '...kbk...', '....k....'] },
  star: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['....k....', '...kak...', '...kwk...', 'kkkkaakkk', 'kwaaaaabk', '.kaaaaak.', '..kaaabk.', '.kaakkabk', '.kbk..kbk', '.kk....kk'] },
  bolt: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['...kkkk', '..kwaak', '..kaak.', '.kaak..', 'kaaakkk', 'kkkaaak', '..kaak.', '.kaak..', '.kbk...', 'kk.....'] },
  smile: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['..kkkkk..', '.kwaaaak.', 'kwakaakak', 'kaakaakak', 'kaaaaaaak', 'kakaaakak', 'kaakkkaak', '.kbaaabk.', '..kkkkk..'] },
  crown: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#ff4d6d' }, rows: ['k...k...k', 'kk.kak.kk', 'kakaaakak', 'kaaaaaaak', 'kawaawaak', 'kbbbbbbbk', 'kkkkkkkkk'] },
  wow: { pal: { a: '#fffdf5', b: '#ff4d6d', w: '#e9e2d0' }, rows: ['.kkkkkkkk.', 'kaaaaaaaak', 'kabababbak', 'kabababbak', 'kaabbabbak', 'kaaaaaaaak', '.kkkkkkkk.', '...kk.....', '..kk......'] }
};

/* the pixels of a sticker as a canvas: a built-in, or any registered sprite's first frame */
const stickerArt = name => {
  if (STICKER_ART[name]) {
    const { pal, rows } = STICKER_ART[name], w = Math.max(...rows.map(r => r.length));
    const rgba = { k: hexRGBA('#17121f') };
    for (const k in pal) rgba[k] = hexRGBA(pal[k]);
    return bake(rows, rgba, w, rows.length);
  }
  if (FIGURES[name]) return bakeFigure(FIGURES[name], figurePalette(FIGURES[name]))[0];
  if (SPRITES[name]) { const f = baked(SPRITES[name]); return f[Object.keys(f)[0]][0]; }
  return null;
};

/* die-cut: the art scaled up (all about the same size), a thick white border following its outline, a soft grey edge */
const stickerCut = (src, s = Math.max(1, Math.round(28 / Math.max(src.width, src.height)))) => {
  const B = 3, w = src.width * s + B * 4, h = src.height * s + B * 4;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const stamp = (color, r) => {
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) tg.drawImage(src, B * 2 + dx, B * 2 + dy, src.width * s, src.height * s);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, w, h);
    g.drawImage(t, 0, 0);
  };
  stamp('#d9d4e3', B * 2); stamp('#ffffff', B * 2 - 1);
  g.drawImage(src, B * 2, B * 2, src.width * s, src.height * s);
  return c;
};

/* where a sticker is stuck: a path to the element under it, and where on that element */
const stickerPath = el => {
  const parts = [];
  for (let e = el; e && e !== document.body && e.parentElement; e = e.parentElement) {
    if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
    parts.unshift(`${e.tagName.toLowerCase()}:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`);
  }
  return parts.join('>');
};
const stickerFind = path => { try { return path ? document.querySelector(path.startsWith('#') ? path : 'body>' + path) : null; } catch (_) { return null; } };

