#!/usr/bin/env node
/* piixpal-pet: a pixel pet for your coding agent. It sits in a terminal pane next to Claude Code
 * or Codex and watches the session as it happens: it paces while the agent thinks, sniffs about
 * while it reads, gets busy while it edits, panics when a command fails, cheers when the turn is
 * done, and falls asleep when you leave. No setup: it reads the session logs both tools already
 * write (~/.claude/projects, ~/.codex/sessions), and nothing leaves your machine.
 *
 *   node pet.mjs                    watch whichever agent was active last
 *   node pet.mjs --pal kitty        pick a pet (node pet.mjs list shows them all)
 *   node pet.mjs --make AQ4M…       a pixel pal you made at piixpal.dvkk.dev/components/make
 *   node pet.mjs --agent codex      only watch Codex (or claude)
 *   node pet.mjs --scale 1|2        pixel size (default: fits the pane)
 *   node pet.mjs statusline         a one-line pet for Claude Code's status line
 *   node pet.mjs notify [kind]      from a hook: tell the pet the agent needs you
 *
 * Built from Piixpal (https://piixpal.dvkk.dev) by scripts/pet.mjs. MIT. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PALS = {"bitbug":{"w":16,"h":11,"palette":{"k":"#1b1226","g":"#b8f23a","G":"#efffc0","d":"#6a9c1c","s":"#3f6b10","h":"#3a2a55","w":"#ffffff","p":"#ff7aa8"},"frames":{"walk":[["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....",".k...k...k......"],["..............k.","...kkkkkk.....k.",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","...k...k...k...."]],"idle":[["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhhhk","kdggggsggddkhkkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."]],"look":[["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwkk","kdggggsggddkhwwk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["..............k.","...kkkkkk.....k.",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwkk","kdggggsggddkhwwk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["............k...","...kkkkkk....k..",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhkwk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["............k...","...kkkkkk....k..",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhkwk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."]],"sniff":[["................","...kkkkkk.......",".kkGGggggkk....k","kGGggsggggdk.kk.","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["................","...kkkkkk.......",".kkGGggggkk....k","kGGggsggggdk.kk.","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....",".k...k...k......"],["................","...kkkkkk.......",".kkGGggggkk....k","kGGggsggggdk.kk.","kGgggggsggdkkkk.","kgsggggggddkhhhk","kdggggsggddkhkkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["..............k.","...kkkkkk.....k.",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkhwwk","kdggggsggddkhwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."]],"alarm":[["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkwwkk","kdggggsggddkwwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.","..k...k...k.....","..k...k...k....."],["..............k.","...kkkkkk.....k.",".kkGGggggkk..k..","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkwwkk","kdggggsggddkwwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.",".k.k.k.k.k......"]],"hop":[["...............k","...kkkkkk.....k.",".kkGGggggkk...k.","kGGggsggggdk.k..","kGgggggsggdkkkk.","kgsggggggddkwwkk","kdggggsggddkwwkk","kddddddddddkhhpk",".kkkkkkkkkkkkkk.",".k.k.k.k.k......"]],"flip":[[".k...k...k......","..k...k...k.....",".kkkkkkkkkkkkkk.","kddddddddddkhhpk","kdggggsggddkhkkk","kgsggggggddkhhhk","kGgggggsggdkkkk.","kGGggsggggdk....",".kkGGggggkk.....","...kkkkkk......."],["...k...k...k....","..k...k...k.....",".kkkkkkkkkkkkkk.","kddddddddddkhhpk","kdggggsggddkhkkk","kgsggggggddkhhhk","kGgggggsggdkkkk.","kGGggsggggdk....",".kkGGggggkk.....","...kkkkkk......."]]},"fps":{"walk":10,"idle":3,"look":2,"sniff":4,"alarm":12,"flip":12,"hop":1}},"pip":{"w":14,"h":13,"palette":{"k":"#1b1226","y":"#ffd23f","W":"#e89b12","w":"#ffffff","o":"#ff7a2f"},"frames":{"idle":[["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyyykk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"]],"look":[["......kkkk....",".....kyyyyk...","....kyyyykyk..","....kyyywkkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyykyk..","....kyyywkkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"]],"peck":[["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykk..","..kyyyyyyyykoo","kkyyWWWyyyykoo","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykk..","..kyyyyyyyykoo","kkyyWWWyyyykoo","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyWWWyyyyk..","kyyWWWWWyyyk..",".kyyWWWyyyyk..","..kyyyyyyyk...","...kkkkkkk....","....o..o......"]],"fly":[["......kkkk....",".....kyyyyk...","...kk..yyyyk..","..kWWk.yywkk..","..kWWWkyyykkoo","...kWWkyyyyoo.","kkyyyyWyyyyk..","kyyyyyyyyyyk..",".kyyyyyyyyyk..","..kyyyyyyyk...","...kkkkkkk....",".............."],["......kkkk....",".....kyyyyk...","....kyyyyyyk..","....kyyyywkk..","...kyyyyyykkoo","..kyyyyyyyyoo.","kkyyyyWyyyyk..","kyyyyyyyyyyk..",".kyyyyyyyyyk..","..kkWWWkyyk...","...kkWkkkk....",".....k........"]]},"fps":{"idle":3,"look":2,"peck":8,"fly":12}},"boing":{"w":14,"h":12,"palette":{"k":"#1b1226","c":"#ff6b4a","H":"#ffd4c4","d":"#cf3f22","p":"#ffb3a0","w":"#ffffff"},"frames":{"idle":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccwkccwkccck","kccckkcckkccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."],[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccwkccwkccck","kccckkcckkccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."],[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccwkccwkccck","kccckkcckkccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."],[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccccccccccck","kccckkcckkccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"air":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccwkccwkccck","kccckkcckkccck","kcpccckkccccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"rise":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kccckkcckkccck","kcccwkccwkccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"land":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kccckkcckkccck","kcccccccccccck","kcpccckkccccpk","kdccccccccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"held":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccwkccwkccck","kccckkcckkccck","kcpccckckcccpk","kdccckckccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."],[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kcccccccccccck","kccckkcckkccck","kcpccckckcccpk","kdccckckccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"dizzy":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kccckccckcccck","kcccckccckccck","kcpccckckcccpk","kdccckckccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."],[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kccckccckcccck","kcccckccckccck","kcpccckkccccpk","kdccccccccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]],"happy":[[".....kkkk.....","...kkcccckk...","..kcHHccccck..",".kcHHccccccck.",".kcHcccccccck.","kccckkcckkccck","kcccccccccccck","kcpcckcckcccpk","kdcccckkccccdk","kddccccccccddk",".kddddddddddk.","..kkkkkkkkkk.."]]},"fps":{"idle":3,"held":8,"dizzy":6}},"moss":{"w":16,"h":16,"palette":{"k":"#1b1226","v":"#8a6bff","V":"#cbbcff","w":"#fffdf5","b":"#ffe6c4","R":"#25b89a","y":"#ffd23f"},"frames":{"read":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."]],"flip":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbwwbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbwwkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."],["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbkkbbbbkkbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kRRRRRRRRRRRRk.",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."]],"look":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbwkbbbbwkbk..","..kbbbbbbbbbbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."]],"doze":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."]],"annoyed":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbkbbbbbbkbk..","..kbbkbbbbkbbk..","..kbbbbbbbbbbk..",".kkkkkkkkkkkkkk.","bkRRRRRRRRRRRRkb","bkRyyyyyRRRRRRkb",".kkkkkkkkkkkkkk.","...kbbbbbbbbk...","..kkkk....kkkk.."]],"back":[["....kkkkkkkk....","..kkvvvvvvvvkk..",".kvvVVvvvvwwvvk.","kvvVVvvvvvwwvvvk","kvwwvvvvvvvvvvvk","kvwwvvvvvwwvvvvk","kkkkkkkkkkkkkkkk","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..",".bkbbbbbbbbbbkb.","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","...kbbbbbbbbk...","..kkkk....kkkk.."]]},"fps":{"read":1,"flip":7,"doze":1}},"kitty":{"w":18,"h":9,"palette":{"k":"#17121f","b":"#2b2436","w":"#c6f432","p":"#ff9cc2"},"frames":{"rest":[["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."],["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."],["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk..k","kbbbbbbbbbbbbbb.kk",".kbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbb..",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."],["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."]],"swat":[["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..","kkbbbbbbbbbbbbbbkk","kbkbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."],["..k.k.............",".kkkkk............","kbwbbwk...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."]],"sleep":[["..k.k.............",".kkkkk............","kbkbbkb...........","kbbpbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."]],"purr":[["..k.k.............",".kkkkk............","kbkbbkb...........","kbppbbkkkkkkkkk...","kbbbbbbbbbbbbbbk..",".kbbbbbbbbbbbbbbkk",".kbbbbbbbbbbbbbbbk",".kkbbkkkkkkkkbbkk.","..kkk.......kkk..."]]},"fps":{"rest":3,"swat":7}},"penguin":{"w":12,"h":11,"palette":{"k":"#17121f","b":"#2b3a55","w":"#ffffff","o":"#ff9a2f"},"frames":{"walk":[["...kkkk.....","..kbbbbk....",".kbwkbwk....",".kbbooobk...",".kbwwwwbk...","kbbwwwwbbk..","kbbwwwwbbk..","kbbwwwwbbk..",".kbwwwwbk...","..kkkkkk....","..oo..oo...."],["...kkkk.....","..kbbbbk....",".kbwkbwk....",".kbbooobk...",".kbwwwwbk...","kbbwwwwbbk..","kbbwwwwbbk..","kbbwwwwbbk..",".kbwwwwbk...","..kkkkkk....","...oo..oo..."]],"idle":[["...kkkk.....","..kbbbbk....",".kbwkbwk....",".kbbooobk...",".kbwwwwbk...","kbbwwwwbbk..","kbbwwwwbbk..","kbbwwwwbbk..",".kbwwwwbk...","..kkkkkk....","..oo..oo...."]],"slide":[["............","............","............","............","............","............",".....kkkkk..","kkkkkbbbbbk.","kwwwwwwbwbkk","kwwwwwwwbbko",".kkkkkkkkkk."]]},"fps":{"walk":6}},"gecko":{"w":14,"h":7,"palette":{"k":"#17121f","g":"#7bd63a","G":"#d2ff8a","w":"#ffffff"},"frames":{"walk":[["....k.....k...","....kk....kk..","..kkggGggggwk.","kkgggggggggggk","..kkggGggggwk.","...kk....kk...","...k.....k...."],["...k.....k....","...kk....kk...","..kkggGggggwk.","kkgggggggggggk","..kkggGggggwk.","....kk....kk..","....k.....k..."]],"idle":[["....k.....k...","....kk....kk..","..kkggGggggwk.","kkgggggggggggk","..kkggGggggwk.","...kk....kk...","...k.....k...."]],"wag":[["....k.....k...","....kk....kk..","..kkggGggggwk.","kkgggggggggggk","..kkggGggggwk.","...kk....kk...","...k.....k...."],["....k.....k...","....kk....kk..","k.kkggGggggwk.",".kgggggggggggk","k.kkggGggggwk.","...kk....kk...","...k.....k...."]]},"fps":{"walk":10,"wag":8}},"tri":{"w":25,"h":20,"palette":{"b":"#000000","B":"#1d1d22","G":"#000000","r":"#5c5c66","e":"#ffffff","p":"#000000","m":"#ffffff","k":"#000000","w":"#ffffff","g":"#b4b4bf"},"frames":{"idle":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........reebbbeer........","......rrBeebbbeebrr......",".....rkrBeebbbeebrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbbmbbbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........reebbbeer........","......rrBeebbbeebrr......",".....rkrBeebbbeebrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbbmbbbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........reebbbeer........","......rrBeebbbeebrr......",".....rkrBeebbbeebrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbbmbbbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........rBbbbbbbr........","......rrBbbbbbbbbrr......",".....rkrBeebbbeebrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbbmbbbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."]],"left":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........",".......reebbbeebr........","......rreebbbeebbrr......",".....rkreebbbeebbrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbmbbbbbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."]],"right":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........rBeebbbeer.......","......rrBbeebbbeerr......",".....rkrBbeebbbeerkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbbbbmbbbbrkrrr.","rwwkrrBbbbbbbbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."]],"roll":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........rBbbbbbbr........",".......rBerbbbbebr.......",".......rBbebbbebbr.......","......rBbbbbbbbbbbr......",".....rBBbbbmmmbbbbbr.....",".....rBbbbbbbbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]],"air":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........",".rr.....reebbbeer.....rr.","rwwrrrr.reebbbeer.rrrrwwr","rwwkkkkrBeebbbeebrkkkkwwr","rgrrrrrrBeebbbeebrrrrrgr.",".r....rBbbbbbbbbbbr...r..",".....rBBbbbbmbbbbbbr.....",".....rBbbbbbmbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........",".rr.......rBbbr.......rr.","rwwr.....rBbbbbr.....rwwr","rwwkrr..reebbbeer..rrkwwr","rgrrkkr.reebbbeer.rkkrgr.",".r..rrkrBeebbbeebrkrr.r..","......rrBeebbbeebrr......","......rBbbbbbbbbbbr......",".....rBBbbbbmbbbbbbr.....",".....rBbbbbbmbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]],"happy":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr........","........rBbbbbbbr........","......r.rerbbrerbrr......",".....rkrerebberebrkr.....","....rkrBbbbbbbbbbbrkr....",".rrrkrBBbbbmrmbbbbbrkrrr.","rwwkrrBbbbbbmbbbbbbrrkwwr","rwwrrBbbbbbbbbbbbbbbrrwwr","rgr.rbbbbbbbbbbbbbbbrrgr.",".r.rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."]],"wave":[[".........................",".........................",".........................","............r............","...........rbr....rr.....","...........rbr...rwwr....","..........rbbbr..rwwr....","..........rBbbr..rgr.....",".........rBbbbbr.rkr.....","........rBBbbbbbrkr......","........rBbbbbbbrkr......","......r.rerbbrerbr.......",".....rkrerebberebr.......","....rkrBbbbbbbbbbbr......",".rrrkrBBbbbmrmbbbbbr.....","rwwkrrBbbbbbmbbbbbbr.....","rwwrrBbbbbbbbbbbbbbbr....","rgr.rbbbbbbbbbbbbbbbr....",".r.rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr......rr...","..........rbbbr....rwwr..","..........rBbbr....rwwr..",".........rBbbbbr...rgr...","........rBBbbbbbr..rkr...","........rBbbbbbbr.rkr....","......r.rerbbrerbrkr.....",".....rkrerebberebrr......","....rkrBbbbbbbbbbbr......",".rrrkrBBbbbmrmbbbbbr.....","rwwkrrBbbbbbmbbbbbbr.....","rwwrrBbbbbbbbbbbbbbbr....","rgr.rbbbbbbbbbbbbbbbr....",".r.rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]],"cheer":[[".........................",".........................",".........................","............r............",".....rr....rbr....rr.....","....rwwr...rbr...rwwr....","....rwwr..rbbbr..rwwr....","....rgkr..rBbbr..rgr.....",".....rkr.rBbbbbr.rkr.....","......rkrBBbbbbbrkr......","......rkrBbbbbbbrkr......",".......rrerbbrerbr.......",".......rerebberebr.......","......rBbbbbbbbbbbr......",".....rBBbbbmrmbbbbbr.....",".....rBbbbbbmbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...rr......rbr......rr...","..rwwr....rbbbr....rwwr..","..rwwr....rBbbr....rwwr..","..rgkr...rBbbbbr...rgr...","...rkr..rBBbbbbbr..rkr...","....rkr.rBbbbbbbr.rkr....",".....rkrrerbbrerbrkr.....","......rrerebberebrr......","......rBbbbbbbbbbbr......",".....rBBbbbmrmbbbbbr.....",".....rBbbbbbmbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]],"dance":[[".........................",".........................",".........................","............r............","...........rbr...........","...rr......rbr...........","..rwwr....rbbbr..........","..rwwr....rBbbr..........","..rgkr...rBbbbbr.........","...rkr..rBBbbbbbr........","....rkr.rBbbbbbbr........",".....rkrrerbbrerbrr......","......rrerebberebrkr.....","......rBbbbbbbbbbbrkr....",".....rBBbbbmrmbbbbbrkrrr.",".....rBbbbbbmbbbbbbrrkwwr","....rBbbbbbbbbbbbbbbrrwwr","....rbbbbbbbbbbbbbbbrrgr.","...rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........",".rr.....rBBbbbbbr.....rr.","rwwrrrr.reebbbeer.rrrrwwr","rwwkkkkrBeebbbeebrkkkkwwr","rgrrrrrrBeebbbeebrrrrrgr.",".r....rBbbbbbbbbbbr...r..",".....rBBbbbbmbbbbbbr.....",".....rBbbbbbbbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr......rr...","..........rbbbr....rwwr..","..........rBbbr....rwwr..",".........rBbbbbr...rgr...","........rBBbbbbbr..rkr...","........rBbbbbbbr.rkr....","......r.rerbbrerbrkr.....",".....rkrerebberebrr......","....rkrBbbbbbbbbbbr......",".rrrkrBBbbbmrmbbbbbr.....","rwwkrrBbbbbbmbbbbbbr.....","rwwrrBbbbbbbbbbbbbbbr....","rgr.rbbbbbbbbbbbbbbbr....",".r.rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........",".rr.....rBBbbbbbr.....rr.","rwwrrrr.reebbbeer.rrrrwwr","rwwkkkkrBeebbbeebrkkkkwwr","rgrrrrrrBeebbbeebrrrrrgr.",".r....rBbbbbbbbbbbr...r..",".....rBBbbbbmbbbbbbr.....",".....rBbbbbbbbbbbbbr.....","....rBbbbbbbbbbbbbbbr....","....rbbbbbbbbbbbbbbbr....","...rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]],"dizzy":[[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........",".rr.....rBBbbbbbr........","rwwrrrrrerebberer........","rwwkkkkrrerbbrerbrr......","rgrrrrrrerebberebrkr.....",".r....rBbbbbbbbbbbrkr....",".....rBBbbbmmmbbbbbrkrrr.",".....rBbbbbbbbbbbbbrrkwwr","....rBbbbbbbbbbbbbbbrrwwr","....rbbbbbbbbbbbbbbbrrgr.","...rbbbbbbbbbbbbbbbbbrr..","..rbbbbbbbbbbbbbbbbbbbr.."],[".........................",".........................",".........................","............r............","...........rbr...........","...........rbr...........","..........rbbbr..........","..........rBbbr..........",".........rBbbbbr.........","........rBBbbbbbr.....rr.",".......rerebberer.rrrrwwr","......r.rerbbrerbrkkkkwwr",".....rkrerebberebrrrrrgr.","....rkrBbbbbbbbbbbr...r..",".rrrkrBBbbbmmmbbbbbr.....","rwwkrrBbbbbbbbbbbbbr.....","rwwrrBbbbbbbbbbbbbbbr....","rgr.rbbbbbbbbbbbbbbbr....",".r.rbbbbbbbbbbbbbbbbbr...","..rbbbbbbbbbbbbbbbbbbbr.."]]},"fps":{"idle":2.5,"air":10,"wave":6,"cheer":6,"dance":5,"dizzy":4}},"bumble":{"w":14,"h":15,"palette":{"k":"#17121f","y":"#ffd23f","Y":"#fff2a8","w":"#e4f6ff"},"frames":{"fly":[[".kk........kk.","kwwk......kwwk","kwwwk....kwwwk",".kwwkkkkkkwwk.","...kyyyyyyk...","..kyYyyyyyyk..","..kywwyywwyk..","..kywkyywkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"],["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kywwyywwyk..","..kywkyywkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"]],"happy":[[".kk........kk.","kwwk......kwwk","kwwwk....kwwwk",".kwwkkkkkkwwk.","...kyyyyyyk...","..kyYyyyyyyk..","..kykkyykkyk..","..kkyykkyyk...","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"],["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kykkyykkyk..","..kkyykkyyk...","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"]],"sleep":[["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kyyyyyyyyk..","..kykkyykkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"]],"perch":[["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kywwyywwyk..","..kywkyywkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"],["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kywwyywwyk..","..kywkyywkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"],["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kywwyywwyk..","..kywkyywkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"],["..............","..............",".kkk......kkk.","kwwwkkkkkkwwwk","...kyyyyyyk...","..kyYyyyyyyk..","..kyyyyyyyyk..","..kykkyykkyk..","..kkkkkkkkkk..","..kyyyyyyyyk..","..kkkkkkkkkk..","...kyyyyyyk...","....kkkkkk....","......kk......"]]},"fps":{"fly":20,"happy":22,"sleep":1,"perch":3}},"shibe":{"w":20,"h":11,"palette":{"k":"#17121f","o":"#e8913f","c":"#fff1de","p":"#ff7aa8"},"frames":{"rest":[["..k.....k...........",".kok...kok..........",".kookkkook......kkk.",".koooooook.....koook",".kooooook......kocok","kookookookkkkkkkoook","kcccooooooooooookkk.",".kcckkccoooooooook..",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."],["..k.....k...........",".kok...kok......kkk.",".kookkkook.....koook",".koooooook.....kocok",".kooooook......koook","kookookookkkkkkkkkk.","kcccooooooooooook...",".kcckkccoooooooook..",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."],["..k.....k...........",".kok...kok..........",".kookkkook......kkk.",".koooooook.....koook",".kooooook......kocok","kookookookkkkkkkoook","kcccooooooooooookkk.",".kcckkccoooooooook..",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."],["..k.....k...........",".kok...kok..........",".kookkkook..........",".koooooook......kkk.",".kooooook......koook","kookookookkkkkkkocok","kcccoooooooooooooook",".kcckkccoooooooookk.",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."]],"swat":[["..k.....k...........",".kok...kok..........",".kookkkook......kkk.",".koooooook.....koook",".kooooook......kocok","kookookookkkkkkkoook","kcccooooooooooookkk.","kkcckkccoooooooook..","ccccccccoooooooook..","cckkkkkkkccccccck...","kk.......kkkkkkk...."],["..k.....k...........",".kok...kok..........",".kookkkook......kkk.",".koooooook.....koook",".kooooook......kocok","kookookookkkkkkkoook","kcccooooooooooookkk.",".kcckkccoooooooook..",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."]],"sleep":[["..k.....k...........",".kok...kok..........",".kookkkook......kkk.",".koooooook.....koook",".kooooook......kocok","kokkookkokkkkkkkoook","kcccooooooooooookkk.",".kcckkccoooooooook..",".kccccccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."]],"purr":[["..k.....k...........",".kok...kok......kkk.",".kookkkook.....koook",".koooooook.....kocok",".kokookok......koook","kokokkokokkkkkkkkkk.","kcccooooooooooook...",".kcckkccoooooooook..",".kccppccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."],["..k.....k...........",".kok...kok..........",".kookkkook..........",".koooooook......kkk.",".kokookok......koook","kokokkokokkkkkkkocok","kcccoooooooooooooook",".kcckkccoooooooookk.",".kccppccoooooooook..","..kkkkkkkccccccck...",".........kkkkkkk...."]]},"fps":{"rest":6,"swat":7,"purr":8}},"capy":{"w":20,"h":12,"palette":{"k":"#17121f","b":"#b07a4a","d":"#8a5a32","y":"#ffc23f","l":"#4fc46a","w":"#ffffff"},"frames":{"read":[[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."]],"flip":[[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."],[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."]],"look":[[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbwkbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."]],"doze":[[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbbbbbdk.",".kkbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."]],"annoyed":[[".............kyylk..","...........kkkyyk...","..........kddkyyk...","......kkkkkddbbbbk..","...kkkbbbbkkbkkbbdk.",".kkbbbbbbbbbbbkkbddk","kbbbbbbbbbbbbbbbbddk","kbbbbbbbbbbbbbbbbkdk","kbbbbbbbbbbbbbbbbdk.","kbbbbbbbbbbbbbbbbk..",".kkddddddddddkkkk...","...kdkddddkdkdk....."]],"back":[["..klyyk.............","...kyykkk...........","...kyykddk..........","..kbbbbddkkkkk......",".kdbbbbbkkbbbbkkk...","kddbbbbbbbbbbbbbbkk.","kddbbbbbbbbbbbbbbbbk","kddbbbbbbbbbbbbbbbbk",".kdbbbbbbbbbbbbbbbbk","..kbbbbbbbbbbbbbbbbk","...kkkkddddddddddkk.",".....kdkdkddddkdk..."]]},"fps":{"read":1,"flip":4,"doze":1}},"frog":{"w":12,"h":9,"palette":{"k":"#17121f","g":"#7bd63a","G":"#c8f58a","w":"#ffffff","p":"#ff7aa8"},"frames":{"sit":[["..kk....kk..",".kwwk..kwwk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkkkkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"],["..kk....kk..",".kwwk..kwwk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkkkkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"],["..kk....kk..",".kwwk..kwwk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkkkkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"],["..kk....kk..",".kkkk..kkkk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkkkkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"]],"snap":[["..kk....kk..",".kwwk..kwwk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkppkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"]],"jump":[["..kk....kk..",".kwwk..kwwk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkkkkgggk","kgggggggggk.",".kgg.kk.ggk.",".kk......kk."]],"happy":[["..kk....kk..",".kkkk..kkkk.",".kwkkkkkwkk.","kggggggggggg","kgGgggggggGk","kgggkggkgggk","kgggggggggk.",".kgg.kk.ggk.","kkgk....kgkk"]]},"fps":{"sit":1.4}},"duckling":{"w":7,"h":8,"palette":{"k":"#17121f","y":"#ffd23f","o":"#ff9a2f"},"frames":{"walk":[["..kkk..",".kyyyk.",".kykyoo","k.kyyk.","kykyyyk","kyyyyyk",".kkkkk.","..o.o.."],["..kkk..",".kyyyk.",".kykyoo","k.kyyk.","kykyyyk","kyyyyyk",".kkkkk.","...oo.."]],"idle":[["..kkk..",".kyyyk.",".kykyoo","k.kyyk.","kykyyyk","kyyyyyk",".kkkkk.","..o..o."]]},"fps":{"walk":9}},"shel":{"w":16,"h":10,"palette":{"k":"#17121f","S":"#ffe2bd","s":"#ef9a4b","b":"#9fe3c9","p":"#ff9cc2"},"frames":{"walk":[["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbk.",".kkkkkkkkkkkkk.."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbk.",".kkkkkkkkkkkkk.."]],"idle":[["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."],["...kkkkkk.......","..kSSssssk...k.k",".kSskkkkssk..b.b",".kskSsssksk..b.b",".kskskksksk.kbbk",".kskssskssk.kbbk",".kskkkkkssk.kbpk","kbkkkkkkkkkkkbbk","kbbbbbbbbbbbbbbk",".kkkkkkkkkkkkkk."]],"hide":[["...kkkkkk.......","..kSSssssk......",".kSskkkkssk.....",".kskSsssksk.....",".kskskksksk.....",".kskssskssk.....",".kskkkkkssk.....",".kssssssssk.....","..kkkkkkkk......"]],"peek":[["...kkkkkk.......","..kSSssssk......",".kSskkkkssk.....",".kskSsssksk..k..",".kskskksksk.kbk.",".ksksssksskkbbk.",".kskkkkksskkbbk.",".ksssssssskkkkk.","..kkkkkkkk......"]]},"fps":{"walk":3,"idle":2}},"roomba":{"w":14,"h":6,"palette":{"k":"#17121f","m":"#5c5470","M":"#8f86a6","d":"#2d2838","l":"#c6f432","r":"#ff4d6d"},"frames":{"go":[["...kkkkkkkk...",".kkmmmmmmmmkk.","kmmMMmmmmmmlmk","kddddddddddddk",".kkkkkkkkkkkk.","..k........k.."],["...kkkkkkkk...",".kkmmmmmmmmkk.","kmmMMmmmmmmkmk","kddddddddddddk",".kkkkkkkkkkkk.","..k........k.."]],"beep":[["...kkkkkkkk...",".kkmmmmmmmmkk.","kmmMMmmmmmmrmk","kddddddddddddk",".kkkkkkkkkkkk.","..k........k.."],["...kkkkkkkk...",".kkmmmmmmmmkk.","kmmMMmmmmmmlmk","kddddddddddddk",".kkkkkkkkkkkk.","..k........k.."]]},"fps":{"go":3,"beep":8}},"hiss":{"w":18,"h":8,"palette":{"k":"#17121f","g":"#4fc46a","G":"#2f9a4a","w":"#ffffff","r":"#ff4d6d"},"frames":{"walk":[["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggk","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."],["..............k...","....kk.....kkkgkk.","...kgGk...kggggwkk",".kkggGGkkkGggggggk","kGGgkkGggGGkgggggk","kGGk..kggGk.kkgkk.",".kk....kkk....k...",".................."],["..............k...","...kk.....kkkkgkk.","..kgGk...kgggggwkk",".kggGGkkkGgggggggk","kGgkkGggGGkkgggggk","kGk..kggGk..kkgkk.",".k....kkk.....k...",".................."],["..............k...","..kk.....kkkkkgkk.",".kgGk...kggGgggwkk","kggGGkkkGggGgggggk","kgkkGggGGkkkgggggk",".k..kggGk...kkgkk.",".....kkk......k...",".................."]],"idle":[["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggk","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."],["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggk","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."],["..............k...",".....kk.....kkgkk.","....kgGk...kgggkgk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggk","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."]],"look":[["..............k...","....kk.....kkkgkk.","...kgGk...kggggwkk",".kkggGGkkkGggggggk","kGGgkkGggGGkgggggk","kGGk..kggGk.kkgkk.",".kk....kkk....k...",".................."],["..............k...","....kk.....kkkgkk.","...kgGk...kggggwkk",".kkggGGkkkGggggggk","kGGgkkGggGGkgggggr","kGGk..kggGk.kkgkk.",".kk....kkk....k...",".................."]],"sniff":[["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggr","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."],["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggk","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."],["..............k...",".....kk.....kkgkk.","....kgGk...kgggwkk",".kkkggGGkkkGgggggk","kgGGgkkGggGGgggggr","kgGGk..kggGkkkgkk.",".kkk....kkk...k...",".................."]],"alarm":[["..............k...","...kk.....kkkkgkk.","..kgGk...kgggggwkk",".kggGGkkkGgggggggk","kGgkkGggGGkkgggggr","kGk..kggGk..kkgkk.",".k....kkk.....k...",".................."],["..............k...","..kk.....kkkkkgkk.",".kgGk...kggGgggwkk","kggGGkkkGggGgggggk","kgkkGggGGkkkgggggr",".k..kggGk...kkgkk.",".....kkk......k...",".................."]],"hop":[["..............k...","...kk.....kkkkgkk.","..kgGk...kgggggwkk",".kggGGkkkGgggggggk","kGgkkGggGGkkgggggk","kGk..kggGk..kkgkk.",".k....kkk.....k...",".................."]],"flip":[["..................",".kkk....kkk...k...","kgGGk..kggGkkkgkk.","kgGGgkkGggGGgggggr",".kkkggGGkkkGgggggk","....kgGk...kgggkgk",".....kk.....kkgkk.","..............k..."],["..................",".k....kkk.....k...","kGk..kggGk..kkgkk.","kGgkkGggGGkkgggggr",".kggGGkkkGgggggggk","..kgGk...kgggggkgk","...kk.....kkkkgkk.","..............k..."]]},"fps":{"walk":8,"idle":1.5,"sniff":6,"alarm":12,"flip":10}},"termi":{"w":12,"h":11,"palette":{"k":"#17121f","m":"#c9c3d6","s":"#17121f","g":"#c6f432"},"frames":{"idle":[["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmsgsssgssmk","kmsssssssmmk","kmssgggsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."],["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmsgsssgssmk","kmsssssssmmk","kmssgggsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."],["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmsgsssgssmk","kmsssssssmmk","kmssgggsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."],["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmssssssssmk","kmsssssssmmk","kmssgggsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."]],"typing":[["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmsgsssgssmk","kmsssssssmmk","kmssgggsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."],["kkkkkkkkkkkk","kmmmmmmmmmmk","kmssssssssmk","kmsgsssgssmk","kmsssssssmmk","kmssgsgsssmk","kmssssssssmk","kmmmmmmmmmmk","kkkkkkkkkkkk","....kmmk....","..kkkkkkkk.."]]},"fps":{"idle":1.5,"typing":8}},"beep":{"w":10,"h":11,"palette":{"k":"#17121f","m":"#c9d3ea","w":"#ffffff","r":"#ff4d6d","g":"#c6f432"},"frames":{"idle":[["....kk....","....rk....","..kkkkkk..",".kmmmmmmk.",".kmwkmwkmk",".kmmmmmmk.",".kmmkkmmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","..k....k.."],["....kk....","....gk....","..kkkkkk..",".kmmmmmmk.",".kmwkmwkmk",".kmmmmmmk.",".kmmkkmmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","..k....k.."]],"nervous":[["....kk....","....rk....","..kkkkkk..",".kmmmmmmk.",".kmwwkwwmk",".kmmmmmmk.",".kmkkkkmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","..k....k.."],[".....kk...","....rrk...","...kkkkkk.","..kmmmmmmk","..kmwwkwwm","..kmmmmmmk","..kmkkkkmk","...kkkkkk.","..kmmmmmmk","..kmmmmmmk","..k....k.."]],"run":[["....kk....","....rk....","..kkkkkk..",".kmmmmmmk.",".kmwwkwwmk",".kmmmmmmk.",".kmkkkkmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","..k....k.."],["....kk....","....rk....","..kkkkkk..",".kmmmmmmk.",".kmwwkwwmk",".kmmmmmmk.",".kmkkkkmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","...k..k..."]],"shy":[["....kk....","....rk....","..kkkkkk..",".kmmmmmmk.",".kmkmmkmmk",".kmmmmmmk.",".kmmkkmmk.","..kkkkkk..",".kmmmmmmk.",".kmmmmmmk.","..k....k.."]]},"fps":{"idle":1.5,"nervous":10,"run":12}}};
/* ---------- the Pal Maker's pals: one drawing, packed into a code, animated by rule ----------
 * Somebody draws a pal (a pixel grid, facing right) and picks its eyes, mouth, legs, wings and
 * what it does. All of that packs into a short code that travels in a link:
 *
 *   <piix-pal make="AQwM…"></piix-pal>          Piixpal.make('AQwM…')  ->  'mk-1x9z'
 *
 * From that one drawing this works out every clip the behaviours ask for: walking legs, blinks,
 * hops, flaps, a dizzy spin, sleep, a happy face, a scared one. Pure functions apart from
 * register(), so the server (api/_maker.js, written by the build) draws the very same pal. */
const MAKER = (() => {
  /* what a made pal can do; append only, the index is stored in codes */
  const DOES = ['crawl', 'bounce', 'climb', 'follow', 'perch', 'hang', 'creep', 'drop', 'lounge', 'slide', 'toss', 'float'];
  const EYES = ['none', 'dot', 'tall', 'round', 'big', 'shine', 'line'];
  const MOUTHS = ['none', 'dot', 'smile', 'cat', 'open', 'fang'];
  const LEGS = ['none', 'stubs', 'long', 'bug', 'feet'];
  const WINGS = ['none', 'small', 'bat'];

  /* ---------- the code: bytes in base64url ---------- */
  const b64 = bytes => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    const t = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
    return t.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64 = str => {
    const t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const s = typeof atob === 'function' ? atob(t + '==='.slice((t.length + 3) % 4)) : Buffer.from(t, 'base64').toString('binary');
    return Uint8Array.from(s, c => c.charCodeAt(0));
  };
  const rgb = h => { const n = parseInt(String(h).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = (r, g, b) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  const clampI = (v, a, b) => Math.min(b, Math.max(a, v | 0));

  /* a fresh pal: a little lime blob, so the maker never opens on nothing */
  const blank = () => {
    const w = 14, h = 12, px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + .5 - 7) / 6.6, dy = (y + .5 - 7) / 5.6;
      if (dx * dx + dy * dy <= 1 && y >= 1) px[y * w + x] = y < 4 && x < 8 ? 2 : (x > 10 || y > 9) ? 3 : 1;
    }
    return {
      name: 'blob', w, h, colors: ['#c6f432', '#efffc0', '#7fa61c'], ink: '#1b1226', px,
      outline: true, cheeks: true, eyes: { style: 3, x: 7, y: 4, gap: 4 }, mouth: { style: 2, x: 8, y: 8 },
      legs: 1, wings: 0, does: 'crawl', scale: 4
    };
  };

  const encode = m => {
    const out = [1, m.w, m.h, m.colors.length];
    for (const c of m.colors) out.push(...rgb(c));
    out.push(...rgb(m.ink), (m.outline ? 1 : 0) | (m.cheeks ? 2 : 0));
    out.push(m.eyes.style, m.eyes.x, m.eyes.y, m.eyes.gap, m.mouth.style, m.mouth.x, m.mouth.y);
    out.push(m.legs, m.wings, Math.max(0, DOES.indexOf(m.does)), m.scale);
    const name = [...String(m.name || '').slice(0, 16)].map(c => c.charCodeAt(0) & 127);
    out.push(name.length, ...name);
    /* pixels as runs: one byte each, how many (1-16) and which colour (0 is empty) */
    const n = m.w * m.h;
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && j - i < 15 && m.px[j + 1] === m.px[i]) j++;
      out.push(((j - i) << 4) | (m.px[i] & 15));
      i = j + 1;
    }
    return b64(out);
  };

  const decode = code => {
    const b = unb64(code);
    let i = 0;
    const u = () => b[i++] || 0;
    if (u() !== 1) throw new Error('not a pal code');
    const w = clampI(u(), 4, 32), h = clampI(u(), 4, 32), nc = clampI(u(), 1, 15), colors = [];
    for (let k = 0; k < nc; k++) colors.push(hex(u(), u(), u()));
    const ink = hex(u(), u(), u()), flags = u();
    const eyes = { style: u() % EYES.length, x: u(), y: u(), gap: u() };
    const mouth = { style: u() % MOUTHS.length, x: u(), y: u() };
    const legs = u() % LEGS.length, wings = u() % WINGS.length, does = DOES[u()] || 'crawl', scale = clampI(u(), 1, 8);
    const nl = u();
    let name = '';
    for (let k = 0; k < nl; k++) name += String.fromCharCode(u());
    const px = new Uint8Array(w * h);
    for (let p = 0; p < w * h && i < b.length;) {
      const r = u(), len = (r >> 4) + 1, c = r & 15;
      for (let k = 0; k < len && p < w * h; k++) px[p++] = c <= nc ? c : 0;
    }
    return { name: name.replace(/[^\w .!?'-]/g, '') || 'pal', w, h, colors, ink, px, outline: !!(flags & 1), cheeks: !!(flags & 2), eyes, mouth, legs, wings, does, scale };
  };

  /* ---------- drawing it ---------- */
  /* user colours are A..O; system keys: k ink, w eye white, m mouth, c cheek, v wing */
  const KEYS = 'ABCDEFGHIJKLMNO';
  const put = (rows, x, y, patch) => {
    patch.forEach((p, j) => {
      const ry = y + j;
      if (ry < 0 || ry >= rows.length) return;
      const r = rows[ry].split('');
      for (let q = 0; q < p.length; q++) if (p[q] !== '_' && x + q >= 0 && x + q < r.length) r[x + q] = p[q];
      rows[ry] = r.join('');
    });
    return rows;
  };
  const mirror = patch => patch.map(r => [...r].reverse().join(''));
  /* one eye in each mood; '_' keeps whatever is drawn underneath */
  const eye = (style, mood) => {
    const S = {
      dot: { open: ['k'], wide: ['k'] },
      tall: { open: ['k', 'k'], wide: ['k', 'k'] },
      round: { open: ['wk', 'wk'], back: ['kw', 'kw'], wide: ['ww', 'wk'] },
      big: { open: ['www', 'wkk', 'wkk'], back: ['www', 'kkw', 'kkw'], wide: ['www', 'wkw', 'www'] },
      shine: { open: ['wk', 'kk'], back: ['kw', 'kk'], wide: ['wk', 'kk'] },
      line: { open: ['kk'], wide: ['k_', 'k_'] }
    }[style];
    if (!S) return null;
    const ew = S.open[0].length, eh = S.open.length;
    const low = Array.from({ length: eh }, (_, j) => (j === eh - 1 ? 'k' : '_').repeat(ew));
    if (mood === 'open') return S.open;
    if (mood === 'back') return S.back || S.open;
    if (mood === 'wide') return S.wide;
    if (mood === 'shut') return low;
    if (mood === 'happy') return ew >= 3 ? ['_k_', 'k_k', '___'].slice(0, Math.max(2, eh)) : ew === 2 ? (eh >= 2 ? ['kk', '__'] : ['kk']) : (eh >= 2 ? ['k', '_'] : ['k']);
    if (mood === 'dizzy') return ew >= 3 ? ['k_k', '_k_', 'k_k'] : ew === 2 ? (eh >= 2 ? ['k_', '_k'] : ['k_']) : S.open;
    return S.open;
  };
  const mouthPatch = (style, mood) => {
    if (!style) return null;
    if (mood === 'open') return ['kk', 'mm'];
    return { dot: ['k'], smile: ['k_k', '_k_'], cat: ['_k_k_', 'k_k_k'], open: ['kk', 'mm'], fang: ['kkk', '_w_'] }[MOUTHS[style]];
  };

  /* the body: grid -> rows of keys */
  const body = m => Array.from({ length: m.h }, (_, y) => Array.from({ length: m.w }, (_, x) => { const c = m.px[y * m.w + x]; return c ? KEYS[c - 1] : '.'; }).join(''));
  /* how far down the drawing goes, and where its bottom row is */
  const bounds = m => {
    let L = m.w, R = -1, B = -1, T = m.h;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.px[y * m.w + x]) { L = Math.min(L, x); R = Math.max(R, x); B = Math.max(B, y); T = Math.min(T, y); }
    if (R < 0) return { L: 0, R: m.w - 1, B: m.h - 1, T: 0, bl: 0, br: m.w - 1 };
    let bl = m.w, br = -1;
    for (let x = 0; x < m.w; x++) if (m.px[B * m.w + x]) { bl = Math.min(bl, x); br = Math.max(br, x); }
    return { L, R, B, T, bl, br };
  };

  /* a face on the body, in a mood */
  const face = (m, rows, mood) => {
    const st = EYES[m.eyes.style], e = eye(st, mood);
    if (m.cheeks && m.eyes.style) {
      const ew = (eye(st, 'open') || [''])[0].length, eh = (eye(st, 'open') || []).length;
      put(rows, m.eyes.x - 1, m.eyes.y + eh, ['c']);
      put(rows, m.eyes.x + m.eyes.gap + ew, m.eyes.y + eh, ['c']);
    }
    if (e) { put(rows, m.eyes.x, m.eyes.y, e); put(rows, m.eyes.x + m.eyes.gap, m.eyes.y, e); }
    const mp = mouthPatch(m.mouth.style, mood === 'happy' || mood === 'wide' ? 'open' : '');
    if (mp) put(rows, m.mouth.x, m.mouth.y, mp);
    return rows;
  };

  /* legs: rows added below the body, in a pose */
  const legRows = (m, pose) => {
    const kind = LEGS[m.legs];
    if (kind === 'none') return [];
    const { bl, br } = bounds(m), span = br - bl + 1, W = m.w;
    const row = cols => { const r = Array(W).fill('.'); for (const c of cols) if (c >= 0 && c < W) r[c] = 'k'; return r.join(''); };
    const a = bl + Math.max(1, Math.round(span * .25)) - (span < 5 ? 1 : 0), b = br - Math.max(1, Math.round(span * .25)) + (span < 5 ? 1 : 0);
    if (pose === 'tuck') return kind === 'bug' ? [row(range(bl + 1, br - 1, 2))] : [row([a, b])];
    if (kind === 'stubs' || kind === 'long') {
      const n = kind === 'long' ? 3 : 2;
      return Array.from({ length: n }, (_, j) => {
        const lean = j === n - 1 ? 1 : 0;
        if (pose === 'a') return row([a - lean, b + lean]);
        if (pose === 'b') return row([a + lean, b - lean]);
        return row([a, b]);
      });
    }
    if (kind === 'feet') {
      if (pose === 'a') return [row([a, b]), row([a - 1, a, b, b + 1])];
      if (pose === 'b') return [row([a, b]), row([a, a + 1, b - 1, b])];
      return [row([a, b]), row([a - 1, a, b - 1, b])];
    }
    /* bug: three pairs, like the bitbug */
    const at = range(bl + 1, br - 1, Math.max(2, Math.floor(span / 3)));
    if (pose === 'a') return [row(at), row(at.map(x => x - 1))];
    if (pose === 'b') return [row(at), row(at.map(x => x + 1))];
    return [row(at), row(at)];
  };
  const range = (a, b, step) => { const out = []; for (let x = a; x <= b; x += step) out.push(x); return out.length ? out : [a]; };

  /* a frame: the body with a face, legs and wings, then the outline round it all */
  const frame = (m, { mood = 'open', legs = 'stand', up = null, bob = 0, flip = false, nudge = 0 } = {}) => {
    const headroom = WINGS[m.wings] === 'none' ? 0 : 3;
    let rows = body(m);
    face(m, rows, mood);
    rows = Array(headroom).fill('.'.repeat(m.w)).concat(rows);
    if (headroom) {
      /* wings on the back (the left: pals face right), flapping up into the rows above */
      const { L, R, T } = bounds(m), wx = L + Math.round((R - L) * .3);
      const kind = WINGS[m.wings];
      const small = up ? ['.vv', 'vvv', '.v.'] : ['...', 'vvv', '.vv'];
      const bat = up ? ['v...v', 'vv.vv', '.vvv.'] : ['.....', '.vvv.', 'vv.vv'];
      put(rows, wx - 1, T + (up ? 0 : 2), (kind === 'bat' ? bat : small).map(r => r.replace(/\./g, '_')));
    }
    const trim = r => { while (r.length && !/[^.]/.test(r[r.length - 1])) r.pop(); return r; };
    /* the outline goes round the body, face and wings; legs hang below it in ink */
    let pad = 0;
    trim(rows);
    if (m.outline) {
      const W = m.w + 2, H = rows.length + 2, src = rows, at = (x, y) => (src[y - 1] || '')[x - 1] || '.';
      rows = trim(Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
        const c = at(x, y);
        if (c !== '.') return c;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(x + dx, y + dy); return n !== '.' && n !== 'k'; }) ? 'k' : '.';
      }).join('')));
      pad = 1;
    }
    rows = rows.concat(legRows(m, legs).map(r => '.'.repeat(pad) + r + '.'.repeat(pad)));
    if (nudge) rows = rows.map(r => nudge > 0 ? '.' + r.slice(0, -1) : r.slice(1) + '.');
    if (flip) rows = trim(rows.slice().reverse());
    /* a bob lifts the whole frame: frames stand on their bottom row */
    const w = rows[0] ? rows[0].length : m.w;
    if (bob) rows = rows.concat(Array(bob).fill('.'.repeat(w)));
    return rows;
  };

  /* every clip the behaviours might ask for */
  const sprite = m => {
    const legsMove = LEGS[m.legs] !== 'none', winged = WINGS[m.wings] !== 'none';
    const F = o => frame(m, o);
    const stand = F(), blink = F({ mood: 'shut' }), back = F({ mood: 'back' });
    const walk = legsMove ? [F({ legs: 'a' }), F({ legs: 'b', bob: 0 })] : [stand, F({ bob: 1 })];
    const air = F({ mood: 'wide', legs: 'tuck', up: true });
    const fly = winged ? [F({ legs: 'tuck', up: true }), F({ legs: 'tuck', up: false })] : [F({ legs: 'tuck' }), F({ legs: 'tuck', bob: 1 })];
    const happy = [F({ mood: 'happy' }), F({ mood: 'happy', bob: 1 })];
    const scared = [F({ mood: 'wide', nudge: 1 }), F({ mood: 'wide', nudge: -1 })];
    const dizzy = [F({ mood: 'dizzy' }), F({ mood: 'dizzy', nudge: 1 })];
    const sleep = [blink, F({ mood: 'shut', bob: 1 })];
    const frames = {
      idle: [stand, stand, stand, blink], walk, run: walk, wiggle: walk, swim: fly,
      look: [stand, back, back, stand], peek: [stand], blink: [blink], hide: [F({ mood: 'shut', legs: 'tuck' })],
      hop: [air], jump: [air], rise: [air], air: [air], fall: [air], up: [air],
      land: [F({ legs: 'tuck' })], landed: [stand], sit: [stand], rest: [stand], perch: [stand], held: [F({ mood: 'wide', legs: 'a' })], hold: [stand],
      fly, happy, cheer: happy, wave: happy, purr: happy, wag: happy,
      scared, nervous: scared, alarm: scared, shy: [blink], cover: [blink],
      dizzy, pop: dizzy, flip: [F({ mood: 'shut', legs: 'a', flip: true }), F({ mood: 'shut', legs: 'b', flip: true })],
      sleep, peck: [stand, F({ nudge: 1 })], swat: [F({ nudge: 1 }), stand], snap: [F({ mood: 'wide', nudge: 1 })], click: [F({ nudge: 1 })],
      slide: [F({ mood: 'happy', legs: 'tuck' })], roll: [F({ mood: 'dizzy', legs: 'tuck' })]
    };
    const w = Math.max(...Object.values(frames).flat().map(r => Math.max(...r.map(x => x.length)))), h = Math.max(...Object.values(frames).flat().map(r => r.length));
    const palette = { k: m.ink, w: '#ffffff', m: '#ff5d73', c: '#ff9ab8', v: '#eef6ff' };
    m.colors.forEach((c, i) => { palette[KEYS[i]] = c; });
    return {
      w, h, scale: m.scale, does: m.does, palette, frames,
      fps: { idle: 3, walk: 8, run: 12, wiggle: 8, look: 2, fly: 10, swim: 6, happy: 5, cheer: 6, wave: 5, purr: 4, wag: 6, scared: 14, nervous: 10, alarm: 14, dizzy: 6, pop: 8, flip: 10, sleep: 1.4, peck: 4, swat: 6 }
    };
  };

  /* register a code as a real sprite, once; returns its name */
  const seen = {};
  const register = code => {
    code = String(code || '').trim();
    if (seen[code]) return seen[code];
    let hsh = 5381;
    for (let i = 0; i < code.length; i++) hsh = (hsh * 33 + code.charCodeAt(i)) >>> 0;
    const name = 'mk-' + hsh.toString(36);
    const m = decode(code);
    defineSprite(name, sprite(m));
    SPRITES[name].label = m.name;
    return (seen[code] = name);
  };

  return { DOES, EYES, MOUTHS, LEGS, WINGS, KEYS, blank, encode, decode, sprite, frame, bounds, register };
})();



/* ---------- options ---------- */
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const cmd = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'watch';
const HOME = os.homedir(), STATE = path.join(HOME, '.piixpal-pet');
fs.mkdirSync(STATE, { recursive: true });
const SAVED = (() => { try { return JSON.parse(fs.readFileSync(path.join(STATE, 'config.json'), 'utf8')); } catch { return {}; } })();
const pick = flag('pal', null), made = flag('make', null);
if (pick || made) fs.writeFileSync(path.join(STATE, 'config.json'), JSON.stringify({ ...SAVED, pal: pick || SAVED.pal, make: made || (pick ? undefined : SAVED.make) }));
const AGENT = flag('agent', 'auto');

/* ---------- the pal ---------- */
const loadPal = () => {
  const code = made || (!pick && SAVED.make);
  if (code) {
    if (/^A[g-v]/.test(code)) { console.error('That one is a smooth (drawn or photo) pal; the terminal pet draws pixel pals. Make one in the Pixel tab.'); process.exit(1); }
    try { const m = MAKER.decode(code); return { name: m.name, ...MAKER.sprite(m) }; } catch { console.error('That Pal Maker code looks broken.'); process.exit(1); }
  }
  const name = (pick || SAVED.pal || 'bitbug').toLowerCase();
  if (!PALS[name]) { console.error(`No pet called "${name}". Try: ${Object.keys(PALS).join(', ')}`); process.exit(1); }
  return { name, ...PALS[name] };
};
const rgb = h => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/* each mood, and the clips that can show it, best first (pals have different clips) */
const CLIPS = {
  idle: ['idle', 'sit', 'rest'], sleep: ['sleep', 'rest', 'idle'], think: ['walk', 'run', 'idle'],
  read: ['sniff', 'look', 'peck', 'peek', 'walk'], edit: ['happy', 'purr', 'walk'], run: ['run', 'walk', 'fly'],
  oops: ['alarm', 'scared', 'nervous', 'dizzy', 'flip'], done: ['cheer', 'happy', 'wave', 'hop', 'jump'], wait: ['wave', 'alarm', 'hop', 'idle']
};
const clipFor = (pal, mood) => (CLIPS[mood] || ['idle']).find(c => pal.frames[c] && pal.frames[c].length) || Object.keys(pal.frames)[0];
const WALKS = new Set(['think', 'read', 'run']);

/* The agent watcher, shared by the terminal pet (pet/src.mjs) and the desktop pet (desktop/):
 * finds the live Claude Code or Codex session from the logs they write, and turns each new log
 * line into an event: { kind: think | read | edit | run | oops | done, text, tool?, done?, prompt? }. */


/* ---------- what the agent is doing, from its session log ---------- */
const base = p => path.basename(String(p || ''));
const short = (s, n = 38) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const READS = /^(cat|less|head|tail|rg|grep|ls|dir|find|sed -n|Get-Content|type|tree|git (log|show|diff|status))\b/;
const toolEvent = (name, input = {}) => {
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
const parseClaude = j => {
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
const parseCodex = j => {
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
const newest = (AGENT = 'auto') => {
  const c = AGENT === 'codex' ? [] : list(path.join(HOME, '.claude', 'projects'), 1).map(f => ['claude', f]);
  const x = AGENT === 'claude' ? [] : codexFiles().map(f => ['codex', f]);
  let best = null;
  for (const [agent, f] of [...c, ...x]) { let t; try { t = fs.statSync(f).mtimeMs; } catch { continue; } if (!best || t > best.t) best = { agent, f, t }; }
  return best;
};


/* follow the newest session as it's written: onEvent(e) for each event, onSwitch({ agent, file, project }) when it changes */
const watchAgents = ({ agent: AGENT = 'auto', onEvent, onSwitch }) => {
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

/* ---------- stats, kept between sessions ---------- */
const STATS_F = path.join(STATE, 'stats.json');
const stats = (() => { try { return JSON.parse(fs.readFileSync(STATS_F, 'utf8')); } catch { return { xp: 0, turns: 0, tools: 0, oops: 0 }; } })();
const level = xp => Math.floor(Math.sqrt(xp / 25)) + 1;
let saveT;
const saveStats = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(STATS_F, JSON.stringify(stats), () => {}), 500); };

/* ---------- a one-line pet for Claude Code's status line ---------- */
if (cmd === 'statusline') {
  let input = '';
  process.stdin.on('data', d => (input += d)).on('end', () => {
    let info = {};
    try { info = JSON.parse(input); } catch { /* run by hand */ }
    const pal = loadPal();
    let ev = { kind: 'idle', text: 'ready' };
    try {
      const f = info.transcript_path, size = fs.statSync(f).size, fd = fs.openSync(f, 'r'), n = Math.min(size, 65536), buf = Buffer.alloc(n);
      fs.readSync(fd, buf, 0, n, size - n); fs.closeSync(fd);
      for (const l of buf.toString('utf8').split('\n')) { try { const e = parseClaude(JSON.parse(l)); if (e) ev = e; } catch { /* partial line */ } }
    } catch { /* no transcript yet */ }
    const FACES = { idle: '(•‿•)', sleep: '(-_-) zz', think: '(•_•)…', read: '(◔_◔)', edit: '(•̀ᴗ•́)✎', run: '(ง•_•)ง', oops: '(⊙_⊙;)', done: '\\(^ᴗ^)/', wait: '(•o•)!' };
    /* the pal's own colour: the commonest one in its first frame */
    const count = {};
    for (const r of pal.frames[clipFor(pal, 'idle')][0]) for (const ch of r) if (pal.palette[ch]) count[ch] = (count[ch] || 0) + 1;
    const main = Object.entries(count).sort((a, b) => b[1] - a[1]).find(([k]) => { const [r, g, b] = rgb(pal.palette[k]); return r + g + b > 180; });
    const [r, g, b] = rgb(main ? pal.palette[main[0]] : '#c6f432');
    process.stdout.write(`\x1b[38;2;${r};${g};${b}m${FACES[ev.kind] || FACES.idle}\x1b[0m ${pal.name} \x1b[2m${ev.text}\x1b[0m`);
  });
} else if (cmd === 'notify') {
  /* from a Claude Code Notification hook or Codex's notify: the agent wants you */
  fs.writeFileSync(path.join(STATE, 'ping'), JSON.stringify({ kind: argv[1] || 'wait', at: Date.now() }));
  process.stdin.resume(); process.stdin.on('data', () => {}); setTimeout(() => process.exit(0), 50);
} else if (cmd === 'list') {
  for (const [name, p] of Object.entries(PALS)) {
    const fr = p.frames[clipFor(p, 'idle')][0], pad = p.h - fr.length, rows = Array(Math.max(0, pad)).fill('').concat(fr);
    console.log(`\n  ${name}`);
    for (let y = 0; y < rows.length; y += 2) {
      let s = '  ';
      for (let x = 0; x < p.w; x++) {
        const t = p.palette[(rows[y] || '')[x]], u = p.palette[(rows[y + 1] || '')[x]];
        if (t && u) s += `\x1b[38;2;${rgb(t)}m\x1b[48;2;${rgb(u)}m▀\x1b[0m`.replace(/(\d+),(\d+),(\d+)/g, '$1;$2;$3');
        else if (t) s += `\x1b[38;2;${rgb(t).join(';')}m▀\x1b[0m`;
        else if (u) s += `\x1b[38;2;${rgb(u).join(';')}m▄\x1b[0m`;
        else s += ' ';
      }
      console.log(s);
    }
  }
  console.log('\n  node pet.mjs --pal <name>   (it remembers)\n');
} else if (cmd === 'help' || argv.includes('--help') || argv.includes('-h')) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\* ?/, '').replace(/^ \* ?/gm, ''));
} else watch();

/* ---------- the pane ---------- */
function watch() {
  /* PIIXPAL_PET_TEST=80x24: draw into memory and print the last frame after PIIXPAL_PET_MS (for tests) */
  const TEST = process.env.PIIXPAL_PET_TEST;
  let lastFrame = '';
  const out = TEST ? { columns: +TEST.split('x')[0], rows: +TEST.split('x')[1], isTTY: true, write: s => { if (s.startsWith('\x1b[H')) lastFrame = s; }, on() {} } : process.stdout;
  const pal = loadPal();
  let mood = 'idle', text = 'waiting for your agent…', moodAt = Date.now(), lastEvent = Date.now(), agent = null, file = null;
  let x = 2, face = 1, hop = 0, flash = 0, lvlShown = level(stats.xp), lastPing = 0;
  const set = (m, t) => { mood = m; if (t) text = t; moodAt = Date.now(); };
  const onEvent = e => {
    lastEvent = Date.now();
    if (e.tool) { stats.tools++; stats.xp += 1; }
    if (e.kind === 'oops') { stats.oops++; flash = 6; }
    if (e.done) { stats.turns++; stats.xp += 6; hop = 1; }
    set(e.kind, e.text);
    if (level(stats.xp) > lvlShown) { lvlShown = level(stats.xp); set('done', `level up! lvl ${lvlShown} ★`); hop = 1; }
    saveStats();
  };
  /* follow the newest session as it's written */
  let project = '';
  const startWatching = () => watchAgents({ agent: AGENT, onEvent, onSwitch: w => { agent = w.agent; file = w.file; project = w.project; set('idle', `watching ${agent === 'codex' ? 'Codex' : 'Claude Code'}`); } });
  const ping = () => {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(STATE, 'ping'), 'utf8'));
      if (p.at > lastPing) { const first = !lastPing; lastPing = p.at; if (!first && Date.now() - p.at < 60000) { set('wait', 'psst… your agent needs you'); if (!argv.includes('--quiet')) out.write('\x07'); } }
    } catch { /* no hook set up */ }
  };

  /* ---------- drawing: two pixels per character, top in the foreground, bottom in the background ---------- */
  const SGR = (fg, bg) => (fg ? `\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m` : '\x1b[39m') + (bg ? `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m` : '\x1b[49m');
  const PAL = {};
  for (const k in pal.palette) if (/^#[0-9a-f]{6}/i.test(pal.palette[k])) PAL[k] = rgb(pal.palette[k]);
  const LIME = [198, 244, 50], DIM = '\x1b[2m', R = '\x1b[0m';
  let t0 = Date.now(), last = Date.now();
  const draw = () => {
    const now = Date.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    const W = out.columns || 60, H = out.rows || 20;
    /* the biggest pixels that fit: header, bubble, the scene and the stats line */
    const fits = k => Math.ceil((pal.h * k + 4 * k + 1) / 2) + 1 + 6 <= H && pal.w * k + 4 <= W;
    const S = +flag('scale', 0) || (fits(2) ? 2 : 1);
    /* moods wind down by themselves */
    const age = now - moodAt;
    if ((mood === 'done' && age > 3500) || (mood === 'oops' && age > 2600)) set(mood === 'oops' ? 'think' : 'idle', mood === 'oops' ? 'trying again…' : text);
    if (mood === 'idle' && now - lastEvent > 90000) set('sleep', 'zzz…');
    if (mood === 'think' && now - lastEvent > 120000) set('idle', 'all quiet');
    const clip = clipFor(pal, mood), frames = pal.frames[clip], fps = (pal.fps && pal.fps[clip]) || 6;
    const rows0 = frames[Math.floor((now - t0) / 1000 * fps) % frames.length];
    const fr = Array(Math.max(0, pal.h - rows0.length)).fill('').concat(rows0);
    const pw = pal.w * S, ph = pal.h * S;
    /* walk about while busy, turn at the edges */
    if (WALKS.has(mood)) {
      x += face * (mood === 'run' ? 14 : 8) * dt;
      if (x + pw > W - 1) { x = W - 1 - pw; face = -1; }
      if (x < 1) { x = 1; face = 1; }
    }
    if (hop > 0) hop = Math.max(0, hop - dt * 1.4);
    const lift = Math.round(Math.abs(Math.sin(hop * Math.PI * 3)) * 3 * S * (hop > 0 ? 1 : 0));
    /* the scene: ground at the bottom, pal on it, room above for hops */
    const sceneRows = Math.ceil((ph + 4 * S + 1) / 2) + 1, px = Array.from({ length: sceneRows * 2 }, () => Array(W).fill(null));
    const groundY = sceneRows * 2 - 2;
    for (let c = 0; c < W; c++) if ((c + Math.floor((now - t0) / 400)) % 4 !== 0 || !WALKS.has(mood)) px[groundY + 1][c] = c % 2 ? [74, 66, 92] : [58, 52, 74];
    const ox = Math.round(x), oy = groundY + 1 - ph - lift;
    for (let yy = 0; yy < pal.h; yy++) for (let xx = 0; xx < pal.w; xx++) {
      const sx = face > 0 ? xx : pal.w - 1 - xx, col = PAL[(fr[yy] || '')[sx]];
      if (!col) continue;
      const c2 = flash > 0 && flash % 2 ? [255, 93, 115] : col;
      for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) { const X = ox + xx * S + a, Y = oy + yy * S + b; if (X >= 0 && X < W && Y >= 0 && Y < px.length) px[Y][X] = c2; }
    }
    if (flash > 0 && Math.random() < .5) flash--;
    const lines = [];
    for (let r = 0; r < sceneRows; r++) {
      let s = '', cur = '';
      for (let c = 0; c < W; c++) {
        const t = px[r * 2][c], u = px[r * 2 + 1][c];
        let ch = ' ', code;
        if (t && u) { ch = '▀'; code = SGR(t, u); } else if (t) { ch = '▀'; code = SGR(t, null); } else if (u) { ch = '▄'; code = SGR(u, null); } else code = SGR(null, null);
        if (code !== cur) { s += code; cur = code; }
        s += ch;
      }
      lines.push(s + R);
    }
    /* the speech bubble, over the pal's head */
    const msg = short(text, Math.max(8, W - 6)), bw = [...msg].length + 4;
    const bx = Math.max(0, Math.min(W - bw, Math.round(ox + pw / 2 - bw / 2))), tail = Math.max(1, Math.min(bw - 2, Math.round(ox + pw / 2) - bx));
    const pad = s => ' '.repeat(bx) + s;
    const tone = mood === 'oops' ? '\x1b[38;2;255;93;115m' : mood === 'done' ? '\x1b[38;2;198;244;50m' : mood === 'wait' ? '\x1b[38;2;255;210;63m' : '\x1b[38;2;220;214;232m';
    const bubble = [pad(`${tone}╭${'─'.repeat(bw - 2)}╮${R}`), pad(`${tone}│ ${R}${msg}${tone} │${R}`), pad(`${tone}╰${'─'.repeat(tail - 1)}┬${'─'.repeat(Math.max(0, bw - 2 - tail))}╯${R}`)];
    /* header and stats */
    const lv = level(stats.xp), need = Math.pow(lv, 2) * 25, prev = Math.pow(lv - 1, 2) * 25, bar = Math.round((stats.xp - prev) / Math.max(1, need - prev) * 10);
    const head = ` \x1b[38;2;${LIME.join(';')}m■${R} \x1b[1m${pal.name}${R}${DIM} · ${agent ? (agent === 'codex' ? 'Codex' : 'Claude Code') + (project ? ' · ' + short(project, 26) : '') : 'looking for an agent'}${R}`;
    const foot = ` ${DIM}lvl${R} ${lv} \x1b[38;2;${LIME.join(';')}m${'▰'.repeat(bar)}${R}${DIM}${'▱'.repeat(10 - bar)}  ${stats.turns} turns · ${stats.tools} tools · ${stats.oops} oops${R}`;
    const body = [head, '', ...bubble, ...lines, foot];
    const top = Math.max(0, H - body.length);
    out.write('\x1b[H' + Array(top).fill('\x1b[K').concat(body.map(l => l + '\x1b[K')).slice(0, H).join('\n') + '\x1b[J');
  };

  if (!out.isTTY) { console.error('Run the pet in a terminal (a split pane next to your agent is perfect).'); process.exit(1); }
  if (!TEST) out.write('\x1b[?1049h\x1b[?25l');
  const bye = () => { out.write('\x1b[?25h\x1b[?1049l'); fs.writeFileSync(STATS_F, JSON.stringify(stats)); process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
  if (TEST) setTimeout(() => { process.stdout.write(lastFrame + '\n'); process.exit(0); }, +process.env.PIIXPAL_PET_MS || 1500);
  else if (process.stdin.isTTY) { process.stdin.setRawMode(true); process.stdin.on('data', d => { const k = d.toString(); if (k === 'q' || k === '\x03') bye(); if (k === 'p') { hop = 1; set('done', 'hi!'); } }); }
  out.on('resize', () => out.write('\x1b[2J'));
  startWatching(); ping();
  setInterval(ping, 250);
  setInterval(draw, 1000 / 12);
}
