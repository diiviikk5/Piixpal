/* MUMU (big): a round little bear who would like a snack, please. Ears wiggle. */
(() => {
  const frame = wig => art.volume(art.paint(22, 21, (x, y) => {
    const earY = 3 + (wig ? 1 : 0);
    if (art.ellipse(x, y, 4, earY, 3.4, 3.4)) return art.ellipse(x, y, 4, earY, 1.6, 1.6) ? 'p' : 'b';
    if (art.ellipse(x, y, 18, 3, 3.4, 3.4)) return art.ellipse(x, y, 18, 3, 1.6, 1.6) ? 'p' : 'b';
    if (art.ellipse(x, y, 11, 13, 4, 3)) return 's';
    if (art.ellipse(x, y, 11, 11, 10.5, 9.4)) return 'b';
    return y >= 19 && ((x >= 4 && x <= 7) || (x >= 14 && x <= 17)) && 'b';
  }));
  const face = rows => art.compose(rows, [10, 11, ['kk']], [10, 13, ['_k']], [9, 14, ['k_k']]);
  defineFigure('mumu', {
    ...BIG, w: 22, h: 21, fps: .7,
    tag: 'A round little bear who would like a snack, please. Ears wiggle.',
    palette: { b: '#e0a46a', d: '#b87a42', B: '#f6d2ad', p: '#ff9cc2', s: '#fff1de', k: '#17121f' },
    frames: [face(frame(0)), face(frame(0)), face(frame(1))],
    eyes: [{ x: 5, y: 7, w: 3, h: 3 }, { x: 14, y: 7, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
