/* TOFU (big): a block of tofu on two stubby legs, marching on the spot. Firm but fair. */
(() => {
  const frame = step => art.volume(art.paint(20, 20, (x, y) => {
    if (art.rrect(x, y, 1, 1, 18, 14, 3)) return 'b';
    const left = x >= 5 && x <= 6, right = x >= 13 && x <= 14;
    if ((left || right) && y >= 15) {
      const lift = (left && step === 1) || (right && step === 3) ? 1 : 0;
      return y <= 18 - lift && 'b';
    }
  }));
  const face = rows => art.compose(rows, [3, 10, ['p']], [16, 10, ['p']], [9, 10, ['mm']]);
  defineFigure('tofu', {
    ...BIG, w: 20, h: 20, fps: 4,
    tag: 'A block of tofu on two stubby legs, marching on the spot. Firm but fair.',
    palette: { b: '#c6f432', d: '#93c01a', B: '#ecffb0', p: '#ff9cc2', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(s => face(frame(s))),
    eyes: [{ x: 4, y: 5, w: 4, h: 4 }, { x: 12, y: 5, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();
