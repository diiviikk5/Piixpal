# piixpal-pet

A pixel pet for your coding agent. Run it in a terminal pane next to **Claude Code** or **Codex** and it watches the session live: it paces while the agent thinks, sniffs about while it reads files, gets busy while it edits, panics when a command fails, cheers when the turn is done, and falls asleep when you wander off. It levels up as your agent works.

```sh
npx piixpal-pet
```

No setup and no dependencies: it reads the session logs both tools already write (`~/.claude/projects`, `~/.codex/sessions`). Nothing leaves your machine.

- `--pal kitty` pick a pet (`npx piixpal-pet list` shows them all; it remembers)
- `--make <code>` a pixel pal you made at https://piixpal.dvkk.dev/components/make
- `--agent claude|codex` only watch one
- `statusline` a one-line pet for Claude Code's status line
- `notify` from a hook, so the pet tells you when the agent needs you

Press `p` to pet it, `q` to quit. More at https://piixpal.dvkk.dev/components/agents
