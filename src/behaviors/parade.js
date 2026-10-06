/* parade: a mother duck walks along an element with her ducklings in a line behind her.
 * The ducklings follow her exact path, so when she turns round they file back past.
 * Poke a duckling and it hops; poke the mother and the whole family quacks.
 *   count="4"   number of ducklings */
defineBehavior('parade', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 4, 1, 12);
  const kids = Array.from({ length: n }, () => recruit(a, 'duckling'));
  const hops = kids.map(() => 0);
  const trail = [];
  let x = null, dir = 1, state = 'walk', timer = rnd(3, 6), quack = 0;
  const first = 26 * S, gap = 22 * S;

  return {
    crew: kids,
    tick(dt) {
      const r = rectOf(el);
      const L = r.l + a.w / 2, R = r.r - a.w / 2;
      if (x == null) {
        x = L + (R - L) * rnd(.45, .7);
        /* start with the ducklings already lined up behind her */
        for (let d = (first + gap * n) * 1.2; d > 0; d -= 1) trail.push({ x: x - r.l - d * dir, face: dir });
        trail.reverse();
      }
      if (!reduced()) {
        timer -= dt; quack -= dt;
        if (state === 'walk') {
          const nx = clamp(x + dir * 22 * S * dt, L, R);
          if (nx !== x) trail.unshift({ x: nx - r.l, face: dir });
          x = nx;
          if (x <= L || x >= R) dir = -dir;
          if (timer <= 0) { state = 'rest'; timer = rnd(1, 2.2); }
        } else if (timer <= 0 && quack <= 0) { state = 'walk'; timer = rnd(3, 7); if (chance(.3)) dir = -dir; }
        if (trail.length > 4000) trail.length = 4000;
      }
      a.x = clamp(x, L, R); a.y = r.t; a.face = dir;
      a.play(quack > 0 ? 'quack' : state === 'walk' ? 'walk' : 'idle');

      /* each duckling sits a fixed walking-distance back along her path */
      let dist = 0, idx = 0, prev = x - r.l;
      kids.forEach((k, i) => {
        const want = first + i * gap;
        while (idx < trail.length - 1 && dist < want) { dist += Math.abs(trail[idx].x - prev); prev = trail[idx].x; idx++; }
        const p = trail[idx] || { x: x - r.l - want * dir, face: dir };
        k.x = clamp(r.l + p.x, r.l + k.w / 2, r.r - k.w / 2); k.y = r.t; k.face = p.face;
        hops[i] = Math.max(0, hops[i] - dt);
        k.oy = -Math.sin(Math.PI * hops[i] / .4) * 14 * S * (hops[i] > 0);
        k.play(state === 'walk' ? 'walk' : 'idle');
      });
    },
    poke(e, who) {
      const i = kids.indexOf(who);
      if (i >= 0) { hops[i] = .4; who.say(pick(['!', 'note']), 600); return; }
      quack = 1.4; state = 'rest'; timer = 1.4; a.say('note', 900);
      kids.forEach((k, j) => setTimeout(() => { hops[j] = .4; k.say('note', 700); }, 150 + j * 140));
    },
    hear(type) { if (type === 'thud') { hops.fill(.4); a.say('!', 500); } }
  };
});
