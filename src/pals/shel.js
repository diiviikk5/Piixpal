/* SHEL: a very slow snail with a very nice shell.
 * Job: creeps along your text leaving a shimmering slime trail.
 * Too close and it hides in its shell until you go away. */
(() => {
  const walkA = [
    '...kkkkkk.......',
    '..kSSssssk...k.k',
    '.kSskkkkssk..b.b',
    '.kskSsssksk..b.b',
    '.kskskksksk.kbbk',
    '.kskssskssk.kbbk',
    '.kskkkkkssk.kbpk',
    'kbkkkkkkkkkkkbbk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'
  ];
  const walkB = art.compose(walkA, [0, 8, ['kbbbbbbbbbbbbbk.']], [0, 9, ['.kkkkkkkkkkkkk..']]);
  const sway = art.put(walkA, 12, 1, ['.k.k', '.b.b']);
  const shell = [
    '...kkkkkk...',
    '..kSSssssk..',
    '.kSskkkkssk.',
    '.kskSsssksk.',
    '.kskskksksk.',
    '.kskssskssk.',
    '.kskkkkkssk.',
    '.kssssssssk.',
    '..kkkkkkkk..'
  ].map(r => r.padEnd(16, '.'));
  const peek = art.compose(shell, [11, 3, ['..k.']], [11, 4, ['.kbk']], [11, 5, ['kbbk']], [11, 6, ['kbbk']], [10, 7, ['kkkkk']]);

  defineSprite('shel', {
    w: 16, h: 10, scale: 3,
    does: 'creep',
    palette: { k: '#17121f', S: '#ffe2bd', s: '#ef9a4b', b: '#9fe3c9', p: '#ff9cc2' },
    frames: {
      walk: [walkA, walkA, walkB, walkB],
      idle: [walkA, walkA, sway, walkA],
      hide: [shell],
      peek: [peek]
    },
    fps: { walk: 3, idle: 2 }
  });
})();
