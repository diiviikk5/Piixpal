/* type: types lines into a little terminal bubble above the pal, character by
 * character, pausing between lines.  lines="first|second|third"   speed="1" */
defineBehavior('type', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
  const lines = (host.getAttribute('lines') || 'npm i piixpal|added 1 package, 0 vulnerabilities|✓ pals deployed').split('|');
  const cps = 22 * (+host.getAttribute('speed') || 1);
  const term = document.createElement('div');
  term.style.cssText = `position:absolute;left:0;top:0;transform-origin:50% 100%;pointer-events:none;white-space:pre;max-width:320px;overflow:hidden;
    font:600 ${Math.max(11, Math.round(a.s * 4))}px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#c6f432;background:#17121f;
    padding:${a.s * 2}px ${a.s * 3}px;border-radius:${a.s * 2}px;box-shadow:0 0 0 ${Math.max(2, a.s - 1)}px #17121f,0 ${a.s}px 0 ${Math.max(2, a.s - 1)}px rgba(23,18,31,.35)`;
  a.node.parentNode.appendChild(term);
  let li = 0, ci = 0, pause = .6, blinkT = 0;

  return {
    tick(dt) {
      const r = rectOf(el);
      a.x = r.l + a.w / 2 + (r.w - a.w) * at; a.y = r.t;
      const line = lines[li % lines.length];
      if (reduced()) ci = line.length;
      else if (pause > 0) pause -= dt;
      else if (ci < line.length) { ci = Math.min(line.length, ci + cps * dt * rnd(.4, 1.6)); if (ci >= line.length) pause = 1.6; }
      else { li++; ci = 0; pause = .35; }
      blinkT += dt;
      const caret = Math.floor(blinkT * 2) % 2 ? '█' : ' ';
      term.textContent = '$ ' + line.slice(0, Math.floor(ci)) + caret;
      a.play(ci > 0 && ci < line.length ? 'typing' : 'idle');
      const w = term.offsetWidth, h = term.offsetHeight;
      term.style.transform = `translate3d(${Math.round(clamp(a.x - w / 2, 4, docW() - w - 4) - origin.x)}px,${Math.round(a.y - a.h - h - 10 * S - origin.y)}px,0)`;
    },
    poke() { li++; ci = 0; pause = 0; a.say('!', 400); },
    destroy() { term.remove(); }
  };
});
