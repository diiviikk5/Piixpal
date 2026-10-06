/* Cast for the group pals. Each group is one <piix-pal> that runs a whole crew. */
(() => {
  const K = '#17121f';

  /* DUCKS: a mother duck and her ducklings (do="parade") */
  const mama = [
    '.....kkk....',
    '....kwwwk...',
    '....kwkwkoo.',
    '....kwwwkoo.',
    '.k..kwwwk...',
    'kwk.kwwwwk..',
    'kwwkwwwwwwk.',
    'kwwwwWWwwwwk',
    '.kwwwwwwwwk.',
    '..kkkkkkkk..'
  ];
  defineSprite('ducks', {
    w: 12, h: 11, scale: 3, does: 'parade',
    palette: { k: K, w: '#ffffff', W: '#d9dce8', o: '#ff9a2f' },
    frames: {
      walk: [mama.concat(['...o..o.....']), mama.concat(['....o.o.....'])],
      idle: [mama.concat(['...o...o....'])],
      quack: [art.put(mama, 9, 2, ['ooo']).concat(['...o...o....'])]
    },
    fps: { walk: 6 }
  });
  const ling = ['..kkk..', '.kyyyk.', '.kykyoo', 'k.kyyk.', 'kykyyyk', 'kyyyyyk', '.kkkkk.'];
  defineSprite('duckling', {
    w: 7, h: 8, scale: 3, does: 'parade',
    palette: { k: K, y: '#ffd23f', o: '#ff9a2f' },
    frames: { walk: [ling.concat(['..o.o..']), ling.concat(['...oo..'])], idle: [ling.concat(['..o..o.'])] },
    fps: { walk: 9 }
  });

  /* ANTS: a marching line, some carrying crumbs (do="march") */
  const ant = legs => ['.kk.kk..', 'kkkkkkkk', legs];
  defineSprite('ants', {
    w: 8, h: 3, scale: 3, does: 'march',
    palette: { k: K, c: '#ffd9a0' },
    frames: {
      walk: [ant('k.k.k.k.'), ant('.k.k.k.k')],
      carry: [['..cc....', '.kkckk..', 'kkkkkkkk', 'k.k.k.k.'], ['..cc....', '.kkckk..', 'kkkkkkkk', '.k.k.k.k']]
    },
    fps: { walk: 12, carry: 12 }
  });

  /* FISH: a little school (do="school") */
  const fish = tail => [`.${tail[0]}.kkk..`, `k${tail[1]}kfffk.`, `kfFffwkk`, `k${tail[1]}kfffk.`, `.${tail[0]}.kkk..`];
  defineSprite('fish', {
    w: 8, h: 5, scale: 3, does: 'school',
    palette: { k: K, f: '#ff8a3d', F: '#ffd0a8', w: '#ffffff' },
    frames: { swim: [fish(['k', 'f']), fish(['.', 'k'])] },
    fps: { swim: 6 }
  });

  /* SPARROWS: birds on a wire (do="wire") */
  const bird = ['..kkk...', '.kbbwk..', '.kbbbkoo', 'kbBBbbk.', 'kbBBBbk.', '.kbbbk..', '..k.k...'];
  const flap = ['k.....k.', 'kb...bk.', '.kbkbkoo', '..kbbk..', '..kbbk..', '...kk...', '........'];
  defineSprite('sparrows', {
    w: 8, h: 7, scale: 3, does: 'wire',
    palette: { k: K, b: '#9a6b44', B: '#e8c9a4', w: '#ffffff', o: '#ffb020' },
    frames: { sit: [bird], peck: [art.put(bird, 5, 2, ['k', 'koo']), bird], fly: [flap, art.put(bird, 0, 6, ['........'])] },
    fps: { peck: 6, fly: 14 }
  });

  /* CHOIR: four singers who keep perfect time (do="choir") */
  const singer = (mouth, eyes = 'wk') => [
    '..kkkkk..',
    '.kbbbbbk.',
    'kbbbbbbbk',
    `kb${eyes}b${eyes}bk`.slice(0, 9).padEnd(9, 'k'),
    'kbbbbbbbk',
    mouth,
    'kbbbbbbbk',
    'kbbbbbbbk',
    '.kbbbbbk.',
    '..kkkkk..'
  ];
  defineSprite('choir', {
    w: 9, h: 10, scale: 3, does: 'choir',
    palette: { k: K, b: '#6b4cff', w: '#ffffff', m: '#ff7aa8' },
    frames: {
      hush: [singer('kbbbkbbbk')],
      sing: [singer('kbbkmkbbk'), singer('kbbkkkbbk')],
      look: [singer('kbbbkbbbk', 'kw')]
    },
    fps: { sing: 4 }
  });

  /* FIREFLIES: soft blinking lights (do="glow") */
  defineSprite('fireflies', {
    w: 5, h: 4, scale: 3, does: 'glow',
    palette: { k: K, y: '#fff36b', Y: '#ffd23f', w: '#e8f6ff' },
    frames: { on: [['w...w', '.kYk.', '.yyy.', '..y..']], off: [['w...w', '.kYk.', '.kkk.', '.....']] }
  });

  /* SHEEP: jump the fence, one by one, forever (do="count") */
  const sheep = legs => ['.kkkkk....', 'kwwWwwk...', 'kwWwwwwfff', 'kwwwwwwfwf', 'kwwwwwwfff', '.kkkkkk...', legs];
  defineSprite('sheep', {
    w: 10, h: 7, scale: 3, does: 'count',
    palette: { k: K, w: '#ffffff', W: '#e8e4f0', f: '#3b2a4f' },
    frames: { walk: [sheep('.f.f..f.f.'), sheep('..f.ff.f..')], jump: [sheep('.ff...ff..')] },
    fps: { walk: 8 }
  });
  defineSprite('fence', {
    w: 12, h: 9, scale: 3, does: 'count',
    palette: { k: K, b: '#c98a4e', d: '#8a5a2e' },
    frames: { idle: [['.k..k..k..k.', 'kbkkbkkbkkbk', 'kbkkbkkbkkbk', 'kbbbbbbbbbbk', 'kddddddddddk', 'kbkkbkkbkkbk', 'kbbbbbbbbbbk', 'kddddddddddk', 'kbkkbkkbkkbk']] }
  });

  /* BEES: a busy little line of worker bees (do="beeline") */
  defineSprite('bees', {
    w: 7, h: 6, scale: 3, does: 'beeline',
    palette: { k: K, y: '#ffd23f', w: '#e4f6ff' },
    frames: { fly: [['.ww.ww.', '.wwkww.', 'kyykyyk', 'kkkkykw', 'kyykyyk', '.kkkkk.'], ['.......', '.kwkwk.', 'kyykyyk', 'kkkkykw', 'kyykyyk', '.kkkkk.']] },
    fps: { fly: 18 }
  });
})();
