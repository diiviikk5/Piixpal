/* LIQUID TEXT: words made of liquid that melt into the next word.   @component liquid-text  @needs liquid-button
 *
 *   <piix-liquid-text>Fluid</piix-liquid-text>
 *   <piix-liquid-text words="Design|Build|Ship"></piix-liquid-text>
 *
 * The letters are a liquid field on the GPU: their edges ripple, the pointer sends a wave through
 * them, and with several words each one flows into the next like two drops merging, glossy and
 * iridescent the whole way. Screen readers get the plain words.
 *
 *   words     words to cycle, | between                  default: the text inside
 *   every     ms per word                                default: 2400
 *   look      chrome | ink | water | honey               default: chrome
 *   colors    floor, horizon, sky (overrides look)
 *   size      font size in px                            default: 96
 *   font      CSS font family                            default: Bricolage Grotesque */
const LQ_TEXT = LQ_GLSL + `
float fld(vec2 uv){
  vec2 w=vec2(fbm(uv*vec2(3.,1.5)+u_time*.25),fbm(uv*vec2(3.,1.5)-u_time*.2+7.))-.5;
  vec2 pm=u_j.xy/u_res;float dm=length((uv-pm)*vec2(u_res.x/u_res.y,1.));
  uv+=w*.018+u_j.z*.012*sin(dm*40.-u_time*7.)*exp(-dm*5.)*normalize(uv-pm+1e-4);
  vec4 t=texture2D(u_tex,uv);
  float k=u_k.x;float m=mix(t.r,t.g,smoothstep(0.,1.,k));
  return m+sin(k*3.1416)*.16;
}
vec4 effect(vec2 uv,vec2 cell){
  float s=u_k.w,f=fld(uv),th=.5;
  float d=(th-f)*u_k.y;
  vec2 e=1.5/u_res;
  vec2 g=normalize(vec2(fld(uv-vec2(e.x,0.))-f,fld(uv-vec2(0.,e.y))-f)+1e-5);
  return lqShade(cell+.5,d,g,s,6.,u_time);
}`;
class PiixLiquidTextElement extends GLStage {
  static get observedAttributes() { return ['words', 'colors', 'size', 'font']; }
  constructor() { super(); this._defPx = .5; this._i = 0; this._k = 0; this._tc = document.createElement('canvas'); this._near = 0; }
  _list() { return (this.getAttribute('words') || this._text || '').split('|').map(s => s.trim()).filter(Boolean); }
  _hostCss() { const fs = +this.getAttribute('size') || 96; return `display:block;height:${Math.round(fs * 1.3)}px;`; }
  _css() { return 'canvas{image-rendering:auto}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'; }
  _html() { return `<canvas aria-hidden="true"></canvas><span class="sr" aria-live="polite"></span>`; }
  _setup() {
    if (this._text == null) this._text = this.textContent.trim();
    this._cols = lqColors(this);
    this._t0w = now(); this._i = 0; this._drawn = -1;
    this.shadowRoot.querySelector('.sr').textContent = this._list()[0] || '';
  }
  _resized() { this._drawn = -1; }
  /* both words into one texture: the first in red, the next in green, softened so the shader can melt between them */
  _paint() {
    const L = this._list(); if (!L.length) return;
    const a = L[this._i % L.length], b = L[(this._i + 1) % L.length];
    const W = this._W, H = this._H, sc = 3, w = Math.ceil(W / sc), h = Math.ceil(H / sc), tc = this._tc;
    tc.width = w; tc.height = h;
    const g = tc.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), fs = (+this.getAttribute('size') || 96) * dpr / sc;
    g.clearRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${fs}px ${this.getAttribute('font') || '"Bricolage Grotesque",system-ui,sans-serif'}`;
    g.globalCompositeOperation = 'lighter';
    /* a small box blur by stamping the word around itself */
    const O = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (const [col, word] of [['rgba(255,0,0,', a], ['rgba(0,255,0,', b]]) { g.fillStyle = col + (1 / O.length * 1.15) + ')'; for (const [x, y] of O) g.fillText(word, w / 2 + x * 1.1, h / 2 + y * 1.1 + fs * .04); }
    this._drawn = this._i; this._dirtyTex = true;
  }
  _texture() { if (this._drawn !== this._i) this._paint(); const d = this._dirtyTex; this._dirtyTex = false; return { owner: this, src: this._tc, dirty: d }; }
  _shader() { return LQ_TEXT; }
  _uniforms(T, dt) {
    const L = this._list(), every = +this.getAttribute('every') || 2400, el = now() - this._t0w;
    if (L.length > 1 && !reduced()) {
      if (el > every) { this._i = (this._i + 1) % L.length; this._t0w = now(); this.shadowRoot.querySelector('.sr').textContent = L[this._i]; }
      this._k = clamp((el - (every - 750)) / 750, 0, 1);
    } else this._k = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2), m = lqPointer(this._cv, dpr);
    this._near = lerp(this._near, this._hov, Math.min(1, dt * 4));
    return { ...this._cols, u_k: [this._k, 28 * dpr, 0, dpr], u_j: [m[0], m[1], this._near, 0] };
  }
}
define('piix-liquid-text', PiixLiquidTextElement);
ELEMENTS['liquid-text'] = 'piix-liquid-text';
