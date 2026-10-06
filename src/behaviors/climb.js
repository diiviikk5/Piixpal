/* climb: walks the full perimeter of an element: top, right side, underneath, left side.
 * Freezes and wags its tail when the cursor comes close. Poke it to make it sprint
 * the other way round. */
defineBehavior('climb', (a, [el], host) => {
  const S = a.s / 3;
  const speed = 34 * S * (+host.getAttribute('speed') || 1);
  let d = null, dir = 1, state = 'walk', timer = rnd(3, 6), sprint = 0, rot = 0;
  a.cv.style.transformOrigin = '50% 50%';

  /* distance along the border -> point + heading */
  const at = (r, s) => {
    const W = r.w, H = r.h, P = 2 * (W + H);
    s = ((s % P) + P) % P;
    if (s < W) return { x: r.l + s, y: r.t, ang: 0 };
    if (s < W + H) return { x: r.r, y: r.t + (s - W), ang: 90 };
    if (s < 2 * W + H) return { x: r.r - (s - W - H), y: r.b, ang: 180 };
    return { x: r.l, y: r.b - (s - 2 * W - H), ang: 270 };
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      if (d == null) d = (r.w + r.h) * 2 * (host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) * .5 : rnd(0, .25));
      if (!reduced()) {
        const p0 = at(r, d);
        const near = ptr.seen && ptrDist(p0.x, p0.y) < 70 * S && sprint <= 0;
        timer -= dt;
        if (near) { state = 'freeze'; a.play('wag'); }
        else if (state === 'freeze') { state = 'walk'; }
        if (state === 'walk') {
          a.play('walk', { fps: sprint > 0 ? 22 : 10 });
          d += dir * speed * (sprint > 0 ? 3.5 : 1) * dt;
          if (timer <= 0 && sprint <= 0) { state = 'rest'; timer = rnd(.8, 2); a.play('idle'); }
        } else if (state === 'rest' && timer <= 0) { state = 'walk'; timer = rnd(3, 7); if (chance(.3)) dir = -dir; }
        sprint -= dt;
      }
      const p = at(r, d);
      /* turn smoothly at the corners */
      let want = p.ang + (dir < 0 ? 180 : 0);
      while (want - rot > 180) want -= 360;
      while (want - rot < -180) want += 360;
      rot = lerp(rot, want, 1 - Math.exp(-14 * dt));
      a.rot = rot;
      /* centre the gecko on the edge line */
      a.x = p.x; a.y = p.y + a.h / 2;
      a.face = 1;
    },
    poke() { dir = -dir; sprint = 1.4; state = 'walk'; a.say('!', 500); },
    hear(type) { if (type === 'thud') { sprint = 1; state = 'walk'; } }
  };
});
