/* TABS: tabs whose highlight slides across with a dithered pixel trail.   @component tabs
 *
 *   <piix-tabs>
 *     <div label="Overview">…</div>
 *     <div label="Install">…</div>
 *     <div label="Examples">…</div>
 *   </piix-tabs>
 *
 * Each child with a label becomes a tab. Pick one and the lit block slides over to it on the
 * GPU, leaving a trail of dithered pixels behind. Arrow keys, Home and End move between tabs,
 * and it's announced as a proper tab list.
 *
 *   selected  which tab is open, from 0                     default: 0
 *   palette   the colours of the highlight                 default: lime
 *   pixel     size of one pixel, px                        default: 3
 *
 *   events: change { index, label } */
const TB_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  float x0=u_k.x,x1=u_k.y,vel=u_k.z,inb=step(x0,uv.x)*step(uv.x,x1),tr=0.;
  if(vel>.001)tr=clamp(1.-(x0-uv.x)/(vel*.5),0.,1.)*step(uv.x,x0);
  if(vel<-.001)tr=clamp(1.-(uv.x-x1)/(-vel*.5),0.,1.)*step(x1,uv.x);
  float v=inb>0.?.7+.3*uv.y:tr*.55;
  if(max(inb,tr)<.02)return vec4(0.);
  return vec4(dpal(v,cell),step(bayer8(cell)*.98,max(inb,tr)));}`;
class PiixTabsElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'selected']; }
  constructor() { super(); this._defPx = 3; this._defPal = 'lime'; this._defDither = .5; this._x = [0, 0]; this._v = 0; }
  attributeChangedCallback(n, a, b) { if (n === 'selected') { if (this._tabs) this._pick(this.selected, false); return; } super.attributeChangedCallback(n, a, b); }
  _hostCss() { return 'display:block'; }
  _css() {
    return `.bar{position:relative;display:flex;gap:4px;padding:6px;background:#17121f;clip-path:${kitCorners(3)}}
.bar canvas{z-index:0}
[role=tab]{all:unset;position:relative;z-index:1;flex:0 0 auto;padding:10px 16px;font:400 13px/1 ${KIT_FONT};text-transform:uppercase;letter-spacing:.05em;color:#cdc6da;cursor:pointer;transition:color .15s}
[role=tab][aria-selected=true]{color:#17121f}
[role=tab]:focus-visible{outline:2px dashed #cdc6da;outline-offset:2px}
.panels{padding:18px 4px}`;
  }
  _html() { return '<div class="bar" role="tablist" part="tablist"><canvas aria-hidden="true"></canvas></div><div class="panels" part="panels"><slot></slot></div>'; }
  _box() { return this.shadowRoot.querySelector('.bar'); }
  get selected() { return clamp(+this.getAttribute('selected') || 0, 0, Math.max(0, this._tabs ? this._tabs.length - 1 : 0)); }
  _setup() {
    const bar = this._box(), kids = [...this.children].filter(c => c.hasAttribute('label'));
    this._kids = kids;
    this._tabs = kids.map((k, i) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'tab'); b.type = 'button'; b.textContent = k.getAttribute('label');
      b.addEventListener('click', () => this._pick(i, true));
      b.addEventListener('keydown', e => {
        const n = kids.length, j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
        if (j != null) { e.preventDefault(); this._pick((j + n) % n, true); this._tabs[(j + n) % n].focus(); }
      });
      bar.appendChild(b);
      k.setAttribute('role', 'tabpanel'); k.setAttribute('aria-label', k.getAttribute('label'));
      return b;
    });
    this._pick(this.selected, false);
  }
  _pick(i, user) {
    this._tabs.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    this._kids.forEach((k, j) => { k.hidden = i !== j; });
    if (user && i !== this.selected) {
      this.setAttribute('selected', i);
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { index: i, label: this._kids[i].getAttribute('label') } }));
    }
  }
  _shader() { return TB_SHADER; }
  _uniforms(T, dt) {
    /* the block eases toward the selected tab; how fast it moves draws the trail */
    const bar = this._box(), b = this._tabs[this.selected];
    if (!b) return {};
    const W = bar.offsetWidth || 1, want = [b.offsetLeft / W, (b.offsetLeft + b.offsetWidth) / W], k = reduced() ? 1 : Math.min(1, dt * 9), was = this._x[0];
    if (!this._init) { this._x = want.slice(); this._init = true; }
    this._x[0] = lerp(this._x[0], want[0], k); this._x[1] = lerp(this._x[1], want[1], k);
    this._v = lerp(this._v, (this._x[0] - was) / Math.max(dt, .001) * .1, .5);
    return { u_k: [this._x[0], this._x[1], this._v, 0] };
  }
}
define('piix-tabs', PiixTabsElement);
ELEMENTS.tabs = 'piix-tabs';
