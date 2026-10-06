/* PARA: a tiny parachutist who drops in when your section scrolls into view.
 * Job: floats down from the top of the screen, swaying, lands on your element, folds
 * the chute and waves. Click to send them back up for another jump. */
(() => {
  const chute = [
    '....kkkkkkkk....',
    '..kkrrwwrrwwkk..',
    '.krrrwwrrwwrrrk.',
    'krrrwwrrwwrrrwwk',
    'kkkkkkkkkkkkkkkk',
    '.k....k..k....k.',
    '..k...k..k...k..',
    '...k..k..k..k...',
    '....k.k..k.k....',
    '.....kkkkkk.....'
  ];
  const guy = [
    '......kkkk......',
    '.....kssssk.....',
    '.....kswswk.....',
    '.....kssssk.....',
    '....kbbbbbbk....',
    '...kbkbbbbkbk...',
    '.....kbbbbk.....',
    '.....kk..kk.....'
  ];
  const wave = art.compose(guy, [3, 3, ['.kk']], [2, 4, ['kbk.']], [3, 5, ['...']]);
  const folded = ['................', '................', '................', '................', '................', '................', '................', '................', '................', '..kkkkkkkkkk....'].map((r, i) => i === 9 ? '.krrwwrrwwrk....' : r);
  defineSprite('para', {
    w: 16, h: 18, scale: 3, does: 'drop',
    palette: { k: '#17121f', r: '#ff5b4a', w: '#fffdf5', s: '#ffd9b5', b: '#6b4cff' },
    frames: {
      fall: [chute.concat(guy)],
      landed: [folded.concat(guy)],
      wave: [folded.concat(wave), folded.concat(guy)]
    },
    fps: { wave: 3 }
  });
})();
