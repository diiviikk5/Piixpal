/* BRAIN (big): a very big brain, thinking very hard. Sparks race along its folds. */
(() => {
  const frame = f => art.volume(art.paint(24, 19, (x, y) => {
    const inL = art.ellipse(x, y, 8, 9, 7.6, 7.6), inR = art.ellipse(x, y, 16, 9, 7.6, 7.6);
    if (!inL && !inR && !(y >= 15 && y <= 17 && x >= 10 && x <= 13)) return null;
    if (x === 12 && y < 15) return 'd';                                                     /* the middle */
    /* wiggly folds, with a spark travelling along one of them */
    const fold = Math.sin(x * .9 + y * .35) + Math.sin(y * 1.1 - x * .3);
    if (Math.abs(fold) < .32) return ((x + y * 2 + f * 3) % 11) === 0 ? 'y' : 'd';
    return 'b';
  }));
  defineFigure('brain', {
    ...BIG, w: 24, h: 19, fps: 6, scale: 7,
    tag: 'A very big brain, thinking very hard. Sparks race along its folds.',
    palette: { b: '#ff9cc2', d: '#e26f9d', B: '#ffd1e3', y: '#fff36b', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.compose(frame(f), [5, 7, ['bbbb']], [5, 8, ['bbbb']], [5, 9, ['bbbb']], [15, 7, ['bbbb']], [15, 8, ['bbbb']], [15, 9, ['bbbb']], [11, 12, ['mm']])),
    eyes: [{ x: 5, y: 7, w: 4, h: 3 }, { x: 15, y: 7, w: 4, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
