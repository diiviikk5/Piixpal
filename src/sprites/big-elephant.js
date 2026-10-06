/* ELEPHANT (big): a baby elephant with big ears and a trunk that never sits still. */
(() => {
  const frame = sw => art.volume(art.paint(24, 20, (x, y) => {
    if (art.ellipse(x, y, 4.5, 7, 4.2, 5.2) || art.ellipse(x, y, 19.5, 7, 4.2, 5.2)) return art.ellipse(x, y, 4.8, 7, 2.4, 3.4) || art.ellipse(x, y, 19.2, 7, 2.4, 3.4) ? 'p' : 'b';  /* ears */
    if (art.ellipse(x, y, 12, 8, 7, 6.4)) return 'b';                                             /* head */
    const tx = 12 + Math.round(Math.sin(y * .5 + sw) * 1.2);                                       /* swinging trunk */
    if (y >= 13 && y <= 18 && x >= tx - 1 && x <= tx + 1 - (y > 16 ? 1 : 0)) return 'b';
    if (y >= 15 && y <= 19 && ((x >= 6 && x <= 8) || (x >= 15 && x <= 17))) return 'd';           /* front feet */
    return null;
  }));
  defineFigure('elephant', {
    ...BIG, w: 24, h: 20, fps: 3, scale: 7,
    tag: 'A baby elephant with big ears and a trunk that never sits still.',
    palette: { b: '#a7a0c4', d: '#7d75a0', B: '#d3cee6', p: '#ffb3c7', k: '#17121f' },
    frames: [0, 1.4, 2.8, 1.4].map(frame),
    eyes: [{ x: 8, y: 6, w: 2, h: 3 }, { x: 14, y: 6, w: 2, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
