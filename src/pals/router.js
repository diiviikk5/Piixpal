/* ROUTER: a little Wi-Fi router whose signal is your cursor.
 * Job: the closer your cursor, the more bars it shows. Wander off and it loses
 * signal and gets sad. Hover right on top and it beams. */
(() => {
  const base = [
    '.k......k.',
    '.k......k.',
    '.k......k.',
    'kkkkkkkkkk',
    'kbbbbbbbbk',
    'kbwkbbwkbk',
    'kbbbbbbbbk',
    'kblbbbbbbk'.replace('l', 'l'),
    'kkkkkkkkkk',
    '.k......k.'
  ];
  /* signal bars float above: up to three arcs */
  const bars = n => [
    n >= 3 ? '..gggggg..' : '..........',
    n >= 3 ? '.g......g.' : '..........',
    n >= 2 ? '...gggg...' : '..........',
    n >= 2 ? '..g....g..' : '..........',
    n >= 1 ? '....gg....' : '....xx....'
  ];
  const sad = art.compose(base, [2, 5, ['bbbbbb']], [2, 6, ['kbbbbk'.replace('bbbb', 'kbbk').slice(0, 6)]]);
  const glad = art.compose(base, [2, 5, ['kkbbkk']], [3, 6, ['bkkb']]);
  const f = (n, face) => bars(n).concat(face);
  defineSprite('router', {
    w: 10, h: 15, scale: 3, does: 'signal',
    palette: { k: '#17121f', b: '#6b4cff', w: '#ffffff', l: '#c6f432', g: '#25b89a', x: '#ff4d6d' },
    frames: { s0: [f(0, sad), f(0, art.put(sad, 2, 7, ['l']))], s1: [f(1, base)], s2: [f(2, base)], s3: [f(3, glad)] },
    fps: { s0: 2 }
  });
})();
