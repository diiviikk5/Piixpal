/* INKY (big): a small squid with five wiggly arms and one very big question. */
(() => {
  const arms = [2, 6, 10, 14, 18];
  const frame = f => art.volume(art.paint(22, 22, (x, y) => {
    if (y < 11) return art.ellipse(x, y, 11, 9, 9.6, 8.6) && 'b';
    if (y < 14) return x >= 2 && x <= 19 && 'b';
    /* arms sway: every other arm leans the other way */
    for (let i = 0; i < arms.length; i++) {
      const lean = (i + f) % 2 ? 1 : -1, off = y > 17 ? lean : 0;
      if (x >= arms[i] + off && x <= arms[i] + 1 + off && y <= 20 - (i % 2)) return 'b';
    }
  }));
  defineFigure('inky', {
    ...BIG, w: 22, h: 22, fps: 3,
    tag: 'A small squid with five wiggly arms and one very big question.',
    palette: { b: '#6b4cff', d: '#4a2fd6', B: '#a995ff', k: '#17121f', m: '#17121f', w: '#ffffff' },
    frames: [0, 1].map(f => art.put(frame(f), 10, 12, ['mm'])),
    eyes: [{ x: 5, y: 6, w: 5, h: 5 }, { x: 12, y: 6, w: 5, h: 5 }],
    pupil: { w: 3, h: 3 },
    pupilKey: 'w',
    glint: '#17121f'
  });
})();
