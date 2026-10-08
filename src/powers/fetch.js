/* FETCH: a dog that plays fetch with your network requests. Whenever the page calls
 * fetch() (or XMLHttpRequest, so axios too), it perks up and races off; when the
 * response arrives it trots back with a bone. A failed request? It comes back with a
 * sock and a puzzled look. Quick ones just make it spin.
 *
 *   <piix-pal pal="fetch"></piix-pal>           sits on its element, watches every request
 *   match="/api/"                               only requests whose URL contains this
 *   Piixpal.busy(promise)                       send it off for any other async work */
(() => {
  const W = 18, H = 13;
  const dog = ({ legs = 'stand', tail = 0, by = 0, face = 'open', tilt = 0 }) => {
    let rows = art.paint(W, H, (x, y) => {
      const yy = y - by;
      const hy = yy + tilt;
      if (art.ellipse(x, hy, 13.4, 4.4, 2.8, 2.6)) return 'b';                          /* head */
      if (art.ellipse(x, hy, 15.9, 5.7, 1.7, 1.2)) return 'b';                          /* snout */
      if (art.ellipse(x, yy, 8.6, 7.3, 5.6, 2.7)) return 'b';                           /* body */
      const t = [[2, 2, 5], [1, 3, 6], [1, 5, 6]][tail];
      if (x >= t[0] && x <= t[0] + 1 && yy >= t[1] && yy <= t[2] && (x - t[0]) * 2 >= yy - t[2] - 1) return 'b';   /* tail */
      return null;
    });
    rows = art.volume(rows);
    rows = art.outline(rows);
    const L = { stand: [[4, 10], [6, 10], [10, 10], [12, 10]], a: [[3, 9], [5, 10], [11, 10], [13, 9]], b: [[5, 10], [7, 10], [9, 10], [11, 10]], c: [[4, 10], [6, 9], [10, 9], [12, 10]] }[legs];
    for (const [lx, ly] of L) rows = art.compose(rows, [lx, ly + by, ['k', 'k']]);
    const ty = 3 + by - tilt;
    rows = art.compose(rows,
      [11, ty, ['E', 'E', 'E']], [12, ty + 1, ['E', 'E']],                                   /* floppy ear */
      [17, ty + 2, ['n']],                                                                     /* nose */
      [11, 6 + by, ['r', 'r']], [12, 7 + by, ['y']]);                                         /* collar + tag */
    if (face === 'open') rows = art.put(rows, 14, ty + 1, ['e']);
    if (face === 'happy') rows = art.compose(rows, [13, ty + 1, ['e.e']], [14, ty, ['e']], [15, ty + 4, ['p', 'p']]);
    if (face === 'squint') rows = art.put(rows, 13, ty + 1, ['ee']);
    return rows;
  };
  defineSprite('fetch', {
    w: W, h: H, scale: 3, does: 'fetchdog',
    palette: { k: '#17121f', b: '#f2c48d', d: '#cf9558', B: '#ffe4bd', E: '#9a5a2e', n: '#17121f', e: '#17121f', r: '#ff4d6d', y: '#ffd23f', p: '#ff8fa3' },
    frames: {
      idle: [dog({ tail: 0 }), dog({ tail: 1 }), dog({ tail: 0 }), dog({ tail: 1, face: 'squint' })],
      run: [dog({ legs: 'a', tail: 2, by: -1 }), dog({ legs: 'b', tail: 2 }), dog({ legs: 'c', tail: 2, by: -1 }), dog({ legs: 'b', tail: 2 })],
      happy: [dog({ tail: 0, face: 'happy' }), dog({ tail: 1, face: 'happy' })],
      puzzled: [dog({ tilt: 1, tail: 2 })]
    },
    fps: { idle: 4, run: 14, happy: 8 }
  });
  /* what it brings back (crew only) */
  defineSprite('_fetched', {
    w: 11, h: 6, scale: 3,
    palette: { k: '#17121f', w: '#fffdf5', W: '#e2dccb', r: '#ff4d6d', R: '#c92a4b' },
    frames: {
      bone: [['.kk.....kk.', 'kwwkkkkkwwk', '.kwwwwwwWk.', 'kwwkkkkkWWk', '.kk.....kk.', '...........']],
      sock: [['...kkkk....', '...kwwk....', '...krrk....', '...krrkkk..', '...kRRRRk..', '....kkkk...']]
    }
  });
})();

/* every request on the page, told to every dog */
const FETCH_DOGS = new Set();
let fetchPatched = false;
const fetchSeen = (url, done) => FETCH_DOGS.forEach(d => d(url, done));
const fetchPatch = () => {
  if (fetchPatched) return;
  fetchPatched = true;
  const of = window.fetch;
  if (of) window.fetch = function (input) {
    const p = of.apply(this, arguments);
    try { fetchSeen(typeof input === 'string' ? input : (input && (input.url || input.href)) || '', p.then(r => r.ok, () => false)); } catch (_) { /* never break fetch */ }
    return p;
  };
  const X = window.XMLHttpRequest && XMLHttpRequest.prototype;
  if (X) {
    const open = X.open, send = X.send;
    X.open = function (m, url) { this.__piix = String(url); return open.apply(this, arguments); };
    X.send = function () {
      try { fetchSeen(this.__piix || '', new Promise(ok => this.addEventListener('loadend', () => ok(this.status >= 200 && this.status < 400), { once: true }))); } catch (_) { /* never break XHR */ }
      return send.apply(this, arguments);
    };
  }
};
/* for any other async work: Piixpal.busy(somePromise) */
Piixpal.busy = p => { fetchSeen('', Promise.resolve(p).then(() => true, () => false)); return p; };

defineBehavior('fetchdog', (a, [el], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const match = host.getAttribute('match');
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .25;
  const item = recruit(a, '_fetched');
  item.node.style.opacity = '0';
  let pending = 0, ok = true, started = 0, state = 'home', x = null, side = 1, dropT = 0, moodT = 0, mood = '', itemX = 0, itemY = 0, spin = 0;
  const seen = (url, done) => {
    if (match && url && !String(url).includes(match)) return;
    pending++;
    if (pending === 1) { ok = true; started = now(); }
    done.then(res => { ok = ok && res; pending = Math.max(0, pending - 1); });
  };
  FETCH_DOGS.add(seen);
  fetchPatch();
  const home = () => { const r = surfaceOf(el) || rectOf(el); return { x: r.l + a.w / 2 + Math.max(0, (r.r - r.l) - a.w) * at, y: r.t }; };
  /* where it runs off to: past the screen edge, or (in a box) to the box's edge, fading out */
  const edges = () => { if (boxEl) { const r = rectOf(boxEl); return { l: r.l + a.w / 2, r: r.r - a.w / 2, fade: true }; } return { l: scrollX - a.w, r: scrollX + docW() + a.w }; };

  return {
    crew: [item],
    boxed: true,
    awake: () => true,
    tick(dt) {
      const h = home(), E = edges(), R = reduced();
      if (x == null) x = h.x;
      const run = 380 * S * dt;
      if (state === 'home') {
        x = h.x;
        if (pending > 0) { state = 'go'; side = h.x > (E.l + E.r) / 2 ? 1 : -1; a.say('!', 500); a.oy = -8 * S; }
        a.oy = lerp(a.oy, 0, .25);
        if (moodT > 0) { moodT -= dt; a.play(mood); }
        else { a.play('idle'); if (ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 160 * S) a.face = ptr.x < a.x ? -1 : 1; }
      } else if (state === 'go') {
        a.face = side; a.play('run');
        x += side * run * (R ? 4 : 1);
        if (pending === 0) {
          if (now() - started < 350) { state = 'spin'; spin = 1; a.cv.style.transformOrigin = '50% 60%'; }
          else { state = 'back'; side = -side; }
        } else if (x > E.r || x < E.l) { state = 'away'; a.node.style.opacity = '0'; }
      } else if (state === 'away') {
        if (pending === 0) { state = 'back'; side = x > E.r - 1 ? -1 : 1; a.node.style.opacity = ''; }
      } else if (state === 'back') {
        a.face = side; a.play('run');
        x += side * run * (R ? 4 : 1);
        if ((side < 0 && x <= h.x) || (side > 0 && x >= h.x)) {
          x = h.x; state = 'home';
          dropT = 2.6; itemX = h.x + a.face * a.w * .45; itemY = h.y;
          mood = ok ? 'happy' : 'puzzled'; moodT = 1.8;
          a.say(ok ? 'heart' : '?', 1200);
        }
        item.play(ok ? 'bone' : 'sock');
      } else if (state === 'spin') {
        spin = Math.max(0, spin - dt * 2.2);
        a.rot = (1 - spin) * 360 * a.face; a.play('run');
        x = lerp(x, h.x, .2);
        if (!spin) { a.rot = 0; a.cv.style.transformOrigin = ''; state = 'home'; mood = 'happy'; moodT = .8; }
      }
      a.x = x; a.y = h.y;
      if (E.fade && state !== 'away') a.node.style.opacity = clamp(Math.min(x - E.l, E.r - x) / (30 * S), 0, 1).toFixed(2);
      /* the bone (or sock) rides in its mouth on the way back, then lies on the floor a while */
      if (state === 'back') {
        item.x = a.x + a.face * a.w * .42; item.y = a.y - a.h * .32; item.face = a.face;
        item.node.style.opacity = '';
      } else if (dropT > 0) {
        dropT -= dt;
        item.x = itemX; item.y = itemY;
        item.node.style.opacity = clamp(dropT / .6, 0, 1).toFixed(2);
      } else item.node.style.opacity = '0';
    },
    poke() { if (state === 'home') { mood = 'happy'; moodT = 1; a.say('heart', 700); a.oy = -10 * S; } },
    destroy() { FETCH_DOGS.delete(seen); }
  };
});
