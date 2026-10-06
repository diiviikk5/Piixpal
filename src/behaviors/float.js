/* float: a balloon on a string tied to an element. Sways like an upside-down pendulum,
 * pushed by cursor swipes and scrolling. Click to pop; it re-inflates after a bit. */
defineBehavior('float', (a, [el], host) => {
  const S = a.s / 4;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  const L = (+host.getAttribute('length') || 70) * S;
  let th = rnd(-.2, .2), w = 0, state = 'up', timer = 0, grow = 1, lastV = 0;

  const silk = document.createElement('div');
  silk.className = 'thread';
  silk.style.width = Math.max(1, Math.round(a.s / 3)) + 'px';
  silk.style.color = host.getAttribute('silk') || '#17121f';
  a.node.parentNode.insertBefore(silk, a.node);
  a.cv.style.transformOrigin = '50% 100%';

  return {
    tick(dt, t) {
      const r = rectOf(el);
      const ax = r.l + r.w * at, ay = r.t;
      if (!reduced()) {
        const acc = (scroll.v - lastV) / Math.max(dt, .001); lastV = scroll.v;
        w += clamp(acc * .000015, -1.5, 1.5);
        const near = ptr.seen && Math.abs(ptr.x - a.x) < 60 * S && Math.abs(ptr.y - (a.y - a.h / 2)) < 70 * S;
        if (near) w += clamp(ptr.vx * .00012, -.4, .4);
        /* buoyancy pulls it upright, plus a lazy breeze */
        w += (-Math.sin(th) * 7 + Math.sin(t / 1300) * .35 - w * 1.6) * dt;
        th = clamp(th + w * dt, -.8, .8);
      }
      timer -= dt;
      if (state === 'popped') {
        a.play('pop');
        if (timer <= 0) { state = 'grow'; grow = .15; a.play('idle'); }
      } else if (state === 'grow') {
        grow = Math.min(1, grow + dt * .8);
        if (grow >= 1) state = 'up';
      } else a.play(Math.floor(t / 2800) % 6 === 0 && (t % 2800) < 150 ? 'blink' : 'idle');
      const len = L * (state === 'popped' ? .3 : 1);
      const ex = ax + Math.sin(th) * len, ey = ay - Math.cos(th) * len;
      a.x = ex; a.y = ey;
      a.rot = th * 40;
      a.sx = a.sy = state === 'popped' ? 1.3 : grow;
      silk.style.height = Math.round(len) + 'px';
      silk.style.transform = `translate3d(${Math.round(ax - origin.x)}px,${Math.round(ay - origin.y)}px,0) rotate(${(180 - th * 57.3).toFixed(1)}deg)`;
      silk.style.opacity = state === 'popped' ? '.35' : '.75';
    },
    poke() {
      if (state !== 'up') return;
      state = 'popped'; timer = 2.4;
      shout(a, 'thud', 200);
      a.say('!?', 700);
    },
    destroy() { silk.remove(); }
  };
});
