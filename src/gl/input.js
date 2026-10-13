/* INPUT: a text field with a pixel border that lights up as you type.   @component input
 *
 *   <piix-input name="email" type="email" placeholder="you@site.com">Email</piix-input>
 *
 * A dark pixel field. Focus it and light starts running round its border; every key sends a
 * little ring out from the caret. Whatever you put inside is its label. It's a real form field:
 * it has a value, it's labelled for screen readers, and it submits with the form it's in.
 *
 *   name, type, value, placeholder, required, disabled, autocomplete, maxlength
 *   look      glow | chrome | glass | riso | crt              default: glow
 *   palette   the colours of the light                    default: lime (or the look's own)
 *   pixel     size of one pixel, px                       default: 3
 *
 *   events: input, change */
class PiixInputElement extends GLStage {
  static get formAssociated() { return true; }
  static get observedAttributes() { return [...GLStage.observedAttributes, 'placeholder', 'type', 'disabled', 'required']; }
  get _defPal() { const l = glLook(this); return l === 'glow' ? 'lime' : GL_LOOKS[l][0]; }
  constructor() { super(); this._defPx = 3; this._defDither = .4; this._click = [.5, .5, -9]; this._int = this.attachInternals ? this.attachInternals() : null; this._focus = 0; }
  get value() { return this._in ? this._in.value : this.getAttribute('value') || ''; }
  set value(v) { if (this._in) this._in.value = v; this._sync(); }
  _hostCss() { return 'display:block'; }
  _css() {
    const l = this._pal.list;
    return `label{display:block;margin-bottom:8px;font:400 12px/1 ${KIT_FONT};text-transform:uppercase;letter-spacing:.06em;color:inherit;opacity:.8}
.box{position:relative;${glLookHost(glLook(this))}}
input{all:unset;position:relative;z-index:1;box-sizing:border-box;width:100%;padding:15px 18px;font:500 16px/1.2 "Bricolage Grotesque",system-ui,sans-serif;${glLook(this) === 'glow' ? 'color:#f2eef8' : GL_LOOK_TEXT[glLook(this)](l)};caret-color:${l[l.length - 2]}}
input::placeholder{color:#8e869c}
:host([disabled]){opacity:.5}`;
  }
  _html() {
    const a = n => this.hasAttribute(n) ? ` ${n}="${String(this.getAttribute(n)).replace(/"/g, '&quot;')}"` : '';
    return `<label for="f" part="label"><slot></slot></label><div class="box"><canvas aria-hidden="true"></canvas><input id="f" part="input"${a('type')}${a('placeholder')}${a('value')}${a('autocomplete')}${a('maxlength')}${this.hasAttribute('required') ? ' required' : ''}${this.hasAttribute('disabled') ? ' disabled' : ''}></div>`;
  }
  _box() { return this.shadowRoot.querySelector('.box'); }
  _setup() {
    const i = this._in = this.shadowRoot.querySelector('input');
    i.addEventListener('focus', () => { this._focused = true; });
    i.addEventListener('blur', () => { this._focused = false; });
    i.addEventListener('input', () => {
      /* a ring from roughly where the caret is */
      const k = i.value.length ? clamp((i.selectionStart || i.value.length) / Math.max(12, i.value.length * 1.6), .05, .95) : .05;
      this._click = [k, .5, now()];
      this._sync();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    i.addEventListener('change', () => this.dispatchEvent(new Event('change', { bubbles: true })));
    this._sync();
  }
  _sync() {
    if (!this._int || !this._in) return;
    this._int.setFormValue(this._in.value);
    if (this._in.validity) this._int.setValidity(this._in.validity.valid ? {} : this._in.validity, this._in.validationMessage, this._in);
  }
  _shader() { return GL_LOOKS[glLook(this)][1]; }
  _uniforms(T, dt) {
    this._focus = lerp(this._focus, this._focused ? 1 : 0, Math.min(1, dt * 6));
    return { u_hover: Math.max(this._hov * .5, this._focus), u_mouse: this._focused ? [this._click[0], .5] : this._m, u_k: [this._click[0], this._click[1], (now() - this._click[2]) / 1000, 1], u_j: [this._focus * .03, 0, 0, 0] };
  }
}
define('piix-input', PiixInputElement);
ELEMENTS.input = 'piix-input';
