/* PENGUIN: a penguin who has discovered that your element is slippery.
 * Job: waddles along, flops onto its belly and slides, gets up at the far end and
 * waddles back to do it again. Poke it and it slips over. */
(() => {
  const stand = [
    '...kkkk.....',
    '..kbbbbk....',
    '.kbwkbwk....'.replace('wk', 'wk'),
    '.kbbooobk...'.slice(0, 12),
    '.kbwwwwbk...',
    'kbbwwwwbbk..',
    'kbbwwwwbbk..',
    'kbbwwwwbbk..',
    '.kbwwwwbk...',
    '..kkkkkk....',
    '..oo..oo....'
  ];
  const step = art.put(stand, 0, 10, ['...oo..oo...']);
  const slide = [
    '............',
    '............',
    '............',
    '............',
    '............',
    '............',
    '.....kkkkk..',
    'kkkkkbbbbbk.',
    'kwwwwwwbwbkk',
    'kwwwwwwwbbko',
    '.kkkkkkkkkk.'
  ];
  defineSprite('penguin', {
    w: 12, h: 11, scale: 3, does: 'slide',
    palette: { k: '#17121f', b: '#2b3a55', w: '#ffffff', o: '#ff9a2f' },
    frames: { walk: [stand, step], idle: [stand], slide: [slide] },
    fps: { walk: 6 }
  });
})();
