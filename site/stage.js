/* Piixpal Stage: puppeteer pals, give them lines, play the scene anywhere.
 * The scene is plain data (see src/powers/play.js); this file edits it. Every frame on the
 * stage is drawn by the same renderer that plays it on websites and in exported video. */
(() => {
'use strict';
const P = window.Piixpal, ST = P.stage, K = P._k;
const $ = s => document.querySelector(s);
const h = (tag, props, ...kids) => {
  const el = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000, r4 = v => Math.round(v * 10000) / 10000;
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0'); };

const STORE = 'piix-stage-v1';
const LANE = ['#c6f432', '#58c8ff', '#ff7aa8', '#ffd23f', '#a58bff', '#3fe0b0', '#ff8a5c', '#f2eef8'];
const EMOTES = ['heart', 'star', 'note', '!', '?', '!?', '...', 'zz', 'sweat', 'vein', 'grr', 'hi', 'eep', 'check', 'x'];
const SLOTS = ['heart', 'star', 'note', '!', '?', 'zz', 'sweat', 'vein', 'hi'];
const HIDDEN = new Set(['fence', 'molehill', 'ants', 'fireflies', 'router', 'buff', 'sprout', 'meh', 'gulp', 'lurk', 'mole', 'bulb', 'choir']);
const ASPECTS = [['16:9', 16 / 9], ['4:3', 4 / 3], ['1:1', 1], ['9:16', 9 / 16], ['3:1', 3]];
const FX_DUR = { shake: .5, flash: .4, confetti: 2.6 };

/* ---------- state ---------- */
const S = { scene: null, comp: null, t: 0, playing: false, sel: null, cue: null, rec: null, pps: 110, snap: true, loop: true, guides: true, hover: null };
const blank = () => ({ v: 1, title: 'Untitled scene', ar: 16 / 9, len: 6, bg: 'meadow', ground: .84, cast: [], k: {}, fx: [] });
const clean = sc => JSON.stringify(sc, (k, v) => k[0] === '_' ? undefined : v);
const castOf = id => S.scene.cast.find(c => c.id === id);
const trackOf = id => S.scene.k[id] || (S.scene.k[id] = { p: [], e: [] });
const actorOf = id => S.comp.actors.find(A => A.c.id === id);
const specOf = c => c.make ? (c._name || (c._name = (() => { try { return P.make(c.make); } catch (e) { return null; } })())) && P.sprites[c._name] : P.sprites[c.pal];
const nameOf = c => c.make ? 'custom pal' : c.pal;
const colorOf = id => LANE[Math.max(0, S.scene.cast.findIndex(c => c.id === id)) % LANE.length];
const rolesOf = c => { const sp = specOf(c); return sp && (sp.frames || sp.canvases) ? ST.roles(sp) : null; };
const flies = c => { const R = rolesOf(c); return !!R && ['fly', 'swim', 'burn'].includes(R.move); };
const uid = () => { for (let i = 0; ; i++) { const id = i < 26 ? String.fromCharCode(97 + i) : 'p' + i; if (!castOf(id)) return id; } };

/* ---------- history and saving ---------- */
const HIST = { past: [], future: [] };
const checkpoint = () => { HIST.past.push(clean(S.scene)); if (HIST.past.length > 150) HIST.past.shift(); HIST.future.length = 0; syncHistory(); };
const restore = json => { S.scene = JSON.parse(json); S.cue = null; if (S.sel && !castOf(S.sel)) S.sel = null; refresh(); };
const undo = () => { if (!HIST.past.length) return; HIST.future.push(clean(S.scene)); restore(HIST.past.pop()); syncHistory(); toast('Undone'); };
const redo = () => { if (!HIST.future.length) return; HIST.past.push(clean(S.scene)); restore(HIST.future.pop()); syncHistory(); };
const syncHistory = () => { $('#b-undo').disabled = !HIST.past.length; $('#b-redo').disabled = !HIST.future.length; };
let saveT = 0;
const save = () => {
  $('#saved').textContent = 'Saving…'; $('#saved').classList.add('dirty');
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(STORE, clean(S.scene)); $('#saved').textContent = 'Saved'; } catch (e) { $('#saved').textContent = 'Not saved'; }
    $('#saved').classList.remove('dirty');
  }, 450);
};
const change = fn => { checkpoint(); fn(S.scene); refresh(); };
const recompile = () => { S.comp = ST.compile(S.scene); need(); };
const refresh = () => {
  recompile();
  S.t = clamp(S.t, 0, S.scene.len);
  $('#title').value = S.scene.title || 'Untitled scene';
  $('#empty').hidden = S.scene.cast.length > 0 || !!S.rec;
  $('#frame').classList.toggle('clear', S.scene.bg === 'none');
  fit(); renderTimeline(); renderInspector(); markCast(); clock(); save();
};

/* ---------- toast ---------- */
let toastT = 0;
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); };

/* ---------- sprite thumbnails, gently animated ---------- */
const THUMBS = new Set();
const drawThumb = (cv, spec, clip, fi = 0) => {
  if (!spec) return;
  const all = K.baked(spec), roles = ST.roles(spec), frames = all[clip] || all[roles.idle];
  if (!frames || !frames.length) return;
  const img = frames[fi % frames.length], dpr = Math.min(2, devicePixelRatio || 1);
  const cw = cv.clientWidth || +cv.dataset.w, ch = cv.clientHeight || +cv.dataset.h;
  if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  const s = Math.max(1, Math.floor(Math.min(cv.width * .9 / spec.w, cv.height * .9 / spec.h)));
  g.imageSmoothingEnabled = !!spec.res && spec.res > 1;
  g.drawImage(img, Math.round((cv.width - spec.w * s) / 2), Math.round((cv.height - spec.h * s) / 2), spec.w * s, spec.h * s);
};
const thumb = (spec, w, h, clip, hue) => {
  const cv = h_cv(w, h);
  if (hue) cv.style.filter = `hue-rotate(${hue}deg)`;
  const entry = { cv, spec, clip: clip || (spec && ST.roles(spec).idle) };
  THUMBS.add(entry);
  requestAnimationFrame(() => drawThumb(cv, spec, entry.clip));
  return cv;
};
const h_cv = (w, h) => { const cv = document.createElement('canvas'); cv.dataset.w = w; cv.dataset.h = h; cv.style.width = w + 'px'; cv.style.height = h + 'px'; return cv; };
let thumbF = 0;
setInterval(() => {
  thumbF++;
  for (const e of THUMBS) {
    if (!e.cv.isConnected) { THUMBS.delete(e); continue; }
    const r = e.cv.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    drawThumb(e.cv, e.spec, e.clip, thumbF);
  }
}, 220);
const iconURL = (() => { const c = {}; return name => { if (!c[name] && K.ICONS[name]) { K.bakeIcon(name); c[name] = K.iconCache[name].toDataURL(); } return c[name]; }; })();

/* ---------- the stage ---------- */
const cv = $('#stage'), g = cv.getContext('2d');
let W = 640, H = 360, dpr = 1, dirty = true;
const need = () => { dirty = true; };
const fit = () => {
  const vp = $('#viewport').getBoundingClientRect(), ar = S.scene.ar;
  const aw = vp.width - 44, ah = vp.height - 44;
  let w = Math.min(aw, ah * ar), hh = w / ar;
  w = Math.max(160, Math.floor(w)); hh = Math.floor(w / ar);
  dpr = Math.min(2, devicePixelRatio || 1);
  if (w !== W || hh !== H || cv.width !== Math.round(w * dpr)) {
    W = w; H = hh;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  need();
};
new ResizeObserver(() => { if (S.scene) { fit(); renderTimeline(); } }).observe($('#viewport'));
const FONT = '"JetBrains Mono",ui-monospace,monospace';
const draw = () => {
  dirty = false;
  ST.draw(g, S.comp, S.t, { W, H, dpr, font: FONT, under: guides, over: overlay });
};
/* under the pals: the ground line and the selected pal's route */
const guides = (g) => {
  if (!S.guides || S.rec && S.rec.phase === 'live') return;
  const gy = Math.round(S.scene.ground * H) + .5;
  g.save();
  g.strokeStyle = 'rgba(198,244,50,.42)'; g.lineWidth = 1; g.setLineDash([6, 5]);
  g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke();
  g.setLineDash([]); g.fillStyle = 'rgba(198,244,50,.75)'; g.font = '9px Silkscreen,monospace'; g.fillText('GROUND', 8, gy - 6);
  const A = S.sel && actorOf(S.sel);
  if (A && A.p.length > 1) {
    const col = colorOf(S.sel), t0 = A.p[0][0], t1 = A.p[A.p.length - 1][0];
    g.strokeStyle = col; g.globalAlpha = .7; g.lineWidth = 2; g.setLineDash([2, 5]); g.lineCap = 'round';
    g.beginPath();
    for (let t = t0; t <= t1 + 1e-6; t += 1 / 30) { const [x, y] = ST.pos(A.p, t); t === t0 ? g.moveTo(x * W, y * H - 2) : g.lineTo(x * W, y * H - 2); }
    g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    /* a bead every half second, so speed shows as spacing */
    g.fillStyle = col;
    for (let t = Math.ceil(t0 * 2) / 2; t <= t1; t += .5) { const [x, y] = ST.pos(A.p, t); g.fillRect(Math.round(x * W) - 2, Math.round(y * H) - 4, 4, 4); }
    const [ex, ey] = ST.pos(A.p, t1);
    g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(Math.round(ex * W) - 5, Math.round(ey * H) - 7, 10, 10);
  }
  g.restore();
};
/* over the pals: selection brackets, names, a ghost for pals waiting to enter */
const overlay = (g, list) => {
  if (S.rec && S.rec.phase === 'live') return;
  const k = W / ST.W;
  const box = (st, col, thick, label) => {
    const w = st._w * st.sx * st.vis, hh = st._h * st.sy * st.vis, x = st._x - w / 2 - 5, y = st._y - hh - 5, bw = w + 10, bh = hh + 10, L = Math.min(10, bw / 3);
    g.save(); g.fillStyle = col;
    for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + bw, y, -1, 1], [x, y + bh, 1, -1], [x + bw, y + bh, -1, -1]]) {
      g.fillRect(dx > 0 ? cx : cx - L, dy > 0 ? cy : cy - thick, L, thick);
      g.fillRect(dx > 0 ? cx : cx - thick, dy > 0 ? cy : cy - L, thick, L);
    }
    if (label) {
      g.font = '9px Silkscreen,monospace'; const tw = g.measureText(label).width + 10;
      g.fillRect(Math.round(st._x - tw / 2), Math.round(y + bh + 4), Math.round(tw), 14);
      g.fillStyle = '#0b0a10'; g.fillText(label, Math.round(st._x - tw / 2 + 5), Math.round(y + bh + 14));
    }
    g.restore();
  };
  for (const st of list) {
    const id = st.A.c.id;
    if (id === S.sel) box(st, colorOf(id), 3, nameOf(st.A.c).toUpperCase());
    else if (id === S.hover) box(st, 'rgba(255,255,255,.55)', 2);
  }
  /* selected but not on stage right now (before its entrance, after its exit) */
  if (S.sel && !list.some(st => st.A.c.id === S.sel)) {
    const A = actorOf(S.sel), c = castOf(S.sel), sp = c && specOf(c);
    if (A && sp) {
      const [x, y] = ST.pos(A.p, S.t), px = Math.max(1, Math.round((c.s || 4) * k)), w = sp.w * px, hh = sp.h * px;
      g.save(); g.strokeStyle = colorOf(S.sel); g.setLineDash([4, 4]); g.lineWidth = 1.5;
      g.strokeRect(Math.round(x * W - w / 2) + .5, Math.round(y * H - hh) + .5, w, hh);
      g.setLineDash([]); g.fillStyle = colorOf(S.sel); g.font = '9px Silkscreen,monospace'; g.fillText('OFF STAGE', Math.round(x * W - w / 2), Math.round(y * H - hh - 6));
      g.restore();
    }
  }
};

/* ---------- the loop: playback, recording, redraw ---------- */
let lastTs = 0;
const frame = ts => {
  const dt = lastTs ? Math.min(.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  if (S.rec) recFrame(dt);
  else if (S.playing) {
    S.t += dt;
    if (S.t >= S.scene.len) { if (S.loop) S.t = 0; else { S.t = S.scene.len; pause(); } }
    need();
  }
  if (dirty) { draw(); playhead(); clock(); }
  requestAnimationFrame(frame);
};
const play = () => { if (S.rec) return; if (S.t >= S.scene.len - .01) S.t = 0; S.playing = true; syncPlay(); need(); };
const pause = () => { S.playing = false; syncPlay(); need(); };
const toggle = () => S.playing ? pause() : play();
const syncPlay = () => { const b = $('#b-play'); b.innerHTML = `<i class="ic ${S.playing ? 'ic-pause' : 'ic-play'}"></i>`; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); };
const seek = t => { S.t = clamp(t, 0, S.scene.len); need(); };
const clock = () => { $('#clock-t').textContent = fmt(S.t); $('#clock-len').textContent = fmt(S.scene.len); };

/* ---------- pointer on the stage ---------- */
const ptr = { x: 0, y: 0, down: false, id: -1 };
const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
let drag = null;
cv.addEventListener('pointermove', e => {
  const p = local(e); ptr.x = p.x; ptr.y = p.y;
  if (S.rec) return;
  if (drag) {
    let nx = p.x / W + drag.ox, ny = p.y / H + drag.oy;
    if (!drag.moved) { if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 3) return; drag.moved = true; checkpoint(); pause(); }
    /* a magnet on the ground line; hold Alt to place freely */
    if (!e.altKey && Math.abs(ny - S.scene.ground) * H < 10) ny = S.scene.ground;
    setKey(drag.id, S.t, clamp(nx, -.2, 1.2), clamp(ny, .02, 1.3));
    recompile();
    return;
  }
  const hit = ST.hit(S.comp, S.t, W, H, p.x, p.y);
  if (hit !== S.hover) { S.hover = hit; cv.style.cursor = hit ? 'grab' : S.sel ? 'crosshair' : 'default'; need(); }
});
cv.addEventListener('pointerdown', e => {
  if (e.button > 0) return;
  const p = local(e);
  cv.setPointerCapture(e.pointerId);
  if (S.rec) { recGrab(p); return; }
  const hit = ST.hit(S.comp, S.t, W, H, p.x, p.y);
  if (hit) {
    if (S.sel !== hit || S.cue) { S.sel = hit; S.cue = null; renderInspector(); renderTimeline(); }
    const [x, y] = ST.pos(actorOf(hit).p, S.t);
    drag = { id: hit, ox: x - p.x / W, oy: y - p.y / H, sx: p.x, sy: p.y, moved: false };
    cv.style.cursor = 'grabbing';
  } else if (S.sel || S.cue) { S.sel = null; S.cue = null; renderInspector(); renderTimeline(); need(); }
});
const endDrag = () => {
  if (S.rec) { S.rec.held = false; return; }
  if (drag && drag.moved) refresh();
  drag = null; cv.style.cursor = S.hover ? 'grab' : 'default';
};
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('pointerleave', () => { if (S.hover && !drag) { S.hover = null; need(); } });
/* double-click: the selected pal walks (or flies) there. Keep clicking to build a route. */
cv.addEventListener('dblclick', e => {
  if (S.rec || !S.sel) return;
  const p = local(e);
  if (ST.hit(S.comp, S.t, W, H, p.x, p.y)) return;
  walkTo(S.sel, p.x / W, p.y / H);
});
const setKey = (id, t, x, y) => {
  const tr = trackOf(id);
  if (tr.p.length <= 1) tr.p = [[0, r4(x), r4(y)]];
  else { tr.p = tr.p.filter(s => Math.abs(s[0] - t) > .02); tr.p.push([r2(t), r4(x), r4(y)]); tr.p.sort((a, b) => a[0] - b[0]); }
};
const walkTo = (id, x, y) => {
  const c = castOf(id), A = actorOf(id), fly = flies(c);
  if (!fly && Math.abs(y - S.scene.ground) < .07) y = S.scene.ground;
  const t = S.t, [x0, y0] = ST.pos(A.p, t);
  const dist = Math.hypot((x - x0) * ST.W, (y - y0) * ST.W / S.scene.ar), dur = Math.max(.3, dist / (fly ? 240 : 165)), t1 = r2(t + dur);
  change(sc => {
    const tr = trackOf(id);
    tr.p = tr.p.filter(s => s[0] < t - .001).concat([[r2(t), r4(x0), r4(y0)], [t1, r4(x), r4(y)]]);
    if (t1 > sc.len) sc.len = Math.min(120, Math.ceil(t1 + 1));
  });
  S.t = t1; need();
  tip('Double-click again to keep walking. The route is in the timeline.');
};

/* drop pals from the cast */
const frameEl = $('#frame');
frameEl.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/piix-pal')) { e.preventDefault(); frameEl.classList.add('drop'); } });
frameEl.addEventListener('dragleave', () => frameEl.classList.remove('drop'));
frameEl.addEventListener('drop', e => {
  frameEl.classList.remove('drop');
  const name = e.dataTransfer.getData('text/piix-pal');
  if (!name) return;
  e.preventDefault();
  const p = local(e);
  addPal({ pal: name }, p.x / W, p.y / H);
});

/* ---------- adding and removing pals ---------- */
const addPal = (c, x, y) => {
  const spec = specOf(c);
  if (!spec) { toast('That pal is still loading, try again in a second'); return; }
  const id = uid(), fly = ['fly', 'swim', 'burn'].includes(ST.roles(spec).move);
  if (x == null) {
    const n = S.scene.cast.length, spots = [.5, .24, .76, .37, .63, .12, .88];
    x = spots[n % spots.length]; y = fly ? .3 : S.scene.ground;
  } else if (!fly && Math.abs(y - S.scene.ground) < .1) y = S.scene.ground;
  change(sc => {
    sc.cast.push(Object.assign({ id, s: clamp(Math.round(58 / spec.h), 2, 6), face: x > .55 ? -1 : 1 }, c));
    sc.k[id] = { p: [[0, r4(x), r4(y)]], e: [] };
  });
  S.sel = id; S.cue = null; renderInspector(); renderTimeline(); need();
};
const removePal = id => change(sc => { sc.cast = sc.cast.filter(c => c.id !== id); delete sc.k[id]; if (S.sel === id) S.sel = null; S.cue = null; });

/* ---------- cues ---------- */
const sayDur = text => r2(clamp(1.1 + text.length * .055, 1.4, 6));
const addCue = (id, ev) => change(() => {
  const tr = trackOf(id);
  tr.e.push(ev); tr.e.sort((a, b) => a[0] - b[0]);
  S.cue = { id, ev };
  const end = ev[0] + (typeof ev[3] === 'number' ? ev[3] : .6);
  if (end > S.scene.len) S.scene.len = Math.min(120, Math.ceil(end + .5));
});
const addFx = type => change(sc => {
  const ev = [r2(S.t), type, FX_DUR[type]];
  sc.fx.push(ev); sc.fx.sort((a, b) => a[0] - b[0]);
  S.cue = { id: 'fx', ev };
});
const removeCue = cue => change(sc => {
  const list = cue.id === 'fx' ? sc.fx : trackOf(cue.id).e;
  const i = list.indexOf(cue.ev);
  if (i >= 0) list.splice(i, 1);
  S.cue = null;
});
const faceAt = id => { const A = actorOf(id); const i = A.faces.findLastIndex ? A.faces.findLastIndex(f => f[0] <= S.t) : -1; return i < 0 ? (A.c.face || 1) : A.faces[i][1]; };

/* ---------- recording takes ---------- */
const recStart = () => {
  if (S.rec) return recStop();
  if (!S.sel) { toast('Pick a pal to record first'); return; }
  pause();
  S.rec = { id: S.sel, phase: 'count', at: performance.now(), t0: S.t, held: false, n: 0 };
  $('#b-rec').classList.add('on'); $('.rec-l').textContent = 'Stop';
  $('#frame').classList.add('rec'); $('#playhead').classList.add('rec');
  $('#empty').hidden = true;
};
const recBegin = () => {
  const R = S.rec, c = castOf(R.id), A = actorOf(R.id);
  checkpoint();
  const [x, y] = ST.pos(A.p, R.t0);
  Object.assign(R, { phase: 'live', base: trackOf(R.id).p.filter(s => s[0] < R.t0 - .001), live: [[r3(R.t0), x, y]], x, y, vy: 0, fly: flies(c), last: R.t0 });
  hud();
};
const recGrab = p => {
  const R = S.rec;
  if (!R || R.phase !== 'live') return;
  R.held = true;
  /* grab the pal where you clicked it; click elsewhere and it comes to you */
  const k = W / ST.W, c = castOf(R.id), sp = specOf(c), px = Math.max(1, Math.round((c.s || 4) * k));
  const onIt = Math.abs(p.x - R.x * W) < sp.w * px / 2 + 6 && p.y < R.y * H + 6 && p.y > R.y * H - sp.h * px - 6;
  R.ox = onIt ? R.x - p.x / W : 0; R.oy = onIt ? R.y - p.y / H : 0;
};
const recFrame = dt => {
  const R = S.rec;
  if (R.phase === 'count') {
    const n = 3 - Math.floor((performance.now() - R.at) / 600);
    if (n !== R.n) { R.n = n; hud(); }
    if (n <= 0) recBegin();
    return;
  }
  S.t += dt;
  if (S.t > S.scene.len) { if (S.scene.len < 60) S.scene.len = r2(S.t); else { recStop(); return; } }
  if (R.held) {
    const tx = ptr.x / W + R.ox, ty = ptr.y / H + R.oy, k = Math.min(1, dt * 16);
    R.x += (clamp(tx, -.2, 1.2) - R.x) * k; R.y += (clamp(ty, .02, 1.3) - R.y) * k; R.vy = 0;
  } else if (!R.fly && R.y < S.scene.ground - .002) {
    /* let go of a walker in mid-air and it drops back to the ground */
    R.vy += 4.2 * dt; R.y = Math.min(S.scene.ground, R.y + R.vy * dt);
  }
  if (S.t - R.last >= 1 / 40) { R.live.push([r3(S.t), R.x, R.y]); R.last = S.t; }
  trackOf(R.id).p = R.base.concat(R.live, [[S.t + 1e-3, R.x, R.y]]);
  recompile();
  hud();
};
const recKey = e => {
  const R = S.rec;
  if (!R || R.phase !== 'live') return false;
  const tr = trackOf(R.id), t = r2(S.t), k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') tr.e.push([t, 'jump', 1]);
  else if (k === 'f') { recompile(); tr.e.push([t, 'face', -faceAt(R.id)]); }
  else if (/^[1-9]$/.test(k)) tr.e.push([t, 'emote', SLOTS[+k - 1], 1.2]);
  else return false;
  tr.e.sort((a, b) => a[0] - b[0]);
  R.flash = { key: k, at: performance.now() };
  return true;
};
const recStop = () => {
  const R = S.rec;
  if (!R) return;
  S.rec = null;
  $('#b-rec').classList.remove('on'); $('.rec-l').textContent = 'Record';
  $('#frame').classList.remove('rec'); $('#playhead').classList.remove('rec');
  if (R.phase === 'live') {
    R.live.push([r3(S.t), R.x, R.y]);
    trackOf(R.id).p = R.base.concat(simplify(R.live));
    toast(`Take recorded: ${(S.t - R.t0).toFixed(1)}s`);
  }
  hud(); refresh();
};
/* keep the shape and the timing of a take with far fewer points */
const simplify = pts => {
  if (pts.length < 3) return pts.map(p => [r3(p[0]), r4(p[1]), r4(p[2])]);
  const keep = new Uint8Array(pts.length), ar = S.scene.ar, stack = [[0, pts.length - 1]];
  keep[0] = keep[pts.length - 1] = 1;
  while (stack.length) {
    const [a, b] = stack.pop(), A = pts[a], B = pts[b], span = (B[0] - A[0]) || 1e-6;
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const u = (pts[i][0] - A[0]) / span, x = A[1] + (B[1] - A[1]) * u, y = A[2] + (B[2] - A[2]) * u;
      const d = Math.hypot(pts[i][1] - x, (pts[i][2] - y) / ar);
      if (d > md) { md = d; mi = i; }
    }
    if (md > .0015) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]).map(p => [r3(p[0]), r4(p[1]), r4(p[2])]);
};
/* the heads-up layer over the stage */
let tipT = 0;
const tip = msg => { const old = $('#hud .tip'); if (old) old.remove(); const el = h('div', { class: 'tip' }, msg); $('#hud').append(el); clearTimeout(tipT); tipT = setTimeout(() => el.remove(), 2600); };
const hud = () => {
  const el = $('#hud'), R = S.rec;
  el.querySelectorAll('.count,.recbadge,.keys').forEach(n => n.remove());
  if (!R) return;
  if (R.phase === 'count') { el.append(h('div', { class: 'count' }, String(Math.max(1, R.n)))); return; }
  el.append(h('div', { class: 'recbadge' }, h('i'), 'REC ' + fmt(S.t)));
  const k = (key, label) => h('span', {}, h('kbd', {}, key), label);
  el.append(h('div', { class: 'keys' }, k('drag', ' move'), k('W', ' jump'), k('F', ' turn'), k('1–9', ' emote'), k('R', ' stop')));
};

/* ---------- timeline ---------- */
const lanesEl = $('#lanes'), gutter = $('#tl-gutter'), ruler = $('#ruler'), inner = $('#tl-inner'), scroller = $('#tl-scroll');
const motionSpans = A => {
  const spans = [], ar = S.scene.ar;
  let s = null;
  for (let t = 0; t <= S.scene.len; t += .05) {
    const a = ST.pos(A.p, t - .05), b = ST.pos(A.p, t + .05);
    const v = Math.hypot((b[0] - a[0]) * ST.W, (b[1] - a[1]) * ST.W / ar) * 10;
    if (v > 26) { if (!s) s = [t]; } else if (s) { s.push(t); spans.push(s); s = null; }
  }
  if (s) { s.push(S.scene.len); spans.push(s); }
  return spans;
};
const chipFor = (owner, ev) => {
  const type = ev[1], di = owner === 'fx' ? 2 : 3, pps = S.pps;
  const timed = owner === 'fx' || ['say', 'emote', 'act'].includes(type);
  const sel = S.cue && S.cue.ev === ev;
  const el = h('div', { class: `chip ${owner === 'fx' ? 'fx' : type}${timed ? '' : ' inst'}${sel ? ' sel' : ''}`, title: cueTitle(ev, owner) });
  if (timed) {
    el.style.left = ev[0] * pps + 'px';
    el.style.width = Math.max(24, (ev[di] || 1) * pps) + 'px';
    if (type === 'emote') el.append(h('img', { src: iconURL(ev[2]), alt: '' }));
    el.append(owner === 'fx' ? type : type === 'say' ? '“' + ev[2] + '”' : type === 'emote' ? ev[2] : ev[2]);
    el.append(h('i', { class: 'rz' }));
  } else {
    el.style.left = ev[0] * pps - 11 + 'px';
    el.textContent = { jump: '↑', face: '⇄', show: 'IN', hide: 'OUT' }[type] || '•';
  }
  el.addEventListener('pointerdown', e => chipDrag(e, el, owner, ev, di, timed));
  return el;
};
/* cues that overlap in time share the lane in two rows instead of covering each other */
const placeChips = (lane, owner, list) => {
  const di = owner === 'fx' ? 2 : 3, pps = S.pps, ends = [];
  const span = ev => { const timed = owner === 'fx' || ['say', 'emote', 'act'].includes(ev[1]); return timed ? [ev[0], ev[0] + Math.max(24 / pps, ev[di] || 1)] : [ev[0] - 11 / pps, ev[0] + 11 / pps]; };
  const rows = list.map(ev => {
    const [a, b] = span(ev);
    let r = ends.findIndex(e => e <= a + 1e-6);
    if (r < 0) r = ends.length < 2 ? ends.length : ends.indexOf(Math.min(...ends));
    ends[r] = b;
    return r;
  });
  const two = ends.length > 1;
  list.forEach((ev, i) => { const el = chipFor(owner, ev); if (two) el.classList.add(rows[i] ? 'r2' : 'r1'); lane.append(el); });
};
const cueTitle = (ev, owner) => owner === 'fx' ? `${ev[1]} at ${ev[0]}s` : ({ say: 'Line', emote: 'Emote', act: 'Act', jump: 'Jump', face: 'Turn around', show: 'Enter', hide: 'Exit' }[ev[1]] || ev[1]) + ` at ${ev[0]}s`;
const chipDrag = (e, el, owner, ev, di, timed) => {
  if (e.button > 0) return;
  e.stopPropagation();
  el.setPointerCapture(e.pointerId);
  pause();
  const resize = e.target.classList.contains('rz'), sx = e.clientX, t0 = ev[0], d0 = ev[di] || 1;
  let moved = false;
  if (!(S.cue && S.cue.ev === ev)) { S.cue = { id: owner, ev }; if (owner !== 'fx') S.sel = owner; renderInspector(); lanesEl.querySelectorAll('.chip.sel').forEach(c => c.classList.remove('sel')); el.classList.add('sel'); }
  const snapT = v => S.snap ? Math.round(v * 20) / 20 : r2(v);
  const mv = m => {
    const dx = m.clientX - sx;
    if (!moved) { if (Math.abs(dx) < 3) return; moved = true; checkpoint(); }
    if (resize) { ev[di] = Math.max(.2, snapT(d0 + dx / S.pps)); el.style.width = Math.max(24, ev[di] * S.pps) + 'px'; }
    else { ev[0] = clamp(snapT(t0 + dx / S.pps), 0, S.scene.len); el.style.left = (timed ? ev[0] * S.pps : ev[0] * S.pps - 11) + 'px'; seek(ev[0]); }
    recompile();
  };
  const up = () => {
    el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
    if (moved) { (owner === 'fx' ? S.scene.fx : trackOf(owner).e).sort((a, b) => a[0] - b[0]); refresh(); }
    else { seek(ev[0] + .01); renderInspector(); renderTimeline(); }
  };
  el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
};
const renderTimeline = () => {
  if (!S.comp) return;
  const len = S.scene.len, avail = scroller.clientWidth || 800;
  const pps = S.pps;
  inner.style.width = Math.max(avail, len * pps + 140) + 'px';
  /* ruler */
  ruler.replaceChildren();
  const minor = pps >= 220 ? .1 : pps >= 90 ? .25 : pps >= 45 ? .5 : 1, major = pps >= 45 ? 1 : 2;
  for (let t = 0; t <= len + 1e-6; t = r2(t + minor)) {
    const m = Math.abs(t / major - Math.round(t / major)) < 1e-6 && len - t > .3 * major;
    ruler.append(h('div', { class: 'tk' + (m ? ' m' : ''), style: { left: t * pps + 'px' } }, m ? h('span', {}, t + 's') : null));
  }
  /* lanes */
  gutter.replaceChildren(h('div', { class: 'g-ruler' }));
  lanesEl.replaceChildren();
  gutter.append(h('div', { class: 'lane-h fx' }, h('b', {}, 'Scene effects')));
  const fxLane = h('div', { class: 'lane fx' });
  placeChips(fxLane, 'fx', S.scene.fx);
  lanesEl.append(fxLane);
  for (const c of S.scene.cast) {
    const col = colorOf(c.id), sel = c.id === S.sel, A = actorOf(c.id);
    const head = h('div', { class: 'lane-h' + (sel ? ' sel' : ''), style: { '--c': col }, onclick: () => { S.sel = c.id; S.cue = null; renderInspector(); renderTimeline(); need(); } },
      thumb(specOf(c), 28, 28, null, c.hue), h('b', {}, nameOf(c)),
      h('button', { class: 'rl', type: 'button', title: 'Record this pal (R)', 'aria-label': 'Record ' + nameOf(c), onclick: e => { e.stopPropagation(); S.sel = c.id; renderInspector(); renderTimeline(); recStart(); } }));
    head.style.setProperty('--c', col);
    gutter.append(head);
    const lane = h('div', { class: 'lane' + (sel ? ' sel' : '') });
    lane.style.setProperty('--c', col);
    lane.dataset.id = c.id;
    if (A) for (const [a, b] of motionSpans(A)) { const m = h('div', { class: 'motion' }); m.style.setProperty('--c', col); m.style.left = a * pps + 'px'; m.style.width = Math.max(4, (b - a) * pps) + 'px'; lane.append(m); }
    placeChips(lane, c.id, (S.scene.k[c.id] || { e: [] }).e);
    lane.append(h('div', { class: 'past', style: { left: len * pps + 'px' } }));
    lanesEl.append(lane);
  }
  fxLane.append(h('div', { class: 'past', style: { left: len * pps + 'px' } }));
  $('#end-handle').style.left = len * pps + 'px';
  playhead();
};
const playhead = () => { $('#playhead').style.left = S.t * S.pps + 'px'; };
/* scrub on the ruler or an empty spot in a lane */
const scrub = e => {
  if (e.button > 0 || e.target.closest('.chip')) return;
  const lane = e.target.closest('.lane');
  if (lane && lane.dataset.id && S.sel !== lane.dataset.id) { S.sel = lane.dataset.id; S.cue = null; renderInspector(); renderTimeline(); }
  pause();
  const r = inner.getBoundingClientRect();
  const at = ev => seek((ev.clientX - r.left) / S.pps);
  at(e);
  const mv = ev => at(ev), up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
};
ruler.addEventListener('pointerdown', scrub);
lanesEl.addEventListener('pointerdown', scrub);
$('#end-handle').addEventListener('pointerdown', e => {
  e.stopPropagation();
  const r = inner.getBoundingClientRect();
  let moved = false;
  const mv = ev => {
    if (!moved) { moved = true; checkpoint(); }
    S.scene.len = clamp(Math.round((ev.clientX - r.left) / S.pps * 10) / 10, .5, 120);
    $('#end-handle').style.left = S.scene.len * S.pps + 'px'; clock(); recompile();
  };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (moved) refresh(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
$('#zoom').addEventListener('input', e => { S.pps = +e.target.value; setFill(e.target); renderTimeline(); });
scroller.addEventListener('wheel', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  S.pps = clamp(S.pps * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 30, 400);
  $('#zoom').value = S.pps; setFill($('#zoom')); renderTimeline();
}, { passive: false });
document.querySelectorAll('[data-fx]').forEach(b => b.addEventListener('click', () => addFx(b.dataset.fx)));
const setFill = el => el.style.setProperty('--v', ((el.value - el.min) / (el.max - el.min) * 100) + '%');

/* ---------- inspector ---------- */
const insp = $('#insp');
const sec = (title, ...kids) => h('section', { class: 'sec' }, title ? h('h2', {}, title) : null, ...kids);
const slider = (label, min, max, step, val, fmtV, on) => {
  const out = h('output', {}, fmtV(val));
  const input = h('input', { type: 'range', min, max, step, value: val, 'aria-label': label });
  let first = true;
  input.addEventListener('pointerdown', () => { first = true; });
  input.addEventListener('input', () => { if (first) { checkpoint(); first = false; } on(+input.value); out.textContent = fmtV(+input.value); setFill(input); recompile(); save(); });
  input.addEventListener('change', () => { first = true; renderTimeline(); });
  requestAnimationFrame(() => setFill(input));
  return h('label', { class: 'field' }, h('span', {}, label), input, out);
};
const seg = (opts, cur, on, label) => h('div', { class: 'seg', role: 'group', 'aria-label': label },
  opts.map(([lbl, v]) => h('button', { type: 'button', 'aria-pressed': String(Math.abs(v - cur) < 1e-3 || v === cur), onclick: () => on(v) }, lbl)));
const renderInspector = () => {
  insp.replaceChildren();
  if (S.cue) insp.append(cueEditor());
  const c = S.sel && castOf(S.sel);
  if (c) insp.append(...palPanel(c)); else insp.append(...scenePanel());
};
const cueEditor = () => {
  const { id, ev } = S.cue, fx = id === 'fx', di = fx ? 2 : 3, type = ev[1];
  const timed = fx || ['say', 'emote', 'act'].includes(type);
  const box = h('div', { class: 'cue' });
  const num = (label, val, on) => {
    const input = h('input', { type: 'number', step: '.05', min: 0, value: val });
    input.addEventListener('change', () => change(() => { on(Math.max(0, r2(+input.value || 0))); (fx ? S.scene.fx : trackOf(id).e).sort((a, b) => a[0] - b[0]); }));
    return h('div', { class: 'cue-row' }, h('span', {}, label), h('span', { class: 'num' }, input, h('small', {}, 's')));
  };
  box.append(h('h2', {}, (fx ? type + ' effect' : cueTitle(ev).replace(/ at .*/, '')) + (fx ? '' : ' · ' + nameOf(castOf(id))),
    h('button', { class: 'tb icon ghost danger', type: 'button', title: 'Delete (Del)', 'aria-label': 'Delete cue', onclick: () => removeCue(S.cue) }, h('i', { class: 'ic ic-trash' }))));
  box.append(num('Starts at', ev[0], v => { ev[0] = v; }));
  if (timed) box.append(num('Lasts', ev[di] || 1, v => { ev[di] = Math.max(.2, v); }));
  if (type === 'say') {
    const ta = h('textarea', { maxlength: 140, 'aria-label': 'Line' }); ta.value = ev[2];
    let first = true;
    ta.addEventListener('input', () => { if (first) { checkpoint(); first = false; } ev[2] = ta.value; recompile(); save(); });
    ta.addEventListener('change', () => renderTimeline());
    box.append(ta);
  }
  if (type === 'jump') box.append(slider('Height', .4, 2.5, .1, ev[2] || 1, v => v.toFixed(1) + '×', v => { ev[2] = v; }));
  if (type === 'shake') box.append(slider('Strength', .3, 2.5, .1, ev[3] || 1, v => v.toFixed(1) + '×', v => { ev[3] = v; }));
  return box;
};
const palPanel = c => {
  const spec = specOf(c), R = rolesOf(c);
  const out = [];
  out.push(sec(null, h('div', { class: 'who' }, thumb(spec, 56, 56, null, c.hue),
    h('div', {}, h('b', {}, nameOf(c)), h('small', {}, R ? (R.walks ? `${R.move}s when it moves` : 'glides when it moves') : 'loading…')),
    h('button', { class: 'tb icon ghost danger', type: 'button', title: 'Remove from scene', 'aria-label': 'Remove pal', onclick: () => removePal(c.id) }, h('i', { class: 'ic ic-trash' })))));
  out.push(sec('Look',
    slider('Size', 1, 8, 1, c.s || 4, v => v + '×', v => { c.s = v; }),
    slider('Colour', 0, 350, 10, c.hue || 0, v => v ? v + '°' : 'off', v => { c.hue = v; }),
    h('div', { class: 'field' }, h('span', {}, 'Facing'), seg([['← Left', -1], ['Right →', 1]], c.face || 1, v => change(() => { c.face = v; }), 'Facing'), h('span'))));
  /* lines */
  const ta = h('textarea', { placeholder: 'Type a line, then Ctrl+Enter', maxlength: 140, 'aria-label': 'Line to say' });
  const durL = h('small', {}, '');
  const addLine = () => { const v = ta.value.trim(); if (!v) { ta.focus(); return; } addCue(c.id, [r2(S.t), 'say', v, sayDur(v)]); toast('Line added at ' + S.t.toFixed(2) + 's'); };
  ta.addEventListener('input', () => { durL.textContent = ta.value.trim() ? `shows for ${sayDur(ta.value.trim())}s` : ''; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addLine(); } });
  out.push(sec('Say', h('div', { class: 'say' }, ta, h('div', { class: 'row' }, durL, h('button', { class: 'tb', type: 'button', onclick: addLine }, 'Add line')))));
  out.push(sec('Emote', h('div', { class: 'emotes' }, EMOTES.map(n => h('button', { type: 'button', title: n, 'aria-label': 'Emote ' + n, onclick: () => addCue(c.id, [r2(S.t), 'emote', n, 1.2]) }, h('img', { src: iconURL(n), alt: '' }))))));
  if (R && R.acts.length) out.push(sec('Act', h('div', { class: 'acts' }, R.acts.map(a => h('button', { type: 'button', title: `Play “${a}” at the playhead`, onclick: () => addCue(c.id, [r2(S.t), 'act', a, 1.2]) }, a)))));
  out.push(sec('Moves', h('div', { class: 'moves' },
    h('button', { class: 'tb', type: 'button', onclick: () => addCue(c.id, [r2(S.t), 'jump', 1]) }, '↑ Jump'),
    h('button', { class: 'tb', type: 'button', onclick: () => addCue(c.id, [r2(S.t), 'face', -faceAt(c.id)]) }, '⇄ Turn'),
    h('button', { class: 'tb', type: 'button', onclick: () => addCue(c.id, [r2(S.t), 'show']) }, 'Enter'),
    h('button', { class: 'tb', type: 'button', onclick: () => addCue(c.id, [r2(S.t), 'hide']) }, 'Exit'))));
  out.push(sec('Movement',
    h('div', { class: 'moves' },
      h('button', { class: 'tb primary', type: 'button', onclick: recStart }, '● Record take'),
      h('button', { class: 'tb', type: 'button', onclick: () => change(() => { const tr = trackOf(c.id), [x, y] = ST.pos(actorOf(c.id).p, S.t); tr.p = tr.p.filter(s => s[0] < S.t - .001).concat([[r2(S.t), r4(x), r4(y)]]); }) }, 'Stop here')),
    h('p', { class: 'note', html: '<b>Record</b>: press <kbd>R</kbd>, then drag it around while the scene plays. <b>Walk</b>: double-click the stage. <b>Place</b>: drag it at the playhead.' })));
  return out;
};
const bgThumbs = {};
const scenePanel = () => {
  const out = [];
  out.push(sec('Scene',
    h('div', { class: 'field', style: { gridTemplateColumns: '62px 1fr' } }, h('span', {}, 'Shape'), seg(ASPECTS.map(([l, v]) => [l, v]), S.scene.ar, v => change(sc => { sc.ar = v; }), 'Aspect ratio')),
    (() => {
      const input = h('input', { type: 'number', min: .5, max: 120, step: .5, value: S.scene.len, 'aria-label': 'Length in seconds' });
      input.addEventListener('change', () => change(sc => { sc.len = clamp(+input.value || 6, .5, 120); }));
      return h('div', { class: 'cue-row' }, h('span', {}, 'Length'), h('span', { class: 'num' }, input, h('small', {}, 's')));
    })()));
  out.push(sec('Backdrop', h('div', { class: 'bgs' }, ST.backdrops.map(n => {
    const c = h('canvas', { width: 192, height: 108 });
    const b = h('button', { type: 'button', class: n === 'none' ? 'none' : '', 'aria-pressed': String(S.scene.bg === n), onclick: () => change(sc => { sc.bg = n; }) }, c, h('span', {}, n === 'none' ? 'clear' : n));
    requestAnimationFrame(() => ST.draw(c.getContext('2d'), { ar: 16 / 9, len: 1, bg: n, ground: .78, actors: [], fx: [] }, 1.5, { W: 192, H: 108 }));
    return b;
  }))));
  if (S.scene.cast.length) out.push(sec('In this scene', h('div', { class: 'list' }, S.scene.cast.map(c =>
    h('button', { class: 'who-row', type: 'button', onclick: () => { S.sel = c.id; S.cue = null; renderInspector(); renderTimeline(); need(); } },
      thumb(specOf(c), 30, 30, null, c.hue), h('b', {}, nameOf(c)), h('i', { style: { background: colorOf(c.id) } }))))));
  out.push(sec('Tips', h('p', { class: 'note', style: { margin: 0 }, html: 'Click a pal to direct it. <kbd>Space</kbd> plays, <kbd>R</kbd> records, <kbd>←</kbd><kbd>→</kbd> step a frame, <kbd>Del</kbd> removes a cue. Pals on a <b>clear</b> backdrop can play right on top of your page.' })));
  return out;
};

/* ---------- cast picker ---------- */
const castGrid = $('#cast-grid');
const PALS = Object.keys(P.sprites).filter(n => n[0] !== '_' && !HIDDEN.has(n) && P.sprites[n].frames).sort();
const renderCast = q => {
  castGrid.replaceChildren();
  q = (q || '').trim().toLowerCase();
  for (const n of PALS) {
    if (q && !n.includes(q)) continue;
    const tile = h('div', { class: 'pal', role: 'listitem', draggable: 'true', tabindex: 0, title: `Add ${n}`, 'data-pal': n },
      thumb(P.sprites[n], 56, 42), h('span', {}, n));
    tile.addEventListener('click', () => addPal({ pal: n }));
    tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addPal({ pal: n }); } });
    tile.addEventListener('dragstart', e => { e.dataTransfer.setData('text/piix-pal', n); e.dataTransfer.effectAllowed = 'copy'; });
    castGrid.append(tile);
  }
  markCast();
};
const markCast = () => { const used = new Set(S.scene ? S.scene.cast.map(c => c.pal) : []); castGrid.querySelectorAll('.pal').forEach(t => t.classList.toggle('in', used.has(t.dataset.pal))); };
$('#cast-q').addEventListener('input', e => renderCast(e.target.value));
$('#maker-form').addEventListener('submit', e => {
  e.preventDefault();
  let code = $('#maker-code').value.trim();
  if (!code) return;
  const m = /\/p\/([\w-]+)/.exec(code) || /[?&#](?:c|code|make)=([^&#]+)/.exec(code);
  if (m) code = decodeURIComponent(m[1]);
  const c = { make: code };
  let tries = 0;
  /* drawn and photo pals rasterise first: wait for them */
  const go = () => { if (specOf(c)) { addPal({ make: code }); $('#maker-code').value = ''; } else if (++tries < 40) setTimeout(go, 150); else toast("Couldn't read that pal code"); };
  go();
});

/* ---------- transport and top bar ---------- */
$('#b-play').addEventListener('click', toggle);
$('#b-start').addEventListener('click', () => seek(0));
$('#b-rec').addEventListener('click', recStart);
const togBtn = (sel, key) => { const b = $(sel); b.addEventListener('click', () => { S[key] = !S[key]; b.setAttribute('aria-pressed', String(S[key])); need(); }); };
togBtn('#b-loop', 'loop'); togBtn('#b-snap', 'snap'); togBtn('#b-guides', 'guides');
$('#b-undo').addEventListener('click', undo);
$('#b-redo').addEventListener('click', redo);
$('#title').addEventListener('change', e => change(sc => { sc.title = e.target.value.trim() || 'Untitled scene'; }));
$('#title').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#b-templates').addEventListener('click', () => openTemplates());
$('#b-empty-tpl').addEventListener('click', () => openTemplates());
$('#b-share').addEventListener('click', () => openShare());
$('#b-export').addEventListener('click', () => openExport());
$('#b-help').addEventListener('click', () => openKeys());
$('#b-support').addEventListener('click', () => openModal(h('h3', { id: 'modal-h' }, 'Keep the pals fed'),
  h('p', { class: 'lead' }, 'Stage and every pal are free. If you like what you made here, you can help keep it that way.'),
  h('div', { class: 'backs' },
    h('a', { class: 'back-opt', href: 'https://checkout.dodopayments.com/buy/pdt_0Nqn39orKzYwAaPYyimd1?quantity=1', target: '_blank', rel: 'noopener' }, h('span', { class: 'lbl' }, 'Monthly'), h('b', {}, 'Sponsor'), h('small', {}, 'A little every month keeps Piixpal growing.'), h('span', { class: 'tb heart' }, h('i', { class: 'ic ic-heart' }), 'Become a sponsor')),
    h('a', { class: 'back-opt', href: 'https://checkout.dodopayments.com/buy/pdt_0Nqn3w3rmEdaceOHhh7xT?quantity=1', target: '_blank', rel: 'noopener' }, h('span', { class: 'lbl' }, 'One time'), h('b', {}, 'Support'), h('small', {}, 'A one-off thank-you. Buy the pals a coffee.'), h('span', { class: 'tb' }, 'Support once →')))));
$('#b-narrow').addEventListener('click', () => $('#narrow').classList.add('off'));

addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
  if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if (S.rec && recKey(e)) { e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (k === ' ') { e.preventDefault(); if (S.rec) recStop(); else toggle(); }
  else if (k === 'r' || k === 'R') { e.preventDefault(); recStart(); }
  else if (k === 'Escape') { if (S.rec) recStop(); else { S.cue = null; S.sel = null; renderInspector(); renderTimeline(); need(); } }
  else if (k === 'Home') seek(0);
  else if (k === 'End') seek(S.scene.len);
  else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); pause(); seek(S.t + (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30)); }
  else if ((k === 'Delete' || k === 'Backspace') && S.cue) { e.preventDefault(); removeCue(S.cue); }
  else if (k === 'l' || k === 'L') $('#b-loop').click();
  else if (k === 'g' || k === 'G') $('#b-guides').click();
  else if (k === 'j' || k === 'J') { if (S.sel) addCue(S.sel, [r2(S.t), 'jump', 1]); }
  else if (k === '?') openKeys();
});

/* ---------- modals ---------- */
const modal = $('#modal'), mbody = $('#modal-body');
let modalTick = null;
const openModal = (...kids) => { pause(); mbody.replaceChildren(...kids); modal.hidden = false; const f = modal.querySelector('input,button:not(.x)'); if (f) f.focus(); };
const closeModal = () => { modal.hidden = true; mbody.replaceChildren(); if (modalTick) { cancelAnimationFrame(modalTick); modalTick = null; } };
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg || 'Copied'); } catch (e) { toast('Copy failed: select and copy by hand'); } };

/* templates: little live previews */
const openTemplates = () => {
  const cards = TEMPLATES.map(tp => {
    /* every card is 16:9; wider or taller scenes sit letterboxed inside it */
    const sc = tp.scene(), comp = ST.compile(sc), c = h('canvas'), CW = 300, CH = 169;
    const w = Math.min(CW, CH * comp.ar), hh = w / comp.ar, ox = (CW - w) / 2, oy = (CH - hh) / 2;
    c.width = CW * 2; c.height = CH * 2; c.style.aspectRatio = '16/9';
    const card = h('button', { class: 'tpl', type: 'button', onclick: () => { closeModal(); load(sc, true); play(); toast(`“${sc.title}” loaded. Make it yours.`); } }, c, h('div', {}, h('b', {}, sc.title), h('small', {}, tp.blurb)));
    const cg = c.getContext('2d');
    card._draw = t => { cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height); ST.draw(cg, comp, t % comp.len, { W: w, H: hh, x: ox, y: oy, dpr: 2, font: FONT, keep: true }); };
    return card;
  });
  const blankCard = h('button', { class: 'tpl', type: 'button', onclick: () => { closeModal(); load(blank(), true); } },
    h('canvas', { width: 600, height: 338, style: 'aspect-ratio:16/9' }), h('div', {}, h('b', {}, 'Blank stage'), h('small', {}, 'A meadow, a ground line and you.')));
  requestAnimationFrame(() => ST.draw(blankCard.querySelector('canvas').getContext('2d'), { ar: 16 / 9, len: 1, bg: 'meadow', ground: .84, actors: [], fx: [] }, 0, { W: 300, H: 169, dpr: 2 }));
  openModal(h('h3', { id: 'modal-h' }, 'Start from a scene'), h('p', { class: 'lead' }, 'Each one is fully editable: swap the cast, rewrite the lines, re-record the moves.'), h('div', { class: 'tpls' }, cards, blankCard));
  const t0 = performance.now();
  const tick = () => { const t = (performance.now() - t0) / 1000; cards.forEach(c => c._draw(t)); modalTick = requestAnimationFrame(tick); };
  tick();
};
const load = (scene, fresh) => {
  if (fresh && S.scene && S.scene.cast.length) checkpoint();
  S.scene = Object.assign(blank(), scene); S.sel = null; S.cue = null; S.t = 0;
  refresh(); syncHistory();
};

/* share link: the whole scene rides in the URL */
const shareURL = async () => `${location.origin}/stage#s=${await ST.encode(JSON.parse(clean(S.scene)))}`;
const openShare = async () => {
  const url = await shareURL();
  const input = h('input', { value: url, readonly: true, 'aria-label': 'Share link', onfocus: e => e.target.select() });
  openModal(h('h3', { id: 'modal-h' }, 'Share this scene'), h('p', { class: 'lead' }, 'Anyone with the link opens it in Stage, ready to play and remix. The scene lives in the link itself: nothing is uploaded.'),
    h('div', { class: 'share-box' }, input, h('button', { class: 'tb primary', type: 'button', onclick: () => copy(url, 'Link copied') }, h('i', { class: 'ic ic-copy' }), 'Copy link')),
    h('p', { class: 'small', style: { marginTop: '12px' } }, `${url.length.toLocaleString()} characters`));
};

/* export: website tag, video, JSON */
const SITE = 'https://piixpal.dvkk.dev';
const openExport = async () => {
  const code = await ST.encode(JSON.parse(clean(S.scene)));
  const tabs = ['Website', 'Video', 'JSON'];
  const panes = {};
  const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map((t, i) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(i === 0), onclick: e => {
    tabBar.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
    tabs.forEach(n => { panes[n].hidden = n !== t; });
  } }, t)));
  panes.Website = exportSite(code);
  panes.Video = exportVideo();
  panes.JSON = exportJSON();
  panes.Video.hidden = panes.JSON.hidden = true;
  openModal(h('h3', { id: 'modal-h' }, 'Export'), h('p', { class: 'lead' }, 'Drop it into your site with one tag, or take it anywhere as a video.'), tabBar, panes.Website, panes.Video, panes.JSON);
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const exportSite = code => {
  const o = { where: S.scene.bg === 'none' ? 'over' : 'box', over: '#hero', when: 'visible', sel: '#signup', ev: 'signup-done', loop: S.scene.bg !== 'none', after: 'auto' };
  const pre = h('pre'), prev = h('div', { class: 'prev' });
  const field = (label, el, wide) => h('label', { class: 'opt' + (wide ? ' wide' : '') }, h('span', { class: 'lbl' }, label), el);
  const sel = (key, opts) => { const s = h('select', {}, opts.map(([v, l]) => h('option', { value: v, selected: o[key] === v }, l))); s.addEventListener('change', () => { o[key] = s.value; upd(); }); return s; };
  const txt = key => { const i = h('input', { type: 'text', value: o[key], spellcheck: 'false' }); i.addEventListener('input', () => { o[key] = i.value; upd(); }); return i; };
  const loop = h('input', { type: 'checkbox', checked: o.loop }); loop.addEventListener('change', () => { o.loop = loop.checked; upd(); });
  const overF = field('On top of', txt('over')), selF = field('Element', txt('sel')), evF = field('Event name', txt('ev'));
  const tag = () => {
    const play = { visible: '', load: o.where === 'over' ? '' : 'load', click: 'click', hover: 'hover', elclick: `${o.sel}:click`, submit: `${o.sel}:submit`, event: `event:${o.ev}` }[o.when];
    const a = [`scene="${code}"`];
    if (o.where === 'over') a.push(`over="${o.over}"`);
    if (o.when === 'visible' && o.where === 'over') a.push('play="visible"');
    else if (play) a.push(`play="${play}"`);
    if (o.loop) a.push('loop');
    if (o.after !== 'auto') a.push(`after="${o.after}"`);
    return a;
  };
  const upd = () => {
    overF.hidden = o.where !== 'over'; selF.hidden = !['elclick', 'submit'].includes(o.when); evF.hidden = o.when !== 'event';
    const a = tag();
    pre.innerHTML = `<span class="c-c">&lt;!-- once per page --&gt;</span>\n<span class="c-t">&lt;script</span> <span class="c-a">src</span>=<span class="c-s">"${SITE}/piixpal.min.js"</span><span class="c-t">&gt;&lt;/script&gt;</span>\n\n<span class="c-t">&lt;piix-play</span> ${a.map(x => { const i = x.indexOf('='); return i < 0 ? `<span class="c-a">${x}</span>` : `<span class="c-a">${x.slice(0, i)}</span>=<span class="c-s">${esc(x.slice(i + 1))}</span>`; }).join(' ')}<span class="c-t">&gt;&lt;/piix-play&gt;</span>` +
      (o.when === 'event' ? `\n\n<span class="c-c">&lt;!-- then, whenever it should play --&gt;</span>\n<span class="c-t">dispatchEvent</span>(<span class="c-t">new</span> CustomEvent(<span class="c-s">'${esc(o.ev)}'</span>))` : '');
    /* a real <piix-play> as the preview: what you copy is what runs */
    if (o.where === 'box') {
      if (!prev._el) { prev._el = h('piix-play', { scene: code, play: 'load', loop: true }); prev.replaceChildren(prev._el); }
    } else prev.replaceChildren(h('p', { class: 'small', style: { padding: '14px 16px', margin: 0 } }, `It plays over your ${o.over} element, sized to its width and standing on its bottom edge. Clear backdrops work best for this.`));
  };
  const text = () => `<script src="${SITE}/piixpal.min.js"></script>\n<piix-play ${tag().join(' ')}></piix-play>`;
  const pane = h('div', {},
    h('div', { class: 'opts' },
      field('Where', sel('where', [['box', 'In its own box, with the backdrop'], ['over', 'On top of an element on my page']])),
      field('Plays', sel('when', [['visible', 'When it scrolls into view'], ['load', 'When the page loads'], ['click', 'When the box is clicked'], ['hover', 'When the box is hovered'], ['elclick', 'When an element is clicked'], ['submit', 'When a form is submitted'], ['event', 'On my own JavaScript event']])),
      overF, selF, evF,
      field('When it ends', sel('after', [['auto', 'Default (box keeps the last frame, over hides)'], ['hold', 'Keep the last frame'], ['hide', 'Disappear']])),
      h('label', { class: 'check', style: { alignSelf: 'end', paddingBottom: '10px' } }, loop, 'Loop it')),
    prev,
    h('div', { class: 'code' }, pre, h('button', { class: 'tb', type: 'button', onclick: () => copy(text(), 'Tag copied') }, h('i', { class: 'ic ic-copy' }), 'Copy')));
  upd();
  return pane;
};
const exportVideo = () => {
  const mp4 = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const webm = ['video/webm;codecs=vp9', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  let res = 1080;
  const resSeg = seg([['720p', 720], ['1080p', 1080]], res, v => { res = v; resSeg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent.startsWith(String(v))))); }, 'Resolution');
  const barI = h('i'), status = h('p', { class: 'small' }, `${(mp4 ? 'MP4' : 'WebM')} · plays the scene once in real time while it records (${S.scene.len.toFixed(1)}s).`);
  const view = h('div', { class: 'ph-v' }, 'Your video appears here');
  const go = h('button', { class: 'tb primary', type: 'button' }, h('i', { class: 'ic ic-down' }), 'Render video');
  go.addEventListener('click', async () => {
    if (!mp4 && !webm) { toast('This browser can’t record video'); return; }
    go.disabled = true;
    const blob = await renderVideo(res, mp4 || webm, p => { barI.style.width = Math.round(p * 100) + '%'; status.textContent = `Recording… ${Math.round(p * 100)}%`; });
    go.disabled = false;
    const url = URL.createObjectURL(blob), ext = (mp4 ? 'mp4' : 'webm');
    const v = h('video', { src: url, controls: true, loop: true, autoplay: true, muted: true, playsinline: true });
    v.style.aspectRatio = String(S.scene.ar);
    view.replaceWith(v);
    status.replaceChildren(`${(blob.size / 1048576).toFixed(1)} MB · `, h('a', { href: url, download: (S.scene.title || 'scene').replace(/[^\w-]+/g, '-').toLowerCase() + '.' + ext, style: { color: 'var(--lime)' } }, 'Download ' + ext.toUpperCase()));
  });
  return h('div', { class: 'vid' }, view, h('div', {}, h('span', { class: 'lbl' }, 'Resolution'), h('div', { style: { margin: '8px 0 14px' } }, resSeg), go, h('div', { class: 'bar' }, barI), status,
    h('p', { class: 'small' }, 'Made for posting: crisp pixels, the backdrop and every line included. Vertical scenes (9:16) come out ready for Reels, Shorts and TikTok.')));
};
const renderVideo = (res, type, progress) => new Promise(done => {
  const comp = ST.compile(JSON.parse(clean(S.scene))), ar = comp.ar;
  /* the short side gets the resolution; sizes stay even for the encoder */
  let w = ar >= 1 ? Math.round(res * ar) : res, hh = ar >= 1 ? res : Math.round(res / ar);
  w += w % 2; hh += hh % 2;
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g2 = c.getContext('2d'), stream = c.captureStream(30), chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: res >= 1080 ? 14e6 : 8e6 });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => done(new Blob(chunks, { type: type.split(';')[0] }));
  const paint = t => { g2.fillStyle = '#0b0a10'; g2.fillRect(0, 0, w, hh); ST.draw(g2, comp, t, { W: w, H: hh, dpr: 1, font: FONT, keep: true }); };
  paint(0);
  rec.start(250);
  const t0 = performance.now();
  const step = () => {
    const t = (performance.now() - t0) / 1000;
    paint(Math.min(t, comp.len));
    progress(Math.min(1, t / comp.len));
    if (t < comp.len + .25) requestAnimationFrame(step); else rec.stop();
  };
  requestAnimationFrame(step);
});
const exportJSON = () => {
  const json = JSON.stringify(JSON.parse(clean(S.scene)), null, 1);
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  file.addEventListener('change', async () => { try { load(JSON.parse(await file.files[0].text()), true); closeModal(); toast('Scene opened'); } catch (e) { toast('That file isn’t a scene'); } });
  return h('div', {},
    h('p', { class: 'small', style: { marginTop: 0 } }, 'The scene as plain data. Host it and point a tag at it with src="scene.json", or keep it as a backup.'),
    h('div', { class: 'code' }, h('pre', {}, json.length > 4000 ? json.slice(0, 4000) + '\n…' : json)),
    h('div', { class: 'row-end' }, file,
      h('button', { class: 'tb', type: 'button', onclick: () => file.click() }, 'Open a .json'),
      h('button', { class: 'tb', type: 'button', onclick: () => copy(json, 'JSON copied') }, h('i', { class: 'ic ic-copy' }), 'Copy'),
      h('a', { class: 'tb primary', href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: (S.scene.title || 'scene').replace(/[^\w-]+/g, '-').toLowerCase() + '.json', style: { textDecoration: 'none' } }, h('i', { class: 'ic ic-down' }), 'Download')));
};
const openKeys = () => {
  const row = (keys, what) => h('div', {}, h('span', {}, what), h('span', {}, keys.map(k => h('kbd', {}, k))));
  openModal(h('h3', { id: 'modal-h' }, 'Shortcuts'), h('p', { class: 'lead' }, 'Direct with one hand on the mouse and one on the keys.'),
    h('div', { class: 'keylist' },
      row(['Space'], 'Play / pause'), row(['R'], 'Record the selected pal'), row(['W'], 'Jump (while recording)'), row(['F'], 'Turn around (while recording)'),
      row(['1', '–', '9'], 'Emote (while recording)'), row(['J'], 'Add a jump at the playhead'), row(['←', '→'], 'Step one frame'), row(['Shift', '←'], 'Step one second'),
      row(['Del'], 'Delete the selected cue'), row(['Ctrl', 'Z'], 'Undo'), row(['Ctrl', 'Shift', 'Z'], 'Redo'), row(['L'], 'Loop on / off'),
      row(['G'], 'Guides on / off'), row(['Alt', 'drag'], 'Place without the ground magnet'), row(['Ctrl', 'scroll'], 'Zoom the timeline'), row(['Esc'], 'Deselect / stop recording')));
};

/* ---------- templates ---------- */
const TEMPLATES = [
  { blurb: 'Two pals meet in a meadow, a trick goes right, confetti.', scene: () => ({ v: 1, title: 'Hello, bug', ar: 16 / 9, len: 9, bg: 'meadow', ground: .84,
    cast: [{ id: 'a', pal: 'pip', s: 5, face: 1 }, { id: 'b', pal: 'bitbug', s: 5, face: -1 }, { id: 'c', pal: 'bumble', s: 4, face: 1 }],
    k: {
      a: { p: [[0, -.06, .84], [2.1, .34, .84]], e: [[2.3, 'say', 'Oh! Hi there, little bug.', 2.1], [6.25, 'jump', 1], [6.35, 'emote', 'heart', 1.8]] },
      b: { p: [[.5, 1.06, .84], [2.6, .64, .84]], e: [[4.5, 'say', 'Hi! Want to see a trick?', 1.9], [6, 'jump', 1.7], [7.5, 'emote', 'star', 1.3]] },
      c: { p: [[5.3, .06, .22], [7.2, .5, .14], [9, 1.12, .26]], e: [[5.3, 'show'], [7.4, 'emote', 'note', 1.2]] } },
    fx: [[6.35, 'confetti', 2.6], [6.3, 'shake', .35, .7]] }) },
  { blurb: 'A celebration to play over your signup form. Clear backdrop, wide shape.', scene: () => ({ v: 1, title: 'Welcome aboard', ar: 3, len: 4.4, bg: 'none', ground: .94,
    cast: [{ id: 'a', pal: 'tri', s: 4, face: 1 }, { id: 'b', pal: 'boing', s: 4, face: 1 }, { id: 'c', pal: 'frog', s: 4, face: -1 }],
    k: {
      a: { p: [[0, .5, .94]], e: [[0, 'show'], [.35, 'act', 'cheer', 1.6], [.45, 'say', 'Welcome aboard!', 2.5], [2.2, 'act', 'dance', 1.8]] },
      b: { p: [[0, .3, .94]], e: [[.2, 'show'], [.75, 'jump', 1.2], [1.7, 'jump', 1], [2.9, 'emote', 'heart', 1.2]] },
      c: { p: [[0, .7, .94]], e: [[.3, 'show'], [.95, 'jump', 1.1], [2.05, 'emote', 'star', 1.2], [2.5, 'jump', .9]] } },
    fx: [[.5, 'confetti', 2.8]] }) },
  { blurb: 'For your 404 page: a nomad is lost, a scout knows the way home.', scene: () => ({ v: 1, title: 'Lost page', ar: 16 / 9, len: 9.5, bg: 'night', ground: .84,
    cast: [{ id: 'a', pal: 'nomad', s: 4, face: 1 }, { id: 'b', pal: 'scout', s: 4, face: -1 }, { id: 'c', pal: 'pidge', s: 3, face: -1 }],
    k: {
      a: { p: [[0, -.06, .84], [2.4, .36, .84], [7.3, .36, .84], [9.5, 1.1, .84]], e: [[2.5, 'act', 'look', 1.3], [3.9, 'say', 'Hmm. This page wandered off.', 2.2], [6.5, 'emote', '!', 1]] },
      b: { p: [[3.4, 1.08, .84], [5, .66, .84], [7.3, .66, .84], [9.5, 1.2, .84]], e: [[5.1, 'act', 'point', 1.4], [5.15, 'say', 'A 404! Home is this way.', 2.2], [7.1, 'face', 1]] },
      c: { p: [[0, 1.1, .16], [9.5, -.12, .22]], e: [[2.6, 'emote', 'zz', 1.6]] } },
    fx: [] }) },
  { blurb: 'Curtains up: a host, a star act, a flash and a standing ovation.', scene: () => ({ v: 1, title: 'Showtime', ar: 16 / 9, len: 10, bg: 'stage', ground: .84,
    cast: [{ id: 'a', pal: 'polly', s: 5, face: 1 }, { id: 'b', pal: 'tri', s: 4, face: -1 }, { id: 'c', pal: 'echo', s: 5, face: -1 }],
    k: {
      a: { p: [[0, .28, .84], [5.4, .28, .84], [6.2, .2, .84]], e: [[.2, 'show'], [.7, 'act', 'talk', 2.4], [.75, 'say', 'Ladies and gentlepals…', 2.3], [3.3, 'act', 'talk', 2.3], [3.35, 'say', '…the one, the only: TRI!', 2.3], [7.4, 'act', 'happy', 2]] },
      b: { p: [[0, 1.16, .84], [5.6, 1.16, .84], [6.9, .58, .84]], e: [[7.1, 'act', 'dance', 2.6], [7.15, 'say', 'Ta-da!', 1.5]] },
      c: { p: [[0, .84, .84]], e: [[.4, 'show'], [7.3, 'act', 'dance', 2.4], [8.2, 'emote', 'heart', 1.4]] } },
    fx: [[7, 'flash', .35], [7.05, 'confetti', 2.8]] }) }
];

/* ---------- start ---------- */
const boot = async () => {
  renderCast();
  setFill($('#zoom'));
  let scene = null, from = '';
  const m = /[#&]s=([^&]+)/.exec(location.hash);
  if (m) { try { scene = await ST.decode(decodeURIComponent(m[1])); from = 'link'; } catch (e) { toast('That share link is broken'); } }
  if (!scene) { try { const s = localStorage.getItem(STORE); if (s) { scene = JSON.parse(s); from = 'saved'; } } catch (e) { /* private mode */ } }
  if (!scene) { scene = TEMPLATES[0].scene(); from = 'first'; }
  S.scene = Object.assign(blank(), scene);
  refresh(); syncHistory(); syncPlay();
  if (from === 'link') { history.replaceState(null, '', location.pathname); toast('Scene opened from a link'); play(); }
  if (from === 'first') { play(); setTimeout(() => tip('Click a pal to direct it, or drag a new one in from the cast'), 900); }
  requestAnimationFrame(frame);
  if (document.fonts) document.fonts.ready.then(need);
};
boot();
})();
