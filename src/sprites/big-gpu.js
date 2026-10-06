/* GPU (big): a graphics card whose two fans are its eyes. RGB strip included, obviously. */
(() => {
  const frame = f => art.volume(art.paint(26, 17, (x, y) => {
    if (x <= 1 && y >= 2 && y <= 15) return 'm';                                          /* the bracket */
    if (y >= 15 && x >= 6 && x <= 20) return x % 2 ? 'g' : null;                          /* gold contacts */
    if (!art.rrect(x, y, 2, 2, 25, 14, 2)) return null;
    if (y === 3 && x >= 4 && x <= 23) return 'rGu'[(x + f) % 3];                             /* RGB strip */
    for (const cx of [9, 18]) {
      if (art.ellipse(x, y, cx, 9, 4.2, 4.2)) {
        if (art.ellipse(x, y, cx, 9, 1.6, 1.6)) return 'h';
        const a = Math.atan2(y + .5 - 9, x + .5 - cx);
        return Math.floor((a / Math.PI * 3 + 6 + f * .5)) % 2 ? 'F' : 'f';                /* spinning blades */
      }
    }
    return 'b';
  }));
  defineFigure('gpu', {
    ...BIG, w: 26, h: 17, fps: 8, scale: 7,
    tag: 'A graphics card whose two fans are its eyes. RGB strip included, obviously.',
    palette: { b: '#3b3550', d: '#25213a', B: '#5c5470', m: '#9aa3b5', g: '#ffd23f', f: '#2d2838', F: '#6e6585', h: '#c9c3d6',
      r: '#ff4d6d', G: '#c6f432', u: '#58c8ff', k: '#17121f' },
    frames: [0, 1, 2].map(frame),
    eyes: [{ x: 8, y: 8, w: 2, h: 2 }, { x: 17, y: 8, w: 2, h: 2 }],
    pupil: { w: 1, h: 1 }, glint: null, lid: 'h'
  });
})();
