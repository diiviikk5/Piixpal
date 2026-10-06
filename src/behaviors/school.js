/* school: a school of fish swimming inside an element like a tank. They flock (stay
 * close, line up, don't bump), turn at the glass, and flee from the cursor.
 *   count="7"   number of fish */
defineBehavior('school', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 7, 2, 40);
  const hues = [0, 25, 330, 190, 60, 290];
  const fish = [a, ...Array.from({ length: n - 1 }, (_, i) => recruit(a, 'fish', { hue: hues[(i + 1) % hues.length] }))];
  const b = fish.map(() => ({ x: null, y: 0, vx: rnd(-40, 40), vy: rnd(-20, 20) }));
  const MAX = 120 * S, MIN = 35 * S;

  return {
    crew: fish.slice(1),
    awake: () => onScreen(rectOf(el)),
    tick(dt) {
      const r = rectOf(el), pad = 14 * S;
      const box = { l: r.l + pad + a.w / 2, r: r.r - pad - a.w / 2, t: r.t + pad + a.h, b: r.b - pad };
      if (b[0].x == null) b.forEach(f => { f.x = rnd(box.l, box.r); f.y = rnd(box.t, box.b); });
      if (!reduced()) {
        let cx = 0, cy = 0, ax = 0, ay = 0;
        b.forEach(f => { cx += f.x; cy += f.y; ax += f.vx; ay += f.vy; });
        cx /= n; cy /= n; ax /= n; ay /= n;
        b.forEach((f, i) => {
          let fx = (cx - f.x) * .6 + (ax - f.vx) * .9, fy = (cy - f.y) * .6 + (ay - f.vy) * .9;
          b.forEach((o, j) => {
            if (i === j) return;
            const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy) || 1;
            if (d < 20 * S) { fx += dx / d * 1400 * S / d; fy += dy / d * 1400 * S / d; }
          });
          /* the glass */
          if (f.x < box.l + 20) fx += 300; if (f.x > box.r - 20) fx -= 300;
          if (f.y < box.t + 10) fy += 300; if (f.y > box.b - 10) fy -= 300;
          /* the cursor is a shark */
          if (ptr.seen) {
            const dx = f.x - ptr.x, dy = f.y - fish[i].h / 2 - ptr.y, d = Math.hypot(dx, dy) || 1;
            if (d < 90 * S) { fx += dx / d * 3200 * S / Math.max(d / 30, 1); fy += dy / d * 3200 * S / Math.max(d / 30, 1); }
          }
          f.vx += fx * dt; f.vy += fy * dt;
          const sp = Math.hypot(f.vx, f.vy) || 1, k = clamp(sp, MIN, MAX) / sp;
          f.vx *= k; f.vy *= k;
          f.x = clamp(f.x + f.vx * dt, box.l, box.r); f.y = clamp(f.y + f.vy * dt, box.t, box.b);
        });
      }
      fish.forEach((fi, i) => {
        const f = b[i];
        fi.x = f.x; fi.y = f.y;
        if (Math.abs(f.vx) > 4) fi.face = f.vx > 0 ? 1 : -1;
        fi.rot = clamp(f.vy / MAX * 25, -25, 25) * fi.face;
        fi.play('swim', { fps: 4 + Math.hypot(f.vx, f.vy) / MAX * 10 });
      });
    },
    poke(e, who) {
      const i = Math.max(0, fish.indexOf(who || a));
      b[i].vx *= 3; b[i].vy *= 3; (who || a).say('!', 400);
    }
  };
});
