/* HEART: a like button with feelings. Beats. Gets a little bigger when you hover nearby. */
(() => {
  const heart = (big) => art.outline(art.paint(15, 13, (x, y) => {
    const s = big ? 1 : .9, cx = 7.5, cy = 7;
    const X = (x + .5 - cx) / (5.9 * s), Y = -(y + .5 - cy) / (5.4 * s);
    /* the classic implicit heart curve */
    const v = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y * 1.4;
    return v <= 0 ? ((x < 6 && y < 5) ? 'H' : 'r') : null;
  }));
  defineFigure('heart', {
    w: 15, h: 13, fps: 2.5,
    tag: 'A like button with feelings. Beats steadily, blushes easily.',
    palette: { k: '#17121f', r: '#ff4d6d', H: '#ffb3c0', w: '#ffffff' },
    frames: [heart(true), heart(false), heart(true), heart(true)].map(rows => art.compose(rows, [4, 6, ['ww']], [4, 7, ['ww']], [9, 6, ['ww']], [9, 7, ['ww']])),
    eyes: [{ x: 4, y: 6, w: 2, h: 2 }, { x: 9, y: 6, w: 2, h: 2 }],
    lid: 'r'
  });
})();
