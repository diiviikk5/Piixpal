/* BATTERY: a battery that is always charging and always at 1%. Brave. */
(() => {
  const shell = art.outline(art.paint(18, 11, (x, y) => art.rrect(x, y, 1, 1, 14, 9, 1) ? 'w' : (x >= 15 && x <= 16 && y >= 4 && y <= 6 ? 'm' : null)));
  const level = n => {
    let r = shell;
    for (let i = 0; i < n; i++) r = art.compose(r, [3 + i * 3, 7, ['gg']], [3 + i * 3, 8, ['gg']]);   /* charge bars along the bottom */
    return r;
  };
  const face = rows => art.compose(rows, [5, 3, ['ww']], [5, 4, ['ww']], [9, 3, ['ww']], [9, 4, ['ww']], [7, 5, ['kk']]);
  defineFigure('battery', {
    w: 18, h: 11, fps: 3,
    tag: 'A battery that is always charging and always at one percent. Brave.',
    palette: { k: '#17121f', w: '#f3f0fa', m: '#9aa3b5', g: '#7bd63a' },
    frames: [0, 1, 2, 3, 4, 0].map(n => face(level(n))),
    eyes: [{ x: 5, y: 3, w: 2, h: 2 }, { x: 9, y: 3, w: 2, h: 2 }],
    lid: 'w'
  });
})();
