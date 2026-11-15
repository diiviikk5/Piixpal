/* DAISY: a round capybara in a cosy blue sweater, with a crown of daisies. Very soft.
 * Job: sits on top of your element and is content. Blinks slowly, sways a little, dozes.
 * Bring your cursor close and she blushes; poke her and she beams and a petal floats off. */
(() => {
  const W = 32, H = 29;
  const EYES = {
    open: ['.kk.', 'kkwk', 'kkkk', '.kk.'],
    look: ['.kk.', 'kwkk', 'kkkk', '.kk.'],
    blink: ['____', '____', 'kkkk', '____'],
    shut: ['____', '____', '.kk.', 'k__k'],
    happy: ['____', '.kk.', 'k__k', '____'],
    wide: ['.kk.', 'kwwk', 'kwwk', '.kk.']
  };
  const DAISY = ['.ewe.', 'ewwwe', 'wwyww', 'ewwwe', '.ewe.'].map(s => s.replace(/\./g, '_'));
  const BUD = ['_w_', 'wyw', '_w_'];
  /* one capybara, in a mood: eyes, cheeks, arms (down | up), sway (-1, 0, 1) */
  const capy = ({ eyes = 'open', blush = false, arms = 'down', mouth = 'smile', petals = 3 } = {}) => {
    let rows = art.paint(W, H, (x, y) => {
      const fur = art.ellipse(x, y, 16, 16.6, 13.2, 11.2);
      /* arms in sleeves: a dark rim, the sleeve, then a paw */
      const ay = arms === 'up' ? 15.6 : 20.6, ax = arms === 'up' ? 3.4 : 7.4, lean = arms === 'up' ? -.75 : .35;
      for (const [cx, sg] of [[ax, 1], [W - ax, -1]]) {
        const dx = x + .5 - cx, dy = y + .5 - ay, u = dx * Math.cos(lean * sg) + dy * Math.sin(lean * sg), v = -dx * Math.sin(lean * sg) + dy * Math.cos(lean * sg);
        const inE = (rx, ry) => (u / rx) ** 2 + (v / ry) ** 2 <= 1;
        const px = cx + sg * (arms === 'up' ? -1.4 : 2.2), py = ay + (arms === 'up' ? -3.2 : 1.6);
        if (art.ellipse(x, y, px, py, 1.7, 1.5)) return art.ellipse(x, y, px, py, 1.0, .9) ? 'b' : 'd';
        if (inE(2.3, 3.6)) return 'S';
        if (inE(3.2, 4.4)) return 'T';
      }
      if (fur) {
        if (y >= 17 && y <= 24) return y === 17 || y >= 23 ? 'T' : (x <= 4 || x >= 27 ? 'T' : 'S');   /* the sweater */
        return 'b';
      }
      if (art.ellipse(x, y, 6, 6, 2.8, 2.7) || art.ellipse(x, y, 26, 6, 2.8, 2.7)) return art.ellipse(x, y, 6.1, 6.1, 1.4, 1.4) || art.ellipse(x, y, 25.9, 6.1, 1.4, 1.4) ? 'd' : 'b';   /* ears */
      if (art.ellipse(x, y, 10, 27.4, 3, 1.6) || art.ellipse(x, y, 22, 27.4, 3, 1.6)) return 'b';      /* feet */
      return null;
    });
    rows = art.volume(rows, 'b', 'd', 'B');
    /* snout: a soft lighter muzzle with a brown rim */
    rows = rows.map((r, y) => [...r].map((c, x) => {
      if (c !== 'b' && c !== 'B' && c !== 'd') return c;
      if (art.rrect(x, y, 12, 10, 19, 16, 2.4)) return art.rrect(x, y, 13, 11, 18, 15, 1.6) ? 'l' : 'd';
      return c;
    }).join(''));
    rows = art.outline(rows);
    /* feet toes */
    rows = art.compose(rows, [9, 28, ['d.d']], [21, 28, ['d.d']]);
    /* face */
    const e = EYES[eyes];
    rows = art.compose(rows, [6, 10, e], [22, 10, e],
      [14, 12, ['nnnn', '.nn.']],
      [15, 14, ['n']],
      mouth === 'open' ? [14, 15, ['.pp.']] : [14, 15, ['n..n']]);
    if (eyes === 'look') rows = art.compose(rows, [22, 10, ['.kk.', 'kwkk', 'kkkk', '.kk.']]);
    rows = art.compose(rows, blush ? [4, 14, ['ppp', '.p.']] : [5, 14, ['pp']], blush ? [25, 14, ['ppp', '.p.']] : [25, 14, ['pp']]);
    /* a heart knitted on the sweater */
    rows = art.put(rows, 15, 19, ['r_r', 'rrr', '_r_']);
    /* the crown: three daisies and a few leaves */
    rows = art.compose(rows, [9, 5, ['gg']], [21, 5, ['gg']], [13, 5, ['g']], [18, 5, ['g']]);
    rows = art.compose(rows, [9, 3, BUD], [20, 3, BUD]);
    for (const [x, y] of [[10, 1], [16, 0], [22, 1]].slice(0, petals)) rows = art.put(rows, x - 2, y, DAISY);
    return rows;
  };
  const sway = (rows, n) => n ? art.shift(rows, n).map(r => n > 0 ? r : r + '.'.repeat(-n)) : rows;

  defineSprite('daisy', {
    w: W + 1, h: H, scale: 3, does: 'cozy',
    palette: {
      k: '#4a2a1c', n: '#3b2118', b: '#e9b884', B: '#f6d3a6', d: '#c48c5c', l: '#f8dcb6',
      S: '#2f4fe0', T: '#1f35a8', p: '#ff9aa8', r: '#ff5c8a', w: '#ffffff', e: '#d9d2e6', y: '#ffd23f', g: '#5cbf5a'
    },
    frames: {
      idle: [capy(), capy(), capy(), capy(), capy({ eyes: 'blink' }), capy()],
      sway: [sway(capy(), 0), sway(capy({ eyes: 'happy' }), 1), sway(capy(), 0), sway(capy({ eyes: 'happy' }), -1)],
      look: [capy({ eyes: 'look' })],
      blush: [capy({ eyes: 'happy', blush: true }), capy({ eyes: 'happy', blush: true, mouth: 'open' })],
      happy: [capy({ eyes: 'happy', blush: true, arms: 'up', mouth: 'open' }), capy({ eyes: 'happy', blush: true })],
      sleep: [capy({ eyes: 'shut' }), sway(capy({ eyes: 'shut' }), 1)],
      scared: [capy({ eyes: 'wide', arms: 'up' })],
      hop: [capy({ eyes: 'happy', arms: 'up' })]
    },
    fps: { idle: 2, sway: 2, blush: 3, happy: 4, sleep: .8, look: 1 }
  });
})();
