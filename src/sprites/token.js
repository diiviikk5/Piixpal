/* TOKEN: a little gold token that spins. Every model wants it. Context is everything. */
(() => {
  /* a spinning coin: the same disc squashed to different widths */
  const coin = w => art.outline(art.paint(14, 14, (x, y) => art.ellipse(x, y, 7, 7, Math.max(.8, 5.8 * w), 5.8) ? (Math.abs(x + .5 - 7) < 5.8 * w - 1.6 ? 'y' : 'd') : null));
  const face = rows => art.compose(rows, [5, 6, ['ww']], [5, 7, ['ww']], [8, 6, ['ww']], [8, 7, ['ww']]);
  defineFigure('token', {
    w: 14, h: 14, fps: 7,
    tag: 'A little gold token that spins. Every model wants it. Context is everything.',
    palette: { k: '#17121f', y: '#ffd23f', d: '#e09a12', w: '#ffffff' },
    frames: [face(coin(1)), face(coin(1)), face(coin(1)), coin(.7), coin(.35), coin(.12), coin(.35), coin(.7)],
    eyes: [{ x: 5, y: 6, w: 2, h: 2 }, { x: 8, y: 6, w: 2, h: 2 }],
    lid: 'y'
  });
})();
