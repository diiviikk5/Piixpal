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

/* Crumb: sniffs, walks, chews, and sits back full and happy */
defineSprite('crumb', {
  w: 16, h: 11, scale: 3, does: 'munch',
  palette: { k: '#17121f', b: '#b9b3c4', d: '#8d8699', B: '#e6e2ee', p: '#ff9fb5', q: '#d98aa3', e: '#17121f' },
  frames: {
    idle: [crumbFeet(crumbFace(crumbShape(0), 0, {}), 0), crumbFeet(crumbFace(crumbShape(0), 0, { nose: 1 }), 0), crumbFeet(crumbFace(crumbShape(0), 0, {}), 0), crumbFeet(crumbFace(crumbShape(0), 0, { eyes: 'shut' }), 0)],
    walk: [crumbFeet(crumbFace(crumbShape(-1), -1, {}), 1), crumbFeet(crumbFace(crumbShape(0), 0, {}), 0)],
    chew: [crumbFeet(crumbFace(crumbShape(0), 0, { chew: true }), 0), crumbFeet(crumbFace(crumbShape(0), 0, { chew: true, nose: 1, eyes: 'shut' }), 0)],
    full: [crumbFeet(crumbFace(crumbShape(0, true), 0, { eyes: 'happy' }), 0), crumbFeet(crumbFace(crumbShape(-1, true), -1, { eyes: 'happy' }), 0)]
  },
  fps: { idle: 3, walk: 10, chew: 12, full: 3 }
});

/* a stand-in copy of the banner, pinned where the real one was, that Crumb can eat */
const crumbCopy = el => {
  const r = el.getBoundingClientRect();
  const fixed = getComputedStyle(el).position === 'fixed';
  const c = el.cloneNode(true);
  c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  c.querySelectorAll('piix-pal').forEach(n => n.remove());
  c.removeAttribute('id');
  c.setAttribute('aria-hidden', 'true');
  c.inert = true;
  c.style.cssText += `;position:fixed;margin:0;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;box-sizing:border-box;` +
    'pointer-events:none;z-index:calc(var(--piix-z,2147482000) - 1);transform:none;transition:none;animation:none';
  (el.parentNode || document.body).insertBefore(c, el.nextSibling);
  return { el: c, fixed, x: r.left + (fixed ? 0 : scrollX), y: r.top + (fixed ? 0 : scrollY), w: r.width, h: r.height };
};

