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

