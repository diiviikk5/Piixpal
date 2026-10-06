/* SNIP: a highlighter pen with opinions.
 * Job: when you select text, it hops over to the end of your selection and holds its
 * nib up proudly. Copy the text and it shows you a clipboard. */
(() => {
  const base = [
    '.kkkkk.',
    'kcCccck',
    'kkkkkkk',
    'kyYyyyk',
    'kyYyyyk',
    'kykykyk',
    'kyyyyyk',
    'kyykyyk',
    'kyyyyyk',
    'kyyyyyk',
    'kkkkkkk',
    '.ksssk.',
    '..kyk..',
    '...k...'
  ];
  const blink = art.put(base, 0, 5, ['kyyyyyk']);
  const happy = art.compose(base, [0, 4, ['kkYyyyk'.replace('kkY', 'kyk').replace('yyyk', 'ykyk')]], [0, 5, ['kyyyyyk']], [0, 7, ['kykkkyk']]);
  const wow = art.compose(base, [0, 7, ['kykkkyk']], [0, 8, ['kykkkyk']]);
  defineSprite('snip', {
    w: 7, h: 14, scale: 3, does: 'select',
    palette: { k: '#17121f', y: '#fff36b', Y: '#fffbd0', c: '#ff7aa8', C: '#ffc2d6', s: '#b7b0c4' },
    frames: { idle: [base, base, base, blink], happy: [happy], hold: [wow, base] },
    fps: { idle: 1.5, hold: 4 }
  });
})();
