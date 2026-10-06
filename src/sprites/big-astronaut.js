/* ASTRONAUT (big): a tiny astronaut floating in place. Eyes glow behind the visor. */
(() => {
  const frame = blink => art.volume(art.paint(20, 24, (x, y) => {
    if (art.ellipse(x, y, 10, 7, 7.6, 7)) {
      if (art.rrect(x, y, 5, 4, 15, 10, 3)) return 'v';                                         /* visor */
      return 'b';                                                                                /* helmet */
    }
    if (art.rrect(x, y, 2, 11, 6, 17, 1) && y >= 12) return 'p';                                 /* backpack */
    if (art.rrect(x, y, 4, 12, 16, 20, 3)) return y === 15 && x >= 8 && x <= 12 ? (blink && x % 2 ? 'r' : 'g') : 'b';   /* suit + chest panel */
    if (y >= 21 && ((x >= 6 && x <= 8) || (x >= 12 && x <= 14))) return 'b';                     /* boots */
    if (y >= 13 && y <= 17 && (x === 17 || x === 18)) return 'b';                                /* arm */
    return null;
  }));
  defineFigure('astronaut', {
    ...BIG, w: 20, h: 24, fps: 2, scale: 7,
    tag: 'A tiny astronaut floating in place. Eyes glow behind the visor.',
    palette: { b: '#f3f0fa', d: '#b7b0c4', B: '#ffffff', v: '#1a1f3a', p: '#c9c3d6', g: '#c6f432', r: '#ff4d6d', k: '#58c8ff' },
    frames: [frame(0), frame(1)],
    eyes: [{ x: 7, y: 6, w: 2, h: 3 }, { x: 11, y: 6, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }, pupilKey: 'k', glint: '#ffffff', lid: 'v'
  });
})();
