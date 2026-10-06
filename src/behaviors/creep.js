/* creep: glides very slowly along the top of an element's text (or edge), leaving a
 * shimmering slime trail that fades out behind it. Hides in its shell when the cursor
 * gets close or something thuds nearby, then peeks out and carries on. */
defineBehavior('creep', (a, [el], host) => {
  const S = a.s / 3;
  const speed = 9 * S * (+host.getAttribute('speed') || 1);
  const mode = host.getAttribute('edge') || (typeof el.piixSurface === 'function' ? 'surface' : 'text');
  const cache = {};
  let box = null, state = 'walk', timer = rnd(4, 8), placed = false, run = 0, lastY = 0;

  const slime = document.createElement('div');
  slime.style.cssText = `position:absolute;left:0;top:0;height:${Math.max(2, Math.round(a.s * .7))}px;pointer-events:none;border-radius:2px;` +
    'background:linear-gradient(90deg,rgba(150,225,255,0),rgba(150,225,255,.55) 70%,rgba(255,255,255,.85));' +
    'transform-origin:100% 50%';
  a.node.parentNode.insertBefore(slime, a.node);

  const lane = () => {
    if (mode === 'surface') { const r = rectOf(el); return { l: r.l, r: r.r, t: r.t }; }
    if (mode === 'text') { const t = textProfile(el, cache); if (t) return t; }
    const r = rectOf(el); return { l: r.l, r: r.r, t: r.t };
  };
  const surf = x => {
    if (x < box.l + a.w * .35 || x > box.r - a.w * .35) return null;
    if (mode === 'surface') return el.piixSurface(x);
    return box.segs ? segAt(box.segs, x) : box.t;
  };
  const hide = t => { state = 'hide'; timer = t; a.play('hide'); };

  return {
    tick(dt) {
      box = lane();
      if (!placed) {
        const at = host.getAttribute('at');
        a.x = box.l + (box.r - box.l) * (at != null ? clamp(+at, 0, 1) : rnd(.2, .8));
        a.y = surf(a.x) ?? box.t; lastY = a.y; a.face = chance(.5) ? 1 : -1; placed = true;
      }
      const g = surf(a.x);
      if (g != null) a.y = g;
      if (reduced()) { a.play('idle'); slime.style.width = '0px'; return; }

      const near = ptr.seen && ptrDist(a.x, a.y - a.h / 2) < 60 * S + a.w / 2;
      timer -= dt;
      switch (state) {
        case 'walk': {
          a.play('walk');
          if (near) { hide(rnd(2.5, 4)); a.say('sweat', 700); break; }
          const nx = a.x + a.face * speed * dt;
          const ny = surf(nx);
          /* snails don't jump: at a gap or an edge, it turns around */
          if (ny == null || Math.abs(ny - a.y) > a.h * .9) { a.face = -a.face; run = 0; state = 'rest'; timer = rnd(1, 2); a.play('idle'); break; }
          a.x = nx; a.y = ny;
          run = Math.abs(a.y - lastY) > 1 ? 0 : Math.min(run + speed * dt, 170 * S);
          lastY = a.y;
          if (timer <= 0) { state = 'rest'; timer = rnd(1.5, 3); a.play('idle'); }
          break;
        }
        case 'rest':
          if (near) { hide(rnd(2.5, 4)); break; }
          if (timer <= 0) { state = 'walk'; timer = rnd(5, 10); if (chance(.25)) { a.face = -a.face; run = 0; } }
          break;
        case 'hide':
          a.play('hide');
          if (near) timer = Math.max(timer, 1.2);
          if (timer <= 0) { state = 'peek'; timer = rnd(.8, 1.4); a.play('peek'); }
          break;
        case 'peek':
          if (near) { hide(rnd(2, 3)); break; }
          if (timer <= 0) { state = 'walk'; timer = rnd(4, 8); }
          break;
      }

      /* the trail sits under the shell and stretches out behind it, fading */
      const len = Math.round(run);
      const tail = a.face > 0 ? a.x - a.w * .25 - len : a.x + a.w * .25;
      slime.style.width = len + 'px';
      slime.style.transform = `translate3d(${Math.round(tail - origin.x)}px,${Math.round(a.y - 2 - origin.y)}px,0) scaleX(${a.face > 0 ? 1 : -1})`;
      slime.style.transformOrigin = a.face > 0 ? '100% 50%' : '0 50%';
    },
    poke() { hide(rnd(3, 4.5)); a.say(pick(['!', 'eep']), 700); },
    hear(type) { if (type === 'thud') hide(rnd(2.5, 4)); },
    destroy() { slime.remove(); }
  };
});
