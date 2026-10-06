/* TERMI: a tiny terminal who types for you.
 * Job: sits on your element and types out lines in a little terminal bubble, one
 * after another, forever. lines="npm i piixpal|shipped!" */
(() => {
  const base = [
    'kkkkkkkkkkkk',
    'kmmmmmmmmmmk',
    'kmssssssssmk',
    'kmsgsssgssmk',
    'kmsssssssmmk'.slice(0, 12),
    'kmssgggsssmk',
    'kmssssssssmk',
    'kmmmmmmmmmmk',
    'kkkkkkkkkkkk',
    '....kmmk....',
    '..kkkkkkkk..'
  ];
  const blink = art.put(base, 3, 3, ['ssssss'.slice(0, 5)]);
  const type = art.put(base, 4, 5, ['gsg']);
  defineSprite('termi', {
    w: 12, h: 11, scale: 3, does: 'type',
    palette: { k: '#17121f', m: '#c9c3d6', s: '#17121f', g: '#c6f432' },
    frames: { idle: [base, base, base, blink], typing: [base, type] },
    fps: { idle: 1.5, typing: 8 }
  });
})();
