/* MODEM: a dial-up modem. Its lights blink in a pattern only it understands. */
(() => {
  const body = art.outline(art.paint(18, 10, (x, y) => art.rrect(x, y, 1, 2, 16, 8, 1) ? (y <= 3 ? 'M' : 'm') : (y === 9 && (x === 3 || x === 14) ? 'm' : null)));
  const lights = pattern => [4, 7, 10, 13].reduce((r, x, i) => art.put(r, x, 7, [pattern[i] ? 'g' : 'd']), body);
  defineFigure('modem', {
    w: 18, h: 10, fps: 6,
    tag: 'A dial-up modem. Its lights blink in a pattern only it understands.',
    palette: { k: '#17121f', m: '#c9c3d6', M: '#ece8f3', g: '#c6f432', d: '#5c5470', w: '#ffffff' },
    frames: [[1, 0, 1, 0], [0, 1, 1, 0], [1, 1, 0, 1], [0, 0, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1]].map(lights),
    eyes: [{ x: 5, y: 4, w: 2, h: 2 }, { x: 11, y: 4, w: 2, h: 2 }],
    lid: 'm', pupilKey: 'k'
  });
})();
