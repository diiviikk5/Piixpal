/* The agent watcher, shared by the terminal pet (pet/src.mjs) and the desktop pet (desktop/):
 * finds the live Claude Code or Codex session from the logs they write, and turns each new log
 * line into an event: { kind: think | read | edit | run | oops | done, text, tool?, done?, prompt? }. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();

/* ---------- what the agent is doing, from its session log ---------- */
const base = p => path.basename(String(p || ''));
export const short = (s, n = 38) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const READS = /^(cat|less|head|tail|rg|grep|ls|dir|find|sed -n|Get-Content|type|tree|git (log|show|diff|status))\b/;
export const toolEvent = (name, input = {}) => {
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
export const parseClaude = j => {
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
export const parseCodex = j => {
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
export const newest = (AGENT = 'auto') => {
  const c = AGENT === 'codex' ? [] : list(path.join(HOME, '.claude', 'projects'), 1).map(f => ['claude', f]);
  const x = AGENT === 'claude' ? [] : codexFiles().map(f => ['codex', f]);
  let best = null;
  for (const [agent, f] of [...c, ...x]) { let t; try { t = fs.statSync(f).mtimeMs; } catch { continue; } if (!best || t > best.t) best = { agent, f, t }; }
  return best;
};


/* follow the newest session as it's written: onEvent(e) for each event, onSwitch({ agent, file, project }) when it changes */
export const watchAgents = ({ agent: AGENT = 'auto', onEvent, onSwitch }) => {
  let file = null, agent = null, offset = 0, partial = '';
  const projectOf = f => {
    try {
      const fd = fs.openSync(f, 'r'), b = Buffer.alloc(65536), n = fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd);
      const m = /"cwd":\s*"((?:[^"\\]|\\.)+)"/.exec(b.toString('utf8', 0, n));
      return m ? path.basename(JSON.parse('"' + m[1] + '"').replace(/[\\/]+$/, '').replace(/\\/g, '/')) : '';
    } catch { return ''; }
  };
  const follow = () => {
    const n = newest(AGENT);
    if (n && n.f !== file) {
      file = n.f; agent = n.agent; partial = '';
      try { offset = fs.statSync(file).size; } catch { offset = 0; }
      onSwitch && onSwitch({ agent, file, project: projectOf(file) });
    }
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
  follow();
  const t1 = setInterval(follow, 2000), t2 = setInterval(read, 250);
  return () => { clearInterval(t1); clearInterval(t2); };
};
