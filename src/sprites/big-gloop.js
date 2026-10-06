/* GLOOP (big): a slow, happy blob that drips a little. Mostly harmless. */
(() => {
  const drips = [[3, 2], [4, 3], [9, 1], [10, 2], [15, 3], [16, 2], [17, 1]];
  const frame = f => art.volume(art.paint(22, 21, (x, y) => {
    if (y < 11) return art.ellipse(x, y, 11, 10, 10.5, 9.5) && 'b';
    if (y < 16) return x >= 1 && x <= 20 && 'b';
    const d = drips.find(([dx]) => dx === x);
    return d && y < 16 + ((d[1] + f) % 4) + 1 && 'b';
  }));
  defineFigure('gloop', {
    ...BIG, w: 22, h: 21, fps: 2.5,
    tag: 'A slow, happy blob that drips a little. Mostly harmless.',
    palette: { b: '#ff6b4a', d: '#c94a2e', B: '#ffb39f', k: '#17121f', m: '#17121f' },
    frames: [0, 1, 2, 3].map(f => art.put(frame(f), 10, 13, ['mm'])),
    eyes: [{ x: 5, y: 7, w: 5, h: 5 }, { x: 12, y: 7, w: 5, h: 5 }],
    pupil: { w: 3, h: 4 }
  });
})();
