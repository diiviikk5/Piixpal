/* CHART: small dithered charts, drawn on the GPU.   @component chart
 *
 *   <piix-chart values="12,18,9,24,30,28,35" labels="Mon,Tue,Wed,Thu,Fri,Sat,Sun"></piix-chart>
 *   <piix-chart kind="bars" values="4,7,5,9,12" palette="sunset"></piix-chart>
 *
 * An area chart's fill fades out in a dither instead of a gradient, the line sits on top in the
 * brightest colour, and bars are stepped columns shaded from the top. It sweeps in from the left
 * the first time it's on screen. Hover it and a crosshair snaps to the nearest point and shows
 * its label and value. Screen readers get the numbers as a table.
 *
 *   values    the numbers, comma separated (up to 256)
 *   labels    a label for each, comma separated
 *   kind      area | line | bars                            default: area
 *   suffix    after each value, like % or ms
 *   min       where the axis starts                         default: 0 (or the lowest value, if below 0)
 *   palette   its colours                                   default: lime
 *   height    px or any CSS length                          default: 220px
 *   pixel     size of one pixel, px                         default: 3 */
const CH_SHADER = `vec4 effect(vec2 uv,vec2 cell){
  float n=u_k.x,g=u_k.y,hov=u_k.z,kind=u_k.w,pad=6./u_res.y;
  float y=(uv.y-pad)/(1.-pad*2.),grow=clamp(g*1.7-uv.x*.7,0.,1.);
  grow=1.-pow(1.-grow,3.);
  vec4 c=vec4(0.);
  for(int k=1;k<4;k++){if(abs(y-float(k)*.25)*u_res.y<.6&&mod(cell.x,4.)<1.)c=vec4(dpal(.18,cell),1.);}
  if(kind>1.5){
    float i=floor(uv.x*n),fx=fract(uv.x*n),v=texture2D(u_tex,vec2((i+.5)/n,.5)).r*grow;
    float gap=clamp(1.5/(u_res.x/n),.08,.3);
    if(fx>gap&&fx<1.-gap&&y<v&&y>0.){float top=(v-y)*u_res.y;
      float lit=i==hov?1.:.0;
      c=vec4(dpal(top<2.?1.:mix(.75,.35,clamp((v-y)/max(v,.01),0.,1.))+lit*.2,cell),1.);}
  }else{
    float tx=(uv.x*(n-1.)+.5)/n,v=texture2D(u_tex,vec2(tx,.5)).r*grow;
    float e=1./u_res.x,v1=texture2D(u_tex,vec2(((uv.x+e)*(n-1.)+.5)/n,.5)).r*grow;
    float slope=abs(v1-v)*u_res.y,th=(1.1+slope*.5)/u_res.y;
    if(kind<.5&&y<v&&y>0.){float k=(v-y)/max(v,.01);if(1.-k*1.15>bayer8(cell))c=vec4(dpal(.25+.45*(1.-k),cell),1.);}
    if(abs(y-v)<th*1.)c=vec4(dpal(1.,cell),1.);
    if(hov>=0.){float hxp=hov/(n-1.),hv=texture2D(u_tex,vec2((hov+.5)/n,.5)).r*grow;
      if(abs(uv.x-hxp)*u_res.x<.6&&mod(cell.y,3.)<1.&&y>0.)c=vec4(dpal(.6,cell),1.);
      vec2 dp=vec2((uv.x-hxp)*u_res.x,(y-hv)*u_res.y*(1.-pad*2.));
      if(max(abs(dp.x),abs(dp.y))<2.5)c=vec4(dpal(1.,cell),1.);
      if(max(abs(dp.x),abs(dp.y))<1.5)c=vec4(dpal(0.,cell),1.);}
  }
  if(y<=0.&&y>-1./u_res.y)c=vec4(dpal(.4,cell),1.);
  return c;}`;
class PiixChartElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'values', 'labels', 'suffix', 'min']; }
  constructor() { super(); this._defPx = 3; this._defPal = 'lime'; this._hi = -1; this._tex = { owner: {}, src: null, dirty: true }; }
  attributeChangedCallback(n, a, b) { if (n === 'values' || n === 'labels' || n === 'suffix' || n === 'min') { if (this._cv) this._data(); return; } super.attributeChangedCallback(n, a, b); }
  get kind() { return { line: 1, bars: 2 }[this.getAttribute('kind')] || 0; }
  _hostCss() { return 'width:100%;' + (this.getAttribute('height') ? '' : 'height:220px;'); }
  _css() {
    const l = this._pal.list;
    return `.tip{position:absolute;z-index:2;padding:6px 9px 7px;background:${l[l.length - 1]};color:${l[0]};font:600 12.5px/1.2 "Bricolage Grotesque",system-ui,sans-serif;clip-path:${kitCorners(2)};transform:translate(-50%,-100%);pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .12s}
.tip small{display:block;font:400 10px/1 ${KIT_FONT};text-transform:uppercase;opacity:.7;margin-bottom:3px}
.ax{position:absolute;right:0;font:400 10px/1 ${KIT_FONT};opacity:.5;pointer-events:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
  }
  _html() { return '<canvas aria-hidden="true"></canvas><span class="ax" style="top:0"></span><span class="tip" aria-hidden="true"></span><table class="sr"></table>'; }
  _setup() {
    this.setAttribute('role', 'figure');
    this._data();
    this.addEventListener('pointermove', e => {
      const r = this.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width, 0, 1), n = this._vals.length;
      this._hi = !n ? -1 : this.kind === 2 ? Math.min(n - 1, Math.floor(x * n)) : Math.round(x * (n - 1));
      this._tipAt();
    });
    this.addEventListener('pointerleave', () => { this._hi = -1; this.shadowRoot.querySelector('.tip').style.opacity = 0; });
  }
  /* read the numbers into a one-row texture the shader samples */
  _data() {
    const vals = (this.getAttribute('values') || '').split(',').map(Number).filter(v => !isNaN(v)).slice(0, 256);
    const labs = (this.getAttribute('labels') || '').split(',').map(s => s.trim());
    this._vals = vals.length ? vals : [0, 0]; this._labs = labs;
    const lo = this._lo = this.hasAttribute('min') ? +this.getAttribute('min') : Math.min(0, ...this._vals), max = this._max = Math.max(...this._vals, lo + 1), n = this._vals.length;
    const c = this._tex.src || (this._tex.src = document.createElement('canvas'));
    c.width = n; c.height = 1;
    const g = c.getContext('2d'), d = g.createImageData(n, 1);
    this._vals.forEach((v, i) => { const k = Math.round(clamp((v - lo) / (max - lo), 0, 1) * 255); d.data.set([k, k, k, 255], i * 4); });
    g.putImageData(d, 0, 0);
    this._tex.dirty = true;
    const sfx = this.getAttribute('suffix') || '';
    this.shadowRoot.querySelector('.ax').textContent = (+max.toFixed(2)) + sfx;
    this.shadowRoot.querySelector('.sr').innerHTML = `<tr><th>Label</th><th>Value</th></tr>` + this._vals.map((v, i) => `<tr><td>${(labs[i] || i + 1).toString().replace(/[<>&]/g, '')}</td><td>${v}${sfx.replace(/[<>&]/g, '')}</td></tr>`).join('');
    this.setAttribute('aria-label', `Chart of ${n} values, from ${Math.min(...this._vals)} to ${max}`);
  }
  _tipAt() {
    const tip = this.shadowRoot.querySelector('.tip'), i = this._hi, n = this._vals.length;
    if (i < 0) { tip.style.opacity = 0; return; }
    const r = this.getBoundingClientRect(), x = this.kind === 2 ? (i + .5) / n : i / Math.max(1, n - 1), pad = 6 * this._px / (r.height * Math.min(devicePixelRatio || 1, 2));
    const y = 1 - (pad + (1 - pad * 2) * (this._vals[i] - this._lo) / (this._max - this._lo));
    tip.innerHTML = `${this._labs[i] ? `<small>${this._labs[i].replace(/[<>&]/g, '')}</small>` : ''}${this._vals[i]}${(this.getAttribute('suffix') || '').replace(/[<>&]/g, '')}`;
    tip.style.left = clamp(x * r.width, 30, r.width - 30) + 'px'; tip.style.top = Math.max(26, y * r.height - 10) + 'px'; tip.style.opacity = 1;
  }
  _texture() { const t = this._tex; const out = { owner: t.owner, src: t.src, dirty: t.dirty }; t.dirty = false; return out; }
  _shader() { return CH_SHADER; }
  _uniforms() {
    const g = reduced() ? 1 : clamp((now() - (this._seen || now())) / 1100, 0, 1);
    return { u_k: [this._vals.length, g, this._hi, this.kind] };
  }
}
define('piix-chart', PiixChartElement);
ELEMENTS.chart = 'piix-chart';
