/* PEEPER: a fluffball who guards your form fields.
 * Job: sits on an input and watches you type, eyes following the caret. Covers its eyes
 * for password fields. Cheers when a field is valid, sweats when it isn't. */
(() => {
  const base = [
    '...kkkkkk...',
    '..kffffffk..',
    '.kffffffffk.',
    'kffwwffwwffk',
    'kffwwffwwffk',
    'kffffffffffk',
    'kfppffffppfk',
    'kfffffkffffk',
    '.kffffffffk.',
    '..kkkkkkkk..',
    '..k......k..'
  ];
  const look = (dx, dy) => art.compose(base, [3 + dx, 3 + dy, ['k']], [7 + dx, 3 + dy, ['k']]);
  const cover = art.compose(base, [1, 3, ['khhkhhkhhkk'.slice(0, 10)]], [1, 4, ['khhhhkhhhh']], [0, 5, ['kk', 'kh']], [10, 5, ['kk', 'hk']]);
  const happy = art.compose(base, [3, 3, ['kk', 'ff']], [7, 3, ['kk', 'ff']], [5, 7, ['kffk']]);
  const worried = art.compose(look(0, 1), [3, 2, ['k']], [8, 2, ['k']], [5, 7, ['_kk_']]);
  defineSprite('peeper', {
    w: 12, h: 11, scale: 3, does: 'guard',
    palette: { k: '#17121f', f: '#f3f0fa', h: '#ffd9b5', w: '#ffffff', p: '#ffb3c7' },
    frames: { l: [look(0, 1)], r: [look(1, 1)], idle: [look(0, 0), look(1, 0), look(1, 0), look(0, 0)], cover: [cover], happy: [happy], worried: [worried] },
    fps: { idle: 1 }
  });
})();
