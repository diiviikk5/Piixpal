/* NOMAD: a little traveller who walks between your browser windows. Open your site in two
 * windows side by side and Nomad walks off the edge of one and into the other, right
 * where they meet. Close a window and Nomad moves to another one rather than get lost.
 * On its own it strolls along the bottom of the screen and peeks out at the edges.
 *
 *   <piix-pal pal="nomad"></piix-pal>
 *   el.ctl.invite()   opens a second window next to this one
 * Windows of the same site find each other with a BroadcastChannel. Event: piix:arrive, piix:depart */

/* the traveller: a woolly hat, a big backpack and a walking stick */
const nomadShape = (by, step, look) => {
  let rows = art.paint(15, 17, (x, y) => {
    const yy = y - by;
    if (art.ellipse(x, yy, 8, 2.6, 3.3, 2.1) && yy <= 3) return 'h';
    if (yy === 3 && x >= 4 && x <= 11) return 'H';
    if (art.ellipse(x, yy, 8, 6, 3.2, 2.6)) return 'f';
    if (x >= 2 && x <= 4 && yy >= 7 && yy <= 12) return yy === 9 ? 'B' : 'b';
    if (x >= 1 && x <= 5 && yy === 6) return 'r';
    if (x >= 5 && x <= 10 && yy >= 9 && yy <= 13) return 'c';
    return null;
  });
  rows = art.outline(rows);
  rows = art.compose(rows, [8 + look, 6 + by, ['e']], [10 + look, 6 + by, ['e']], [7, 8 + by, ['p']]);
  for (let y = 4; y <= 15; y++) rows = art.put(rows, 13, y + by, ['s']);
  const L = [[[6, 14], [9, 14]], [[5, 14], [10, 13]], [[7, 14], [8, 14]], [[6, 13], [10, 14]]][step];
  for (const [lx, ly] of L) rows = art.put(rows, lx, ly + by, ['kk', 'kk'].slice(0, 16 - ly - by));
  return rows;
};

/* Nomad: strolls, stops to look out, and waves hello when it arrives */
defineSprite('nomad', {
  w: 15, h: 17, scale: 3, does: 'roam',
  palette: { k: '#17121f', h: '#ff6b4a', H: '#c94a2f', f: '#ffd9b5', e: '#17121f', p: '#ff9fb5', b: '#58c8ff', B: '#2f8fc4', c: '#ffd23f', s: '#a0673a', r: '#7bd63a' },
  frames: {
    walk: [nomadShape(-1, 1, 0), nomadShape(0, 2, 0), nomadShape(-1, 3, 0), nomadShape(0, 2, 0)],
    idle: [nomadShape(0, 0, 0), nomadShape(0, 0, 1), nomadShape(0, 0, 1), nomadShape(0, 0, 0)],
    look: [nomadShape(0, 0, 1)]
  },
  fps: { walk: 7, idle: 1.5 }
});

/* where this window's page sits on the screen (the browser's frame is guessed, evenly) */
const nomadScreen = () => ({ x: screenX + Math.max(0, outerWidth - innerWidth) / 2, y: screenY + Math.max(0, outerHeight - innerHeight), w: innerWidth, h: innerHeight });

