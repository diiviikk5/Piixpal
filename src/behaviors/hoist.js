/* hoist: flies above an element holding it up on a rope, like a bird towing a banner.
 * at="0…1" picks the point along the top edge; two pals at .1 and .9 carry a banner between them.
 * length is the rope in px (default 18); 0 or less and the pal grips the edge itself.
 * They bob out of step, lean when the cursor tugs past, and cheer when poked. */
defineBehavior('hoist', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const L = (host.hasAttribute('length') ? +host.getAttribute('length') || 0 : 18) * S;
  const phase = at * 5.3;
  let lean = 0, cheer = 0;

  const rope = document.createElement('div');
  rope.className = 'thread';
  rope.style.width = Math.max(1, Math.round(a.s / 2)) + 'px';
  rope.style.color = host.getAttribute('silk') || '#17121f';
  a.node.parentNode.insertBefore(rope, a.node);
  a.face = at > .5 ? -1 : 1;

  return {
    tick(dt, t) {
      const r = rectOf(el);
      const ax = r.l + r.w * at, ay = r.t;
      const still = reduced();
      /* the cursor brushing past gives the pal a nudge sideways */
      const near = ptr.seen && Math.abs(ptr.x - a.x) < 50 * S && Math.abs(ptr.y - (a.y - a.h / 2)) < 50 * S;
      if (!still && near) lean += clamp(ptr.vx * .002, -3, 3) * dt * 60;
      lean -= lean * Math.min(1, dt * 4);
      lean = clamp(lean, -14 * S, 14 * S);
      const bob = still ? 0 : Math.sin(t / 380 + phase) * 2 * S;
      a.x = ax + lean;
      a.y = ay - L + bob - (cheer > 0 ? Math.sin(cheer * 12) * 4 * S : 0);
      a.rot = still ? 0 : lean * .6 / S;
      cheer = Math.max(0, cheer - dt);
      a.play(cheer > 0 && a.frames.happy ? 'happy' : a.frames.fly ? 'fly' : 'idle');
      const dx = ax - a.x, dy = ay - a.y, len = Math.hypot(dx, dy);
      rope.style.display = dy > 1 ? '' : 'none';
      rope.style.height = Math.round(len) + 'px';
      rope.style.transform = `translate3d(${Math.round(a.x - origin.x)}px,${Math.round(a.y - origin.y)}px,0) rotate(${(Math.atan2(-dx, dy) * 57.3).toFixed(1)}deg)`;
    },
    poke() { cheer = .9; a.say(chance(.5) ? '!' : 'heart', 900); },
    destroy() { rope.remove(); }
  };
});
