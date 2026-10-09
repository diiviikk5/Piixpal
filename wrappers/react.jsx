'use client';
/* React wrappers for Piixpal. Copy this file into your project (plus load.js), or
 * install the package and import from 'piixpal/react'.
 *
 *   <h1>Hello <PiixPal pal="bitbug" /></h1>
 *   <PiixSprite name="gloop" size={200} render="voxel" />
 *   <PiixCrowd mode="form" text="HELLO" count={200} />
 *
 * Boolean options (shy, tilt, still, fixed-scale) take `true`. */
import { createElement, useEffect } from 'react';
import { loadPiixpal } from './load.js';

const attrs = props => Object.fromEntries(Object.entries(props)
  .filter(([, v]) => v !== false && v != null)
  .map(([k, v]) => [k === 'className' ? 'class' : k, v === true ? '' : String(v)]));

const make = tag => function PiixElement({ src, ...props }) {
  useEffect(() => { loadPiixpal(src); }, [src]);
  return createElement(tag, attrs(props));
};

export const PiixPal = make('piix-pal');
export const PiixSprite = make('piix-sprite');
export const PiixType = make('piix-type');
export const PiixCrowd = make('piix-crowd');
export const PiixWeather = make('piix-weather');
export const PiixStickers = make('piix-stickers');
export const PiixAvatar = make('piix-avatar');
export { loadPiixpal };
