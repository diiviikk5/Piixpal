/* STICKERS: a sheet of pixel stickers your visitors can peel off and slap anywhere on the
 * page. Drag one off the sheet, drop it on a heading, a photo, the footer; it stays there
 * (in that visitor's browser) the next time they come back. Drag a stuck sticker to move
 * it, double-click to peel it off.   @component stickers
 *
 *   <piix-stickers></piix-stickers>
 *   names="heart,star,bolt,mochi,ufo"   which stickers (built-ins, or any sprite's name)
 *   el.clear()                          peel every sticker off this page */

/* the built-in stickers: little pieces of pixel art (a = fill, b = shade, k = ink) */
const STICKER_ART = {
  heart: { pal: { a: '#ff4d6d', b: '#c92a4b', w: '#ffc4cf' }, rows: ['.kk...kk.', 'kawk.kaak', 'kwaakaaak', 'kaaaaaaak', '.kaaaaak.', '..kaabk..', '...kbk...', '....k....'] },
  star: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['....k....', '...kak...', '...kwk...', 'kkkkaakkk', 'kwaaaaabk', '.kaaaaak.', '..kaaabk.', '.kaakkabk', '.kbk..kbk', '.kk....kk'] },
  bolt: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['...kkkk', '..kwaak', '..kaak.', '.kaak..', 'kaaakkk', 'kkkaaak', '..kaak.', '.kaak..', '.kbk...', 'kk.....'] },
  smile: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#fff3b0' }, rows: ['..kkkkk..', '.kwaaaak.', 'kwakaakak', 'kaakaakak', 'kaaaaaaak', 'kakaaakak', 'kaakkkaak', '.kbaaabk.', '..kkkkk..'] },
  crown: { pal: { a: '#ffd23f', b: '#d9a52a', w: '#ff4d6d' }, rows: ['k...k...k', 'kk.kak.kk', 'kakaaakak', 'kaaaaaaak', 'kawaawaak', 'kbbbbbbbk', 'kkkkkkkkk'] },
  wow: { pal: { a: '#fffdf5', b: '#ff4d6d', w: '#e9e2d0' }, rows: ['.kkkkkkkk.', 'kaaaaaaaak', 'kabababbak', 'kabababbak', 'kaabbabbak', 'kaaaaaaaak', '.kkkkkkkk.', '...kk.....', '..kk......'] }
};

/* the pixels of a sticker as a canvas: a built-in, or any registered sprite's first frame */
const stickerArt = name => {
  if (STICKER_ART[name]) {
    const { pal, rows } = STICKER_ART[name], w = Math.max(...rows.map(r => r.length));
    const rgba = { k: hexRGBA('#17121f') };
    for (const k in pal) rgba[k] = hexRGBA(pal[k]);
    return bake(rows, rgba, w, rows.length);
  }
  if (FIGURES[name]) return bakeFigure(FIGURES[name], figurePalette(FIGURES[name]))[0];
  if (SPRITES[name]) { const f = baked(SPRITES[name]); return f[Object.keys(f)[0]][0]; }
  return null;
};

/* die-cut: the art scaled up (all about the same size), a thick white border following its outline, a soft grey edge */
const stickerCut = (src, s = Math.max(1, Math.round(28 / Math.max(src.width, src.height)))) => {
  const B = 3, w = src.width * s + B * 4, h = src.height * s + B * 4;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const stamp = (color, r) => {
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) tg.drawImage(src, B * 2 + dx, B * 2 + dy, src.width * s, src.height * s);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = color; tg.fillRect(0, 0, w, h);
    g.drawImage(t, 0, 0);
  };
  stamp('#d9d4e3', B * 2); stamp('#ffffff', B * 2 - 1);
  g.drawImage(src, B * 2, B * 2, src.width * s, src.height * s);
  return c;
};

/* where a sticker is stuck: a path to the element under it, and where on that element */
const stickerPath = el => {
  const parts = [];
  for (let e = el; e && e !== document.body && e.parentElement; e = e.parentElement) {
    if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
    parts.unshift(`${e.tagName.toLowerCase()}:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`);
  }
  return parts.join('>');
};
const stickerFind = path => { try { return path ? document.querySelector(path.startsWith('#') ? path : 'body>' + path) : null; } catch (_) { return null; } };

const STICKER_CSS = `
:host{display:inline-block;vertical-align:middle}
.sheet{display:grid;grid-template-columns:repeat(3,auto);gap:10px;padding:14px 14px 12px;border-radius:16px;background:#fffdf5;
  box-shadow:0 0 0 2px #17121f,0 6px 0 rgba(23,18,31,.25);background-image:radial-gradient(#e9e2d0 1px,transparent 1.3px);background-size:10px 10px}
.t{grid-column:1/-1;font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6c6477}
.s{display:grid;place-items:center;cursor:grab;touch-action:none;transition:transform .15s;user-select:none;-webkit-user-select:none}
.s:hover{transform:translateY(-2px) rotate(-4deg)}
.s canvas{display:block;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(23,18,31,.25))}`;

class PiixStickersElement extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    const names = (this.getAttribute('names') || 'heart,star,bolt,smile,crown,wow').split(',').map(s => s.trim()).filter(Boolean);
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STICKER_CSS}</style><div class="sheet" role="group" aria-label="Stickers: drag one onto the page"><div class="t">stickers · peel me</div></div>`;
    const sheet = root.querySelector('.sheet');
    this._box = boxOf(this);
    this._key = 'piix-stickers:' + location.pathname + (this._box ? ':' + (this._box.id || 'box') : '');
    this._placed = [];
    this._art = {};
    for (const n of names) {
      const art0 = stickerArt(n);
      if (!art0) continue;
      this._art[n] = art0;
      const c = stickerCut(art0);
      c.style.width = c.width + 'px'; c.style.height = c.height + 'px';
      const s = document.createElement('div');
      s.className = 's'; s.title = n; s.appendChild(c);
      s.addEventListener('pointerdown', e => this._peel(e, n));
      sheet.appendChild(s);
    }
    /* stuck ones come back where they were */
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(this._key)) || []; } catch (_) { /* private mode */ }
    requestAnimationFrame(() => saved.forEach(st => this._stick(st, false)));
    this._tick = () => this._placed.forEach(p => this._place(p));
    sub(this._tick);
  }
  disconnectedCallback() { if (this._tick) unsub(this._tick); this._placed.forEach(p => p.el.remove()); this._placed = []; this._ready = false; }
  clear() { this._placed.slice().forEach(p => this._unstick(p)); }
  _save() { try { localStorage.setItem(this._key, JSON.stringify(this._placed.map(p => p.st))); } catch (_) { /* private mode */ } }
  /* a sticker node in the pals' layer */
  _make(n) {
    const art0 = this._art[n] || stickerArt(n);
    if (!art0) return null;
    const c = stickerCut(art0);
    c.style.cssText = `display:block;width:${c.width}px;height:${c.height}px;image-rendering:pixelated;pointer-events:auto;cursor:grab;touch-action:none;filter:drop-shadow(0 3px 0 rgba(23,18,31,.25));transition:transform .18s cubic-bezier(.34,1.56,.64,1),filter .18s`;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
    el.appendChild(c);
    getLayer().appendChild(el);
    return { el, c, w: c.width, h: c.height };
  }
  /* where a stuck sticker is now: on its element if it's still there, else where it was */
  _place(p) {
    const host = stickerFind(p.st.path);
    let x = p.st.x, y = p.st.y;
    if (host) { const r = host.getBoundingClientRect(); if (r.width || r.height) { x = r.left + scrollX + p.st.fx * r.width; y = r.top + scrollY + p.st.fy * r.height; } }
    p.el.style.transform = `translate3d(${Math.round(x - p.w / 2 - origin.x)}px,${Math.round(y - p.h / 2 - origin.y)}px,0)`;
    p.c.style.transform = `rotate(${p.st.r}deg)` + (p.lift ? ' scale(1.12)' : '');
  }
  _stick(st, fresh) {
    if (this._placed.length >= 40) return;
    const m = this._make(st.n);
    if (!m) return;
    const p = Object.assign(m, { st });
    this._placed.push(p);
    p.c.addEventListener('pointerdown', e => this._drag(e, p));
    p.c.addEventListener('dblclick', () => this._unstick(p));
    this._place(p);
    if (fresh && !reduced()) { p.c.style.transform = `rotate(${st.r}deg) scale(1.35)`; requestAnimationFrame(() => requestAnimationFrame(() => this._place(p))); }
    if (fresh) this._save();
  }
  _unstick(p) {
    this._placed.splice(this._placed.indexOf(p), 1);
    this._save();
    if (reduced()) { p.el.remove(); return; }
    p.c.style.transition = 'transform .25s ease-in,opacity .25s';
    p.c.style.transform = `rotate(${p.st.r + 30}deg) scale(.4) translateY(-20px)`;
    p.c.style.opacity = '0';
    setTimeout(() => p.el.remove(), 260);
  }
  /* where it lands: on the element underneath, kept inside the box if there is one */
  _drop(cx, cy, n, r) {
    let x = cx + scrollX, y = cy + scrollY;
    if (this._box) { const b = rectOf(this._box); x = clamp(x, b.l + 20, b.r - 20); y = clamp(y, b.t + 20, b.b - 20); }
    const under = document.elementsFromPoint(x - scrollX, y - scrollY).find(e => !e.closest('[data-piixpal],[data-piixpal-ui],piix-stickers') && e !== document.documentElement) || document.body;
    const ur = under.getBoundingClientRect();
    return { n, r, x, y, path: stickerPath(under), fx: ur.width ? (x - ur.left - scrollX) / ur.width : 0, fy: ur.height ? (y - ur.top - scrollY) / ur.height : 0 };
  }
  _peel(e, n) {
    if (e.button > 0) return;
    e.preventDefault();
    const m = this._make(n);
    if (!m) return;
    const p = Object.assign(m, { st: { n, r: -8, x: e.clientX + scrollX, y: e.clientY + scrollY, path: '', fx: 0, fy: 0 }, lift: true });
    p.c.style.filter = 'drop-shadow(0 12px 6px rgba(23,18,31,.3))';
    this._place(p);
    const move = ev => { p.st.x = ev.clientX + scrollX; p.st.y = ev.clientY + scrollY; this._place(p); };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      p.el.remove();
      this._stick(this._drop(ev.clientX, ev.clientY, n, Math.round(rnd(-14, 14))), true);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  _drag(e, p) {
    if (e.button > 0) return;
    e.preventDefault();
    p.lift = true; p.c.style.filter = 'drop-shadow(0 12px 6px rgba(23,18,31,.3))';
    const move = ev => { p.st = Object.assign({}, p.st, { x: ev.clientX + scrollX, y: ev.clientY + scrollY, path: '' }); this._place(p); };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      p.lift = false; p.c.style.filter = 'drop-shadow(0 3px 0 rgba(23,18,31,.25))';
      p.st = this._drop(ev.clientX, ev.clientY, p.st.n, p.st.r);
      this._place(p); this._save();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
}
define('piix-stickers', PiixStickersElement);
ELEMENTS.stickers = 'piix-stickers';
