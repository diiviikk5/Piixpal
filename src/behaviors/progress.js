/* progress: a reading-progress bar with a runner on it. The bar fills as you scroll;
 * the runner keeps pace, idles when you stop, and celebrates at the end of the page.
 *   side="bottom|top"   where the bar sits (default bottom)   color="#c6f432"
 *   box="selector"   draw the bar along that element's edge instead of the screen's */
defineBehavior('progress', (a, targets, host) => {
  const S = a.s / 3;
  const side = host.getAttribute('side') === 'top' ? 'top' : 'bottom';
  const H = Math.max(3, Math.round(a.s * 1.4));
  const bar = document.createElement('div');
  bar.setAttribute('aria-hidden', 'true');
  bar.style.cssText = `position:fixed;left:0;${side}:0;height:${H}px;width:0;z-index:var(--piix-z,2147482000);pointer-events:none;` +
    `background:${host.getAttribute('color') || '#c6f432'};box-shadow:0 0 0 1px rgba(23,18,31,.25);transition:width .08s linear`;
  const boxEl = boxOf(host);
  if (boxEl) {
    if (getComputedStyle(boxEl).position === 'static') boxEl.style.position = 'relative';
    bar.style.position = 'absolute'; bar.style.zIndex = '1';
    if (side === 'bottom') bar.style.borderRadius = '0 0 0 12px';
    boxEl.appendChild(bar);
  } else {
    document.body.appendChild(bar);
    /* the runner rides the fixed bar, so pin it to the viewport too */
    a.node.style.position = 'fixed';
  }
  let x = 0, done = false, lastY = scrollY;

  return {
    awake: () => true,
    tick(dt) {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = clamp(scrollY / max, 0, 1);
      bar.style.width = (p * 100).toFixed(2) + '%';
      const bx = boxEl && rectOf(boxEl);
      const vw = bx ? boxEl.clientWidth : document.documentElement.clientWidth;
      const want = clamp(p * vw, a.w / 2, vw - a.w / 2);
      const moving = Math.abs(scrollY - lastY) > .5;
      if (moving) a.face = scrollY > lastY ? 1 : -1;
      lastY = scrollY;
      x = reduced() ? want : lerp(x, want, 1 - Math.exp(-10 * dt));
      if (bx) {
        /* along the box's edge, in doc coords */
        const bl = bx.l + boxEl.clientLeft, bt = bx.t + boxEl.clientTop;
        a.x = bl + x;
        a.y = side === 'top' ? bt + H + a.h : bt + boxEl.clientHeight - H;
      } else {
        /* viewport coords, offset by the layer origin so render() lands them right */
        a.x = x + origin.x;
        a.y = (side === 'top' ? H + a.h : innerHeight - H) + origin.y;
      }
      if (p > .995 && !done) { done = true; a.say('star', 1600); a.play('cheer'); }
      if (p < .97) done = false;
      if (done) a.play('cheer');
      else a.play(moving ? 'run' : 'idle', { fps: moving ? clamp(8 + Math.abs(scroll.v) / 120, 8, 22) : 2 });
    },
    poke() { a.say('up', 700); scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); },
    destroy() { bar.remove(); }
  };
});
