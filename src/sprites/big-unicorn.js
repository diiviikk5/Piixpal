/* UNICORN (big): the startup kind. A golden horn, a rainbow mane, a billion-dollar smile. */
(() => {
  const RAINBOW = 'roygbv';
  const frame = f => art.volume(art.paint(22, 22, (x, y) => {
    if (y <= 4 && x >= 13 && x <= 15 && Math.abs(x - 14) <= (y + 1) / 3) return 'h';             /* horn */
    if (art.ellipse(x, y, 14, 9, 5.6, 4.8)) return 'b';                                          /* head */
    if (x >= 7 && x <= 10 && y >= 3 && y <= 14 && y - 3 <= (x - 6) * 3) return RAINBOW[(y + f) % 6];   /* mane */
    if (art.ellipse(x, y, 10, 15, 7.6, 4.4)) return 'b';                                         /* body */
    if (y >= 18 && [5, 8, 12, 15].includes(x)) return 'd';                                       /* legs */
    if (x <= 2 && y >= 12 && y <= 16) return RAINBOW[(y + f + 2) % 6];                           /* tail */
    return null;
  }));
  defineFigure('unicorn', {
    ...BIG, w: 22, h: 22, fps: 4, scale: 7,
    tag: 'The startup kind. A golden horn, a rainbow mane, a billion-dollar smile.',
    palette: { b: '#f6f0ff', d: '#cbbfe6', B: '#ffffff', h: '#ffd23f', r: '#ff4d6d', o: '#ff9a2f', y: '#ffd23f', g: '#7bd63a', v: '#6b4cff', k: '#17121f', m: '#17121f', p: '#ffb3c7' },
    frames: [0, 1, 2, 3, 4, 5].map(f => art.compose(frame(f), [17, 11, ['m']], [18, 10, ['p']])),
    eyes: [{ x: 13, y: 7, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
