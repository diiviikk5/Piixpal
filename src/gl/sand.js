/* SAND: your text crumbles into sand, piles up, and flows back into words.   @component sand
 *
 *   <piix-sand>
 *     <h2>Touch these words</h2>
 *     <p>They fall apart into grains, pile on the lines below, and come back.</p>
 *     <button>I'm solid: sand piles on me</button>
 *   </piix-sand>
 *
 * Every letter inside is redrawn as pixels, and every pixel is a grain in a real falling-sand
 * simulation. Brush over a word with the pointer and its grains come loose: they pour down,
 * slide off each other into piles, land on the words below and on buttons and images (those
 * stay solid), and you can sweep the piles around. Stop for a moment and every grain flies back
 * to the exact pixel it came from, and the real text returns. Your markup is never changed:
 * the words stay in the page the whole time, for selection, search and screen readers.
 *
 *   trigger   brush: the pointer crumbles what it touches
 *             click: a click brings the whole thing down
 *             none: only from code                                   default: brush
 *   brush     the brush's radius, in px                                default: 22
 *   grain     the size of one grain, in px                             default: 2
 *   rest      seconds of calm before it flows back, or never           default: 2
 *
 *   methods: crumble() (everything), crumble(x, y, r) (a spot, in px), rebuild()
 *   events: crumble, rebuild (when every grain is home again) */
/* while it's sand, the real letters are invisible (still there, still selectable) */
const SAND_SOLID = 'img,video,canvas,svg,button,input,select,textarea,iframe,piix-button,piix-glow-button,piix-kbd,[data-solid]';
let SAND_CSS = false;
const sandCss = () => {
  if (SAND_CSS) return;
  SAND_CSS = true;
  const keep = SAND_SOLID.split(',').map(s => `:not(${s}):not(${s} *)`).join('');
  const st = document.createElement('style');
  st.textContent = `[data-piix-sand],[data-piix-sand] *${keep}{color:transparent!important;-webkit-text-fill-color:transparent!important;text-decoration-color:transparent!important;text-shadow:none!important}`;
  document.head.appendChild(st);
};
/* grain states */
const SAND_HOME = 0, SAND_LOOSE = 1, SAND_FLY = 2;
class PiixSandElement extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._dirty = true; this._active = false;
    this._loop = dt => this._tick(dt);
  }
  connectedCallback() {
    sandCss();
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative}
canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;display:none}
:host([data-piix-sand]) canvas{display:block}
</style><slot></slot><canvas aria-hidden="true"></canvas>`;
    this._cv = this.shadowRoot.querySelector('canvas');
    this._ro = new ResizeObserver(() => { if (!this._active) this._dirty = true; });
    this._ro.observe(this);
    this._mo = new MutationObserver(() => { if (!this._active) this._dirty = true; });
    this._mo.observe(this, { childList: true, subtree: true, characterData: true });
    if (document.fonts) document.fonts.addEventListener('loadingdone', this._fd = () => { if (!this._active) this._dirty = true; });
    this.addEventListener('pointermove', this._pm = e => {
      const r = this.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (this._px != null) { this._vx = x - this._px; this._vy = y - this._py; }
      this._px = x; this._py = y;
      if ((this.getAttribute('trigger') || 'brush') !== 'brush' || (e.pointerType === 'touch' && !e.isPrimary)) return;
      this._brushing = true;
      this.crumble(x, y, +this.getAttribute('brush') || 22);
    });
    this.addEventListener('pointerleave', this._pl = () => { this._px = null; this._brushing = false; });
    this.addEventListener('click', this._ck = e => {
      if (this.getAttribute('trigger') !== 'click' || e.target.closest('a,button,input,select,textarea,label')) return;
      this._active && this._loose > 0 ? this.rebuild() : this.crumble();
    });
  }
  disconnectedCallback() {
    unsub(this._loop);
    this._ro.disconnect(); this._mo.disconnect();
    if (document.fonts) document.fonts.removeEventListener('loadingdone', this._fd);
    this.removeEventListener('pointermove', this._pm); this.removeEventListener('pointerleave', this._pl); this.removeEventListener('click', this._ck);
    this.removeAttribute('data-piix-sand');
    this._unpin();
  }

  /* ---------- turn the letters into grains: redraw every word where it sits, then sample it ---------- */
  _raster() {
    const host = this.getBoundingClientRect(), W = Math.ceil(host.width), H = Math.ceil(host.height);
    const g = clamp(+this.getAttribute('grain') || 2, 1, 8);
    const gw = Math.max(1, Math.ceil(W / g)), gh = Math.max(1, Math.ceil(H / g));
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const ctx = src.getContext('2d');
    const walk = document.createTreeWalker(this, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest(SAND_SOLID) || el.closest('script,style')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.fillStyle = cs.color; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      const up = cs.textTransform === 'uppercase';
      const asc = ctx.measureText('Hg').fontBoundingBoxAscent;
      for (const m of n.data.matchAll(/\S+/g)) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const rs = range.getClientRects();
        if (!rs.length) continue;
        /* a word cut by a hyphen across two lines: draw each piece where it is */
        const txt = up ? m[0].toUpperCase() : m[0];
        if (rs.length === 1) { const r = rs[0]; ctx.fillText(txt, r.left - host.left, r.top - host.top + asc); continue; }
        let k = 0;
        for (const r of rs) {
          let piece = '';
          while (k < txt.length && ctx.measureText(piece + txt[k]).width <= r.width + 1) piece += txt[k++];
          ctx.fillText(piece, r.left - host.left, r.top - host.top + asc);
        }
      }
      /* links keep their underline as grains too */
      if (cs.textDecorationLine.includes('underline')) {
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) { ctx.fillRect(r.left - host.left, r.top - host.top + asc + 2, r.width, Math.max(1, parseFloat(cs.fontSize) / 14)); }
      }
    }
    /* one grain per block of pixels that is mostly ink, in that ink's colour */
    const d = ctx.getImageData(0, 0, W, H).data;
    const hx = [], hy = [], col = [];
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      let sum = 0, best = 0, bi = -1;
      for (let y = cy * g; y < Math.min(H, cy * g + g); y++) for (let x = cx * g; x < Math.min(W, cx * g + g); x++) {
        const a = d[(y * W + x) * 4 + 3]; sum += a; if (a > best) { best = a; bi = (y * W + x) * 4; }
      }
      if (sum / (g * g) < 90 || bi < 0) continue;
      hx.push(cx); hy.push(cy);
      /* packed for a Uint32 view of ImageData: alpha, blue, green, red */
      col.push((255 << 24 | d[bi + 2] << 16 | d[bi + 1] << 8 | d[bi]) >>> 0);
    }
    const N = hx.length;
    this._g = g; this._gw = gw; this._gh = gh; this._W = W; this._H = H; this._N = N;
    this._hx = Int16Array.from(hx); this._hy = Int16Array.from(hy);
    this._x = Float32Array.from(hx); this._y = Float32Array.from(hy);
    this._vxs = new Float32Array(N); this._vys = new Float32Array(N); this._wait = new Float32Array(N); this._sp = new Float32Array(N);
    this._col = Uint32Array.from(col); this._loosecol = Uint32Array.from(col, c => {
      /* loose grains vary a touch, so a pile reads as sand */
      const f = .82 + Math.random() * .3, r = Math.min(255, (c & 255) * f), gg = Math.min(255, ((c >>> 8) & 255) * f), b = Math.min(255, ((c >>> 16) & 255) * f);
      return (255 << 24 | b << 16 | gg << 8 | r) >>> 0;
    });
    this._st = new Uint8Array(N);
    /* the grid: 0 empty, -1 solid (buttons, images), n > 0 holds grain n - 1 */
    const grid = this._grid = new Int32Array(gw * gh);
    for (let i = 0; i < N; i++) grid[hy[i] * gw + hx[i]] = i + 1;
    for (const el of this.querySelectorAll(SAND_SOLID)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const x0 = clamp(Math.floor((r.left - host.left) / g), 0, gw), x1 = clamp(Math.ceil((r.right - host.left) / g), 0, gw);
      const y0 = clamp(Math.floor((r.top - host.top) / g), 0, gh), y1 = clamp(Math.ceil((r.bottom - host.top) / g), 0, gh);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!grid[y * gw + x]) grid[y * gw + x] = -1;
    }
    this._img = new ImageData(gw, gh); this._px32 = new Uint32Array(this._img.data.buffer);
    this._small = document.createElement('canvas'); this._small.width = gw; this._small.height = gh;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this._cv.width = Math.round(W * dpr); this._cv.height = Math.round(H * dpr);
    this._loose = 0; this._calm = 0; this._dirty = false;
  }

  /* ---------- crumble: a spot, or everything ---------- */
  crumble(x, y, r) {
    if (!this._active) { if (this._dirty) this._raster(); if (!this._N) return; this._wake(); }
    const g = this._g, gw = this._gw, grid = this._grid, st = this._st;
    let n = 0;
    if (x == null) {
      for (let i = 0; i < this._N; i++) if (st[i] === SAND_HOME) { st[i] = SAND_LOOSE; this._sp[i] = rnd(.2, .6); n++; }
    } else {
      const cx = Math.round(x / g), cy = Math.round(y / g), cr = Math.ceil(r / g);
      for (let yy = Math.max(0, cy - cr); yy <= Math.min(this._gh - 1, cy + cr); yy++) for (let xx = Math.max(0, cx - cr); xx <= Math.min(gw - 1, cx + cr); xx++) {
        if ((xx - cx) ** 2 + (yy - cy) ** 2 > cr * cr) continue;
        const v = grid[yy * gw + xx];
        if (v > 0 && st[v - 1] === SAND_HOME) { st[v - 1] = SAND_LOOSE; this._sp[v - 1] = .5; n++; }
        /* the brush sweeps loose sand along the way it moves */
        else if (v > 0 && st[v - 1] === SAND_LOOSE && (this._vx || this._vy)) this._push(v - 1, xx, yy);
      }
    }
    if (n) { this._loose += n; this._calm = 0; if (!this._fired) { this._fired = true; sfx('break', this, { gap: 120 }); this.dispatchEvent(new Event('crumble')); } }
    else if (x != null) this._calm = 0;
  }
  _push(i, x, y) {
    const gw = this._gw, grid = this._grid;
    const dx = Math.sign(Math.round(this._vx / 3)), dy = Math.sign(Math.round(this._vy / 3)) || -1;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= gw || ny >= this._gh || grid[ny * gw + nx]) return;
    grid[y * gw + x] = 0; grid[ny * gw + nx] = i + 1; this._x[i] = nx; this._y[i] = ny;
  }
  /* ---------- flow back: every loose grain flies home ---------- */
  rebuild() {
    if (!this._active) return;
    const gw = this._gw, grid = this._grid, st = this._st;
    for (let i = 0; i < this._N; i++) {
      if (st[i] !== SAND_LOOSE) continue;
      grid[this._y[i] * gw + this._x[i]] = 0;
      st[i] = SAND_FLY; this._vxs[i] = rnd(-30, 30); this._vys[i] = rnd(-60, -10);
      /* the grains nearest home leave first, so words refill from where they were */
      this._wait[i] = reduced() ? 0 : Math.min(.5, Math.hypot(this._hx[i] - this._x[i], this._hy[i] - this._y[i]) / 400) + rnd(0, .25);
    }
    this._loose = 0; this._calm = -1e9;
    sfx('powerup', this, { gap: 300 });
  }
  _wake() {
    this._active = true;
    /* solid things keep their own text colour: pin it before the page's letters go invisible */
    this._pinned = [...this.querySelectorAll(SAND_SOLID)].map(el => {
      const cs = getComputedStyle(el), old = [el.style.getPropertyValue('color'), el.style.getPropertyPriority('color'), el.style.getPropertyValue('-webkit-text-fill-color'), el.style.getPropertyPriority('-webkit-text-fill-color')];
      el.style.setProperty('color', cs.color, 'important');
      el.style.setProperty('-webkit-text-fill-color', 'currentcolor', 'important');
      return [el, old];
    });
    this.setAttribute('data-piix-sand', '');
    sub(this._loop);
  }

  _unpin() {
    for (const [el, [c, cp, f, fp]] of this._pinned || []) { el.style.setProperty('color', c, cp); el.style.setProperty('-webkit-text-fill-color', f, fp); if (!c) el.style.removeProperty('color'); if (!f) el.style.removeProperty('-webkit-text-fill-color'); if (el.getAttribute('style') === '') el.removeAttribute('style'); }
    this._pinned = null;
  }

  /* ---------- the simulation ---------- */
  _tick(dt) {
    const gw = this._gw, gh = this._gh, grid = this._grid, st = this._st, X = this._x, Y = this._y;
    /* gravity: each grain gathers speed as it falls (up to 6 cells a frame), and slides off to one side when it lands */
    const SP = this._sp;
    if (this._loose > 0) {
      for (let s = 0; s < 6; s++) for (let y = gh - 2; y >= 0; y--) {
        const flip = (y + s) & 1, row = y * gw;
        for (let k = 0; k < gw; k++) {
          const x = flip ? gw - 1 - k : k, v = grid[row + x];
          if (v <= 0 || st[v - 1] !== SAND_LOOSE || SP[v - 1] <= s) continue;
          const below = row + gw + x;
          let to = -1;
          if (!grid[below]) to = below;
          else {
            const l = x > 0 && !grid[below - 1], r = x < gw - 1 && !grid[below + 1];
            if (l && r) to = below + (Math.random() < .5 ? -1 : 1); else if (l) to = below - 1; else if (r) to = below + 1;
          }
          if (to < 0) { SP[v - 1] = .6; continue; }
          SP[v - 1] = Math.min(6, SP[v - 1] + .07);
          grid[row + x] = 0; grid[to] = v; X[v - 1] = to % gw; Y[v - 1] = (to / gw) | 0;
        }
      }
    }
    /* calm long enough? everything flows back */
    const rest = this.getAttribute('rest');
    if (this._loose > 0 && rest !== 'never' && (this._calm += dt) > (rest === null ? 2 : +rest || 2)) this.rebuild();
    /* the flying grains: a spring home, then they lock into place */
    let flying = 0;
    for (let i = 0; i < this._N; i++) {
      if (st[i] !== SAND_FLY) continue;
      flying++;
      if (this._wait[i] > 0) { this._wait[i] -= dt; continue; }
      const k = reduced() ? 1 : 0;
      this._vxs[i] += (this._hx[i] - X[i]) * 90 * dt; this._vys[i] += (this._hy[i] - Y[i]) * 90 * dt;
      const damp = Math.pow(.0009, dt);
      this._vxs[i] *= damp; this._vys[i] *= damp;
      X[i] += this._vxs[i] * dt; Y[i] += this._vys[i] * dt;
      if (k || (Math.abs(this._hx[i] - X[i]) < .6 && Math.abs(this._hy[i] - Y[i]) < .6 && Math.hypot(this._vxs[i], this._vys[i]) < 18)) {
        X[i] = this._hx[i]; Y[i] = this._hy[i]; st[i] = SAND_HOME;
        grid[this._hy[i] * gw + this._hx[i]] = i + 1;
      }
    }
    this._draw();
    /* all home: the real text comes back */
    if (!flying && this._loose === 0) {
      this._active = false; this._fired = false; this._calm = 0;
      this.removeAttribute('data-piix-sand');
      this._unpin();
      unsub(this._loop);
      this.dispatchEvent(new Event('rebuild'));
    }
  }
  _draw() {
    const px = this._px32, gw = this._gw, gh = this._gh, st = this._st, X = this._x, Y = this._y;
    px.fill(0);
    for (let i = 0; i < this._N; i++) {
      const x = Math.round(X[i]), y = Math.round(Y[i]);
      if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
      px[y * gw + x] = st[i] === SAND_HOME ? this._col[i] : this._loosecol[i];
    }
    this._small.getContext('2d').putImageData(this._img, 0, 0);
    const c = this._cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this._cv.width, this._cv.height);
    c.drawImage(this._small, 0, 0, gw * this._g * this._cv.width / this._W, gh * this._g * this._cv.height / this._H);
  }
}
define('piix-sand', PiixSandElement);
ELEMENTS.sand = 'piix-sand';
