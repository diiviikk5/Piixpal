/* hang: dangles from the bottom edge of an element on a silk thread. Swings when the
 * page scrolls or the cursor brushes past, zips up when you reach for it, then lowers
 * itself back down, legs wiggling. Poke it and it yo-yos. */
defineBehavior('hang', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .82;
  const rest = (+host.getAttribute('length') || 70) * S;
  let L = 0, Lv = 0, goal = rest;            /* thread length and its spring */
  let th = 0, w = 0;                         /* pendulum angle (rad) and angular speed */
  let state = 'lower', timer = 0, lastV = 0;

  const silk = document.createElement('div');
  silk.className = 'thread';
  silk.style.width = Math.max(1, Math.round(a.s / 2)) + 'px';
  silk.style.color = host.getAttribute('silk') || '#1b1226';
  a.node.parentNode.insertBefore(silk, a.node);
  a.cv.style.transformOrigin = '50% 0';
  a.node.classList.add('nograb');

  return {
    tick(dt, t) {
      const r = rectOf(el);
      const ax = r.l + r.w * at, ay = r.b;
      if (reduced()) { L = rest; th = 0; }
      else {
        /* scroll gives the spider a shove (it lags behind the page) */
        const acc = (scroll.v - lastV) / Math.max(dt, .001);
        lastV = scroll.v;
        w += clamp(acc * .00002, -2, 2) + (chance(dt * .4) ? rnd(-.15, .15) : 0);
        /* the cursor sweeping past the spider pushes it */
        const px = a.x, py = a.y - a.h / 2;
        if (ptr.seen && Math.abs(ptr.x - px) < 40 * S && Math.abs(ptr.y - py) < 60 * S) w += clamp(ptr.vx * .00009, -.25, .25);

        const g = 9.8 * 160;
        w += (-g / Math.max(L, 20) * Math.sin(th) - w * 1.1) * dt;
        th = clamp(th + w * dt, -1.2, 1.2);

        const near = ptr.seen && ptrDist(px, py) < 75 * S;
        timer -= dt;
        switch (state) {
          case 'lower':
            goal = rest + Math.sin(t / 1600) * 10 * S;
            a.play(Math.abs(Lv) > 30 ? 'wiggle' : 'idle');
            if (near) { state = 'flee'; a.play('scared'); a.say(chance(.5) ? '!' : 'sweat', 700); }
            break;
          case 'flee':
            goal = 10 * S;
            a.play('scared');
            if (!near) { state = 'wait'; timer = rnd(1.2, 2.2); }
            break;
          case 'wait':
            goal = 10 * S;
            a.play('idle');
            if (near) state = 'flee';
            else if (timer <= 0) state = 'lower';
            break;
        }
        /* fast up, slow down */
        const k = goal < L ? 140 : 18;
        Lv += ((goal - L) * k - Lv * (goal < L ? 18 : 6)) * dt;
        L = Math.max(4, L + Lv * dt);
      }
      const ex = ax + Math.sin(th) * L, ey = ay + Math.cos(th) * L;
      a.x = ex; a.y = ey + a.h;
      a.rot = -th * 57.3;
      /* render() turns the canvas around its top, so pivot the foot point to match */
      silk.style.height = Math.round(L + 2) + 'px';
      silk.style.transform = `translate3d(${Math.round(ax - origin.x)}px,${Math.round(ay - origin.y)}px,0) rotate(${(-th * 57.3).toFixed(2)}deg)`;
    },
    hear(type) {
      if (type !== 'thud') return;
      w += (chance(.5) ? 1 : -1) * rnd(.5, 1); a.say('sweat', 600);
    },
    poke() {
      Lv += 520 * S; w += rnd(-1.2, 1.2);
      a.say(pick(['!', 'heart', '!?']), 700);
    },
    destroy() { silk.remove(); }
  };
});
