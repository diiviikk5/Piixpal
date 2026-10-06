/* KEYCAP (big): a chunky mechanical keycap. Thocky. Click it for a satisfying press. */
(() => {
  const body = art.volume(art.paint(18, 16, (x, y) => {
    if (art.rrect(x, y, 3, 1, 14, 9, 2)) return 't';                          /* the dished top */
    if (art.rrect(x, y, 1, 3, 16, 14, 2)) return 'b';                         /* the skirt */
    return null;
  }), 'b', 'd', 'B');
  defineFigure('keycap', {
    ...BIG, w: 18, h: 16, scale: 8,
    tag: 'A chunky mechanical keycap. Thocky. Click it for a satisfying press.',
    palette: { b: '#c6f432', d: '#8fb81a', B: '#ecffb0', t: '#dcff6e', k: '#17121f', m: '#17121f' },
    frames: [art.put(body, 8, 7, ['mm'])],
    eyes: [{ x: 5, y: 3, w: 3, h: 3 }, { x: 10, y: 3, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 }, lid: 't',
    recolor: { b: 0, d: -.25, B: .5, t: .22 }
  });
})();
