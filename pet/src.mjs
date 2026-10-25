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

/* ---------- what the agent is doing, from its session log ---------- */
const base = p => path.basename(String(p || ''));
const short = (s, n = 38) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const READS = /^(cat|less|head|tail|rg|grep|ls|dir|find|sed -n|Get-Content|type|tree|git (log|show|diff|status))\b/;
const toolEvent = (name, input = {}) => {
  const n = String(name || '');
  if (/^(Read|NotebookRead)$/.test(n)) return { kind: 'read', text: 'reading ' + base(input.file_path) };
  if (/^(Grep|Glob|LS)$/.test(n)) return { kind: 'read', text: 'looking for ' + short(input.pattern || input.path, 24) };
  if (/^(WebFetch|WebSearch)$/.test(n) || /browser|navigate|fetch/i.test(n)) return { kind: 'read', text: 'browsing the web' };
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(n)) return { kind: 'edit', text: (n === 'Write' ? 'writing ' : 'editing ') + base(input.file_path || input.notebook_path) };
  if (/^(Task|Agent)$/.test(n)) return { kind: 'think', text: 'sent a helper off' };
  if (/^TodoWrite$/.test(n)) return { kind: 'think', text: 'making a plan' };
  if (/apply_patch/.test(n) || /^\*\*\* Begin Patch/.test(input.input || '')) {
    const f = /\*\*\* (?:Update|Add) File: (.+)/.exec(input.input || input.patch || '');
    return { kind: 'edit', text: 'editing ' + base(f ? f[1] : 'files') };
  }
  /* shells: Claude's Bash, Codex's shell / exec_command / exec */
  const c = input.command != null ? (Array.isArray(input.command) ? input.command.join(' ') : input.command) : input.cmd || input.input || input.description || '';
  const line = String(c).replace(/^(bash|sh|powershell|pwsh)\s+(-lc|-c|-Command)\s+/, '').replace(/^["']|["']$/g, '');
  if (READS.test(line)) return { kind: 'read', text: short(line) };
  if (/^(Bash|shell|exec_command|exec|local_shell|PowerShell)$/i.test(n) || line) return { kind: 'run', text: line ? 'running ' + short(line, 32) : 'running a command' };
  return { kind: 'run', text: 'using ' + short(n.replace(/^mcp__[^_]+__/, ''), 28) };
};
/* one log line -> an event (or null) */
const parseClaude = j => {
  if (j.isSidechain) return null;
  const c = j.message && j.message.content;
  if (j.type === 'user') {
    if (typeof c === 'string') return j.isMeta ? null : { kind: 'think', text: 'thinking…', prompt: true };
    if (Array.isArray(c)) {
      const r = c.find(x => x.type === 'tool_result');
      if (r) return r.is_error ? { kind: 'oops', text: 'that didn’t work…' } : null;
      if (c.some(x => x.type === 'text')) return { kind: 'think', text: 'thinking…', prompt: true };
    }
    return null;
  }
  if (j.type === 'assistant' && Array.isArray(c)) {
    const tools = c.filter(x => x.type === 'tool_use');
    if (tools.length) { const t = tools[tools.length - 1]; return { ...toolEvent(t.name, t.input || {}), tool: true }; }
    if (j.message.stop_reason === 'end_turn') return { kind: 'done', text: 'done! ✓', done: true };
    if (c.some(x => x.type === 'thinking')) return { kind: 'think', text: 'thinking…' };
  }
  return null;
};
const parseCodex = j => {
  const p = j.payload || {};
  if (j.type === 'event_msg') {
    if (p.type === 'task_started' || p.type === 'user_message') return { kind: 'think', text: 'thinking…', prompt: true };
    if (p.type === 'task_complete') return { kind: 'done', text: 'done! ✓', done: true };
    if (p.type === 'exec_command_end' && p.exit_code) return { kind: 'oops', text: 'that didn’t work…' };
    if (p.type === 'agent_reasoning') return { kind: 'think', text: 'thinking…' };
    return null;
  }
  if (j.type === 'response_item') {
    if (p.type === 'function_call' || p.type === 'custom_tool_call' || p.type === 'local_shell_call') {
      let input = {};
      try { input = p.arguments ? JSON.parse(p.arguments) : {}; } catch { input = { input: p.arguments }; }
      if (p.input) input.input = p.input;
      if (p.action && p.action.command) input.command = p.action.command;
      if (p.name === 'wait') return null;
      return { ...toolEvent(p.name || 'shell', input), tool: true };
    }
    if (/_output$/.test(p.type || '')) {
      const out = Array.isArray(p.output) ? p.output.map(o => o.text || '').join('') : String(p.output || '');
      if (/(exit code|exited with code|Exit code):?\s*[1-9]/i.test(out) || /"exit_code":\s*[1-9]/.test(out)) return { kind: 'oops', text: 'that didn’t work…' };
    }
  }
  return null;
};

/* ---------- finding the live session ---------- */
const list = (dir, depth, out = []) => {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && depth > 0) list(p, depth - 1, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
};
/* Codex keeps sessions by date: only look at the last few days */
const codexFiles = () => {
  const root = path.join(HOME, '.codex', 'sessions'), out = [];
  const kids = d => { try { return fs.readdirSync(d).sort().reverse(); } catch { return []; } };
  for (const y of kids(root).slice(0, 2)) for (const m of kids(path.join(root, y)).slice(0, 2)) for (const d of kids(path.join(root, y, m)).slice(0, 3)) list(path.join(root, y, m, d), 0, out);
  return out;
};
const newest = () => {
  const c = AGENT === 'codex' ? [] : list(path.join(HOME, '.claude', 'projects'), 1).map(f => ['claude', f]);
  const x = AGENT === 'claude' ? [] : codexFiles().map(f => ['codex', f]);
  let best = null;
  for (const [agent, f] of [...c, ...x]) { let t; try { t = fs.statSync(f).mtimeMs; } catch { continue; } if (!best || t > best.t) best = { agent, f, t }; }
  return best;
};

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
  let mood = 'idle', text = 'waiting for your agent…', moodAt = Date.now(), lastEvent = Date.now(), agent = null, file = null, offset = 0, partial = '';
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
  /* follow the newest session file, from its end */
  /* which project the session is in: the first "cwd" in its log */
  let project = '';
  const projectOf = f => {
    try { const fd = fs.openSync(f, 'r'), b = Buffer.alloc(65536), n = fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd); const m = /"cwd":\s*"((?:[^"\\]|\\.)+)"/.exec(b.toString('utf8', 0, n)); return m ? path.basename(JSON.parse('"' + m[1] + '"').replace(/[\\/]+$/, '').replace(/\\/g, '/')) : ''; } catch { return ''; }
  };
  const follow = () => {
    const n = newest();
    if (n && n.f !== file) { file = n.f; agent = n.agent; try { offset = fs.statSync(file).size; } catch { offset = 0; } partial = ''; project = projectOf(file); set('idle', `watching ${agent === 'codex' ? 'Codex' : 'Claude Code'}`); }
  };
  const read = () => {
    if (!file) return;
    let size;
    try { size = fs.statSync(file).size; } catch { return; }
    if (size < offset) offset = 0;
    if (size === offset) return;
    const fd = fs.openSync(file, 'r'), len = Math.min(size - offset, 4 << 20), buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset); fs.closeSync(fd);
    offset += len;
    const lines = (partial + buf.toString('utf8')).split('\n');
    partial = lines.pop();
    for (const l of lines) {
      if (!l.trim()) continue;
      let j; try { j = JSON.parse(l); } catch { continue; }
      const e = agent === 'codex' ? parseCodex(j) : parseClaude(j);
      if (e) onEvent(e);
    }
  };
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
  follow(); ping();
  setInterval(follow, 2000);
  setInterval(() => { read(); ping(); }, 250);
  setInterval(draw, 1000 / 12);
}
