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

/* the bites: punched out of a mask with jagged, pixel-round edges */
const crumbBite = (g, x, y, r) => {
  g.globalCompositeOperation = 'destination-out';
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) + (Math.random() < .5 ? 0 : -1));
    g.fillRect(Math.round(x - half), Math.round(y + dy), half * 2 + 1, 1);
  }
};

/* where the bites go: along the top from the nearest end, then the next row back the other way */
const crumbPath = (w, h, R, fromRight) => {
  const pts = [], rows = Math.max(1, Math.ceil(h / (R * 1.6)));
  for (let k = 0; k < rows; k++) {
    const y = Math.min(h, k * R * 1.6 + R * .4), n = Math.max(2, Math.ceil(w / (R * 1.4)));
    for (let i = 0; i <= n; i++) { const u = (k % 2 ? n - i : i) / n; pts.push({ x: (fromRight ? 1 - u : u) * w, y }); }
  }
  return pts;
};

/* munch: sit on the banner, then eat it the moment someone clicks one of its buttons */
defineBehavior('munch', (a, [el], host) => {
  const S = a.s / 3;
  let state = 'guard', copy = null, path = [], step = 0, biteT = 0, mask = null, mg = null, leaveT = 0, side = 1, x = null, sniffT = 0;
  const crumbs = [];
  const layer = a.node.parentNode;
  const click = e => {
    if (state !== 'guard' || !el.contains(e.target)) return;
    if (!e.target.closest('button,a,[role=button],input[type=submit],input[type=button]')) return;
    copy = crumbCopy(el);
    const P = 4, mw = Math.max(1, Math.ceil(copy.w / P)), mh = Math.max(1, Math.ceil(copy.h / P));
    mask = document.createElement('canvas'); mask.width = mw; mask.height = mh;
    mg = mask.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, mw, mh);
    path = crumbPath(copy.w, copy.h, clamp(copy.h * .5, 18, 36), a.x > copy.x + (copy.fixed ? scrollX : 0) + copy.w / 2);
    step = 0; biteT = 0; state = 'eat';
    a.say('!', 500);
  };
  document.addEventListener('click', click, true);
  const spot = () => {
    if (!copy) { const r = rectOf(el); return { x: r.l, y: r.t, w: r.w, h: r.h }; }
    return { x: copy.x - (copy.fixed ? -scrollX : 0), y: copy.y - (copy.fixed ? -scrollY : 0), w: copy.w, h: copy.h };
  };
  const crumb = (cx, cy) => {
    if (crumbs.length > 40) return;
    const d = document.createElement('div');
    const s = Math.round(a.s * rnd(.8, 1.6));
    d.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:${pick(['#d9a066', '#b07a43', '#f3e2c0'])};pointer-events:none`;
    layer.insertBefore(d, a.node);
    crumbs.push({ d, x: cx, y: cy, vx: rnd(-80, 80) * S, vy: -rnd(40, 160) * S, life: rnd(.6, 1) });
  };

  return {
    awake: () => state !== 'gone',
    boxed: true,
    tick(dt) {
      const sp = spot();
      if (copy && !copy.fixed) { copy.el.style.left = (copy.x - scrollX) + 'px'; copy.el.style.top = (copy.y - scrollY) + 'px'; }
      if (state === 'guard') {
        if (!el.isConnected) { a.node.style.opacity = '0'; return; }
        const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .82;
        a.x = sp.x + a.w / 2 + Math.max(0, sp.w - a.w) * at; a.y = sp.y; a.face = -1;
        sniffT -= dt;
        if (sniffT < 0) { sniffT = rnd(2, 4); if (chance(.4)) a.say(pick(['...', 'heart']), 700); }
        a.play('idle');
      } else if (state === 'eat') {
        /* walk to the next bite and take it */
        const p = path[Math.min(step, path.length - 1)];
        const tx = sp.x + p.x, ty = sp.y + p.y;
        if (x == null) x = a.x;
        const dx = tx - x;
        x += clamp(dx, -640 * S * dt, 640 * S * dt);
        a.x = x; a.y = ty; a.face = dx < 0 ? -1 : 1;
        biteT -= dt;
        if (Math.abs(dx) < 4 && biteT <= 0) {
          biteT = reduced() ? 0 : .03;
          const R = clamp(sp.h * .5, 18, 36);
          crumbBite(mg, (tx - sp.x + a.face * 6) / 4, (ty - sp.y) / 4, Math.ceil(R / 4) + 1);
          if (step % 2 === 0) crumb(tx, ty);
          step++;
          if (step >= path.length) {
            copy.el.remove(); copy = null; state = 'full'; leaveT = 1.6; a.say('heart', 1200);
            host.dispatchEvent(new CustomEvent('piix:eaten', { bubbles: true }));
            uiAnnounce('Cookie banner eaten');
          } else {
            const url = mask.toDataURL();
            copy.el.style.maskImage = copy.el.style.webkitMaskImage = `url(${url})`;
            copy.el.style.maskSize = copy.el.style.webkitMaskSize = '100% 100%';
          }
        }
        a.play(Math.abs(dx) > 6 ? 'walk' : 'chew');
      } else if (state === 'full') {
        leaveT -= dt; a.play('full');
        if (leaveT <= 0) { state = 'leave'; side = a.x > scrollX + docW() / 2 ? 1 : -1; }
      } else if (state === 'leave') {
        a.face = side; a.play('walk'); a.x += side * 160 * S * dt;
        a.y += 30 * S * dt;
        if (a.x < scrollX - a.w || a.x > scrollX + docW() + a.w) { state = 'gone'; a.node.style.opacity = '0'; }
      }
      for (let i = crumbs.length - 1; i >= 0; i--) {
        const c = crumbs[i];
        c.life -= dt; c.vy += 900 * S * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        c.d.style.opacity = Math.max(0, c.life).toFixed(2);
        c.d.style.transform = `translate3d(${Math.round(c.x - origin.x)}px,${Math.round(c.y - origin.y)}px,0)`;
        if (c.life <= 0) { c.d.remove(); crumbs.splice(i, 1); }
      }
    },
    poke() { if (state === 'guard') { a.say('heart', 700); a.oy = 0; } },
    destroy() { document.removeEventListener('click', click, true); if (copy) copy.el.remove(); crumbs.forEach(c => c.d.remove()); }
  };
});
