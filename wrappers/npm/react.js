'use client';
/* React wrappers for Piixpal, from npm:  import { PiixPal } from 'piixpal/react'
 *
 *   <h1>Hello <PiixPal pal="bitbug" /></h1>
 *   <PiixSprite name="gloop" size={200} render="voxel" />
 *   <PiixWeather kind="snow" />
 *
 * Safe in Next.js server components' trees: Piixpal itself only loads in the browser.
 * Boolean options (shy, tilt, still, always…) take `true`. */
import { createElement, useEffect } from 'react';
import { loadPiixpal } from './load.js';

const attrs = props => Object.fromEntries(Object.entries(props)
  .filter(([, v]) => v !== false && v != null)
  .map(([k, v]) => [k === 'className' ? 'class' : k, v === true ? '' : String(v)]));

const make = tag => function PiixElement(props) {
  useEffect(() => { loadPiixpal(); }, []);
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
