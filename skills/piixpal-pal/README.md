# piixpal-pal

An agent skill that makes a custom animated pixel character ("pal") from a description, then puts it to work: on a website with [Piixpal](https://piixpal.dvkk.dev), or as a terminal pet that watches Claude Code or Codex.

You (or your agent) draw **one frame**. The bundled tool animates it (blink, breathe, walk, hop, happy, sleep, look, scared), checks it, draws it in the terminal, and exports it.

## Install
Claude Code:
```bash
git clone https://github.com/diiviikk5/Piixpal /tmp/piixpal && cp -r /tmp/piixpal/skills/piixpal-pal ~/.claude/skills/
```
Codex, Cursor and other agents that read `SKILL.md` folders: copy the folder into their skills directory. No agent at all? The tool works by hand: `node scripts/pal.mjs`.

## Use
> "Make me a pixel frog mascot for my site's header"
> "I want a little robot pet that sits in my terminal while Claude Code works"

## By hand, in 30 seconds
```bash
node scripts/pal.mjs new tofu --from critter --color "#ffb054"   # six archetypes: blob critter bird bot ghost shroom
node scripts/pal.mjs show tofu.pal.json                          # every clip, in the terminal
node scripts/pal.mjs export tofu.pal.json out                    # tofu.pal.js + sprite sheet + live test page
node scripts/pal.mjs pet tofu.pal.json                           # your terminal pet for Claude Code / Codex
node scripts/pal.mjs agents                                      # status line + notification setup
```

## What's inside
| File | What it is |
|---|---|
| `SKILL.md` | the workflow |
| `scripts/pal.mjs` | the tool: new, animate, check, show, export, pet, agents (Node 18+, no dependencies) |
| `references/craft.md` | how to draw a pal that reads at 14 pixels |
| `references/format.md` | the pal file, the clips, the behaviours |
| `references/agents.md` | Claude Code, Codex and plain-terminal setup |
| `examples/ribbit.pal.json` | a worked example: a frog, drawn from the critter archetype |

MIT.
