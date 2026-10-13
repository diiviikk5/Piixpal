/* DIALOG: a modal that dissolves in, pixel by pixel, in any look.   @component dialog
 *
 *   <piix-glow-button data-piix-open="hello">Open</piix-glow-button>
 *   <piix-dialog id="hello">
 *     <h2>Ship it?</h2>
 *     <p>This will deploy to production.</p>
 *     <piix-glow-button data-close>Deploy</piix-glow-button>
 *   </piix-dialog>
 *
 * A real modal (the browser's own <dialog>): it traps focus, Escape closes it, and focus goes
 * back where it came from. The panel is drawn on the GPU and dissolves in when it opens, over
 * a dithered backdrop. Anything with data-piix-open="its id" opens it; anything inside with
 * data-close closes it; so does clicking the backdrop.
 *
 *   open      open it (or call .show() / .close())
 *   look      glow | chrome | glass | riso | crt              default: glow
 *   palette   the colours of the light                    default: violet (or the look's own)
 *   pixel     size of one pixel, px                       default: 3
 *   width     any CSS length                              default: 520px
 *
 *   events: open, close */
/* a 2 x 2 checker for the backdrop: it dims the page in pixels, not a flat sheet */
let DLG_DITHER = '';
const dlgDither = () => {
  if (DLG_DITHER) return DLG_DITHER;
  const c = document.createElement('canvas'); c.width = c.height = 2;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(6,4,12,.62)'; g.fillRect(0, 0, 1, 1); g.fillRect(1, 1, 1, 1);
  return (DLG_DITHER = c.toDataURL());
};
/* focus an element, or the real control inside a Pixel UI one */
const dlgFocus = el => { const inner = el.shadowRoot && el.shadowRoot.querySelector('button,input,[tabindex]'); (inner || el).focus(); };
class PiixDialogElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'open', 'width']; }
  get _defPal() { const l = glLook(this); return l === 'glow' ? 'violet' : GL_LOOKS[l][0]; }
  constructor() { super(); this._defPx = 3; this._introLen = .4; this._click = [.5, .5, -9]; this._open = false; }
  connectedCallback() {
    super.connectedCallback();
    /* anything on the page with data-piix-open="my id" opens me */
    document.addEventListener('click', this._opener = e => {
      const t = e.target.closest && e.target.closest('[data-piix-open]');
      if (t && this.id && t.getAttribute('data-piix-open') === this.id) { this._from = t; this.show(); }
    });
    if (this.hasAttribute('open')) requestAnimationFrame(() => this.show());
  }
  disconnectedCallback() { super.disconnectedCallback(); document.removeEventListener('click', this._opener); }
  attributeChangedCallback(n, a, b) {
    if (n === 'open') { if (this._dlg) b === null ? this.close() : this.show(); return; }
    super.attributeChangedCallback(n, a, b);
  }
  _hostCss() { return 'display:contents'; }
  _css() {
    const l = glLook(this), txt = l === 'glow' ? 'color:#f2eef8' : GL_LOOK_TEXT[l](this._pal.list);
    return `dialog{position:fixed;inset:0;margin:auto;padding:0;border:0;background:transparent;color:inherit;width:min(${this.getAttribute('width') || '520px'},calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:visible;${glLookHost(l)}}
dialog::backdrop{background:url(${dlgDither()}) 0 0/4px 4px;image-rendering:pixelated;animation:piixbd .24s steps(3)}
dialog[open]{animation:piixpop .22s steps(3)}
@keyframes piixbd{from{opacity:0}}
@keyframes piixpop{from{transform:translateY(10px) scale(.96)}}
.in{position:relative;padding:34px 30px 28px;max-height:calc(100vh - 48px);overflow:auto;box-sizing:border-box;font:400 16px/1.5 "Bricolage Grotesque",system-ui,sans-serif;${txt}}
::slotted(h2),::slotted(h3){margin:0 0 .35em!important;font-size:26px!important;font-weight:800!important;letter-spacing:-.03em;line-height:1.05;color:inherit}
::slotted(p){margin:0 0 1.1em!important;opacity:.85}
.x{all:unset;position:absolute;z-index:2;top:12px;right:14px;width:30px;height:30px;display:grid;place-items:center;font:400 14px/1 ${KIT_FONT};color:inherit;cursor:pointer;opacity:.7}
.x:hover{opacity:1}
.x:focus-visible{outline:2px dashed currentColor;outline-offset:2px}
@media (prefers-reduced-motion:reduce){dialog[open],dialog::backdrop{animation:none}}`;
  }
  _html() { return '<dialog part="dialog"><canvas aria-hidden="true"></canvas><div class="in" part="content"><slot></slot></div><button class="x" type="button" part="close" aria-label="Close">X</button></dialog>'; }
  _box() { return this._dlg || this; }
  _setup() {
    const d = this._dlg = this.shadowRoot.querySelector('dialog');
    const h = this.querySelector('h1,h2,h3');
    if (h) { if (!h.id) h.id = 'piix-dlg-' + Math.random().toString(36).slice(2, 8); d.setAttribute('aria-label', h.textContent.trim()); }
    d.addEventListener('close', () => {
      this._open = false; this.removeAttribute('open');
      if (this._from && this._from.isConnected) dlgFocus(this._from);
      this._from = null;
      this.dispatchEvent(new Event('close'));
    });
    /* the backdrop is the dialog itself, outside its box */
    d.addEventListener('click', e => {
      const r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) this.close();
    });
    d.addEventListener('pointerdown', e => { const r = d.getBoundingClientRect(); this._click = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, now()]; });
    this.shadowRoot.querySelector('.x').addEventListener('click', () => this.close());
    this.addEventListener('click', e => { if (e.target.closest('[data-close]')) this.close(); });
    new ResizeObserver(() => this._fit()).observe(d);
    if (this._open) { this._open = false; this.show(); }
  }
  show() {
    const d = this._dlg;
    if (!d || d.open) return;
    if (!this._from) this._from = document.activeElement;
    d.showModal();
    this._open = true; this._seen = now(); this._fit();
    if (!this.hasAttribute('open')) this.setAttribute('open', '');
    /* focus the first thing inside you can use, else the close button */
    const f = this.querySelector('[autofocus],input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"]),piix-glow-button,piix-button');
    dlgFocus(f || this.shadowRoot.querySelector('.x'));
    this.dispatchEvent(new Event('open'));
  }
  close() { const d = this._dlg; if (d && d.open) d.close(); }
  _tick(dt) { if (this._open) this._vis = true; super._tick(dt); }
  _skip() { return !this._open; }
  _shader() { return GL_LOOKS[glLook(this)][1]; }
  _uniforms() { return { u_k: [this._click[0], this._click[1], (now() - this._click[2]) / 1000, 1], u_j: [.03, 0, 0, 0] }; }
}
define('piix-dialog', PiixDialogElement);
ELEMENTS.dialog = 'piix-dialog';
