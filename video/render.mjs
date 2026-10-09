// node video/render.mjs                 -> video/out/piixpal-launch.mp4 (with the soundtrack from music.mjs)
// node video/render.mjs --stills 4,8.5  -> video/out/still-4.png, still-8.5.png
// node video/render.mjs --cues          -> video/out/cues.json only (the sound effects' timings, for music.mjs)
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { serve, browser, sleep } from './edge.mjs';

