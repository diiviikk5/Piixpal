/* BOING — a coral jelly drop with more energy than sense.
 * Job: bounces on top of an element (footers love it). Grab it, throw it, watch it wobble.
 * Throw it too hard and it gets dizzy. */
(() => {
  const body = [
    '.....kkkk.....',
    '...kkcccckk...',
    '..kcHHccccck..',
    '.kcHHccccccck.',
    '.kcHcccccccck.',
    'kcccccccccccck',
    'kcccccccccccck',
    'kcpcccccccccpk',
    'kdccccccccccdk',
    'kddccccccccddk',
    '.kddddddddddk.',
    '..kkkkkkkkkk..'
  ];
  /* eyes: two 2x2 patches at (4,5) and (8,5) */
  const EYE = {
    open: ['wk', 'kk'],
    blink: ['cc', 'kk'],
    happy: ['kk', 'cc'],
    dizzy: ['kc', 'ck'],
    up: ['kk', 'wk']
  };
  /* mouth: 4x2 patch at (5,7) */
  const MOUTH = {
    flat: ['_kk_', '____'],
    smile: ['k__k', '_kk_'],
    open: ['_kk_', '_kk_'],
    wobble: ['_k_k', 'k_k_']
  };
  const jelly = (eye, mouth) => art.compose(body, [4, 5, EYE[eye]], [8, 5, EYE[eye]], [5, 7, MOUTH[mouth]]);

  defineSprite('boing', {
    w: 14, h: 12, scale: 4,
    does: 'bounce',
    palette: {
      k: '#1b1226', c: '#ff6b4a', H: '#ffd4c4', d: '#cf3f22', p: '#ffb3a0', w: '#ffffff'
    },
    frames: {
      idle: [jelly('open', 'smile'), jelly('open', 'smile'), jelly('open', 'smile'), jelly('blink', 'smile')],
      air: [jelly('open', 'open')],
      rise: [jelly('up', 'smile')],
      land: [jelly('happy', 'flat')],
      held: [jelly('open', 'wobble'), jelly('blink', 'wobble')],
      dizzy: [jelly('dizzy', 'wobble'), jelly('dizzy', 'flat')],
      happy: [jelly('happy', 'smile')]
    },
    fps: { idle: 3, held: 8, dizzy: 6 }
  });
})();
