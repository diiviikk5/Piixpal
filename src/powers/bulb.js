/* BULB: a pull-chain light switch for dark mode. A beaded chain hangs from the top of
 * the screen with a little bulb on the end. Pull it down and let go (or just click it):
 * click, the lights go out. The bulb glows while the lights are on, and a moth keeps
 * it company. It follows your theme too, if something else changes it.
 *
 *   toggle="class:dark"              toggle a class on the target (default)
 *   toggle="data-theme:dark|light"   or cycle an attribute; the first value is "lights off"
 *   target="selector"                what to toggle (default <html>)
 *   at=".9"   where across the screen it hangs, 0–1     length="120"   chain length in px
 *   top="0"   px from the top (clear a sticky header)
 *
 * Event: piix:toggle { dark, value } on the pal and on the target */
(() => {
  const W = 11, H = 15;
  const shape = art.paint(W, H, (x, y) => {
    if (x >= 4 && x <= 6 && y >= 1 && y <= 3) return y === 2 ? 'M' : 'm';
    if (art.ellipse(x, y, 5.5, 8.6, 4.6, 4.5)) return 'g';
    return null;
  });
  const base = art.compose(art.outline(shape), [3, 6, ['G']], [2, 7, ['GG']], [2, 8, ['G']]);
  const face = (rows, eyes) => {
    const e = { open: [[4, 8, ['e', 'e']], [7, 8, ['e', 'e']]], shut: [[4, 9, ['e']], [7, 9, ['e']]], happy: [[3, 8, ['_e_', 'e_e']], [6, 8, ['_e_', 'e_e']]], squeeze: [[3, 8, ['ee_', '_ee']], [6, 8, ['_ee', 'ee_']]] }[eyes];
    return art.compose(rows, ...e, [5, 11, ['ee']], [3, 10, ['p']], [8, 10, ['p']]);
  };
  const lit = r => art.swap(r, { g: 'y', G: 'Y' });
  defineSprite('bulb', {
    w: W, h: H, scale: 3, does: 'cord',
    palette: { k: '#17121f', e: '#17121f', m: '#b9b3c4', M: '#7d768a', g: '#d9d4e3', G: '#f3f0fa', y: '#ffe066', Y: '#fffbe0', p: '#ff9fb5' },
    frames: {
      on: [lit(face(base, 'open')), lit(face(base, 'open')), lit(face(base, 'shut')), lit(face(base, 'open'))],
      off: [face(base, 'shut')],
      pulled: [lit(face(base, 'squeeze'))],
      pulledOff: [face(base, 'squeeze')],
      happy: [lit(face(base, 'happy'))]
    },
    fps: { on: 1.2 }
  });
  /* the moth that loves the light (crew only) */
  defineSprite('_moth', {
    w: 7, h: 6, scale: 2,
    palette: { k: '#17121f', w: '#e3d3a8', W: '#8a7552' },
    frames: {
      fly: [['.......', '.W...W.', 'WwW.WwW', 'WwwkwwW', '.WWkWW.', '...k...'], ['.......', '.......', '...k...', 'WwwkwwW', 'WWWkWWW', '...k...']],
      rest: [['.......', '.k...k.', '..kkk..', '.WwkwW.', 'WwwkwwW', 'WWWkWWW']]
    },
    fps: { fly: 14 }
  });
})();

/* cord: a verlet chain from the top of the area down to the pal, which you pull */
defineBehavior('cord', (a, targets, host) => {
  const S = a.s / 3;
  const area = areaOf(host, a);
  const boxEl = boxOf(host);
  const spec = (host.getAttribute('toggle') || 'class:dark').split(':');
  const mode = spec[0], values = (spec[1] || 'dark').split('|');
  const tSel = host.getAttribute('target');
  let target = document.documentElement;
  if (tSel) try { target = host.closest(tSel) || document.querySelector(tSel) || target; } catch (_) { /* bad selector */ }
  const isDark = () => mode === 'class' ? target.classList.contains(values[0]) : target.getAttribute(mode) === values[0];
  const flip = () => {
    const dark = !isDark();
    if (mode === 'class') target.classList.toggle(values[0], dark);
    else if (dark) target.setAttribute(mode, values[0]);
    else if (values[1] != null) target.setAttribute(mode, values[1]);
    else target.removeAttribute(mode);
    const detail = { dark, value: mode === 'class' ? dark : target.getAttribute(mode) };
    host.dispatchEvent(new CustomEvent('piix:toggle', { bubbles: true, detail }));
    if (target !== host && !target.contains(host)) target.dispatchEvent(new CustomEvent('piix:toggle', { detail }));
    uiAnnounce(dark ? 'Lights off' : 'Lights on');
  };

  /* the chain */
  const N = 12;
  const len = (+host.getAttribute('length') || 120) * S;
  const L = len / N;
  const pts = Array.from({ length: N + 1 }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
  let anchor = null, held = null, pull = 0, tug = 0, moodT = 0, ready = false;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = `position:${boxEl ? 'absolute' : 'fixed'};left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none`;
  const chain = document.createElementNS(NS, 'polyline');
  chain.setAttribute('fill', 'none');
  chain.setAttribute('stroke', '#8b8597');
  chain.setAttribute('stroke-width', Math.max(2, Math.round(a.s * .9)));
  chain.setAttribute('stroke-dasharray', `${Math.max(2, a.s)} ${Math.max(1, Math.round(a.s * .7))}`);
  svg.appendChild(chain);
  a.node.parentNode.insertBefore(svg, a.node);

  const moth = recruit(a, '_moth');
  if (!boxEl) pin(moth);
  let mx = 0, my = 0, mt = rnd(0, 6);

  const anchorAt = () => {
    const r = area();
    const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .9;
    return { x: r.l + 24 * S + (r.w - 48 * S) * at, y: r.t + (+host.getAttribute('top') || 0) };
  };
  const lay = () => {
    anchor = anchorAt();
    pts.forEach((p, i) => { p.x = p.px = anchor.x; p.y = p.py = anchor.y + i * L; });
    mx = anchor.x; my = anchor.y + len;
    ready = true;
  };

  /* pull it: our own pointer handling, since the pal may be pinned to the viewport */
  const toLocal = e => boxEl ? { x: e.clientX + scrollX, y: e.clientY + scrollY } : { x: e.clientX + origin.x, y: e.clientY + origin.y };
  const down = e => {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation();
    try { a.cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const p = toLocal(e);
    held = { id: e.pointerId, sx: p.x, sy: p.y, moved: false, x: p.x, y: p.y + a.h * .2 };
  };
  const move = e => {
    if (!held || e.pointerId !== held.id) return;
    const p = toLocal(e);
    if (Math.hypot(p.x - held.sx, p.y - held.sy) > 4) held.moved = true;
    held.x = p.x; held.y = p.y + a.h * .2;
    if (boxEl) { const r = area(); held.x = clamp(held.x, r.l + a.w, r.r - a.w); held.y = clamp(held.y, r.t, r.b - a.h); }
  };
  const up = e => {
    if (!held || (e && e.pointerId !== held.id)) return;
    const moved = held.moved;
    held = null;
    if (!moved) { tug = .35; flip(); moodT = .6; return; }
    if (pull > 26 * S) { flip(); moodT = .6; }
  };
  a.cv.addEventListener('pointerdown', down);
  a.cv.addEventListener('pointermove', move);
  a.cv.addEventListener('pointerup', up);
  a.cv.addEventListener('pointercancel', up);
  a.cv.style.cursor = 'grab';

  return {
    crew: [moth],
    boxed: true,
    awake: () => true,
    tick(dt, t) {
      if (!ready) lay();
      const A = anchorAt();
      anchor = A;
      const R = reduced();
      /* integrate */
      const g = 1500 * S;
      const step = Math.min(dt, 1 / 30);
      for (let i = 1; i <= N; i++) {
        const p = pts[i];
        const vx = (p.x - p.px) * .985, vy = (p.y - p.py) * .985;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g * step * step;
      }
      if (tug > 0) { tug -= dt; pts[N].y += 260 * S * step * (tug > .2 ? 1 : 0); }
      pts[0].x = A.x; pts[0].y = A.y;
      const end = pts[N];
      if (held) {
        /* the hand pulls the end; the chain stretches a little, then stops */
        const dx = held.x - A.x, dy = held.y - A.y, d = Math.hypot(dx, dy) || 1, max = len * 1.45;
        const k = Math.min(1, max / d);
        end.x = A.x + dx * k; end.y = A.y + dy * k; end.px = end.x; end.py = end.y;
      }
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < N; i++) {
          const p = pts[i], q = pts[i + 1];
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || .001;
          /* a held chain may stretch a bit, a free one may not */
          const rest = held ? Math.max(L, Math.min(d, L * 1.45)) : L;
          const diff = (d - rest) / d;
          const wp = i === 0 ? 0 : (i + 1 === N && held ? 1 : .5), wq = i + 1 === N && held ? 0 : (i === 0 ? 1 : .5);
          p.x += dx * diff * wp; p.y += dy * diff * wp;
          q.x -= dx * diff * wq; q.y -= dy * diff * wq;
        }
        pts[0].x = A.x; pts[0].y = A.y;
      }
      if (R && !held) pts.forEach((p, i) => { p.x = p.px = A.x; p.y = p.py = A.y + i * L; });
      const total = pts.reduce((s, p, i) => i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0, 0);
      pull = Math.max(0, total - len);

      /* draw the chain; the bulb hangs from its end, tilted along the last link */
      chain.setAttribute('points', pts.map(p => `${(p.x - origin.x).toFixed(1)},${(p.y - origin.y).toFixed(1)}`).join(' '));
      const pe = pts[N - 1];
      const ang = Math.atan2(end.x - pe.x, end.y - pe.y);
      a.x = end.x; a.y = end.y + a.h - 2 * S;
      a.rot = clamp(-ang * 57.3, -50, 50);
      a.cv.style.transformOrigin = '50% 0';

      const dark = isDark();
      if (moodT > 0) moodT -= dt;
      if (held && held.moved) a.play(dark ? 'pulledOff' : 'pulled');
      else if (moodT > .2 && !dark) a.play('happy');
      else a.play(dark ? 'off' : 'on');
      const glow = dark ? '' : `drop-shadow(0 0 ${Math.round(5 * S)}px rgba(255,214,90,.95))`;
      if (a.cv.style.filter !== glow) a.cv.style.filter = glow;

      /* the moth: loops around the bulb in the light, rests on the chain in the dark */
      mt += dt;
      let tx, ty;
      if (!dark) { tx = end.x + Math.cos(mt * 2.3) * 22 * S + Math.sin(mt * 5.1) * 5 * S; ty = end.y + a.h * .45 + Math.sin(mt * 3.1) * 14 * S; }
      else { const p = pts[Math.round(N * .45)]; tx = p.x + 3 * S; ty = p.y + 4 * S; }
      mx = R ? tx : lerp(mx, tx, 1 - Math.exp(-(dark ? 3 : 7) * dt));
      my = R ? ty : lerp(my, ty, 1 - Math.exp(-(dark ? 3 : 7) * dt));
      moth.x = mx; moth.y = my;
      moth.face = Math.cos(mt * 2.3) < 0 ? 1 : -1;
      moth.play(dark ? 'rest' : 'fly');
    },
    poke() { /* handled by the pull */ },
    destroy() {
      svg.remove();
      a.cv.removeEventListener('pointerdown', down); a.cv.removeEventListener('pointermove', move);
      a.cv.removeEventListener('pointerup', up); a.cv.removeEventListener('pointercancel', up);
    }
  };
});
