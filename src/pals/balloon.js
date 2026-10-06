/* BALLOON: a balloon with a face, tied to your element.
 * Job: floats above it on a string, drifting in the breeze of your cursor and the
 * scroll. Click it and it pops. Give it a moment and it inflates again. */
(() => {
  const body = [
    '...kkkk...',
    '.kkbbbbkk.',
    'kbBBbbbbbk',
    'kbBbbbbbbk',
    'kbbwkbwkbk',
    'kbbbbbbbbk',
    'kbbpbbpbbk',
    '.kbbkkbbk.',
    '.kbbbbbbk.',
    '..kbbbbk..',
    '...kbbk...',
    '....kk....',
    '...kbbk...'
  ];
  const pop = [
    '..........',
    '.b..k..b..',
    '..b.k.b...',
    '...b.b....',
    'bbb...bbb.',
    '...b.b....',
    '..b.k.b...',
    '.b..k..b..',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........'
  ];
  defineSprite('balloon', {
    w: 10, h: 13, scale: 4, does: 'float',
    palette: { k: '#17121f', b: '#ff5b7f', B: '#ffc2d1', w: '#ffffff', p: '#ff97b0' },
    frames: { idle: [body], blink: [art.compose(body, [3, 4, ['kk']], [6, 4, ['kk']])], pop: [pop] }
  });
})();
