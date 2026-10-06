/* peek: hides behind an element and peeks over its top edge. Ears first, then eyes,
 * then the whole face. Eyes follow the cursor from a safe distance. Get close and it
 * ducks, then pops up somewhere else along the edge. Poke it: "eep!" */
defineBehavior('peek', (a, [el], host) => {
  const S = a.s / 4;
  const H = a.h;
  let at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), .05, .95) : rnd(.15, .85);
  let state = 'hidden', timer = rnd(.6, 1.6), depth = H, goal = H, blinkAt = now() + rnd(2000, 5000), eep = 0;
  const STEPS = { hidden: H, ears: H - 3 * a.s, eyes: H - 7 * a.s, out: 0 };
  const shy = 95 * S + a.w / 2;
  const go = (s, t) => { state = s; timer = t; goal = STEPS[s] ?? goal; };
  a.node.style.clipPath = `inset(-400px -400px ${H}px -400px)`;

  const look = () => {
    const dx = ptr.x - a.x, dy = ptr.y - (a.y - H * .6);
    if (!ptr.seen) return 'c';
    const h = dx < -40 ? 'l' : dx > 40 ? 'r' : '';
    const v = dy < -40 ? 'u' : dy > 60 ? 'd' : '';
    const k = v === 'd' ? 'd' : (v + h) || 'c';
    return a.has(k) ? k : 'c';
  };

  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at;
      a.y = r.t;
      if (reduced()) { depth = STEPS.eyes; a.oy = depth; a.play('c'); a.node.style.clipPath = `inset(-400px -400px ${Math.round(depth)}px -400px)`; return; }

      const d = ptr.seen ? ptrDist(a.x, a.y) : 1e9;
      timer -= dt;
      if (d < shy && state !== 'hidden' && state !== 'duck') {
        if (state === 'out' && chance(.35)) a.say('eep', 600);
        eep = .2; go('duck', rnd(1.4, 2.6)); goal = H;
      }

      switch (state) {
        case 'hidden':
          if (timer <= 0 && d > shy * 1.4) go('ears', rnd(.5, 1.1));
          break;
        case 'ears':
          if (timer <= 0) go('eyes', rnd(.5, 1));
          break;
        case 'eyes':
          if (timer <= 0) go('out', rnd(4, 9));
          break;
        case 'out':
          if (timer <= 0) { go('duck', rnd(1, 3)); goal = H; }
          break;
        case 'duck':
          if (timer <= 0 && d > shy * 1.6) {
            /* reappear somewhere else along the edge */
            at = clamp(at + (chance(.5) ? 1 : -1) * rnd(.2, .5), .06, .94);
            go('hidden', rnd(.3, 1));
          }
          break;
      }

      /* ducking is fast, rising is cautious */
      const speed = goal > depth ? 14 : 3.2;
      depth = lerp(depth, goal, 1 - Math.exp(-speed * dt));
      if (Math.abs(depth - goal) < .5) depth = goal;
      /* rise in whole sprite-pixels so it stays crisp */
      const shown = Math.round(depth / a.s) * a.s;
      a.oy = shown;
      a.node.style.clipPath = `inset(-400px -400px ${shown}px -400px)`;

      if (eep > 0) { eep -= dt; a.play('eep'); }
      else if (state !== 'duck') {
        const t = now();
        if (t > blinkAt) { a.play('blink'); if (t > blinkAt + 140) blinkAt = t + rnd(2200, 5200); }
        else a.play(look());
      }
    },
    poke() {
      if (state === 'hidden' || state === 'duck') return;
      eep = .35; a.say('eep', 800);
      go('duck', rnd(2.5, 4)); goal = H;
    }
  };
});
