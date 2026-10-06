/* glow: fireflies drifting around an element, blinking softly. Hover the element and
 * they gather round your cursor. Click one and they all scatter, then drift back.
 *   count="9"   number of fireflies */
defineBehavior('glow', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 9, 1, 40);
  const flies = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'fireflies'))];
  const st = flies.map(() => ({ x: null, y: 0, vx: 0, vy: 0, ph: rnd(0, 6.28), sp: rnd(.4, .9), rx: rnd(.25, .5), ry: rnd(.2, .45), on: chance(.5), next: rnd(.2, 2) }));
  const GLOW = 'drop-shadow(0 0 3px #fff36b) drop-shadow(0 0 9px #ffd23f)';
  flies.forEach(f => f.node.classList.add('nograb'));

  return {
    crew: flies.slice(1),
    awake: () => onScreen(rectOf(el)),
    tick(dt, t) {
      const r = rectOf(el);
      const cx = r.l + r.w / 2, cy = r.t + r.h / 2;
      const hover = ptr.seen && ptr.x > r.l - 40 && ptr.x < r.r + 40 && ptr.y > r.t - 40 && ptr.y < r.b + 40;
      flies.forEach((f, i) => {
        const s = st[i];
        if (s.x == null) { s.x = cx; s.y = cy; }
        s.ph += dt * s.sp;
        /* each one traces its own lazy loop, round the element or round the cursor */
        const gx = hover ? ptr.x + Math.cos(s.ph * 2 + i) * 34 * S : cx + Math.cos(s.ph) * r.w * s.rx;
        const gy = hover ? ptr.y + Math.sin(s.ph * 3 + i) * 26 * S : cy + Math.sin(s.ph * 1.7) * r.h * s.ry + 10;
        if (!reduced()) {
          s.vx += ((gx - s.x) * 2.2 - s.vx * 1.6) * dt; s.vy += ((gy - s.y) * 2.2 - s.vy * 1.6) * dt;
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.next -= dt;
          if (s.next <= 0) { s.on = !s.on; s.next = s.on ? rnd(.6, 2.4) : rnd(.15, .9); }
        } else { s.x = gx; s.y = gy; s.on = true; }
        f.x = s.x; f.y = s.y; f.face = s.vx >= 0 ? 1 : -1;
        f.play(s.on ? 'on' : 'off');
        f.cv.style.filter = s.on ? GLOW : '';
      });
    },
    poke() { st.forEach(s => { s.vx += rnd(-600, 600); s.vy += rnd(-600, 200); }); }
  };
});
