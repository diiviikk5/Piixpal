/* REWIND: a VCR for any part of your page. Everything that changes in it can be rewound.   @component rewind
 *
 *   <piix-rewind>
 *     <ul id="todo"> … your app … </ul>
 *     <input placeholder="New task">
 *   </piix-rewind>
 *
 * It records every change inside it as it happens: text typed into fields and editable areas,
 * elements added and removed, attributes, checkboxes, selects. Press ◀◀ and the section rewinds
 * like a tape (scanlines, a rolling tracking band, the time counting back) with every change
 * undone in reverse, letter by letter. Drag the playhead to any moment, ►► to come back to now,
 * or press KEEP to carry on from that moment (everything after it is dropped, like an undo).
 * These are the real changes reversed, not screenshots: what you see in the past is live DOM,
 * held still until you come back.
 *
 *   max       how many changes to remember                         default: 2000
 *   speed     how fast it rewinds, 0.5 to 4                        default: 1
 *   controls  off: no tape deck, drive it from code
 *   sound     make sounds even without <piix-chiptune> ("off" to stay silent)
 *
 *   methods: rewind(), play() (back to now), seek(step), keep(), clear()
 *   properties: steps (how many are recorded), at (the step you're on)
 *   events: seek (detail: { at, steps }), keep */
const RW_FIELDS = 'input,textarea,select';
const rwVal = el => el.type === 'checkbox' || el.type === 'radio' ? ['checked', el.checked] : el.tagName === 'SELECT' ? ['selectedIndex', el.selectedIndex] : ['value', el.value];
const rwTime = ms => { const s = Math.max(0, Math.round(ms / 1000)); return (s < 0 ? '' : '-') + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
class PiixRewindElement extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._steps = []; this._at = 0; this._mode = 'live';
    this._vals = new WeakMap();
    this._loop = dt => this._tick(dt);
  }
  get steps() { return this._steps.length; }
  get at() { return this._at; }
  connectedCallback() {
    const deck = this.getAttribute('controls') !== 'off';
    this.shadowRoot.innerHTML = `<style>
:host{display:block;position:relative}
.box{position:relative}
.vhs{position:absolute;inset:0;pointer-events:none;opacity:0;overflow:hidden;z-index:3}
:host([data-past]) .vhs{opacity:1}
.vhs::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}
.band{position:absolute;left:-2%;right:-2%;height:18px;top:-30px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 3px,rgba(0,0,0,.25) 3px 5px,rgba(255,255,255,.2) 5px 9px);opacity:0;filter:blur(.4px)}
:host([data-rewinding]) .band{opacity:.85;animation:piixband 1.1s steps(22) infinite}
@keyframes piixband{to{top:calc(100% + 30px)}}
::slotted(*){transition:filter .2s steps(2)}
:host([data-past]) ::slotted(*){filter:saturate(1.35) contrast(1.08) hue-rotate(-6deg)}
:host([data-rewinding]) ::slotted(*){filter:saturate(1.6) contrast(1.15) hue-rotate(-10deg) blur(.3px);animation:piixjit .18s steps(2) infinite}
@keyframes piixjit{50%{translate:2px 0}}
.osd{position:absolute;top:10px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start;font:400 16px/1 ${KIT_FONT};color:#fff;letter-spacing:.06em;text-shadow:2px 2px 0 #000,-1px 0 0 rgba(255,0,80,.7),1px 0 0 rgba(0,200,255,.7);opacity:0;z-index:4;pointer-events:none}
:host([data-past]) .osd{opacity:1}
.osd span{padding:5px 7px 4px;background:rgba(10,8,20,.55)}
.deck{display:flex;align-items:center;gap:8px;margin-top:12px;padding:6px;background:#17121f;clip-path:${kitCorners(3)};color:#f2eef8;font:400 12px/1 ${KIT_FONT};user-select:none;-webkit-user-select:none}
.deck[hidden]{display:none}
.deck button{all:unset;box-sizing:border-box;padding:8px 10px 7px;background:#2a2236;clip-path:${kitCorners(2)};cursor:pointer;letter-spacing:.06em;white-space:nowrap;transition:background .1s steps(1)}
.deck button:hover{background:#3a3050}
.deck button:focus-visible{outline:2px dashed #c6f432;outline-offset:2px}
.deck button[aria-pressed=true]{background:#c6f432;color:#17121f}
.deck button:disabled{opacity:.35;cursor:default}
.keep{background:#ff6b4a!important;color:#fff}
.keep[hidden]{display:none}
.track{position:relative;flex:1;height:22px;cursor:pointer;touch-action:none}
.track::before{content:'';position:absolute;left:0;right:0;top:9px;height:4px;background:#2a2236}
.fill{position:absolute;left:0;top:9px;height:4px;background:#c6f432}
.ticks{position:absolute;inset:0;pointer-events:none}
.ticks i{position:absolute;top:6px;width:2px;height:10px;background:#6b5d85}
.head{position:absolute;top:2px;width:10px;height:18px;margin-left:-5px;background:#f2eef8;clip-path:polygon(0 0,100% 0,100% 70%,50% 100%,0 70%)}
.track:focus-visible{outline:2px dashed #c6f432;outline-offset:2px}
.time{min-width:52px;text-align:right;opacity:.8;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){:host([data-rewinding]) .band,:host([data-rewinding]) ::slotted(*){animation:none}}
</style><div class="box"><slot></slot><div class="vhs" aria-hidden="true"><div class="band"></div></div><div class="osd" aria-hidden="true"><span class="mode">&lt;&lt; REW</span><span class="clock">-00:00</span></div></div>
<div class="deck" part="deck"${deck ? '' : ' hidden'}>
<button type="button" class="rew" aria-pressed="false" aria-label="Rewind">◀◀</button>
<div class="track" role="slider" tabindex="0" aria-label="History" aria-valuemin="0"><div class="fill"></div><div class="ticks"></div><div class="head"></div></div>
<span class="time" aria-hidden="true">LIVE</span>
<button type="button" class="ff" aria-label="Back to now" disabled>►►</button>
<button type="button" class="keep" hidden>KEEP</button>
</div><div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)" aria-live="polite"></div>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this._ui = { rew: $('.rew'), ff: $('.ff'), keep: $('.keep'), track: $('.track'), fill: $('.fill'), ticks: $('.ticks'), head: $('.head'), time: $('.time'), mode: $('.mode'), clock: $('.clock'), sr: $('[aria-live]') };
    const u = this._ui;
    u.rew.addEventListener('click', () => this._mode === 'rew' ? this._pause() : this.rewind());
    u.ff.addEventListener('click', () => this.play());
    u.keep.addEventListener('click', () => this.keep());
    /* the playhead: drag it, or use the arrow keys, to any moment */
    const scrub = e => { const r = u.track.getBoundingClientRect(); this._pause(); this.seek(Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * this._steps.length)); };
    u.track.addEventListener('pointerdown', e => { u.track.setPointerCapture(e.pointerId); scrub(e); u.track.onpointermove = scrub; });
    u.track.addEventListener('pointerup', () => { u.track.onpointermove = null; });
    u.track.addEventListener('keydown', e => {
      const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); this._pause(); this.seek(e.key === 'Home' ? 0 : this._steps.length); }
      else if (d) { e.preventDefault(); this._pause(); this.seek(this._at + d); }
    });
    /* record: what the page does to the DOM, and what people type */
    this._snapFields(this);
    this._mo = new MutationObserver(recs => this._record(recs));
    this._watch();
    this.addEventListener('input', this._in = e => this._field(e.target), true);
    this.addEventListener('change', this._ch = e => this._field(e.target), true);
    this._paint();
  }
  disconnectedCallback() { this._mo.disconnect(); unsub(this._loop); this.removeEventListener('input', this._in, true); this.removeEventListener('change', this._ch, true); }
  _watch() { this._mo.observe(this, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true }); }
  /* remember every field's value, so a change knows what it was before */
  _snapFields(root) {
    const list = root.matches && root.matches(RW_FIELDS) ? [root] : [...(root.querySelectorAll ? root.querySelectorAll(RW_FIELDS) : [])];
    for (const el of list) this._vals.set(el, rwVal(el)[1]);
  }

  /* ---------- recording ---------- */
  _push(step) {
    if (this._mode !== 'live') return;
    step.t = now();
    this._steps.push(step);
    const max = Math.max(10, +this.getAttribute('max') || 2000);
    if (this._steps.length > max) this._steps.splice(0, this._steps.length - max);
    this._at = this._steps.length;
    this._paint();
  }
  _record(recs) {
    if (this._mode !== 'live') return;
    recs = recs.filter(r => !(r.type === 'attributes' && (r.attributeName === 'inert' || r.attributeName === 'style' && r.target === this)));
    if (!recs.length) return;
    /* each attribute and text change also needs its value after, which is the next one's value before */
    const after = new Map();
    const ops = [];
    for (let i = recs.length - 1; i >= 0; i--) {
      const r = recs[i];
      if (r.type === 'attributes') {
        const k = r.target, key = 'a:' + r.attributeName, m = after.get(k) || {};
        const nv = key in m ? m[key] : r.target.getAttribute(r.attributeName);
        m[key] = r.oldValue; after.set(k, m);
        ops.unshift({ type: 'attr', el: r.target, name: r.attributeName, from: r.oldValue, to: nv });
      } else if (r.type === 'characterData') {
        const k = r.target, m = after.get(k) || {};
        const nv = 'd' in m ? m.d : r.target.data;
        m.d = r.oldValue; after.set(k, m);
        ops.unshift({ type: 'text', el: r.target, from: r.oldValue, to: nv });
      } else {
        ops.unshift({ type: 'list', el: r.target, add: [...r.addedNodes], rem: [...r.removedNodes], next: r.nextSibling, prev: r.previousSibling });
        r.addedNodes.forEach(n => this._snapFields(n));
      }
    }
    /* code that sets a field's value fires no event: catch it here, next to the change it came with */
    for (const el of this.querySelectorAll(RW_FIELDS)) {
      if (!this._vals.has(el)) continue;
      const [prop, v] = rwVal(el), was = this._vals.get(el);
      if (was !== v) { ops.push({ type: 'prop', el, prop, from: was, to: v }); this._vals.set(el, v); }
    }
    this._push({ ops });
  }
  _field(el) {
    if (this._mode !== 'live' || !el.matches || !el.matches(RW_FIELDS)) return;
    const [prop, v] = rwVal(el), was = this._vals.has(el) ? this._vals.get(el) : (prop === 'checked' ? !v : prop === 'value' ? '' : 0);
    if (was === v) return;
    this._vals.set(el, v);
    /* a radio turning on turns its group's other one off */
    const ops = [{ type: 'prop', el, prop, from: was, to: v }];
    if (el.type === 'radio' && v && el.name) for (const o of this.querySelectorAll(`input[type=radio][name="${CSS.escape(el.name)}"]`)) if (o !== el && this._vals.get(o)) { ops.push({ type: 'prop', el: o, prop: 'checked', from: true, to: false }); this._vals.set(o, false); }
    this._push({ ops });
  }

  /* ---------- playing it back ---------- */
  _do(step, back) {
    const ops = back ? [...step.ops].reverse() : step.ops;
    for (const o of ops) {
      if (o.type === 'attr') { const v = back ? o.from : o.to; v === null ? o.el.removeAttribute(o.name) : o.el.setAttribute(o.name, v); }
      else if (o.type === 'text') o.el.data = back ? o.from : o.to;
      else if (o.type === 'prop') { o.el[o.prop] = back ? o.from : o.to; this._vals.set(o.el, o.el[o.prop]); }
      else {
        const [gone, come] = back ? [o.add, o.rem] : [o.rem, o.add];
        for (const n of gone) if (n.parentNode === o.el) o.el.removeChild(n);
        /* back where they were: before the old next sibling, after the old previous one, or first */
        const before = o.next && o.next.parentNode === o.el ? o.next : o.prev && o.prev.parentNode === o.el ? o.prev.nextSibling : o.prev ? null : o.el.firstChild;
        for (const n of come) o.el.insertBefore(n, before);
      }
    }
  }
  seek(i) {
    i = clamp(i | 0, 0, this._steps.length);
    if (i === this._at && this._mode !== 'live') return this._paint();
    if (this._mode === 'live') this._enterPast();
    while (this._at > i) this._do(this._steps[--this._at], true);
    while (this._at < i) this._do(this._steps[this._at++], false);
    this._mo.takeRecords();
    if (this._at === this._steps.length && this._mode !== 'rew') this._leavePast();
    this._paint();
    this.dispatchEvent(new CustomEvent('seek', { detail: { at: this._at, steps: this._steps.length } }));
  }
  rewind() {
    if (!this._steps.length) { sfx('error', this); return; }
    if (this._mode === 'live') this._enterPast();
    this._mode = 'rew'; this._acc = 0; this._held = 0;
    this.toggleAttribute('data-rewinding', true);
    sfx('launch', this, { pitch: .5 });
    sub(this._loop);
    this._paint();
  }
  _pause() {
    if (this._mode !== 'rew') return;
    this._mode = 'past';
    this.removeAttribute('data-rewinding');
    unsub(this._loop);
    this._paint();
  }
  /* back to the present: every change replayed in order */
  play() { this._pause(); this.seek(this._steps.length); sfx('powerup', this, { gap: 200 }); }
  /* carry on from this moment: the future is dropped, and recording picks up from here */
  keep() {
    if (this._mode === 'live') return;
    this._pause();
    this._steps.length = this._at;
    this._leavePast();
    this._snapFields(this);
    sfx('coin', this);
    this.dispatchEvent(new Event('keep'));
    this._paint();
  }
  clear() { if (this._mode !== 'live') this.play(); this._steps = []; this._at = 0; this._paint(); }
  _enterPast() {
    this._mo.disconnect();
    this._mode = 'past';
    this._inert = [...this.children].map(c => [c, c.inert]);
    for (const [c] of this._inert) c.inert = true;
    this.toggleAttribute('data-past', true);
    this._ui.sr.textContent = 'Viewing the past. Changes are paused.';
  }
  _leavePast() {
    this._mode = 'live';
    for (const [c, was] of this._inert || []) c.inert = was;
    this._inert = null;
    this.removeAttribute('data-past'); this.removeAttribute('data-rewinding');
    unsub(this._loop);
    this._mo.takeRecords();
    this._watch();
    this._ui.sr.textContent = 'Back to now.';
  }
  /* a tape rewinds slowly at first, then faster and faster */
  _tick(dt) {
    if (this._mode !== 'rew') return;
    this._held += dt;
    const rate = (6 + this._held * this._held * 30) * clamp(+this.getAttribute('speed') || 1, .5, 4);
    this._acc += rate * dt;
    const k = Math.floor(this._acc);
    if (k > 0) {
      this._acc -= k;
      this.seek(this._at - k);
      if (k && this._held % .25 < dt) sfx('type', this, { pitch: .4 + Math.min(1.2, this._held * .3), gap: 40 });
    }
    if (this._at <= 0) { this._pause(); sfx('close', this); }
  }

  _paint() {
    const u = this._ui, n = this._steps.length, live = this._mode === 'live';
    if (!u) return;
    const p = n ? this._at / n : 1;
    u.fill.style.width = p * 100 + '%'; u.head.style.left = p * 100 + '%';
    u.track.setAttribute('aria-valuemax', n); u.track.setAttribute('aria-valuenow', this._at);
    u.track.setAttribute('aria-valuetext', live ? 'Now' : `${this._at} of ${n} changes`);
    /* a tick for each burst of activity, not each keystroke */
    if (this._ticksFor !== n) {
      this._ticksFor = n;
      const marks = [];
      for (let i = 0; i < n; i++) if (i === 0 || this._steps[i].t - this._steps[i - 1].t > 700) marks.push(i);
      u.ticks.innerHTML = marks.slice(-80).map(i => `<i style="left:${(i / n) * 100}%"></i>`).join('');
    }
    const ago = !live && n ? now() - (this._at ? this._steps[this._at - 1].t : this._steps[0].t - 1000) : 0;
    u.time.textContent = live ? 'LIVE' : rwTime(ago);
    u.clock.textContent = rwTime(ago);
    u.mode.textContent = this._mode === 'rew' ? '<< REW' : this._at === 0 ? 'START' : 'PAUSE';
    u.rew.setAttribute('aria-pressed', String(this._mode === 'rew'));
    u.rew.disabled = !n || (this._at === 0 && this._mode !== 'rew');
    u.ff.disabled = live;
    u.keep.hidden = live;
  }
}
define('piix-rewind', PiixRewindElement);
ELEMENTS.rewind = 'piix-rewind';
