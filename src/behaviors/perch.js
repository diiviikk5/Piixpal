/* perch: sits on top of a button or link. Looks around, pecks, sings.
 * Hover its perch and it takes off, circles, and lands on another perch once the
 * coast is clear. Give it several perches with on=".btn" and it hops between them. */
defineBehavior('perch', (a, targets, host) => {
  const S = a.s / 3;
  const MAX = 560 * S;
  let perch = targets[0], frac = rnd(.25, .75), state = 'sit', timer = rnd(2, 4);
  let vx = 0, vy = 0, goal = null, orbit = 0, cx = 0, cy = 0, calm = 0, placed = false;

  const seat = (el, f) => { const r = rectOf(el); return { x: r.l + r.w * f, y: r.t, r }; };
  const threatened = el => {
    if (!ptr.seen) return false;
    const r = rectOf(el), m = 26 * S;
    return ptr.x > r.l - m && ptr.x < r.r + m && ptr.y > r.t - a.h - m && ptr.y < r.b + m;
  };
  const visible = el => { const r = rectOf(el); return r.w > 0 && r.t > scrollY + a.h && r.b < scrollY + innerHeight; };
  const choose = () => {
    const free = targets.filter(el => !threatened(el));
    const seen = free.filter(visible);
    const pool = seen.length ? seen : free.length ? free : targets;
    const others = pool.filter(el => el !== perch);
    return pick(others.length && chance(.75) ? others : pool);
  };
  const takeoff = () => {
    state = 'fly'; calm = 0; orbit = rnd(0, 6.28);
    const r = rectOf(perch);
    cx = clamp(a.x + rnd(-120, 120) * S, 60, docW() - 60);
    cy = Math.max(scrollY + 60, r.t - rnd(110, 190) * S);
    vy = -320 * S; vx = (ptr.x > a.x ? -1 : 1) * 160 * S;
    a.play('fly');
  };

  return {
    tick(dt) {
      if (!placed) { const s = seat(perch, frac); a.x = s.x; a.y = s.y; a.face = chance(.5) ? 1 : -1; placed = true; }
      if (reduced()) { const s = seat(perch, frac); a.x = s.x; a.y = s.y; a.play('idle'); return; }

      if (state === 'sit') {
        const s = seat(perch, frac);
        a.x = s.x; a.y = s.y; a.rot = 0;
        a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
        if (threatened(perch) || ptrDist(a.x, a.y - a.h / 2) < 50 * S) { takeoff(); if (chance(.4)) a.say('!', 500); return; }
        timer -= dt;
        if (a.done || a.clip === 'idle') {
          if (timer <= 0) {
            const r = Math.random();
            if (r < .35) a.play('peck', { loop: false, reset: true });
            else if (r < .6) a.play('look', { loop: false, reset: true });
            else if (r < .75) { a.face = -a.face; }
            else if (r < .85) a.say('note', 1100);
            timer = rnd(1.5, 4);
          }
          if (a.done) a.play('idle', { reset: true });
        }
        return;
      }

      /* flying */
      const threat = threatened(perch);
      if (state === 'fly') {
        orbit += dt * 2.4;
        goal = { x: cx + Math.cos(orbit) * 70 * S, y: cy + Math.sin(orbit * 2) * 22 * S };
        calm = threat ? 0 : calm + dt;
        if (calm > 1.1) { perch = choose(); frac = rnd(.2, .8); state = 'land'; }
      }
      if (state === 'land') {
        const s = seat(perch, frac);
        goal = { x: s.x, y: s.y };
        if (threatened(perch)) { cx = a.x; cy = a.y - 60 * S; state = 'fly'; calm = 0; }
      }
      const dx = goal.x - a.x, dy = goal.y - a.y, dist = Math.hypot(dx, dy) || 1;
      const want = state === 'land' ? Math.min(MAX, dist * 5 + 40) : MAX * .7;
      vx = lerp(vx, dx / dist * want, 1 - Math.exp(-4.5 * dt));
      vy = lerp(vy, dy / dist * want, 1 - Math.exp(-4.5 * dt));
      a.x += vx * dt; a.y += vy * dt;
      if (Math.abs(vx) > 20) a.face = vx > 0 ? 1 : -1;
      a.rot = clamp(vy / MAX * 12, -12, 12) * a.face;
      a.play('fly', { fps: vy < -40 ? 16 : 11 });
      if (state === 'land' && dist < 4 * S) {
        const s = seat(perch, frac);
        a.x = s.x; a.y = s.y; vx = vy = 0; a.rot = 0;
        a.sy = .8; a.sx = 1.15;
        state = 'sit'; timer = rnd(1, 2.5); a.play('idle', { reset: true });
      }
    },
    poke() { if (state === 'sit') { takeoff(); a.say('!', 600); } }
  };
});
