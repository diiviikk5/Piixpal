# A pal as a pet for Claude Code, Codex, or any terminal

The pet is one file, `pet.mjs` (Node 18+, no dependencies). It reads the session logs Claude Code (`~/.claude/projects`) and Codex (`~/.codex/sessions`) already write, and reacts: paces while the agent thinks, looks about while it reads, gets busy on edits, panics on a failed command, cheers when the turn ends, sleeps when you leave. Nothing leaves the machine.

## Set it up
```
node scripts/pal.mjs pet <name>.pal.json
```
- saves the pal to `~/.piixpal-pet/pals/<name>.json` and makes it the active pet;
- downloads the pet to `~/.piixpal-pet/pet.mjs` if it isn't there (`--update` fetches it again).

Then, in a terminal pane beside the agent:
```
node ~/.piixpal-pet/pet.mjs                  watches whichever agent was active last
node ~/.piixpal-pet/pet.mjs --agent codex    only Codex (or claude)
node ~/.piixpal-pet/pet.mjs --pal <name>     switch pets (yours or a built-in; `list` shows them)
node ~/.piixpal-pet/pet.mjs --file x.pal.json   try a pal file without saving it
```
`p` pets it, `q` quits. It is a plain terminal program, so it works in any terminal, tmux or IDE pane, with or without an agent.

## Claude Code: status line and notifications
`node scripts/pal.mjs agents` prints what to add; `--write` merges it into `~/.claude/settings.json` (a `.bak` is kept; an existing status line is left alone).

```json
{
  "statusLine": { "type": "command", "command": "node \"~/.piixpal-pet/pet.mjs\" statusline" },
  "hooks": {
    "Notification": [{ "hooks": [{ "type": "command", "command": "node \"~/.piixpal-pet/pet.mjs\" notify wait" }] }],
    "Stop":         [{ "hooks": [{ "type": "command", "command": "node \"~/.piixpal-pet/pet.mjs\" notify done" }] }]
  }
}
```
- **Status line:** the pal's face in its own colour, its name, and what the agent is doing, on the line under the prompt.
- **Notification hook:** when Claude Code needs the person (a permission prompt, a question), the pet in the pane perks up and rings the terminal bell.
- **Stop hook:** the pet celebrates the end of the turn at once.

Use the full path the tool prints (it expands `~` for the platform); on Windows that is `C:/Users/<you>/.piixpal-pet/pet.mjs`.

## Codex
Add to `~/.codex/config.toml` (the tool prints the exact line, and `--write` adds it if there is no `notify` yet):
```toml
notify = ["node", "/full/path/to/.piixpal-pet/pet.mjs", "notify"]
```
The pane pet needs no setup for Codex: it follows the newest session log by itself.

## Ask first
`agents --write` changes the person's agent settings. Show them what it will add (`agents` with no flag) and get a yes before writing.

## If something is off
| symptom | cause and fix |
|---|---|
| `No pet called "x"` | the pal wasn't saved: run `pal.mjs pet x.pal.json`, or use `--file` |
| blocks instead of a picture | the terminal lacks 24-bit colour or the font lacks half-blocks: use Windows Terminal, iTerm2, kitty, WezTerm, or VS Code's terminal |
| the pet sits idle while the agent works | no session log found: start the agent first, or pass `--agent claude` / `--agent codex` |
| the pal is squashed | very wide terminals scale it up: `--scale 1` or `--scale 2` |
| status line shows nothing | Claude Code needs a restart after `settings.json` changes; test with `echo {} | node ~/.piixpal-pet/pet.mjs statusline` |
