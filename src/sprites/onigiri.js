/* ONIGIRI: a rice ball in a seaweed jacket. Calm, round-ish, triangular. */
defineFigure('onigiri', {
  w: 14, h: 12,
  tag: 'A rice ball in a seaweed jacket. Calm, round-ish, triangular.',
  palette: { k: '#17121f', w: '#ffffff', W: '#f1ece2', n: '#1f3b2c', N: '#2f5a43', p: '#ffb3c7' },
  frames: [[
    '......kk......',
    '.....kwwk.....',
    '....kwwwwk....',
    '...kwwwwwwk...',
    '..kwwwwwwwwk..',
    '..kwwwwwwwwk..',
    '.kwwwwwwwwwwk.',
    '.kwpwwwwwwpwk.',
    'kwwwwwkkwwwwwk',
    'kWwnNnnnnnnwWk',
    'kWwnnnnnnnnwWk',
    '.kkkkkkkkkkkk.'
  ]],
  eyes: [{ x: 3, y: 5, w: 3, h: 2 }, { x: 8, y: 5, w: 3, h: 2 }],
  pupil: { w: 2, h: 2 },
  lid: 'w'
});
