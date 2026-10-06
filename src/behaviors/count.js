/* count: sheep trotting along an element and jumping a fence in the middle, one at a
 * time, forever. The fence keeps count. Lovely for loading states.
 *   count="3"   number of sheep   speed="1" */
defineBehavior('count', (a, [el], host) => {
  const S = a.s / 3;
  const n = clamp(+host.getAttribute('count') || 3, 1, 10);
  const fence = recruit(a, 'fence');
  const flock = [a, ...Array.from({ length: n - 1 }, () => recruit(a, 'sheep'))];
  const speed = 46 * S * (+host.getAttribute('speed') || 1);
  let off = 0, total = 0;
  const passed = flock.map(() => false);
  a.node.parentNode.insertBefore(fence.node, a.node);   /* sheep jump in front of the fence */

  return {
    crew: [fence, ...flock.slice(1)],
    tick(dt) {
      const r = rectOf(el);
      const span = r.w + 60 * S, mid = r.l + r.w / 2;
      fence.x = mid; fence.y = r.t; fence.play('idle');
      if (!reduced()) off += speed * dt;
      flock.forEach((sh, i) => {
        const pos = ((off + i * span / n) % span + span) % span;
        const x = r.l - 30 * S + pos;
        sh.x = x; sh.y = r.t; sh.face = 1;
        /* the jump: a hop centred on the fence */
        const d = Math.abs(x - mid), J = 34 * S;
        if (d < J) { sh.oy = -Math.cos(d / J * Math.PI / 2) * 30 * S; sh.play('jump'); }
        else { sh.oy = 0; sh.play('walk'); }
        if (x > mid && !passed[i]) { passed[i] = true; total++; fence.say('#' + total, 0); }
        if (x < mid) passed[i] = false;
        const edge = Math.min(pos, span - pos);
        sh.node.style.opacity = clamp(edge / (30 * S), 0, 1).toFixed(2);
      });
    },
    poke(e, who) { (who || a).say('heart', 700); }
  };
});
