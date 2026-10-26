/* The toolbar popup: pick your pet, turn it off everywhere or just here, use a pal you made,
 * or open the party panel on the current page. Settings live in storage.sync; every open tab's
 * bridge.js follows them live. */
(() => {
  const api = globalThis.browser || globalThis.chrome;
  const $ = id => document.getElementById(id);
  const DEFAULTS = { on: true, pal: 'bitbug', code: '', off: [], bulb: true };
  /* pets that make good company on any page (they all have their own small file in lib/c) */
  const PETS = ['bitbug', 'pip', 'boing', 'moss', 'kitty', 'penguin', 'gecko', 'tri', 'bumble', 'shibe', 'capy', 'frog', 'duckling', 'shel', 'roomba', 'hiss'];
  let s = { ...DEFAULTS }, tab = null, host = '';

  const save = patch => { s = { ...s, ...patch }; api.storage.sync.set(patch); paint(); };

  /* a little live preview of each pet, drawn from the library's own frames */
  const K = window.Piixpal && Piixpal._k;
  const previews = [];
  const grid = $('pets');
  for (const name of PETS) {
    const spec = K && K.SPRITES[name];
    if (!spec) continue;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pet'; b.dataset.pal = name;
    const c = document.createElement('canvas'); c.width = 48; c.height = 40;
    b.append(c, document.createTextNode(name));
    b.addEventListener('click', () => save({ pal: name, code: '' }));
    grid.appendChild(b);
    const frames = K.baked(spec), clip = frames.walk ? 'walk' : frames.idle ? 'idle' : Object.keys(frames)[0];
    previews.push({ c, list: frames[clip], i: 0 });
  }
  const draw = () => {
    for (const p of previews) {
      const f = p.list[p.i++ % p.list.length], g = p.c.getContext('2d');
      const k = Math.max(1, Math.floor(Math.min(48 / f.width, 40 / f.height)));
      g.clearRect(0, 0, 48, 40); g.imageSmoothingEnabled = false;
      g.drawImage(f, (48 - f.width * k) / 2, 40 - f.height * k, f.width * k, f.height * k);
    }
  };
  setInterval(draw, 160); draw();

  const paint = () => {
    $('on').checked = s.on;
    document.body.classList.toggle('off', !s.on);
    $('sub').textContent = s.on ? 'Your pet lives on every site you visit.' : 'Your pet is off. The party panel still works.';
    grid.querySelectorAll('.pet').forEach(b => b.setAttribute('aria-pressed', !s.code && b.dataset.pal === s.pal));
    $('made').textContent = s.code ? 'Your own pal is your pet. Pick one above to switch back.' : '';
    $('here').checked = !(s.off || []).includes(host);
    $('here').disabled = !host;
    $('bulb').checked = s.bulb;
  };
  /* the light switch on this tab: lights.js flips it and says which way it went */
  const lamp = flipped => { $('flip').textContent = flipped ? 'Lights back on here' : 'Flip the lights on this site'; $('flip').classList.toggle('lit', !!flipped); };
  $('flip').addEventListener('click', async () => {
    const r = tab && await api.tabs.sendMessage(tab.id, { type: 'flip' }).catch(() => null);
    if (r) lamp(r.flipped); else $('flip').textContent = 'This page can’t be flipped (try a normal website)';
  });
  $('bulb').addEventListener('change', e => save({ bulb: e.target.checked }));

  $('on').addEventListener('change', e => save({ on: e.target.checked }));
  $('here').addEventListener('change', e => {
    const off = new Set(s.off || []);
    if (e.target.checked) off.delete(host); else off.add(host);
    save({ off: [...off] });
  });
  /* a share link, a maker link or a bare code all work */
  const refOf = v => { v = String(v || '').trim(); const m = /\/p\/([\w-]+)/.exec(v) || /make[^#]*#([\w-]+)/.exec(v) || /make="([\w-]+)"/.exec(v); return m ? m[1] : /^[\w-]{5,}$/.test(v) ? v : ''; };
  $('use').addEventListener('click', () => {
    const r = refOf($('code').value);
    if (!r) { $('made').textContent = 'That doesn’t look like a Pal Maker link.'; return; }
    save({ code: r }); $('code').value = '';
  });
  $('panel').addEventListener('click', async () => {
    if (!tab) return;
    const r = await api.runtime.sendMessage({ type: 'panel', tabId: tab.id }).catch(() => null);
    if (r && r.ok) window.close();
    else $('panel').textContent = 'This page doesn’t allow pals (try a normal website)';
  });

  (async () => {
    s = { ...DEFAULTS, ...(await api.storage.sync.get(DEFAULTS)) };
    [tab] = await api.tabs.query({ active: true, currentWindow: true });
    try { const u = new URL(tab.url); if (/^https?:$/.test(u.protocol)) host = u.hostname; } catch (e) { host = ''; }
    $('host').textContent = host || 'this page';
    paint();
    if (tab) api.tabs.sendMessage(tab.id, { type: 'flipped' }).then(r => r && lamp(r.flipped), () => { $('flip').disabled = true; });
  })();
})();
