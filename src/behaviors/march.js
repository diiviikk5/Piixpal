/* march: a line of ants marching along the top of an element, some carrying crumbs.
 * Bring the cursor close and the nearby ants scatter, then hurry back into line.
 *   count="7"   number of ants */
defineBehavior('march', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 7, 2, 30);
  const ants = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'ants'))];
  const st = ants.map((_, i) => ({ p: i * 18 * S, ox: 0, oy: 0, vx: 0, vy: 0, carry: i % 3 === 1 }));
  const speed = 26 * S * (+host.getAttribute('speed') || 1);
  let off = 0;

  return {
    crew: ants.slice(1),
    tick(dt) {
      const r = rectOf(el);
      const span = r.w + 40 * S;
      if (!reduced()) off += speed * dt;
      ants.forEach((ant, i) => {
        const s = st[i];
        const pos = ((s.p - off) % span + span) % span;   /* march right to left along the edge */
        const x = r.r + 20 * S - pos;
        /* scatter from the cursor, then spring back into line */
        if (ptr.seen && !reduced() && ptrDist(x + s.ox, r.t + s.oy - 4) < 55 * S) {
          const dx = x + s.ox - ptr.x || .1, d = Math.abs(dx);
          s.vx += Math.sign(dx) * 900 * S * dt / Math.max(d / 40, .4);
          s.vy -= 260 * S * dt;
        }
        s.vx += (-s.ox * 40 - s.vx * 9) * dt; s.vy += (-s.oy * 40 - s.vy * 9) * dt;
        s.ox += s.vx * dt; s.oy = Math.min(0, s.oy + s.vy * dt);
        ant.x = x; ant.y = r.t; ant.ox = s.ox; ant.oy = s.oy; ant.face = -1;
        ant.play(s.carry ? 'carry' : 'walk');
        /* fade in and out at the ends of the line */
        const edge = Math.min(pos, span - pos);
        ant.node.style.opacity = clamp(edge / (24 * S), 0, 1).toFixed(2);
      });
    },
    poke(e, who) { (who || a).say(pick(['!', 'grr']), 500); st.forEach(s => { s.vy -= rnd(100, 260) * S; }); }
  };
});
