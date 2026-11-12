#!/usr/bin/env node
/* npx piixpal-pal: installs the piixpal-pal agent skill for Claude Code, Codex and other agents that read SKILL.md folders.
 *   npx piixpal-pal                 every agent skills folder found on this machine (Claude Code: ~/.claude/skills)
 *   npx piixpal-pal --to ./skills   a folder of your choice
 *   npx piixpal-pal --claude | --codex */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2), flag = n => argv.includes('--' + n);
const to = argv.indexOf('--to') >= 0 ? argv[argv.indexOf('--to') + 1] : null;
const home = os.homedir();
const targets = to ? [to]
  : flag('claude') ? [path.join(home, '.claude', 'skills')]
  : flag('codex') ? [path.join(home, '.codex', 'skills')]
  : [['.claude', 'skills'], ['.codex', 'skills'], ['.agents', 'skills']].map(p => path.join(home, ...p)).filter(d => fs.existsSync(path.dirname(d)));
if (!targets.length) targets.push(path.join(home, '.claude', 'skills'));
const SKIP = new Set(['bin', 'package.json', 'node_modules']);
const copy = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { if (a === here && SKIP.has(f)) continue; const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copy(s, d) : fs.copyFileSync(s, d); } };
for (const t of targets) { const dest = path.join(t, 'piixpal-pal'); copy(here, dest); console.log('installed ->', dest); }
console.log('\nNow ask your agent: "Make me a pixel frog mascot for my site header"\nBy hand: node ' + path.join(targets[0], 'piixpal-pal', 'scripts', 'pal.mjs') + ' new tofu --from critter');
