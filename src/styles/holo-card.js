/* HOLO CARD: a holographic foil card that tilts under your hand.   @component holo-card  @needs holo-button
 *
 *   <piix-holo-card>
 *     <img src="avatar.png" alt="">
 *     <h3>Nova</h3><p>Rare · #042</p>
 *   </piix-holo-card>
 *
 * Like a rare trading card: it tilts toward the pointer in 3D, a rainbow foil slides across it at
 * the angle of the light, sparkles glint in the foil, a glare follows you, and faint scanlines
 * remind you it's projected. Tap on a phone to wobble it.
 *
 *   hue        tint of the card's glass, 0-360            default: 250
 *   intensity  how strong the foil is, 0-1               default: .7
 *   static     no tilt */
class PiixHoloCardElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const h = +this.getAttribute('hue') || 250, k = this.hasAttribute('intensity') ? +this.getAttribute('intensity') : .7;
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${HOLO_CSS}
:host{display:block;perspective:900px;--mx:.5;--my:.5;--rx:0deg;--ry:0deg;--on:0}
.c{position:relative;border-radius:18px;padding:26px;color:#f4f7ff;overflow:hidden;transform:rotateX(var(--rx)) rotateY(var(--ry));transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.9,.3,1),box-shadow .4s;
  background:linear-gradient(160deg,hsl(${h} 45% 22%),hsl(${h + 40} 50% 12%) 60%,hsl(${h - 30} 40% 16%));
  box-shadow:0 0 0 1px rgba(255,255,255,.14) inset,0 30px 60px -25px hsl(${h} 80% 20% / .9),0 0 calc(var(--on) * 40px) hsl(${h} 100% 60% / .25)}
:host(:hover) .c{transition:transform .08s linear,box-shadow .4s}
/* the foil: a rainbow sliding with the light, burned into the card */
.f{position:absolute;inset:0;pointer-events:none;mix-blend-mode:color-dodge;opacity:calc(${k} * (.35 + var(--on) * .65));
  background:repeating-linear-gradient(115deg,#ff5ec4 0%,#ffd23f 7%,#5cffb0 14%,#3fd0ff 21%,#a26bff 28%,#ff5ec4 35%);background-size:280% 280%;
  background-position:calc(var(--mx) * 100%) calc(var(--my) * 100%);filter:saturate(1.4) brightness(.75)}
/* glints: a field of tiny sparkles only the foil light catches */
.s{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:calc(${k} * var(--on));
  background:radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 2px) 0 0/37px 41px,radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 1.6px) 0 0/53px 29px;
  -webkit-mask:radial-gradient(220px 160px at calc(var(--mx) * 100%) calc(var(--my) * 100%),#000,transparent);mask:radial-gradient(220px 160px at calc(var(--mx) * 100%) calc(var(--my) * 100%),#000,transparent)}
.g{position:absolute;inset:0;pointer-events:none;background:radial-gradient(farthest-corner circle at calc(var(--mx) * 100%) calc(var(--my) * 100%),rgba(255,255,255,calc(.28 * var(--on))),transparent 55%);mix-blend-mode:overlay}
.l{position:absolute;inset:0;pointer-events:none;background:${HOLO_SCAN(.05)};animation:hscan 4s linear infinite}
.e{position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:${HOLO_FOIL};background-size:200% 200%;background-position:calc(var(--mx) * 100%) 50%;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.7}
.in{position:relative;transform:translateZ(30px)}
::slotted(img){display:block;max-width:100%;border-radius:12px}
::slotted(h3){margin:.6em 0 .2em}
</style><div class="c" part="card"><div class="in"><slot></slot></div><i class="f"></i><i class="s"></i><i class="g"></i><i class="l"></i><i class="e"></i></div>`;
    const c = this.shadowRoot.querySelector('.c');
    holoTrack(this, c);
    const tilt = e => {
      if (this.hasAttribute('static') || reduced()) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      this.style.setProperty('--ry', (x * 22).toFixed(2) + 'deg'); this.style.setProperty('--rx', (-y * 18).toFixed(2) + 'deg'); this.style.setProperty('--on', 1);
    };
    c.addEventListener('pointermove', tilt);
    c.addEventListener('pointerleave', () => { this.style.setProperty('--rx', '0deg'); this.style.setProperty('--ry', '0deg'); this.style.setProperty('--on', 0); });
    /* touch: a short wobble that sweeps the foil */
    c.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || reduced()) return;
      let t0 = now();
      const step = () => { const t = (now() - t0) / 1000; if (t > 1.2) { c.dispatchEvent(new Event('pointerleave')); return; }
        const a = Math.sin(t * 9) * Math.exp(-t * 2.5); this.style.setProperty('--ry', (a * 18).toFixed(2) + 'deg'); this.style.setProperty('--mx', (.5 + a * .5).toFixed(3)); this.style.setProperty('--on', 1); requestAnimationFrame(step); };
      step();
    });
  }
}
define('piix-holo-card', PiixHoloCardElement);
ELEMENTS['holo-card'] = 'piix-holo-card';
