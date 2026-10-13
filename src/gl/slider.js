/* SLIDER: a range input whose track is lit on the GPU.   @component slider
 *
 *   <piix-slider name="volume" value="40">Volume</piix-slider>
 *
 * The filled part of the track glows through the palette with a slow shimmer; the head is a
 * bright pixel block with a halo, and dragging it fast throws sparks behind it. While you drag
 * (or have it focused) its value floats above the head. Whatever you put inside is its label.
 * A real slider: arrow keys, Page Up/Down, Home and End move it, screen readers hear it, and it
 * sends its value with the form it's in.
 *
 *   value, min, max, step                                  default: 50, 0, 100, 1
 *   name      the form field name
 *   suffix    shown after the value, like % or px
 *   palette   the colours of the light                    default: lime
 *   pixel     size of one pixel, px                       default: 3
 *   disabled
 *
 *   events: input, change */
const SL_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  float f=u_k.x,sp=u_k.y,mid=abs(uv.y-.5)*2.,hx=(uv.x-f)*u_res.x;
  vec4 c=vec4(0.);
  if(mid<.45){
    if(uv.x<f){float v=.35+.45*uv.x/max(f,.01)+.12*sin(cell.x*.5-u_time*6.);c=vec4(dpal(v,cell),1.);}
    else c=vec4(dpal(.07+.07*step(mod(cell.x,6.),.5)*step(mid,.2),cell),1.);}
  float g=exp(-abs(hx)*.22)*(1.-mid*.8)*(.35+.65*u_hover);
  if(c.a==0.&&g>bayer8(cell)*.8+.03)c=vec4(dpal(.75,cell),1.);
  if(hx<0.&&sp>.02&&hash(floor(cell/1.)+floor(u_time*24.))>1.-sp*.5*exp(hx*.08)&&mid<.95)c=vec4(dpal(1.,cell),1.);
  if(abs(hx)<2.5&&mid<.95)c=vec4(dpal(.92+.08*u_hover,cell),1.);
  return c;}`;
class PiixSliderElement extends GLStage {
  static get formAssociated() { return true; }
  static get observedAttributes() { return [...GLStage.observedAttributes, 'value', 'min', 'max', 'step', 'disabled', 'suffix']; }
  constructor() { super(); this._defPx = 3; this._defPal = 'lime'; this._int = this.attachInternals ? this.attachInternals() : null; this._f = -1; this._sp = 0; }
  attributeChangedCallback(n, a, b) {
    if (n === 'value' || n === 'min' || n === 'max' || n === 'step' || n === 'suffix') { if (this._track) this._sync(); return; }
    super.attributeChangedCallback(n, a, b);
  }
  get min() { return +this.getAttribute('min') || 0; }
  get max() { return this.hasAttribute('max') ? +this.getAttribute('max') : 100; }
  get step() { return +this.getAttribute('step') || 1; }
  get value() { const v = this.hasAttribute('value') ? +this.getAttribute('value') : (this.min + this.max) / 2; return clamp(v, this.min, this.max); }
  set value(v) { this.setAttribute('value', this._snap(v)); }
  _snap(v) { const s = this.step, d = (String(s).split('.')[1] || '').length; return +clamp(Math.round((v - this.min) / s) * s + this.min, this.min, this.max).toFixed(d); }
  _hostCss() { return 'display:block'; }
  _css() {
    const l = this._pal.list;
    return `label{display:flex;justify-content:space-between;margin-bottom:10px;font:400 12px/1 ${KIT_FONT};text-transform:uppercase;letter-spacing:.06em;opacity:.8}
.track{position:relative;height:30px;cursor:pointer;touch-action:none;outline:none}
.track:focus-visible{outline:2px dashed ${l[l.length - 2]};outline-offset:6px}
.val{position:absolute;bottom:calc(100% + 8px);transform:translateX(-50%);padding:5px 7px 6px;background:${l[l.length - 1]};color:${l[0]};font:400 11px/1 ${KIT_FONT};clip-path:${kitCorners(2)};opacity:0;transition:opacity .15s;pointer-events:none;white-space:nowrap}
.track.live .val{opacity:1}
:host([disabled]){opacity:.45;pointer-events:none}`;
  }
  _html() { return '<label part="label"><span><slot></slot></span><output part="output"></output></label><div class="track" role="slider" tabindex="0" part="track"><canvas aria-hidden="true"></canvas><span class="val" aria-hidden="true"></span></div>'; }
  _box() { return this.shadowRoot.querySelector('.track'); }
  _setup() {
    const t = this._track = this._box();
    if (this._initial === undefined) this._initial = this.getAttribute('value');
    t.setAttribute('aria-label', this.textContent.trim() || this.getAttribute('name') || 'Value');
    const at = e => { const r = t.getBoundingClientRect(); return this.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (this.max - this.min); };
    const set = (v, fire) => { const was = this.value; this.value = v; if (this.value !== was) this.dispatchEvent(new Event('input', { bubbles: true, composed: true })); if (fire) this.dispatchEvent(new Event('change', { bubbles: true })); };
    t.addEventListener('pointerdown', e => { if (this.hasAttribute('disabled')) return; t.setPointerCapture(e.pointerId); this._drag = true; t.classList.add('live'); set(at(e)); t.focus(); });
    t.addEventListener('pointermove', e => { if (this._drag) set(at(e)); });
    const up = () => { if (!this._drag) return; this._drag = false; if (document.activeElement !== this) t.classList.remove('live'); this.dispatchEvent(new Event('change', { bubbles: true })); };
    t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
    t.addEventListener('focus', () => t.classList.add('live'));
    t.addEventListener('blur', () => { if (!this._drag) t.classList.remove('live'); });
    t.addEventListener('keydown', e => {
      const s = this.step, big = Math.max(s, (this.max - this.min) / 10);
      const v = { ArrowRight: this.value + s, ArrowUp: this.value + s, ArrowLeft: this.value - s, ArrowDown: this.value - s, PageUp: this.value + big, PageDown: this.value - big, Home: this.min, End: this.max }[e.key];
      if (v == null) return;
      e.preventDefault(); set(v, true);
    });
    this._sync();
  }
  _sync() {
    const t = this._track, v = this.value, sfx = this.getAttribute('suffix') || '', k = (v - this.min) / ((this.max - this.min) || 1);
    t.setAttribute('aria-valuemin', this.min); t.setAttribute('aria-valuemax', this.max); t.setAttribute('aria-valuenow', v); t.setAttribute('aria-valuetext', v + sfx);
    this.shadowRoot.querySelector('output').textContent = v + sfx;
    const val = this.shadowRoot.querySelector('.val'); val.textContent = v + sfx; val.style.left = (k * 100) + '%';
    if (this._int) this._int.setFormValue(String(v));
  }
  formResetCallback() { this._initial == null ? this.removeAttribute('value') : this.setAttribute('value', this._initial); }
  _shader() { return SL_SHADER; }
  _uniforms(T, dt) {
    /* the head eases to the value; how fast it moved makes the sparks */
    const k = (this.value - this.min) / ((this.max - this.min) || 1);
    if (this._f < 0 || reduced()) this._f = k;
    const was = this._f; this._f = lerp(this._f, k, Math.min(1, dt * 14));
    this._sp = lerp(this._sp, Math.min(1, Math.abs(this._f - was) / Math.max(dt, .001) * .6), .3);
    return { u_k: [this._f, this._sp, 0, 0], u_hover: Math.max(this._hov, this._drag ? 1 : 0) };
  }
}
define('piix-slider', PiixSliderElement);
ELEMENTS.slider = 'piix-slider';
