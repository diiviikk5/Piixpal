/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* CAN: a soda can. Rolls a long, long way. */
  defineSprite('can', {
    w: 8, h: 12, scale: 4, does: 'toss',
    toss: { bounce: .3, friction: .7, spin: 1 },
    palette: { k: K, s: '#cfd6e6', r: '#ff4d6d', R: '#ff8fa3', w: '#ffffff' },
    frames: { idle: [[
      '.kkkkkk.',
      'kssssssk',
      'krRrrrrk',
      'krRrrrrk',
      'kwwwwwwk',
      'krRwwrrk',
      'krRrwwrk',
      'kwwwwwwk',
      'krRrrrrk',
      'krRrrrrk',
      'kssssssk',
      '.kkkkkk.'
    ]] }
  });
})();
