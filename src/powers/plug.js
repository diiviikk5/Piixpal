/* PLUG: an offline indicator with feelings. When the connection drops, a little power
 * plug slides into the corner, unplugged and sad, sparks fizzing off its prongs, with a
 * note saying you're offline. When the connection comes back, a socket pops up, Plug
 * hops in with a zap, says so, and slides away again.
 *
 *   <piix-pal pal="plug"></piix-pal>
 *   always     stay in the corner (happily plugged in) even when online
 *   Events: piix:offline, piix:online */

/* the plug: a rounded body with a face, two brass prongs, and a curly cable */
const plugShape = (face, by = 0) => {
  let rows = art.paint(16, 12, (x, y) => {
    const yy = y - by;
    if (art.rrect(x, yy, 3, 2, 11, 10, 3)) return 'b';
    return null;
  });
  rows = art.outline(art.volume(rows));
  rows = art.compose(rows, [13, 4 + by, ['yyy']], [13, 8 + by, ['yyy']]);
  rows = art.compose(rows, [0, 7 + by, ['qq_']], [0, 8 + by, ['_q']], [1, 9 + by, ['qq']]);
  const F = {
    sad: [[5, 5 + by, ['e_e']].map((v, i) => i ? v : 5), [9, 5 + by, ['e_e']], [6, 8 + by, ['_ee_'.slice(0, 4)]], [6, 9 + by, ['e__e']]],
    happy: [[5, 5 + by, ['_e_', 'e_e']], [9, 5 + by, ['_e_', 'e_e']], [6, 8 + by, ['e__e', '_ee_']]],
    zap: [[5, 5 + by, ['eee']], [9, 5 + by, ['eee']], [7, 8 + by, ['ee', 'ee']]]
  }[face];
  rows = art.compose(rows, ...F);
  if (face === 'sad') rows = art.compose(rows, [12, 2 + by, ['t', 't']]);
  return rows;
};

/* Plug: sad and sparking, zapped, and happily plugged in */
defineSprite('plug', {
  w: 16, h: 12, scale: 3, does: 'offline',
  palette: { k: '#17121f', b: '#f3f0fa', d: '#c9c3d6', B: '#ffffff', y: '#ffd23f', q: '#7d768a', e: '#17121f', t: '#58c8ff' },
  frames: { sad: [plugShape('sad'), plugShape('sad', -1)], zap: [plugShape('zap')], happy: [plugShape('happy'), plugShape('happy', -1)] },
  fps: { sad: 1.5, happy: 4 }
});

/* the wall socket it plugs into (crew only) */
defineSprite('_socket', {
  w: 9, h: 12, scale: 3,
  palette: { k: '#17121f', w: '#fffdf5', W: '#e2dccb', s: '#3a3247' },
  frames: { idle: [['.kkkkkkk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kwssswwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwssswwwk', 'kwwwwwwwk', 'kWWWWWWWk', '.kkkkkkk.', '.........']] }
});

/* sparks: little yellow pixels that fizz off the prongs */
const plugSpark = (layer, x, y, S) => {
  const d = document.createElement('div');
  const s = Math.round(2 * S + Math.random() * 2 * S);
  d.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:${pick(['#ffd23f', '#ffffff', '#ff9a2f'])};pointer-events:none`;
  layer.appendChild(d);
  return { d, x, y, vx: rnd(-60, 160) * S, vy: -rnd(40, 160) * S, life: rnd(.25, .5) };
};

