// "Pets for coding agents" (components/agents.html): the terminal pet for Claude Code and Codex.
// The pet itself is pet/src.mjs, built into pet/piixpal-pet.mjs and ./pet.mjs by scripts/pet.mjs.
export const agentsBody = (esc, pets) => `<header class="doc-head">
  <div class="crumbs"><a href="./">Components</a><span>/</span><span>Agent pets</span></div>
  <h1>A pet for your coding agent</h1>
  <p>Put a pixel pet in a terminal pane next to <b>Claude Code</b> or <b>Codex</b>. It watches your agent work, live: it paces while it thinks, sniffs about while it reads your files, gets busy while it edits, panics when a command fails, cheers when the turn is done, and falls asleep when you wander off. It levels up as your agent ships.</p>
  <div class="pills"><a class="btn btn-lime" href="#install">Get it running</a> <a class="btn" href="#statusline">Status line</a> <a class="btn" href="#pets">The pets</a></div>
</header>
<style>
.ag-shot{width:100%;height:auto;display:block;border-radius:14px;border:2px solid var(--ink);background:#16131d;margin:0 0 36px}
.ag-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.ag-moods{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:14px}
.ag-moods div{border:2px solid var(--ink);border-radius:12px;padding:12px;background:var(--paper);font-size:15px}
.ag-moods b{display:block;font:800 15px/1.2 var(--f-sans);margin-bottom:3px}
.ag-pets{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ag-pets code{font-size:14px}
</style>
<img class="ag-shot" src="../site/agent-pets.png" alt="Six terminal panes: a beetle pacing while the agent thinks, a cat reading colors.ts, a triangle editing Toggle.tsx, a penguin running npm test, a red jelly saying that didn't work, a duckling cheering done" width="1960" height="760" loading="lazy">

<section class="doc-sec" id="install" aria-labelledby="a1"><h2 id="a1">Get it running</h2>
  <p>Split your terminal (Windows Terminal: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> · iTerm: <kbd>Cmd</kbd>+<kbd>D</kbd> · tmux: <kbd>Ctrl</kbd>+<kbd>B</kbd> <kbd>%</kbd> · VS Code: the split button on the terminal), run your agent in one half and this in the other:</p>
  <pre class="codebox"><button class="copy" type="button" data-copy="npx piixpal-pet">Copy</button>npx piixpal-pet</pre>
  <p>Or grab the single file (no npm needed, just Node 18+):</p>
  <div class="ag-two">
    <pre class="codebox"><button class="copy" type="button" data-copy="curl -fsSL https://piixpal.dvkk.dev/pet.mjs -o pet.mjs &amp;&amp; node pet.mjs">Copy</button># macOS, Linux, Git Bash
curl -fsSL https://piixpal.dvkk.dev/pet.mjs -o pet.mjs
node pet.mjs</pre>
    <pre class="codebox"><button class="copy" type="button" data-copy="iwr https://piixpal.dvkk.dev/pet.mjs -OutFile pet.mjs; node pet.mjs">Copy</button># Windows PowerShell
iwr https://piixpal.dvkk.dev/pet.mjs -OutFile pet.mjs
node pet.mjs</pre>
  </div>
  <p>No setup: it finds whichever session was active last, Claude Code or Codex, by reading the logs they already write (<code>~/.claude/projects</code>, <code>~/.codex/sessions</code>). Nothing leaves your machine. Press <kbd>p</kbd> to pet it, <kbd>q</kbd> to quit.</p>
  <div class="ag-moods">
    <div><b>Thinking</b>paces up and down while the agent works it out</div>
    <div><b>Reading</b>sniffs about: "reading colors.ts"</div>
    <div><b>Editing</b>gets busy: "editing Toggle.tsx"</div>
    <div><b>Running</b>runs about: "running npm test"</div>
    <div><b>Oops</b>panics, flashes red, when a command fails</div>
    <div><b>Done</b>cheers and hops when the turn is finished</div>
    <div><b>Needs you</b>waves and rings the bell (with the hook below)</div>
    <div><b>Asleep</b>dozes off when nothing's happened for a while</div>
  </div>
</section>

<section class="doc-sec" id="pets" aria-labelledby="a2"><h2 id="a2">The pets</h2>
  <p>Pick one with <code>--pal</code>; it remembers. <code>npx piixpal-pet list</code> draws them all in your terminal.</p>
  <div class="ag-pets">${pets.map(p => `<code>--pal ${esc(p)}</code>`).join(' ')}</div>
  <p style="margin-top:14px">Or bring your own: make a pal in the <a href="make.html">Pal Maker</a>'s <b>Pixel</b> tab, copy its code, and run <code>npx piixpal-pet --make &lt;code&gt;</code>. Your pet, watching your agent.</p>
</section>

<section class="doc-sec" id="statusline" aria-labelledby="a3"><h2 id="a3">In Claude Code's status line</h2>
  <p>No room for a pane? Put a one-line pet in Claude Code's status line. Add this to <code>~/.claude/settings.json</code> (point it at where you saved <code>pet.mjs</code>, or use <code>npx -y piixpal-pet statusline</code>):</p>
  <pre class="codebox"><button class="copy" type="button" data-copy="${esc('"statusLine": { "type": "command", "command": "node ~/pet.mjs statusline" }')}">Copy</button>"statusLine": { "type": "command", "command": "node ~/pet.mjs statusline" }</pre>
  <p>It shows the pet's face and what the agent is up to: <code>(•̀ᴗ•́)✎ bitbug editing app.ts</code>.</p>
</section>

<section class="doc-sec" id="hooks" aria-labelledby="a4"><h2 id="a4">Let it tell you when the agent needs you</h2>
  <p>Optional. When the agent stops to ask permission, the pet waves and rings the terminal bell, so you can look away while it works.</p>
  <div class="ag-two">
    <div><p><b>Claude Code</b>: a Notification hook in <code>~/.claude/settings.json</code></p>
    <pre class="codebox">"hooks": {
  "Notification": [{ "hooks": [
    { "type": "command", "command": "node ~/pet.mjs notify" }
  ] }]
}</pre></div>
    <div><p><b>Codex</b>: in <code>~/.codex/config.toml</code></p>
    <pre class="codebox">notify = ["node", "/home/you/pet.mjs", "notify"]</pre></div>
  </div>
</section>`;
