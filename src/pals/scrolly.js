/* SCROLLY: a tiny runner on a reading-progress bar.
 * Job: runs along a bar at the bottom of the screen as you scroll, keeping pace with
 * how far down the page you are. Reaches the end and celebrates. */
(() => {
  const head = [
    '...kkkk...',
    '..kssssk..',
    '.krrrrrrk.',
    '.kswswssk.',
    '.kssssssk.',
    '..kkkkkk..',
    '..kbbbbk..',
    '.kbbbbbbk.'
  ];
  const legs = {
    a: ['.kbbbbbbk.', '..kk..kk..', '.k.....k..'],
    b: ['..kbbbbk..', '...k.k....', '...k..k...'],
    c: ['.kbbbbbbk.', '..kk..kk..', '..k....k..'],
    stand: ['..kbbbbk..', '..k....k..', '..k....k..'],
    cheer: ['k.kbbbbk.k', '..k....k..', '.kk....kk.']
  };
  const f = (l, armsUp) => (armsUp ? art.compose(head, [0, 6, ['k']], [9, 6, ['k']]) : head).concat(legs[l]);
  defineSprite('scrolly', {
    w: 10, h: 11, scale: 3, does: 'progress',
    palette: { k: '#17121f', s: '#ffd9b5', r: '#ff4d6d', w: '#ffffff', b: '#58c8ff' },
    frames: { run: [f('a'), f('b'), f('c'), f('b')], idle: [f('stand'), f('stand'), f('stand', true), f('stand')], cheer: [f('cheer', true), f('stand')] },
    fps: { run: 12, idle: 2, cheer: 6 }
  });
})();
