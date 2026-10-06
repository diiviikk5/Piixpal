/* select: reacts to text selection. Select something inside its element (or anywhere,
 * with on="body") and it hops to the end of your selection; copy it and it shows a
 * clipboard. Clear the selection and it hops home. */
defineBehavior('select', (a, [el], host) => {
  const S = a.s / 3;
  const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .9;
  const cache = {};
  let goal = null, hop = null, cheer = 0;
  const home = () => {
    const tp = textProfile(el, cache);
    if (tp) { const x = tp.l + (tp.r - tp.l) * at; return { x, y: segAt(tp.segs, x) ?? tp.t }; }
    const r = rectOf(el); return { x: r.l + r.w * at, y: r.t };
  };
  const go = (x, y) => { hop = { x0: a.x, y0: a.y, x1: x, y1: y, p: 0 }; };
  const onSel = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (goal) { goal = null; const h = home(); go(h.x, h.y); } return; }
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer) && el !== document.body) return;
    const rects = [...range.getClientRects()].filter(r => r.width > 0);
    const last = rects[rects.length - 1];
    if (!last) return;
    goal = { x: last.right + scrollX + a.w * .6, y: last.top + scrollY + 2 };
    go(goal.x, goal.y); a.play('hold'); a.say('!', 500);
  };
  const onCopy = () => { if (goal) { cheer = 1.4; a.say('copy', 1200); } };
  document.addEventListener('selectionchange', onSel);
  document.addEventListener('copy', onCopy);

  return {
    tick(dt) {
      if (hop) {
        hop.p = Math.min(1, hop.p + dt / .35);
        const p = hop.p, q = 1 - p, top = Math.min(hop.y0, hop.y1) - 40 * S;
        a.x = lerp(hop.x0, hop.x1, p); a.y = q * q * hop.y0 + 2 * q * p * top + p * p * hop.y1;
        if (p >= 1) hop = null;
        return;
      }
      if (goal) { a.x = goal.x; a.y = goal.y; }
      else { const h = home(); a.x = h.x; a.y = h.y; }
      cheer -= dt;
      a.play(cheer > 0 ? 'happy' : goal ? 'hold' : 'idle');
    },
    poke() { cheer = .8; a.say('heart', 700); },
    destroy() { document.removeEventListener('selectionchange', onSel); document.removeEventListener('copy', onCopy); }
  };
});
