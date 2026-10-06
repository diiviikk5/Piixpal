/* THREAD — a small spider on a long string. Mostly harmless, entirely dramatic.
 * Job: dangles from the bottom of an element (navs, banners). Sways when you scroll,
 * zips up if you reach for it, yo-yos when poked, and lowers itself back down. */
(() => {
  const body = [
    '......kk......',
    '....kkkkkk....',
    'k..kPPppppk..k',
    '.k.kpppppppkk.',
    '.kkpwkppwkpkk.',
    'k.kpppppppppk.',
    '.kkpprppprpk.k',
    '.k.kkpppppkk..',
    'k..k.kkkkk.k..',
    '...k.......k..'
  ];
  const legsB = art.compose(body,
    [0, 2, ['.k']], [12, 2, ['k.']], [0, 5, ['.']], [13, 5, ['k']], [0, 8, ['.k']], [12, 8, ['.k']]);
  const blink = art.compose(body, [5, 4, ['kk']], [8, 4, ['kk']]);
  const scared = art.compose(body, [5, 4, ['ww']], [8, 4, ['ww']], [5, 6, ['_kkk_']]);

  defineSprite('thread', {
    w: 14, h: 10, scale: 3,
    does: 'hang',
    palette: { k: '#1b1226', p: '#43306a', P: '#7a63b3', w: '#ffffff', r: '#ff7aa8' },
    frames: {
      idle: [body, body, body, blink],
      wiggle: [body, legsB],
      scared: [scared, legsB]
    },
    fps: { idle: 2, wiggle: 9, scared: 14 }
  });
})();
