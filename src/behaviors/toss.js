/* toss: a toy you can throw around the page. It lands on real elements (headings,
 * paragraphs, buttons, cards…), rolls, falls off edges onto whatever is below, and can
 * be batted with a fast swipe of the cursor. Click it for a little kick.
 *
 *   land="css selector"   what counts as a surface (defaults to common content elements)
 *
 * Sprite options (spec.toss): { bounce, friction, spin, heavy, faces, squeak } */
const LAND = 'h1,h2,h3,h4,p,li,button,.btn,img,pre,blockquote,figure,footer,nav,header,table,.card,[data-piix-land]';
const platCache = { at: -1, sel: '', list: [] };
/* a surface: text elements use their first line's glyph tops, everything else its box */
const TEXTY = /^(H[1-6]|P|LI|BLOCKQUOTE|DT|DD|FIGCAPTION|LABEL)$/;
const surfaceOf = el => {
  const r = el.getBoundingClientRect();
  if (r.width <= 8 || r.height <= 2 || r.bottom < -400 || r.top > innerHeight + 2000) return null;
  if (TEXTY.test(el.tagName)) {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter(q => q.width > 1);
    if (rs.length) {
      const top = rs[0].top, line = rs.filter(q => q.top - top < 4);
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      return { el, l: Math.min(...line.map(q => q.left)) + scrollX, r: Math.max(...line.map(q => q.right)) + scrollX, t: top + scrollY + (line[0].height - fs) / 2 + fs * .26 };
    }
  }
  return { el, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY };
};
/* every surface's top edge in doc coords, measured at most once per frame for everyone */
const platforms = (sel, extra) => {
  const t = Math.floor(now() / 16);
  if (platCache.at !== t || platCache.sel !== sel) {
    platCache.at = t; platCache.sel = sel;
    let els = [];
    try { els = [...document.querySelectorAll(sel)]; } catch (_) { /* bad selector */ }
    platCache.list = els.map(surfaceOf).filter(Boolean);
  }
  if (extra) { const p = surfaceOf(extra); return p ? platCache.list.concat(p) : platCache.list; }
  return platCache.list;
};

defineBehavior('toss', (a, [el], host) => {
  const P = a.spec.toss || {};
  const S = a.s / 4;
  const G = 2600 * S;
  const bounce = P.bounce ?? .45, friction = P.friction ?? 3, spin = P.spin ?? 0;
  const sel = host.getAttribute('land') || LAND;
  let state = 'rest', vx = 0, vy = 0, on = null, offset = 0, placed = false, settle = 0;
  if (spin) a.cv.style.transformOrigin = '50% 50%';

  /* box="selector" keeps it inside one element: its walls, ceiling and floor */
  const boxEl = boxOf(host);
  const B = () => boxEl ? rectOf(boxEl) : null;
  const floorY = () => { const b = B(); return b ? b.b - 3 : document.documentElement.scrollHeight - 1; };
  const minX = () => { const b = B(); return (b ? b.l : 0) + a.w / 2; };
  const maxX = () => { const b = B(); return (b ? b.r : docW()) - a.w / 2; };
  const inBox = p => { const b = B(); return !b || (p.t > b.t && p.t < b.b && p.r > b.l && p.l < b.r); };
  const fly = (nvx, nvy) => { state = 'air'; vx = nvx; vy = nvy; on = null; if (a.has('roll')) a.play('roll'); };
  const land = (p, impact) => {
    a.y = p ? p.t : floorY();
    if (impact > 420 * Math.sqrt(S) && bounce > 0) {
      vy = -impact * bounce; vx *= .85;
      a.sy = 1 - clamp(impact / 4000, .08, .3); a.sx = 2 - a.sy;
    } else {
      state = 'rest'; vy = 0; on = p; offset = p ? a.x - p.l : 0;
      a.sy = .85; a.sx = 1.15;
      if (P.faces) { a.play('f' + (1 + ((Math.random() * 6) | 0))); a.rot = 0; }
      else if (a.has('idle')) a.play('idle');
    }
    if (impact > 300 * Math.sqrt(S)) {
      if (p && typeof p.el.piixImpact === 'function') p.el.piixImpact(a.x, a.y, clamp(impact / 1400, .3, 1.6));
      if (impact > 700 * Math.sqrt(S)) shout(a, 'thud', (P.heavy ? 260 : 150) * S);
      if (P.squeak && chance(.7)) a.say(pick(['!', 'note', '!?']), 600);
    }
  };

  return {
    tick(dt) {
      if (!placed) {
        const r = surfaceOf(el) || { el, ...rectOf(el) }, at = host.getAttribute('at');
        a.x = r.l + (r.r - r.l) * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8)); a.y = r.t;
        on = r; offset = a.x - r.l; placed = true;
        if (P.faces) a.play('f' + (1 + ((Math.random() * 6) | 0)));
      }
      if (state === 'held') return;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced()) return;

      /* a fast swipe of the cursor bats it */
      const speed = Math.hypot(ptr.vx, ptr.vy);
      if (ptr.seen && speed > 900 && now() - ptr.last < 50 && a.near(10 * S)) {
        fly(clamp(ptr.vx * .55, -1800, 1800), Math.min(clamp(ptr.vy * .5, -1600, 600), -320 * S));
        if (P.squeak) a.say('!', 400);
      }

      if (state === 'rest') {
        /* ride along with the surface it sits on; roll to a stop */
        if (on) {
          const p = surfaceOf(on.el);
          if (!p) { fly(vx, 0); return; }
          offset += vx * dt;
          on = p; a.x = on.l + offset; a.y = on.t;
          if (a.x < on.l - a.w * .25 || a.x > on.r + a.w * .25) { fly(vx, 0); return; }
        } else { a.x += vx * dt; a.y = floorY(); }
        vx *= Math.exp(-friction * dt);
        if (Math.abs(vx) < 4) vx = 0;
        if (spin) a.rot += vx * dt / (a.w / 2) * 57.3 * spin;
        else a.rot = lerp(a.rot, 0, .2);
        a.x = clamp(a.x, minX(), maxX());
        return;
      }

      /* in the air */
      const y0 = a.y;
      vy = Math.min(vy + G * dt, 3200);
      a.x += vx * dt; a.y += vy * dt;
      if (a.x < minX()) { a.x = minX(); vx = Math.abs(vx) * .6; }
      if (a.x > maxX()) { a.x = maxX(); vx = -Math.abs(vx) * .6; }
      const bx = B();
      if (bx && a.y - a.h < bx.t) { a.y = bx.t + a.h; vy = Math.abs(vy) * .5; }
      a.rot += (spin ? vx * dt / (a.w / 2) * 57.3 * spin : vx * dt * .6);
      if (vy > 0) {
        let best = null;
        for (const p of platforms(sel, el)) {
          if (a.x < p.l + 2 || a.x > p.r - 2 || !inBox(p)) continue;
          if (p.t >= y0 - 1 && p.t <= a.y && (!best || p.t < best.t)) best = p;
        }
        if (best) land(best, vy);
        else if (a.y >= floorY()) land(null, vy);
      }
      settle += dt;
    },
    grab(e) {
      drag(a, e, {
        move: (x, y) => {
          state = 'held'; a.x = x; a.y = y + a.h * .4;
          const b = B(); if (b) { a.x = clamp(a.x, minX(), maxX()); a.y = clamp(a.y, b.t + a.h, floorY()); }
          vx = vy = 0; if (a.has('held')) a.play('held'); },
        end: ({ moved, vx: tx, vy: ty }) => {
          if (!moved) { fly(rnd(-160, 160) * S, -rnd(520, 700) * Math.sqrt(S)); if (P.squeak) a.say('note', 500); return; }
          fly(tx, ty);
        }
      });
    },
    poke() { fly(rnd(-160, 160) * S, -600 * Math.sqrt(S)); },
    hear(type, from, d) { if (type === 'thud' && state === 'rest' && !P.heavy) fly((a.x - from.x) * 2, -260 * S); }
  };
});
