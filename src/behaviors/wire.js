/* wire: a row of birds sitting along an element's top edge like a telephone wire.
 * Run the cursor along the row and they hop up one after another, like a wave.
 * Click one and the whole row takes off, loops round, and lands back one by one.
 *   count="6"   number of birds */
defineBehavior('wire', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 6, 2, 20);
  const birds = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'sparrows'))];
  const st = birds.map((_, i) => ({ hop: 0, delay: -1, fly: 0, ang: 0, face: i % 2 ? -1 : 1, next: rnd(1, 5) }));

  const startHop = (i, delay) => { if (st[i].hop <= 0 && st[i].delay < 0) st[i].delay = delay; };
  return {
    crew: birds.slice(1),
    tick(dt) {
      const r = rectOf(el);
      birds.forEach((b, i) => {
        const s = st[i];
        const home = r.l + r.w * ((i + .5) / n);
        if (!reduced()) {
          /* the cursor brushing past sets off a ripple */
          if (ptr.seen && s.hop <= 0 && s.fly <= 0 && Math.abs(ptr.x - home) < 18 * S && ptr.y < r.t + 10 && ptr.y > r.t - 60 * S) {
            for (let j = 0; j < n; j++) startHop(j, Math.abs(j - i) * .07);
          }
          if (s.delay >= 0) { s.delay -= dt; if (s.delay < 0) s.hop = .55; }
          s.hop = Math.max(0, s.hop - dt);
          s.next -= dt;
          if (s.next <= 0 && s.hop <= 0 && s.fly <= 0) { s.next = rnd(1.5, 5); if (chance(.4)) s.face = -s.face; else b.play('peck', { loop: false, reset: true }); }
        }
        if (s.fly > 0) {
          /* a loop round the sky and back to the same spot on the wire */
          s.fly = Math.max(0, s.fly - dt);
          const p = 1 - s.fly / 2.2, ang = p * Math.PI * 2;
          b.x = home + Math.sin(ang) * 60 * S; b.y = r.t; b.oy = -Math.sin(p * Math.PI) * 110 * S;
          b.face = Math.cos(ang) >= 0 ? 1 : -1;
          b.play('fly');
          return;
        }
        b.x = home; b.y = r.t; b.face = s.face;
        b.oy = -Math.sin(Math.PI * s.hop / .55) * 20 * S;
        if (s.hop > 0) b.play('fly');
        else if (b.clip !== 'peck' || b.done) b.play('sit');
      });
    },
    poke() {
      st.forEach((s, i) => setTimeout(() => { s.fly = 2.2; }, i * 90));
      a.say('!', 500);
    },
    hear(type) { if (type === 'thud') st.forEach((s, i) => { s.delay = i * .05; }); }
  };
});
