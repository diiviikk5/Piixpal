/* GEM: a treasure hunt across your site. Hide gems anywhere, on any page; visitors who
 * spot one click it and it flies into a little jar in the corner, which remembers every
 * gem they've found, page to page. Find them all and the jar bursts with sparkles (and,
 * if you like, hands over a reward code).
 *
 *   <piix-pal pal="gem" hunt="launch" gem="1" total="5"></piix-pal>
 *   <piix-pal pal="gem" hunt="launch" gem="2" total="5" color="#ff4d6d"></piix-pal>   …and so on
 *   reward="PIX10"   what the finder gets when the jar is full
 *   Events: piix:gem { hunt, found, total }, piix:hunt-done { hunt, reward } */

/* a cut gem, with a glint that travels across it */
const gemShape = glint => {
  const rows = ['..kkkkk..', '.kLlLlLk.', 'kLlLlLlLk', 'kkkkkkkkk', '.klllldk.', '..klldk..', '...kdk...', '....k....'];
  return glint < 0 ? rows : art.put(rows, 2 + glint, glint > 3 ? 2 : 1, ['w']);
};

/* Gem: sits and glints */
defineSprite('gem', {
  w: 9, h: 8, scale: 3, does: 'hunt',
  palette: { k: '#17121f', l: '#58c8ff', L: '#b8e6ff', d: '#2f8fc4', w: '#ffffff' },
  frames: { idle: [gemShape(-1), gemShape(-1), gemShape(-1), gemShape(0), gemShape(2), gemShape(4), gemShape(-1), gemShape(-1)] },
  fps: { idle: 8 }
});

/* the jar that collects them: glass, a lid, and one gem-coloured pixel row per gem inside */
const gemJar = (n, total) => {
  let rows = ['.kkkkkkkk.', '.kbbbbbbk.', 'kkkkkkkkkk', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', 'k........k', '.kkkkkkkk.'];
  rows = rows.map((r, y) => y > 2 && y < 10 ? 'k' + 'g'.repeat(8) + 'k' : r);
  const filled = Math.round(Math.min(1, total ? n / total : 0) * 7);
  for (let i = 0; i < filled; i++) rows = art.put(rows, 1, 9 - i, [i % 2 ? 'lLlLlLlL' : 'LlLlLlLl']);
  return art.put(rows, 2, 3, ['w', 'w']);
};
/* the jar: up to twelve fill levels */
defineSprite('_jar', {
  w: 10, h: 11, scale: 3,
  palette: { k: '#17121f', b: '#ff6b4a', g: '#eaf6ff', l: '#58c8ff', L: '#b8e6ff', w: '#ffffff' },
  frames: Object.fromEntries(Array.from({ length: 13 }, (_, i) => ['j' + i, [gemJar(i, 12)]]))
});

/* what each hunt has found so far, kept in the visitor's browser */
const gemLoad = hunt => { try { return JSON.parse(localStorage.getItem('piix-hunt:' + hunt)) || []; } catch (_) { return []; } };
const gemSave = (hunt, list) => { try { localStorage.setItem('piix-hunt:' + hunt, JSON.stringify(list)); } catch (_) { /* private mode */ } };

/* one jar per hunt, shared by every gem on the page */
const GEM_JARS = {};

/* a gem's own colours, from a single colour */
const gemTint = (a, color) => {
  if (!color) return;
  const pal = { ...a.spec.palette, l: color, L: mixHex(color, .55), d: mixHex(color, -.3) };
  const spec = defineSprite('_gem-' + color.replace('#', ''), { ...a.spec, palette: pal });
  a.spec = spec; a.frames = baked(spec); a._drawn = null;
};

/* hunt: glint where it's hidden; when found, fly into the jar */
defineBehavior('hunt', (a, [el], host) => {
  const S = a.s / 3;
  const hunt = host.getAttribute('hunt') || 'gems';
  const gid = host.getAttribute('gem') || host.id || String([...document.querySelectorAll(`piix-pal[pal=gem][hunt="${hunt}"]`)].indexOf(host) + 1);
  const total = clamp(+host.getAttribute('total') || document.querySelectorAll(`piix-pal[pal=gem][hunt="${hunt}"]`).length || 1, 1, 12);
  const boxEl = boxOf(host);
  gemTint(a, host.getAttribute('color'));
  let found = gemLoad(hunt).includes(gid), fly = -1, from = null, twinkle = rnd(0, 6);
  if (found) a.node.style.opacity = '0';
  /* the shared jar, pinned in the bottom-left corner (or the box's) */
  let jar = GEM_JARS[hunt];
  if (!jar) {
    const act = recruit(a, '_jar');
    if (!boxEl) pin(act);
    jar = GEM_JARS[hunt] = { act, owner: host, shown: gemLoad(hunt).length > 0, bump: 0, done: false };
    act.node.style.opacity = jar.shown ? '' : '0';
  }
  const mine = jar.owner === host;
  const jarAt = () => {
    const r = boxEl ? rectOf(boxEl) : { l: origin.x, b: origin.y + innerHeight };
    return { x: r.l + 24 * S + jar.act.w / 2, y: r.b - 16 * S };
  };
  const finish = () => {
    if (jar.done) return;
    jar.done = true;
    const reward = host.getAttribute('reward') || document.querySelector(`piix-pal[pal=gem][hunt="${hunt}"][reward]`)?.getAttribute('reward');
    jar.act.say('star', 2400);
    const card = uiCard({ fixed: !boxEl, tip: true, width: 260, attrs: { role: 'dialog', 'aria-label': 'You found them all' } });
    card.append(uiEl('h4', { text: 'Treasure!' }), uiEl('p', { text: reward ? 'You found every gem. Here is your reward:' : `You found all ${total} gems. Nicely done.` }),
      reward ? uiEl('p', { text: reward, style: `margin-top:8px;font:800 20px/1 ${UI_MONO};letter-spacing:.08em` }) : null,
      uiEl('div', { cls: 'row' }, uiEl('button', { text: 'Yay', attrs: { type: 'button' }, on: { click: () => uiClose(card) } })));
    const p = jarAt();
    uiPlace(card, p.x, p.y - jar.act.h - 6, boxEl ? { area: rectOf(boxEl) } : {});
    uiAnnounce(reward ? `You found every gem. Your reward: ${reward}` : `You found all ${total} gems`);
    host.dispatchEvent(new CustomEvent('piix:hunt-done', { bubbles: true, detail: { hunt, reward } }));
  };

  return {
    crew: mine ? [jar.act] : [],
    boxed: true,
    awake: () => true,
    tick(dt) {
      const r = surfaceOf(el) || rectOf(el);
      const at = host.getAttribute('at') != null ? clamp(+host.getAttribute('at'), 0, 1) : .5;
      const home = { x: r.l + a.w / 2 + Math.max(0, (r.r - r.l) - a.w) * at, y: r.t };
      twinkle += dt;
      if (fly >= 0) {
        /* off to the jar in an arc, shrinking as it goes */
        fly = Math.min(1, fly + dt / (reduced() ? .01 : .7));
        const to = jarAt(), e = fly * fly * (3 - 2 * fly);
        const fx = boxEl ? from.x : from.x - scrollX + origin.x, fy = boxEl ? from.y : from.y - scrollY + origin.y;
        if (!boxEl && !a.pinned) pin(a);
        a.x = lerp(fx, to.x, e); a.y = lerp(fy, to.y - jar.act.h * .6, e) - Math.sin(Math.PI * fly) * 90 * S;
        a.sx = a.sy = 1 - fly * .5; a.rot = fly * 540;
        a.cv.style.transformOrigin = '50% 50%';
        if (fly >= 1) {
          a.node.style.opacity = '0'; fly = -1;
          jar.bump = .35;
          const list = gemLoad(hunt);
          host.dispatchEvent(new CustomEvent('piix:gem', { bubbles: true, detail: { hunt, found: list.length, total } }));
          jar.act.say('#' + list.length, 1300);
          if (list.length >= total) setTimeout(finish, 500);
        }
      } else if (!found) {
        a.x = home.x; a.y = home.y + Math.sin(twinkle * 2.4) * 2 * S;
        a.play('idle');
        if (ptr.seen && a.near(14 * S) && Math.floor(twinkle * 2) % 6 === 0) a.say('star', 400);
      }
      if (mine) {
        const p = jarAt();
        jar.act.x = p.x; jar.act.y = p.y;
        const n = gemLoad(hunt).length;
        jar.act.play('j' + Math.min(12, Math.round(n / total * 12)));
        if (jar.shown) jar.act.node.style.opacity = '';
        jar.bump = Math.max(0, jar.bump - dt);
        jar.act.sy = 1 + Math.sin(Math.PI * jar.bump / .35) * .18; jar.act.sx = 2 - jar.act.sy;
      }
    },
    poke() {
      if (found || fly >= 0) return;
      found = true;
      const list = gemLoad(hunt);
      if (!list.includes(gid)) { list.push(gid); gemSave(hunt, list); }
      jar.shown = true; jar.act.node.style.opacity = '';
      from = { x: a.x, y: a.y }; fly = 0;
      a.say('star', 500);
      uiAnnounce(`Gem found, ${list.length} of ${total}`);
    },
    reset() { gemSave(hunt, []); found = false; a.node.style.opacity = ''; jar.done = false; jar.shown = false; jar.act.node.style.opacity = '0'; if (a.pinned) { a.pinned = false; a.node.style.position = ''; } a.sx = a.sy = 1; a.rot = 0; },
    destroy() { if (mine) { delete GEM_JARS[hunt]; } }
  };
});
