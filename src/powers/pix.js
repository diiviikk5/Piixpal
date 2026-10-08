/* PIX: play your page. A tiny hero in a red headband who can run and jump on your
 * headings, paragraphs, buttons and images. Click Pix to take control:
 *   ← → (or A D) run · ↑ W or Space jump, hold for higher, jump again in the air
 *   ↓ drops through a platform · Esc stops
 * Coins appear on your links and buttons; collect them all. Gamepads and touch work too.
 *
 *   coins="10"          how many coins to hide (0 = none)
 *   land="selector"     what counts as a platform (defaults to text, buttons, images, cards)
 *   play="click|keys"   keys: arrow keys start the game too (when nothing else has focus)
 *
 * Events: piix:play, piix:coin { got, total }, piix:win, piix:stop  */
(() => {
  const W = 17, H = 15;
  const TAILS = [
    [[3, 4], [2, 5], [3, 5], [2, 6]],
    [[3, 3], [2, 3], [1, 2], [3, 4], [2, 4]],
    [[3, 3], [2, 4], [1, 4], [3, 4], [2, 3]],
    [[3, 3], [2, 2], [1, 1], [3, 4], [2, 3]]
  ];
  const frame = ({ by = 0, tail = 0, feet = [], eyes = 'open' }) => {
    let rows = art.paint(W, H, (x, y) => {
      const yy = y - by;
      if (!art.ellipse(x, yy, 9.5, 7, 5.7, 5.4)) return null;
      return yy === 3 || yy === 4 ? 'r' : 'b';
    });
    rows = art.volume(rows);
    for (const [tx, ty] of TAILS[tail]) rows = art.put(rows, tx, ty + by, ['r']);
    rows = art.outline(rows);
    const ey = 6 + by;
    if (eyes === 'open') rows = art.compose(rows, [10, ey, ['e', 'e']], [13, ey, ['e', 'e']]);
    else if (eyes === 'shut') rows = art.compose(rows, [10, ey + 1, ['e']], [13, ey + 1, ['e']]);
    else if (eyes === 'happy') rows = art.compose(rows, [9, ey, ['_e_', 'e_e']], [12, ey, ['_e_', 'e_e']]);
    else if (eyes === 'wide') rows = art.compose(rows, [10, ey - 1, ['e', 'e', 'e']], [13, ey - 1, ['e', 'e', 'e']]);
    rows = art.compose(rows, [9, ey + 2, ['p']], [14, ey + 2, ['p']], [11, ey + 3, ['ee']]);
    for (const [fx, fy] of feet) rows = art.put(rows, fx, fy, ['k']);
    return rows;
  };
  const STAND = [[6, 13], [7, 13], [11, 13], [12, 13]];
  const PAL = { k: '#17121f', b: '#c6f432', d: '#8cc21e', B: '#effcb3', r: '#ff4d6d', e: '#17121f', p: '#ff9fb5' };
  defineSprite('pix', {
    w: W, h: H, scale: 3, does: 'player',
    palette: PAL,
    frames: {
      idle: [frame({ feet: STAND }), frame({ feet: STAND, tail: 0 }), frame({ feet: STAND, eyes: 'shut' }), frame({ feet: STAND })],
      run: [
        frame({ by: -1, tail: 1, feet: [[5, 12], [6, 12], [12, 12], [13, 12]] }),
        frame({ by: 0, tail: 2, feet: [[7, 13], [8, 13], [10, 13], [11, 13]] }),
        frame({ by: -1, tail: 1, feet: [[6, 12], [7, 12], [11, 12], [12, 12]] }),
        frame({ by: 0, tail: 2, feet: [[6, 13], [7, 13], [12, 13], [13, 13]] })
      ],
      jump: [frame({ by: -1, tail: 3, feet: [[7, 12], [8, 12], [10, 12], [11, 12]] })],
      fall: [frame({ tail: 3, eyes: 'wide', feet: [[5, 13], [6, 13], [12, 13], [13, 13]] })],
      happy: [frame({ feet: STAND, eyes: 'happy' }), frame({ by: -1, tail: 3, eyes: 'happy', feet: [[6, 12], [7, 12], [11, 12], [12, 12]] })]
    },
    fps: { idle: 1.5, run: 12, happy: 5 }
  });

  /* coins: a spinning gold piece (crew only) */
  const coin = [
    ['.kkkk.', 'kyYYyk', 'kYyyok', 'kYyyok', 'kYyyok', 'kyyook', '.kkkk.'],
    ['.kkk..', '.kYyk.', '.kYyk.', '.kYyk.', '.kYyk.', '.kyok.', '.kkk..'],
    ['..kk..', '..ky..', '..ky..', '..ky..', '..ky..', '..ko..', '..kk..'],
    ['..kkk.', '.kyYk.', '.kyYk.', '.kyYk.', '.kyYk.', '.koyk.', '..kkk.']
  ];
  defineSprite('_coin', {
    w: 6, h: 7, scale: 3,
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff3a8', o: '#e8a213' },
    frames: { spin: coin, flat: [coin[0]] },
    fps: { spin: 8 }
  });
})();

ICONS.play = ['k...', 'kk..', 'kkk.', 'kkkk', 'kkk.', 'kk..', 'k...'];

/* player: the platformer brain behind Pix. Platforms are every line of text and the top
 * of every button, image and card; they're one-way, so you jump up through them. */
const PIX_PLAYERS = new Set();
const PIX_KEYS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', Space: 'u', ArrowDown: 'd', KeyS: 'd' };
const pixEditable = t => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
/* scroll without the page's smooth-scrolling getting in the way */
const pixScrollTo = y => {
  const h = document.documentElement, was = h.style.scrollBehavior;
  h.style.scrollBehavior = 'auto';
  window.scrollTo(scrollX, y);
  h.style.scrollBehavior = was;
};
defineBehavior('player', (a, [el], host) => {
  const S = a.s / 3;
  const boxEl = boxOf(host);
  const sel = host.getAttribute('land') || LAND;
  const nCoins = host.hasAttribute('coins') ? clamp(Math.round(+host.getAttribute('coins') || 0), 0, 40) : 10;
  const RUN = 215 * S, ACC = 1800 * S, AIR = 1150 * S, DEC = 2300 * S, G = 2350 * S, JUMP = 745 * S, CUT = 260 * S, MAXF = 1300 * S;
  let playing = false, placed = false, vx = 0, vy = 0, ground = null, coyote = 0, buffer = 0, jumps = 0, dropT = 0;
  let spin = 0, platT = 0, plats = [], bumps = [], hintT = 0, happyT = 0, prevU = false, jumpTap = false;
  const keys = new Set(), touch = {};
  const crew = [], coins = [];
  let hud = null, pad = null, got = 0, total = 0;

  /* ---- the level: every line of text, every box top ---- */
  const lines = (e, out) => {
    const rg = document.createRange();
    rg.selectNodeContents(e);
    const rs = [...rg.getClientRects()].filter(q => q.width > 2 && q.height > 2);
    if (!rs.length) return false;
    const fs = parseFloat(getComputedStyle(e).fontSize) || 16;
    const ls = [];
    for (const q of rs) {
      const L = ls.find(l => Math.min(l.b, q.bottom) - Math.max(l.t, q.top) > Math.min(l.b - l.t, q.height) * .5);
      if (L) { L.l = Math.min(L.l, q.left); L.r = Math.max(L.r, q.right); L.t = Math.min(L.t, q.top); L.b = Math.max(L.b, q.bottom); }
      else ls.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    for (const L of ls) out.push({ el: e, l: L.l + scrollX, r: L.r + scrollX, t: L.t + scrollY + (L.b - L.t - fs) / 2 + fs * .26 });
    return true;
  };
  const measure = () => {
    const out = [], bs = [];
    const root = boxEl || document;
    const lo = boxEl ? -1e9 : scrollY - innerHeight * 1.2, hi = boxEl ? 1e9 : scrollY + innerHeight * 2.2;
    let els = [];
    try { els = [...root.querySelectorAll(sel)]; } catch (_) { /* bad selector */ }
    for (const e of els) {
      if (e.closest('piix-pal,[data-piixpal]')) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 4 || r.bottom + scrollY < lo || r.top + scrollY > hi) continue;
      if (TEXTY.test(e.tagName) && lines(e, out)) continue;
      out.push({ el: e, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY });
    }
    try {
      for (const e of root.querySelectorAll('a[href],button,.btn,[data-piix-bump]')) {
        const r = e.getBoundingClientRect();
        if (r.width < 4 || r.bottom + scrollY < lo || r.top + scrollY > hi) continue;
        bs.push({ el: e, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY, b: r.bottom + scrollY, cool: 0 });
      }
    } catch (_) { /* ignore */ }
    for (const b of bs) { const old = bumps.find(o => o.el === b.el); if (old) b.cool = old.cool; }
    plats = out; bumps = bs;
  };
  const world = () => {
    if (boxEl) { const r = rectOf(boxEl); return { l: r.l + a.w / 2, r: r.r - a.w / 2, top: r.t + a.h, floor: r.b - 2 }; }
    return { l: a.w / 2, r: docW() - a.w / 2, top: -1e9, floor: document.documentElement.scrollHeight - 2 };
  };
  const groundAt = (x, y, W) => {
    let best = null;
    for (const p of plats) if (x >= p.l - 3 && x <= p.r + 3 && Math.abs(p.t - y) <= 6 && (!best || Math.abs(p.t - y) < Math.abs(best.t - y))) best = p;
    if (!best && Math.abs(W.floor - y) <= 6) best = { t: W.floor, l: -1e9, r: 1e9, floor: true };
    return best;
  };
  const land = (p, impact) => {
    a.y = p.t; ground = p; vy = 0; jumps = 0;
    if (spin) { spin = 0; a.rot = 0; a.cv.style.transformOrigin = ''; }
    if (impact > 520 * S) { a.sy = .76; a.sx = 1.24; }
    if (impact > 950 * S) shout(a, 'thud', 200 * S);
  };

  /* ---- coins ---- */
  const spawnCoins = () => {
    const cands = [];
    try {
      for (const e of (boxEl || document).querySelectorAll('a[href],button,.btn,h1,h2,h3,[data-piix-coin]')) {
        if (e.closest('piix-pal,[data-piixpal]')) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 12 || r.height < 6) continue;
        if (!boxEl && (r.bottom < -innerHeight * .3 || r.top > innerHeight * 1.3)) continue;
        cands.push(r);
      }
    } catch (_) { /* ignore */ }
    for (let i = cands.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cands[i], cands[j]] = [cands[j], cands[i]]; }
    const B = boxEl && rectOf(boxEl);
    for (const r of cands) {
      if (coins.length >= nCoins) break;
      const x = r.left + scrollX + rnd(.2, .8) * r.width;
      let y = r.top + scrollY - 14 * S;
      /* not right where Pix is standing: that one would be free */
      if (Math.abs(x - a.x) < 50 * S && Math.abs(y - a.y) < 60 * S) continue;
      const c = recruit(a, '_coin');
      if (B) y = Math.max(y, B.t + c.h + 4);
      c.x = x; c.y = y; c.play('spin', { fps: rnd(7, 10) });
      coins.push({ c, x, y, ph: rnd(0, 6.28), t: -1 });
      crew.push(c);
    }
    got = 0; total = coins.length;
  };
  const collect = k => {
    if (k.t >= 0) return;
    k.t = 0; got++;
    host.dispatchEvent(new CustomEvent('piix:coin', { bubbles: true, detail: { got, total } }));
    hudUpdate();
    if (got === total && total) {
      happyT = 2.4; a.say('star', 2200);
      host.dispatchEvent(new CustomEvent('piix:win', { bubbles: true, detail: { total } }));
      uiAnnounce(`All ${total} coins!`);
    }
  };

  /* ---- HUD and touch pad ---- */
  const hudUpdate = () => {
    if (!hud) return;
    hud.querySelector('.n').textContent = total ? (got === total ? `all ${total} coins!` : `${got} / ${total} coins`) : 'free play';
  };
  const placeHud = () => {
    if (!hud) return;
    /* in a box: top-left of the box; on the page: the bottom-left of the screen */
    const r = boxEl ? rectOf(boxEl) : { l: origin.x, t: origin.y, r: origin.x + docW(), b: origin.y + innerHeight };
    if (boxEl) uiAt(hud, r.l + 10, r.t + 10); else uiAt(hud, r.l + 14, r.b - hud.offsetHeight - 14);
    if (pad) uiAt(pad, r.r - pad.offsetWidth - (boxEl ? 10 : 14), r.b - pad.offsetHeight - (boxEl ? 10 : 14));
  };
  const showHud = () => {
    hud = uiCard({ fixed: !boxEl, attrs: { role: 'group', 'aria-label': 'Pix controls' } });
    hud.style.padding = '9px 11px';
    hud.append(
      uiEl('div', { cls: 'ic', style: 'align-items:center;gap:8px' }, uiIcon('play', 2), uiEl('b', { cls: 'n', text: '' }),
        uiEl('button', { text: 'Stop', attrs: { type: 'button' }, style: 'margin-left:auto;padding:6px 9px', on: { click: () => me.stop() } })),
      uiEl('div', { text: '← → run · ↑ jump · ↓ drop · Esc', style: `margin-top:6px;font:600 11px/1 ${UI_MONO};color:#6c6477` })
    );
    hudUpdate();
    if (matchMedia('(pointer: coarse)').matches) {
      pad = uiCard({ fixed: !boxEl, attrs: { role: 'group', 'aria-label': 'Touch controls' } });
      pad.style.cssText += ';padding:8px;display:flex;gap:8px;touch-action:none;user-select:none;-webkit-user-select:none';
      for (const [k, label] of [['l', '◀'], ['r', '▶'], ['u', '▲']]) {
        const b = uiEl('button', { text: label, attrs: { type: 'button', 'aria-label': { l: 'left', r: 'right', u: 'jump' }[k] }, style: 'width:54px;height:54px;font-size:20px;touch-action:none' });
        const on = e => { e.preventDefault(); touch[k] = true; if (k === 'u') jumpTap = true; try { b.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } };
        const off = () => { touch[k] = false; };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
        pad.appendChild(b);
      }
    }
    placeHud();
  };

  /* ---- start / stop ---- */
  const me = {
    get playing() { return playing; },
    start() {
      if (playing) return;
      PIX_PLAYERS.forEach(p => p !== me && p.stop());
      playing = true;
      measure(); spawnCoins(); showHud();
      vy = -JUMP * .55; ground = null; a.say('!', 600);
      host.dispatchEvent(new CustomEvent('piix:play', { bubbles: true }));
      uiAnnounce('Playing Pix. Arrow keys to run and jump, Escape to stop.' + (total ? ` ${total} coins to find.` : ''));
    },
    stop() {
      if (!playing) return;
      playing = false; keys.clear(); for (const k in touch) touch[k] = false;
      coins.splice(0).forEach(k => k.c.destroy()); crew.length = 0;
      uiClose(hud); uiClose(pad); hud = pad = null;
      host.dispatchEvent(new CustomEvent('piix:stop', { bubbles: true, detail: { got, total } }));
    }
  };
  PIX_PLAYERS.add(me);
  const kd = e => {
    if (pixEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = PIX_KEYS[e.code];
    if (!playing) {
      if (!k || host.getAttribute('play') !== 'keys') return;
      const r = boxEl ? boxEl.getBoundingClientRect() : null;
      const seen = r ? r.bottom > 0 && r.top < innerHeight : a.y > scrollY && a.y - a.h < scrollY + innerHeight;
      if (!seen || [...PIX_PLAYERS].some(p => p.playing)) return;
      me.start();
    }
    if (e.key === 'Escape') { me.stop(); return; }
    if (!k) return;
    e.preventDefault();
    if (k === 'u' && !e.repeat) jumpTap = true;
    keys.add(k);
  };
  const ku = e => { const k = PIX_KEYS[e.code]; if (k) keys.delete(k); };
  const blur = () => keys.clear();
  addEventListener('keydown', kd);
  addEventListener('keyup', ku);
  addEventListener('blur', blur);

  let gpStart = false, gpJump = false;
  const gamepad = () => {
    const gps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const g = gps[0];
    if (!g) return null;
    const b = i => !!(g.buttons[i] && g.buttons[i].pressed);
    return { l: g.axes[0] < -.35 || b(14), r: g.axes[0] > .35 || b(15), u: b(0) || b(12), d: g.axes[1] > .6 || b(13), start: b(9) };
  };

  return {
    crew,
    awake: () => playing,
    start: () => me.start(),
    stop: () => me.stop(),
    get playing() { return playing; },
    tick(dt) {
      const W0 = world();
      if (!placed) {
        const r = surfaceOf(el) || rectOf(el), at = host.getAttribute('at');
        a.x = clamp(r.l + (r.r - r.l) * (at != null ? clamp(+at, 0, 1) : .5), W0.l, W0.r); a.y = r.t;
        placed = true; measure(); ground = groundAt(a.x, a.y, W0);
      }
      platT -= dt;
      if (platT <= 0) { measure(); platT = playing ? .25 : .7; }

      /* input: keys, touch pad, gamepad */
      const gp = gamepad();
      if (gp && gp.start && !gpStart && !playing) me.start();
      if (gp && gp.u && !gpJump && playing) jumpTap = true;
      gpStart = !!(gp && gp.start); gpJump = !!(gp && gp.u);
      const inp = playing
        ? { l: keys.has('l') || touch.l || (gp && gp.l), r: keys.has('r') || touch.r || (gp && gp.r), u: keys.has('u') || touch.u || (gp && gp.u), d: keys.has('d') || touch.d || (gp && gp.d) }
        : {};
      const tap = jumpTap;
      jumpTap = false;

      /* run */
      const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (dir) { vx = clamp(vx + dir * (ground ? ACC : AIR) * dt, -RUN, RUN); a.face = dir; }
      else if (ground) { const dv = DEC * dt; vx = Math.abs(vx) <= dv ? 0 : vx - Math.sign(vx) * dv; }
      else vx *= Math.exp(-1.5 * dt);

      /* jump: buffered, with coyote time, and one flip in the air */
      if (tap) buffer = .13;
      buffer -= dt;
      coyote = ground ? .09 : coyote - dt;
      if (buffer > 0 && (coyote > 0 || jumps < 2)) {
        const first = coyote > 0;
        vy = -JUMP * (first ? 1 : .86);
        jumps = first ? 1 : 2; ground = null; coyote = 0; buffer = 0;
        a.sy = 1.2; a.sx = .84;
        if (!first) { spin = 1; a.cv.style.transformOrigin = '50% 55%'; }
      }
      if (playing && !inp.u && vy < -CUT) vy = -CUT;
      if (inp.d && ground && !ground.floor) { ground = null; dropT = .24; vy = 60 * S; }
      dropT -= dt;

      /* move */
      const y0 = a.y;
      a.x += vx * dt;
      if (a.x < W0.l) { a.x = W0.l; vx = 0; }
      if (a.x > W0.r) { a.x = W0.r; vx = 0; }
      if (ground) {
        const p = groundAt(a.x, a.y, W0);
        if (p) { a.y = p.t; ground = p; } else ground = null;
      }
      if (!ground) {
        vy = Math.min(vy + G * dt, MAXF);
        a.y += vy * dt;
        if (a.y - a.h < W0.top) { a.y = W0.top + a.h; vy = Math.max(vy, 0); }
        if (vy < 0) {
          /* bonk links and buttons from below; a coin sitting on one pops out */
          const head = a.y - a.h, head0 = y0 - a.h;
          for (const b of bumps) {
            if (b.cool > 0 || a.x < b.l || a.x > b.r || !(b.b <= head0 && b.b >= head)) continue;
            b.cool = .4;
            try { b.el.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-6 * S}px)` }, { transform: 'translateY(0)' }], { duration: 200, easing: 'ease-out' }); } catch (_) { /* old browsers */ }
            for (const k of coins) if (k.t < 0 && k.x >= b.l - 6 && k.x <= b.r + 6 && k.y <= b.t + 4 && k.y >= b.t - 60 * S) collect(k);
          }
        } else {
          let best = null;
          for (const p of plats) {
            if (a.x < p.l - 3 || a.x > p.r + 3) continue;
            if (dropT > 0 && p.t <= y0 + 8) continue;
            if (p.t >= y0 - .5 && p.t <= a.y && (!best || p.t < best.t)) best = p;
          }
          if (!best && a.y >= W0.floor) best = { t: W0.floor, l: -1e9, r: 1e9, floor: true };
          if (best) land(best, vy);
        }
      }
      for (const b of bumps) b.cool -= dt;

      /* the camera follows while playing */
      if (playing && !boxEl) {
        const sy = a.y - a.h / 2 - scrollY, top = innerHeight * .3, bot = innerHeight * .7;
        const want = sy < top ? sy - top : sy > bot ? sy - bot : 0;
        if (Math.abs(want) > 1) pixScrollTo(scrollY + (reduced() ? want : want * Math.min(1, dt * 7)));
      }

      /* coins: bob, get collected, fly up and fade */
      for (let i = coins.length - 1; i >= 0; i--) {
        const k = coins[i];
        if (k.t < 0) {
          k.ph += dt * 3;
          k.c.x = k.x; k.c.y = k.y + Math.sin(k.ph) * 2 * S;
          if (Math.abs(k.c.x - a.x) < (a.w + k.c.w) * .42 && k.c.y > a.y - a.h - 2 && k.c.y - k.c.h < a.y + 2) collect(k);
        } else {
          k.t += dt;
          k.c.y = k.y - k.t * 120 * S; k.c.play('spin', { fps: 24 });
          k.c.node.style.opacity = Math.max(0, 1 - k.t / .45).toFixed(2);
          if (k.t > .45) { k.c.destroy(); coins.splice(i, 1); crew.splice(crew.indexOf(k.c), 1); }
        }
      }

      /* look */
      a.sx = lerp(a.sx, 1, .22); a.sy = lerp(a.sy, 1, .22);
      if (spin > 0) { spin = Math.max(0, spin - dt * 3.2); a.rot = (1 - spin) * 360 * a.face; if (!spin) { a.rot = 0; a.cv.style.transformOrigin = ''; } }
      happyT -= dt;
      if (!ground) a.play(vy < 0 ? 'jump' : 'fall');
      else if (Math.abs(vx) > 18 * S) a.play('run', { fps: 7 + Math.abs(vx) / RUN * 7 });
      else if (happyT > 0) a.play('happy');
      else {
        a.play('idle');
        if (!playing && ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 140 * S) a.face = ptr.x < a.x ? -1 : 1;
      }
      if (!playing) {
        hintT -= dt;
        if (hintT <= 0 && a.near(24 * S)) { a.say('play', 1400); hintT = 4; }
      }
      placeHud();
    },
    poke() { if (playing) jumpTap = true; else me.start(); },
    hear(type) { if (type === 'thud' && ground && !playing) { vy = -260 * S; ground = null; } },
    destroy() {
      me.stop(); PIX_PLAYERS.delete(me);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', blur);
    }
  };
});
