/* snap: a frog that thinks the cursor is a fly. When it buzzes close, the tongue shoots
 * out at it; hold still at the tip and you're caught. Click to make it hop along. */
defineBehavior('snap', (a, [el], host) => {
  const S = a.s / 4;
  let frac = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  let state = 'sit', t = 0, cool = 1, tx = 0, ty = 0, hop = null, happy = 0;
  const tongue = document.createElement('div');
  tongue.style.cssText = `position:absolute;left:0;top:0;height:${Math.max(3, Math.round(a.s * 1.2))}px;border-radius:999px;background:#ff7aa8;box-shadow:0 0 0 ${Math.max(1, a.s >> 2)}px #17121f;transform-origin:0 50%;pointer-events:none;opacity:0`;
  a.node.parentNode.insertBefore(tongue, a.node);
  const RANGE = 150 * S;

  return {
    tick(dt) {
      const r = rectOf(el);
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / .45);
        const p = hop.p, q = 1 - p, x = lerp(hop.x0, hop.x1, p);
        frac = (x - r.l - a.w / 2) / Math.max(1, r.w - a.w);
        a.oy = -(4 * p * q) * 46 * S; a.play('jump');
        if (p >= 1) { hop = null; a.oy = 0; a.sy = .8; a.sx = 1.2; }
      }
      a.x = r.l + a.w / 2 + (r.w - a.w) * clamp(frac, 0, 1); a.y = r.t;
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      if (reduced() || hop) { tongue.style.opacity = '0'; if (!hop) a.play('sit'); return; }
      const mx = a.x + a.face * a.w * .1, my = a.y - a.h * .45;
      cool -= dt; happy -= dt;
      const d = ptr.seen ? Math.hypot(ptr.x - mx, ptr.y - my) : 1e9;
      if (state === 'sit') {
        if (Math.abs(ptr.x - a.x) > 6) a.face = ptr.x > a.x ? 1 : -1;
        a.play(happy > 0 ? 'happy' : 'sit');
        if (d < RANGE && cool <= 0) { state = 'aim'; t = .22; }
      } else if (state === 'aim') {
        t -= dt;
        if (t <= 0) { state = 'out'; t = 0; tx = ptr.x; ty = ptr.y; a.play('snap'); }
      }
      if (state === 'out' || state === 'back') {
        t += dt / .14 * (state === 'out' ? 1 : -1);
        const k = clamp(t, 0, 1), len = Math.hypot(tx - mx, ty - my) * k, ang = Math.atan2(ty - my, tx - mx);
        tongue.style.opacity = '1';
        tongue.style.width = Math.round(len) + 'px';
        tongue.style.transform = `translate3d(${Math.round(mx - origin.x)}px,${Math.round(my - origin.y)}px,0) rotate(${ang}rad)`;
        if (state === 'out' && k >= 1) {
          state = 'back';
          if (Math.hypot(ptr.x - tx, ptr.y - ty) < 14 * S) { happy = 1.6; a.say('heart', 900); }
        }
        if (state === 'back' && k <= 0) { state = 'sit'; cool = 1.1; tongue.style.opacity = '0'; }
      }
    },
    poke() {
      if (hop) return;
      const r = rectOf(el), x0 = a.x;
      const x1 = clamp(x0 + (chance(.5) ? 1 : -1) * rnd(60, 140) * S, r.l + a.w / 2, r.r - a.w / 2);
      a.face = x1 > x0 ? 1 : -1;
      hop = { x0, x1, p: 0 };
    },
    destroy() { tongue.remove(); }
  };
});
