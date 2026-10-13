/* GLOW CARD: a card lit from inside, with light running round its border.   @component glow-card
 *
 *   <piix-glow-card>
 *     <h3>Realtime</h3>
 *     <p>Everything updates the moment it changes.</p>
 *   </piix-glow-card>
 *
 * A dark pixel card with a band of light chasing round its edge and a spotlight that follows your
 * pointer under the content. It tilts a little toward the pointer, and a click sends a ring out
 * across it. Put anything inside. Looks: liquid chrome, frosted glass (lovely over a scene),
 * a two-ink riso print, or a green terminal.
 *
 *   look      glow | chrome | glass | riso | crt              default: glow
 *   palette   the colours of the light                    default: violet (or the look's own)
 *   pixel     size of one pixel, px                       default: 3
 *   tilt      "none" keeps it flat */
class PiixGlowCardElement extends GLStage {
  get _defPal() { const l = glLook(this); return l === 'glow' ? 'violet' : GL_LOOKS[l][0]; }
  constructor() { super(); this._defPx = 3; this._click = [.5, .5, -9]; this._tilt = [0, 0]; }
  _hostCss() { return 'display:block;color:#f2eef8;transform-style:preserve-3d;transition:transform .2s cubic-bezier(.2,.8,.2,1);' + glLookHost(glLook(this)); }
  _css() {
    const l = glLook(this), txt = l === 'glow' ? 'color:#f2eef8' : GL_LOOK_TEXT[l](this._pal.list);
    return `.in{position:relative;padding:28px 26px 26px;font:400 15px/1.5 "Bricolage Grotesque",system-ui,sans-serif;${txt}}
::slotted(h3),::slotted(h2){margin:0 0 .4em!important;font-weight:750!important;font-size:22px!important;letter-spacing:-.02em;color:inherit}
::slotted(p){margin:0!important;opacity:.8}`;
  }
  _html() { return '<canvas aria-hidden="true"></canvas><div class="in" part="content"><slot></slot></div>'; }
  _setup() {
    this.addEventListener('pointerdown', e => { const r = this.getBoundingClientRect(); this._click = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, now()]; });
  }
  _shader() { return GL_LOOKS[glLook(this)][1]; }
  _uniforms(T, dt) {
    /* lean toward the pointer while it's over the card */
    if (this.getAttribute('tilt') !== 'none' && !reduced()) {
      const want = this._hov > .05 ? [(this._m[1] - .5) * 7, (this._m[0] - .5) * -9] : [0, 0];
      this._tilt[0] = lerp(this._tilt[0], want[0] * this._hov, Math.min(1, dt * 8)); this._tilt[1] = lerp(this._tilt[1], want[1] * this._hov, Math.min(1, dt * 8));
      this.style.transform = `perspective(900px) rotateX(${this._tilt[0].toFixed(2)}deg) rotateY(${(-this._tilt[1]).toFixed(2)}deg)`;
    }
    return { u_k: [this._click[0], this._click[1], (now() - this._click[2]) / 1000, 1], u_j: [.02, 0, 0, 0] };
  }
}
define('piix-glow-card', PiixGlowCardElement);
ELEMENTS['glow-card'] = 'piix-glow-card';
