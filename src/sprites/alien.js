/* ALIEN: a tiny visitor with three eyes and one antenna. Has questions about your CSS. */
(() => {
  const body = ant => art.outline(art.paint(14, 15, (x, y) => {
    if (x === 7 && y >= 1 && y <= 3) return 'g';
    if (art.ellipse(x, y, 7 + ant, 1, 1.3, 1.3)) return 'p';                               /* antenna bulb */
    if (art.ellipse(x, y, 7, 8, 5.8, 5.6)) return y < 6 && x < 6 ? 'G' : 'g';
    if (y >= 13 && (x === 4 || x === 9)) return 'g';
    return null;
  }));
  const face = rows => art.compose(rows, [3, 7, ['ww.ww.ww'.replace(/\./g, 'g')]], [3, 8, ['ww.ww.ww'.replace(/\./g, 'g')]], [6, 11, ['kk']]);
  defineFigure('alien', {
    w: 14, h: 15, fps: 2,
    tag: 'A tiny visitor with three eyes and one antenna. Has questions about your CSS.',
    palette: { k: '#17121f', g: '#7bd63a', G: '#c8f58a', p: '#ff7aa8', w: '#ffffff' },
    frames: [face(body(0)), face(body(1)), face(body(0)), face(body(-1))],
    eyes: [{ x: 3, y: 7, w: 2, h: 2 }, { x: 6, y: 7, w: 2, h: 2 }, { x: 9, y: 7, w: 2, h: 2 }],
    lid: 'g'
  });
})();
