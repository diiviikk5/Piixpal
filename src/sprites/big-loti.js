/* LOTI (big): an axolotl with feathery gills that never stop waving. Blows bubbles. */
(() => {
  /* the left gills, hand-placed: three fronds, each in two poses (g = stalk, G = feathery tip) */
  const GILLS = [
    [{ g: [[4, 6], [4, 5], [3, 5], [3, 4], [2, 4], [2, 3]], G: [[1, 2], [1, 3], [2, 2], [0, 2]] },
     { g: [[4, 6], [3, 6], [3, 5], [2, 5], [2, 4], [1, 4]], G: [[0, 3], [0, 4], [1, 3], [0, 5]] }],
    [{ g: [[3, 10], [2, 10], [2, 9], [1, 9]], G: [[0, 8], [1, 8], [0, 9], [0, 7]] },
     { g: [[3, 10], [2, 10], [1, 10], [1, 11]], G: [[0, 10], [0, 11], [0, 12], [1, 12]] }],
    [{ g: [[4, 14], [3, 14], [3, 15], [2, 15], [2, 16]], G: [[1, 16], [1, 17], [2, 17], [1, 18]] },
     { g: [[4, 14], [3, 14], [3, 15], [2, 15], [1, 15]], G: [[0, 15], [0, 16], [1, 16], [0, 14]] }]
  ];
  const frame = f => {
    let rows = art.volume(art.paint(22, 22, (x, y) => {
      /* a wide, flat head, the way axolotls are */
      if (art.ellipse(x, y, 11, 10, 8.2, 6.6)) return 'b';
      /* a small round body below, with a pale belly and stubby arms */
      if (art.ellipse(x, y, 11, 17.6, 5.4, 3.8)) return art.ellipse(x, y, 11, 18, 3.2, 2.5) ? 's' : 'b';
      if (y >= 17 && y <= 19 && (x === 5 || x === 16)) return 'b';
      /* the tail tip peeks out to one side, and sways */
      const tx = 18 + (f % 2), ty = 19 - (f === 2 ? 1 : 0);
      if (x > 15 && art.ellipse(x, y, tx, ty, 2.2, 1.3)) return 'b';
      return null;
    }));
    /* gills, both sides, waving in a ripple from top to bottom */
    GILLS.forEach((poses, i) => {
      const p = poses[(f + i) % 2];
      for (const side of [0, 1]) for (const k of ['g', 'G']) for (const [x, y] of p[k]) rows = art.put(rows, side ? 21 - x : x, y, [k]);
    });
    /* the face: a wide, gentle smile and blushing cheeks */
    rows = art.compose(rows, [8, 13, ['k']], [13, 13, ['k']], [9, 14, ['kkkk']], [5, 11, ['pp']], [15, 11, ['pp']]);
    /* bubbles rising past the head */
    for (const [bx, by] of [[19, 7 - f], [20, 4 - f], [18, 2 - (f % 2)]]) if (by >= 0) rows = art.put(rows, bx, by, ['w']);
    return rows;
  };
  defineFigure('loti', {
    ...BIG, w: 22, h: 22, fps: 4,
    tag: 'An axolotl with feathery gills that never stop waving. Blows bubbles.',
    palette: { b: '#ff9ec7', d: '#e06aa0', B: '#ffd3e7', s: '#fff0f6', g: '#d93a72', G: '#ff86b4', p: '#ff6f9e', k: '#17121f', w: '#bfeaff', m: '#17121f' },
    frames: [0, 1, 2, 3].map(frame),
    eyes: [{ x: 6, y: 8, w: 3, h: 3 }, { x: 13, y: 8, w: 3, h: 3 }],
    pupil: { w: 2, h: 2 }
  });
})();
