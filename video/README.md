# The launch film

A 38-second launch film drawn entirely in code: the real pals from `src/`, a canvas stage, and a chiptune score synthesised from scratch. No screenshots or stock footage.

```bash
node video/render.mjs --cues    # the film's sound cues -> video/out/cues.json
node video/music.mjs            # the score + effects    -> video/out/music.wav
node video/render.mjs           # every frame, with sound -> video/out/piixpal-launch.mp4
```

Needs Microsoft Edge (set `EDGE` to use another Chromium) and `ffmpeg` on your PATH. To watch it live while editing, serve the repo and open `video/launch.html` (`?t=12` jumps to 12s).
Stills for review: `node video/render.mjs --stills 4,9.5,20`.
