/* GL: the GPU side of Piixpal. One shared WebGL canvas that every shader component borrows,
 * so a page can have dozens of them without running out of contexts (browsers allow about 16).
 * A component renders its shader at a low "pixel grid" resolution, then copies the result into
 * its own canvas, which the browser scales up crisp. That's the pixel look, and it's also why
 * these are cheap: a 1200 x 600 hero with 4 px pixels is only 300 x 150 shader pixels.
 *
 * Every shader gets the same toolkit: noise, fbm, an 8x8 Bayer matrix, and a palette with
 * ordered dithering, so gradients fall into the theme's colours in that crunchy pixel way. */

