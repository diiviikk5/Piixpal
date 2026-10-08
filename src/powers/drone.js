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

/* the cart's little "got it" bounce */
const droneBump = el => {
  try { el.animate([{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.12)' }, { transform: 'translateY(1px) scale(.96)' }, { transform: 'none' }], { duration: 420, easing: 'ease-out' }); } catch (_) { /* old browsers */ }
};

/* add one to the cart's counter, if it has one */
const droneCount = (cart, sel) => {
  let n = null;
  try { n = cart.querySelector(sel || '.count,[data-count]'); } catch (_) { /* bad selector */ }
  if (!n) return;
  const v = parseInt(n.textContent, 10);
  if (!isNaN(v)) n.textContent = String(v + 1);
};

/* cart: carry every "add to cart" to the cart, one parcel at a time */
defineBehavior('cart', (a, [cart], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const pinned = !boxEl;
  if (pinned) pin(a);
  const parcel = recruit(a, '_parcel');
  if (pinned) pin(parcel);
  parcel.node.style.opacity = '0';
  const sel = host.getAttribute('from') || '.add-to-cart,[data-add-to-cart]';
  const jobs = [];
  let job = null, phase = 'idle', t = 0, p0 = null, bob = 0, x = null, y = null, swing = 0;
  const place = (el2, cx, cy, w, h) => { el2.style.width = w + 'px'; el2.style.height = h + 'px'; el2.style.transform = `translate3d(${Math.round(cx - w / 2 - origin.x)}px,${Math.round(cy - h / 2 - origin.y)}px,0)`; };
  const homeAt = () => { const r = droneRect(cart, pinned); return { x: r.r - a.w * .2, y: r.t - 8 * S }; };
  const click = e => {
    const btn = e.target.closest && e.target.closest(sel);
    if (!btn || (boxEl && !boxEl.contains(btn))) return;
    const cargo = droneCargo(btn);
    if (cargo) { cargo.el.style.position = pinned ? 'fixed' : 'absolute'; cargo.el.style.opacity = '0'; a.node.parentNode.appendChild(cargo.el); }
    jobs.push({ btn, cargo });
  };
  document.addEventListener('click', click, true);

  return {
    crew: [parcel],
    boxed: true,
    awake: () => true,
    tick(dt) {
      const R = reduced(), H = homeAt();
      if (x == null) { x = H.x; y = H.y; }
      bob += dt;
      const speed = jobs.length > 1 ? 1.5 : 1;
      t += dt * speed / (R ? .05 : 1);
      if (!job && jobs.length) { job = jobs.shift(); phase = 'go'; t = 0; p0 = { x, y }; }
      let size = 0, cx = 0, cy = 0;
      if (job) {
        const b = droneRect(job.btn, pinned);
        const img = job.cargo && job.cargo.from.isConnected ? droneRect(job.cargo.from, pinned) : b;
        const pick = { x: img.x, y: img.t - 6 * S };
        if (phase === 'go') {
          const k = Math.min(1, t / .45), e = k * k * (3 - 2 * k);
          x = lerp(p0.x, pick.x, e); y = lerp(p0.y, pick.y, e) - Math.sin(Math.PI * k) * 40 * S;
          if (k >= 1) { phase = 'grab'; t = 0; }
        } else if (phase === 'grab') {
          /* the picture lifts off its card and shrinks into the claws */
          const k = Math.min(1, t / .3);
          x = pick.x; y = pick.y - k * 6 * S;
          size = lerp(Math.min(img.w, img.h, 120), 34 * S, k);
          cx = lerp(img.x, x, k); cy = lerp(img.y, y + size / 2 + 4 * S, k);
          if (k >= 1) { phase = 'carry'; t = 0; p0 = { x, y }; }
        } else if (phase === 'carry') {
          const k = Math.min(1, t / .65), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const to = { x: H.x - a.w * .3, y: H.y - 18 * S };
          x = lerp(p0.x, to.x, e); y = lerp(p0.y, to.y, e) - Math.sin(Math.PI * k) * 60 * S;
          swing = Math.sin(k * Math.PI * 3) * (1 - k) * 14;
          size = 34 * S; cx = x - swing * .4; cy = y + size / 2 + 4 * S;
          if (k >= 1) { phase = 'drop'; t = 0; p0 = { x, y }; }
        } else if (phase === 'drop') {
          /* down into the cart: the parcel shrinks away, the cart bounces */
          const c = droneRect(cart, pinned), k = Math.min(1, t / .35);
          size = 34 * S * (1 - k); cx = x; cy = lerp(y + 17 * S, c.y, k);
          y = p0.y + Math.sin(Math.PI * k) * 6 * S;
          if (k >= 1) {
            droneBump(cart); droneCount(cart, host.getAttribute('count'));
            const detail = { button: job.btn };
            host.dispatchEvent(new CustomEvent('piix:delivered', { bubbles: true, detail }));
            cart.dispatchEvent(new CustomEvent('piix:delivered', { detail }));
            uiAnnounce('Added to cart');
            if (job.cargo) job.cargo.el.remove();
            a.say('check', 700);
            job = null; phase = 'back'; t = 0; p0 = { x, y };
          }
        }
        if (job && job.cargo) {
          const show = phase !== 'go' && size > 1;
          job.cargo.el.style.opacity = show ? '1' : '0';
          if (show) place(job.cargo.el, cx, cy, size, size);
          parcel.node.style.opacity = '0';
        } else if (job) {
          const show = phase !== 'go' && size > 1;
          parcel.node.style.opacity = show ? '1' : '0';
          parcel.x = cx; parcel.y = cy + parcel.h / 2;
        }
      } else {
        parcel.node.style.opacity = '0';
        if (phase === 'back') {
          const k = Math.min(1, t / .5), e = 1 - Math.pow(1 - k, 3);
          x = lerp(p0.x, H.x, e); y = lerp(p0.y, H.y, e);
          if (k >= 1) phase = 'idle';
        } else { x = lerp(x, H.x, .2); y = lerp(y, H.y, .2); }
      }
      a.x = x; a.y = y + (R ? 0 : Math.sin(bob * 3) * 3 * S);
      a.rot = job ? clamp((x - (a._px ?? x)) / Math.max(dt, .001) * .01, -14, 14) : 0;
      a._px = x;
      a.cv.style.transformOrigin = '50% 30%';
      a.play(job && (phase === 'grab' || phase === 'carry' || phase === 'drop') ? 'carry' : 'idle');
    },
    poke() { a.say('heart', 600); },
    destroy() {
      document.removeEventListener('click', click, true);
      jobs.forEach(j => j.cargo && j.cargo.el.remove());
      if (job && job.cargo) job.cargo.el.remove();
    }
  };
});
