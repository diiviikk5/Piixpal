/* GLOW BUTTON: a button with light running round its pixel border.   @component glow-button
 *
 *   <piix-glow-button>Get started</piix-glow-button>
 *   <piix-glow-button palette="sunset">Launch</piix-glow-button>
 *
 * A band of light chases round the pixel border, drawn on the GPU and dithered into the palette.
 * Hover and a spotlight follows your pointer across the face; click and a ring ripples out from
 * where you clicked. It's a real button: it focuses, works with the keyboard, and submits or
 * resets the form it's in.
 *
 *   palette   the colours of the light                    default: lime
 *   pixel     size of one pixel, px                       default: 3
 *   type      button | submit | reset                     default: button
 *   disabled  greyed out */
class PiixGlowButtonElement extends GLStage {
  static get formAssociated() { return true; }
  constructor() { super(); this._defPx = 3; this._defPal = 'lime'; this._click = [.5, .5, -9]; this._int = this.attachInternals ? this.attachInternals() : null; }
  _hostCss() { return 'display:inline-block;vertical-align:middle;cursor:pointer;-webkit-tap-highlight-color:transparent'; }
  _css() {
    return `button{all:unset;position:relative;display:block;box-sizing:border-box;padding:16px 26px;color:${this._pal.list[this._pal.list.length - 1]};font:700 15px/1 "Bricolage Grotesque",system-ui,sans-serif;letter-spacing:.01em;text-shadow:0 1px 0 rgba(0,0,0,.5);transition:transform .08s}
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
  _shader() { return GL_FRAME; }
  _uniforms() { return { u_k: [this._click[0], this._click[1], (now() - this._click[2]) / 1000, 2], u_j: [this._hov * .04, 0, 0, 0] }; }
}
define('piix-glow-button', PiixGlowButtonElement);
ELEMENTS['glow-button'] = 'piix-glow-button';
