/* FLICK (big): a little flame with big feelings. Never, ever stands still. */
(() => {
  const frame = f => {
    const sway = [-1, 0, 1, 0][f], tip = [0, 1, 0, 2][f];
    return art.volume(art.paint(18, 24, (x, y) => {
      if (y < tip) return null;
      /* a teardrop: narrow swaying tip on a round base */
      const k = clamp((y - tip) / 14, 0, 1);
      const cx = 9 + sway * (1 - k) * 2, half = 1 + k * 7;
      const inBody = y < 15 ? Math.abs(x + .5 - cx) <= half : art.ellipse(x, y, 9, 16, 8.2, 7.6);
      if (!inBody) return null;
      const core = y > 9 && art.ellipse(x, y, 9, 18, 4.2, 6.5 - (f % 2));
      return core ? 'c' : 'b';
    }));
  };
  defineFigure('flick', {
    ...BIG, w: 18, h: 24, fps: 7,
    tag: 'A little flame with big feelings. Never, ever stands still.',
    palette: { b: '#ff8a2a', d: '#e2561a', B: '#ffc06b', c: '#ffe066', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.put(frame(f), 8, 19, ['mm'])),
    eyes: [{ x: 4, y: 14, w: 3, h: 4 }, { x: 11, y: 14, w: 3, h: 4 }],
    pupil: { w: 2, h: 3 },
    lid: 'c',
    recolor: { b: 0, d: -.2, B: .35 }
  });
})();
