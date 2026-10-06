/* signal: shows Wi-Fi bars that depend on how close the cursor is. Full bars and a
 * grin up close, no signal and a frown far away. */
defineBehavior('signal', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .85;
  let level = 0, shown = 0;
  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at; a.y = r.t;
      const d = ptr.seen && ptr.cx > -1e4 ? ptrDist(a.x, a.y - a.h / 2) : 1e9;
      const want = d < 90 * S ? 3 : d < 220 * S ? 2 : d < 420 * S ? 1 : 0;
      level = lerp(level, want, 1 - Math.exp(-3 * dt));
      const n = Math.round(level);
      if (n !== shown) { if (n === 0) a.say('...', 900); if (n === 3 && shown < 3) a.say('heart', 700); shown = n; }
      a.play('s' + n);
    },
    poke() { a.say(shown === 3 ? 'heart' : '?', 700); }
  };
});
