/* ECHO: your cursor's little shadow.
 * Job: follows the exact path your cursor took, half a second behind, and clicks
 * wherever you clicked. Stop moving and it catches up and does a little dance. */
(() => {
  const arrow = [
    'k........',
    'kk.......',
    'kwk......',
    'kwwk.....',
    'kwwwk....',
    'kwkwkk...',
    'kwwwwwk..',
    'kwkwkwwk.',
    'kwwwwwwwk',
    'kwwwkkkkk',
    'kwkwwk...',
    'kk.kwwk..',
    'k...kwwk.',
    '.....kk..'
  ].map(r => r.padEnd(9, '.'));
  /* the arrow's face: two eye pixels and a mouth, swapped for expressions */
  const press = art.put(arrow, 0, 5, ['kwkwkk']).map((r, i) => i === 7 ? 'kwwwwwwk.' : r);
  const happy = art.compose(arrow, [1, 5, ['wkwk']], [1, 7, ['wkkw']]);
  defineSprite('echo', {
    w: 9, h: 14, scale: 3, does: 'mimic',
    palette: { k: '#17121f', w: '#c6f432' },
    frames: { idle: [arrow], click: [press], dance: [happy, art.shift(happy, 1)] },
    fps: { dance: 5 }
  });
})();
