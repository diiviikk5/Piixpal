/* LLAMA (big): a fluffy llama with a long neck and a calm, knowing look. */
(() => {
  const frame = ear => art.volume(art.paint(20, 26, (x, y) => {
    if ((x === 9 || x === 10 + ear) && y >= 0 && y <= 2) return 'b';                          /* ears */
    if ((x === 14 || x === 15 - ear) && y >= 0 && y <= 2) return 'b';
    if (art.rrect(x, y, 8, 2, 17, 9, 3)) return x >= 15 && y >= 6 ? 'c' : 'b';              /* head + muzzle */
    if (art.rrect(x, y, 9, 8, 14, 17, 2)) return 'b';                                         /* neck */
    if (art.ellipse(x, y, 9, 19, 8.6, 4.4)) return (x + y) % 3 === 0 ? 'B' : 'b';             /* fluffy body */
    if (y >= 23 && [3, 6, 12, 15].includes(x)) return 'd';                                    /* legs */
    return null;
  }));
  defineFigure('llama', {
    ...BIG, w: 20, h: 26, fps: 1.2, scale: 7,
    tag: 'A fluffy llama with a long neck and a calm, knowing look.',
    palette: { b: '#f3ead8', d: '#c9b896', B: '#ffffff', c: '#e8dcc2', k: '#17121f', m: '#17121f' },
    frames: [0, 0, 1, 0].map(e => art.put(frame(e), 16, 7, ['m'])),
    eyes: [{ x: 11, y: 4, w: 2, h: 2 }, { x: 14, y: 4, w: 2, h: 2 }],
    pupil: { w: 1, h: 2 }
  });
})();
