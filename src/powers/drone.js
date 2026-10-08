/* DRONE: fly-to-cart, by quadcopter. Click any "add to cart" button and the drone
 * swoops down, picks up a copy of the product's picture, flies it over to your cart
 * and drops it in. The cart does a little bounce and its counter goes up.
 *
 *   <a id="cart">Cart <b class="count">0</b></a>
 *   <button class="add-to-cart">Add</button>
 *   <piix-pal pal="drone" on="#cart"></piix-pal>     it lives by your cart
 *
 *   from="selector"    which buttons send it (default .add-to-cart, [data-add-to-cart])
 *   count="selector"   a number inside the cart to add one to (default .count, [data-count])
 *
 * The picture comes from the button's card (nearest article, li, .card or [data-product]).
 * Event: piix:delivered { button } on the pal and on the cart */

/* the drone: a boxy little quadcopter with one big round lens and a blinking light */
const droneShape = (fast, blink, shut) => {
  let rows = art.paint(18, 12, (x, y) => {
    if (y === 4 && ((x >= 2 && x <= 4) || (x >= 13 && x <= 15))) return 'a';
    if (art.rrect(x, y, 4, 3, 13, 8, 2)) return 'b';
    return null;
  });
  rows = art.outline(art.volume(rows));
  rows = art.compose(rows, [2, 2, ['k']], [15, 2, ['k']]);
  rows = art.compose(rows, fast ? [0, 1, ['rrrrr']] : [1, 1, ['rrr']], fast ? [13, 1, ['rrrrr']] : [14, 1, ['rrr']]);
  rows = art.compose(rows, blink ? [7, 5, ['kkk', '___']] : [7, 5, ['eew', 'eee']], [11, 4, [blink ? 'k' : 'g']]);
  return art.compose(rows, shut ? [7, 9, ['k..k', '.kk.']] : [6, 9, ['k....k', 'k....k']]);
};

/* Drone: rotors always spinning, a blink now and then, claws open or holding on */
defineSprite('drone', {
  w: 18, h: 12, scale: 3, does: 'cart',
  palette: { k: '#17121f', a: '#9a93a6', b: '#e9e6f0', d: '#b9b3c4', B: '#ffffff', r: '#a39cb3', e: '#17121f', w: '#58c8ff', g: '#7bd63a' },
  frames: {
    idle: [droneShape(true, false), droneShape(false, false), droneShape(true, false), droneShape(false, false), droneShape(true, true), droneShape(false, false)],
    carry: [droneShape(true, false, true), droneShape(false, false, true)]
  },
  fps: { idle: 16, carry: 16 }
});

/* the cardboard box it carries when there's no picture to carry (crew only) */
defineSprite('_parcel', {
  w: 9, h: 8, scale: 3,
  palette: { k: '#17121f', c: '#d9a066', C: '#b07a43', t: '#f3e2c0' },
  frames: { idle: [['kkkkkkkkk', 'kccctcccC', 'kccctcccC', 'kkkkkkkkk', 'kccctcccC', 'kccctcccC', 'kCCCtCCCC', 'kkkkkkkkk']] }
});

/* where something is, in the drone's own coordinates (the box's, or the screen's) */
const droneRect = (el, pinned) => {
  const r = el.getBoundingClientRect();
  const ox = pinned ? origin.x : scrollX, oy = pinned ? origin.y : scrollY;
  return { l: r.left + ox, t: r.top + oy, r: r.right + ox, b: r.bottom + oy, w: r.width, h: r.height, x: r.left + ox + r.width / 2, y: r.top + oy + r.height / 2 };
};

/* the picture to carry: the product image from the button's card, cloned */
const droneCargo = btn => {
  const card = btn.closest('[data-product],.product,.card,article,li,figure') || btn.parentElement;
  const img = card && (card.querySelector('[data-product-image]') || card.querySelector('img'));
  if (!img) return null;
  const c = document.createElement('img');
  c.src = img.currentSrc || img.src;
  c.alt = '';
  c.style.cssText = 'position:absolute;left:0;top:0;object-fit:cover;border-radius:6px;box-shadow:0 0 0 2px #17121f,0 6px 0 rgba(23,18,31,.25);pointer-events:none;will-change:transform';
  return { el: c, from: img };
};

