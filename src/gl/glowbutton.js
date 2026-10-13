/* GLOW BUTTON: a button with light running round its pixel border.   @component glow-button
 *
 *   <piix-glow-button>Get started</piix-glow-button>
 *   <piix-glow-button palette="sunset">Launch</piix-glow-button>
 *
 * A band of light chases round the pixel border, drawn on the GPU and dithered into the palette.
 * Hover and a spotlight follows your pointer across the face; click and a ring ripples out from
 * where you clicked. It's a real button: it focuses, works with the keyboard, and submits or
 * resets the form it's in. Give it a look to change its whole style: liquid chrome, frosted
 * glass, a two-ink riso print or a green terminal.
 *
 *   look      glow | chrome | glass | riso | crt              default: glow
 *   palette   the colours of the light                    default: lime (or the look's own)
 *   pixel     size of one pixel, px                       default: 3
 *   type      button | submit | reset                     default: button
 *   size      sm | md | lg                                default: md
 *   disabled  greyed out */
class PiixGlowButtonElement extends GLStage {
  static get formAssociated() { return true; }
  static get observedAttributes() { return [...GLStage.observedAttributes, 'size', 'disabled']; }
  get _defPal() { const l = glLook(this); return l === 'glow' ? 'lime' : GL_LOOKS[l][0]; }
  constructor() { super(); this._defPx = 3; this._click = [.5, .5, -9]; this._int = this.attachInternals ? this.attachInternals() : null; }
  _hostCss() { return 'display:inline-block;vertical-align:middle;cursor:pointer;-webkit-tap-highlight-color:transparent;' + glLookHost(glLook(this)); }
  _css() {
    const [pad, fs] = { sm: ['11px 18px', 13], lg: ['20px 34px', 18] }[this.getAttribute('size')] || ['16px 26px', 15];
    return `button{all:unset;position:relative;display:block;box-sizing:border-box;padding:${pad};font:700 ${fs}px/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:.01em;${GL_LOOK_TEXT[glLook(this)](this._pal.list)};transition:transform .08s}
button:focus-visible{outline:2px dashed ${this._pal.list[this._pal.list.length - 2]};outline-offset:4px}
:host(:active) button{transform:translateY(1px)}
:host([disabled]){opacity:.45;cursor:not-allowed;filter:grayscale(.7)}`;
  }
  _html() { return `<canvas aria-hidden="true"></canvas><button part="button" type="button"${this.hasAttribute('disabled') ? ' disabled' : ''}><slot></slot></button>`; }
  _setup() {
    this.shadowRoot.querySelector('button').addEventListener('click', e => {
      if (this.hasAttribute('disabled')) return;
      const r = this.getBoundingClientRect();
      this._click = [(e.clientX - r.left) / r.width || .5, 1 - (e.clientY - r.top) / r.height || .5, now()];
      const form = this._int && this._int.form, t = this.getAttribute('type');
      if (form && t === 'submit') form.requestSubmit ? form.requestSubmit() : form.submit();
      if (form && t === 'reset') form.reset();
    });
  }
  _shader() { return GL_LOOKS[glLook(this)][1]; }
  _uniforms() { return { u_k: [this._click[0], this._click[1], (now() - this._click[2]) / 1000, 2], u_j: [this._hov * .04, 0, 0, 0] }; }
}
define('piix-glow-button', PiixGlowButtonElement);
ELEMENTS['glow-button'] = 'piix-glow-button';
