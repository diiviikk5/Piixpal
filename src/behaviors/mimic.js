/* mimic: a copycat cursor. Replays the exact path your cursor took a moment ago and
 * clicks wherever you clicked. Stop moving and it catches up and dances. It never
 * catches clicks itself.   delay="0.5" seconds behind   box="selector" only inside that element */
defineBehavior('mimic', (a, targets, host) => {
  const delay = (+host.getAttribute('delay') || .5) * 1000;
  const path = [], clicks = [];
  const boxEl = boxOf(host);
  const inside = (x, y) => { if (!boxEl) return true; const b = rectOf(boxEl); return x >= b.l && x <= b.r && y >= b.t && y <= b.b; };
  let lx = null, ly = null, ripple = 0;
  a.node.classList.add('ghost');
  const ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:24px;margin:-12px 0 0 -12px;border:3px solid #c6f432;border-radius:50%;pointer-events:none;opacity:0';
  a.node.parentNode.insertBefore(ring, a.node);
  const mv = () => { if (!inside(ptr.x, ptr.y)) return; path.push({ t: now(), x: ptr.x, y: ptr.y }); if (path.length > 600) path.shift(); };
  const dn = e => { if (e.button === 0 && inside(e.clientX + scrollX, e.clientY + scrollY)) clicks.push({ t: now(), x: e.clientX + scrollX, y: e.clientY + scrollY }); };
  addEventListener('pointermove', mv, { passive: true });
  addEventListener('pointerdown', dn, { passive: true });

  return {
    awake: () => true,
    tick(dt) {
      const t = now() - delay;
      /* where was the cursor `delay` ago? */
      while (path.length > 1 && path[1].t <= t) path.shift();
      const p = path[0];
      const idle = now() - ptr.last > delay + 1200;
      if (p) {
        const tx = idle ? ptr.x + 18 : p.x, ty = idle ? ptr.y + 18 : p.y;
        lx = lx == null ? tx : lerp(lx, tx, idle ? 1 - Math.exp(-4 * dt) : 1);
        ly = ly == null ? ty : lerp(ly, ty, idle ? 1 - Math.exp(-4 * dt) : 1);
      }
      if (lx == null) { a.node.style.opacity = '0'; return; }
      a.node.style.opacity = ptr.seen && ptr.cx > -1e4 && inside(ptr.x, ptr.y) ? '1' : '0';
      /* the arrow's tip is its top-left pixel */
      a.x = lx + a.w / 2; a.y = ly + a.h;
      while (clicks.length && clicks[0].t <= t) {
        const c = clicks.shift();
        ripple = .45; a.play('click');
        ring.style.transform = `translate3d(${Math.round(c.x - origin.x)}px,${Math.round(c.y - origin.y)}px,0) scale(.3)`;
      }
      if (ripple > 0) {
        ripple -= dt;
        const k = 1 - ripple / .45;
        ring.style.opacity = (1 - k).toFixed(2);
        ring.style.transform = ring.style.transform.replace(/scale\([^)]*\)/, `scale(${(.3 + k * 1.4).toFixed(2)})`);
        if (ripple <= 0) a.play('idle');
      } else a.play(idle && !reduced() ? 'dance' : 'idle');
    },
    destroy() { removeEventListener('pointermove', mv); removeEventListener('pointerdown', dn); ring.remove(); }
  };
});
