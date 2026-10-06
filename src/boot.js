/* <piix-pal pal="bitbug" do="crawl" on="#title" scale="4" hue="0">
 * Put it inside the element it should live on, or point at one with on="css selector".
 * The tag itself stays invisible; the pal is drawn on a shared overlay layer. */
class PiixPalElement extends HTMLElement {
  static get observedAttributes() { return ['pal', 'do', 'on', 'scale', 'hue', 'at', 'side']; }
  connectedCallback() {
    this.style.display = 'none';
    if (this._mounted) return;
    cancelAnimationFrame(this._q);
    /* two frames: let the page lay out (and webfonts settle) before measuring */
    this._q = requestAnimationFrame(() => { this._q = requestAnimationFrame(() => this._mount()); });
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._q);
    /* a moved element reconnects in the same task; only tear down if it really left */
    queueMicrotask(() => { if (!this.isConnected) this._unmount(); });
  }
  attributeChangedCallback(n, a, b) {
    if (a === b || !this._mounted) return;
    /* recolouring doesn't need a fresh pal */
    if (n === 'hue') { this._actor.cv.style.filter = b ? `hue-rotate(${+b}deg)` : ''; return; }
    this._unmount(); this._mount();
  }
  get actor() { return this._actor || null; }
  /* poke it from code: el.poke() */
  poke() { if (this._ctl && this._ctl.poke) this._ctl.poke(); }

  _mount() {
    if (!this.isConnected || this._mounted) return;
    const name = (this.getAttribute('pal') || '').toLowerCase();
    const sel = this.getAttribute('on');
    let targets;
    try { targets = sel ? [...document.querySelectorAll(sel)] : [this.parentElement]; } catch (e) { targets = []; }
    targets = targets.filter(el => el && el !== document.documentElement);
    const spec = SPRITES[name] || (!name && SPRITES[Object.keys(SPRITES)[0]]);
    const make = spec && (BEHAVIORS[this.getAttribute('do')] || BEHAVIORS[spec.does]);
    /* the pal's own file, or the element it lives on, may simply not be here yet
       (a second script still loading, a framework still rendering): try again shortly */
    if (!spec || !make || !targets.length) {
      this._tries = (this._tries || 0) + 1;
      if (this._tries < 80) { clearTimeout(this._retry); this._retry = setTimeout(() => this._mount(), 125); }
      else console.warn('[piixpal]', !spec ? `no pal called "${name}"` : !make ? `unknown behaviour "${this.getAttribute('do') || spec.does}"` : 'nothing to live on', this);
      return;
    }
    this._tries = 0;

    const actor = this._actor = new Actor(spec, { scale: +this.getAttribute('scale') || 0, hue: this.getAttribute('hue'), fixed: this.hasAttribute('fixed-scale') });
    actor.host = this;
    const ctl = this._ctl = actor.ctl = make(actor, targets, this) || {};
    if (!ctl.grab) actor.node.classList.add('nograb');

    this._pd = e => {
      if (e.button > 0) return;
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
      if (ctl.grab) ctl.grab(e); else if (ctl.poke) ctl.poke(e);
    };
    actor.cv.addEventListener('pointerdown', this._pd);

    /* a behaviour can run a whole crew of extra actors (groups, flocks, families) */
    const wire = c => {
      if (c._wired) return;
      c._wired = true; c.host = this;
      if (!ctl.grab) c.node.classList.add('nograb');
      c.cv.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('piix:poke', { bubbles: true }));
        if (ctl.grab) ctl.grab(e, c); else if (ctl.poke) ctl.poke(e, c);
      });
    };
    let first = true;
    this._tick = (dt, t) => {
      /* sleep when far off-screen, but always draw the first frame */
      const awake = first || (ctl.awake ? ctl.awake() : Math.abs(actor.y - (scrollY + innerHeight / 2)) < innerHeight * 1.5) || actor.held;
      if (!awake) return;
      first = false;
      ctl.tick(dt, t);
      actor.step(dt);
      actor.render();
      if (ctl.crew) for (const c of ctl.crew) { wire(c); c.step(dt); c.render(); }
    };
    sub(this._tick);
    this._mounted = true;
    this.dispatchEvent(new CustomEvent('piix:ready', { bubbles: true, detail: { pal: spec.name } }));
  }
  _unmount() {
    if (!this._mounted) return;
    unsub(this._tick);
    if (this._ctl && this._ctl.destroy) this._ctl.destroy();
    if (this._ctl && this._ctl.crew) this._ctl.crew.forEach(c => c.destroy());
    if (this._actor) { this._actor.cv.removeEventListener('pointerdown', this._pd); this._actor.destroy(); }
    this._actor = this._ctl = null;
    this._mounted = false;
  }
}

const define = (n, c) => { if (!customElements.get(n)) customElements.define(n, c); };

/* ---------- JS API: add pals without writing any markup ---------- */
/* Piixpal.add('bitbug', 'h1')                      a pal living on the first h1
 * Piixpal.add('pip', '.btn')                       one bird, every .btn a perch
 * Piixpal.add('mochi', '#card', { size: 120 })     sprites go inside the element
 * Piixpal.add('kitty', someElement)                or pass an element directly */
const add = (name, where = 'body', attrs = {}) => {
  name = String(name).toLowerCase();
  /* not registered yet (its file is still loading)? wait to find out if it's a pal or a sprite */
  if (!attrs.type && !SPRITES[name] && !FIGURES[name] && (attrs._tries || 0) < 80) {
    setTimeout(() => add(name, where, { ...attrs, _tries: (attrs._tries || 0) + 1 }), 125);
    return null;
  }
  attrs = { ...attrs }; delete attrs._tries;
  const isSprite = attrs.type === 'sprite' || (!SPRITES[name] && !!FIGURES[name]);
  const target = typeof where === 'string' ? null : where;
  const el = document.createElement(isSprite ? 'piix-sprite' : 'piix-pal');
  attrs = { ...attrs }; delete attrs.type;
  el.setAttribute(el.tagName === 'PIIX-SPRITE' ? 'name' : 'pal', name);
  for (const k in attrs) if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
  if (el.tagName === 'PIIX-SPRITE') {
    const host = target || document.querySelector(where);
    if (host) host.appendChild(el);
  } else {
    if (target) target.appendChild(el);
    else { el.setAttribute('on', where); document.body.appendChild(el); }
  }
  return el;
};
/* data-pals="bitbug@h1, boing@footer, pip@.btn?scale=3" on the script tag itself */
const autoAttach = script => {
  const list = script && script.getAttribute('data-pals');
  if (!list) return;
  const run = () => list.split(',').map(s => s.trim()).filter(Boolean).forEach(item => {
    const [head, query = ''] = item.split('?');
    const [name, where = 'body'] = head.split('@').map(s => s.trim());
    const attrs = Object.fromEntries(new URLSearchParams(query));
    add(name, where, attrs);
  });
  if (document.readyState === 'complete') run(); else addEventListener('load', run, { once: true });
};
const SCRIPT = document.currentScript;

/* define the elements once every component in this file has registered */
const start = (script = SCRIPT) => {
  define('piix-pal', PiixPalElement);
  define('piix-type', PiixTypeElement);
  define('piix-sprite', PiixSpriteElement);
  define('piix-crowd', PiixCrowdElement);
  if (script && !script._piix) { script._piix = true; autoAttach(script); }
};
Object.assign(Piixpal, {
  add,
  /* every pal, sprite and behaviour currently registered */
  list: () => ({ pals: Object.keys(SPRITES), sprites: Object.keys(FIGURES), behaviors: Object.keys(BEHAVIORS) }),
  clear: () => document.querySelectorAll('piix-pal,piix-sprite').forEach(e => e.remove())
});
