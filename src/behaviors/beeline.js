/* beeline: a little line of worker bees buzzing round their element. Come close and
 * they follow your cursor in single file, each one chasing the bee in front. Stop
 * moving and they head home and circle the hive.
 *   count="6"   number of bees */
defineBehavior('beeline', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 6, 2, 30);
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const bees = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'bees'))];
  const st = bees.map(() => ({ x: null, y: 0, vx: 0, vy: 0 }));
  let chasing = false, idleSince = now();

  return {
    crew: bees.slice(1),
    awake: () => true,
    tick(dt, t) {
      const r = rectOf(el);
      const hx = r.l + r.w * at, hy = r.t - 26 * S;
      if (st[0].x == null) st.forEach((s, i) => { s.x = hx + i * 8; s.y = hy; });
      if (now() - ptr.last < 120) idleSince = now();
      const idle = now() - idleSince;
      if (!chasing && ptr.seen && idle < 300 && (ptrDist(hx, hy) < 260 * S || ptrDist(st[0].x, st[0].y) < 160 * S)) chasing = true;
      if (chasing && idle > 3000) chasing = false;

      bees.forEach((b, i) => {
        const s = st[i];
        let gx, gy, k;
        if (reduced()) { gx = hx + (i - n / 2) * 12 * S; gy = hy; s.x = gx; s.y = gy; }
        else {
          if (i === 0) {
            gx = chasing ? ptr.x - 24 * S : hx + Math.cos(t / 500) * 30 * S;
            gy = chasing ? ptr.y - 10 * S : hy + Math.sin(t / 350) * 10 * S;
            k = chasing ? 7 : 3;
          } else {
            /* follow the bee in front, a few pixels back */
            const p = st[i - 1];
            gx = p.x - Math.sign(p.vx || 1) * 14 * S; gy = p.y + Math.sin(t / 120 + i) * 4 * S; k = 9;
            if (!chasing) { gx = hx + Math.cos(t / 500 + i * (6.28 / n)) * 34 * S; gy = hy + Math.sin(t / 400 + i * (6.28 / n)) * 14 * S; k = 3; }
          }
          s.vx = lerp(s.vx, (gx - s.x) * k, 1 - Math.exp(-8 * dt));
          s.vy = lerp(s.vy, (gy - s.y) * k, 1 - Math.exp(-8 * dt));
          s.x += s.vx * dt; s.y += s.vy * dt;
        }
        b.x = s.x; b.y = s.y;
        if (Math.abs(s.vx) > 8) b.face = s.vx > 0 ? 1 : -1;
        b.play('fly');
      });
    },
    poke(e, who) { (who || a).say('heart', 600); chasing = !chasing; idleSince = now(); }
  };
});
