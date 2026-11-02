/* Gitpal: a live editor for every README component, and a tray that builds the whole README. */
(() => {
  const HOST = /(^|\.)localhost$|^127\./.test(location.hostname) ? location.origin : 'https://piixpal.dvkk.dev';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* every component: what it is, and the options worth exposing */
  const LIB = [
    { id: 'signature', name: 'Signature', tag: 'elegant', blurb: 'Your name, traced in ink and filled, with a flourish underneath. Then it writes itself again.', fields: [['name', 'Name', 'name'], ['accent', 'Ink', 'color', ''], ['size', 'Size', 'range', 96, 40, 150]] },
    { id: 'aurora', name: 'Aurora', tag: 'header', blurb: 'A banner for the top of your profile: your name in a serif, northern lights drifting behind it, a shine sweeping across.', fields: [['name', 'Name', 'name'], ['sub', 'Line under it', 'text', 'builder of things'], ['accent', 'Colour', 'color', '7c5cff']] },
    { id: 'constellation', name: 'Constellation', tag: 'live data', blurb: 'Your real last year on GitHub as a night sky. Every day you contributed is a star, busier days burn brighter, streaks join into constellations.', fields: [['user', 'Username', 'user'], ['accent', 'Starlight', 'color', 'ffd479']] },
    { id: 'clock', name: 'Clock', tag: 'live', blurb: 'What time it is where you are, right now: the sky colour, the sun or moon in its place, and a guess at what you are up to.', fields: [['tz', 'Timezone', 'tz'], ['name', 'Name', 'name']] },
    { id: 'terminal', name: 'Terminal', tag: 'animated', blurb: 'A window that types commands and prints their answers, line by line, then starts over. Write your own: command>answer, separated by |.', fields: [['lines', 'Lines', 'text', 'whoami>a developer who ships|cat stack.txt>typescript  rust  postgres|echo $status>building something weird'], ['user', 'Title', 'user'], ['accent', 'Prompt', 'color', '3fb950']] },
    { id: 'type', name: 'Typewriter', tag: 'animated', blurb: 'A sentence whose last words keep changing, typed and deleted.', fields: [['prefix', 'Starts with', 'text', 'I build'], ['words', 'Then (| between)', 'text', 'web apps|weird games|open source|tiny tools'], ['font', 'Font', 'select', 'grotesk', ['grotesk', 'serif', 'mono', 'display', 'pixel']], ['accent', 'Colour', 'color', '58a6ff']] },
    { id: 'orbit', name: 'Orbit', tag: 'animated', blurb: 'Your stack, circling a glowing core in a tilted ring, front ones big and bright, the far side small and dim.', fields: [['items', 'Stack (| between)', 'text', 'TypeScript|Rust|React|Go|Postgres|Docker|Figma|Python'], ['name', 'In the middle', 'initials'], ['accent', 'Glow', 'color', 'a371f7']] },
    { id: 'glitch', name: 'Glitch', tag: 'loud', blurb: 'Your name in heavy type that slips out of register in sudden bursts, colours split apart.', fields: [['name', 'Name', 'name'], ['accent', 'Colour one', 'color', '00f0ff'], ['accent2', 'Colour two', 'color', 'ff2a6d']] },
    { id: 'wave', name: 'Wave counter', tag: 'interactive', blurb: 'Visitors click to wave at you. Each wave is counted, and they land right back on your profile. The only button that works in a README.', fields: [['user', 'Username', 'user'], ['accent', 'Hand', 'color', 'ffb000']], link: q => `${HOST}/gp/wave?user=${encodeURIComponent(q.user || 'octocat')}&hit=1` },
    { id: 'divider', name: 'Divider', tag: 'small', blurb: 'A line between sections, but alive: a drifting wave, a heartbeat, or a ripple of dots.', fields: [['style', 'Style', 'select', 'wave', ['wave', 'pulse', 'dots']], ['accent', 'Colour', 'color', '58a6ff']] }
  ];
  const me = { user: '', name: '', theme: 'dark' };
  try { Object.assign(me, JSON.parse(localStorage.getItem('gitpal-me') || '{}')); } catch (e) { /* first visit */ }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const state = {};   /* per component: its own option values */
  const tray = [];    /* what's in the README so far: [id, query] */

  /* the query for a component, with the shared username and name filled in */
  const query = c => {
    const q = {}, s = state[c.id];
    for (const [k, , type, def] of c.fields) {
      let v = s[k];
      if (v === '' || v == null) v = type === 'user' ? me.user : type === 'name' ? me.name : type === 'initials' ? (me.name || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 3).toUpperCase() : type === 'tz' ? tz : def;
      if (v !== '' && v != null && String(v) !== String(def ?? '')) q[k] = v;
      else if (['user', 'name', 'tz', 'initials'].includes(type) && v) q[k] = v;
    }
    return q;
  };
  const url = (c, q, theme) => `${HOST}/gp/${c.id}?` + new URLSearchParams({ ...q, ...(theme && theme !== 'dark' ? { theme } : {}) }).toString().replace(/%7C/g, '|').replace(/%2C/g, ',');
  const markdown = (c, q) => {
    const alt = c.name;
    /* light and dark versions, picked by GitHub's own theme */
    const img = `<picture>\n  <source media="(prefers-color-scheme: light)" srcset="${esc(url(c, q, 'light'))}">\n  <img alt="${alt}" src="${esc(url(c, q, 'dark'))}">\n</picture>`;
    const simple = c.id === 'aurora' || c.id === 'clock';
    const one = simple ? `![${alt}](${url(c, q)})` : img;
    return c.link ? `<a href="${esc(c.link(q))}">${simple ? `<img alt="${alt}" src="${esc(url(c, q))}">` : img}</a>` : one;
  };

  /* ---------- cards ---------- */
  const list = $('#list');
  const field = (c, [k, label, type, def, a, b]) => {
    const id = `f-${c.id}-${k}`, s = state[c.id];
    if (type === 'select') return `<label for="${id}"><span>${label}</span><select id="${id}" data-k="${k}">${a.map(o => `<option${o === (s[k] || def) ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (type === 'color') return `<label for="${id}"><span>${label}</span><span class="gp-col"><input type="color" id="${id}" data-k="${k}" value="#${s[k] || def || 'e6edf3'}"></span></label>`;
    if (type === 'range') return `<label for="${id}"><span>${label}</span><input type="range" id="${id}" data-k="${k}" min="${a}" max="${b}" value="${s[k] || def}"></label>`;
    const ph = type === 'user' ? (me.user || 'octocat') : type === 'name' ? (me.name || 'Your Name') : type === 'tz' ? tz : type === 'initials' ? 'AL' : def;
    return `<label for="${id}" class="${type === 'text' && String(def).length > 30 ? 'wide' : ''}"><span>${label}</span><input id="${id}" data-k="${k}" value="${esc(s[k] || '')}" placeholder="${esc(ph)}" spellcheck="false"></label>`;
  };
  const render = () => {
    list.innerHTML = LIB.map(c => `
      <article class="gp-card" id="${c.id}" data-id="${c.id}">
        <header><h2>${c.name}</h2><span class="gp-tag">${c.tag}</span></header>
        <p>${c.blurb}</p>
        <div class="gp-stage ${me.theme}"><img alt="${c.name} preview" loading="lazy"></div>
        <div class="gp-fields">${c.fields.map(f => field(c, f)).join('')}</div>
        <div class="gp-code"><pre></pre><div class="gp-acts"><button type="button" class="btn btn-sm" data-act="copy">Copy</button><button type="button" class="btn btn-sm btn-ink" data-act="add">+ Add to README</button></div></div>
      </article>`).join('');
    LIB.forEach(update);
  };
  const timers = {};
  const update = c => {
    const card = document.getElementById(c.id), q = query(c);
    card.querySelector('pre').textContent = markdown(c, q);
    clearTimeout(timers[c.id]);
    timers[c.id] = setTimeout(() => { card.querySelector('img').src = url(c, q, me.theme); }, 250);
  };
  LIB.forEach(c => { state[c.id] = {}; });
  list.addEventListener('input', e => {
    const el = e.target, card = el.closest('.gp-card'); if (!card || !el.dataset.k) return;
    const c = LIB.find(x => x.id === card.dataset.id);
    state[c.id][el.dataset.k] = el.type === 'color' ? el.value.slice(1) : el.value;
    update(c);
  });
  const flash = (b, t) => { const was = b.textContent; b.textContent = t; b.classList.add('ok'); setTimeout(() => { b.textContent = was; b.classList.remove('ok'); }, 1300); };
  const copy = async (text, b) => { try { await navigator.clipboard.writeText(text); flash(b, 'Copied ✓'); } catch (e) { flash(b, 'Select it'); } };
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const c = LIB.find(x => x.id === b.closest('.gp-card').dataset.id), q = query(c);
    if (b.dataset.act === 'copy') copy(markdown(c, q), b);
    else { tray.push([c, q]); syncTray(); flash(b, 'Added ✓'); }
  });

  /* ---------- you ---------- */
  const form = $('#me');
  form.user.value = me.user; form.name.value = me.name;
  const save = () => { try { localStorage.setItem('gitpal-me', JSON.stringify(me)); } catch (e) { /* private mode */ } };
  let meT = 0;
  form.addEventListener('input', () => {
    me.user = form.user.value.replace(/[^a-zA-Z0-9-]/g, ''); me.name = form.name.value; save();
    clearTimeout(meT); meT = setTimeout(render, 350);
  });
  form.querySelectorAll('[data-th]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.th === me.theme));
    b.addEventListener('click', () => { me.theme = b.dataset.th; save(); form.querySelectorAll('[data-th]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); });
  });

  /* ---------- the README tray ---------- */
  const syncTray = () => {
    $('#tray').hidden = !tray.length;
    $('#tray-n').textContent = tray.length + (tray.length === 1 ? ' block' : ' blocks');
    $('#tray-list').innerHTML = tray.map(([c], i) => `<li><span>${c.name}</span><span class="gp-mv"><button type="button" data-up="${i}" aria-label="Move up"${i ? '' : ' disabled'}>↑</button><button type="button" data-rm="${i}" aria-label="Remove">✕</button></span></li>`).join('');
  };
  $('#tray-list').addEventListener('click', e => {
    const up = e.target.closest('[data-up]'), rm = e.target.closest('[data-rm]');
    if (up) { const i = +up.dataset.up; [tray[i - 1], tray[i]] = [tray[i], tray[i - 1]]; }
    if (rm) tray.splice(+rm.dataset.rm, 1);
    syncTray();
  });
  const full = () => tray.map(([c, q]) => `<p align="center">\n${markdown(c, q)}\n</p>`).join('\n\n') + '\n\n<sub>made with <a href="https://piixpal.dvkk.dev/gitpal/">gitpal</a></sub>\n';
  $('#tray-copy').addEventListener('click', e => copy(full(), e.currentTarget));
  $('#tray-preview').addEventListener('click', () => {
    $('#readme').className = 'gp-readme ' + me.theme;
    $('#readme').innerHTML = tray.map(([c, q]) => `<p><img alt="${c.name}" src="${esc(url(c, q, me.theme))}"></p>`).join('');
    $('#modal').hidden = false;
  });
  $('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]')) $('#modal').hidden = true; });
  addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal').hidden = true; });

  render();
})();
