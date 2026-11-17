/* HAD: a cool guy with a swept-back quiff, dark shades, a trim beard, a brown plaid shirt open
 * over a black tee, light baggy jeans and chunky sneakers. Default pose: arms crossed, leaning.
 * Job: hangs out on top of your element (behaviour: cozy). Bring the cursor close and he slides
 * his shades down to grin and wave; poke him and the shades flash. Ignore him and he naps. */
(() => {
  const W = 24, H = 34;
  /* plaid: brown with a dark check and a cream stripe */
  const P = (x, y) => x % 4 === 0 ? 'P' : (y % 3 === 0 ? 'c' : 'p');
  /* one Had: eyes (shades|down|blink|happy|shut|wide), mouth (smirk|grin|flat|o), arms (crossed|down|wave) */
  const had = ({ eyes = 'shades', mouth = 'smirk', arms = 'crossed', glint = false } = {}) => {
    let rows = art.paint(W, H, (x, y) => {
      /* hair: quiff swept up and back */
      const quiff = art.ellipse(x, y, 12.5, 3.6, 6.6, 3.2) || art.ellipse(x, y, 11.5, 5.6, 7.2, 3.4) || art.ellipse(x, y, 16, 2.6, 3.2, 2);
      const head = art.rrect(x, y, 5, 6, 18, 18, 3.2);
      if (quiff && (y <= 7 || !head)) return y <= 7 && x >= 9 && x <= 16 && (x + y) % 4 === 0 ? 'H' : 'h';
      if (head) {
        if (y <= 8 && (x <= 6 || x >= 17)) return 'h';                 /* temples */
        if ((x <= 5 || x >= 18) && y >= 12) return 'B';                 /* sideburns into the beard */
        if (y >= 17 || (y === 16 && (x <= 7 || x >= 16))) return 'B';   /* trim beard along the jaw */
        return x >= 15 ? 'S' : 's';
      }
      if ((x === 4 || x === 19) && y >= 11 && y <= 13) return 'S';     /* ears */
      if (y === 19 && x >= 10 && x <= 13) return 'B';                  /* neck */
      /* arms hanging or waving (crossed arms are drawn on top later) */
      if (arms !== 'crossed') {
        for (const ax of [2, 20]) {
          const up = arms === 'wave' && ax === 20;
          if (!up && x >= ax && x <= ax + 1 && y >= 20 && y <= 28) {
            if (y <= 26) return P(x, y);
            if (y === 27 && ax === 20) return 't';                       /* the watch */
            return y === 28 ? 'S' : 's';
          }
          if (up && x >= 20 && x <= 21 && y >= 12 && y <= 21) return y >= 16 ? P(x, y) : (y === 15 ? 't' : 's');
        }
      }
      /* torso: the plaid shirt hangs open over a black tee */
      if (y >= 20 && y <= 28 && x >= 4 && x <= 19) {
        if (x >= 9 && x <= 14) return y === 20 && x >= 11 && x <= 12 ? 'S' : 'K';
        return (x === 9 - 1 || x === 15) ? 'P' : P(x, y);
      }
      /* light baggy jeans and chunky sneakers */
      if (y === 29 && x >= 5 && x <= 18) return 'j';
      if (y >= 30 && y <= 31 && (x >= 5 && x <= 10 || x >= 13 && x <= 18)) return x === 10 || x === 18 ? 'J' : (x === 6 || x === 14 ? 'x' : 'j');
      if (y === 32 && (x >= 4 && x <= 10 || x >= 13 && x <= 19)) return (x === 6 || x === 15) ? 'm' : 'n';
      if (y === 33 && (x >= 4 && x <= 10 || x >= 13 && x <= 19)) return 'm';
      return null;
    });
    rows = art.outline(rows);
    /* arms crossed: two plaid forearms stacked over the chest, hands tucked in */
    if (arms === 'crossed') {
      const band = y => 'k' + [...Array(16)].map((_, i) => P(i + 4, y)).join('') + 'k';
      rows = art.compose(rows,
        [2, 22, ['k'.repeat(20)]],
        [2, 23, [band(23)]], [2, 24, [band(24)]],
        [2, 25, ['k'.repeat(20)]],
        [3, 23, ['ss']], [19, 24, ['ss']], [17, 24, ['t']]);
    }
    /* face */
    if (eyes === 'shades') {
      rows = art.compose(rows, [5, 10, ['kkkkkkkkkkkkkk', '_kddddkkdddddk', '__kddk__kdddk_']]);
      if (glint) rows = art.compose(rows, [7, 11, ['w']], [14, 11, ['w']]);
    } else {
      /* shades pushed up into his hair, eyes showing */
      rows = art.compose(rows, [6, 6, ['kddddkkddddk']]);
      const E = { down: ['e'], blink: ['S'], happy: ['k'], shut: ['k'], wide: ['e'] }[eyes];
      if (eyes === 'happy' || eyes === 'shut') rows = art.compose(rows, [7, 11, eyes === 'happy' ? ['_k_', 'k_k'] : ['kkk']], [14, 11, eyes === 'happy' ? ['_k_', 'k_k'] : ['kkk']]);
      else rows = art.compose(rows, [8, 11, E], [15, 11, E], [7, 10, ['hhh']], [14, 10, ['hhh']]);
      if (eyes === 'wide') rows = art.compose(rows, [8, 12, ['w']], [15, 12, ['w']]);
    }
    /* nose, moustache, mouth */
    rows = art.compose(rows, [12, 13, ['S']], [10, 15, ['BBBB']]);
    const M = { smirk: ['___k', 'kkk_'], grin: ['kwwk', '_kk_'], flat: ['_kk_', '____'], o: ['_kk_', '_kk_'] }[mouth];
    return art.put(rows, 10, 16, M);
  };
  /* lean the upper body a pixel: the cool sway */
  const lean = (rows, n) => rows.map((r, y) => y < 22 ? (n > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.') : r);

  defineSprite('had', {
    w: W, h: H, scale: 3, does: 'cozy',
    palette: {
      k: '#1a1216', h: '#1c1719', H: '#3d3439', s: '#a8704c', S: '#8a5538', B: '#2b1f1c',
      d: '#16141a', e: '#1a1114', w: '#ffffff',
      p: '#a3724b', P: '#5c3b27', c: '#dcc5a1', K: '#18161a',
      j: '#8fb6e0', J: '#6390c4', x: '#bcd6f0', n: '#1d1d24', m: '#f0f0f0', t: '#101010'
    },
    frames: {
      idle: [had(), had(), had(), had(), had({ mouth: 'flat' }), had()],
      sway: [had(), lean(had(), 1), had(), lean(had({ mouth: 'flat' }), -1)],
      look: [lean(had({ glint: true }), 1)],
      blush: [had({ eyes: 'happy', mouth: 'grin', arms: 'wave' }), had({ eyes: 'down', mouth: 'grin', arms: 'wave' })],
      happy: [had({ glint: true, mouth: 'grin' }), had({ mouth: 'smirk' })],
      sleep: [had({ eyes: 'shut', mouth: 'flat', arms: 'down' }), lean(had({ eyes: 'shut', mouth: 'o', arms: 'down' }), 1)],
      scared: [had({ eyes: 'wide', mouth: 'o', arms: 'down' })],
      hop: [had({ eyes: 'happy', mouth: 'grin', arms: 'wave' })]
    },
    fps: { idle: 2, sway: 2, blush: 3, happy: 3, sleep: .8, look: 1 }
  });
})();
