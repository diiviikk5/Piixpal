/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* PEBBLE: a heavy little rock. Doesn't bounce. Lands with a thud everyone hears. */
  defineSprite('pebble', {
    w: 12, h: 8, scale: 4, does: 'toss',
    toss: { bounce: 0, friction: 9, heavy: true },
    palette: { k: K, g: '#a7a0b3', G: '#d3cedb', d: '#7d758b' },
    frames: { idle: [[
      '...kkkkk....',
      '.kkGGgggkk..',
      'kGGggggggk..',
      'kggkkgkkggk.',
      'kgggggggggk.',
      'kdggggggggdk',
      '.kddddddddk.',
      '..kkkkkkkk..'
    ].map(r => r.padEnd(12, '.'))] }
  });
})();
