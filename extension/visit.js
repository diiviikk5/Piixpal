/* Piixpal visit: pals on any website. Shared by the bookmarklet (piixpal.dvkk.dev/visit) and the
 * browser extension (extension/). Needs window.Piixpal (piixpal.min.js) on the page.
 *
 *   PiixVisit.open()            the little panel: vibes, add a pal, your own pal, clear
 *   PiixVisit.vibe('party')     party | ocean | snow | dragon | lights | trail | stickers | shuffle
 *   PiixVisit.add('pip')        one pal, wherever it fits best on this page
 *   PiixVisit.pet({ pal })      the extension's browser pet: one pal that lives on every page
 *   PiixVisit.bulb(true)        the light switch: pull its chain to flip any page dark (or light)
 *   PiixVisit.clear()
 *
 * It only adds things (in a container at the end of <body>, and a data attribute on the elements
 * pals sit on); it never changes the page's own content, and clear() takes it all away. */
(() => {
  if (window.PiixVisit) return;
  const P = () => window.Piixpal;
  const SITE = 'https://piixpal.dvkk.dev';
  const added = new Set();
  let seq = 0;

  /* ---------- where things go ---------- */
  const shown = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 10 || r.bottom < -innerHeight * .2 || r.top > innerHeight * 1.6) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > .1;
  };
  const text = el => (el.innerText || '').trim();
  const pick = {
    /* the headings people can see, the biggest first */
    headings: () => [...document.querySelectorAll('h1,h2,h3,[role=heading]')]
      .filter(e => shown(e) && text(e).length > 1 && text(e).length < 220)
      .sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize) || a.getBoundingClientRect().top - b.getBoundingClientRect().top),
    paragraphs: () => [...document.querySelectorAll('p,li,blockquote,[data-testid=tweetText]')].filter(e => shown(e) && text(e).length > 60),
    buttons: () => [...document.querySelectorAll('button,a[role=button],[role=button],input[type=submit],.btn,.button')]
      .filter(e => { if (!shown(e)) return false; const r = e.getBoundingClientRect(); return r.width < 420 && r.height < 120 && r.top > 0 && r.top < innerHeight; }),
    bar: () => [...document.querySelectorAll('footer,nav,header,[role=banner],[role=navigation]')].find(shown),
    /* something to walk on, whatever kind of page this is */
    ground: () => pick.headings()[0] || pick.paragraphs()[0] || [...document.querySelectorAll('main,article,section,div')].find(e => shown(e) && e.getBoundingClientRect().width > 300) || document.body
  };
  /* point pals at elements without touching them: a data attribute, matched by on="…" */
  const mark = els => {
    const id = 'v' + (++seq);
    for (const e of [].concat(els)) if (e && e !== document.body) e.setAttribute('data-piix-visit', ((e.getAttribute('data-piix-visit') || '') + ' ' + id).trim());
    return [].concat(els)[0] === document.body ? 'body' : `[data-piix-visit~="${id}"]`;
  };
  let box = null;
  const container = () => {
    if (box && box.isConnected) return box;
    box = document.createElement('div');
    box.setAttribute('data-piixpal-visit', '');
    box.style.cssText = 'display:none';
    document.body.appendChild(box);
    return box;
  };
  const host = (attrs, inBody = false) => {
    const el = document.createElement(attrs._tag || 'piix-pal');
    for (const k in attrs) if (k[0] !== '_' && attrs[k] != null) el.setAttribute(k, attrs[k]);
    (inBody ? document.body : container()).appendChild(el);
    added.add(el);
    return el;
  };

  /* what a pal likes to sit on, from what it does */
  const habitat = name => {
    const sp = P() && P()._k && P()._k.SPRITES[name];
    const does = sp ? sp.does : '';
    if (does === 'perch' || does === 'wire') return 'buttons';
    if (does === 'follow' || does === 'beeline' || does === 'school' || does === 'float') return 'any';
    if (does === 'mind' || does === 'lounge') return 'paragraphs';
    if (does === 'bounce' || does === 'march' || does === 'parade' || does === 'count' || does === 'hang') return 'bar';
    return 'headings';
  };
  const add = (name, where) => {
    const kind = where || habitat(name);
    let target;
    if (kind === 'buttons') { const b = pick.buttons().slice(0, 6); target = b.length ? b : null; }
    else if (kind === 'paragraphs') target = pick.paragraphs()[0];
    else if (kind === 'bar') target = pick.bar() || pick.headings()[1];
    else if (kind === 'headings') { const hs = pick.headings(); target = hs[added.size % Math.max(1, hs.length)]; }
    target = target || pick.ground();
    return host({ pal: name, on: mark(target), at: (0.15 + Math.random() * .7).toFixed(2) });
  };
  const addMade = ref => {
    const t = pick.headings()[0] || pick.ground();
    return host({ make: ref, on: mark(t) });
  };
  /* a made pal's reference, from a share link, a maker link, a tag or the code itself */
  const refOf = s => {
    s = String(s || '').trim();
    const m = /\/p\/([\w-]+)/.exec(s) || /make[^#]*#([\w-]+)/.exec(s) || /make="([\w-]+)"/.exec(s);
    return m ? m[1] : /^[\w-]{5,}$/.test(s) ? s : '';
  };

  /* ---------- vibes: a whole mood for the page in one click ---------- */
  const has = n => P() && P()._k && (P()._k.SPRITES[n] || P()._k.ELEMENTS[n]);
  const power = (tag, attrs = {}) => host({ _tag: tag, ...attrs }, true);
  const WANDERERS = ['bitbug', 'boing', 'moss', 'pip', 'kitty', 'gecko', 'penguin', 'shibe', 'capy', 'frog', 'duckling', 'bumble', 'tri', 'nomad', 'scrolly', 'pix', 'crumb', 'hiss', 'sprout', 'tabby', 'pidge', 'shel'];
  const VIBES = {
    party: { label: 'Party', icon: '★', run: () => { add('bitbug', 'headings'); add('moss', 'paragraphs'); add('pip', 'buttons'); add('boing', 'bar'); if (has('bees')) add('bees', 'any'); } },
    ocean: { label: 'Ocean', icon: '≋', run: () => power('piix-shoal', { fish: 130, schools: 4 }) },
    snow: { label: 'Snow day', icon: '❄', run: () => { power('piix-weather', { kind: 'snow', amount: 2 }); add('penguin', 'headings'); } },
    dragon: { label: 'Dragon', icon: '🐉', run: () => power('piix-wyrm', { color: ['jade', 'ember', 'void', 'frost', 'gold'][Math.floor(Math.random() * 5)] }) },
    lights: { label: 'Lights out', icon: '🔦', run: () => power('piix-lantern') },
    trail: { label: 'Pixel trail', icon: '✦', run: () => power('piix-cursor', { kind: 'trail', palette: 'candy' }) },
    stickers: { label: 'Stickers', icon: '♥', run: () => power('piix-stickers') },
    shuffle: { label: 'Surprise', icon: '🎲', run: () => { const pool = WANDERERS.filter(has).sort(() => Math.random() - .5); pool.slice(0, 4).forEach(n => add(n)); } }
  };
  const vibe = k => { if (VIBES[k]) VIBES[k].run(); };
  const clear = () => {
    added.forEach(e => e.remove()); added.clear();
    document.querySelectorAll('[data-piix-visit]').forEach(e => e.removeAttribute('data-piix-visit'));
    pet.el = null;
  };

  /* ---------- the browser pet: one pal on every page, found a good spot each time ---------- */
  const pet = cfg => {
    pet.cfg = cfg;
    const place = () => {
      if (pet.el) { pet.el.remove(); added.delete(pet.el); }
      const t = pick.headings()[0] || pick.ground();
      pet.target = t;
      pet.el = cfg.code ? host({ make: refOf(cfg.code), on: mark(t) }) : host({ pal: cfg.pal || 'bitbug', on: mark(t) });
    };
    place();
    /* single-page apps swap their content: if its spot goes away, find another */
    clearInterval(pet.watch);
    pet.watch = setInterval(() => { if (pet.cfg && (!pet.target || !pet.target.isConnected || !shown(pet.target))) { const t = pick.headings()[0]; if (t && t !== pet.target) place(); } }, 2500);
  };
  const unpet = () => { clearInterval(pet.watch); if (pet.el) { pet.el.remove(); added.delete(pet.el); } pet.el = null; pet.cfg = null; };

  /* ---------- the light switch: a bulb on a chain at the top right; pull it to flip the page ---------- */
  const bulb = on => {
    if (bulb.el) { bulb.el.remove(); bulb.el = null; }
    /* not one of the things clear() takes away: it stays until you turn it off */
    if (on) { bulb.el = host({ pal: 'bulb', toggle: 'invert', at: '.985', length: '64' }); added.delete(bulb.el); }
  };

  /* ---------- the panel ---------- */
  let panel = null, root = null, mini = null;
  const CSS = `
:host{all:initial}
[hidden]{display:none!important}
*{box-sizing:border-box;font-family:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace}
.p{position:fixed;right:18px;bottom:18px;width:300px;max-width:calc(100vw - 24px);background:#fbf8f1;color:#17121f;border:3px solid #17121f;border-radius:12px;box-shadow:6px 6px 0 #17121f;z-index:2147483600;padding:12px 12px 10px;font-size:12px;line-height:1.35}
.h{display:flex;align-items:center;gap:8px;margin:0 0 10px;cursor:move;user-select:none}
.h b{font-size:14px;letter-spacing:.02em}
.h i{width:12px;height:12px;background:#c6f432;box-shadow:0 0 0 2px #17121f;display:block}
.h .sp{flex:1}
button,input{font:inherit;color:inherit}
.x{border:0;background:none;cursor:pointer;font-size:16px;line-height:1;padding:2px 4px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
.v{display:flex;align-items:center;gap:6px;padding:7px 8px;border:2px solid #17121f;border-radius:8px;background:#fff;cursor:pointer;font-weight:700;font-size:12px;text-align:left;transition:transform .12s}
.v:hover{background:#c6f432;transform:translate(-1px,-1px)}
.v:active{transform:translate(1px,1px)}
.v span{width:16px;text-align:center}
.r{display:flex;gap:6px;margin-top:8px}
select,input[type=text]{flex:1;min-width:0;padding:7px 8px;border:2px solid #17121f;border-radius:8px;background:#fff;font-size:12px}
.b{padding:7px 10px;border:2px solid #17121f;border-radius:8px;background:#17121f;color:#fbf8f1;font-weight:700;cursor:pointer;font-size:12px}
.b.l{background:#fff;color:#17121f}
.f{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11px;color:#5b5466}
.f a{color:#6b4cff;font-weight:700;text-decoration:none}
.m{position:fixed;right:14px;bottom:14px;width:34px;height:34px;border:3px solid #17121f;border-radius:9px;background:#c6f432;box-shadow:3px 3px 0 #17121f;cursor:pointer;z-index:2147483600;display:grid;place-items:center;font-weight:900;font-size:14px}
.t{margin:10px 0 0;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b5466}
.n{margin-top:6px;font-size:11px;color:#c92a4b;min-height:0}
@media (prefers-color-scheme:dark){.p{background:#17121f;color:#f2eef8;border-color:#f2eef8;box-shadow:6px 6px 0 #c6f432}.v,select,input[type=text],.b.l{background:#241d30;color:#f2eef8;border-color:#f2eef8}.v:hover{color:#17121f}.b{background:#c6f432;color:#17121f;border-color:#c6f432}.f,.t{color:#a69fb3}.x{color:#f2eef8}}
`;
  const open = () => {
    if (panel) { show(true); return; }
    panel = document.createElement('div');
    panel.setAttribute('data-piixpal-visit-ui', '');
    root = panel.attachShadow({ mode: 'open' });
    try { const sh = new CSSStyleSheet(); sh.replaceSync(CSS); root.adoptedStyleSheets = [sh]; } catch (e) { const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st); }
    const pals = (P() ? P().list().pals : []).filter(n => !n.startsWith('mk-') && !['fence', 'molehill', 'thread', 'pebble', 'can', 'cube', 'dice', 'ball'].includes(n)).sort();
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const p = el('div', 'p');
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Piixpal: pals on this page');
    const h = el('div', 'h');
    h.append(el('i'), el('b', '', 'piixpal'), el('span', 'sp'));
    const hide = el('button', 'x', '–'); hide.title = 'Hide this panel (pals stay)'; hide.setAttribute('aria-label', hide.title);
    const close = el('button', 'x', '×'); close.title = 'Clear everything and close'; close.setAttribute('aria-label', close.title);
    h.append(hide, close);
    const grid = el('div', 'g');
    for (const [k, v] of Object.entries(VIBES)) {
      const b = el('button', 'v'); b.type = 'button';
      b.append(el('span', '', v.icon), document.createTextNode(v.label));
      b.addEventListener('click', () => vibe(k));
      grid.append(b);
    }
    const t1 = el('div', 't', 'Add a pal');
    const r1 = el('div', 'r'), sel = el('select');
    sel.setAttribute('aria-label', 'Pick a pal');
    for (const n of pals) sel.add(new Option(n, n));
    sel.value = pals.includes('bitbug') ? 'bitbug' : pals[0];
    const go = el('button', 'b', 'Add'); go.type = 'button';
    go.addEventListener('click', () => add(sel.value));
    r1.append(sel, go);
    const t2 = el('div', 't', 'Your own pal');
    const r2 = el('div', 'r'), inp = el('input'); inp.type = 'text'; inp.placeholder = 'paste a Pal Maker link'; inp.setAttribute('aria-label', 'A Pal Maker link or code');
    const go2 = el('button', 'b', 'Add'); go2.type = 'button';
    const note = el('div', 'n');
    go2.addEventListener('click', () => { const r = refOf(inp.value); if (!r) { note.textContent = 'That doesn’t look like a pal link.'; return; } note.textContent = ''; addMade(r); inp.value = ''; });
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go2.click(); });
    r2.append(inp, go2);
    const r3 = el('div', 'r');
    const clr = el('button', 'b l', 'Clear page'); clr.type = 'button';
    clr.addEventListener('click', clear);
    const make = el('a', 'b l', 'Make a pal ↗'); make.href = SITE + '/components/make'; make.target = '_blank'; make.rel = 'noopener'; make.style.textDecoration = 'none'; make.style.textAlign = 'center'; make.style.flex = '1';
    r3.append(clr, make);
    const f = el('div', 'f');
    const credit = el('a', '', 'piixpal.dvkk.dev'); credit.href = SITE; credit.target = '_blank'; credit.rel = 'noopener';
    f.append(el('span', '', 'only you can see them'), credit);
    p.append(h, grid, t1, r1, t2, r2, note, r3, f);
    mini = el('button', 'm', 'P'); mini.type = 'button'; mini.title = 'Piixpal'; mini.setAttribute('aria-label', 'Open the Piixpal panel'); mini.hidden = true;
    mini.addEventListener('click', () => show(true));
    hide.addEventListener('click', () => show(false));
    close.addEventListener('click', () => { clear(); unpet(); panel.remove(); panel = null; });
    root.append(p, mini);
    /* drag the panel by its title */
    let d = null;
    h.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = p.getBoundingClientRect(); d = { x: e.clientX - r.left, y: e.clientY - r.top }; h.setPointerCapture(e.pointerId); });
    h.addEventListener('pointermove', e => { if (!d) return; p.style.left = Math.max(0, Math.min(innerWidth - 60, e.clientX - d.x)) + 'px'; p.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - d.y)) + 'px'; p.style.right = p.style.bottom = 'auto'; });
    h.addEventListener('pointerup', () => { d = null; });
    document.documentElement.appendChild(panel);
    open.p = p;
  };
  const show = on => { if (!panel) return; open.p.hidden = !on; mini.hidden = on; };
  const toggle = () => { if (!panel) open(); else show(open.p.hidden); };

  window.PiixVisit = { open, toggle, vibe, add, addMade, clear, pet, unpet, bulb, refOf, VIBES };
})();
