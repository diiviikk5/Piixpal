/* KBD: a pixel keycap that presses down when you press the real key.   @component kbd
 *
 *   Press <piix-kbd>⌘</piix-kbd> <piix-kbd>K</piix-kbd> to search
 *
 * A chunky keycap with a lit top face and a skirt underneath. Press that key on your keyboard
 * and it goes down with you, and comes back up when you let go. Great for shortcut hints,
 * onboarding and docs. It reads as normal keyboard text for screen readers.
 *
 *   key       the key to listen for, if the label isn't it (Enter, Escape, ArrowUp, " "…)
 *   theme     light | dark | lime                              default: light
 *   size      sm | md | lg                                     default: md */
const KBD_KEYS = { '⌘': 'Meta', '⌃': 'Control', '⇧': 'Shift', '⌥': 'Alt', '↵': 'Enter', '⏎': 'Enter', '⎋': 'Escape', '⇥': 'Tab', '⌫': 'Backspace', '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', space: ' ', esc: 'Escape', ctrl: 'Control', cmd: 'Meta', alt: 'Alt', opt: 'Alt', shift: 'Shift', enter: 'Enter', return: 'Enter', tab: 'Tab' };
const KBD_THEMES = { light: ['#fbf8f2', '#d9d0bf', '#17121f'], dark: ['#2a2236', '#120e18', '#f2eef8'], lime: ['#c6f432', '#6f8f12', '#17121f'] };
class PiixKbdElement extends HTMLElement {
  static get observedAttributes() { return ['theme', 'size']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  connectedCallback() {
    this._build();
    const want = () => { const k = this.getAttribute('key') || this.textContent.trim(); return KBD_KEYS[k] || KBD_KEYS[k.toLowerCase()] || k; };
    const match = e => { const w = want(); return e.key === w || (w.length === 1 && e.key.toLowerCase() === w.toLowerCase()); };
    addEventListener('keydown', this._kd = e => { if (match(e)) this.toggleAttribute('data-down', true); });
    addEventListener('keyup', this._ku = e => { if (match(e) || e.key === 'Meta') this.removeAttribute('data-down'); });
    addEventListener('blur', this._bl = () => this.removeAttribute('data-down'));
  }
  disconnectedCallback() { removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku); removeEventListener('blur', this._bl); }
  attributeChangedCallback() { if (this.shadowRoot.firstChild) this._build(); }
  _build() {
    const [top, skirt, ink] = KBD_THEMES[this.getAttribute('theme')] || KBD_THEMES.light;
    const [fs, h, pad] = { sm: [11, 3, '4px 7px 5px'], lg: [17, 5, '8px 13px 9px'] }[this.getAttribute('size')] || [13, 4, '6px 10px 7px'];
    this.shadowRoot.innerHTML = `<style>
:host{display:inline-block;vertical-align:middle;margin:0 1px;padding-bottom:${h}px}
kbd{display:inline-block;min-width:1.1em;padding:${pad};text-align:center;font:400 ${fs}px/1 "Silkscreen","Segoe UI Symbol","Apple Symbols",ui-monospace,monospace;color:${ink};background:${top};
  box-shadow:inset 0 0 0 2px ${ink},inset 0 -${h}px 0 ${skirt},0 ${h}px 0 0 ${ink};clip-path:polygon(0 2px,2px 2px,2px 0,calc(100% - 2px) 0,calc(100% - 2px) 2px,100% 2px,100% calc(100% + ${h}px),0 calc(100% + ${h}px));
  transform:translateY(0);transition:transform 40ms steps(1),box-shadow 40ms steps(1)}
:host([data-down]) kbd{transform:translateY(${h - 1}px);box-shadow:inset 0 0 0 2px ${ink},inset 0 -1px 0 ${skirt},0 1px 0 0 ${ink}}
</style><kbd part="key"><slot></slot></kbd>`;
  }
}
define('piix-kbd', PiixKbdElement);
ELEMENTS.kbd = 'piix-kbd';
