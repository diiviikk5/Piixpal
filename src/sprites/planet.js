/* PLANET: a small ringed planet. Spins slowly, shines a little, thinks big. */
(() => {
  const base = [
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kpPPpppppppk..',
    '.kpPppppppppppk.',
    '.kppwwppppwwppk.',
    '.kppwwppppwwppk.',
    'kRRrrrrrrrrrrRRk',
    '.kkrrrrrrrrrrkk.',
    '..kdppppppppdk..',
    '...kddddddddk...',
    '.....kkkkkk.....'
  ];
  defineFigure('planet', {
    w: 16, h: 11, fps: 3,
    tag: 'A small ringed planet. Spins slowly, shines a little, thinks big.',
    palette: { k: '#17121f', p: '#a991ff', P: '#ddd3ff', d: '#7a5fe0', w: '#ffffff', r: '#ffd23f', R: '#fff0a0' },
    frames: [base, art.put(base, 5, 6, ['R']), art.put(base, 10, 6, ['R'])],
    eyes: [{ x: 4, y: 4, w: 2, h: 2 }, { x: 10, y: 4, w: 2, h: 2 }],
    lid: 'p'
  });
})();
