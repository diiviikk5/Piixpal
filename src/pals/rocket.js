/* ROCKET: a small rocket that lives on your "Deploy" button.
 * Job: sits there looking keen. Click it and it counts down, launches off the top of
 * the screen in a trail of smoke, then comes back down and lands. Ship it. */
(() => {
  const body = [
    '....k....',
    '...krk...',
    '..krrrk..',
    '..kwwwk..',
    '.kwbbbwk.',
    '.kwbwbwk.',
    '.kwbbbwk.',
    '.kwwwwwk.',
    '.kwwwwwk.',
    'krkwwwkrk',
    'krkwwwkrk',
    'kkkkkkkkk',
    '...kkk...'
  ];
  const flame = [
    ['..oyyyo..', '...oyo...', '....o....'],
    ['..yoyoy..', '...yoy...', '...o.o...']
  ];
  const pad = ['.........', '.........', '.........'];
  defineSprite('rocket', {
    w: 9, h: 16, scale: 3, does: 'launch',
    palette: { k: '#17121f', r: '#ff4d6d', w: '#f3f0fa', b: '#58c8ff', y: '#ffd23f', o: '#ff7a2f' },
    frames: { idle: [body.concat(pad)], burn: flame.map(f => body.concat(f)) },
    fps: { burn: 14 }
  });
})();
