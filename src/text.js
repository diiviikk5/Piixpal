/* Text geometry shared by every pal that lives on text. */
/* Per-glyph contour of an element's first line of text: [{l, r, t}] in doc coords.
 * Each glyph's real ink top is measured with canvas metrics, so a pal climbs onto
 * a tall "T", steps down to an "e" and hops across spaces. Cached until layout moves. */
const measureCtx = document.createElement('canvas').getContext('2d');
const glyphTop = (ch, font) => {
  measureCtx.font = font;
  const m = measureCtx.measureText(ch);
  return [m.fontBoundingBoxAscent || 0, m.actualBoundingBoxAscent || 0];
};
const textProfile = (el, cache) => {
  const box = el.getBoundingClientRect();
  const key = [box.left, box.top, box.width, box.height, scrollX, scrollY, document.fonts.status].join();
  if (cache.key === key) return cache.v;
  const segs = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const rg = document.createRange();
  let top = null, n, count = 0;
  outer: while ((n = walk.nextNode())) {
    const p = n.parentElement;
    if (!p || p.closest('piix-pal')) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const txt = n.data;
    for (let i = 0; i < txt.length && count < 400; i++, count++) {
      rg.setStart(n, i); rg.setEnd(n, i + 1);
      const r = rg.getClientRects()[0];
      if (!r || r.width < .5) continue;
      if (top === null) top = r.top;
      if (r.top - top > r.height * .6) break outer;   /* reached the second line */
      if (/\s/.test(txt[i])) continue;              /* spaces are gaps */
      const [fa, ga] = glyphTop(txt[i], font);
      segs.push({ l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY + (fa - ga) });
    }
  }
  /* glue neighbours into runs so tiny kerning gaps don't count as holes */
  for (let i = 1; i < segs.length; i++) if (segs[i].l - segs[i - 1].r < 2) segs[i - 1].r = segs[i].l;
  const v = segs.length ? { l: segs[0].l, r: segs[segs.length - 1].r, t: Math.min(...segs.map(s => s.t)), segs } : null;
  cache.key = key; cache.v = v;
  return v;
};
const segAt = (segs, x) => { for (const s of segs) if (x >= s.l && x <= s.r) return s.t; return null; };

/* ---------- surfaces: the top edges things can stand or land on ---------- */
/* what counts as a surface by default (toys, the platformer, weather…) */
const LAND = 'h1,h2,h3,h4,p,li,button,.btn,img,pre,blockquote,figure,footer,nav,header,table,.card,[data-piix-land]';
const platCache = { at: -1, sel: '', list: [] };
/* a surface: text elements use their first line's glyph tops, everything else its box */
const TEXTY = /^(H[1-6]|P|LI|BLOCKQUOTE|DT|DD|FIGCAPTION|LABEL)$/;
const surfaceOf = el => {
  const r = el.getBoundingClientRect();
  if (r.width <= 8 || r.height <= 2 || r.bottom < -400 || r.top > innerHeight + 2000) return null;
  if (TEXTY.test(el.tagName)) {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter(q => q.width > 1);
    if (rs.length) {
      const top = rs[0].top, line = rs.filter(q => q.top - top < 4);
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      return { el, l: Math.min(...line.map(q => q.left)) + scrollX, r: Math.max(...line.map(q => q.right)) + scrollX, t: top + scrollY + (line[0].height - fs) / 2 + fs * .26 };
    }
  }
  return { el, l: r.left + scrollX, r: r.right + scrollX, t: r.top + scrollY };
};
/* every surface's top edge in doc coords, measured at most once per frame for everyone */
const platforms = (sel, extra) => {
  const t = Math.floor(now() / 16);
  if (platCache.at !== t || platCache.sel !== sel) {
    platCache.at = t; platCache.sel = sel;
    let els = [];
    try { els = [...document.querySelectorAll(sel)]; } catch (_) { /* bad selector */ }
    platCache.list = els.map(surfaceOf).filter(Boolean);
  }
  if (extra) { const p = surfaceOf(extra); return p ? platCache.list.concat(p) : platCache.list; }
  return platCache.list;
};
