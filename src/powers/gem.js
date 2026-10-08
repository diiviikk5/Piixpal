/* GEM: a treasure hunt across your site. Hide gems anywhere, on any page; visitors who
 * spot one click it and it flies into a little jar in the corner, which remembers every
 * gem they've found, page to page. Find them all and the jar bursts with sparkles (and,
 * if you like, hands over a reward code).
 *
 *   <piix-pal pal="gem" hunt="launch" gem="1" total="5"></piix-pal>
 *   <piix-pal pal="gem" hunt="launch" gem="2" total="5" color="#ff4d6d"></piix-pal>   …and so on
 *   reward="PIX10"   what the finder gets when the jar is full
 *   Events: piix:gem { hunt, found, total }, piix:hunt-done { hunt, reward } */

/* a cut gem, with a glint that travels across it */
const gemShape = glint => {
  const rows = ['..kkkkk..', '.kLlLlLk.', 'kLlLlLlLk', 'kkkkkkkkk', '.klllldk.', '..klldk..', '...kdk...', '....k....'];
  return glint < 0 ? rows : art.put(rows, 2 + glint, glint > 3 ? 2 : 1, ['w']);
};

/* Gem: sits and glints */
defineSprite('gem', {
  w: 9, h: 8, scale: 3, does: 'hunt',
  palette: { k: '#17121f', l: '#58c8ff', L: '#b8e6ff', d: '#2f8fc4', w: '#ffffff' },
  frames: { idle: [gemShape(-1), gemShape(-1), gemShape(-1), gemShape(0), gemShape(2), gemShape(4), gemShape(-1), gemShape(-1)] },
  fps: { idle: 8 }
});

