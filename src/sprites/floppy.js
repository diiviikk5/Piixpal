/* FLOPPY: a floppy disk who remembers when 1.44 MB was a lot. Also, the save icon. */
defineFigure('floppy', {
  w: 14, h: 14,
  tag: 'A floppy disk who remembers when 1.44 MB was a lot. Also, the save icon.',
  palette: { k: '#17121f', b: '#58c8ff', s: '#d9dde8', S: '#9aa3b5', l: '#ffffff', w: '#ffffff', p: '#ff9cc2' },
  frames: [[
    'kkkkkkkkkkkkk.',
    'kbbksssssskbbk',
    'kbbksSSssskbbk',
    'kbbksSSssskbbk',
    'kbbksssssskbbk',
    'kbbbkkkkkkbbbk',
    'kbbbbbbbbbbbbk',
    'kbbkkkkkkkkbbk',
    'kbbklllllllbbk'.slice(0, 14),
    'kbbklwwllwwlbk'.slice(0, 13) + 'k',
    'kbbklwwllwwlbk'.slice(0, 13) + 'k',
    'kbbklpllllplbk'.slice(0, 13) + 'k',
    'kbbklllkklllbk'.slice(0, 13) + 'k',
    'kkkkkkkkkkkkkk'
  ]],
  eyes: [{ x: 5, y: 9, w: 2, h: 2 }, { x: 9, y: 9, w: 2, h: 2 }],
  lid: 'l'
});
