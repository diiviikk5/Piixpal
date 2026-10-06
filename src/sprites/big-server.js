/* SERVER (big): a server rack keeping your site alive. Its drive lights never stop. */
(() => {
  const BAYS = [9, 13, 17];
  const frame = f => art.volume(art.paint(16, 24, (x, y) => {
    if (!art.rrect(x, y, 1, 0, 14, 21, 2)) return (y >= 22 && (x === 3 || x === 12)) ? 'd' : null;
    for (const by of BAYS) if (y >= by && y <= by + 2 && x >= 3 && x <= 12) {
      if (y === by + 1 && x === 11) return ((f + by) % 3) ? 'g' : 'o';                     /* blinking LEDs */
      if (y === by + 1 && x >= 4 && x <= 8) return 'v';                                     /* vents */
      return 's';
    }
    return 'b';
  }));
  defineFigure('server', {
    ...BIG, w: 16, h: 24, fps: 5, scale: 7,
    tag: 'A server rack keeping your site alive. Its drive lights never stop.',
    palette: { b: '#c9d3ea', d: '#8f9bb8', B: '#eef2ff', s: '#2d2838', v: '#5c5470', g: '#c6f432', o: '#ff7a2f', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2].map(f => art.put(frame(f), 7, 6, ['mm'])),
    eyes: [{ x: 3, y: 2, w: 4, h: 3 }, { x: 9, y: 2, w: 4, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
