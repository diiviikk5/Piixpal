/* PROMPTY: a chat bubble who is always just about to reply. Thinking… thinking… */
(() => {
  const body = art.outline(art.paint(16, 13, (x, y) => {
    if (art.rrect(x, y, 1, 1, 14, 9, 3)) return 'b';
    if (y >= 10 && y <= 11 && x >= 3 && x <= 5 - (y - 10)) return 'b';                   /* the tail */
    return null;
  }));
  const dots = n => [4, 7, 10].reduce((r, x, i) => art.put(r, x, 7, [i < n ? 'kk' : 'BB']), body);
  defineFigure('prompty', {
    w: 16, h: 13, fps: 3,
    tag: 'A chat bubble who is always just about to reply. Thinking… thinking…',
    palette: { k: '#17121f', b: '#6b4cff', B: '#a995ff', w: '#ffffff' },
    frames: [0, 1, 2, 3].map(dots),
    eyes: [{ x: 4, y: 3, w: 3, h: 3 }, { x: 9, y: 3, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 },
    lid: 'b', pupilKey: 'w', glint: null
  });
})();
