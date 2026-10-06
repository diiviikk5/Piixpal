/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* BALL: a beach ball. Bouncy, rolly, slightly smug. */
  defineSprite('ball', {
    w: 10, h: 10, scale: 4, does: 'toss',
    toss: { bounce: .72, friction: .9, spin: 1 },
    palette: { k: K, r: '#ff5b4a', y: '#ffd23f', b: '#58c8ff', w: '#ffffff' },
    frames: { idle: [[
      '...kkkk...',
      '.kkrrwwkk.',
      '.krrrwwbk.',
      'kyrrrwbbbk',
      'kyyywwbbbk',
      'kyyywwwbbk',
      'kyyywwwrrk',
      '.kyyywrrk.',
      '.kkyywrkk.',
      '...kkkk...'
    ].map(r => r.padEnd(10, '.').slice(0, 10))] }
  });
})();
