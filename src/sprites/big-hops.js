/* HOPS (big): long ears, short attention span. One ear never quite stays up. */
(() => {
  const frame = flop => art.volume(art.paint(20, 25, (x, y) => {
    /* left ear stands, right ear flops over in the second frame */
    if (art.rrect(x, y, 3, 0, 7, 11, 2)) return x >= 4 && x <= 6 && y >= 2 && y <= 9 ? 'p' : 'b';
    if (!flop && art.rrect(x, y, 12, 0, 16, 11, 2)) return x >= 13 && x <= 15 && y >= 2 && y <= 9 ? 'p' : 'b';
    if (flop && art.rrect(x, y, 13, 3, 19, 7, 2)) return 'b';
    if (flop && art.rrect(x, y, 12, 5, 16, 11, 2)) return 'b';
    return art.ellipse(x, y, 10, 17, 9.6, 8) && 'b';
  }));
  const face = rows => art.compose(rows, [9, 19, ['pp']], [8, 21, ['m..m'.replace(/\./g, '_')]], [9, 22, ['mm']]);
  defineFigure('hops', {
    ...BIG, w: 20, h: 25, fps: .8,
    tag: 'Long ears, short attention span. One ear never quite stays up.',
    palette: { b: '#b9a4ff', d: '#8d74e6', B: '#e4dbff', p: '#ff9cc2', k: '#17121f', m: '#17121f' },
    frames: [face(frame(false)), face(frame(false)), face(frame(true))],
    eyes: [{ x: 4, y: 14, w: 4, h: 4 }, { x: 12, y: 14, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();
