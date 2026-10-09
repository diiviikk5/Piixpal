// node video/music.mjs -> video/out/music.wav
// The soundtrack, synthesised from nothing: a 120 BPM chiptune score plus sound effects placed
// on the film's own cues (video/out/cues.json, written by render.mjs --cues).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');
const SR = 44100, DUR = 38, N = SR * DUR, BEAT = .5;
const L = new Float32Array(N), R = new Float32Array(N);
const cues = existsSync(join(OUT, 'cues.json')) ? JSON.parse(readFileSync(join(OUT, 'cues.json'), 'utf8')) : [];

