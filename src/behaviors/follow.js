/* follow: naps on its element until the cursor comes near, then tags along behind it
 * around the page. When the cursor stops for a while it flies home and naps again.
 * Poke it for a loop-the-loop. */
defineBehavior('follow', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const MAX = 760 * S;
  let state = 'home', vx = 0, vy = 0, loop = 0, side = -1, idleSince = now(), placed = false;

  const home = () => {
    const r = rectOf(el);
    return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: typeof el.piixSurface === 'function' ? (el.piixSurface(r.l + r.w * at) ?? r.t) : r.t };
  };
  const steer = (gx, gy, dt, gain, max) => {
    const dx = gx - a.x, dy = gy - a.y;
    vx = lerp(vx, clamp(dx * gain, -max, max), 1 - Math.exp(-5 * dt));
    vy = lerp(vy, clamp(dy * gain, -max, max), 1 - Math.exp(-5 * dt));
    a.x += vx * dt; a.y += vy * dt;
    return Math.hypot(dx, dy);
  };

  return {
    tick(dt, t) {
      const h = home();
      if (!placed) { a.x = h.x; a.y = h.y; placed = true; a.play('sleep'); a.say('zz', 0); }
      if (reduced()) { a.x = h.x; a.y = h.y; a.play('perch'); return; }
      if (now() - ptr.last < 120) idleSince = now();
      const idle = now() - idleSince;

      if (state === 'home') {
        a.x = h.x; a.y = h.y; a.rot = 0;
        a.play(idle > 6000 ? 'sleep' : 'perch');
        if (ptr.seen && idle < 400 && ptrDist(a.x, a.y - a.h / 2) < 220 * S) {
          state = 'follow'; a.hush(); a.say(chance(.5) ? 'heart' : '!', 700); vy = -200 * S;
        }
        return;
      }

      if (state === 'follow') {
        /* hang back on the side the cursor came from, a little above it */
        if (Math.abs(ptr.vx) > 60) side = ptr.vx > 0 ? -1 : 1;
        const gx = ptr.x + side * 46 * S, gy = ptr.y - 18 * S + Math.sin(t / 160) * 6 * S;
        steer(gx, gy, dt, 6, MAX);
        if (idle > 4500 || !ptr.seen || ptr.cx < -1e4) { state = 'return'; a.say('zz', 900); }
      } else if (state === 'return') {
        const d = steer(h.x, h.y - 2 * S, dt, 3.2, MAX * .55);
        if (d < 3 * S) { state = 'home'; vx = vy = 0; a.say('zz', 0); }
        if (idle < 200 && ptrDist(a.x, a.y) < 260 * S) state = 'follow';
      }

      if (loop > 0) { loop = Math.max(0, loop - dt / .6); a.rot = (1 - loop) * 360 * (a.face || 1); a.play('happy'); }
      else {
        a.rot = clamp(vx / MAX * 18, -18, 18);
        a.play('fly');
      }
      if (Math.abs(vx) > 25) a.face = vx > 0 ? 1 : -1;
    },
    poke() {
      if (state === 'home') { state = 'follow'; a.hush(); }
      loop = 1; a.say('heart', 800);
    },
    hear(type) { if (type === 'thud' && state === 'home') { state = 'follow'; a.hush(); a.say('!', 600); } }
  };
});
