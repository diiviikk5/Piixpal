/* FROG: a frog who is convinced your cursor is a fly.
 * Job: sits on your element; when the cursor buzzes close, its tongue snaps out at it.
 * Keep still at the end of the tongue and it catches you. Click it and it hops. */
(() => {
  const sit = [
    '..kk....kk..',
    '.kwwk..kwwk.',
    '.kwkkkkkwkk.'.slice(0, 12),
    'kgggggggggggk'.slice(0, 12),
    'kgGgggggggGk',
    'kgggkkkkgggk',
    'kgggggggggk.'.padEnd(12, '.'),
    '.kgg.kk.ggk.',
    'kkgk....kgkk'
  ];
  const blink = art.compose(sit, [2, 1, ['kk']], [8, 1, ['kk']]);
  const open = art.put(sit, 4, 5, ['kppk']);
  const jump = art.put(sit, 0, 8, ['.kk......kk.']);
  defineSprite('frog', {
    w: 12, h: 9, scale: 4, does: 'snap',
    palette: { k: '#17121f', g: '#7bd63a', G: '#c8f58a', w: '#ffffff', p: '#ff7aa8' },
    frames: { sit: [sit, sit, sit, blink], snap: [open], jump: [jump], happy: [art.compose(blink, [4, 5, ['kggk']])] },
    fps: { sit: 1.4 }
  });
})();
