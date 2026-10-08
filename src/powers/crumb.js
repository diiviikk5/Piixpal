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

