// node video/music.mjs -> video/out/music.wav
// The soundtrack, synthesised from nothing: a 120 BPM chiptune score plus sound effects placed
// on the film's own cues (video/out/cues.json, written by render.mjs --cues).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

