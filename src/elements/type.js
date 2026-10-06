/* <piix-type text="PIIXPAL" rows="18" cell="8" color="#16111f" shade="#c6f432" depth="1" fit>
 * Any font, rasterised into chunky blocks with an extruded shadow.
 * Pixels rain in on load, lift off their shadow around the cursor, and ripple when clicked.
 * Exposes piixSurface(x) so pals can walk on the actual letter tops. */
class PiixTypeElement extends HTMLElement {
  static get observedAttributes() { return ['text', 'rows', 'cell', 'font', 'weight', 'color', 'shade', 'depth', 'gap', 'fit', 'align', 'intro']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tick = this._tick.bind(this);
    this._pm = this._pm.bind(this);
    this._pd = this._pd.bind(this);
    this._cells = []; this._on = false; this._tok = 0; this._waves = [];
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
:host{display:block;line-height:0;position:relative}
canvas{display:block;pointer-events:none;image-rendering:pixelated}
</style><canvas aria-hidden="true"></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._g = this._cv.getContext('2d');
    this.setAttribute('role', 'img');
    this._ro = new ResizeObserver(() => { if (this._cols) this._layout(); });
    this._ro.observe(this);
    addEventListener('pointermove', this._pm, { passive: true });
    this.addEventListener('pointerdown', this._pd);
    this._raster();
  }
  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    removeEventListener('pointermove', this._pm);
    this.removeEventListener('pointerdown', this._pd);
    unsub(this._tick); this._on = false;
  }
  attributeChangedCallback(n) {
    if (!this._cv) return;
    if (['text', 'rows', 'font', 'weight', 'align'].includes(n)) { clearTimeout(this._rt); this._rt = setTimeout(() => this._raster(), 40); }
    else if (this._cols) this._layout();
  }
  get text() { return (this.getAttribute('text') ?? this.textContent).trim(); }

  /* rain the pixels in again */
  replay() { this._seedIntro(); this._wake(); }

  /* doc-y of the top letter pixel at doc-x, or null over a gap */
  piixSurface(x) {
    if (!this._cols) return null;
    const r = this._cv.getBoundingClientRect();
    const c = Math.floor((x - scrollX - r.left) / this._cell);
    const top = this._top[c];
    return top == null ? null : r.top + scrollY + this._head + top * this._cell;
  }

  async _raster() {
    const tok = ++this._tok;
    const lines = this.text.split(/\||\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) { this._cols = 0; return; }
    const rows = +this.getAttribute('rows') || 18;
    const weight = this.getAttribute('weight') || 800;
    const fam = this.getAttribute('font') || getComputedStyle(this).fontFamily || 'system-ui,sans-serif';
    const font = `${weight} ${rows}px ${fam}`;
    try { await document.fonts.load(font, lines.join('')); } catch (_) { /* use whatever is there */ }
    if (tok !== this._tok) return;
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    x.font = font;
    const ws = lines.map(l => Math.ceil(x.measureText(l).width));
    const W = Math.max(...ws) + 2, lh = Math.round(rows * 1.02);
    c.width = W; c.height = lh * lines.length + 2;
    x.font = font; x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
    const align = this.getAttribute('align') || 'left';
    lines.forEach((l, i) => {
      const ox = align === 'center' ? Math.round((W - ws[i]) / 2) : align === 'right' ? W - ws[i] - 1 : 1;
      x.fillText(l, ox, Math.round(i * lh + rows * .8) + 1);
    });
    const d = x.getImageData(0, 0, c.width, c.height).data, cells = [];
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
      if (d[(yy * c.width + xx) * 4 + 3] > 110) cells.push({ x: xx, y: yy, oy: 0, vy: 0, lift: 0, lv: 0, delay: 0, landed: true });
    }
    /* crop empty margins */
    const minX = Math.min(...cells.map(p => p.x)), minY = Math.min(...cells.map(p => p.y));
    for (const p of cells) { p.x -= minX; p.y -= minY; }
    this._cols = Math.max(...cells.map(p => p.x)) + 1;
    this._rowsN = Math.max(...cells.map(p => p.y)) + 1;
    this._cells = cells;
    this._top = [];
    for (const p of cells) if (this._top[p.x] == null || p.y < this._top[p.x]) this._top[p.x] = p.y;
    this.setAttribute('aria-label', lines.join(' '));
    this._layout();
    if (this.getAttribute('intro') !== 'none') this._seedIntro();
    this._wake();
    this.dispatchEvent(new CustomEvent('piix:type', { bubbles: true }));
  }

  _layout() {
    let cell = +this.getAttribute('cell') || 8;
    if (this.hasAttribute('fit')) {
      const avail = this.clientWidth || (this.parentElement && this.parentElement.clientWidth) || 0;
      if (avail) cell = Math.max(2, Math.min(cell, Math.floor(avail / (this._cols + 1))));
    }
    this._cell = cell;
    this._depth = Math.round(cell * (this.getAttribute('depth') != null ? +this.getAttribute('depth') : 1) * .6);
    const gap = this.getAttribute('gap');
    this._gap = Math.round(cell * clamp(gap != null ? +gap : .1, 0, .45));
    this._head = cell * 3;                  /* headroom for lifted pixels */
    const w = this._cols * cell + this._depth, h = this._rowsN * cell + this._depth + this._head;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this._dpr = dpr;
    this._cv.width = Math.round(w * dpr); this._cv.height = Math.round(h * dpr);
    this._cv.style.width = w + 'px'; this._cv.style.height = h + 'px';
    this._cv.style.marginTop = -this._head + 'px';
    this._render();
  }

  _seedIntro() {
    if (reduced()) return;
    const H = (this._rowsN + 6) * this._cell;
    for (const p of this._cells) {
      p.landed = false; p.vy = 0;
      p.oy = -H - rnd(0, this._cell * 8);
      p.delay = p.x * .012 + rnd(0, .18) + (this._rowsN - p.y) * .004;
    }
    this._t = 0;
  }

  _wake() { if (!this._on) { this._on = true; sub(this._tick); } }

  _pm() {
    if (!this._cols || reduced()) return;
    const r = this._cv.getBoundingClientRect(), m = this._cell * 8;
    if (ptr.cx > r.left - m && ptr.cx < r.right + m && ptr.cy > r.top - m && ptr.cy < r.bottom + m) { this._hot = true; this._wake(); }
  }
  _pd(e) {
    if (!this._cols || reduced()) return;
    const r = this._cv.getBoundingClientRect();
    this._waves.push({ x: (e.clientX - r.left) / this._cell, y: (e.clientY - r.top - this._head) / this._cell, r: 0 });
    this._wake();
  }

  _tick(dt) {
    if (!this._cols) return;
    const cell = this._cell, G = 5200;
    let busy = false;
    this._t = (this._t || 0) + dt;
    const r = this._cv.getBoundingClientRect();
    const px = (ptr.cx - r.left) / cell, py = (ptr.cy - r.top - this._head) / cell;
    const R = 7, hot = this._hot && ptr.seen;
    this._waves.forEach(w => { w.r += dt * 60; });
    this._waves = this._waves.filter(w => w.r < this._cols + 20);
    if (this._waves.length) busy = true;
    let near = false;
    for (const p of this._cells) {
      /* falling in */
      if (!p.landed) {
        busy = true;
        if (this._t < p.delay) continue;
        p.vy += G * dt; p.oy += p.vy * dt;
        if (p.oy >= 0) {
          if (p.vy > 500) { p.oy = 0; p.vy = -p.vy * .22; }
          else { p.oy = 0; p.vy = 0; p.landed = true; }
        }
      }
      /* lift around the cursor, and on passing ripples */
      let goal = 0;
      if (hot) {
        const dx = p.x + .5 - px, dy = p.y + .5 - py, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) { const k = 1 - d / R; goal = k * k * cell * 1.4; near = true; }
      }
      for (const w of this._waves) {
        const d = Math.hypot(p.x - w.x, p.y - w.y), band = Math.abs(d - w.r);
        if (band < 2.5) goal = Math.max(goal, (1 - band / 2.5) * cell * 1.6 * Math.max(0, 1 - w.r / (this._cols + 20)));
      }
      p.lv += ((goal - p.lift) * 320 - p.lv * 22) * dt;
      p.lift += p.lv * dt;
      if (Math.abs(p.lift) > .05 || Math.abs(p.lv) > .5) busy = true;
    }
    if (!near) this._hot = false;
    this._render();
    if (!busy && !this._hot) { unsub(this._tick); this._on = false; }
  }

  _render() {
    if (!this._cols) return;
    const g = this._g, cell = this._cell, gap = this._gap, s = cell - gap, dep = this._depth, head = this._head;
    g.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    g.clearRect(0, 0, this._cv.width, this._cv.height);
    const color = this.getAttribute('color') || 'currentColor';
    const ink = color === 'currentColor' ? getComputedStyle(this).color : color;
    const shade = this.getAttribute('shade');
    /* shadow layer stays on the ground */
    if (shade && dep) {
      g.fillStyle = shade;
      for (const p of this._cells) {
        if (!p.landed && p.oy < -cell) continue;
        g.fillRect(p.x * cell + dep, head + p.y * cell + dep + Math.round(Math.min(0, p.oy)), s, s);
      }
    }
    g.fillStyle = ink;
    for (const p of this._cells) {
      const y = head + p.y * cell + Math.round(p.oy - p.lift);
      if (y + s < 0) continue;
      g.fillRect(p.x * cell, y, s, s);
    }
  }
}
