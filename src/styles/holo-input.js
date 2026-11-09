/* HOLO INPUT: a text field projected like a HUD.   @component holo-input  @needs holo-button
 *
 *   <piix-holo-input label="Callsign" name="callsign"></piix-holo-input>
 *   <piix-holo-input label="Access code" type="password"></piix-holo-input>
 *
 * A translucent field with targeting brackets that lock onto it when focused, a scan line sweeping
 * across, a label that lifts into a readout, and every keystroke blipping a character up out of
 * the field. A real input underneath: it works with forms, autofill and screen readers.
 *
 *   label        the label                               default: Input
 *   name, type, value, placeholder, required, autocomplete   as on <input>
 *   hue          projector colour, 0-360                 default: 190 */
class PiixHoloInputElement extends HTMLElement {
  static get formAssociated() { return true; }
  constructor() { super(); this._int = this.attachInternals ? this.attachInternals() : null; }
  get value() { return this._in ? this._in.value : this.getAttribute('value') || ''; }
  set value(v) { if (this._in) { this._in.value = v; this._sync(); } else this.setAttribute('value', v); }
  connectedCallback() {
    if (this.shadowRoot) return;
    const h = +this.getAttribute('hue') || 190, a = n => this.hasAttribute(n) ? ` ${n}="${this.getAttribute(n).replace(/"/g, '&quot;')}"` : '';
    const label = (this.getAttribute('label') || 'Input').replace(/[<>&]/g, '');
    this.attachShadow({ mode: 'open', delegatesFocus: true }).innerHTML = `<style>${HOLO_CSS}
:host{display:block;--c:hsl(${h} 100% 66%)}
@keyframes hsweep{0%{left:-20%}100%{left:110%}}
@keyframes hblip{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-34px) scale(1.4)}}
.f{position:relative;padding:24px 16px 10px;background:linear-gradient(180deg,hsl(${h} 100% 50% / .08),hsl(${h} 100% 50% / .02)),rgba(6,14,26,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  border-bottom:1.5px solid hsl(${h} 100% 66% / .5);transition:border-color .2s}
.f::after{content:"";position:absolute;inset:0;background:${HOLO_SCAN(.06)};pointer-events:none}
label{position:absolute;left:16px;top:17px;font:500 15px/1 "JetBrains Mono",ui-monospace,monospace;color:hsl(${h} 60% 75% / .75);letter-spacing:.06em;transition:transform .2s,font-size .2s,color .2s;transform-origin:0 0;pointer-events:none}
.f.up label{transform:translateY(-10px) scale(.72);color:var(--c);text-transform:uppercase;letter-spacing:.2em}
input{all:unset;box-sizing:border-box;width:100%;font:500 17px/1.4 "JetBrains Mono",ui-monospace,monospace;color:#eafcff;caret-color:var(--c);text-shadow:0 0 8px hsl(${h} 100% 60% / .7)}
.br{position:absolute;width:12px;height:12px;border:1.5px solid var(--c);opacity:0;transition:all .3s cubic-bezier(.3,1.6,.5,1);pointer-events:none;filter:drop-shadow(0 0 4px var(--c))}
.br.a{left:-14px;top:-14px;border-right:0;border-bottom:0}.br.b{right:-14px;top:-14px;border-left:0;border-bottom:0}.br.c{left:-14px;bottom:-14px;border-right:0;border-top:0}.br.d{right:-14px;bottom:-14px;border-left:0;border-top:0}
.f:focus-within{border-color:var(--c)}
.f:focus-within .br{opacity:1}.f:focus-within .br.a{left:-4px;top:-4px}.f:focus-within .br.b{right:-4px;top:-4px}.f:focus-within .br.c{left:-4px;bottom:-4px}.f:focus-within .br.d{right:-4px;bottom:-4px}
.sw{position:absolute;top:0;bottom:0;width:18%;background:linear-gradient(90deg,transparent,hsl(${h} 100% 75% / .3),transparent);opacity:0;pointer-events:none}
.f:focus-within .sw{opacity:1;animation:hsweep 1.8s linear infinite}
.bl{position:absolute;bottom:22px;font:600 14px "JetBrains Mono",monospace;color:var(--c);text-shadow:0 0 8px var(--c);pointer-events:none;animation:hblip .6s ease-out forwards}
</style><div class="f" part="field"><label for="i">${label}</label><input id="i" part="input"${a('type')}${a('name')}${a('value')}${a('placeholder')}${a('autocomplete')}${this.hasAttribute('required') ? ' required' : ''}><i class="sw"></i><i class="br a"></i><i class="br b"></i><i class="br c"></i><i class="br d"></i></div>`;
    this._in = this.shadowRoot.querySelector('input'); this._f = this.shadowRoot.querySelector('.f');
    const meas = document.createElement('canvas').getContext('2d');
    this._in.addEventListener('input', e => {
      this._sync();
      if (reduced() || !e.data) return;
      /* a blip of the typed character, rising out of the field where the caret is */
      meas.font = '500 17px "JetBrains Mono",monospace';
      const ch = this._in.type === 'password' ? '•' : e.data.slice(-1), x = Math.min(this._in.clientWidth, meas.measureText(this._in.type === 'password' ? '•'.repeat(this._in.value.length) : this._in.value).width) + 16 - this._in.scrollLeft;
      const b = document.createElement('i'); b.className = 'bl'; b.textContent = ch; b.style.left = x + 'px'; this._f.appendChild(b); setTimeout(() => b.remove(), 650);
    });
    this._in.addEventListener('focus', () => this._f.classList.add('up'));
    this._in.addEventListener('blur', () => this._sync());
    this._in.addEventListener('change', () => this.dispatchEvent(new Event('change', { bubbles: true })));
    this._sync();
  }
  _sync() {
    this._f.classList.toggle('up', !!this._in.value || this.shadowRoot.activeElement === this._in);
    if (this._int) { this._int.setFormValue(this._in.value); this._int.setValidity(this._in.validity, this._in.validationMessage, this._in); }
  }
}
define('piix-holo-input', PiixHoloInputElement);
ELEMENTS['holo-input'] = 'piix-holo-input';
