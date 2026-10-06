/* CRT (big): a beige monitor from the old internet. Its face glows on the screen. */
(() => {
  const frame = scan => art.volume(art.paint(22, 22, (x, y) => {
    if (y >= 18) return (y === 18 && x >= 8 && x <= 13) || (y >= 19 && x >= 5 && x <= 16) ? 'b' : null;   /* stand */
    if (!art.rrect(x, y, 1, 0, 20, 17, 2)) return null;
    if (art.rrect(x, y, 4, 3, 17, 13, 2)) return y === 3 + scan ? 'S' : 's';                              /* screen + scanline */
    if (y === 15 && x >= 15 && x <= 17) return x === 17 ? 'g' : 'd';                                      /* power light */
    return 'b';
  }), 'b', 'd', 'B');
  defineFigure('crt', {
    ...BIG, w: 22, h: 22, fps: 5, scale: 7,
    tag: 'A beige monitor from the old internet. Its face glows on the screen.',
    palette: { b: '#e8dcc2', d: '#bfb08f', B: '#fff7e6', s: '#1a2a24', S: '#24453a', g: '#c6f432', k: '#17121f' },
    frames: Array.from({ length: 10 }, (_, i) => art.put(frame(i), 9, 11, ['gggg'])),
    eyes: [{ x: 6, y: 5, w: 4, h: 4 }, { x: 12, y: 5, w: 4, h: 4 }],
    pupil: { w: 2, h: 3 }, pupilKey: 'g', glint: '#ffffff', lid: 's'
  });
})();
