/* CRUMB: a mouse that eats your cookie banner. It sits on the banner sniffing at it;
 * the moment a visitor clicks Accept or Reject, Crumb tucks in and eats the whole thing,
 * bite by bite, crumbs flying, then pats its belly and waddles off.
 *
 *   <div id="cookie-banner"> … <button>Accept</button> <button>Reject</button>
 *     <piix-pal pal="crumb"></piix-pal>
 *   </div>
 *
 * Your banner's own buttons still do their job: Crumb eats a stand-in copy, so your code
 * can hide or remove the real one straight away.   Event: piix:eaten */

/* the mouse: a round grey body, a big pink ear, a pink nose and a long curly tail */
const crumbShape = (by, full) => art.outline(art.volume(art.paint(16, 11, (x, y) => {
  const yy = y - by;
  if (art.ellipse(x, yy, 7.2, 6.4, full ? 5.4 : 4.6, full ? 3.6 : 3)) return 'b';
  if (art.ellipse(x, yy, 11.8, 5.6, 2.6, 2.3)) return 'b';
  if (art.ellipse(x, yy, 10.2, 2.8, 2.1, 2.1)) return 'b';
  if (yy === 6 && x >= 1 && x <= 2) return 'q';
  if (yy === 5 && x === 0) return 'q';
  return null;
})));

/* its face: an eye, the inside of its ear, a twitchy nose, and cheeks full of banner */
const crumbFace = (rows, by, { nose = 0, chew = false, eyes = 'open' }) => {
  rows = art.compose(rows, [9, 2 + by, ['pp', 'p']], [14, 5 + by - nose, ['p']]);
  if (eyes === 'open') rows = art.put(rows, 12, 4 + by, ['e', 'e']);
  else if (eyes === 'happy') rows = art.compose(rows, [11, 5 + by, ['e.e']], [12, 4 + by, ['e']]);
  else rows = art.put(rows, 11, 5 + by, ['ee']);
  return chew ? art.compose(rows, [12, 6 + by, ['BB']], [13, 7 + by, ['e']]) : rows;
};

/* little feet, apart or together */
const crumbFeet = (rows, step) => art.compose(rows, step ? [4, 10, ['p']] : [5, 10, ['p']], step ? [10, 10, ['p']] : [9, 10, ['p']]);

