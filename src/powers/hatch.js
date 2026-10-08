/* HATCH: a pet that belongs to one visitor. Every visitor finds a speckled egg; it hatches
 * after a few visits (or a few taps) into a creature made from that visitor's own random
 * seed: its shape, colours, ears, eyes, mouth, markings, tail and name are theirs alone.
 * It remembers them, grows as they keep coming back, and says hello after time away.
 *
 *   <piix-pal pal="hatch"></piix-pal>
 *   visits="3"    visits before it hatches (tapping the egg speeds things up)
 *   el.ctl.hatch()   el.ctl.reset()      Events: piix:hatch { name }
 *
 * The same creatures, from any word: <piix-avatar seed="someone@example.com" size="48">
 * makes a little animated avatar that's always the same for the same seed.   @component avatar */

/* a seeded random number generator: the same seed always gives the same pet */
const hatchRng = seed => {
  let h = 2166136261 >>> 0;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6D2B79F5) | 0; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

