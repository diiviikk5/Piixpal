/* Types for Piixpal's custom elements and global API. */
type Bool = boolean | '' | undefined;

export interface PiixPalAttributes {
  pal?: string; do?: string; on?: string; at?: number | string; scale?: number | string; hue?: number | string;
  edge?: 'text' | 'box'; speed?: number | string; energy?: number | string; length?: number | string;
  count?: number | string; bpm?: number | string; land?: string; silk?: string; 'fixed-scale'?: Bool;
}
export interface PiixSpriteAttributes {
  name?: string; size?: number | string; scale?: number | string; hue?: number | string; color?: string; eye?: string;
  render?: 'pixel' | 'dots' | 'halftone' | 'dither' | 'ascii' | 'voxel'; depth?: number | string;
  look?: 'mouse' | 'wander' | 'none'; shy?: Bool; tilt?: Bool; still?: Bool; 'no-shy'?: Bool; 'no-tilt'?: Bool; 'sleep-after'?: number | string;
}
export interface PiixTypeAttributes {
  text?: string; rows?: number | string; cell?: number | string; fit?: Bool; color?: string; shade?: string; depth?: number | string;
  gap?: number | string; font?: string; weight?: number | string; align?: 'left' | 'center' | 'right';
  shape?: 'square' | 'dot' | 'round' | 'plus' | 'diamond'; intro?: 'none';
}
export interface PiixCrowdAttributes { mode?: 'crowd' | 'swarm' | 'form'; count?: number | string; text?: string; height?: number | string; scale?: number | string; }

export interface PiixpalAPI {
  version: string;
  add(name: string, where?: string | Element, attrs?: Record<string, string | number | boolean>): HTMLElement;
  list(): { pals: string[]; sprites: string[]; behaviors: string[] };
  clear(): void;
  advance(seconds?: number, fps?: number): void;
  readonly reducedMotion: boolean;
}
declare global {
  interface Window { Piixpal: PiixpalAPI; }
  namespace JSX {
    interface IntrinsicElements {
      'piix-pal': PiixPalAttributes & Record<string, unknown>;
      'piix-sprite': PiixSpriteAttributes & Record<string, unknown>;
      'piix-type': PiixTypeAttributes & Record<string, unknown>;
      'piix-crowd': PiixCrowdAttributes & Record<string, unknown>;
    }
  }
}
