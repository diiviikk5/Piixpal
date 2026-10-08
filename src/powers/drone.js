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

