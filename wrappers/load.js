/* Load Piixpal once, from the CDN or a URL you host yourself. Safe to call many times
 * and safe during server rendering (it does nothing without a window). */
export const PIIXPAL_CDN = 'https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js';
let loading = null;
export function loadPiixpal(src = PIIXPAL_CDN) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Piixpal && window.Piixpal._k) return Promise.resolve(window.Piixpal);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve(window.Piixpal);
      s.onerror = () => { loading = null; reject(new Error('Piixpal failed to load from ' + src)); };
      document.head.appendChild(s);
    });
  }
  return loading;
}
