/* MEH: a face for your feedback slider. Meh rides the thumb of a range input (or sits on
 * your star rating) and its face follows the value: furious at the bottom, meh in the
 * middle, over the moon at the top, with steam, a tear, a blush or little hearts.
 *
 *   <input type="range" min="0" max="10"><piix-pal pal="meh"></piix-pal>
 *   on="#stars"   or a group of radio buttons (star ratings), or a <select>
 *   Event: piix:mood { value, level }  (level 0…10) */

/* the face's skin: cross red at the bottom, sunny yellow in the middle, happy green at the top */
const MEH_SKIN = level => level <= 2 ? ['x', 'X', 'y'] : level >= 8 ? ['g', 'G', 'h'] : ['b', 'd', 'B'];

