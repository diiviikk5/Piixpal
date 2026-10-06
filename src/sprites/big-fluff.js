/* FLUFF (big): a sheep made almost entirely of cloud. Trots in place, very proudly. */
(() => {
  const puffs = [[5, 6], [11, 4], [17, 6], [3, 11], [19, 11], [6, 15], [16, 15], [11, 16]];
  const frame = step => art.volume(art.paint(22, 22, (x, y) => {
    if (art.ellipse(x, y, 11, 11, 4.6, 5.2)) return 'F';
    if (puffs.some(([cx, cy]) => art.ellipse(x, y, cx, cy, 4.4, 4.4)) || art.ellipse(x, y, 11, 10, 8, 7)) return 'b';
    const legs = [6, 9, 13, 16];
    for (let i = 0; i < legs.length; i++) {
      const up = (i % 2) === step ? 1 : 0;
      if (x === legs[i] && y >= 18 && y <= 21 - up) return 'L';
    }
  }));
  defineFigure('fluff', {
    ...BIG, w: 22, h: 22, fps: 3,
    tag: 'A sheep made almost entirely of cloud. Trots in place, very proudly.',
    palette: { b: '#ff9ec4', d: '#e26f9d', B: '#ffd6e6', F: '#3b2a4f', L: '#3b2a4f', k: '#ffffff', w: '#ffffff' },
    frames: [0, 1].map(s => art.put(frame(s), 10, 13, ['pp'.replace(/p/g, 'B')])),
    eyes: [{ x: 7, y: 8, w: 3, h: 3 }, { x: 12, y: 8, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    lid: 'F',
    glint: null,
    recolor: { b: 0, d: -.2, B: .45 }
  });
})();
