/* GULP: a pelican for your file drop zone. Drag a file anywhere over the page and Gulp
 * perks up and watches it; bring it over the drop zone and it opens its beak wide; let
 * go and it gulps the file down, pouch bulging, then tells you what it swallowed. Works
 * with a plain <input type="file"> too (picking files from the dialog).
 *
 *   <div id="drop">Drop files here</div>
 *   <piix-pal pal="gulp" on="#drop" accept></piix-pal>
 *   accept   let the zone take drops by itself (skip if your own code already handles them)
 *   Event: piix:gulp { files } */

/* the pelican: a white body, a long neck, and that famous beak with its pouch */
const gulpShape = ({ beak = 'shut', by = 0, eyes = 'open', step = 0 }) => {
  let rows = art.paint(19, 15, (x, y) => {
    const yy = y - by;
    if (art.ellipse(x, yy, 11.4, 3, 2.3, 2.1)) return 'w';
    if (art.ellipse(x, yy, 10.6, 6, 1.5, 2.8)) return 'w';
    if (art.ellipse(x, yy, 6.8, 9.6, 5.2, 3.4)) return art.ellipse(x, yy, 6, 9, 3.4, 1.9) ? 'W' : 'w';
    if (x >= 1 && x <= 2 && yy >= 8 && yy <= 10) return 'W';
    /* the beak: shut, opening wide, or with a full pouch */
    if (beak === 'shut' && ((yy === 3 && x >= 13 && x <= 18) || (yy === 4 && x >= 13 && x <= 17))) return yy === 3 ? 'o' : 'O';
    if (beak === 'open' && ((yy === 1 + Math.round((18 - x) / 3) - 1 && x >= 13 && x <= 18) || (x >= 13 && x <= 17 && yy >= 4 && yy <= 8 - Math.round((x - 13) / 2)))) return yy <= 3 ? 'o' : 'O';
    if (beak === 'full' && ((yy === 3 && x >= 13 && x <= 18) || art.ellipse(x, yy, 15, 6, 2.6, 2.6))) return yy === 3 ? 'o' : 'O';
    return null;
  });
  rows = art.outline(rows);
  if (beak === 'open') rows = art.compose(rows, [14, 5 + by, ['kk', 'kkk'.slice(0, 2)]]);
  rows = art.compose(rows, eyes === 'happy' ? [10, 2 + by, ['_e_', 'e_e']] : eyes === 'shut' ? [11, 3 + by, ['ee']] : [11, 2 + by, ['e']]);
  const L = [[[5, 13], [8, 13]], [[4, 13], [9, 12]], [[6, 12], [8, 13]]][step];
  for (const [lx, ly] of L) rows = art.put(rows, lx, ly, ['o', 'o'].slice(0, 15 - ly));
  return rows;
};

/* Gulp: waits, watches, opens up, gulps, and looks very pleased */
defineSprite('gulp', {
  w: 19, h: 15, scale: 3, does: 'dropzone',
  palette: { k: '#17121f', w: '#ffffff', W: '#d9dce8', o: '#ffb347', O: '#ff9a2f', e: '#17121f' },
  frames: {
    idle: [gulpShape({}), gulpShape({}), gulpShape({ eyes: 'shut' }), gulpShape({})],
    look: [gulpShape({ by: -1 })],
    open: [gulpShape({ beak: 'open', by: -1 }), gulpShape({ beak: 'open', by: -1, step: 1 })],
    full: [gulpShape({ beak: 'full' }), gulpShape({ beak: 'full', by: -1 })],
    happy: [gulpShape({ eyes: 'happy' }), gulpShape({ eyes: 'happy', by: -1, step: 2 })]
  },
  fps: { idle: 2, open: 6, full: 5, happy: 5 }
});

