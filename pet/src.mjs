#!/usr/bin/env node
/* piixpal-pet: a pixel pet for your coding agent. It sits in a terminal pane next to Claude Code
 * or Codex and watches the session as it happens: it paces while the agent thinks, sniffs about
 * while it reads, gets busy while it edits, panics when a command fails, cheers when the turn is
 * done, and falls asleep when you leave. No setup: it reads the session logs both tools already
 * write (~/.claude/projects, ~/.codex/sessions), and nothing leaves your machine.
 *
 *   node pet.mjs                    watch whichever agent was active last
 *   node pet.mjs --pal kitty        pick a pet (node pet.mjs list shows them all)
 *   node pet.mjs --make AQ4M…       a pixel pal you made at piixpal.dvkk.dev/components/make
 *   node pet.mjs --agent codex      only watch Codex (or claude)
 *   node pet.mjs --scale 1|2        pixel size (default: fits the pane)
 *   node pet.mjs statusline         a one-line pet for Claude Code's status line
 *   node pet.mjs notify [kind]      from a hook: tell the pet the agent needs you
 *
 * Built from Piixpal (https://piixpal.dvkk.dev) by scripts/pet.mjs. MIT. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PALS = /*__PALS__*/null;
/*__MAKER__*/

/* ---------- options ---------- */
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'watch';
const HOME = os.homedir(), STATE = path.join(HOME, '.piixpal-pet');
fs.mkdirSync(STATE, { recursive: true });
const SAVED = (() => { try { return JSON.parse(fs.readFileSync(path.join(STATE, 'config.json'), 'utf8')); } catch { return {}; } })();
const pick = flag('pal', null), made = flag('make', null);
if (pick || made) fs.writeFileSync(path.join(STATE, 'config.json'), JSON.stringify({ ...SAVED, pal: pick || SAVED.pal, make: made || (pick ? undefined : SAVED.make) }));
const AGENT = flag('agent', 'auto');

/* ---------- the pal ---------- */
const loadPal = () => {
  const code = made || (!pick && SAVED.make);
  if (code) {
    if (/^A[g-v]/.test(code)) { console.error('That one is a smooth (drawn or photo) pal; the terminal pet draws pixel pals. Make one in the Pixel tab.'); process.exit(1); }
    try { const m = MAKER.decode(code); return { name: m.name, ...MAKER.sprite(m) }; } catch { console.error('That Pal Maker code looks broken.'); process.exit(1); }
  }
  const name = (pick || SAVED.pal || 'bitbug').toLowerCase();
  if (!PALS[name]) { console.error(`No pet called "${name}". Try: ${Object.keys(PALS).join(', ')}`); process.exit(1); }
  return { name, ...PALS[name] };
};
const rgb = h => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/* each mood, and the clips that can show it, best first (pals have different clips) */
const CLIPS = {
  idle: ['idle', 'sit', 'rest'], sleep: ['sleep', 'rest', 'idle'], think: ['walk', 'run', 'idle'],
  read: ['sniff', 'look', 'peck', 'peek', 'walk'], edit: ['happy', 'purr', 'walk'], run: ['run', 'walk', 'fly'],
  oops: ['alarm', 'scared', 'nervous', 'dizzy', 'flip'], done: ['cheer', 'happy', 'wave', 'hop', 'jump'], wait: ['wave', 'alarm', 'hop', 'idle']
};
const clipFor = (pal, mood) => (CLIPS[mood] || ['idle']).find(c => pal.frames[c] && pal.frames[c].length) || Object.keys(pal.frames)[0];
const WALKS = new Set(['think', 'read', 'run']);

import { parseClaude, watchAgents, short } from './agents.mjs';

/* ---------- stats, kept between sessions ---------- */
const STATS_F = path.join(STATE, 'stats.json');
const stats = (() => { try { return JSON.parse(fs.readFileSync(STATS_F, 'utf8')); } catch { return { xp: 0, turns: 0, tools: 0, oops: 0 }; } })();
const level = xp => Math.floor(Math.sqrt(xp / 25)) + 1;
let saveT;
const saveStats = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(STATS_F, JSON.stringify(stats), () => {}), 500); };

/* ---------- a one-line pet for Claude Code's status line ---------- */
if (cmd === 'statusline') {
  let input = '';
  process.stdin.on('data', d => (input += d)).on('end', () => {
    let info = {};
    try { info = JSON.parse(input); } catch { /* run by hand */ }
    const pal = loadPal();
    let ev = { kind: 'idle', text: 'ready' };
    try {
      const f = info.transcript_path, size = fs.statSync(f).size, fd = fs.openSync(f, 'r'), n = Math.min(size, 65536), buf = Buffer.alloc(n);
      fs.readSync(fd, buf, 0, n, size - n); fs.closeSync(fd);
      for (const l of buf.toString('utf8').split('\n')) { try { const e = parseClaude(JSON.parse(l)); if (e) ev = e; } catch { /* partial line */ } }
    } catch { /* no transcript yet */ }
    const FACES = { idle: '(•‿•)', sleep: '(-_-) zz', think: '(•_•)…', read: '(◔_◔)', edit: '(•̀ᴗ•́)✎', run: '(ง•_•)ง', oops: '(⊙_⊙;)', done: '\\(^ᴗ^)/', wait: '(•o•)!' };
    /* the pal's own colour: the commonest one in its first frame */
    const count = {};
    for (const r of pal.frames[clipFor(pal, 'idle')][0]) for (const ch of r) if (pal.palette[ch]) count[ch] = (count[ch] || 0) + 1;
    const main = Object.entries(count).sort((a, b) => b[1] - a[1]).find(([k]) => { const [r, g, b] = rgb(pal.palette[k]); return r + g + b > 180; });
    const [r, g, b] = rgb(main ? pal.palette[main[0]] : '#c6f432');
    process.stdout.write(`\x1b[38;2;${r};${g};${b}m${FACES[ev.kind] || FACES.idle}\x1b[0m ${pal.name} \x1b[2m${ev.text}\x1b[0m`);
  });
} else if (cmd === 'notify') {
  /* from a Claude Code Notification hook or Codex's notify: the agent wants you */
  fs.writeFileSync(path.join(STATE, 'ping'), JSON.stringify({ kind: argv[1] || 'wait', at: Date.now() }));
  process.stdin.resume(); process.stdin.on('data', () => {}); setTimeout(() => process.exit(0), 50);
} else if (cmd === 'list') {
  for (const [name, p] of Object.entries(PALS)) {
    const fr = p.frames[clipFor(p, 'idle')][0], pad = p.h - fr.length, rows = Array(Math.max(0, pad)).fill('').concat(fr);
    console.log(`\n  ${name}`);
    for (let y = 0; y < rows.length; y += 2) {
      let s = '  ';
      for (let x = 0; x < p.w; x++) {
        const t = p.palette[(rows[y] || '')[x]], u = p.palette[(rows[y + 1] || '')[x]];
        if (t && u) s += `\x1b[38;2;${rgb(t)}m\x1b[48;2;${rgb(u)}m▀\x1b[0m`.replace(/(\d+),(\d+),(\d+)/g, '$1;$2;$3');
        else if (t) s += `\x1b[38;2;${rgb(t).join(';')}m▀\x1b[0m`;
        else if (u) s += `\x1b[38;2;${rgb(u).join(';')}m▄\x1b[0m`;
        else s += ' ';
      }
      console.log(s);
    }
  }
  console.log('\n  node pet.mjs --pal <name>   (it remembers)\n');
} else if (cmd === 'help' || argv.includes('--help') || argv.includes('-h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, '').replace(/^ \* ?/gm, ''));
} else watch();

/* ---------- the pane ---------- */
function watch() {
  /* PIIXPAL_PET_TEST=80x24: draw into memory and print the last frame after PIIXPAL_PET_MS (for tests) */
  const TEST = process.env.PIIXPAL_PET_TEST;
  let lastFrame = '';
  const out = TEST ? { columns: +TEST.split('x')[0], rows: +TEST.split('x')[1], isTTY: true, write: s => { if (s.startsWith('\x1b[H')) lastFrame = s; }, on() {} } : process.stdout;
  const pal = loadPal();
  let mood = 'idle', text = 'waiting for your agent…', moodAt = Date.now(), lastEvent = Date.now(), agent = null, file = null;
  let x = 2, face = 1, hop = 0, flash = 0, lvlShown = level(stats.xp), lastPing = 0;
  const set = (m, t) => { mood = m; if (t) text = t; moodAt = Date.now(); };
  const onEvent = e => {
    lastEvent = Date.now();
    if (e.tool) { stats.tools++; stats.xp += 1; }
    if (e.kind === 'oops') { stats.oops++; flash = 6; }
    if (e.done) { stats.turns++; stats.xp += 6; hop = 1; }
    set(e.kind, e.text);
    if (level(stats.xp) > lvlShown) { lvlShown = level(stats.xp); set('done', `level up! lvl ${lvlShown} ★`); hop = 1; }
    saveStats();
  };
  /* follow the newest session as it's written */
  let project = '';
  const startWatching = () => watchAgents({ agent: AGENT, onEvent, onSwitch: w => { agent = w.agent; file = w.file; project = w.project; set('idle', `watching ${agent === 'codex' ? 'Codex' : 'Claude Code'}`); } });
  const ping = () => {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(STATE, 'ping'), 'utf8'));
      if (p.at > lastPing) { const first = !lastPing; lastPing = p.at; if (!first && Date.now() - p.at < 60000) { set('wait', 'psst… your agent needs you'); if (!argv.includes('--quiet')) out.write('\x07'); } }
    } catch { /* no hook set up */ }
  };

  /* ---------- drawing: two pixels per character, top in the foreground, bottom in the background ---------- */
  const SGR = (fg, bg) => (fg ? `\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m` : '\x1b[39m') + (bg ? `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m` : '\x1b[49m');
  const PAL = {};
  for (const k in pal.palette) if (/^#[0-9a-f]{6}/i.test(pal.palette[k])) PAL[k] = rgb(pal.palette[k]);
  const LIME = [198, 244, 50], DIM = '\x1b[2m', R = '\x1b[0m';
  let t0 = Date.now(), last = Date.now();
  const draw = () => {
    const now = Date.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    const W = out.columns || 60, H = out.rows || 20;
    /* the biggest pixels that fit: header, bubble, the scene and the stats line */
    const fits = k => Math.ceil((pal.h * k + 4 * k + 1) / 2) + 1 + 6 <= H && pal.w * k + 4 <= W;
    const S = +flag('scale', 0) || (fits(2) ? 2 : 1);
    /* moods wind down by themselves */
    const age = now - moodAt;
    if ((mood === 'done' && age > 3500) || (mood === 'oops' && age > 2600)) set(mood === 'oops' ? 'think' : 'idle', mood === 'oops' ? 'trying again…' : text);
    if (mood === 'idle' && now - lastEvent > 90000) set('sleep', 'zzz…');
    if (mood === 'think' && now - lastEvent > 120000) set('idle', 'all quiet');
    const clip = clipFor(pal, mood), frames = pal.frames[clip], fps = (pal.fps && pal.fps[clip]) || 6;
    const rows0 = frames[Math.floor((now - t0) / 1000 * fps) % frames.length];
    const fr = Array(Math.max(0, pal.h - rows0.length)).fill('').concat(rows0);
    const pw = pal.w * S, ph = pal.h * S;
    /* walk about while busy, turn at the edges */
    if (WALKS.has(mood)) {
      x += face * (mood === 'run' ? 14 : 8) * dt;
      if (x + pw > W - 1) { x = W - 1 - pw; face = -1; }
      if (x < 1) { x = 1; face = 1; }
    }
    if (hop > 0) hop = Math.max(0, hop - dt * 1.4);
    const lift = Math.round(Math.abs(Math.sin(hop * Math.PI * 3)) * 3 * S * (hop > 0 ? 1 : 0));
    /* the scene: ground at the bottom, pal on it, room above for hops */
    const sceneRows = Math.ceil((ph + 4 * S + 1) / 2) + 1, px = Array.from({ length: sceneRows * 2 }, () => Array(W).fill(null));
    const groundY = sceneRows * 2 - 2;
    for (let c = 0; c < W; c++) if ((c + Math.floor((now - t0) / 400)) % 4 !== 0 || !WALKS.has(mood)) px[groundY + 1][c] = c % 2 ? [74, 66, 92] : [58, 52, 74];
    const ox = Math.round(x), oy = groundY + 1 - ph - lift;
    for (let yy = 0; yy < pal.h; yy++) for (let xx = 0; xx < pal.w; xx++) {
      const sx = face > 0 ? xx : pal.w - 1 - xx, col = PAL[(fr[yy] || '')[sx]];
      if (!col) continue;
      const c2 = flash > 0 && flash % 2 ? [255, 93, 115] : col;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) { const X = ox + xx * S + a, Y = oy + yy * S + b; if (X >= 0 && X < W && Y >= 0 && Y < px.length) px[Y][X] = c2; }
    }
    if (flash > 0 && Math.random() < .5) flash--;
    const lines = [];
    for (let r = 0; r < sceneRows; r++) {
      let s = '', cur = '';
      for (let c = 0; c < W; c++) {
        const t = px[r * 2][c], u = px[r * 2 + 1][c];
        let ch = ' ', code;
        if (t && u) { ch = '▀'; code = SGR(t, u); } else if (t) { ch = '▀'; code = SGR(t, null); } else if (u) { ch = '▄'; code = SGR(u, null); } else code = SGR(null, null);
        if (code !== cur) { s += code; cur = code; }
        s += ch;
      }
      lines.push(s + R);
    }
    /* the speech bubble, over the pal's head */
    const msg = short(text, Math.max(8, W - 6)), bw = [...msg].length + 4;
    const bx = Math.max(0, Math.min(W - bw, Math.round(ox + pw / 2 - bw / 2))), tail = Math.max(1, Math.min(bw - 2, Math.round(ox + pw / 2) - bx));
    const pad = s => ' '.repeat(bx) + s;
    const tone = mood === 'oops' ? '\x1b[38;2;255;93;115m' : mood === 'done' ? '\x1b[38;2;198;244;50m' : mood === 'wait' ? '\x1b[38;2;255;210;63m' : '\x1b[38;2;220;214;232m';
    const bubble = [pad(`${tone}╭${'─'.repeat(bw - 2)}╮${R}`), pad(`${tone}│ ${R}${msg}${tone} │${R}`), pad(`${tone}╰${'─'.repeat(tail - 1)}┬${'─'.repeat(Math.max(0, bw - 2 - tail))}╯${R}`)];
    /* header and stats */
    const lv = level(stats.xp), need = Math.pow(lv, 2) * 25, prev = Math.pow(lv - 1, 2) * 25, bar = Math.round((stats.xp - prev) / Math.max(1, need - prev) * 10);
    const head = ` \x1b[38;2;${LIME.join(';')}m■${R} \x1b[1m${pal.name}${R}${DIM} · ${agent ? (agent === 'codex' ? 'Codex' : 'Claude Code') + (project ? ' · ' + short(project, 26) : '') : 'looking for an agent'}${R}`;
    const foot = ` ${DIM}lvl${R} ${lv} \x1b[38;2;${LIME.join(';')}m${'▰'.repeat(bar)}${R}${DIM}${'▱'.repeat(10 - bar)}  ${stats.turns} turns · ${stats.tools} tools · ${stats.oops} oops${R}`;
    const body = [head, '', ...bubble, ...lines, foot];
    const top = Math.max(0, H - body.length);
    out.write('\x1b[H' + Array(top).fill('\x1b[K').concat(body.map(l => l + '\x1b[K')).slice(0, H).join('\n') + '\x1b[J');
  };

  if (!out.isTTY) { console.error('Run the pet in a terminal (a split pane next to your agent is perfect).'); process.exit(1); }
  if (!TEST) out.write('\x1b[?1049h\x1b[?25l');
  const bye = () => { out.write('\x1b[?25h\x1b[?1049l'); fs.writeFileSync(STATS_F, JSON.stringify(stats)); process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
  if (TEST) setTimeout(() => { process.stdout.write(lastFrame + '\n'); process.exit(0); }, +process.env.PIIXPAL_PET_MS || 1500);
  else if (process.stdin.isTTY) { process.stdin.setRawMode(true); process.stdin.on('data', d => { const k = d.toString(); if (k === 'q' || k === '\x03') bye(); if (k === 'p') { hop = 1; set('done', 'hi!'); } }); }
  out.on('resize', () => out.write('\x1b[2J'));
  startWatching(); ping();
  setInterval(ping, 250);
  setInterval(draw, 1000 / 12);
}
