/* launch: sits on an element (a deploy button, say). Click it: countdown 3-2-1, it
 * blasts off the top of the screen trailing smoke, then drops back down on its
 * retro-rockets and lands where it started. */
defineBehavior('launch', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let state = 'pad', t = 0, alt = 0, v = 0, count = 0;
  const puffs = [];
  const spot = () => { const r = rectOf(el); return { x: r.l + a.w / 2 + (r.w - a.w) * at, y: r.t }; };
  const puff = () => {
    const p = document.createElement('div');
    const s = Math.round(a.s * rnd(2, 4));
    p.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px;background:#d9d4e3;border-radius:2px;pointer-events:none`;
    a.node.parentNode.insertBefore(p, a.node);
    puffs.push({ el: p, x: a.x + rnd(-4, 4) * S, y: a.y + rnd(0, 6) * S, life: 1, vx: rnd(-30, 30) * S });
  };

  return {
    awake: () => true,
    tick(dt) {
      const s = spot();
      a.x = s.x;
      if (!reduced()) {
        if (state === 'count') {
          t -= dt;
          a.ox = rnd(-1, 1) * S;
          if (t <= 0) { count--; if (count > 0) { a.say('#' + count, 700); t = .7; } else { state = 'up'; v = 0; a.ox = 0; a.say('up', 600); } }
        } else if (state === 'up') {
          v += 1500 * S * dt; alt += v * dt;
          if (chance(dt * 40)) puff();
          if (alt > s.y + 300 * S) { state = 'away'; t = 1.2; }
        } else if (state === 'away') {
          t -= dt; if (t <= 0) { state = 'down'; v = 420 * S; }
        } else if (state === 'down') {
          /* retro-rockets: ease to a gentle touchdown */
          v = Math.max(60 * S, Math.min(v, alt * 2.2)); alt -= v * dt;
          if (chance(dt * 18)) puff();
          if (alt <= 0) { alt = 0; state = 'pad'; a.sy = .82; a.sx = 1.18; shout(a, 'thud', 160 * S); }
        }
      }
      a.y = s.y - alt;
      a.play(state === 'up' || state === 'down' ? 'burn' : 'idle');
      a.sx = lerp(a.sx, 1, .2); a.sy = lerp(a.sy, 1, .2);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt * 1.4; p.y += 30 * S * dt; p.x += p.vx * dt;
        p.el.style.opacity = Math.max(0, p.life).toFixed(2);
        p.el.style.transform = `translate3d(${Math.round(p.x - origin.x)}px,${Math.round(p.y - origin.y)}px,0) scale(${(2 - p.life).toFixed(2)})`;
        if (p.life <= 0) { p.el.remove(); puffs.splice(i, 1); }
      }
    },
    poke() { if (state === 'pad') { state = 'count'; count = 3; t = .7; a.say('#3', 700); } },
    destroy() { puffs.forEach(p => p.el.remove()); }
  };
});
