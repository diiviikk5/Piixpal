/* SPUD (big): a lumpy potato with a tiny sprout and a lot of potential. */
(() => {
  const lump = (x, y) => ((x * 7 + y * 13) % 11) < 2;
  const body = art.volume(art.paint(20, 20, (x, y) => {
    if (y < 3) return null;
    const inside = art.ellipse(x, y, 10, 12, 9.6, 7.6);
    const edge = inside && !art.ellipse(x, y, 10, 12, 8.6, 6.6);
    if (!inside || (edge && lump(x, y))) return null;
    return ((x * 5 + y * 3) % 17 === 0) ? 's' : 'b';
  }));
  const sprout = [
    ['..gg..gg..', '.gGg..gGg.', '..ggggg...', '....g.....'],
    ['.gg....gg.', 'gGg...gGg.', '.gggggg...', '....g.....']
  ];
  defineFigure('spud', {
    ...BIG, w: 20, h: 20, fps: 1.2,
    tag: 'A lumpy potato with a tiny sprout and a lot of potential.',
    palette: { b: '#d9a066', d: '#a9733f', B: '#f2cc9c', s: '#8a5a2e', g: '#4fc46a', G: '#9be57a', k: '#17121f', m: '#17121f' },
    frames: sprout.map(sp => art.compose(body, [5, 0, sp], [9, 15, ['mm']])),
    eyes: [{ x: 5, y: 9, w: 3, h: 4 }, { x: 12, y: 9, w: 3, h: 4 }],
    pupil: { w: 2, h: 3 }
  });
})();
