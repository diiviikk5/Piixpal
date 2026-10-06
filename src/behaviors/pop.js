/* pop: whack-a-mole. Pops up through an element's top edge at a random spot, looks
 * around, ducks. Click it while it's up to bonk it (stars, dizzy, back down).
 * Leaves a little dirt mound where it surfaced. */
defineBehavior('pop', (a, [el], host) => {
  const H = a.h;
  const hill = recruit(a, 'molehill');
  let frac = rnd(.15, .85), state = 'hidden', timer = rnd(.8, 2), depth = H, goal = H, bonks = 0;
  a.node.style.clipPath = `inset(-400px -400px ${H}px -400px)`;
  hill.node.classList.add('ghost');
  a.node.parentNode.insertBefore(hill.node, a.node);   /* the mound sits behind the mole */

  const go = (s, t, g) => { state = s; timer = t; goal = g; };
  return {
    crew: [hill],
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * frac; a.y = r.t;
      hill.x = a.x; hill.y = r.t + 2; hill.play('idle');
      if (reduced()) { depth = H * .45; }
      else {
        timer -= dt;
        switch (state) {
          case 'hidden': if (timer <= 0) { a.play('up'); go('up', rnd(1.2, 2.2), 0); } break;
          case 'up':
            if (timer <= 0) go('hidden', rnd(.6, 1.6), H);
            else a.play(Math.floor(timer * 2) % 3 === 0 ? 'l' : 'up');
            break;
          case 'bonked': if (timer <= 0) go('hidden', rnd(1.4, 2.4), H); break;
        }
        /* move to a fresh hole while underground */
        if (state === 'hidden' && depth >= H - .5 && timer > .3) frac = rnd(.08, .92);
        const k = goal > depth ? 18 : 10;
        depth = lerp(depth, goal, 1 - Math.exp(-k * dt));
      }
      const shown = Math.round(depth / a.s) * a.s;
      a.oy = shown;
      a.node.style.clipPath = `inset(-400px -400px ${shown}px -400px)`;
      /* the mound only shows while the mole is near the surface */
      hill.node.style.opacity = depth < H * .9 ? '1' : '0';
    },
    poke() {
      if (state !== 'up') return;
      bonks++;
      a.play('bonk'); a.say(bonks % 5 === 0 ? 'grr' : 'star', 700);
      go('bonked', .45, 0);
      host.dispatchEvent(new CustomEvent('piix:bonk', { bubbles: true, detail: { count: bonks } }));
    }
  };
});
