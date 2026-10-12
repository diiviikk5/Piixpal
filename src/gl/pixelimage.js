/* PIXEL IMAGE: any picture, pixelated and dithered on the GPU, with a lens.   @component pixel-image
 *
 *   <piix-pixel-image src="photo.jpg" alt="Our team"></piix-pixel-image>
 *
 * Shows your image as dithered pixels in the palette, as a mosaic, or as halftone dots. Move the
 * pointer over it and a lens shows the real picture underneath; hover a mosaic and it resolves.
 * It crops to fill its box like object-fit: cover, and keeps the image's own shape if you don't
 * give it a height. The image needs to be on your site or served with CORS.
 *
 *   src       the image
 *   alt       what it shows, for screen readers
 *   effect    dither | mosaic | halftone                    default: dither
 *   palette   the colours for dither and halftone           default: mono
 *   pixel     size of one pixel, px                         default: 3
 *   lens      "none" turns the lens off
 *   height    any CSS length (default: the image's shape) */
const PI_FX = { dither: 0, mosaic: 1, halftone: 2 };
const PI_SHADER = `vec3 img(vec2 p){vec2 s=u_j.xy;p=(p-.5)*s+.5;return texture2D(u_tex,p).rgb;}
float lum(vec3 c){return dot(c,vec3(.3,.59,.11));}
vec4 effect(vec2 uv,vec2 cell){
  vec3 c=img(uv);float L=lum(c),fx=u_k.x;vec3 o;
  if(fx==1.){float b=mix(14.,2.,u_hover);vec2 g=(floor(cell/b)+.5)*b/u_res;o=floor(img(g)*6.+.5)/6.;}
  else if(fx==2.){vec2 g=floor(cell/4.),f=mod(cell,4.)-1.5;float l=lum(img((g*4.+2.)/u_res)),k=lum(pal(0.))>.5?1.-l:l;o=length(f)<k*2.3?pal(1.):pal(0.);}
  else o=dpal(pow(L,.9),cell);
  if(u_k.y>0.){float d=length(aspect(uv)-aspect(u_mouse));float lens=smoothstep(.2,.17,d)*u_hover;o=mix(o,c,lens);if(abs(d-.19)<.012*u_hover&&u_hover>.1)o=pal(1.);}
  return vec4(o,1.);}`;
class PiixPixelImageElement extends GLStage {
  static get observedAttributes() { return [...GLStage.observedAttributes, 'alt', 'effect', 'lens']; }
  constructor() { super(); this._defPx = 3; this._defPal = 'mono'; this._img = new Image(); this._img.crossOrigin = 'anonymous'; this._ready = false; }
  _hostCss() { return 'display:block;overflow:hidden;background:#0b0a10'; }
  _setup() {
    this.setAttribute('role', 'img');
    if (this.getAttribute('alt')) this.setAttribute('aria-label', this.getAttribute('alt'));
    const src = this.getAttribute('src');
    if (src && this._img.getAttribute('src') !== src) {
      this._ready = false;
      this._img.onload = () => {
        this._ready = 'upload';
        if (!this.getAttribute('height')) this.style.aspectRatio = `${this._img.naturalWidth} / ${this._img.naturalHeight}`;
        this._fit();
      };
      this._img.src = src;
    } else if (!this.getAttribute('height') && !this.style.aspectRatio) this.style.aspectRatio = '16 / 10';
  }
  _texture() {
    if (!this._ready) return null;
    const t = { owner: this, src: this._img, dirty: this._ready === 'upload' };
    this._ready = true;
    return t;
  }
  _shader() { return PI_SHADER; }
  _uniforms() {
    /* cover: scale the image coordinates so it fills the box and crops the overflow */
    const ia = this._img.naturalWidth / (this._img.naturalHeight || 1) || 1, ea = this._W / this._H, s = ea > ia ? [1, ia / ea] : [ea / ia, 1];
    return { u_k: [PI_FX[this.getAttribute('effect')] ?? 0, this.getAttribute('lens') === 'none' ? 0 : 1, 0, 0], u_j: [s[0], s[1], 0, 0] };
  }
}
define('piix-pixel-image', PiixPixelImageElement);
ELEMENTS['pixel-image'] = 'piix-pixel-image';
