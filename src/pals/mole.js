/* MOLE: pops up out of an element's top edge, has a look around, ducks back down.
 * Job: whack-a-mole. Click it while it's up to bonk it. It will be back. */
(() => {
  const up = [
    '...kkkkkk...',
    '..kbbbbbbk..',
    '.kbBbbbbbbk.',
    '.kbwkbbwkbk.',
    '.kbbbppbbbk.',
    'kkbbkppkbbkk',
    'kcckbbbbkcck',
    'kcckbbbbkcck',
    '.kkkbbbbkkk.',
    '...kbbbbk...'
  ];
  const look = (dx) => art.compose(up, [3 + dx, 3, ['wk'].map(s => dx > 0 ? 'kw' : s)], [7 + dx, 3, [dx > 0 ? 'kw' : 'wk']]);
  const bonk = art.compose(up, [3, 3, ['kk']], [7, 3, ['kk']], [3, 2, ['k']], [8, 2, ['k']]);
  defineSprite('mole', {
    w: 12, h: 10, scale: 4, does: 'pop',
    palette: { k: '#17121f', b: '#8a5a3c', B: '#b98563', w: '#ffffff', p: '#ff9cc2', c: '#f2d6b8' },
    frames: { up: [up], l: [look(0)], r: [up], bonk: [bonk] }
  });
  defineSprite('molehill', {
    w: 16, h: 4, scale: 4, does: 'pop',
    palette: { k: '#17121f', d: '#6b4a2f', D: '#9a6b44' },
    frames: { idle: [['....kkkkkkkk....', '..kkdDddDdddkk..', '.kddddDddddDddk.', 'kddDddddddddDddk']] }
  });
})();
