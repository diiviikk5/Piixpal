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

