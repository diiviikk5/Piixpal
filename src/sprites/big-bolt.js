/* BOLT (big): a chunky robot whose face is a little screen. Its eyes glow. */
(() => {
  const frame = light => art.volume(art.paint(20, 22, (x, y) => {
    if (y <= 2 && x >= 9 && x <= 10) return y === 0 || (y === 1 && light) ? 'a' : 'm';
    if (y === 3 && x >= 8 && x <= 11) return 'm';
    if ((x <= 1 || x >= 18) && y >= 9 && y <= 12) return 'm';            /* ear bolts */
    if (art.rrect(x, y, 2, 4, 17, 19, 3)) {
      if (art.rrect(x, y, 4, 7, 15, 15, 2)) return 's';                   /* the screen */
      return 'b';
    }
    if (y >= 20 && ((x >= 5 && x <= 7) || (x >= 12 && x <= 14))) return 'm';
    return null;
  }), 'b', 'd', 'B');
  const face = rows => art.put(rows, 7, 13, ['gggggg'.slice(0, 6)]);
  defineFigure('bolt', {
    ...BIG, w: 20, h: 22, fps: 1.6,
    tag: 'A chunky robot whose face is a little screen. Its eyes glow.',
    palette: { b: '#b8c4e0', d: '#8590b0', B: '#eef2ff', m: '#5c5470', s: '#17121f', a: '#ff4d6d', g: '#c6f432', k: '#17121f' },
    frames: [face(frame(true)), face(frame(false))],
    eyes: [{ x: 5, y: 8, w: 4, h: 4 }, { x: 11, y: 8, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 },
    pupilKey: 'g',
    glint: '#ffffff',
    lid: 's'
  });
})();
